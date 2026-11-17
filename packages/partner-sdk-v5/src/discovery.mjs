/** Read-only discovery. Uses existing catalog paths and additive partner prefixes. */
import { API_KEY_HEADER, LIVE_ORIGIN, PATHS } from './constants.mjs';

export class DiscoveryError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
    this.name = 'DiscoveryError';
  }
}

export function createDiscovery({
  origin = LIVE_ORIGIN,
  fetcher = fetch,
  timeoutMs = 15_000,
  apiKey = '',
} = {}) {
  const base = new URL(origin);
  if (base.protocol !== 'https:' && base.protocol !== 'http:') throw new Error('ORIGIN');
  const ownerKey = typeof apiKey === 'string' ? apiKey.trim() : '';

  async function send(path, { method = 'GET', payload } = {}) {
    const url = new URL(path, base);
    if (url.origin !== base.origin) throw new DiscoveryError('ORIGIN', 400);
    const response = await fetcher(url, {
      method,
      headers: {
        accept: 'application/json',
        ...(payload !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(ownerKey ? { [API_KEY_HEADER]: ownerKey } : {}),
      },
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
      redirect: 'error',
      credentials: 'omit',
      signal: AbortSignal.timeout(timeoutMs),
    });
    const type = response.headers.get('content-type')?.split(';')[0].trim();
    if (type !== 'application/json') throw new DiscoveryError('HTTP', response.status);
    const body = await response.json();
    if (!response.ok) throw new DiscoveryError(body?.error?.code || 'HTTP', response.status);
    return body;
  }

  const get = (path) => send(path);
  const post = (path, payload) => send(path, { method: 'POST', payload });

  return Object.freeze({
    origin: base.origin,
    catalog: () => get(PATHS.catalog),
    bootstrap: () => get(PATHS.bootstrap),
    solUsd: () => get(PATHS.solUsd),
    tokens: () => get(PATHS.nativeTokens),
    token: (mint) => get(`${PATHS.nativeTokens}/${mint}`),
    curve: (mint) => get(`${PATHS.nativeTokens}/${mint}/curve`),
    launchpad: () => get(PATHS.nativeLaunchpad),
    stream: () => get(PATHS.nativeStream),
    discover: ({ query = '', limit = 50, cursor = null } = {}) => post(PATHS.nativeDiscovery, { query, limit, cursor }),
    markets: (mints = []) => post(PATHS.nativeMarkets, { mints, version: 3 }),
    quote: (payload) => post(PATHS.nativeQuote, payload),
    idl: () => get(PATHS.nativeIdl),
    candles: (mint, interval = '1m') => get(`${PATHS.nativeTokens}/${mint}/candles?interval=${encodeURIComponent(interval || '1m')}`),
    marketTicket: () => get(PATHS.marketTicket),
    marketMetrics: (mint) => get(`${PATHS.marketMetrics}/${mint}`),
    authChallenge: (payload) => post(PATHS.authChallenge, payload),
    authVerify: (payload) => post(PATHS.authVerify, payload),
    authLogout: (payload = {}) => post(PATHS.authLogout, payload),
    prepare: (payload) => post(PATHS.prepare, payload),
    graduatedPrepare: (payload) => post(PATHS.graduatedPrepare, payload),
    submit: (payload) => post(PATHS.submit, payload),
    freshness: (payload) => post(PATHS.freshness, payload),
    simulate: (payload) => post(PATHS.simulate, payload),
    dispose: (payload) => post(PATHS.dispose, payload),
    meteoraQuote: (payload) => post('/api/compat/meteora/v1/quote', payload),
    liveDiscover: ({ query = '', limit = 50, cursor = null } = {}) => post(PATHS.discovery, { query, limit, cursor }),
    pumpCoins: () => get(PATHS.pumpCoins),
    pumpCoin: (mint) => get(`/api/compat/pump/v3/coins/${mint}`),
    pumpSearch: (query) => get(`${PATHS.pumpSearch}?query=${encodeURIComponent(query || '')}`),
    pumpCandles: (mint, interval = '1m') => get(`/api/compat/pump/v3/candlesticks/${mint}/${encodeURIComponent(interval || '1m')}`),
    meteoraPools: () => get(PATHS.meteoraPools),
    meteoraPool: (mint) => get(`/api/compat/meteora/v1/pools/${mint}`),
    create: (payload) => post(PATHS.nativeCreate, payload),
    rewards: () => get(PATHS.nativeRewards),
    claimRewards: (payload) => post(PATHS.nativeRewardsClaim, payload),
    graduationClaims: (payload) => (payload === undefined
      ? get(PATHS.nativeGraduationClaims)
      : post(PATHS.nativeGraduationClaims, payload)),
    pumpCreate: (payload) => post(PATHS.pumpCreate, payload),
  });
}
