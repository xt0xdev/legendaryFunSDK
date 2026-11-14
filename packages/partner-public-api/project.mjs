/** Project existing catalog JSON into partner discovery shapes.
 * Never mutates the catalog, never invents names, never claims a quote/sign path.
 */
export const PARTNER_PREFIX = '/api/v1';
export const PUMP_COMPAT_PREFIX = '/api/compat/pump/v3';
export const METEORA_COMPAT_PREFIX = '/api/compat/meteora/v1';
export const LAUNCHPAD = 'legendary';
export const DEFAULT_IDENTITY = Object.freeze({
  cluster: 'mainnet-beta',
  genesis: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
  factory: 'Fkeuw75FEAYUpudPNqFqMv2m2KzhSiLYArp1rd8baH1i',
  cto: '7EgadoHa1THHf9cyKsh4QUrBGsfYW5FHSApSAHLSBbeN',
  tags: Object.freeze({
    create: 'LGCNEW05',
    buy: 'LGCBUY05',
    sell: 'LGCSEL05',
    graduate: 'LGGRAD05',
  }),
});

const MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isMint(value) {
  return typeof value === 'string' && MINT.test(value);
}

function decimal(value) {
  return typeof value === 'string' && /^(0|[1-9][0-9]{0,39})$/.test(value) ? value : null;
}

function cloneFrozen(value) {
  return Object.freeze(JSON.parse(JSON.stringify(value)));
}

export function catalogTokens(catalog) {
  if (!catalog || typeof catalog !== 'object' || !Array.isArray(catalog.tokens)) return [];
  const out = [];
  const seen = new Set();
  for (const row of catalog.tokens) {
    if (!row || typeof row !== 'object' || !isMint(row.mint) || seen.has(row.mint)) continue;
    seen.add(row.mint);
    out.push(row);
  }
  return out;
}

function displayFdvUsd(row, usdPerSol) {
  const supply = decimal(row.genesisSupplyBaseUnits) || decimal(row.supplyBaseUnits);
  const num = decimal(row.price?.numerator);
  const den = decimal(row.price?.denominator);
  if (!supply || !num || !den || !Number.isFinite(usdPerSol) || usdPerSol <= 0) return null;
  const decimals = row.decimals === 6 ? 6 : Number.isInteger(row.decimals) ? row.decimals : 6;
  const tokens = Number(supply) / (10 ** decimals);
  const sol = tokens * (Number(num) / Number(den));
  const usd = sol * usdPerSol;
  if (!Number.isFinite(usd) || usd < 0) return null;
  return usd;
}

function capabilities(row) {
  const caps = row?.capabilities && typeof row.capabilities === 'object' ? row.capabilities : {};
  return Object.freeze({
    factoryBuy: caps.buy === true,
    factorySell: caps.sell === true,
    factoryCreate: caps.create === true,
    quoteAvailable: row?.quoteAvailable === true,
    signingAllowed: row?.signingAllowed === true,
  });
}

export function projectToken(row, { usdPerSol, identity = DEFAULT_IDENTITY } = {}) {
  if (!row || !isMint(row.mint)) return null;
  const phase = typeof row.phase === 'string' ? row.phase : '';
  const venue = typeof row.venue === 'string' ? row.venue : '';
  const graduated = phase === 'graduated' || venue === 'raydium-cpmm';
  const fdv = displayFdvUsd(row, usdPerSol);
  return Object.freeze({
    schema: 1,
    launchpad: LAUNCHPAD,
    mint: row.mint,
    launch: isMint(row.launch) ? row.launch : null,
    pool: isMint(row.pool) ? row.pool : null,
    phase,
    venue,
    decimals: row.decimals === 6 ? 6 : Number.isInteger(row.decimals) ? row.decimals : 6,
    factory: identity.factory,
    tags: identity.tags,
    name: typeof row.name === 'string' && row.name.trim() ? row.name.trim() : null,
    ticker: typeof row.ticker === 'string' && row.ticker.trim() ? row.ticker.trim() : null,
    price: row.price && typeof row.price === 'object' ? cloneFrozen(row.price) : null,
    displayFdvUsd: fdv,
    displayFdvUsdUnit: 'estimate-not-for-execution',
    capabilities: capabilities(row),
    observedAtMs: Number.isFinite(row.observedAtMs) ? row.observedAtMs : null,
  });
}

