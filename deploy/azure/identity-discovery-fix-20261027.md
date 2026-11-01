# Customer sign-up endpoint correction

The main domain is now Secured in Azure and its homepage and `/api/v1/auth/options` work. Member sign-in through Rooted opened a GUID-host Entra page without a sign-up link. The Portal's Run user flow used `rootedtogether.ciamlogin.com` and displayed the link. Rooted Members is correctly associated with RootedMembersSignIn.

Public metadata from both hostnames returns the same GUID-host issuer, but each advertises authorization/token endpoints on its own hostname. The backend previously used the issuer to locate metadata. It now accepts `OIDC_DISCOVERY_URL` separately and continues to require an exact metadata issuer match and to validate signed tokens against `OIDC_ISSUER`. Invalid metadata is never cached. PKCE, state, nonce, audience validation and contributor MFA requirements remain in place.

Sources: [External tenant endpoint requirements](https://learn.microsoft.com/en-us/entra/external-id/customers/concept-supported-features-customers), [endpoint and issuer distinction](https://learn.microsoft.com/en-us/entra/external-id/customers/migrate-from-cognito-to-external-id).

## Manual deployment

New backend tag: `pilot-20261027-2`. Frontend and migration schema do not change.

```powershell
docker push rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-backend:pilot-20261027-2
```

After upload, Portal → rooted-api → App → Revisions and replicas → Create new revision. Edit rooted-api's container, choose rooted-backend and the new tag. Add manual environment variable:

```text
OIDC_DISCOVERY_URL=https://rootedtogether.ciamlogin.com/84524f4e-0cf6-4701-b128-dae041d1c910/v2.0/.well-known/openid-configuration
```

Preserve the current `OIDC_ISSUER`, client IDs, secret references, flags, internal ingress, resource allocation and scale settings. Save the container and create the revision with a fresh suffix, e.g. `identity-20261027-2`. Wait for Running; start a fresh Member sign in from Rooted. Expect named-host Entra login with the create-account link, then verify signup, callback and member session. Contributor signed MFA claims still need real acceptance.

Worker does not initiate customer login. It can remain on its verified current image during this API correction. Align its backend tag/config later during a controlled worker revision update; retain the node worker command and min/max 1. Do not rerun migrations for this correction.

Upload and cloud deployment are pending user execution. Preserve the existing backend tag for rollback.

## Live follow-up: truncated member client ID

User pushed the new image and deployed rooted-api--identity-20261027-2 (Running, one replica, 100% traffic). The real Rooted login now targets the named hostname. An isolated browser inspection found its member client_id is f7147f69-2e1c-4752-944a-32ae3b7084f, missing the final 4. Changing only that request parameter to f7147f69-2e1c-4752-944a-32ae3b7084f4 restores the create-account link. Correct OIDC_CLIENT_ID in a new API revision using the same image; actual secret-value correctness and signup/callback remain unverified. The application association in Entra already has the correct full ID. No further image build is needed for this environment correction.

## Contributor AMR request correction

Member signup and callback now work after the ID correction. Contributor request was rejected before sign-in with AADSTS901001 (amr values Empty). An isolated live-browser comparison reproduced the rejection for amr {essential:true} and reached sign-in when values:[mfa] was included. Backend pilot-20261027-3 packages that correction. TypeScript, ESLint and 38 backend unit/adapter tests pass; local image ID sha256:2f150c41271ed3ba0be8f17c0e9bd18f84472bcec6b57412b7abccac9edc79e5. Push and API revision deployment remain user actions. Keep existing production env and corrected member ID; suggested suffix mfa-20261027-4. Signed-token MFA and auth_time checks remain mandatory; actual customer MFA and same-object identity acceptance are pending.

## Token-verification diagnostics

Separate contributor signup now reaches Rooted callback, but returns identity_token_invalid / Identity token could not be verified. Exact cause remains unknown because previous code discarded the verification exception. pilot-20261027-4 adds an allowlisted warning event identity_token_verification_failed containing verificationCode, access and optional claim/reason. It excludes token values, full error/cause objects, messages, identity claims and authorization codes. Local image sha256:e41c895ab1f837f17e6d3465bed232f89ba34e0f7a6a72aff492b2dd999fb77a; 39 backend unit/adapter tests and TypeScript pass. Push and API deployment pending; suggested revision token-20261027-5. Inspect Monitoring / Log stream / Console after reproducing. Use a signed-out browser for the separate contributor identity, since Rooted intentionally rejects changing identity while upgrading an existing member session. JWT/MFA checks remain unchanged; identity compatibility and actual contributor MFA acceptance remain pending.

## Immediate expiry investigation, October 28

API diagnostic log now identifies expired / exp / check_failed on contributor callback. A fully fresh InPrivate login fails immediately too. API Console and Microsoft HTTP Date differ by 1 second at 04:04:21 UTC, so no substantial clock offset is present. New local image pilot-20261028-1 (sha256:bc06c4e87abf28d160878775e47de3aa8b1093df0b8d2470c8f4b3e117524572) adds only numeric expiredBySeconds, issuedAgoSeconds and tokenLifetimeSeconds to the existing allowlisted warning. Tests verify private payload contents are excluded and invalid/nonfinite timestamp claims are omitted; 40 backend tests and TypeScript pass. Push and API revision deployment remain pending user execution. Suggested suffix expiry-20261028-1. Do not assume a one-second tolerance will solve it until token timing is observed; validation is unchanged.

## Bounded clock tolerance, October 28

Latest warning: expiredBySeconds=0, issuedAgoSeconds=300, tokenLifetimeSeconds=300. This is an expiry-boundary observation with API/provider clock difference ~1 second. Added a fixed jose clockTolerance of 5 seconds; no environment override. The actual shared validator is tested with real signed tokens at 0/1/4 seconds past expiry (accepted), 5/6/60/300 seconds (rejected), wrong issuer/audience, missing nonce and invalid signature (rejected). All 41 backend unit/adapter tests and TypeScript pass. Image pilot-20261028-2, local sha256:980962131bce6547cef4ccfe4dbf965600cd38a4c64265ace66f732572e2fdaa. User push/deploy pending; suggested API revision skew-20261028-2. Actual contributor MFA/session acceptance still requires fresh sign-in. The reason tokens arrive 300 seconds after iat has not been established; do not claim tolerance explains that delay.

## Requested 30-second tolerance, October 28

User reports contributor login succeeded with the five-second fix, then explicitly requested a 20-30 second tolerance. Current code now uses 30 seconds. Signed-token tests accept exp ages 0/5/20/29 seconds and reject 30/31/60/300; signature, issuer, audience, required-claim, nonce, MFA and identity checks remain. Built pilot-20261028-3, local image sha256:0a187565039bf1d657e85217122aa6329787c6aeedba7520c56bb143ce132472. TypeScript and 41 backend tests pass. User push/API revision deployment remains pending; suggested suffix skew-20261028-3. Earlier five-second entries above are historical.
