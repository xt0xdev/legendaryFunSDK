/** Owner-issued partner keys for trades, create, claims, and rewards. Never log the secret. */
import { createHash, timingSafeEqual } from 'node:crypto';

export const API_KEY_HEADER = 'x-legendary-api-key';
export const API_KEY_PATTERN = /^[A-Za-z0-9_-]{24,128}$/;
export const API_KEY_REQUIRED_MESSAGE = 'Trades, claims, rewards, and token launch require an API key issued by the legendary.fun site owner.';
export const API_KEY_DENIED_MESSAGE = 'API key is not valid. Keys are issued by the legendary.fun site owner.';
export const KEYED_NOT_DEPLOYED_MESSAGE = 'Owner API key accepted. Hosted token launch, claims, and rewards execution is not deployed on this origin. This is not an onchain result.';
export const KEYED_TRADE_PATHS = Object.freeze([
  '/api/mainnet/trade/auth/challenge',
  '/api/mainnet/trade/auth/verify',
  '/api/mainnet/trade/auth/logout',
  '/api/mainnet/trade/prepare',
  '/api/mainnet/trade/graduated/prepare',
  '/api/mainnet/trade/submit',
  '/api/mainnet/trade/freshness',
  '/api/mainnet/trade/simulate',
  '/api/mainnet/trade/dispose',
  '/api/mainnet/trade/identity',
  '/api/mainnet/trade/recovery/genesis',
  '/api/mainnet/trade/recovery/height',
  '/api/mainnet/trade/recovery/confirmation',
]);

function digest(value) {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function parseOwnerApiKeys(raw) {
  const text = typeof raw === 'string'
    ? raw
    : Array.isArray(raw)
      ? raw.filter((item) => typeof item === 'string').join(',')
      : '';
  const keys = [];
  for (const part of text.split(/[\s,]+/)) {
    if (API_KEY_PATTERN.test(part)) keys.push(part);
  }
  return Object.freeze([...new Set(keys)]);
}

export function presentedApiKey(request) {
  const header = request?.headers?.get?.(API_KEY_HEADER);
  return typeof header === 'string' ? header.trim() : '';
}

export function inspectOwnerApiKey(presented, acceptedKeys) {
  const token = typeof presented === 'string' ? presented.trim() : '';
  if (!token) {
    return Object.freeze({
      ok: false,
      status: 401,
      code: 'API_KEY_REQUIRED',
      message: API_KEY_REQUIRED_MESSAGE,
    });
  }
  if (!API_KEY_PATTERN.test(token)) {
    return Object.freeze({
      ok: false,
      status: 403,
      code: 'API_KEY',
      message: API_KEY_DENIED_MESSAGE,
    });
  }
  const list = Array.isArray(acceptedKeys) ? acceptedKeys.filter((key) => API_KEY_PATTERN.test(key)) : [];
  const presentedDigest = digest(token);
  let matched = false;
  for (const key of list) {
    if (timingSafeEqual(presentedDigest, digest(key))) matched = true;
  }
  if (!matched) {
    return Object.freeze({
      ok: false,
      status: 403,
      code: 'API_KEY',
      message: API_KEY_DENIED_MESSAGE,
    });
  }
  return Object.freeze({ ok: true, status: 200, code: 'OK', message: '' });
}
