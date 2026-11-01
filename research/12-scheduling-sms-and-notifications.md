# Scheduling, SMS, and notifications

Research snapshot: **2026-10-18**. **Recommendation:** Treat approval, publication, and notification as separate authorizations and outcomes. All proposed product behavior below is a recommendation, not a verified vendor feature. Vendor evidence and exact URLs are in [messaging evidence](evidence/messaging.md), with IDs S30–S48 in the [source register](sources.md). No accounts were connected and no messages were sent.

## Per-day scheduling and time semantics

Grace Community's fictional series, “To Whom Shall We Go?” (John 6:68), starts with Monday/Wednesday/Friday slots. This is a configurable template, not a fixed cadence. Staff can add/remove days and independently change each date, wall time, zone, assigned contributor, publication audience, and notification choice. A week-level action must show and confirm each affected occurrence.

| Slot | Configured local date/time | IANA zone | Resolved UTC due instant |
|---|---|---|---|
| Monday | 2026-10-19 08:00 | America/New_York | 2026-10-19T12:00:00Z |
| Wednesday | 2026-10-21 08:00 | America/New_York | 2026-10-21T12:00:00Z |
| Friday | 2026-10-23 08:00 | America/New_York | 2026-10-23T12:00:00Z |

Wednesday can instead be 18:30 without moving Monday or Friday. These example dates use UTC−04:00. At 08:00 on 2026-11-02 in the same zone, the instant is 13:00Z. Recurrences follow the configured local clock rather than adding 48 hours to a previous UTC instant.

Persist the local date/time, IANA zone, selected overlap offset where applicable, timezone-database version, resolved `due_at_utc`, and monotonically increasing `schedule_version`. Also pin tenant, slot, immutable approved content revision/hash, approval record, notification-template revision, and audience-policy version. UTC drives execution; retain the local intent for explanation and subsequent review. Reject timezone abbreviations such as EST as configuration inputs.

Resolve daylight-saving transitions before saving an occurrence:

- **Gap:** `2027-03-14 02:30 America/New_York` does not exist. Reject it, explain the gap, and require a valid replacement; do not shift automatically.
- **Overlap:** `2026-11-01 01:30 America/New_York` occurs twice. Require an explicit choice between UTC−04:00 (05:30Z) and UTC−05:00 (06:30Z), display both, and save the choice.
- **Timezone update:** If a timezone-database update changes a future resolved instant, invalidate that occurrence and request confirmation of a new schedule version. Never silently move it.

The scheduling confirmation shows local and UTC time, approved revision, audience, notification preview, quiet-hour deferral rules, and expiry. SMS is an explicit selection. “Save draft,” plan approval, and content approval never implicitly schedule, publish, or send.

## Approval and occurrence state

Approval attaches to immutable member-facing content, including any SMS excerpt. An approved plan is insufficient. Prefer a separately approved short notification with a link; do not generate fresh member-facing text during dispatch.

| Trigger | Required behavior |
|---|---|
| Schedule an approved revision | Create a versioned occurrence and record explicit publication and optional SMS authorization. |
| Edit scheduled content or its SMS text | Immediately invalidate pending occurrences and unsent notification intents. Preserve historical approval, but require approval of the new revision and explicit rescheduling. |
| Change date, time, zone, audience policy, or dependency approval | Invalidate the old version and require a new confirmed schedule for automatic delivery. An explicit contributor publish action may deliver the exact approved snapshot immediately, even after the planned calendar time; it does not silently alter the editorial calendar. Recipient-specific SMS deferral within an already approved delivery window is operational and does not change the editorial calendar snapshot. |
| Due time arrives with content pending, rejected, approval revoked, or dependency superseded | Record `BLOCKED_APPROVAL`; publish nothing and send no member SMS. Notify staff through a separate operational channel. |
| Approval arrives after a blocked due time | Keep the occurrence blocked. Approval alone cannot release it; require an explicit future schedule. |
| Staff cancel or withdraw | Cancel unsent intents; retain audit history. Withdrawal hides content and suppresses remaining related SMS. Already handed-off SMS cannot be recalled. |

Changing a published study creates a new revision and a separate correction approval/publication action. Historical publication remains bound to its original snapshot. Do not automatically send a second SMS for an edit.

