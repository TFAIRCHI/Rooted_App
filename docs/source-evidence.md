# Source and acceptance evidence — build 1.1.1

Resumption review, 2026-10-19. Current automated evidence is recorded in the versioned gate reports: G1A passes lint, typecheck, 13 frontend unit tests, 24 backend unit/integration tests, 4 operations tests, 32 integration tests and production builds; G1B additionally passes 4 browser journeys. Human accessibility/editorial review, cloud recovery, live provider proof and pilot evidence remain open. Native PostgreSQL and loopback HTTP tests do not establish cloud recovery or real provider proof.

Canonical concrete contracts: [core API](../backend/contracts/API.md), [provider API](../backend/contracts/PROVIDERS.md), [pure integration contracts](../backend/src/integrations/README.md). Frontend [API client](../frontend/lib/api.ts) and [handwritten DTO types](../frontend/lib/types.ts) exist; a generated client/schema compatibility result was not found in the inspected files. Written contracts do not prove working endpoints or override mandatory research semantics.

Each row below is a source/test locator and gap record, not a pass. Test function names in each linked file identify actual definitions; associate exact executed test IDs and reports before closing acceptance.

## AC01

Object chain: [implementation](../backend/src/api/core-routes.ts); [test definitions](../frontend/e2e/core.spec.ts). Source/test definitions exist; full browser/database result pending.

## AC02

Date-first: [implementation](../frontend/components/workspace-pages.tsx); [test definitions](../frontend/e2e/core.spec.ts). Full keyboard/mobile authoring review pending.

## AC03

Exactly two choices: [implementation](../frontend/components/plan-editor.tsx); [test definitions](../frontend/components/plan-editor.test.tsx). Frontend unit suite 7 passes supplied; full real browser result pending.

## AC04

Selective proposals: [implementation](../frontend/components/ai-assistance.tsx); [test definitions](../backend/tests/integration/providers-api.test.ts). Adoption source exists; complete integration/browser and real-provider evaluation pending.

## AC05

Manual fallback: [implementation](../frontend/components/plan-editor.tsx); [test definitions](../frontend/components/plan-editor.test.tsx). Local unit suite supplied passing; actual AI-outage/manual review journey pending.

## AC06

Plan validation: [implementation](../backend/src/modules/revisions.ts); [test definitions](../backend/tests/integration/editorial.test.ts). Schema/revision unit source and reported backend unit suite; API submission result pending.

## AC07

Independent approvals: [implementation](../backend/src/modules/editorial.ts); [test definitions](../backend/tests/integration/editorial.test.ts). Real approval journey definitions exist; integration/browser result pending.

## AC08

Edit invalidation: [implementation](../backend/src/modules/save-revision.ts); [test definitions](../backend/tests/integration/editorial.test.ts). Cancel-on-edit/live-pin code; full test results and scheduling races pending.

## AC09

Deadlines: [implementation](../backend/src/workers/publication.ts); [test definitions](../backend/tests/integrations/time.test.ts). Local time helper suite reported passing; worker/deadline staff-notification integration pending.

## AC10

Recovery: [implementation](../frontend/lib/drafts.ts); [test definitions](../frontend/lib/drafts.test.ts). Recovery unit suite supplied passing; offline/reauth/persistent replay browser proof pending.

## AC11

Concurrency: [implementation](../frontend/components/content-editor.tsx); [test definitions](../backend/tests/integration/editorial.test.ts). ETag source exists; content common-base conflict pane not seen; true concurrent/race results pending.

## AC12

Calendar: [implementation](../frontend/components/slot-settings.tsx); [test definitions](../frontend/e2e/core.spec.ts). Slot/calendar source and browser definitions; flexibility/invalidation results pending.

## AC13

Tenant isolation: [implementation](../backend/src/infrastructure/database.ts); [test definitions](../backend/tests/integration/runtime-boundary.test.ts). Six actual-runtime test definitions; full execution pending, no RLS pass inferred from source.

## AC14

Identity/permissions: [implementation](../backend/src/auth/routes.ts); [test definitions](../backend/tests/integration/editorial.test.ts). Code/PKCE/JWT/session checks and negative definitions; protocol/membership suite pending.

## AC15

Collaboration: [implementation](../backend/src/api/core-routes.ts); [test definitions](../backend/tests/integration/editorial.test.ts). Revision comments/mentions code exists; complete scoped mention/readability/dedup/review test coverage not demonstrated.

## AC16

Moderation: [implementation](../frontend/components/member-actions.tsx); [test definitions](../frontend/e2e/core.spec.ts). Gap: enabled label/reactions only in inspected UI; discussion/moderation/report/restrict workflows and tests absent.

## AC17

