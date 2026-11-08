import type { JWTPayload } from 'jose';
import { ApiError, demand } from '../api/errors.js';

export const MEMBER_COOKIE_SECONDS = 400 * 24 * 60 * 60;
export const PRIVILEGED_SESSION_SECONDS = 8 * 60 * 60;
export interface Session {
  userId: string;
  displayName: string;
  csrfToken: string;
  privileged: boolean;
  verifiedEmail?: string;
  claimedEmail?: string;
}

export function requireMfa(session: Session) {
  if (!session.privileged) throw new ApiError(403, 'mfa_required', 'Contributor access requires verification', { signInUrl: '/api/v1/auth/login?access=contributor' });
}

export function identitySubject(payload: JWTPayload, mode: 'sub' | 'entra-oid', tenantId?: string) {
  demand(typeof payload.sub === 'string' && payload.sub.length > 0, 401, 'identity_token_invalid', 'Identity token did not identify an account');
  if (mode === 'sub') return payload.sub;
  const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  demand(tenantId && guid.test(tenantId) && typeof payload.tid === 'string' && payload.tid.toLowerCase() === tenantId.toLowerCase() && typeof payload.oid === 'string' && guid.test(payload.oid), 401, 'identity_tenant_invalid', 'Identity token did not match the customer tenant');
  // Entra sub is pairwise per client. A verified tenant/object pair is stable across both registrations.
  return `entra:${tenantId.toLowerCase()}:${payload.oid.toLowerCase()}`;
}

declare module 'fastify' {
  interface FastifyInstance { rootedProduction: boolean }
  interface FastifyRequest { rootedSessionToken?: string }
}
