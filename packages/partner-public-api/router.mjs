/** Additive partner HTTP surface. Existing /api/mainnet/trade and /api/devnet/trade are not handled here. */
import {
  DEFAULT_IDENTITY,
  PARTNER_PREFIX,
  PUMP_COMPAT_PREFIX,
  METEORA_COMPAT_PREFIX,
  catalogTokens,
  combineDiscoveryQuote,
  factorySource,
  isMint,
  mergeFactoryRows,
  projectCurve,
  projectDiscoveryPage,
  projectLaunchpad,
  projectMarketList,
  projectMeteoraPool,
  projectPumpCoin,
  projectStream,
  projectToken,
  projectTokenListFromRows,
} from './project.mjs';
import { uniqueMints } from './live.mjs';
import { QuoteError, quoteTrade } from '../partner-sdk-v5/src/quote.mjs';
import idl from './idl.mjs';

const DISABLED_MESSAGE = 'This partner prefix does not serve create, claims, hosted swap, or Pump/Meteora execute. Site trading is same-origin on legendary.fun.';
const CANDLE_INTERVALS = new Set(['1m', '5m', '15m', '1h', '4h', '24h', '7d']);

const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'public, max-age=0, must-revalidate',
  'cdn-cache-control': 'no-store',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'accept, content-type',
  'x-content-type-options': 'nosniff',
  'x-robots-tag': 'noindex, nofollow',
};

const SITE_LANE = new Set([
  'create',
  'rewards',
  'rewards/claim',
  'claims',
  'graduation-claims',
]);

function json(value, status = 200) {
  return new Response(JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? String(v) : v)), {
    status,
    headers: HEADERS,
  });
}

function fail(status, code, message) {
  return json({ schema: 1, error: { code, message, retryable: false } }, status);
}

function disabled() {
  return fail(404, 'DISABLED', DISABLED_MESSAGE);
}

function usdPerSol(fx) {
  const n = typeof fx?.usdPerSol === 'string' ? Number(fx.usdPerSol) : Number.NaN;
  return Number.isFinite(n) && n > 0 && n <= 100_000 ? n : null;
}

function findToken(catalog, mint) {
  return catalogTokens(catalog).find((row) => row.mint === mint) || null;
}

function isSiteLane(rest) {
  if (SITE_LANE.has(rest)) return true;
  return rest.startsWith('create/')
    || rest.startsWith('graduation-claims/')
    || rest.startsWith('rewards/')
    || rest.startsWith('claims/');
}

function quoteFail(error) {
  const code = error?.code || 'QUOTE';
  const status = code === 'PHASE' || code === 'STATE' || code === 'INVENTORY' || code === 'RESERVE' ? 409 : 400;
  return fail(status, code, 'Integer quote rejected. This is not a hosted execution.');
}

async function integerQuote(ports, body) {
  if (!isMint(body?.mint)) {
    const error = new QuoteError('AMOUNT');
    throw error;
  }
  const row = await resolveRow(body.mint, ports);
  if (!row) return null;
  return quoteTrade({
    row,
    side: body.side,
    amount: body.amount,
    slippageBps: body.slippageBps,
    currentSlot: body.currentSlot,
  });
}

async function jsonBody(request, max = 16_384) {
  const raw = await request.arrayBuffer();
  if (raw.byteLength > max) {
    const error = new Error('SIZE');
    error.httpStatus = 413;
    throw error;
  }
  if (raw.byteLength === 0) return {};
  const text = new TextDecoder('utf-8', { fatal: true }).decode(raw);
  const value = JSON.parse(text);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    const error = new Error('BODY');
    error.httpStatus = 400;
    throw error;
  }
  return value;
}

function discoveryQuery(input = {}) {
  const query = typeof input.query === 'string' ? input.query.slice(0, 128) : '';
  const limit = input.limit === 20 ? 20 : 50;
  const cursor = typeof input.cursor === 'string' && /^[A-Za-z0-9_-]{1,768}$/.test(input.cursor)
    ? input.cursor
    : null;
  return { query, limit, cursor };
}

export function matchPartnerPath(pathname) {
  if (typeof pathname !== 'string') return null;
  if (pathname === PARTNER_PREFIX || pathname.startsWith(`${PARTNER_PREFIX}/`)) {
    return { family: 'v1', rest: pathname.slice(PARTNER_PREFIX.length).replace(/^\/+/, '') };
  }
  if (pathname === PUMP_COMPAT_PREFIX || pathname.startsWith(`${PUMP_COMPAT_PREFIX}/`)) {
    return { family: 'pump', rest: pathname.slice(PUMP_COMPAT_PREFIX.length).replace(/^\/+/, '') };
  }
  if (pathname === METEORA_COMPAT_PREFIX || pathname.startsWith(`${METEORA_COMPAT_PREFIX}/`)) {
    return { family: 'meteora', rest: pathname.slice(METEORA_COMPAT_PREFIX.length).replace(/^\/+/, '') };
  }
  return null;
}

