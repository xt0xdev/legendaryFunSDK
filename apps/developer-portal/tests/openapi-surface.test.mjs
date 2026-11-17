import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const spec = JSON.parse(readFileSync(new URL('../public/openapi.json', import.meta.url), 'utf8'));
const FORBIDDEN = /\/(swap2?|create|claim|trades|stream|prepare|graduation-claims)\b/;

test('openapi lists only working live and partner read routes', () => {
  const paths = Object.keys(spec.paths);
  assert.ok(paths.includes('/api/v1/tokens'));
  assert.ok(paths.includes('/api/v1/quote'));
  assert.ok(paths.includes('/api/mainnet/trade/candles-swap/{mint}/{interval}'));
  assert.ok(paths.includes('/api/compat/pump/v3/candlesticks/{mint}/{interval}'));
  assert.equal(paths.includes('/api/v1/stream'), false);
  for (const path of paths) {
    assert.equal(FORBIDDEN.test(path), false, path);
    for (const op of Object.values(spec.paths[path])) {
      if (!op || typeof op !== 'object' || Array.isArray(op)) continue;
      const status = op['x-status'];
      assert.ok(status === 'live' || status === 'additive', `${path} ${status}`);
    }
  }
  assert.equal((spec.tags || []).some((tag) => tag.name === 'Site lane'), false);
});
