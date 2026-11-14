import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedPortalHost, isAllowedPortalRequest, PORTAL_HOSTS } from '../lib/hosts.mjs';

test('accepts developer.legendary.fun and the devbyclaw CNAME target', () => {
  assert.ok(PORTAL_HOSTS.includes('developer.legendary.fun'));
  assert.ok(PORTAL_HOSTS.includes('legendary.devbyclaw.com'));
  assert.equal(isAllowedPortalHost('developer.legendary.fun'), true);
  assert.equal(isAllowedPortalHost('developer.legendary.fun:443'), true);
  assert.equal(isAllowedPortalHost('LEGENDARY.DEVBYCLAW.COM'), true);
  assert.equal(isAllowedPortalHost('127.0.0.1:8833'), true);
  assert.equal(isAllowedPortalHost('evil.example'), false);
  assert.equal(isAllowedPortalHost('developer.legendary.fun.evil.example'), false);
  assert.equal(isAllowedPortalHost('[::1]'), false);
});

test('rejects a mismatched X-Forwarded-Host', () => {
  const headers = new Headers({
    host: 'developer.legendary.fun',
    'x-forwarded-host': 'evil.example',
  });
  assert.equal(isAllowedPortalRequest(headers), false);
  assert.equal(isAllowedPortalRequest(new Headers({ host: 'developer.legendary.fun' })), true);
  assert.equal(
    isAllowedPortalRequest(new Headers({
      host: '127.0.0.1:8833',
      'x-forwarded-host': 'legendary.devbyclaw.com',
    })),
    true,
  );
});
