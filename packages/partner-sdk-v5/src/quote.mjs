/** Integer curve quote. Offline math from live catalog state. Not authentication, not a submit path. */
export const PROFILE = Object.freeze({
  id: 'legendary-75-20-1-4-fixed-k-v1',
  decimals: 6,
  supply: 100_000_000_000_000_000n,
  curve: 75_000_000_000_000_000n,
  migration: 20_000_000_000_000_000n,
  treasury: 1_000_000_000_000_000n,
  rewards: 4_000_000_000_000_000n,
  target: 120_000_000_000n,
  initialQuote: 43_636_363_636n,
  initialBase: 102_272_727_272_500_000n,
});
export const MINIMUM_BASE = PROFILE.initialBase - PROFILE.curve;
export const FIXED_K = PROFILE.initialBase * PROFILE.initialQuote;
export const MAXIMUM_CURVE_INVENTORY = PROFILE.curve + PROFILE.treasury;
export const BASIS_POINTS = 10_000n;
export const U64_MAX = (1n << 64n) - 1n;

export class QuoteError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
    this.name = 'QuoteError';
  }
}

function fail(code) {
  throw new QuoteError(code);
}

function u64(value, code = 'AMOUNT') {
  if (typeof value !== 'bigint' || value < 0n || value > U64_MAX) fail(code);
  return value;
}

function decimal(value) {
  if (typeof value === 'bigint') return u64(value);
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return u64(BigInt(value));
  if (typeof value === 'string' && /^(0|[1-9][0-9]{0,39})$/.test(value)) return u64(BigInt(value));
  return null;
}

function ceilDiv(numerator, denominator) {
  if (denominator <= 0n) fail('OVERFLOW');
  return numerator / denominator + (numerator % denominator === 0n ? 0n : 1n);
}

function feeTotal(gross, bps) {
  u64(gross);
  if (bps < 0n || bps >= BASIS_POINTS) fail('POLICY');
  return ceilDiv(gross * bps, BASIS_POINTS);
}

function allocate(total, treasuryShareBps) {
  u64(total);
  const community = total * (BASIS_POINTS - treasuryShareBps) / BASIS_POINTS;
  return Object.freeze({ total, treasury: total - community, community });
}

function minimumGrossForNet(net, bps) {
  if (net <= 0n) fail('AMOUNT');
  return ceilDiv(net * BASIS_POINTS, BASIS_POINTS - bps);
}

export function policyFromRow(row) {
  const version = decimal(row?.policyVersion) ?? 1n;
  const curveFeeBps = decimal(row?.curveFeeBps) ?? 200n;
  const graduatedFeeBps = decimal(row?.graduatedFeeBps) ?? 100n;
  const curveTreasuryShareBps = decimal(row?.curveTreasuryShareBps) ?? 5_000n;
  const graduatedTreasuryShareBps = decimal(row?.graduatedTreasuryShareBps) ?? 5_000n;
  if (version === 0n) fail('POLICY');
  if (curveFeeBps < 30n || curveFeeBps > 500n) fail('POLICY');
  if (curveTreasuryShareBps < 1_500n || curveTreasuryShareBps > 5_000n) fail('POLICY');
  const policyKey = [version, curveFeeBps, graduatedFeeBps, curveTreasuryShareBps, graduatedTreasuryShareBps].join(':');
  return Object.freeze({
    version,
    curveFeeBps,
    graduatedFeeBps,
    curveTreasuryShareBps,
    graduatedTreasuryShareBps,
    policyKey,
  });
}

export function reconstructState(row, policy) {
  if (!row || typeof row !== 'object') fail('STATE');
  if (row.phase === 'graduated' || row.venue === 'raydium-cpmm') fail('PHASE');
  const qs = row.quoteState && typeof row.quoteState === 'object' ? row.quoteState : {};
  const reserve = decimal(row.reserveLamports);
  const inventory = decimal(row.curveTokenBaseUnits);
  if (reserve == null || inventory == null) fail('STATE');
  const quote = decimal(qs.quote) ?? PROFILE.initialQuote + reserve;
  const base = decimal(qs.base) ?? MINIMUM_BASE + inventory;
  const treasuryFees = decimal(qs.treasuryFees) ?? 0n;
  const communityFees = decimal(qs.communityFees) ?? 0n;
  if (quote !== PROFILE.initialQuote + reserve) fail('STATE');
  if (base !== MINIMUM_BASE + inventory) fail('STATE');
  if (quote !== ceilDiv(FIXED_K, base)) fail('STATE');
  if (base === 0n || quote === 0n || reserve > PROFILE.target || inventory > MAXIMUM_CURVE_INVENTORY) fail('STATE');
  const phase = reserve === PROFILE.target && inventory === 0n ? 'ready' : 'open';
  if (phase === 'ready') fail('PHASE');
  return Object.freeze({
    profile: PROFILE.id,
    policyKey: policy.policyKey,
    base,
    quote,
    reserve,
    inventory,
    treasuryFees,
    communityFees,
    phase,
  });
}