async function liveCandles(ports, mint, interval) {
  const selected = CANDLE_INTERVALS.has(interval) ? interval : '1m';
  if (!isMint(mint) || typeof ports.readCandles !== 'function') return disabled();
  try {
    const candles = await ports.readCandles(mint, selected, ports.signal);
    if (!candles || typeof candles !== 'object' || Array.isArray(candles)) {
      return fail(502, 'UPSTREAM', 'Live candles did not return JSON.');
    }
    return json({
      ...candles,
      launchpad: 'legendary',
      mappedFrom: `/api/mainnet/trade/candles-swap/${mint}/${selected}`,
    });
  } catch {
    return fail(502, 'UPSTREAM', 'Live candles are unavailable.');
  }
}

export function createPartnerPublicApi({
  readCatalog,
  readFx,
  readDiscovery,
  readQuotes,
  readCandles,
  identity = DEFAULT_IDENTITY,
} = {}) {
  if (typeof readCatalog !== 'function' || typeof readFx !== 'function') throw new Error('CONFIG');
  return Object.freeze({
    matchPartnerPath,
    async fetch(request) {
      const url = new URL(request.url);
      const matched = matchPartnerPath(url.pathname);
      if (!matched) return null;
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET, POST, OPTIONS',
            'access-control-allow-headers': 'accept, content-type',
          },
        });
      }
      if (request.method !== 'GET' && request.method !== 'POST') {
        return fail(405, 'METHOD', 'Use GET for lists. POST is admitted for /discovery, /markets, and /quote.');
      }
      try {
        const ports = {
          readCatalog,
          readFx,
          readDiscovery: typeof readDiscovery === 'function' ? readDiscovery : null,
          readQuotes: typeof readQuotes === 'function' ? readQuotes : null,
          readCandles: typeof readCandles === 'function' ? readCandles : null,
          identity,
          signal: request.signal,
          url,
        };
        if (matched.family === 'v1') return await v1(matched.rest, ports, request);
        if (matched.family === 'pump') return await pump(matched.rest, ports, request);
        return await meteora(matched.rest, ports, request);
      } catch (error) {
        if (error?.httpStatus === 413) return fail(413, 'SIZE', 'Request body too large.');
        if (error?.httpStatus === 400) return fail(400, 'BODY', 'JSON object body required.');
        return fail(503, 'UNAVAILABLE', 'Partner discovery could not read the existing catalog.');
      }
    },
  });
}

async function loadSurface(ports) {
  const catalog = await ports.readCatalog(ports.signal);
  const fx = await ports.readFx(ports.signal);
  const options = { usdPerSol: usdPerSol(fx), identity: ports.identity };
  if (!ports.readDiscovery) {
    return {
      catalog,
      fx,
      options,
      rows: catalogTokens(catalog),
      source: '/api/mainnet/trade/catalog',
      discovery: null,
      quotes: catalog,
    };
  }
  let discovery = null;
  try {
    discovery = await ports.readDiscovery({ query: '', limit: 50, cursor: null }, ports.signal);
  } catch {
    discovery = null;
  }
  const discovered = Array.isArray(discovery?.tokens) ? discovery.tokens : [];
  let quotes = catalog;
  if (ports.readQuotes && discovered.length) {
    try {
      quotes = await ports.readQuotes(discovered.map((row) => row.mint).filter(isMint), ports.signal);
    } catch {
      quotes = catalog;
    }
  }
  return {
    catalog,
    fx,
    options,
    rows: mergeFactoryRows(discovery, quotes, catalog),
    source: factorySource(discovery),
    discovery,
    quotes,
  };
}

async function resolveRow(mint, ports) {
  const surface = await loadSurface(ports);
  const listed = surface.rows.find((row) => row.mint === mint);
  if (listed) return listed;
  if (ports.readQuotes) {
    try {
      const quotes = await ports.readQuotes([mint], ports.signal);
      const quoted = findToken(quotes, mint);
      if (quoted) {
        if (ports.readDiscovery) {
          try {
            const discovery = await ports.readDiscovery({ query: mint, limit: 20, cursor: null }, ports.signal);
            const hit = (discovery?.tokens || []).find((row) => row?.mint === mint);
            if (hit) return combineDiscoveryQuote(hit, quoted);
          } catch {
            return quoted;
          }
        }
        return quoted;
      }
    } catch {
      /* fall through to catalog */
    }
  }
  return findToken(surface.catalog, mint);
}

