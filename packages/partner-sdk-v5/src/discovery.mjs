/** Read-only discovery. Uses existing catalog paths and additive partner prefixes. */
import { LIVE_ORIGIN, PATHS } from './constants.mjs';

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
} = {}) {
  const base = new URL(origin);
  if (base.protocol !== 'https:' && base.protocol !== 'http:') throw new Error('ORIGIN');

  async function get(path) {
    const url = new URL(path, base);
    if (url.origin !== base.origin) throw new DiscoveryError('ORIGIN', 400);
    const response = await fetcher(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
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

  return Object.freeze({
    origin: base.origin,
    catalog: () => get(PATHS.catalog),
    bootstrap: () => get(PATHS.bootstrap),
    solUsd: () => get(PATHS.solUsd),
    tokens: () => get(PATHS.nativeTokens),
    token: (mint) => get(`${PATHS.nativeTokens}/${mint}`),
    curve: (mint) => get(`${PATHS.nativeTokens}/${mint}/curve`),
    launchpad: () => get(PATHS.nativeLaunchpad),
    pumpCoins: () => get(PATHS.pumpCoins),
    pumpCoin: (mint) => get(`/api/compat/pump/v3/coins/${mint}`),
    meteoraPools: () => get(PATHS.meteoraPools),
    meteoraPool: (mint) => get(`/api/compat/meteora/v1/pools/${mint}`),
  });
}
