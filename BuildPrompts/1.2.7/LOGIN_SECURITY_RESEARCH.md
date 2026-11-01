# Login and Security Research

## Repository findings

- Rooted currently uses a local OIDC issuer and persona links in `frontend/components/workspace.tsx` for development sign-in.
- Server sessions already carry a CSRF token and are checked by authenticated API routes.
- Membership capabilities already enforce church tenant access and administrative operations.
- Invitations already exist in `backend/src/api/onboarding-routes.ts`; this build should extend that flow rather than create a second membership database.
- `MembershipSettings` already exposes membership controls, but its role presentation and administrator workflow need to be consolidated for the requested three role categories.

## Image assessment

`Images/Login_Screen_Example.png` presents a strong, low-complexity structure: brand story on the left, one focused credential task on the right, clear hierarchy, and no role picker. Keep the form concise and use explicit error/help states rather than adding role tiles that could encourage privilege selection.

## Security recommendations

### Authentication

- Production authentication should use a trusted OIDC provider or an approved password system; do not build password storage casually into the frontend.
- If local username/password fixtures are implemented, hash passwords with Argon2id or a vetted equivalent, never plaintext or reversible encryption.
- Use opaque, rotated, expiring server sessions in `HttpOnly`, `Secure`, `SameSite=Lax` or stricter cookies.
- Keep CSRF protection on all state-changing requests.
- Rate-limit login attempts by identity and network, return non-enumerating errors, and add progressive delay or lockout controls.
- Add MFA or step-up authentication for Administrator login and role changes before production.

### Authorization

- Derive routes from server-returned membership capabilities, never from a `role` query parameter or hidden form field.
- Enforce every admin action in the backend with tenant predicates and capability checks.
- Prevent an Administrator from removing the final administrator or elevating themselves without a separate policy-owner/step-up rule.
- Require a reason, audit event, actor, target, previous grants, new grants, and timestamp for role changes.
- Keep invitations subject-bound, short-lived, single-use, revocable, and non-forwardable by default.

### Account lifecycle

- Deactivation revokes active sessions and pending invitations but preserves immutable editorial and audit history.
- Password reset tokens must be single-use, short-lived, hashed at rest, and never logged.
- Do not expose whether a username/email exists in login or reset responses.
- Keep demo accounts disabled outside local development and CI.

## Alternatives and recommendation

- **Provider-backed OIDC only:** recommended for production; minimizes password liability and supports organization identity policies.
- **Application-managed passwords:** acceptable only for local/demo or a deliberately scoped production decision with mature password hashing, recovery, MFA, monitoring, and breach response.
- **Role picker at login:** rejected; it is confusing and can create an authorization vulnerability if trusted.

## Unresolved questions

- Which production identity provider will be approved for church administrators and members?
- Should an Administrator require approval from a policy owner before creating another Administrator?
- Should a single person be allowed to hold multiple church memberships with different capability sets? Recommendation: yes, scoped independently per church.