## Outages and bounded catch-up

Use the authoritative database clock and record `due_at`, `approved_at`, recovery time, blocker reasons, and action actor. The catch-up window is a proposed product policy, not a vendor guarantee.

1. Before the deadline, content must already have valid approval and an active confirmed schedule.
2. During a worker outage, recover automatically only when `0 <= now - due_at <= 15 minutes`, the exact revision was approved no later than the due instant, and no version, withdrawal, or eligibility check has changed.
3. Beyond 15 minutes, mark `NEEDS_STAFF_REVIEW`. Staff must choose skip or explicitly reschedule for a future time; no unlimited backlog drain.
4. An occurrence blocked for pending approval at its deadline is never eligible for this outage exception, even if subsequently approved within 15 minutes.

Example: an approved Monday study due at 08:00 can publish at 08:12 after recovery. At 08:16 it needs staff review. If approval first arrives at 08:05, either recovery time still requires rescheduling. Preserve the distinction between infrastructure delay and missing editorial permission.

SMS has its own explicitly confirmed expiry and delivery policy. An outage must not revive expired SMS or bypass quiet hours. If publication succeeds but messaging is down, show “Published; SMS pending/failed,” then apply notification expiry and reconciliation independently. Do not republish content as a messaging retry.

## Independent publication and transactional outbox

Use application-managed scheduling for the initial integration so provider schedules do not outlive approval changes. Do not claim that vendor cancellation can recall an already dispatched message.

In a database transaction, lock/revalidate the occurrence, current schedule version, content approval, and tenant boundary. Commit the publication record and a uniquely keyed `publication.committed` outbox event together. A notification consumer independently verifies explicit SMS authorization and creates recipient intents. Publication remains successful if SMS is suppressed, expired, or fails.

Suggested records:

- `publication_occurrence`: tenant, slot, revision/hash, schedule version, UTC deadline, approval, state, blockers, published timestamp.
- `notification_intent`: occurrence, recipient, channel, approved template revision, authorization version, earliest/latest send, state, suppression reason.
- `outbox_event`: tenant, event ID, aggregate version, payload reference, lease, attempts, next attempt, completion.
- `delivery_attempt`: intent, attempt ID, provider, provider message ID if known, request fingerprint, transport outcome, delivery status, reconciliation state.

Unique keys on occurrence/version and occurrence/recipient/channel/template prevent duplicate local work. Workers use leases, bounded retries, backoff, and idempotent consumers. Local database uniqueness does **not** provide exactly-once SMS delivery. Retry internal events freely only when their handlers are idempotent; provider submission requires the ambiguity policy below.

At execution, resolve recipient eligibility from current membership and preferences within the authorized audience policy. Recheck tenant ownership, approval/version, publication visibility, SMS authorization, consent, suppression, quiet hours, and expiry immediately before provider submission. A successfully published record alone does not authorize sending to every contact.

## Quiet hours, country, and onboarding

**Assumption:** Initial costing and carrier research target the United States; recipient country is currently unknown. This assumption cannot populate a person's country or authorize delivery. Onboarding must explicitly confirm church jurisdiction, intended recipient countries, number registration, consent process, sender identity, and timezone fallback coverage. Hold SMS until this setup is complete.

Proposed product default: send ordinary study notifications only between **09:00 inclusive and 20:00 exclusive in the recipient's known IANA zone**. This is a product restriction, not a statement that the window satisfies every applicable law. Record the zone source; never infer precise location from a telephone area code alone. Apply stricter tenant or jurisdiction rules when configured and re-evaluate after preference changes.

When the recipient zone is unknown:

- Use a fallback only after staff explicitly confirm its geographic coverage. For a verified audience limited to the **50 U.S. states**, a conservative default intersection is **20:00–23:00 UTC**, within the proposed local window across those states under current offsets.
- The 50-state fallback does not cover every U.S. territory or international recipient. If that geographic assumption is unconfirmed, country is unknown, or no common allowed window exists, hold for staff/recipient clarification.
- Do not silently substitute the church's zone. Staff see fallback coverage and deferred counts before confirming SMS. Permit quiet-hour deferral only until the explicitly approved notification expiry; otherwise expire it. Never automatically send the next morning without that authorization.