function buy(state, policy, input, minimum) {
  const room = PROFILE.target - state.reserve;
  const offeredFee = feeTotal(input, policy.curveFeeBps);
  const offeredNet = input - offeredFee;
  if (offeredNet === 0n) fail('ZERO_NET');
  const acceptedGross = offeredNet >= room ? minimumGrossForNet(room, policy.curveFeeBps) : input;
  const fees = allocate(feeTotal(acceptedGross, policy.curveFeeBps), policy.curveTreasuryShareBps);
  const net = acceptedGross - fees.total;
  if (net > room || acceptedGross > input) fail('STATE');
  const quote = state.quote + net;
  const slack = state.base * quote - FIXED_K;
  if (slack < 0n) fail('STATE');
  const output = slack / quote;
  if (output === 0n) fail('ZERO_OUTPUT');
  if (output > state.inventory) fail('INVENTORY');
  if (output < minimum) fail('SLIPPAGE');
  return Object.freeze({
    acceptedInput: acceptedGross,
    output,
    grossQuote: acceptedGross,
    fee: fees.total,
    treasuryFee: fees.treasury,
    communityFee: fees.community,
    refund: input - acceptedGross,
  });
}

function sell(state, policy, input, minimum) {
  if (input > MAXIMUM_CURVE_INVENTORY - state.inventory) fail('INVENTORY');
  const base = state.base + input;
  const slack = state.quote * base - FIXED_K;
  if (slack < 0n) fail('STATE');
  const grossQuote = slack / base;
  if (grossQuote === 0n) fail('ZERO_OUTPUT');
  if (grossQuote > state.reserve) fail('RESERVE');
  const fees = allocate(feeTotal(grossQuote, policy.curveFeeBps), policy.curveTreasuryShareBps);
  const output = grossQuote - fees.total;
  if (output === 0n) fail('ZERO_NET');
  if (output < minimum) fail('SLIPPAGE');
  return Object.freeze({
    acceptedInput: input,
    output,
    grossQuote,
    fee: fees.total,
    treasuryFee: fees.treasury,
    communityFee: fees.community,
    refund: 0n,
  });
}

export function quoteTrade({
  row,
  side,
  amount,
  slippageBps = 100n,
  currentSlot,
} = {}) {
  if (side !== 'buy' && side !== 'sell') fail('SIDE');
  const input = decimal(amount);
  const slip = decimal(slippageBps) ?? 100n;
  if (input == null || input === 0n) fail('AMOUNT');
  if (slip > 5_000n) fail('SLIPPAGE');
  const policy = policyFromRow(row);
  const state = reconstructState(row, policy);
  const slot = decimal(currentSlot) ?? decimal(row?.currentSlot) ?? decimal(row?.observedSlot) ?? 1n;
  const dummyMin = 1n;
  const raw = side === 'buy' ? buy(state, policy, input, dummyMin) : sell(state, policy, input, dummyMin);
  const minimumOut = raw.output - (raw.output * slip / BASIS_POINTS);
  if (minimumOut <= 0n) fail('SLIPPAGE');
  const trade = side === 'buy' ? buy(state, policy, input, minimumOut) : sell(state, policy, input, minimumOut);
  const revision = decimal(row?.revision) ?? 1n;
  const expirySlot = slot + 150n;
  const caps = row?.capabilities && typeof row.capabilities === 'object' ? row.capabilities : {};
  const admitted = side === 'buy' ? caps.buy === true : caps.sell === true;
  return Object.freeze({
    schema: 1,
    launchpad: 'legendary',
    kind: 'integer-curve-v5',
    admitted,
    executable: false,
    quoteAvailable: row?.quoteAvailable === true,
    signingAllowed: row?.signingAllowed === true,
    mint: row.mint,
    launch: row.launch || null,
    side,
    profile: PROFILE.id,
    policyVersion: policy.version.toString(),
    revision: revision.toString(),
    shield: typeof row?.shield === 'string' ? row.shield : null,
    currentSlot: slot.toString(),
    expirySlot: expirySlot.toString(),
    amount: input.toString(),
    acceptedInput: trade.acceptedInput.toString(),
    output: trade.output.toString(),
    minimumOut: minimumOut.toString(),
    fee: trade.fee.toString(),
    treasuryFee: trade.treasuryFee.toString(),
    communityFee: trade.communityFee.toString(),
    refund: trade.refund.toString(),
    grossQuote: trade.grossQuote.toString(),
    slippageBps: slip.toString(),
    reserveLamports: state.reserve.toString(),
    inventory: state.inventory.toString(),
    displayFdvUsdUnit: 'estimate-not-for-execution',
    note: 'Integer quote from catalog curve state. Wallet signs minOut and expirySlot. Not a hosted swap. Mainnet capabilities.buy/sell stay false.',
  });
}
