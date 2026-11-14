/** Additive partner HTTP surface. Existing /api/mainnet/trade and /api/devnet/trade are not handled here. */
import {
  DEFAULT_IDENTITY,
  PARTNER_PREFIX,
  PUMP_COMPAT_PREFIX,
  METEORA_COMPAT_PREFIX,
  catalogTokens,
  isMint,
  projectCurve,
  projectLaunchpad,
  projectMeteoraPool,
  projectPumpCoin,
  projectToken,
  projectTokenList,
} from './project.mjs';

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

function json(value, status = 200) {
  return new Response(JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? String(v) : v)), {
    status,
    headers: HEADERS,
  });
}

function fail(status, code, message) {
  return json({ schema: 1, error: { code, message, retryable: false } }, status);
}

function usdPerSol(fx) {
  const n = typeof fx?.usdPerSol === 'string' ? Number(fx.usdPerSol) : Number.NaN;
  return Number.isFinite(n) && n > 0 && n <= 100_000 ? n : null;
}

function findToken(catalog, mint) {
  return catalogTokens(catalog).find((row) => row.mint === mint) || null;
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

export function createPartnerPublicApi({
  readCatalog,
  readFx,
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
        return fail(405, 'METHOD', 'Use GET for discovery. POST swap/quote builders are not admitted.');
      }
      try {
        const ports = { readCatalog, readFx, identity, signal: request.signal };
        if (matched.family === 'v1') return await v1(matched.rest, ports, request.method);
        if (matched.family === 'pump') return await pump(matched.rest, ports, request.method);
        return await meteora(matched.rest, ports, request.method);
      } catch {
        return fail(503, 'UNAVAILABLE', 'Partner discovery could not read the existing catalog.');
      }
    },
  });
}

async function v1(rest, ports, method = 'GET') {
  if (method !== 'GET' || rest === 'quote' || rest === 'swap' || /^tokens\/[1-9A-HJ-NP-Za-km-z]{32,44}\/trades$/.test(rest)) {
    if (rest === 'quote' || rest === 'swap' || rest.endsWith('/trades') || method === 'POST') {
      return fail(501, 'NOT_ADMITTED', 'Curve quote, swap, and trade tape are not admitted. Existing catalog capabilities are unchanged.');
    }
    return fail(405, 'METHOD', 'Partner discovery is GET-only.');
  }
  if (rest === '' || rest === 'tokens') {
    const catalog = await ports.readCatalog(ports.signal);
    const fx = await ports.readFx(ports.signal);
    return json(projectTokenList(catalog, { usdPerSol: usdPerSol(fx), identity: ports.identity }));
  }
  if (rest === 'launchpad') return json(projectLaunchpad(ports.identity));
  if (rest === 'sol-usd') return json({ schema: 1, ...(await ports.readFx(ports.signal)) });
  const tokenMatch = rest.match(/^tokens\/([1-9A-HJ-NP-Za-km-z]{32,44})(?:\/(curve))?$/);
  if (tokenMatch && isMint(tokenMatch[1])) {
    const catalog = await ports.readCatalog(ports.signal);
    const row = findToken(catalog, tokenMatch[1]);
    if (!row) return fail(404, 'NOT_FOUND', 'Unknown mint in the existing catalog.');
    if (tokenMatch[2] === 'curve') return json(projectCurve(row));
    const fx = await ports.readFx(ports.signal);
    return json(projectToken(row, { usdPerSol: usdPerSol(fx), identity: ports.identity }));
  }
  return fail(404, 'NOT_FOUND', 'Unknown partner path.');
}

async function pump(rest, ports, method = 'GET') {
  const unimplemented = new Set([
    'trades/latest',
    'trades/all',
    'candlesticks',
    'coins/create',
  ]);
  if (method !== 'GET' || unimplemented.has(rest) || rest.startsWith('trades/') || rest.startsWith('candlesticks/')) {
    return fail(501, 'NOT_ADMITTED', 'Pump trade-tape, candles, create, and buy/sell routes are not mapped. Discovery-only facade.');
  }
  const catalog = await ports.readCatalog(ports.signal);
  const fx = await ports.readFx(ports.signal);
  const options = { usdPerSol: usdPerSol(fx), identity: ports.identity };
  if (rest === '' || rest === 'coins' || rest === 'coins/latest' || rest === 'coins/list') {
    const coins = catalogTokens(catalog).map((row) => projectPumpCoin(row, options)).filter(Boolean);
    return json({ data: coins, meta: { source: 'legendary', launchpad: 'legendary', mappedFrom: '/api/mainnet/trade/catalog' } });
  }
  if (rest === 'sol-price') {
    const n = usdPerSol(fx);
    return json({ sol_price: n, meta: { source: '/api/market/sol-usd' } });
  }
  const coin = rest.match(/^coins\/([1-9A-HJ-NP-Za-km-z]{32,44})$/);
  if (coin && isMint(coin[1])) {
    const row = findToken(catalog, coin[1]);
    if (!row) return fail(404, 'NOT_FOUND', 'Unknown mint in the existing catalog.');
    return json({ data: projectPumpCoin(row, options), meta: { source: 'legendary', mappedFrom: '/api/mainnet/trade/catalog' } });
  }
  return fail(501, 'NOT_ADMITTED', 'This Pump frontend route is not mapped. Use /api/v1/tokens.');
}

async function meteora(rest, ports, method = 'GET') {
  if (method !== 'GET' || rest === 'swap2' || rest === 'swap' || rest === 'quote') {
    return fail(501, 'NOT_ADMITTED', 'Meteora-shaped swapQuote2/swap2 are not admitted. Pool list is discovery-only.');
  }
  const catalog = await ports.readCatalog(ports.signal);
  if (rest === '' || rest === 'pools') {
    const pools = catalogTokens(catalog).map((row) => projectMeteoraPool(row, { identity: ports.identity })).filter(Boolean);
    return json({ schema: 1, launchpad: 'legendary', mappedFrom: '/api/mainnet/trade/catalog', pools });
  }
  const pool = rest.match(/^pools\/([1-9A-HJ-NP-Za-km-z]{32,44})$/);
  if (pool && isMint(pool[1])) {
    const row = findToken(catalog, pool[1]);
    if (!row) return fail(404, 'NOT_FOUND', 'Unknown mint in the existing catalog.');
    return json(projectMeteoraPool(row, { identity: ports.identity }));
  }
  return fail(501, 'NOT_ADMITTED', 'This Meteora DBC route is not mapped. Use /api/v1/tokens.');
}
