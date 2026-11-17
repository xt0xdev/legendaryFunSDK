/** Project existing catalog JSON into partner discovery shapes.
 * Never mutates the catalog, never invents names, never claims a quote/sign path.
 */
export const PARTNER_PREFIX = '/api/v1';
export const PUMP_COMPAT_PREFIX = '/api/compat/pump/v3';
export const METEORA_COMPAT_PREFIX = '/api/compat/meteora/v1';
export const LAUNCHPAD = 'legendary';
export const MARKET_STREAM = 'wss://api.legendary.fun/api/mainnet/market/stream';
export const SITE_LANE_MESSAGE = 'Cookie create/claims on legendary.fun stay same-origin. Partner create, claims, and rewards use /api/v1 with an owner-issued API key.';
export const KEYED_LANE_MESSAGE = 'Trades, claims, rewards, and token launch require header x-legendary-api-key issued by the legendary.fun site owner.';
export const API_KEY_HEADER = 'x-legendary-api-key';
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

function text(value, max = 64) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
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

export function combineDiscoveryQuote(discoveryRow, quoteRow = {}) {
  if (!discoveryRow || !isMint(discoveryRow.mint)) return null;
  const meta = discoveryRow.metadata && typeof discoveryRow.metadata === 'object' && !Array.isArray(discoveryRow.metadata)
    ? discoveryRow.metadata
    : {};
  const quote = quoteRow && typeof quoteRow === 'object' ? quoteRow : {};
  return {
    ...quote,
    mint: discoveryRow.mint,
    launch: isMint(discoveryRow.launch) ? discoveryRow.launch : quote.launch,
    creator: isMint(discoveryRow.creator) ? discoveryRow.creator : quote.creator,
    name: text(meta.name) || text(discoveryRow.name) || text(quote.name),
    ticker: text(meta.symbol) || text(discoveryRow.symbol) || text(discoveryRow.ticker) || text(quote.ticker),
    phase: typeof quote.phase === 'string' && quote.phase
      ? quote.phase
      : (typeof discoveryRow.phase === 'string' && discoveryRow.phase ? discoveryRow.phase : 'open'),
  };
}

export function mergeFactoryRows(discovery, quotes, catalog) {
  const quoteByMint = new Map(catalogTokens(quotes).map((row) => [row.mint, row]));
  const admitted = catalogTokens(catalog);
  const out = [];
  const seen = new Set();
  const discovered = Array.isArray(discovery?.tokens) ? discovery.tokens : [];
  for (const row of discovered) {
    if (!row || !isMint(row.mint) || seen.has(row.mint)) continue;
    seen.add(row.mint);
    out.push(combineDiscoveryQuote(row, quoteByMint.get(row.mint) || {}));
  }
  for (const row of admitted) {
    if (seen.has(row.mint)) continue;
    seen.add(row.mint);
    out.push(row);
  }
  return out;
}

export function factorySource(discovery) {
  const n = Array.isArray(discovery?.tokens) ? discovery.tokens.length : 0;
  return n ? 'factory-launch-discovery-v1+server-admitted-markets-v1' : '/api/mainnet/trade/catalog';
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
    creator: isMint(row.creator) ? row.creator : null,
    phase,
    venue,
    decimals: row.decimals === 6 ? 6 : Number.isInteger(row.decimals) ? row.decimals : 6,
    factory: identity.factory,
    tags: identity.tags,
    name: text(row.name),
    ticker: text(row.ticker),
    price: row.price && typeof row.price === 'object' ? cloneFrozen(row.price) : null,
    displayFdvUsd: fdv,
    displayFdvUsdUnit: 'estimate-not-for-execution',
    capabilities: capabilities(row),
    observedAtMs: Number.isFinite(row.observedAtMs) ? row.observedAtMs : null,
    reserveLamports: decimal(row.reserveLamports),
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
    virtual_sol_reserves: token.reserveLamports ? Number(token.reserveLamports) : null,
    description: 'Legendary.fun mapped discovery. Not a Pump.fun instruction. Factory buy/sell follow capabilities on /api/v1/tokens/{mint}.',
  });
}

export function projectTokenList(catalog, options = {}) {
  return projectTokenListFromRows(
    catalogTokens(catalog),
    '/api/mainnet/trade/catalog',
    catalog?.asOfMs,
    catalog?.expiresAtMs,
    options,
  );
}

export function projectTokenListFromRows(rows, source, asOfMs, expiresAtMs, options = {}) {
  return Object.freeze({
    schema: 1,
    launchpad: LAUNCHPAD,
    source,
    asOfMs: Number.isFinite(asOfMs) ? asOfMs : null,
    expiresAtMs: Number.isFinite(expiresAtMs) ? expiresAtMs : null,
    tokens: Object.freeze((rows || []).map((row) => projectToken(row, options)).filter(Boolean)),
  });
}

