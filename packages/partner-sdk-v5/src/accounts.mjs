/** v5 trade account roles from ABI.md. Does not derive live PDAs (seeds are not a live proof). */
import { ATA_PROGRAM, FACTORY, TAGS, TOKEN_PROGRAM, WSOL } from './constants.mjs';
import { encodeTrade } from './encode-trade.mjs';

export const TRADE_ROLES = Object.freeze([
  Object.freeze({ index: 0, role: 'trader', signer: true, writable: true }),
  Object.freeze({ index: 1, role: 'launch', signer: false, writable: true }),
  Object.freeze({ index: 2, role: 'curveAuth', signer: false, writable: false }),
  Object.freeze({ index: 3, role: 'migrationAuth', signer: false, writable: false }),
  Object.freeze({ index: 4, role: 'rewardAuth', signer: false, writable: false }),
  Object.freeze({ index: 5, role: 'mint', signer: false, writable: true }),
  Object.freeze({ index: 6, role: 'inventory', signer: false, writable: true }),
  Object.freeze({ index: 7, role: 'migrationToken', signer: false, writable: true }),
  Object.freeze({ index: 8, role: 'rewardToken', signer: false, writable: true }),
  Object.freeze({ index: 9, role: 'traderToken', signer: false, writable: true }),
  Object.freeze({ index: 10, role: 'reserve', signer: false, writable: true }),
  Object.freeze({ index: 11, role: 'setup', signer: false, writable: true }),
  Object.freeze({ index: 12, role: 'treasuryFee', signer: false, writable: true }),
  Object.freeze({ index: 13, role: 'community', signer: false, writable: true }),
  Object.freeze({ index: 14, role: 'tokenProgram', signer: false, writable: false, pubkey: TOKEN_PROGRAM }),
  Object.freeze({ index: 15, role: 'systemProgram', signer: false, writable: false, pubkey: '11111111111111111111111111111111' }),
  Object.freeze({ index: 16, role: 'sourceVault', signer: false, writable: true }),
  Object.freeze({ index: 17, role: 'rights', signer: false, writable: true }),
  Object.freeze({ index: 18, role: 'period', signer: false, writable: false }),
  Object.freeze({ index: 19, role: 'nativeVault', signer: false, writable: true }),
  Object.freeze({ index: 20, role: 'wsolVault', signer: false, writable: true }),
  Object.freeze({ index: 21, role: 'tokenCreatorVault', signer: false, writable: true }),
  Object.freeze({ index: 22, role: 'cto', signer: false, writable: false }),
  Object.freeze({ index: 23, role: 'globalEnvelope', signer: false, writable: false }),
  Object.freeze({ index: 24, role: 'globalPayload', signer: false, writable: false }),
  Object.freeze({ index: 25, role: 'customEnvelope', signer: false, writable: false }),
  Object.freeze({ index: 26, role: 'customPayload', signer: false, writable: false }),
]);

export function buildUnsignedTrade({ quote, trader, traderToken } = {}) {
  if (!quote || quote.schema !== 1 || (quote.side !== 'buy' && quote.side !== 'sell')) {
    throw Object.assign(new Error('QUOTE'), { code: 'QUOTE' });
  }
  const data = encodeTrade({
    side: quote.side,
    revision: BigInt(quote.revision),
    policyVersion: BigInt(quote.policyVersion),
    amount: BigInt(quote.acceptedInput),
    minimumOut: BigInt(quote.minimumOut),
    expirySlot: BigInt(quote.expirySlot),
    globalAbsence: 0,
    customAbsence: 0,
  });
  const known = {
    mint: quote.mint,
    launch: quote.launch,
    tokenProgram: TOKEN_PROGRAM,
    systemProgram: '11111111111111111111111111111111',
    wsol: WSOL,
    ataProgram: ATA_PROGRAM,
    trader: typeof trader === 'string' ? trader : null,
    traderToken: typeof traderToken === 'string' ? traderToken : null,
  };
  const accounts = TRADE_ROLES.map((role) => {
    let pubkey = role.pubkey || null;
    if (role.role === 'trader') pubkey = known.trader;
    if (role.role === 'traderToken') pubkey = known.traderToken;
    if (role.role === 'mint') pubkey = known.mint;
    if (role.role === 'launch') pubkey = known.launch;
    return Object.freeze({ ...role, pubkey });
  });
  return Object.freeze({
    schema: 1,
    launchpad: 'legendary',
    admitted: quote.admitted === true,
    executable: false,
    programId: FACTORY,
    tag: quote.side === 'buy' ? TAGS.buy : TAGS.sell,
    dataBase64: Buffer.from(data).toString('base64'),
    tradeBytes: data.length,
    accounts: Object.freeze(accounts),
    quote,
    note: 'Unsigned instruction template. Remaining PDAs are caller-derived. Shield-on buys need absence proofs. Do not treat this as a hosted swap or a confirmed tx.',
  });
}