export function projectCurve(row) {
  if (!row || !isMint(row.mint)) return null;
  const graduated = row.phase === 'graduated' || row.venue === 'raydium-cpmm';
  return Object.freeze({
    schema: 1,
    mint: row.mint,
    phase: typeof row.phase === 'string' ? row.phase : '',
    venue: typeof row.venue === 'string' ? row.venue : '',
    onFactoryCurve: !graduated,
    graduated,
    pool: isMint(row.pool) ? row.pool : null,
    reserveLamports: decimal(row.reserveLamports),
    graduationTargetLamports: decimal(row.graduationTargetLamports) || (graduated ? '120000000000' : null),
    curveTokenBaseUnits: decimal(row.curveTokenBaseUnits),
    shield: typeof row.shield === 'string' ? row.shield : null,
    revision: decimal(row.revision),
    policyVersion: decimal(row.policyVersion),
  });
}

export function projectPumpCoin(row, { usdPerSol, identity = DEFAULT_IDENTITY } = {}) {
  const token = projectToken(row, { usdPerSol, identity });
  if (!token) return null;
  const created = decimal(row.poolOpenTime);
  return Object.freeze({
    mint: token.mint,
    name: token.name,
    symbol: token.ticker,
    complete: token.phase === 'graduated',
    launchpad: LAUNCHPAD,
    program: identity.factory,
    raydium_pool: token.pool,
    created_timestamp: created ? Number(created) : null,
    usd_market_cap: token.displayFdvUsd,
    virtual_sol_reserves: null,
    description: 'Legendary.fun mapped discovery. Not a Pump.fun instruction. Factory buy/sell follow capabilities on /api/v1/tokens/{mint}.',
  });
}

export function projectTokenList(catalog, options = {}) {
  return Object.freeze({
    schema: 1,
    launchpad: LAUNCHPAD,
    source: '/api/mainnet/trade/catalog',
    asOfMs: Number.isFinite(catalog?.asOfMs) ? catalog.asOfMs : null,
    expiresAtMs: Number.isFinite(catalog?.expiresAtMs) ? catalog.expiresAtMs : null,
    tokens: Object.freeze(catalogTokens(catalog).map((row) => projectToken(row, options)).filter(Boolean)),
  });
}

export function projectMeteoraPool(row, { identity = DEFAULT_IDENTITY } = {}) {
  const token = projectToken(row, { identity });
  if (!token) return null;
  const graduated = token.phase === 'graduated' || token.venue === 'raydium-cpmm';
  return Object.freeze({
    schema: 1,
    launchpad: LAUNCHPAD,
    mappedFrom: '/api/mainnet/trade/catalog',
    note: 'Meteora-shaped discovery. Not the Meteora DBC program. swap2 is not admitted.',
    pool: token.pool || token.launch,
    baseMint: token.mint,
    quoteMint: 'So11111111111111111111111111111111111111112',
    config: identity.factory,
    swapBaseForQuote: false,
    graduated,
    venue: token.venue,
    phase: token.phase,
    onFactoryCurve: !graduated,
  });
}

export function projectLaunchpad(identity = DEFAULT_IDENTITY) {
  return Object.freeze({
    schema: 1,
    launchpad: LAUNCHPAD,
    cluster: identity.cluster,
    genesis: identity.genesis,
    factory: identity.factory,
    cto: identity.cto,
    tags: identity.tags,
    graduatedVenue: 'raydium-cpmm',
    existingApisUnchanged: Object.freeze([
      '/api/mainnet/trade/catalog',
      '/api/mainnet/trade/bootstrap',
      '/api/market/sol-usd',
      '/api/devnet/trade',
    ]),
  });
}
