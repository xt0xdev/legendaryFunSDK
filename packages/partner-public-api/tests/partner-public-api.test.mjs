import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projectTokenList, projectPumpCoin } from '../project.mjs';
import { createPartnerPublicApi, matchPartnerPath } from '../router.mjs';
import { createLiveLegendaryPorts } from '../live.mjs';

const catalog = JSON.parse(readFileSync(new URL('./fixture-catalog.json', import.meta.url), 'utf8'));
const discovery = JSON.parse(readFileSync(new URL('./fixture-discovery.json', import.meta.url), 'utf8'));
const quotes = JSON.parse(readFileSync(new URL('./fixture-quotes.json', import.meta.url), 'utf8'));
const fx = { schema: 1, usdPerSol: '72.1' };
const mint = 'GPiHbgbvWbZHKQiVf1v8AupAuST3mqSv3zb2SBJULGND';
const lmeow = '422DqsfnCANTP7vNToY7hdBaEXPE1qoc6CD9QyDGLGND';

function api(extra = {}) {
  return createPartnerPublicApi({
    readCatalog: async () => structuredClone(catalog),
    readFx: async () => structuredClone(fx),
    ...extra,
  });
}

function factoryApi() {
  return api({
    readDiscovery: async () => structuredClone(discovery),
    readQuotes: async (mints) => ({
      ...quotes,
      tokens: quotes.tokens.filter((row) => mints.includes(row.mint)),
    }),
  });
}

