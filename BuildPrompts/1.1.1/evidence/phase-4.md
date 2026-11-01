# Phase 4 — Planning Center integration and pilot readiness evidence

Build: **1.1.1**. Status: **Blocked — partial source inspected; prerequisite and required evidence unmet**. Completion timestamp/fingerprint: **not set**. Existing approval covers phases 0–4; no new permission is required for authorized independent work. Dependent implementation/acceptance must respect the [master sequence](../MASTER_BUILD_PROMPT.md#6-phase-execution-table).

## Observed implementation

[PCO adapter](../../../backend/src/integrations/planning-center.ts), [provider routes](../../../backend/src/api/provider-routes.ts), [provider contracts](../../../backend/contracts/PROVIDERS.md), [native database guide](../../../backend/LOCAL_DATABASE.md). Source includes tenant/session-bound OAuth, encrypted tokens, refresh/disconnect, source imports and webhook inbox. Member SSO is explicitly unverified; independent OIDC remains the supported candidate.

These observations identify source, not executed behavior or a passed phase. Inspection after build resumption does not establish when dependent work was authored or that its prerequisite gate passed.

## Test definitions and supplied results

[PCO HTTP-stub definitions](../../../backend/tests/integrations/providers.test.ts), [raw signature tests](../../../backend/tests/integrations/security.test.ts), [PCO API/worker integration definitions](../../../backend/tests/integration/providers-api.test.ts). These do not establish actual account entitlements, external fields/events or member SSO. Main reports 3 native database persistence/backup/restore checks; no pilot-equivalent operational test is evidenced.

This documentation assignment has not run application tests, modified generated reports, or obtained manual/provider review. Latest main-supplied summary: component type checks pass; frontend 7 unit tests and backend 24 unit tests pass; root lint reported 15 provider errors under repair; full browser and integration execution pending. Exact commands/count reports/fingerprints must be linked when received, and a later suite result supersedes this supplied summary only for its tested state.

## Complete required gate — unchecked

Primary acceptance: AC17 and integration portions of AC18/AC28–AC29; final reconciliation of **all AC01–AC29** for default phases 0–4.

- [ ] Reverify official APIs/scopes/events and bind OAuth connections to the correct tenant; encrypted tokens, serialized refresh, revocation/disconnect and lost-permission recovery pass contract/integration tests.
- [ ] Authorized test-church evidence confirms selected episode/notes/media fields, pagination, event names and account entitlements. Signed/authenticated webhook inbox, duplicates/reordering, deletion tombstones, rate limiting and missed-event reconciliation preserve local approved snapshots.
- [ ] The read-only adapter blocks unintended writes even when the product scope permits them. Media/transcript provenance and rights remain explicit; no transcript availability invented from a notes field.
- [ ] Church Center custom links work on devices and direct destination access independently authorizes. Member SSO remains disabled unless ordinary-member eligibility, identity/tenant binding, lifecycle and revocation are actually demonstrated. A documented successful fallback through independent authentication may close the identity decision; it must not be labeled SSO success.
- [ ] Full default-scope acceptance matrix has implementation-test/review evidence for AC01–AC29. Run both-component build/lint/types, unit/integration/contracts, browser/security/accessibility and all prior required gates on the tested state.
- [ ] Exercise the research's capacity envelope with reproducible load and measure read/save/publication performance; remediate unmet adopted targets. Record that monthly availability cannot be established by a short local load run.
- [ ] In an explicitly authorized pilot-equivalent environment, demonstrate monitored backup/restore, required objects/key access, deletion/suppression replay, safe queue recovery and observed RPO/RTO against the adopted targets. If environment authorization is absent, this gate remains blocked; prepare manifests/runbooks without applying them.
- [ ] Security/privacy review, required full-process accessibility review, church editorial review, moderator/consent ownership, support/incident runbooks, cost limits and pilot acceptance are evidenced. Outstanding required jurisdiction/rights/provider decisions block activation and phase completion.
- [ ] Publish an accurate readiness report: local versus pilot versus production evidence, excluded optional features and deployment authorization still required. No live launch is implied by this gate.

All common mandatory gate rules and prior required regressions also apply. A future automated runner pass does not replace an item absent from its suite or any required external/human proof.

## Known blockers and missing evidence

G1C and selected G2/G3 gates are unmet. No authorized test church/OAuth account, verified real API/event/entitlement lifecycle, device-tested Church Center links, pilot-equivalent environment, performance/load measurements, monitored restore with object/key/deletion/suppression replay, privacy/security/editorial/accessibility/pilot acceptance or cost approval exists. Deletion-tombstone/reconciliation behavior needs explicit source/test evidence. Full AC01–AC29 reconciliation is incomplete.

Owners: main/backend/frontend agents for missing implementation/test/operational artifacts; church/account/rights/privacy/accessibility reviewers for external decisions and sign-offs. See [development prerequisites](../../../docs/development.md#prerequisites-and-blockers) and [source-to-acceptance mapping](../../../docs/source-evidence.md). No capability is excluded from approved scope and no required gate is waived.

## Completion decision

**Not complete.** All required test/review checkboxes remain open until concrete command results, test IDs, UTC execution times, tested source/lockfile/migration fingerprint and actual reviewer/provider artifacts are recorded. Deployment/live messaging remain unauthorized. Independent research, provider preparation and test design may continue; unmet prerequisite gates still prevent dependent phase advancement.