Publication itself is unaffected by recipient quiet hours. Staff reminders use separate preferences and channels; operational urgency does not create a bypass for member SMS.

## Consent ledger and STOP race handling

Store an append-only consent ledger scoped to tenant, recipient/normalized number, channel, sender/program, and message purpose. Include event type, consent wording/version, source and evidence reference, timestamps, actor, country/jurisdiction context, revocation method, and provider identifiers. Maintain a current suppression projection plus a monotonically increasing consent version. A contact import, church membership, API `ACTIVE` flag, or another church's consent is not evidence of permission for this program.

Twilio requires proof of consent [S31]; Clearstream requires retained explicit written consent [S37]; Text In Church specifies a four-year record obligation [S43]. Apply a documented retention policy that meets the selected provider and applicable requirements; restrict access and redact operational logs. Keep sufficient suppression information to prevent accidental re-import/reactivation.

Process authenticated STOP events before any automated reply workflow; apply provider-specific scope. For Text In Church it is account-wide [S44]; Clearstream distinguishes accounts/subaccounts [S38]. Preserve the original event and cancel pending intents. Non-keyword revocations received through staff or another channel must enter the same ledger. Re-subscription requires fresh evidence and any provider-required handset action, not an administrator clearing a flag.

Serialize consent changes and the final local dispatch decision per recipient/sender scope, check the current consent version, and fail closed when the suppression service is unavailable. Recheck after acquiring the send lease and immediately before network submission. Avoid claiming that a database transaction spans the carrier network: STOP can arrive after the final check while a request is in flight. Provider blocking helps [S32], but cannot guarantee recall. Mark that race for reconciliation, suppress all remaining work, and record the handoff timing without promising zero post-STOP delivery.

## Callback integrity and ambiguous submission

Provider adapters must define the actual callback contract before activation. For Twilio, validate the provider signature using its supported verifier and the externally visible URL/body; verify that contract against official security documentation during implementation. For Clearstream, the reviewed API documents a shared webhook authentication header [S36]; do not describe it as a cryptographic body signature. Text In Church advertises signature verification without a verified detailed contract [S42]; production callback activation stays blocked until the signing procedure is confirmed.

Require HTTPS, bounded payloads, tenant/account binding, secret rotation, and constant-time secret comparison where appropriate. Treat receipt of an authenticated callback as an event, not as permission to schedule or send. Record event identifiers or a scoped canonical-payload digest, apply idempotent processing, and retain deduplication state through the retry/reconciliation horizon. Use signed timestamps/expiry only where the provider actually supplies them; a valid signature alone does not establish freshness. Do not invent an unsigned timestamp requirement that rejects legitimate callbacks.

Accept documented legitimate retries but reject cross-tenant routing and previously processed effects. Tolerate out-of-order delivery events; store the event trail and reconcile transitions rather than overwriting a final delivery result with an earlier queue event. Provider signatures/shared secrets and replay protection solve different problems.

For a timeout or connection reset after submission may have reached the provider, mark `SUBMISSION_UNKNOWN`. Do not blindly retry. Reconcile through provider message lookup, callbacks, correlation metadata where supported, and support escalation. If no definitive match can be established, require staff review; explain duplicate risk before any authorized resend. Retry automatically only when non-acceptance is established or a documented provider idempotency contract applies. Do not assume such a contract exists for all adapters.

Keep `queued`, `submitted`, carrier-delivery evidence, and member-opened/read distinct. Twilio distinguishes carrier acceptance from delivery [S30, S33]. Clearstream reports campaign metrics and failures [S36]. Text In Church's help definition of Delivered is weaker [S45]. An HTTP success response is never proof that a member received or read an SMS.

## Vendor comparison and cost implications

These are verified documentation snapshots, not tested integrations or binding quotes. Compare equivalent recipient counts, SMS segments, MMS, incoming traffic, registration, numbers, and operational effort.

