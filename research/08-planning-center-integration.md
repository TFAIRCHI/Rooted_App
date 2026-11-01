# Planning Center integration boundaries

Research snapshot: **2026-10-18**. **Verified** means supported by official documentation, not exercised against an account. All implementation choices below are **Recommendations**. No credentials, member records, API responses, or successful connections were obtained. Source details are in [Planning Center evidence](evidence/planning-center.md); IDs resolve in the [source register](sources.md).

## Decision and boundaries

**What / why:** Import sermon sources into a tenant-owned editorial workflow without making Planning Center availability a prerequisite for writing, reviewing, or reading an approved study. Keep imported sources separate from weekly series, dated slots, and immutable approvals.

**Recommendation:** Start with a staff-authorized, server-side, read-only Publishing adapter. An OAuth product scope can permit writes; enforce the smaller application capability through an explicit request allowlist. Keep People synchronization and member authentication separate from sermon import.

**Alternatives:** Manual notes/audio upload is the launch fallback. Full bidirectional publishing adds conflict and approval risks without validating the core sermon-to-study workflow.

**Dependencies:** Church authorization, Publishing content, tenant isolation, source rights, secrets storage, background jobs, and editorial provenance. **Risks:** Excess privileges, unpublished material disclosure, provider outages, and source changes after approval. **Open:** Who owns the connection, and which channels and publication states may be imported?

## Verified API surface

API request base: `https://api.planningcenteronline.com`. Paths below are relative to that base. The reference currently resolves Publishing to version `2024-03-25`; this version label does not mean the page content has remained unchanged.

| Area | Verified scopes / endpoints / behavior | Boundary and evidence |
|---|---|---|
| Product scopes | `api`, `calendar`, `check_ins`, `giving`, `groups`, `home`, `people`, `publishing`, `registrations`, `services` | User-bound permissions; no Church Center/read-only Publishing scope listed. [S01] |
| Identity | Scope-free `GET /current/v2/me`; `/people/v2/me` requires People scope/access | Member SSO remains unverified. [S01] |
| Sermons | `GET /publishing/v2/episodes`, `GET /publishing/v2/episodes/{id}`; channel, series, speakerships, resources, times and note-template associations | Title, description, art, publication times, media URLs, Church Center URL and Services identifiers are documented. [S02] |
| Writes | Episode POST/PATCH/DELETE are documented in the current reference | The 2024 launch described read-only endpoints. Treat the current reference as the capability baseline, but verify actual permission behavior. [S02, S03] |
| Audio download | `POST /publishing/v2/episodes/{episode_id}/generate_download_url`, empty body | Returns a signed download URL for uploaded sermon audio; this is an optional, narrowly allowed action in a read integration. [S02] |
| Notes | `GET /publishing/v2/episodes/{episode_id}/note_template`; template PATCH also documented | Contains `template`, `enabled`, `published_at`, `auto_create_free_form_notes`. Church-authored outline is not necessarily verbatim speech. [S07, S08] |
| Request limits | Default 100 requests/20 seconds/user; offset above 30,000: 75/20 seconds | Limits may vary dynamically or by endpoint. Use rate limit/count/period headers and HTTP 429 `Retry-After`. [S04] |
| Pagination | Episodes: default 25, maximum 100 per page, offset supported | Follow returned pagination links; do not assume one page covers a library. [S02] |
| Publishing events | Episode and EpisodeTime created/updated/destroyed families confirmed | Exact current event strings and additional families remain unverified. [S03] |
| Event discovery | `GET /webhooks/v2/available_events` exposes name, app, resource, action and version | Obtain subscription names from authenticated discovery, not guessed strings. Webhook endpoints require no OAuth scope. [S06, S01] |
| Delivery | Webhooks POST; HTTP 200 acknowledges; HTTP 410 deactivates; failure backoff spans roughly 5.4 days; no current webhook rate limit stated | Validate HMAC authenticity; retries mean duplicate-safe processing is necessary. [S05] |

