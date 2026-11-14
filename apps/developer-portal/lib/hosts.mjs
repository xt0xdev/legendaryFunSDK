/** Public names for this portal. developer.legendary.fun CNAMEs to legendary.devbyclaw.com. */
export const PORTAL_HOSTS = Object.freeze([
  'developer.legendary.fun',
  'legendary.devbyclaw.com',
  '127.0.0.1',
  'localhost',
]);

export const PORTAL_ORIGINS = Object.freeze([
  'https://developer.legendary.fun',
  'https://legendary.devbyclaw.com',
]);

export function parseHost(hostHeader) {
  const raw = String(hostHeader || '').trim().toLowerCase();
  if (!raw || /[\s/\\]/.test(raw)) return '';
  const first = raw.split(',')[0].trim();
  if (first.startsWith('[')) {
    const end = first.indexOf(']');
    return end === -1 ? '' : first.slice(1, end);
  }
  return first.split(':')[0] || '';
}

export function isAllowedPortalHost(hostHeader) {
  return PORTAL_HOSTS.includes(parseHost(hostHeader));
}

export function isAllowedPortalRequest(headers) {
  const get = typeof headers?.get === 'function' ? (name) => headers.get(name) : (name) => headers?.[name];
  if (!isAllowedPortalHost(get('host'))) return false;
  const forwarded = get('x-forwarded-host');
  if (forwarded && !isAllowedPortalHost(String(forwarded).split(',')[0])) return false;
  return true;
}
