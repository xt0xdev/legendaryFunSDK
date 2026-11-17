import test from 'node:test';
import assert from 'node:assert/strict';
import { handleDeveloperApi } from '../lib/developer-api.mjs';
import { KEYED_TRADE_PATHS } from '../../../packages/partner-public-api/api-key.mjs';

test('trade prepare and submit require an owner-issued API key', async () => {
  const prepare = await handleDeveloperApi(new Request('http://127.0.0.1:8833/api/mainnet/trade/prepare', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      wallet: '11111111111111111111111111111111',
      mint: '422DqsfnCANTP7vNToY7hdBaEXPE1qoc6CD9QyDGLGND',
      side: 'buy',
      amount: '1000000000',
    }),
  }));
  assert.equal(prepare.status, 401);
  const prepared = await prepare.json();
  assert.equal(prepared.error.code, 'API_KEY_REQUIRED');
  assert.equal(Object.hasOwn(prepared, 'signature'), false);

  const submit = await handleDeveloperApi(new Request('http://127.0.0.1:8833/api/mainnet/trade/submit', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ attemptId: '', wireBase64: '' }),
  }));
  assert.equal(submit.status, 401);
  assert.equal((await submit.json()).error.code, 'API_KEY_REQUIRED');
});

test('catalog and discovery stay off the owner-key trade list', () => {
  assert.equal(KEYED_TRADE_PATHS.includes('/api/mainnet/trade/prepare'), true);
  assert.equal(KEYED_TRADE_PATHS.includes('/api/mainnet/trade/submit'), true);
  assert.equal(KEYED_TRADE_PATHS.includes('/api/mainnet/trade/discovery'), false);
  assert.equal(KEYED_TRADE_PATHS.includes('/api/mainnet/trade/catalog'), false);
});