async function call(path, { method = 'GET', body, extra } = {}) {
  const init = { method, headers: { accept: 'application/json' } };
  if (body !== undefined) {
    init.headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const response = await (extra ? api(extra) : extra === undefined && path.includes('compat')
    ? api()
    : api()).fetch(new Request(`https://legendary.fun${path}`, init));
  if (!response) return { response: null, body: null };
  const type = response.headers.get('content-type') || '';
  const json = response.status !== 204 && type.includes('json') ? await response.json() : null;
  return { response, body: json };
}

async function get(path, method = 'GET') {
  return call(path, { method });
}

async function factoryGet(path, method = 'GET', body) {
  const init = { method, headers: { accept: 'application/json' } };
  if (body !== undefined) {
    init.headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const response = await factoryApi().fetch(new Request(`https://legendary.fun${path}`, init));
  const json = response.status !== 204 ? await response.json() : null;
  return { response, body: json };
}

test('existing trade/catalog paths are not claimed by the partner router', () => {
  assert.equal(matchPartnerPath('/api/mainnet/trade/catalog'), null);
  assert.equal(matchPartnerPath('/api/mainnet/trade/bootstrap'), null);
  assert.equal(matchPartnerPath('/api/mainnet/trade/discovery'), null);
  assert.equal(matchPartnerPath('/api/market/sol-usd'), null);
  assert.equal(matchPartnerPath('/api/devnet/trade/prepare'), null);
  assert.equal(matchPartnerPath('/api/v1/tokens').family, 'v1');
  assert.equal(matchPartnerPath('/api/compat/pump/v3/coins/latest').family, 'pump');
  assert.equal(matchPartnerPath('/api/compat/meteora/v1/pools').family, 'meteora');
});

test('projection does not mutate the catalog and does not invent a name', () => {
  const original = JSON.stringify(catalog);
  const list = projectTokenList(catalog, { usdPerSol: 72.1 });
  assert.equal(JSON.stringify(catalog), original);
  assert.equal(list.tokens.length, 1);
  assert.equal(list.tokens[0].mint, mint);
  assert.equal(list.tokens[0].name, null);
  assert.equal(list.tokens[0].capabilities.factoryBuy, false);
  assert.equal(list.tokens[0].capabilities.signingAllowed, false);
  assert.equal(list.source, '/api/mainnet/trade/catalog');
  const pump = projectPumpCoin(catalog.tokens[0], { usdPerSol: 72.1 });
  assert.equal(pump.complete, true);
  assert.equal(pump.raydium_pool, 'czewDLamSPb89EqxWU37M1ddK7kGeAcDwVWKHAkmwtM');
  assert.equal(pump.program, 'Fkeuw75FEAYUpudPNqFqMv2m2KzhSiLYArp1rd8baH1i');
});

test('additive v1 routes list and look up catalog tokens', async () => {
  const list = await get('/api/v1/tokens');
  assert.equal(list.response.status, 200);
  assert.equal(list.body.launchpad, 'legendary');
  assert.equal(list.body.tokens[0].venue, 'raydium-cpmm');
  const one = await get(`/api/v1/tokens/${mint}`);
  assert.equal(one.body.pool, 'czewDLamSPb89EqxWU37M1ddK7kGeAcDwVWKHAkmwtM');
  const curve = await get(`/api/v1/tokens/${mint}/curve`);
  assert.equal(curve.body.graduated, true);
  assert.equal(curve.body.onFactoryCurve, false);
  const launchpad = await get('/api/v1/launchpad');
  assert.equal(launchpad.body.tags.buy, 'LGCBUY05');
  assert.ok(launchpad.body.existingApisUnchanged.includes('/api/mainnet/trade/catalog'));
  assert.ok(launchpad.body.existingApisUnchanged.includes('/api/mainnet/trade/discovery'));
  assert.equal(launchpad.body.siteLane.create, '/api/mainnet/create');
  assert.equal(launchpad.body.keyedLane.create, '/api/v1/create');
  assert.equal(launchpad.body.keyedLane.prepare, '/api/mainnet/trade/prepare');
  assert.equal(launchpad.body.keyedLane.submit, '/api/mainnet/trade/submit');
  assert.equal(launchpad.body.keyedLane.header, 'x-legendary-api-key');
});

test('quote, swap, tape, and Pump trade routes fail closed instead of faking execution', async () => {
  assert.equal((await get('/api/v1/quote')).response.status, 400);
  assert.equal((await get('/api/v1/swap', 'POST')).response.status, 404);
  assert.equal((await get('/api/v1/swap', 'POST')).body.error.code, 'DISABLED');
  const tape = await get(`/api/v1/tokens/${mint}/trades`);
  assert.equal(tape.response.status, 404);
  assert.equal(tape.body.error.code, 'DISABLED');
  const pumpTape = await get('/api/compat/pump/v3/trades/latest');
  assert.equal(pumpTape.response.status, 404);
  assert.equal((await get('/api/compat/pump/v3/candlesticks/' + mint)).response.status, 404);
  const miss = await get('/api/mainnet/trade/catalog');
  assert.equal(miss.response, null);
});

test('create, claims, and rewards require an owner-issued API key', async () => {
  const create = await get('/api/v1/create', 'POST');
  assert.equal(create.response.status, 401);
  assert.equal(create.body.error.code, 'API_KEY_REQUIRED');
  assert.equal(Object.hasOwn(create.body, 'signature'), false);
  const claim = await get('/api/v1/rewards/claim', 'POST');
  assert.equal(claim.response.status, 401);
  assert.equal(claim.body.error.code, 'API_KEY_REQUIRED');
  const graduation = await get('/api/v1/graduation-claims');
  assert.equal(graduation.body.error.code, 'API_KEY_REQUIRED');
  const pumpCreate = await get('/api/compat/pump/v3/coins/create', 'POST');
  assert.equal(pumpCreate.body.error.code, 'API_KEY_REQUIRED');
});

test('a valid owner API key does not fake an onchain create or claim', async () => {
  const key = 'owner-issued-test-key-aaaaaa';
  async function keyed(path, { method = 'POST', body } = {}) {
    const init = {
      method,
      headers: {
        accept: 'application/json',
        'x-legendary-api-key': key,
      },
    };
    if (method !== 'GET') {
      init.headers['content-type'] = 'application/json';
      init.body = JSON.stringify(body || { wallet: '11111111111111111111111111111111' });
    }
    const response = await api({ ownerApiKeys: [key] }).fetch(new Request(`https://legendary.fun${path}`, init));
    return { response, body: await response.json() };
  }
  const denied = await api({ ownerApiKeys: [key] }).fetch(new Request('https://legendary.fun/api/v1/create', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-legendary-api-key': 'not-the-owner-key-bbbbbbbb',
    },
    body: JSON.stringify({ wallet: '11111111111111111111111111111111' }),
  }));
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).error.code, 'API_KEY');
  const create = await keyed('/api/v1/create');
  assert.equal(create.response.status, 501);
  assert.equal(create.body.error.code, 'NOT_DEPLOYED');
  assert.equal(Object.hasOwn(create.body, 'signature'), false);
  const claim = await keyed('/api/v1/rewards/claim');
  assert.equal(claim.body.error.code, 'NOT_DEPLOYED');
  const rewards = await keyed('/api/v1/rewards', { method: 'GET', body: undefined });
  assert.equal(rewards.body.error.code, 'NOT_DEPLOYED');
});

