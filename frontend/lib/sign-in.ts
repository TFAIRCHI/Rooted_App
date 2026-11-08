import { safeContinuation } from '../../backend/src/auth/continuation';

export function contributorSignIn(returnTo = '/dashboard') {
  return `/api/v1/auth/login?${new URLSearchParams({access:'contributor',returnTo:safeContinuation(returnTo) ?? '/dashboard'})}`;
}
