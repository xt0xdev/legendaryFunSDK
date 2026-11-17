/** Local developer.legendary.fun API: live catalog/discovery/quotes plus additive partner prefixes. */
import { createPartnerPublicApi } from '../../../packages/partner-public-api/router.mjs';
import { createLiveLegendaryPorts } from '../../../packages/partner-public-api/live.mjs';
import { SITE_LANE_MESSAGE } from '../../../packages/partner-public-api/project.mjs';

const LIVE = 'https://legendary.fun';
const MAX = 256_000;
const DISCOVERY_MAX = 131_072;
const EXISTING_GET = Object.freeze([
  '/api/mainnet/trade/catalog',
  '/api/mainnet/trade/bootstrap',
  '/api/market/sol-usd',
]);
const EXISTING_POST = Object.freeze([
  '/api/mainnet/trade/discovery',
  '/api/mainnet/trade/catalog',
]);
const CANDLES_SWAP = /^\/api\/mainnet\/trade\/candles-swap\/([1-9A-HJ-NP-Za-km-z]{32,44})\/(1m|5m|15m|1h|4h|24h|7d)$/;
const SITE_LANE_PREFIXES = Object.freeze([
  '/api/mainnet/create',
  '/api/devnet/create',
  '/api/mainnet/graduation-claims',
  '/api/devnet/graduation-claims',
  '/api/devnet/rewards',
  '/api/devnet/holder-rewards',
  '/api/devnet/trade',
]);

let liveQueue = Promise.resolve();
const discoveryCache = new Map();
const quoteCache = new Map();
const DISCOVERY_TTL_MS = 30_000;
const QUOTE_TTL_MS = 45_000;

function enqueue(task) {
  const run = liveQueue.then(() => task(), () => task());
  liveQueue = run.then(() => undefined, () => undefined);
  return run;
}

function cachedPorts() {
  const live = createLiveLegendaryPorts();
  return {
    readCatalog: (signal) => live.readCatalog(signal),
    readFx: (signal) => live.readFx(signal),
    async readDiscovery(query, signal) {
      const key = JSON.stringify({
        q: query.query || '',
        l: query.limit === 20 ? 20 : 50,
        c: query.cursor || null,
      });
      const now = Date.now();
      const hit = discoveryCache.get(key);
      if (hit && now - hit.at < DISCOVERY_TTL_MS) return hit.value;
      const value = await enqueue(() => live.readDiscovery(query, signal));
      discoveryCache.set(key, { at: Date.now(), value });
      return value;
    },
    async readQuotes(mints, signal) {
      const key = JSON.stringify([...(mints || [])].sort());
      const now = Date.now();
      const hit = quoteCache.get(key);
      if (hit && now - hit.at < QUOTE_TTL_MS) return hit.value;
      const value = await enqueue(() => live.readQuotes(mints, signal));
      quoteCache.set(key, { at: Date.now(), value });
      return value;
    },
    readCandles: (mint, interval, signal) => live.readCandles(mint, interval, signal),
  };
}

function partnerApi() {
  return createPartnerPublicApi(cachedPorts());
}

function passthroughHeaders(upstream) {
  return new Headers({
    'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
    'cache-control': 'public, max-age=0, must-revalidate',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'accept, content-type',
    'x-content-type-options': 'nosniff',
    'x-robots-tag': 'noindex, nofollow',
    'x-legendary-upstream': 'legendary.fun',
  });
}

function liveUrl(path) {
  const url = new URL(path, LIVE);
  if (url.protocol !== 'https:' || url.hostname !== 'legendary.fun' || url.username || url.password) {
    return null;
  }
  return url;
}

function corsOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'accept, content-type',
    },
  });
}

function siteLane() {
  return Response.json(
    { schema: 1, error: { code: 'DISABLED', message: SITE_LANE_MESSAGE, retryable: false } },
    { status: 404, headers: { 'x-content-type-options': 'nosniff' } },
  );
}

async function passthrough(path, { method, headers, body, signal, max = MAX }) {
  const target = liveUrl(path);
  if (!target) {
    return Response.json(
      { schema: 1, error: { code: 'ORIGIN', message: 'Live DAP origin is pinned.' } },
      { status: 500, headers: { 'x-content-type-options': 'nosniff' } },
    );
  }
  const upstream = await fetch(target, {
    method,
    headers,
    body,
    redirect: 'error',
    credentials: 'omit',
    cache: 'no-store',
    signal,
  });
  const type = upstream.headers.get('content-type')?.split(';')[0].trim();
  if (type !== 'application/json') {
    return Response.json(
      { schema: 1, error: { code: 'UPSTREAM', message: 'Live DAP did not return JSON.' } },
      { status: 502, headers: { 'x-content-type-options': 'nosniff' } },
    );
  }
  const bytes = await upstream.arrayBuffer();
  if (bytes.byteLength > max) {
    return Response.json(
      { schema: 1, error: { code: 'SIZE', message: 'Upstream payload too large.' } },
      { status: 502, headers: { 'x-content-type-options': 'nosniff' } },
    );
  }
  return new Response(bytes, { status: upstream.status, headers: passthroughHeaders(upstream) });
}

export async function handleDeveloperApi(request) {
  const url = new URL(request.url);
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(15_000)]);
  if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) return corsOptions();
  if (SITE_LANE_PREFIXES.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) {
    return siteLane();
  }
  if (CANDLES_SWAP.test(url.pathname) && request.method === 'GET') {
    return passthrough(url.pathname, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal,
    });
  }
  if (EXISTING_GET.includes(url.pathname) && request.method === 'GET') {
    return passthrough(url.pathname, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal,
    });
  }
  if (EXISTING_POST.includes(url.pathname) && request.method === 'POST') {
    const raw = await request.arrayBuffer();
    const max = url.pathname.endsWith('/discovery') ? DISCOVERY_MAX : MAX;
    if (raw.byteLength > 16_384) {
      return Response.json(
        { schema: 1, error: { code: 'SIZE', message: 'Request body too large.' } },
        { status: 413, headers: { 'x-content-type-options': 'nosniff' } },
      );
    }
    return enqueue(() => passthrough(url.pathname, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        origin: LIVE,
      },
      body: raw,
      signal,
      max,
    }));
  }
  if (EXISTING_GET.includes(url.pathname) || EXISTING_POST.includes(url.pathname)) {
    return Response.json(
      { schema: 1, error: { code: 'METHOD', message: 'GET catalog/bootstrap/fx; POST discovery and catalog quotes.' } },
      { status: 405, headers: { 'x-content-type-options': 'nosniff' } },
    );
  }
  const response = await partnerApi().fetch(new Request(request, { signal }));
  if (response) return response;
  return Response.json(
    { schema: 1, error: { code: 'NOT_FOUND', message: 'Unknown partner path.' } },
    { status: 404, headers: { 'x-content-type-options': 'nosniff' } },
  );
}
