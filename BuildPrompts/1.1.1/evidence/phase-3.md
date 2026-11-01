# Phase 3 — Scheduling, SMS and member engagement evidence

Build: **1.1.1**. Status: **Blocked — partial source inspected; prerequisite and required evidence unmet**. Completion timestamp/fingerprint: **not set**. Existing approval covers phases 0–4; no new permission is required for authorized independent work. Dependent implementation/acceptance must respect the [master sequence](../MASTER_BUILD_PROMPT.md#6-phase-execution-table).

## Observed implementation

[Publication scheduler](../../../backend/src/workers/publication.ts), [provider worker/SMS routes](../../../backend/src/api/provider-routes.ts), [time policy](../../../backend/src/integrations/time.ts), [Twilio adapter](../../../backend/src/integrations/twilio.ts), [delivery UI](../../../frontend/components/delivery-center.tsx), [member actions](../../../frontend/components/member-actions.tsx). Source includes DST resolution, bounded catch-up, consent/suppression, preview hashes, budgets/windows/expiry, signed callbacks and submission-unknown handling. Reactions exist; a discussion-enabled label does not implement discussion.

These observations identify source, not executed behavior or a passed phase. Inspection after build resumption does not establish when dependent work was authored or that its prerequisite gate passed.

## Test definitions and supplied results

[Timezone/window/segment definitions](../../../backend/tests/integrations/time.test.ts), [Twilio stub definitions](../../../backend/tests/integrations/providers.test.ts), [callback security definitions](../../../backend/tests/integrations/security.test.ts), [provider API/worker integration definitions](../../../backend/tests/integration/providers-api.test.ts). Backend unit suite reported passing; full PostgreSQL/browser suites and concurrent/crash tests remain pending.

This documentation assignment has not run application tests, modified generated reports, or obtained manual/provider review. Latest main-supplied summary: component type checks pass; frontend 7 unit tests and backend 24 unit tests pass; root lint reported 15 provider errors under repair; full browser and integration execution pending. Exact commands/count reports/fingerprints must be linked when received, and a later suite result supersedes this supplied summary only for its tested state.

## Complete required gate — unchecked

Primary acceptance: AC09, AC12, AC16, AC23–AC28; regress prior applicable gates.

- [ ] Durable local date/time/IANA/UTC/version resolution matches approved calendar intent. Test spring gaps, autumn overlaps, no-DST/half-hour zones, timezone-data changes and stale jobs.
- [ ] Pending-at-deadline blocks publication/SMS; late approval does not release it. Test preapproved recovery at +15 minutes versus +15 minutes and one second, and approval arriving at +5 minutes. Enforce quiet hours/expiry independently.
- [ ] Real concurrent cancellation/edit/dispatch, lease expiry, process termination/restart and outbox duplication tests demonstrate correct logical publication and recipient intents. SMS failure cannot republish content.
- [ ] Consent evidence is sender/purpose/tenant-scoped. Import does not opt in; STOP suppresses queued intents, fresh consent is required for resubscribe and provider-specific suppression scope is preserved. Test the in-flight STOP limitation honestly.
- [ ] Approved SMS preview, actual provider encoding/segment estimate, per-church sender, recipient geography/zone, budget, registration, send window and explicit expiry are enforced backend-side. Unknown geography or invalid prerequisites hold sending.
- [ ] Authenticated callbacks bind provider account to tenant, reject forgery/cross-tenant routing, deduplicate replays and handle event reordering. Submission timeouts after possible acceptance enter reconciliation; no blind resend or fake read receipt.
- [ ] Authorized provider/test-number round trip demonstrates consent, send/status callback, STOP and suppressed follow-up in the actual approved account/sender setup. Provider registration, country policy and consent review are evidenced; CI/test doubles alone cannot pass.
- [ ] Appreciation reactions require membership and can be moderated. Discussion is off by default; when enabled, test pre-moderation, pending visibility, author edits, private reports, moderator hide/restrict/audit and appeal contact, including direct API abuse.
- [ ] Queue/failed/unknown delivery dashboards, alerts, budget controls, provider outage runbooks, safe replay and recovery tests work. Accessibility/manual review covers scheduling and discussion.

All common mandatory gate rules and prior required regressions also apply. A future automated runner pass does not replace an item absent from its suite or any required external/human proof.

## Known blockers and missing evidence

G1C prerequisite is unmet; AI-derived sends additionally require G2. No registered authorized sender/country/recipient/consent review or real send/status/STOP round trip exists. Inspected member UI/routes have no discussion composer, pre-moderation queue, private report/moderator hide/restrict/appeal workflow or reaction moderation. Lease/process restart/concurrent cancel-edit-dispatch/STOP and restore-safe suppression proofs, dashboards/alerts/runbooks and human participation/scheduling accessibility review remain required. No blanket exactly-once SMS claim.

Owners: main/backend/frontend agents for missing implementation/test/operational artifacts; church/account/rights/privacy/accessibility reviewers for external decisions and sign-offs. See [development prerequisites](../../../docs/development.md#prerequisites-and-blockers) and [source-to-acceptance mapping](../../../docs/source-evidence.md). No capability is excluded from approved scope and no required gate is waived.

## Completion decision

**Not complete.** All required test/review checkboxes remain open until concrete command results, test IDs, UTC execution times, tested source/lockfile/migration fingerprint and actual reviewer/provider artifacts are recorded. Deployment/live messaging remain unauthorized. Independent research, provider preparation and test design may continue; unmet prerequisite gates still prevent dependent phase advancement.