test('Pump discovery facade maps coins/latest from the same catalog', async () => {
  const latest = await get('/api/compat/pump/v3/coins/latest');
  assert.equal(latest.response.status, 200);
  assert.equal(latest.body.meta.mappedFrom, '/api/mainnet/trade/catalog');
  assert.equal(latest.body.data[0].mint, mint);
  assert.equal(latest.body.data[0].complete, true);
  const cors = latest.response.headers.get('access-control-allow-origin');
  assert.equal(cors, '*');
});

test('Meteora-shaped pools map from the same catalog; quote/swap2 need a body', async () => {
  const pools = await get('/api/compat/meteora/v1/pools');
  assert.equal(pools.response.status, 200);
  assert.equal(pools.body.mappedFrom, '/api/mainnet/trade/catalog');
  assert.equal(pools.body.pools[0].baseMint, mint);
  assert.equal(pools.body.pools[0].config, 'Fkeuw75FEAYUpudPNqFqMv2m2KzhSiLYArp1rd8baH1i');
  const one = await get(`/api/compat/meteora/v1/pools/${mint}`);
  assert.equal(one.body.graduated, true);
  assert.equal((await get('/api/compat/meteora/v1/quote')).response.status, 400);
  assert.equal((await get('/api/compat/meteora/v1/swap2', 'POST')).response.status, 404);
  assert.equal((await get('/api/compat/meteora/v1/swap2', 'POST')).body.error.code, 'DISABLED');
});

test('partner candles map from live candles-swap when that port exists', async () => {
  const { response, body } = await call(`/api/v1/tokens/${mint}/candles?interval=1m`, {
    extra: {
      readCandles: async (asked, interval) => ({
        schema: 2,
        mint: asked,
        interval,
        candles: [{ time: 1794875400, trades: 1 }],
      }),
    },
  });
  assert.equal(response.status, 200);
  assert.equal(body.mappedFrom, `/api/mainnet/trade/candles-swap/${mint}/1m`);
  assert.equal(body.candles[0].trades, 1);
});

test('unknown mint 404s; OPTIONS is allowed on the new prefix only', async () => {
  const missing = await get('/api/v1/tokens/11111111111111111111111111111111');
  assert.equal(missing.response.status, 404);
  const options = await get('/api/v1/tokens', 'OPTIONS');
  assert.equal(options.response.status, 204);
});