**Transcript unknown:** Neither the inspected episode schema nor notes reference establishes a dedicated automatic transcript, caption/timecode, or speech-recognition API [S02, S07]. Help describes manually entering note text [S08]. This is absence of verified support, not proof that no such feature exists. Determine whether a church has complete notes before promising transcript-based grounding.

## Identity and member entry

**What / why:** Distinguish a person's identity from tenant membership, staff authority, and permission to read member content. Church Center has passwordless code login [S10]; that does not establish an external session handoff.

**Recommendation:** Evaluate the Current identity option with PKCE before choosing member authentication. Do not request People access merely to identify someone. Bind a verified provider identity to an explicitly authorized tenant membership; never derive staff rights from email domain or a successful login.

**Alternatives:** Independent app authentication with church invitations; external links from Church Center; a separate staff-approved People lookup only if a validated membership use case requires it. Navigation supports external URLs [S09]. Church Center page membership restrictions and link-only discoverability are different controls [S11]. A restricted page containing an external link does not, by itself, protect the destination.

**Dependencies:** Ordinary-member test account, OAuth registration, mobile callback handling, tenant mapping and access policy. **Risks:** Duplicate identities, cross-church access, session confusion and excessive directory access. **Open:** Can a member without product permissions finish OAuth? Does existing Church Center login reduce prompts? What stable identifiers and church context are returned? OIDC/SAML, silent SSO and external membership claims were not verified.

## Import, mapping and source retention

**What / why:** Preserve source provenance while allowing safe retries and upstream edits. A Planning Center series is not automatically an application's weekly study series.

**Recommendation:** Map `(tenant_id, connection_id, provider_resource_type, provider_id)` to a stable local ID under a unique constraint. Bind each connection to an administrator-confirmed provider organization; reject mismatched organization context. Store upstream timestamps, import time, permitted source fields, content hash, availability state and local source-revision ID. Speaker identity is provenance metadata, not a local login grant.

Use idempotent upserts. A changed source creates a new revision and flags dependent drafts for review; it never rewrites approved studies. Distinguish publication timestamps from preached date and church timezone; staff confirm ambiguous dates. Do not automatically expose staff-visible unpublished episodes to members.

On an explicit destroyed event, tombstone the source and stop new ingestion. A 404, missing page result, or permission failure needs confirmation through reconciliation before being classified as deletion. Losing the connection must not cascade-delete local sermons or approved studies. Retain approved source snapshots and provenance only under the church's rights and retention policy; stop re-serving removed remote media. When retention or erasure requires removal, purge restricted assets and derived searchable copies while retaining only an authorized minimal audit/tombstone record. If source rights are withdrawn, flag affected publications for authorized withdrawal/review.

**Alternatives:** Reference-only links minimize stored media but weaken historical grounding; copying all remote assets increases storage and rights exposure. **Dependencies:** Immutable source revisions, review workflow, tenant storage, retention/erasure policy and media permissions. **Risks:** Silent upstream replacements, false deletion, stale transcripts and sensitive unpublished material. **Open:** Retention period, media copying permission, deletion-confirmation policy and treatment of already published derivatives.

## Reliability and credential controls

**What / why:** Keep synchronization recoverable without allowing a compromised webhook, token, or replay to mutate editorial approvals.

**Recommendation:**

- Encrypt access/refresh tokens with a managed key service; restrict decryption to the integration worker. Keep tokens, secrets, signed URLs and raw personal payloads out of logs. Serialize refresh per connection and atomically replace returned credentials. Access lifetime: two hours; refresh window: 90 days [S01].
- Disconnect by stopping jobs, deactivating owned subscriptions, invoking `POST /oauth/revoke` [S01], and removing stored credentials. Record completion or pending cleanup; local unlink alone does not prove remote revocation.
- Allow only approved GET routes plus the optional audio-download action. Reject episode/notes mutation requests in the adapter even if the granted scope permits them. Use a minimally privileged staff account and selected channels.
- Verify `X-PCO-Webhooks-Authenticity` against HMAC-SHA256 of the raw body using the subscription secret, with constant-time comparison [S05]. Bind the subscription and secret to the tenant before processing; do not trust an inbound tenant identifier.
- Durably enqueue a verified event before HTTP 200. Deduplicate by subscription and delivery identity, make imports idempotent, and retain replay records under policy. HMAC proves origin/integrity, not freshness: duplicate detection and state reconciliation remain required. No signed timestamp guarantee was verified.
- For API HTTP 429, wait at least `Retry-After`; use bounded exponential backoff with jitter for transient failures. Refresh once for an expired token; persistent authentication/authorization errors pause the connection. Route exhausted work to an operational queue. Replay optional POST actions only after checking safety.
- Re-fetch current state after an event instead of assuming arrival order. Reconcile selected channels periodically, following every page and comparing source hashes/IDs; combine frequent bounded checks with a slower complete scan. Do not assume an undocumented updated-since filter. Track lag, last success, failed signatures, retry counts and unexplained missing records.

