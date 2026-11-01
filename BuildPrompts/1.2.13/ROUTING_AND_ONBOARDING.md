# Routing and onboarding contract

These are execution defaults for version 1.2.13, grounded in the current application. Inspect the code again at execution time and document any intervening changes.

## Routes and access

| Route | Purpose and access |
|---|---|
| `/` | Public Rooted introduction; no login prerequisite or private workspace rendering |
| `/get-started` | Public church-leader and member choices; clearly describe the two paths |
| `/sign-in` | Public sign-in shell using the configured real identity provider; authenticated continuation is resolved safely |
| `/find-church` | Public church-link/invitation guidance; no searchable private church/member directory |
| `/sample-study` | Public, static and clearly fictional sample devotional |
| `/onboarding` | Existing authenticated church creation/invitation flow, visually adapted; preserve validated intent |
| `/onboarding/complete?church=<id>` | Authenticated first steps; require active membership for the selected church and derive actions from capabilities |
| `/dashboard`, `/settings`, other established workspace routes | Preserve existing session and capability requirements; unauthenticated access can use explicit sign-in with a bounded continuation |
| `/c/:slug` and established member study routes | Preserve current church lookup, branding, reading policy, membership checks and cache/index restrictions |

Do not add a public `/verify-email` page that accepts arbitrary codes. Add a verification return/error screen only if backed by the configured identity provider's real verification contract. The identity provider may host verification itself.

## Existing contracts to reuse

- [Root page](../../frontend/app/page.tsx) currently renders `Workspace` with the dashboard route. Replace only that entry point with public marketing and retain the explicit dashboard.
- [Workspace](../../frontend/components/workspace.tsx), [login screen](../../frontend/components/login-screen.tsx), [onboarding](../../frontend/components/onboarding.tsx) and [API helper](../../frontend/lib/api.ts) establish current session, errors, CSRF and command conventions.
- [Auth routes](../../backend/src/auth/routes.ts) expose backend `/v1/auth/login`, `/v1/auth/callback`, session and guarded local demo login. Browser API calls use the existing `/api/v1` rewrite. Do not confuse backend URLs with browser URLs.
- [Onboarding routes](../../backend/src/api/onboarding-routes.ts) expose authenticated `POST /v1/churches` with `{name, slug, timeZone}` and `POST /v1/invitations/accept` with `{token}`. Mutations require session, CSRF and an `Idempotency-Key`.
- Church creation currently returns persisted `id`, `slug`, `name`, `timeZone`, capabilities and reading defaults. Render success from the actual response and refreshed session, never from prefilled prototype data.
- Invitations are identity-bound, expiring and revocable. Preserve server acceptance checks, inviter authority checks and audited membership creation.
- [Next configuration](../../frontend/next.config.ts) applies private/no-store and noindex handling to church pages. Extend routing without weakening it.

## Leader journey

1. `/get-started` sends the leader to `/sign-in` with a bounded intent such as `create-church`. This is navigation intent, not a permission grant.
2. The user authenticates with the configured OIDC provider. Reuse state/nonce/PKCE, expiring single-use flow records and secure session cookies. Preserve logout, failed/expired callback and returning-user behavior.
3. Continue to authenticated `/onboarding` in create-church mode. Existing members may deliberately create an additional church; do not force them into an unrelated existing church or create a duplicate automatically.
4. Collect church name, slug and IANA timezone. The timezone preview can use the browser zone, but the user confirms it and the backend validates it. Show slug/name validation, conflicts, expired-session and retry errors without discarding entered values.
5. Submit with a stable command idempotency key for the same attempted creation. Reuse the key for an uncertain retry; after editing payload, create a new command key. Refresh membership/session after confirmed success.
6. Navigate to `/onboarding/complete?church=<actual id>`. Reloading or resubmitting must not create another church. No frontend-only membership assumptions.
7. Offer authorized first steps such as church identity/theme, inviting the team, and opening the workspace. Church ownership does not imply `ai:use`, authorship or approval/publication rights. Respect existing separation and role-change rules. Explain how a permitted contributor can create a study rather than granting extra rights to satisfy the sample card.

## Continuation and member journey

Persist only an allowlisted continuation/intent across authentication. Prefer binding it to the expiring server-side OIDC flow. Reject external URLs, protocol-relative URLs, encoded bypasses and unauthorized tenant targets. Clear consumed/expired intent. Query strings, browser storage and return destinations do not authenticate users or authorize access.

Member entry offers a church-provided link or invitation. Accept a supported slug or validated same-origin church URL for navigation only; never fetch arbitrary entered URLs on the server. Do not expose whether private churches or identities exist beyond current public-reading contracts. A protected church destination leads through sign-in and its existing authorization checks. A church configured for public reading keeps its existing policy.

Invitation acceptance requires the actual named signed-in identity and the existing server command. Keep invitation tokens out of analytics, logs and long-lived browser storage; if carrying a token across sign-in, use a short-lived protected handoff. Remove it from the visible URL promptly and retain current expiry/revocation behavior. A typed church name, guessed email or successful authentication alone cannot create membership.

## Identity and commercial boundaries

The prototype's six-digit code and fictional email are visual examples only. With current configuration, use provider sign-in unless verified email-code support is actually available. The existing demo-login route remains guarded by its explicit development configuration; never enable it in production or create new universal login shortcuts. Do not add a local password/email credential store as a substitute for OIDC.

No new email delivery service, trial policy, paid plan, public signup release or unrestricted model allowance is included. Use existing local church creation and preserve limits. Record a configured production provider, supported account registration/recovery, approved legal pages, public origin and commercial access decisions as launch prerequisites where unresolved. These do not block completing and testing the authorized local site with existing identity fixtures.
