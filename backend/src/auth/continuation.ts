// A continuation is navigation only. Every target still enforces its own authorization.
export function safeContinuation(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 500 || !value.startsWith('/') || value.startsWith('//') || /[%\\\s#]/.test(value)) return undefined;
  const url = new URL(value, 'https://rooted.invalid');
  const workspace = ['/dashboard','/studies','/settings','/calendar','/sermons','/reviews','/engagement','/moderation','/delivery','/theme','/user','/onboarding','/onboarding/complete'];
  if (!workspace.includes(url.pathname) && !/^\/c\/[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])(?:\/studies\/[0-9a-f-]{36})?$/.test(url.pathname)) return undefined;
  for (const [key, item] of url.searchParams) {
    if (url.searchParams.getAll(key).length !== 1) return undefined;
    if (key === 'intent' && url.pathname === '/onboarding' && ['create-church','join'].includes(item)) continue;
    if (key === 'church' && /^[0-9a-f-]{36}$/.test(item)) continue;
    if (key === 'slot' && url.pathname === '/studies' && /^[0-9a-f-]{36}$/.test(item)) continue;
    if (key === 'month' && url.pathname === '/studies' && /^\d{4}-\d{2}$/.test(item)) continue;
    return undefined;
  }
  return value;
}
