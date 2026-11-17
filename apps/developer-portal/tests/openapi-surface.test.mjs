import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const spec = JSON.parse(readFileSync(new URL('../public/openapi.json', import.meta.url), 'utf8'));
const FORBIDDEN = /\/(swap2?|trades|stream)\b/;

test('openapi lists live, partner, and owner-keyed launch/claim routes', () => {
  const paths = Object.keys(spec.paths);
  assert.ok(paths.includes('/api/v1/tokens'));
  assert.ok(paths.includes('/api/v1/quote'));
  assert.ok(paths.includes('/api/mainnet/trade/candles-swap/{mint}/{interval}'));
  assert.ok(paths.includes('/api/compat/pump/v3/candlesticks/{mint}/{interval}'));
  assert.ok(paths.includes('/api/mainnet/trade/prepare'));
  assert.ok(paths.includes('/api/mainnet/trade/submit'));
  assert.ok(paths.includes('/api/v1/create'));
  assert.ok(paths.includes('/api/v1/rewards'));
  assert.ok(paths.includes('/api/v1/rewards/claim'));
  assert.ok(paths.includes('/api/v1/graduation-claims'));
  assert.equal(paths.includes('/api/v1/stream'), false);
  assert.equal(paths.includes('/api/mainnet/create'), false);
  assert.equal(spec.info.version, '0.6.0');
  assert.equal(spec.paths['/api/mainnet/trade/prepare'].post['x-status'], 'keyed');
  assert.equal(spec.paths['/api/mainnet/trade/submit'].post['x-status'], 'keyed');
  for (const path of paths) {
    assert.equal(FORBIDDEN.test(path), false, path);
    for (const op of Object.values(spec.paths[path])) {
      if (!op || typeof op !== 'object' || Array.isArray(op)) continue;
      const status = op['x-status'];
      assert.ok(status === 'live' || status === 'additive' || status === 'keyed', `${path} ${status}`);
    }
  }
  assert.equal(spec.paths['/api/v1/create'].post['x-status'], 'keyed');
  assert.equal(spec.components.securitySchemes.OwnerApiKey.name, 'x-legendary-api-key');
  assert.equal((spec.tags || []).some((tag) => tag.name === 'Site lane'), false);
  assert.equal((spec.tags || []).some((tag) => tag.name === 'Owner key'), true);
});
