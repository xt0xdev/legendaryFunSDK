import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projectTokenList, projectPumpCoin } from '../project.mjs';
import { createPartnerPublicApi, matchPartnerPath } from '../router.mjs';

const catalog = JSON.parse(readFileSync(new URL('./fixture-catalog.json', import.meta.url), 'utf8'));
const fx = { schema: 1, usdPerSol: '72.1' };
const mint = 'GPiHbgbvWbZHKQiVf1v8AupAuST3mqSv3zb2SBJULGND';

function api() {
  return createPartnerPublicApi({
    readCatalog: async () => structuredClone(catalog),
    readFx: async () => structuredClone(fx),
  });
}

async function get(path, method = 'GET') {
  const response = await api().fetch(new Request(`https://legendary.fun${path}`, { method }));
  if (!response) return { response: null, body: null };
  const type = response.headers.get('content-type') || '';
  const body = response.status !== 204 && type.includes('json') ? await response.json() : null;
  return { response, body };
}

test('existing trade/catalog paths are not claimed by the partner router', () => {
  assert.equal(matchPartnerPath('/api/mainnet/trade/catalog'), null);
  assert.equal(matchPartnerPath('/api/mainnet/trade/bootstrap'), null);
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
});

test('quote, swap, tape, and Pump trade routes fail closed instead of faking execution', async () => {
  assert.equal((await get('/api/v1/quote')).response.status, 501);
  assert.equal((await get('/api/v1/swap', 'POST')).response.status, 501);
  assert.equal((await get(`/api/v1/tokens/${mint}/trades`)).body.error.code, 'NOT_ADMITTED');
  assert.equal((await get('/api/compat/pump/v3/trades/latest')).response.status, 501);
  assert.equal((await get('/api/compat/pump/v3/candlesticks/' + mint)).response.status, 501);
  const miss = await get('/api/mainnet/trade/catalog');
  assert.equal(miss.response, null);
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

test('Meteora-shaped pools map from the same catalog; swap2 stays 501', async () => {
  const pools = await get('/api/compat/meteora/v1/pools');
  assert.equal(pools.response.status, 200);
  assert.equal(pools.body.mappedFrom, '/api/mainnet/trade/catalog');
  assert.equal(pools.body.pools[0].baseMint, mint);
  assert.equal(pools.body.pools[0].config, 'Fkeuw75FEAYUpudPNqFqMv2m2KzhSiLYArp1rd8baH1i');
  const one = await get(`/api/compat/meteora/v1/pools/${mint}`);
  assert.equal(one.body.graduated, true);
  assert.equal((await get('/api/compat/meteora/v1/quote')).response.status, 501);
  assert.equal((await get('/api/compat/meteora/v1/swap2', 'POST')).response.status, 501);
});

test('unknown mint 404s; OPTIONS is allowed on the new prefix only', async () => {
  const missing = await get('/api/v1/tokens/11111111111111111111111111111111');
  assert.equal(missing.response.status, 404);
  const options = await get('/api/v1/tokens', 'OPTIONS');
  assert.equal(options.response.status, 204);
});
