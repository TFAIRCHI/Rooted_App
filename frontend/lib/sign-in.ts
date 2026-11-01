import { safeContinuation } from '../../backend/src/auth/continuation';

export function loginAccess(returnTo?: string): 'member' | 'contributor' {
  const safe = safeContinuation(returnTo);
  if (!safe) return 'member';
  const target = new URL(safe, 'https://rooted.invalid');
  if (target.pathname.startsWith('/c/') || target.pathname === '/user' || target.pathname === '/onboarding/complete' || (target.pathname === '/onboarding' && target.searchParams.get('intent') === 'join')) return 'member';
  return 'contributor';
}

export function contributorSignIn(returnTo = '/dashboard') {
  return `/api/v1/auth/login?${new URLSearchParams({access:'contributor',returnTo:safeContinuation(returnTo) ?? '/dashboard'})}`;
}