export function projectDiscoveryPage(discovery, quotes, catalog, options = {}) {
  const rows = mergeFactoryRows(discovery, quotes, catalog);
  const hasFactory = Array.isArray(discovery?.tokens) && discovery.tokens.length > 0;
  return Object.freeze({
    schema: 1,
    launchpad: LAUNCHPAD,
    source: hasFactory ? 'factory-launch-discovery-v1' : '/api/mainnet/trade/catalog',
    scope: hasFactory ? 'factory-launch-discovery-v1' : 'server-admitted-atomic-v5',
    query: typeof discovery?.query === 'string' ? discovery.query : '',
    limit: discovery?.limit === 20 || discovery?.limit === 50 ? discovery.limit : rows.length,
    page: Number.isInteger(discovery?.page) && discovery.page >= 1 ? discovery.page : 1,
    nextCursor: typeof discovery?.nextCursor === 'string' ? discovery.nextCursor : null,
    previousCursor: typeof discovery?.previousCursor === 'string' ? discovery.previousCursor : null,
    asOfMs: Number.isFinite(discovery?.asOfMs) ? discovery.asOfMs : (Number.isFinite(catalog?.asOfMs) ? catalog.asOfMs : null),
    tokens: Object.freeze(rows.map((row) => projectToken(row, options)).filter(Boolean)),
  });
}

export function projectMarketList(quotes, options = {}) {
  return Object.freeze({
    schema: 1,
    launchpad: LAUNCHPAD,
    source: quotes?.scope === 'server-admitted-markets-v1'
      ? 'server-admitted-markets-v1'
      : '/api/mainnet/trade/catalog',
    asOfMs: Number.isFinite(quotes?.asOfMs) ? quotes.asOfMs : null,
    tokens: Object.freeze(catalogTokens(quotes).map((row) => projectToken(row, options)).filter(Boolean)),
  });
}

export function projectMeteoraPool(row, { usdPerSol, identity = DEFAULT_IDENTITY, mappedFrom = '/api/mainnet/trade/catalog' } = {}) {
  const token = projectToken(row, { usdPerSol, identity });
  if (!token) return null;
  const graduated = token.phase === 'graduated' || token.venue === 'raydium-cpmm';
  return Object.freeze({
    schema: 1,
    launchpad: LAUNCHPAD,
    mappedFrom,
    note: 'Meteora-shaped discovery. Not the Meteora DBC program. Hosted swap2 is off.',
    pool: token.pool || token.launch,
    baseMint: token.mint,
    quoteMint: 'So11111111111111111111111111111111111111112',
    config: identity.factory,
    swapBaseForQuote: false,
    graduated,
    venue: token.venue,
    phase: token.phase,
    onFactoryCurve: !graduated,
    name: token.name,
    symbol: token.ticker,
    usd_market_cap: token.displayFdvUsd,
  });
}

export function projectStream() {
  return Object.freeze({
    schema: 1,
    launchpad: LAUNCHPAD,
    websocket: MARKET_STREAM,
    siteLane: true,
    subscribe: Object.freeze(['quotes', 'phase']),
    note: 'Site market stream on api.legendary.fun. Partner DAP does not terminate the socket. Candles are REST via /api/mainnet/trade/candles-swap.',
  });
}

export function projectTape(mint) {
  return Object.freeze({
    schema: 1,
    launchpad: LAUNCHPAD,
    mint,
    indexed: false,
    trades: Object.freeze([]),
    note: 'Public trade tape is not deployed. Failed or simulated transactions never appear here.',
  });
}

export function projectCandles(mint, interval = '1m') {
  return Object.freeze({
    schema: 1,
    launchpad: LAUNCHPAD,
    mint,
    interval,
    indexed: false,
    candles: Object.freeze([]),
    note: 'Public OHLCV is not deployed. Creation fees and graduation locks are not trades.',
  });
}

export function projectCreateContract() {
  return Object.freeze({
    schema: 1,
    launchpad: LAUNCHPAD,
    partner: 'API_KEY',
    tag: 'LGCNEW05',
    accounts: 42,
    partnerPath: '/api/v1/create',
    livePath: '/api/mainnet/create',
    header: API_KEY_HEADER,
    admitted: false,
    note: KEYED_LANE_MESSAGE,
  });
}

export function projectRewardsContract() {
  return Object.freeze({
    schema: 1,
    launchpad: LAUNCHPAD,
    partner: 'API_KEY',
    partnerPath: '/api/v1/rewards',
    claimPath: '/api/v1/rewards/claim',
    graduationClaimsPath: '/api/v1/graduation-claims',
    livePath: '/api/mainnet/graduation-claims',
    displayPath: '/api/devnet/rewards',
    header: API_KEY_HEADER,
    admitted: false,
    note: KEYED_LANE_MESSAGE,
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
      '/api/mainnet/trade/discovery',
      '/api/mainnet/trade/bootstrap',
      '/api/mainnet/trade/candles-swap',
      '/api/mainnet/trade/prepare',
      '/api/mainnet/trade/submit',
      '/api/market/sol-usd',
    ]),
    siteLane: Object.freeze({
      create: '/api/mainnet/create',
      graduationClaims: '/api/mainnet/graduation-claims',
      rewardsDisplay: '/api/devnet/rewards',
      holderRewardsDisplay: '/api/devnet/holder-rewards',
      marketStream: MARKET_STREAM,
      note: SITE_LANE_MESSAGE,
    }),
    keyedLane: Object.freeze({
      header: API_KEY_HEADER,
      prepare: '/api/mainnet/trade/prepare',
      submit: '/api/mainnet/trade/submit',
      graduatedPrepare: '/api/mainnet/trade/graduated/prepare',
      create: '/api/v1/create',
      rewards: '/api/v1/rewards',
      claim: '/api/v1/rewards/claim',
      graduationClaims: '/api/v1/graduation-claims',
      pumpCreate: '/api/compat/pump/v3/coins/create',
      note: KEYED_LANE_MESSAGE,
    }),
  });
}
