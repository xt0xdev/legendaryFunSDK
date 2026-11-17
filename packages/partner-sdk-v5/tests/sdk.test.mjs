import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeTrade, TAGS, createLegendarySdk, PATHS, PORTAL_ORIGIN, PORTAL_ORIGIN_ALIAS, quoteTrade } from '../src/index.mjs';
import { PROFILE } from '../src/quote.mjs';

test('encodes a 52-byte v5 buy and rejects v4-length payloads', () => {
  const data = encodeTrade({
    side: 'buy',
    revision: 67n,
    policyVersion: 1n,
    amount: 1_000_000_000n,
    minimumOut: 1n,
    expirySlot: 500n,
  });
  assert.equal(data.length, 52);
  assert.equal(Buffer.from(data.subarray(0, 8)).toString('ascii'), TAGS.buy);
  assert.notEqual(Buffer.from(data.subarray(0, 8)).toString('ascii'), 'LGCBUY04');
});

test('three integration surfaces are present and execution is not admitted', async () => {
  const sdk = createLegendarySdk({ origin: 'https://legendary.fun' });
  assert.equal(sdk.paths.catalog, PATHS.catalog);
  assert.equal(sdk.paths.discovery, '/api/mainnet/trade/discovery');
  assert.ok(sdk.native.tokens);
  assert.ok(sdk.native.discover);
  assert.ok(sdk.native.markets);
  assert.ok(sdk.pump.getLatestCoins);
  assert.ok(sdk.pump.searchCoins);
  assert.ok(sdk.meteora.getPools);
  await assert.rejects(() => sdk.native.quote(), { code: 'AMOUNT' });
  await assert.rejects(() => sdk.native.prepare(), { code: 'AMOUNT' });
  await assert.rejects(() => sdk.pump.buy(), { code: 'AMOUNT' });
  await assert.rejects(() => sdk.meteora.swap2(), { code: 'AMOUNT' });
  await assert.rejects(() => sdk.native.create(), { code: 'AMOUNT' });
  await assert.rejects(() => sdk.native.claimRewards(), { code: 'AMOUNT' });
  await assert.rejects(() => sdk.pump.createCoin(), { code: 'AMOUNT' });
  assert.equal(sdk.paths.prepare, '/api/mainnet/trade/prepare');
  assert.equal(sdk.paths.submit, '/api/mainnet/trade/submit');
  assert.equal(sdk.paths.nativeCreate, '/api/v1/create');
  assert.equal(sdk.paths.nativeRewardsClaim, '/api/v1/rewards/claim');
});

test('create, claim, and prepare send the owner API key and do not invent a signature', async () => {
  const seen = [];
  const sdk = createLegendarySdk({
    origin: 'https://legendary.fun',
    apiKey: 'owner-issued-test-key-aaaaaa',
    fetcher: async (url, init) => {
      seen.push({ url: String(url), headers: init.headers });
      return new Response(JSON.stringify({ schema: 1, error: { code: 'NOT_DEPLOYED' } }), {
        status: 501,
        headers: { 'content-type': 'application/json' },
      });
    },
  });
  await assert.rejects(
    () => sdk.native.create({ wallet: '11111111111111111111111111111111', name: 'Demo', ticker: 'DEMO' }),
    { code: 'NOT_DEPLOYED' },
  );
  await assert.rejects(
    () => sdk.native.claimRewards({ wallet: '11111111111111111111111111111111' }),
    { code: 'NOT_DEPLOYED' },
  );
  await assert.rejects(
    () => sdk.native.prepare({
      wallet: '11111111111111111111111111111111',
      mint: '422DqsfnCANTP7vNToY7hdBaEXPE1qoc6CD9QyDGLGND',
      amount: '1000000000',
    }),
    { code: 'NOT_DEPLOYED' },
  );
  assert.equal(seen[0].headers['x-legendary-api-key'], 'owner-issued-test-key-aaaaaa');
  assert.equal(seen[0].url.endsWith('/api/v1/create'), true);
  assert.equal(seen[1].url.endsWith('/api/v1/rewards/claim'), true);
  assert.equal(seen[2].url.endsWith('/api/mainnet/trade/prepare'), true);
  assert.equal(seen[2].headers['x-legendary-api-key'], 'owner-issued-test-key-aaaaaa');
});

test('integer buy quote returns output from genesis curve state', () => {
  const row = {
    mint: '422DqsfnCANTP7vNToY7hdBaEXPE1qoc6CD9QyDGLGND',
    launch: 'ALky3tPFzDSygZpDKfvoYZoByYX3yq262S17EhXuJ6wy',
    phase: 'open',
    policyVersion: '1',
    revision: '1',
    curveFeeBps: 200,
    graduatedFeeBps: 100,
    curveTreasuryShareBps: 5000,
    graduatedTreasuryShareBps: 5000,
    currentSlot: 50,
    reserveLamports: '0',
    curveTokenBaseUnits: PROFILE.curve.toString(),
    quoteState: {
      base: PROFILE.initialBase.toString(),
      quote: PROFILE.initialQuote.toString(),
      treasuryFees: '0',
      communityFees: '0',
    },
    capabilities: { buy: false, sell: false, create: false },
  };
  const quoted = quoteTrade({ row, side: 'buy', amount: 1_000_000_000n, slippageBps: 0n, currentSlot: 50n });
  assert.equal(quoted.admitted, false);
  assert.match(quoted.output, /^[0-9]+$/);
  assert.ok(BigInt(quoted.output) > 0n);
});

test('portal CNAME origin is an allowed discovery origin', () => {
  const portal = createLegendarySdk({ origin: PORTAL_ORIGIN });
  const alias = createLegendarySdk({ origin: PORTAL_ORIGIN_ALIAS });
  assert.equal(portal.discovery.origin, 'https://developer.legendary.fun');
  assert.equal(alias.discovery.origin, 'https://legendary.devbyclaw.com');
});