**Alternatives:** Polling-only avoids webhook setup but raises latency and request load; webhook-only misses recovery after subscription failure. **Dependencies:** Durable queue, secrets service, scheduler, monitoring and account-owner continuity. **Risks:** Refresh races, replay, event floods, owner departure and outage gaps. **Open:** Subscription lifetime, complete change coverage, audio URL expiry and practical per-endpoint restrictions.

## Proofs of concept and required evidence

These are proposed tests, **not executed results**. Use a consenting test organization and fabricated content. Record sanitized status codes, selected headers, field names, identifiers and observations; never publish tokens or real member payloads.

| PoC / concrete request or action | Expected evidence to collect / acceptance gate |
|---|---|
| Staff OAuth: `scope=publishing`, code flow, PKCE; authorize at `https://api.planningcenteronline.com/oauth/authorize`; exchange at `https://api.planningcenteronline.com/oauth/token` [S01] | Granted scope, permission behavior and successful refresh; adapter trace proves no unintended product requests or mutation routes. Failure is evidence, not an assumed success. |
| Identity: ordinary adult member without People access completes OAuth with zero requested scopes; `GET /current/v2/me`, then a negative-control `GET /people/v2/me` | Whether zero-scope authorization works; returned identity/church context; actual negative-control behavior. Repeat logged in/out on mobile/web. No member-SSO claim until this passes. [S01, S10] |
| Metadata: `GET /publishing/v2/episodes?per_page=100&include=series,speakerships,episode_resources,episode_times` and `GET /publishing/v2/episodes/{id}/note_template` | Actual field completeness, pagination, publication visibility, date meaning and note format. Re-import produces one local source with revision changes only when content changes. [S02, S07] |
| Audio: empty-body `POST /publishing/v2/episodes/{id}/generate_download_url` for a test upload | Response contract, expiry behavior, accessible audio and rights approval; compare audio to notes before choosing transcription. No URL lifetime is assumed. [S02] |
| Events: `GET /webhooks/v2/available_events`; configure returned Publishing names; create/update/delete a test episode and change its times through vendor UI | Exact event names, payloads, coverage and delivery identity. Capture raw-body HMAC verification, duplicate replay, bad signature rejection, failure retry and reconciliation after a deliberately missed event. [S03, S05, S06] |
| Resilience and removal: simulate HTTP 429/5xx and token failure; delete a test source; disconnect; replay a prior event | Header-aware pacing, bounded retries, stopped ingestion, credential cleanup/revocation, stable ID mapping, tombstone and preserved approved snapshot subject to retention policy. Rate-limit simulation avoids deliberately flooding the provider. |
| Entry link: add the app URL to Church Center navigation and a membership-restricted page; visit destination directly as guest/nonmember/member | Device navigation behavior and independently enforced destination access. Link visibility never substitutes for authorization. [S09, S11] |

**What / why:** Resolve the highest-risk assumptions before implementation commitments. **Recommendation:** Gate member-login promises on identity results; gate automatic ingestion on provenance, deletion and recovery results. **Alternative:** Ship manual source upload and independent app login while unresolved integrations remain optional. **Dependencies:** Authorized test account, callback endpoint and staffed review. **Risks:** A successful staff test may not generalize to ordinary members. **Open:** Product owner accepts the fallback and chooses which gates are launch requirements.