async function v1(rest, ports, request) {
  const method = request.method;
  if (isSiteLane(rest) || rest === 'swap') return disabled();
  if (rest === 'idl') return json(idl);
  if (rest === 'quote' && (method === 'GET' || method === 'POST')) {
    try {
      const input = method === 'POST' ? await jsonBody(request) : Object.fromEntries(ports.url.searchParams);
      const quote = await integerQuote(ports, input);
      if (!quote) return fail(404, 'NOT_FOUND', 'Unknown mint in factory discovery or catalog.');
      return json(quote);
    } catch (error) {
      if (error instanceof QuoteError) return quoteFail(error);
      throw error;
    }
  }
  if (rest === 'discovery' && (method === 'GET' || method === 'POST')) {
    const input = method === 'POST' ? await jsonBody(request) : Object.fromEntries(ports.url.searchParams);
    const query = discoveryQuery(input);
    const catalog = await ports.readCatalog(ports.signal);
    const fx = await ports.readFx(ports.signal);
    const options = { usdPerSol: usdPerSol(fx), identity: ports.identity };
    if (!ports.readDiscovery) {
      return json(projectDiscoveryPage(null, catalog, catalog, options));
    }
    const discovery = await ports.readDiscovery(query, ports.signal);
    let quotes = catalog;
    if (ports.readQuotes && Array.isArray(discovery?.tokens) && discovery.tokens.length) {
      try {
        quotes = await ports.readQuotes(discovery.tokens.map((row) => row.mint).filter(isMint), ports.signal);
      } catch {
        quotes = catalog;
      }
    }
    return json(projectDiscoveryPage(discovery, quotes, catalog, options));
  }
  if (rest === 'markets' && (method === 'GET' || method === 'POST')) {
    const input = method === 'POST' ? await jsonBody(request) : { mints: ports.url.searchParams.get('mints') };
    const requested = Array.isArray(input.mints)
      ? input.mints
      : typeof input.mints === 'string'
        ? input.mints.split(',')
        : [];
    const mints = uniqueMints(requested);
    const fx = await ports.readFx(ports.signal);
    const options = { usdPerSol: usdPerSol(fx), identity: ports.identity };
    if (!mints.length) return json(projectMarketList({ tokens: [] }, options));
    if (ports.readQuotes) {
      return json(projectMarketList(await ports.readQuotes(mints, ports.signal), options));
    }
    const catalog = await ports.readCatalog(ports.signal);
    const tokens = catalogTokens(catalog).filter((row) => mints.includes(row.mint));
    return json(projectMarketList({ tokens }, options));
  }
  if (method !== 'GET') {
    return fail(405, 'METHOD', 'Use GET for lists. POST is admitted for /discovery, /markets, and /quote.');
  }
  if (rest === '' || rest === 'tokens') {
    const surface = await loadSurface(ports);
    return json(projectTokenListFromRows(
      surface.rows,
      surface.source,
      surface.discovery?.asOfMs ?? surface.catalog?.asOfMs,
      surface.catalog?.expiresAtMs,
      surface.options,
    ));
  }
  if (rest === 'launchpad' || rest === 'site') return json(projectLaunchpad(ports.identity));
  if (rest === 'sol-usd') return json({ schema: 1, ...(await ports.readFx(ports.signal)) });
  if (rest === 'stream') return json(projectStream());
  const tokenMatch = rest.match(/^tokens\/([1-9A-HJ-NP-Za-km-z]{32,44})(?:\/(curve|trades|candles))?$/);
  if (tokenMatch && isMint(tokenMatch[1])) {
    if (tokenMatch[2] === 'trades') return disabled();
    if (tokenMatch[2] === 'candles') {
      return liveCandles(ports, tokenMatch[1], ports.url.searchParams.get('interval') || '1m');
    }
    const row = await resolveRow(tokenMatch[1], ports);
    if (!row) return fail(404, 'NOT_FOUND', 'Unknown mint in factory discovery or catalog.');
    if (tokenMatch[2] === 'curve') return json(projectCurve(row));
    const fx = await ports.readFx(ports.signal);
    return json(projectToken(row, { usdPerSol: usdPerSol(fx), identity: ports.identity }));
  }
  return fail(404, 'NOT_FOUND', 'Unknown partner path.');
}