test('factory discovery overlays Pump and Meteora with curve names and market cap', async () => {
  const tokens = await factoryGet('/api/v1/tokens');
  assert.equal(tokens.body.source, 'factory-launch-discovery-v1+server-admitted-markets-v1');
  assert.equal(tokens.body.tokens.length, 2);
  assert.equal(tokens.body.tokens[0].mint, lmeow);
  assert.equal(tokens.body.tokens[0].ticker, 'LMEOW');
  assert.equal(tokens.body.tokens[0].phase, 'open');
  assert.equal(typeof tokens.body.tokens[0].displayFdvUsd, 'number');
  const curve = await factoryGet(`/api/v1/tokens/${lmeow}/curve`);
  assert.equal(curve.body.onFactoryCurve, true);
  assert.equal(curve.body.graduated, false);

  const discoveryPage = await factoryGet('/api/v1/discovery', 'POST', { query: '', limit: 50, cursor: null });
  assert.equal(discoveryPage.response.status, 200);
  assert.equal(discoveryPage.body.scope, 'factory-launch-discovery-v1');
  assert.equal(discoveryPage.body.tokens[0].name, 'LMEOW');

  const markets = await factoryGet('/api/v1/markets', 'POST', { mints: [lmeow], version: 3 });
  assert.equal(markets.body.tokens[0].mint, lmeow);
  assert.equal(markets.body.source, 'server-admitted-markets-v1');

  const coins = await factoryGet('/api/compat/pump/v3/coins/latest');
  assert.equal(coins.body.meta.mappedFrom, 'factory-launch-discovery-v1+server-admitted-markets-v1');
  assert.equal(coins.body.data[0].symbol, 'LMEOW');
  assert.equal(coins.body.data[0].complete, false);
  assert.equal(coins.body.data[1].complete, true);

  const search = await factoryGet('/api/compat/pump/v3/coins/search?query=lmeow');
  assert.equal(search.body.data.length, 1);
  assert.equal(search.body.data[0].mint, lmeow);

  const pools = await factoryGet('/api/compat/meteora/v1/pools');
  assert.equal(pools.body.mappedFrom, 'factory-launch-discovery-v1+server-admitted-markets-v1');
  assert.equal(pools.body.pools[0].baseMint, lmeow);
  assert.equal(pools.body.pools[0].onFactoryCurve, true);
  assert.equal(pools.body.pools[0].symbol, 'LMEOW');
  assert.equal(pools.body.pools[1].graduated, true);

  const stream = await factoryGet('/api/v1/stream');
  assert.equal(stream.body.websocket, 'wss://api.legendary.fun/api/mainnet/market/stream');

  const quoted = await factoryGet('/api/v1/quote', 'POST', {
    mint: lmeow,
    side: 'buy',
    amount: '1000000000',
    slippageBps: '100',
  });
  assert.equal(quoted.response.status, 200);
  assert.equal(quoted.body.admitted, false);
  assert.equal(quoted.body.executable, false);
  assert.equal(quoted.body.kind, 'integer-curve-v5');
  assert.ok(BigInt(quoted.body.output) > 0n);
  assert.ok(BigInt(quoted.body.minimumOut) > 0n);

  const swap = await factoryGet('/api/v1/swap', 'POST', {
    mint: lmeow,
    side: 'buy',
    amount: '1000000000',
  });
  assert.equal(swap.response.status, 404);
  assert.equal(swap.body.error.code, 'DISABLED');

  const graduated = await factoryGet('/api/v1/quote', 'POST', {
    mint,
    side: 'buy',
    amount: '1000000000',
  });
  assert.equal(graduated.response.status, 409);
  assert.equal(graduated.body.error.code, 'PHASE');

  const idl = await factoryGet('/api/v1/idl');
  assert.equal(idl.body.instructions[1].tag, 'LGCBUY05');
  const create = await factoryGet('/api/v1/create');
  assert.equal(create.response.status, 401);
  assert.equal(create.body.error.code, 'API_KEY_REQUIRED');
});

test('live ports POST discovery and quotes with Origin pinned to legendary.fun', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url: String(url), method: init.method, headers: init.headers, body: init.body });
    const payload = init.method === 'POST' && String(url).includes('discovery')
      ? discovery
      : init.method === 'POST'
        ? quotes
        : catalog;
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const ports = createLiveLegendaryPorts({ fetcher });
  await ports.readDiscovery({ query: '', limit: 50, cursor: null });
  await ports.readQuotes([lmeow]);
  assert.equal(calls[0].url, 'https://legendary.fun/api/mainnet/trade/discovery');
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].headers.origin, 'https://legendary.fun');
  assert.equal(JSON.parse(calls[0].body).limit, 50);
  assert.equal(calls[1].url, 'https://legendary.fun/api/mainnet/trade/catalog');
  assert.equal(JSON.parse(calls[1].body).version, 3);
  assert.deepEqual(JSON.parse(calls[1].body).mints, [lmeow]);
});
