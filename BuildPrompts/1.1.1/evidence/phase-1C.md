# Phase 1C — Independent approvals and member reading evidence

Build: **1.1.1**. Status: **Blocked — partial source inspected; prerequisite and required evidence unmet**. Completion timestamp/fingerprint: **not set**. Existing approval covers phases 0–4; no new permission is required for authorized independent work. Dependent implementation/acceptance must respect the [master sequence](../MASTER_BUILD_PROMPT.md#6-phase-execution-table).

## Observed implementation

[Editorial API](../../../backend/src/api/core-routes.ts), [revision module](../../../backend/src/modules/editorial.ts), [publication worker](../../../backend/src/workers/publication.ts), [content editor](../../../frontend/components/content-editor.tsx), [member SSR](../../../frontend/lib/member-server.ts). Source contains separate review/approval records, explicit manual content creation, due-now/future publication, cancellation/withdrawal, live snapshot pinning and public/member reading.

These observations identify source, not executed behavior or a passed phase. Inspection after build resumption does not establish when dependent work was authored or that its prerequisite gate passed.

## Test definitions and supplied results

[Editorial integration definitions](../../../backend/tests/integration/editorial.test.ts) include idempotency/preconditions, separate permissions/approvals, live-pin persistence and revoked membership/session scenarios. [Browser definitions](../../../frontend/e2e/core.spec.ts) contain an editorial-to-member journey. These full suites are pending, not verified passes.

This documentation assignment has not run application tests, modified generated reports, or obtained manual/provider review. Latest main-supplied summary: component type checks pass; frontend 7 unit tests and backend 24 unit tests pass; root lint reported 15 provider errors under repair; full browser and integration execution pending. Exact commands/count reports/fingerprints must be linked when received, and a later suite result supersedes this supplied summary only for its tested state.

## Complete required gate — unchecked

Primary acceptance: AC07–AC09, AC11, AC14–AC15, manual AC21, AC22 and core AC27–AC29; regress all prior gates.

- [ ] End-to-end: contributor drafts plan → submits → reviewer requests changes → contributor revises → reviewer approves exact plan → contributor explicitly creates manual content → separate content review/approval → publisher publishes due-now → member reads the approved snapshot.
- [ ] State-machine tests cover every allowed/disallowed transition. Plans never enter Scheduled/Published. Approval requires the correct capability, current revision/hash/dependency and separation policy; direct unauthorized API commands fail.
- [ ] Database constraints/privileges plus trusted command tests enforce immutable revisions, approval binding, canonical payload/hash/reference equivalence and audit attribution. A research SQL constraint alone is insufficient.
- [ ] Edit-versus-review, approval-versus-edit and publication-versus-edit/cancel tests use separate real database transactions with explicit synchronization; verify ordering, stale preconditions and rollback. Editing approval-sensitive calendar fields also invalidates dependent readiness.
- [ ] Approved plan alone never publishes full content. Editing approved content or SMS preview creates Draft and cancels pending work; prior live publication remains pinned. Superseded plan cannot authorize a new publication.
- [ ] Due-now publication uses a pinned approved occurrence and atomic publication/live pointer/outbox. Duplicate commands/events and crash-boundary tests have one logical database effect. Withdrawal hides the page and records why.
- [ ] Public/member-only pages authorize on the server, work with server-rendered approved HTML and leak no drafts in page data, metadata, API, search or cache. Test direct links as guest, member, outsider and revoked member.
- [ ] Member reading at 320/390px, tablet and desktop, zoom/reflow, keyboard and screen-reader review passes the required scope; complete-process review finds no unresolved required accessibility defect. Store actual screenshots/review notes.
- [ ] Export/deletion and retention foundations are implemented; restore a local/database-plus-required-object backup into isolation, verify integrity/tenant boundaries and reapply deletion/suppression evidence before reopening workers. Report actual recovery duration; do not infer managed-cloud RPO from a local exercise.
- [ ] A designated human reviewer accepts the editorial workflow and explains the distinction between plan/content approval. Real church content still needs that church's pastoral approval before real publication; test accounts are not pastoral sign-off.

All common mandatory gate rules and prior required regressions also apply. A future automated runner pass does not replace an item absent from its suite or any required external/human proof.

## Known blockers and missing evidence

G1B prerequisite is unmet. No designated human editorial or member accessibility sign-off exists. No tenant/member export/deletion/retention API or deletion-ledger replay was found in inspected routes; local database backup tests alone do not close the required database-plus-object isolated restore. Content conflict UI currently shows local/latest values without a visible common-base pane; the required accessible three-way recovery is not established. Actual concurrent approval/edit/publication race, public/private leakage and complete recovery evidence remain required.

Owners: main/backend/frontend agents for missing implementation/test/operational artifacts; church/account/rights/privacy/accessibility reviewers for external decisions and sign-offs. See [development prerequisites](../../../docs/development.md#prerequisites-and-blockers) and [source-to-acceptance mapping](../../../docs/source-evidence.md). No capability is excluded from approved scope and no required gate is waived.

## Completion decision

**Not complete.** All required test/review checkboxes remain open until concrete command results, test IDs, UTC execution times, tested source/lockfile/migration fingerprint and actual reviewer/provider artifacts are recorded. Deployment/live messaging remain unauthorized. Independent research, provider preparation and test design may continue; unmet prerequisite gates still prevent dependent phase advancement.
