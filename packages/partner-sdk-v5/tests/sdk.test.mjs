import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeTrade, TAGS, createLegendarySdk, PATHS, PORTAL_ORIGIN, PORTAL_ORIGIN_ALIAS } from '../src/index.mjs';

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
  assert.ok(sdk.native.tokens);
  assert.ok(sdk.pump.getLatestCoins);
  assert.ok(sdk.meteora.getPools);
  await assert.rejects(() => sdk.native.quote(), { code: 'NOT_ADMITTED' });
  await assert.rejects(() => sdk.pump.buy(), { code: 'NOT_ADMITTED' });
  await assert.rejects(() => sdk.meteora.swap2(), { code: 'NOT_ADMITTED' });
});

test('portal CNAME origin is an allowed discovery origin', () => {
  const portal = createLegendarySdk({ origin: PORTAL_ORIGIN });
  const alias = createLegendarySdk({ origin: PORTAL_ORIGIN_ALIAS });
  assert.equal(portal.discovery.origin, 'https://developer.legendary.fun');
  assert.equal(alias.discovery.origin, 'https://legendary.devbyclaw.com');
});