async function pump(rest, ports, request) {
  const method = request.method;
  if (rest === 'coins/create' || rest === 'buy' || rest === 'sell' || rest.startsWith('trades')) {
    return disabled();
  }
  const sticks = rest.match(/^candlesticks\/([1-9A-HJ-NP-Za-km-z]{32,44})(?:\/([A-Za-z0-9]+))?$/);
  if (sticks) return liveCandles(ports, sticks[1], sticks[2] || ports.url.searchParams.get('interval') || '1m');
  if (rest === 'candlesticks') return disabled();
  if (method !== 'GET' && !(method === 'POST' && (rest === 'coins' || rest === 'coins/latest' || rest === 'coins/list' || rest === 'coins/search'))) {
    return disabled();
  }
  const surface = await loadSurface(ports);
  const mappedFrom = surface.source;
  if (rest === '' || rest === 'coins' || rest === 'coins/latest' || rest === 'coins/list' || rest === 'coins/search') {
    let rows = surface.rows;
    const query = method === 'POST'
      ? (await jsonBody(request)).query
      : ports.url.searchParams.get('query');
    if (typeof query === 'string' && query.trim()) {
      const needle = query.trim().toLowerCase();
      rows = rows.filter((row) => {
        const token = projectToken(row, surface.options);
        if (!token) return false;
        return token.mint.toLowerCase() === needle
          || (token.name && token.name.toLowerCase().includes(needle))
          || (token.ticker && token.ticker.toLowerCase().includes(needle));
      });
    }
    const coins = rows.map((row) => projectPumpCoin(row, surface.options)).filter(Boolean);
    return json({ data: coins, meta: { source: 'legendary', launchpad: 'legendary', mappedFrom } });
  }
  if (rest === 'sol-price') {
    const n = usdPerSol(surface.fx);
    return json({ sol_price: n, meta: { source: '/api/market/sol-usd' } });
  }
  const coin = rest.match(/^coins\/([1-9A-HJ-NP-Za-km-z]{32,44})$/);
  if (coin && isMint(coin[1])) {
    const row = surface.rows.find((item) => item.mint === coin[1]) || await resolveRow(coin[1], ports);
    if (!row) return fail(404, 'NOT_FOUND', 'Unknown mint in factory discovery or catalog.');
    return json({ data: projectPumpCoin(row, surface.options), meta: { source: 'legendary', mappedFrom } });
  }
  return disabled();
}

async function meteora(rest, ports, request) {
  const method = request.method;
  if ((rest === 'quote' || rest === 'swapQuote2') && (method === 'GET' || method === 'POST')) {
    try {
      const input = method === 'POST' ? await jsonBody(request) : Object.fromEntries(ports.url.searchParams);
      const quote = await integerQuote(ports, {
        mint: input.mint || input.baseMint,
        side: input.swapBaseForQuote === true || input.side === 'sell' ? 'sell' : 'buy',
        amount: input.amount,
        slippageBps: input.slippageBps,
      });
      if (!quote) return fail(404, 'NOT_FOUND', 'Unknown mint in factory discovery or catalog.');
      return json({ ...quote, mappedFrom: 'legendary', swapBaseForQuote: quote.side === 'sell' });
    } catch (error) {
      if (error instanceof QuoteError) return quoteFail(error);
      throw error;
    }
  }
  if (rest === 'swap2' || rest === 'swap') return disabled();
  if (method !== 'GET') {
    return fail(405, 'METHOD', 'Use GET for pools. POST /quote returns a Legendary integer quote, not Meteora program bytes.');
  }
  const surface = await loadSurface(ports);
  const mappedFrom = surface.source;
  if (rest === '' || rest === 'pools') {
    const pools = surface.rows.map((row) => projectMeteoraPool(row, { identity: ports.identity, usdPerSol: usdPerSol(surface.fx), mappedFrom })).filter(Boolean);
    return json({ schema: 1, launchpad: 'legendary', mappedFrom, pools });
  }
  const pool = rest.match(/^pools\/([1-9A-HJ-NP-Za-km-z]{32,44})$/);
  if (pool && isMint(pool[1])) {
    const row = surface.rows.find((item) => item.mint === pool[1]) || await resolveRow(pool[1], ports);
    if (!row) return fail(404, 'NOT_FOUND', 'Unknown mint in factory discovery or catalog.');
    return json(projectMeteoraPool(row, { identity: ports.identity, usdPerSol: usdPerSol(surface.fx), mappedFrom }));
  }
  return disabled();
}
