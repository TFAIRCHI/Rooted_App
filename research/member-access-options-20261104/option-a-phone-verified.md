# Option A: phone-verified member access and study SMS

Research snapshot: **2026-11-04**. This is a proposed path from the current Rooted application to member access through a verified phone number and a study link delivered by Twilio. It changes no running service. The recommended experience is one tap from a scheduled SMS to the member study when the recipient's number has already been verified and linked to that member. Staff and contributors keep their existing Entra sign-in and MFA.

## Decision in plain terms

The phone number serves two related purposes, but the application must record them separately:

1. **Delivery address:** a member has consented to receive study notifications at a number in E.164 format.
2. **Member identity binding:** Rooted has verified possession of that number and linked it to one specific member account in one church.

An administrator's entry or a Planning Center import can create a *candidate* number. It must not, by itself, grant access. Once the member completes a one-time phone verification and the church approves the membership link, scheduled SMS messages may include a short-lived, single-use study entry link. Opening the link establishes a member-only Rooted session and redirects to the exact published study. An expired or already used link offers a fresh phone verification. This delivers the desired one-tap experience for established members without treating a phone directory entry as proof of identity. [Twilio Verify's verification model](https://www.twilio.com/docs/verify/api/verification), [OWASP guidance for URL tokens](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

```mermaid
flowchart LR
  A[Admin entry or Planning Center People import] --> B[Candidate phone tied to church member]
  B --> C[Member verifies phone possession]
  C --> D[Verified member phone binding]
  D --> E[Separate study SMS consent]
  E --> F[Approved study reaches scheduled publish time]
  F --> G[Twilio sends study link]
  G --> H[One-time link exchange]
  H --> I[Member-only session and study]
```

## Current application boundary

| Area | What exists now | Change needed |
| --- | --- | --- |
| Member sign-in | Entra External ID OIDC creates `auth_sessions` from a verified identity token. Member and contributor access already differ; contributor elevation requires MFA. See [`backend/src/auth/routes.ts`](../../backend/src/auth/routes.ts) and [`backend/src/auth/session.ts`](../../backend/src/auth/session.ts). | Add a separate phone-link authentication path that can create **member-only** sessions. Never let it satisfy contributor MFA. |
| Membership | Church membership and capabilities are tied to `user_id`. Member study routes check membership and publication state. | Bind a verified phone to an existing or explicitly provisioned member `user_id`; preserve tenant isolation and current authorization checks. |
| SMS contacts | `provider_contacts` stores encrypted phone data, a tenant/sender-scoped hash, consent version and suppression state, and references a membership. Consent events are separate. See [`backend/migrations/002_providers.sql`](../../backend/migrations/002_providers.sql). | Add phone verification/binding status and lifecycle. Do not infer verification or consent from contact existence. |
| SMS send | Twilio integration, contact registration, consent events, STOP suppression, send intents, approval checks, budget and callbacks exist in [`backend/src/api/provider-routes.ts`](../../backend/src/api/provider-routes.ts). | Include the approved study URL plus an individual entry token in the exact SMS preview/intent; validate the approved snapshot again at send time. |
| Planning Center | The current connector imports Publishing episodes and church-authored notes. It does **not** import People phone records. | Add a separately authorized People import only after endpoint, field, permission and organization mapping are verified. [Planning Center API overview](https://developer.planning.center/docs/). |
| Session lifetime | Current member cookie is configured for 400 days and the database session may have no expiry. | Introduce an explicit, shorter lifetime and revocation policy for SMS-created sessions before enabling link login. |

The current SMS pathway is not yet an automatic member sign-in mechanism. The current provider contact record is a delivery contact, not an authenticated phone credential.

## Recommended member experience

1. A church admin invites or imports the person, maps them to one Rooted member account, and records a candidate phone. A duplicate number or conflicting person mapping enters a review queue.
2. The member verifies possession with a one-time code sent through Twilio Verify. Rooted records the verification time, method, phone hash, member ID and church ID. If the phone changes, revoke the previous binding and SMS sessions.
3. The member can separately opt in to scheduled study SMS. The opt-in explains sender, message purpose/frequency and STOP/HELP behavior; declining does not prevent access to the website through another sign-in route. An admin-imported phone does not count as opt-in. [Twilio Messaging Policy](https://www.twilio.com/en-us/legal/messaging-policy), [Twilio A2P consent guidance](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/collect-business-info).
4. At the approved publication time, Rooted creates a recipient-specific link for that published study. The SMS contains the church name, a short approved excerpt or title, the link and required opt-out language. The study itself is read on the site; the SMS need not contain its full body.
5. On tap, a neutral landing page exchanges the link for an `HttpOnly`, `Secure`, `SameSite=Lax` **member** session and redirects to the published study. The existing study route still checks church membership, visibility, withdrawal and publication status.
6. If the link is expired, consumed, forwarded, or the number is no longer bound, show a safe recovery path: send a fresh verification to the verified number or use the existing member sign-in. A link recipient must never be able to choose a different member account.

### Link and session design

Use at least 256 bits of cryptographic randomness per link. Store only a keyed hash or digest, bind the record to `(church_id, member_user_id, contact_id, publication_id, phone_binding_version)`, and give it a short, product-approved expiry (proposed initial pilot: **72 hours**). Allow one atomic exchange; revoke unused links on member removal, phone change, consent revocation, study withdrawal, or a superseding publication. Rate-limit exchanges and log only token IDs, never token values or full phone numbers. OWASP recommends random, secure, single-use expiring URL tokens and a `no-referrer` policy. [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

Do **not** consume the token on an HTTP GET: link previews and security scanners can fetch URLs before the member taps. GET should render a minimal first-party landing page with no third-party scripts, analytics, fonts or outbound links. For the desired one-tap experience, first-party JavaScript can immediately send a same-origin POST to exchange the token after page load. A practical design uses a fragment token (`/member/study-entry#token=...`) so the token is not sent in the initial HTTP request. Remove it from browser history immediately, return `Referrer-Policy: no-referrer` and `Cache-Control: no-store`, and avoid secrets in server logs. **Some scanners may execute JavaScript and consume even this token.** The pilot must test real carrier/mail/security-preview behavior; if this occurs, switch to an explicit "Continue to study" button on the landing page (an extra tap) and provide a fresh-link recovery path. A no-JavaScript fallback also needs that button.

An SMS link is a bearer credential: anyone who can read or forward it before redemption may use it. It proves access to a delivered message, not continuous ownership of the number. For first enrollment, phone changes, ambiguous/shared numbers, stale verification, or suspicious access, require a fresh Twilio Verify check before creating a session. Rooted should keep email sign-in available as a recovery/accessibility path during rollout. Apply separate rate limits and anti-abuse controls to verification starts and checks. [Twilio Verify best practices](https://www.twilio.com/docs/verify/developer-best-practices).

## Data and API changes

Add migrations without rewriting existing member identities:

- `member_phone_bindings`: church/member/contact identifiers, encrypted E.164 phone or reference to `provider_contacts`, tenant-scoped keyed phone hash, `candidate|verified|revoked` state, verification provider evidence, verified time, version and revocation reason. Decide whether a number may belong to multiple members or churches; for the first release, reject ambiguous active mappings and require admin review.
- `member_entry_links`: digest, target publication, member/contact/binding version, issued/expiry/consumed times, delivery intent ID and revocation state. Index expiry and enforce single-use in one transaction.
- `auth_sessions`: record `auth_method` and `access_level`; require a finite expiry for SMS-created member sessions. Keep existing OIDC sessions compatible. Never promote an SMS session into contributor capabilities; contributor routes continue to require Entra MFA.
- Import mapping: `(church, Planning Center organization, People person ID, phone record ID)` to candidate member/contact IDs, with provenance and last-seen time. Never map two records solely because their phone strings match.

Add admin APIs for candidate phone creation, conflict review, invitation/reverification, phone replacement and opt-in evidence. Add member APIs for Verify start/check, own-number review and consent management. Add a public, heavily rate-limited entry exchange endpoint that only returns a session after atomic token validation and current membership/publication checks. Reuse existing tenant and capability enforcement after exchange.

The current `provider_contacts` route requires an existing `userId` and creates a suppressed contact; this is a useful base, but it does not support candidate-to-member matching, phone proof, self-service correction, or a new identity. The current Planning Center connector only has Publishing data, so People access must be a distinct consented integration scope and sync job. Planning Center says API calls are on behalf of a user; validate the actual People API field permissions and account visibility with a test organization before promising automatic phone import. [Planning Center API overview](https://developer.planning.center/docs/).

## Twilio and operational requirements

| Requirement | Why it matters |
| --- | --- |
| Production Twilio account, sender and Messaging Service | The existing app has Twilio configuration hooks, but activation and tenant sender scope are explicit. Configure per-church sender ownership, callback URL and secrets. Twilio trials restrict recipients and are unsuitable for general member delivery. [Twilio trial limits](https://www.twilio.com/docs/usage/trials). |
| Twilio Verify service | Use a separate verification service for initial phone binding and recovery; do not treat a study notification as the first proof of phone ownership. Verify expects E.164 numbers. [Twilio Verify API](https://www.twilio.com/docs/verify/api/verification). |
| US sender registration, if US 10DLC is used | Register the appropriate A2P brand/campaign and associate the sender with the Messaging Service. Toll-free and short-code paths have different registration processes. Confirm the church/Rooted sender model with Twilio before onboarding multiple churches. [Twilio A2P 10DLC](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc). |
| Documented opt-in and STOP/HELP | Obtain consent for scheduled study messages, keep evidence and process opt-out promptly. SMS consent must be optional and distinct from account access. [Twilio Messaging Policy](https://www.twilio.com/en-us/legal/messaging-policy), [A2P opt-in guidance](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/collect-business-info). |
| Delivery controls | Keep existing approval snapshot, tenant, quiet-hour, expiry, SMS segment budget, idempotent intent and callback checks. Include the link in the approved SMS body so the final sent text is known and auditable. |
| Secrets and observability | Put Twilio API/Verify credentials in Azure secrets or Key Vault; restrict access, rotate them, and redact phone/token values from traces. Track sends, verified bindings, token exchange success/failure, suppressions, and provider errors by church. |

Twilio Messaging Services can manage sender pools and Advanced Opt-Out, including webhook opt-out events, but Rooted must still reconcile its own consent/suppression state. [Twilio Messaging Services](https://www.twilio.com/docs/messaging/services).

## Deployment sequence and acceptance gates

1. **Architecture decision and pilot policy.** Approve link lifetime, member session lifetime, multi-church phone policy, recovery route, SMS content, consent wording, sender ownership and whether first-time members require an admin invitation plus Verify. Keep staff OIDC/MFA unchanged.
2. **Identity and contact groundwork.** Add schema, admin/member screens and APIs. Migrate existing `provider_contacts` as *unverified candidates* without issuing sessions or SMS consent. Resolve duplicate/recycled/shared-number cases before activating anyone.
3. **Verification pilot.** Configure Twilio Verify in a nonproduction environment; verify enrollment, rate limits, phone changes, lost-phone recovery and member-only session issuance with fictional accounts. Ensure a link cannot access another church, unpublished/withdrawn studies, or contributor routes.
4. **Study link pilot.** Generate a recipient-specific link only after approval and publication are current. Exercise link preview/prefetch, expiry, replay, forwarding, logout, revocation and concurrent redemption. Confirm no token leaks via logs, URLs, analytics, referrers or error reports.
5. **SMS delivery pilot.** Set up the production sender/registration and consent evidence, then enable one church and a small opt-in cohort. Compare exact approved message/URL to send intents and Twilio callbacks. Verify STOP immediately suppresses future sends. Keep the current email member sign-in as fallback.
6. **Planning Center People import.** Separately request and verify People access, map person and phone IDs, import only necessary fields, show source/provenance in admin review, and require phone verification before using imported numbers for sign-in. Do this after manual entry works.
7. **Controlled rollout.** Release backend API, worker and frontend images together using new Azure Container App revisions. Add migrations first; add Twilio Verify and signing/encryption secrets to the appropriate apps; verify internal API, worker, callback ingress and frontend origin. Start with feature flags off, then enable for the pilot church. Confirm revision traffic, exactly one active worker consumer, SMS/provider budgets and a rollback path. The current manual deployment process is documented in [`deploy/azure/ci-cd-process.md`](../../deploy/azure/ci-cd-process.md).

**Release acceptance:** a verified, opted-in member receives a scheduled message for the correct approved study; one tap opens only that church's published study; a replay or forwarded/expired link cannot create a second session; STOP prevents later study messages; phone replacement or removal revokes access; email fallback still works; contributor access still requires MFA; no SMS is sent for unapproved or withdrawn content.

## Open decisions before implementation

- Is a shared household phone allowed for more than one church member? Recommended first release: no automatic sign-in for ambiguous numbers; use manual review and an alternate sign-in method.
- How long should the link and SMS-created session last? The proposed 72-hour link is a pilot assumption; choose this with the church's delivery cadence and risk tolerance.
- What is the authoritative membership roster: Rooted admin invitations, Planning Center People, or both with explicit conflict resolution? An imported phone alone must not create or elevate membership.
- Which organization is the registered SMS sender for each church, and what exact opt-in wording and privacy/terms pages will Twilio review?
- Should a member who opts out of scheduled SMS still be allowed to request a separate verification message for account access? Recommended: yes, with purpose-specific handling and provider review.
