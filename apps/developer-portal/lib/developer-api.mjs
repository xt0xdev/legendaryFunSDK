/** Local developer.legendary.fun API: live catalog/bootstrap/fx plus additive partner prefixes. */
import { createPartnerPublicApi } from '../../../packages/partner-public-api/router.mjs';

const LIVE = 'https://legendary.fun';
const MAX = 256_000;
const EXISTING = Object.freeze([
  '/api/mainnet/trade/catalog',
  '/api/mainnet/trade/bootstrap',
  '/api/market/sol-usd',
]);

async function readLiveJson(path, signal) {
  const url = new URL(path, LIVE);
  if (url.protocol !== 'https:' || url.hostname !== 'legendary.fun' || url.username || url.password) {
    throw new Error('ORIGIN');
  }
  const response = await fetch(url, {
    method: 'GET',
    headers: { accept: 'application/json' },
    redirect: 'error',
    credentials: 'omit',
    cache: 'no-store',
    signal,
  });
  const type = response.headers.get('content-type')?.split(';')[0].trim();
  if (!response.ok || type !== 'application/json' || !response.body) throw new Error('UPSTREAM');
  const reader = response.body.getReader();
  const parts = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > MAX) throw new Error('SIZE');
      parts.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const part of parts) {
    bytes.set(part, at);
    at += part.length;
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

function partnerApi() {
  return createPartnerPublicApi({
    readCatalog: (signal) => readLiveJson('/api/mainnet/trade/catalog', signal),
    readFx: (signal) => readLiveJson('/api/market/sol-usd', signal),
  });
}

function passthroughHeaders(upstream) {
  const headers = new Headers({
    'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
    'cache-control': 'public, max-age=0, must-revalidate',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'accept, content-type',
    'x-content-type-options': 'nosniff',
    'x-robots-tag': 'noindex, nofollow',
    'x-legendary-upstream': 'legendary.fun',
  });
  return headers;
}

export async function handleDeveloperApi(request) {
  const url = new URL(request.url);
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(15_000)]);
  if (request.method === 'OPTIONS' && (EXISTING.includes(url.pathname) || url.pathname.startsWith('/api/'))) {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'accept, content-type',
      },
    });
  }
  if (EXISTING.includes(url.pathname)) {
    if (request.method !== 'GET') {
      return Response.json(
        { schema: 1, error: { code: 'METHOD', message: 'Existing DAP paths are GET-only here.' } },
        { status: 405, headers: { 'x-content-type-options': 'nosniff' } },
      );
    }
    const liveUrl = new URL(url.pathname, LIVE);
    if (liveUrl.protocol !== 'https:' || liveUrl.hostname !== 'legendary.fun' || liveUrl.username || liveUrl.password) {
      return Response.json(
        { schema: 1, error: { code: 'ORIGIN', message: 'Live DAP origin is pinned.' } },
        { status: 500, headers: { 'x-content-type-options': 'nosniff' } },
      );
    }
    const upstream = await fetch(liveUrl, {
      method: 'GET',
      headers: { accept: 'application/json' },
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
    const body = await upstream.arrayBuffer();
    if (body.byteLength > MAX) {
      return Response.json(
        { schema: 1, error: { code: 'SIZE', message: 'Upstream payload too large.' } },
        { status: 502, headers: { 'x-content-type-options': 'nosniff' } },
      );
    }
    return new Response(body, { status: upstream.status, headers: passthroughHeaders(upstream) });
  }
  const response = await partnerApi().fetch(new Request(request, { signal }));
  if (response) return response;
  return Response.json(
    { schema: 1, error: { code: 'NOT_FOUND', message: 'Unknown partner path.' } },
    { status: 404, headers: { 'x-content-type-options': 'nosniff' } },
  );
}