Planning Center: [implementation](../backend/src/integrations/planning-center.ts); [test definitions](../backend/tests/integration/providers-api.test.ts). Local stub definitions only; real church/API entitlements/events/OAuth/device-link evidence blocked.

## AC18

Ingestion: [implementation](../backend/src/integrations/ingestion.ts); [test definitions](../backend/tests/integrations/source-fetch.test.ts). Parser/SSRF local units reported passing; audio inspector is injected, production scanner/chunk workflows/rights proof missing.

## AC19

Citations: [implementation](../backend/src/integrations/scripture.ts); [test definitions](../backend/tests/integrations/security.test.ts). Separate reference/quotation/interpretation checks; authorized corpus/rights and church evaluation blocked.

## AC20

Injection: [implementation](../backend/src/integrations/ai.ts); [test definitions](../backend/tests/integrations/providers.test.ts). Local adapter requests have no editorial tools; broader multilingual/encoded retrieval/side-effect evaluation unverified.

## AC21

Explicit drafting: [implementation](../backend/src/modules/editorial.ts); [test definitions](../backend/tests/integration/providers-api.test.ts). Manual draft and approved-plan AI checks exist; full integration and live AI proof pending.

## AC22

Reading/accessibility: [implementation](../frontend/lib/member-server.ts); [test definitions](../frontend/e2e/core.spec.ts). SSR/member/mobile source; browser result and full keyboard/screen-reader/WCAG human review pending.

## AC23

Consent: [implementation](../backend/src/api/provider-routes.ts); [test definitions](../backend/tests/integration/providers-api.test.ts). Tenant/sender consent source/local stub definitions; actual sender/country/consent approval blocked.

## AC24

STOP: [implementation](../backend/src/api/provider-routes.ts); [test definitions](../backend/tests/integration/providers-api.test.ts). Signature/suppression/stub callback source; live STOP and true concurrent in-flight/restart tests unverified.

## AC25

Quiet hours/budgets: [implementation](../backend/src/integrations/time.ts); [test definitions](../backend/tests/integrations/time.test.ts). 09–20/unknown-zone/expiry helper tests in reported unit suite; real policy/dispatch integration pending.

## AC26

DST: [implementation](../backend/src/integrations/time.ts); [test definitions](../backend/tests/integrations/time.test.ts). Luxon gap/overlap/non-DST/half-hour helper definitions; tzdb-change reconfirmation proof pending.

## AC27

Reliability: [implementation](../backend/src/workers/publication.ts); [test definitions](../backend/tests/integration/editorial.test.ts). Transactional publication/outbox and unknown-submission source; process-kill/restart/leases/concurrent dispatch proof pending.

## AC28

Operations: [implementation](../backend/src/workers/worker.ts); [test definitions](../backend/tests/integrations/providers.test.ts). Provider-disabled handling and CI source exist; owned alerts/dashboard/load/rollback/outage/replay evidence incomplete.

## AC29

Lifecycle: [implementation](../backend/LOCAL_DATABASE.md); [test definitions](../backend/scripts/postgres.test.mjs). Native database 3 checks supplied passing; export/deletion APIs/ledger/object-aware restore/pilot RPO-RTO not demonstrated.

## Deliverables requiring main-agent attention

- G1A: finish lint repairs, clean-install/build/types/unit/integration checks, real runtime-role and OIDC/session negatives, and verify generated client/authoritative schema compatibility rather than treating handwritten DTOs as generation proof. CI configuration exists; no CI execution evidence inspected.
- G1B/G1C: full browser journeys and accessible three-way conflict/recovery, including content common-base comparison, collaboration authorization/dedup coverage, privacy/export/deletion/retention foundations and database-plus-required-object recovery. Native DB helper restores omit original owners/grants; do not infer application recovery from them.
- G2: full AI-draft payload completion and explicit adoption/undo journey, production audio inspection/chunk failure/cancellation handling, broader adversarial evaluation, licensed quotations and church thresholds/review; all real provider evidence remains blocked.
- G3: implement discussion composer/pre-moderation, author edit re-review, private reports, audited hide/restrict/reaction moderation and appeal contact. A settings flag and explanatory label do not deliver these workflows. Verify process crash/lease/restart/cancel-dispatch/STOP races and owned alerts/runbooks.
- G4: verify real Planning Center lifecycle and deletion tombstone/reconciliation semantics, device-tested Church Center links/fallback identity, reproducible capacity/load and pilot-equivalent restore with objects/keys/deletion/suppression replay. Required security/privacy/accessibility/editorial/pilot sign-offs and costs remain outstanding.

No product scope exclusions are approved. Missing implementation and external evidence retain their original gates; dependent phases remain blocked by prerequisite gates even when independent source already exists. Main agent owns root README/scripts, application changes and generated automated reports. This documentation assignment only maintains docs and manual tracker/evidence.
