/** Read-only live legendary.fun ports. Does not change catalog/bootstrap/cookie trade APIs. */
import { isMint } from './project.mjs';

const LIVE = 'https://legendary.fun';
const MAX = 256_000;
const DISCOVERY_MAX = 131_072;

function liveUrl(path) {
  const url = new URL(path, LIVE);
  if (url.protocol !== 'https:' || url.hostname !== 'legendary.fun' || url.username || url.password) {
    throw new Error('ORIGIN');
  }
  return url;
}

async function readResponseJson(response, max) {
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
      if (size > max) throw new Error('SIZE');
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

export function uniqueMints(mints, max = 50) {
  const out = [];
  const seen = new Set();
  for (const mint of mints || []) {
    if (!isMint(mint) || seen.has(mint)) continue;
    seen.add(mint);
    out.push(mint);
    if (out.length >= max) break;
  }
  return out;
}

export function createLiveLegendaryPorts({ fetcher = fetch } = {}) {
  async function getJson(path, signal, max = MAX) {
    const response = await fetcher(liveUrl(path), {
      method: 'GET',
      headers: { accept: 'application/json' },
      redirect: 'error',
      credentials: 'omit',
      cache: 'no-store',
      signal,
    });
    return readResponseJson(response, max);
  }

  async function postJson(path, payload, signal, max = MAX) {
    const response = await fetcher(liveUrl(path), {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        origin: LIVE,
      },
      body: JSON.stringify(payload),
      redirect: 'error',
      credentials: 'omit',
      cache: 'no-store',
      signal,
    });
    return readResponseJson(response, max);
  }

  return Object.freeze({
    readCatalog: (signal) => getJson('/api/mainnet/trade/catalog', signal),
    readFx: (signal) => getJson('/api/market/sol-usd', signal),
    readDiscovery: (query = {}, signal) => postJson('/api/mainnet/trade/discovery', {
      query: typeof query.query === 'string' ? query.query.slice(0, 128) : '',
      limit: query.limit === 20 ? 20 : 50,
      cursor: query.cursor ?? null,
    }, signal, DISCOVERY_MAX),
    async readQuotes(mints, signal) {
      const unique = uniqueMints(mints);
      if (!unique.length) {
        return {
          schema: 2,
          network: 'solana:mainnet',
          scope: 'server-admitted-markets-v1',
          tokens: [],
        };
      }
      return postJson('/api/mainnet/trade/catalog', { mints: unique, version: 3 }, signal);
    },
    readCandles(mint, interval = '1m', signal) {
      if (!isMint(mint)) throw new Error('MINT');
      const selected = typeof interval === 'string' && /^(1m|5m|15m|1h|4h|24h|7d)$/.test(interval) ? interval : '1m';
      return getJson(`/api/mainnet/trade/candles-swap/${mint}/${selected}`, signal);
    },
  });
}
