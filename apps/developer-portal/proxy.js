import { isAllowedPortalRequest } from './lib/hosts.mjs';

const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST', 'OPTIONS']);

const DENY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'cache-control': 'no-store',
};

export function proxy(request) {
  if (!ALLOWED_METHODS.has(request.method)) {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        ...DENY_HEADERS,
        allow: 'GET, HEAD, POST, OPTIONS',
      },
    });
  }
  if (!isAllowedPortalRequest(request.headers)) {
    return new Response('Unknown host', {
      status: 421,
      headers: DENY_HEADERS,
    });
  }
}

export const config = { matcher: '/:path*' };