| Dimension | Twilio | Clearstream | Text In Church |
|---|---|---|---|
| Integration | Message API and callbacks [S30, S33]. | REST/JSON, API key, sending/scheduling, subscribers, replies, webhooks [S36]. | Technical API uses bearer tokens and support approval [S41]; marketing examples use a different route shape [S42]. |
| Delivery evidence | Documented message states and carrier receipts [S30, S33]. | Campaign states and aggregate report around 30 minutes after sending; individual failure events [S36]. | UI Delivered means departure from platform; callback schema remains unverified [S42, S45]. |
| Consent / suppression | Sender/purpose-specific consent; Advanced Opt-Out provides blocking and webhook signals [S31, S32]. | Single-subscriber creation defaults to double opt-in; bulk creation does not. Dedicated-shortcode override exceptions require care [S36]. | Informational versus marketing consent differs; account-wide STOP [S43, S44]. |
| Sender identity | Local/toll-free/shortcode options; U.S. 10DLC approval required for local-number route [S34, S35]. | Local numbers and short codes; organization registration, fees covered [S39, S40]. | Local numbers and approved Sender Profile; additional number pricing available [S44, S45]. |
| Price snapshot | $0.0083 per inbound/outbound SMS segment; local number $1.15/month; carrier and registration extras; Failed processing $0.001/message [S35]. | $35/month for 1,000 credits/one number; $59 for 2,500/three; $119 for 6,000/five. Incoming texts free; outgoing credit cost varies [S40]. | Current dollar amounts unavailable in retrieved pricing rendering. Conflicting credit accounting prevents a dependable current total [S46–S48]. |

Twilio example: 300 recipients × 3 weekly sends × 4 weeks × one segment = 3,600 outbound segments, **$29.88 base**, plus one local number = **$31.03 before extras** [S35]. Add carrier, registration/campaign, inbound, failed-processing, and optional-service costs. This assumes a four-week month without multipart or compliance traffic; it is not an all-in quote.

Clearstream monthly credits do not roll over; additional credits and auto-refill are separate choices. Long text, emoji, and pictures can increase usage. Confirm the actual approved message's credit estimate and extra-credit prices before purchase [S40]. No API-specific surcharge was established in the reviewed material.

Text In Church conflicts must remain visible:

- Current pricing says image MMS costs **2 credits** [S46]; the August 17 plans article says **3** [S47].
- The plans article describes segment-based credits [S47], while allotment help says up to three standard segments count as one message [S48].
- Allotment help lists **$0.03 overage** and **500-message bundles for $12/month** [S48]. Applicability to current Core/Plus/Suite plans is unconfirmed.
- Additional local numbers are listed at **$4/month each**, or **three for $9/month** [S44]. These do not establish a current base subscription price.

## Decisions, unknowns, and acceptance gates

**Recommendation:** Keep the adapter boundary vendor-neutral. Twilio has the clearest reviewed technical delivery contract; Clearstream offers managed church workflows and bundled fees. Text In Church requires written reconciliation of API and pricing discrepancies before selection. This is an inference from the evidence, not a benchmark of deliverability.

Before implementation, the product owner must confirm recipient countries, audience geography, quiet hours/expiry, staff escalation ownership, permission roles, and approval/rescheduling policy. The integration owner must verify callback signing, retry and retention contracts, consent export, opt-out scope, delivery polling, number portability, throughput, current registration costs, and API plan entitlement. Do not equate carrier registration with consent or overall legal compliance.

Required acceptance scenarios:

1. M/W/F times vary independently; persisted UTC matches the selected zone and database version. DST gap rejects; overlap requires an explicit offset choice.
2. Content/SMS edits invalidate queued work; stale workers cannot publish or submit. Plan approval alone never releases a study.
3. Pending content at deadline blocks. Subsequent approval requires rescheduling. Previously approved content recovers at +15 minutes; at +15 minutes and one second it requires staff review.
4. Publication succeeds while SMS fails; retrying SMS never republishes. Unapproved templates and withdrawn links cannot send.
5. Recipient-zone restrictions, explicit geographic fallback, and expiry survive outages. Unknown country/coverage holds delivery.
6. STOP before dispatch suppresses; concurrent STOP records the in-flight boundary and cancels remaining intents. Re-import does not remove suppression.
7. Forged/cross-tenant callbacks reject; replayed callbacks have one local effect; out-of-order callbacks retain accurate evidence.
8. Ambiguous network submission enters reconciliation without blind retry. Staff can distinguish published, suppressed, submission-unknown, carrier-delivered, and failed states. No screen or contract claims exactly-once SMS.
