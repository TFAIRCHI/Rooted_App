# Rooted 1.2.9 execution evidence

User approved execution with the [withdrawal/Hard Delete amendment](../APPROVED_AMENDMENT.md). Work began from the current local source; the workspace has no Git metadata. Existing prepared studies and historical evidence are preserved. All destructive test operations target disposable fixtures.

## Baseline and ownership

Source inspection confirms Dashboard lists all slot dates, sidebar mark is 28×28 px, calendar moves retain stale content calendars, and current discussion has manual review only. Two implementation tracks handle backend lifecycle/date integrity and frontend branding/workflow; the main track handles community/analytics, plan reconciliation and end-to-end verification. A third parallel worker was unavailable due to the agent thread limit.

Baseline unit and integration commands started before implementation; results will be appended when complete. Prior version 1.2.8 browser/regression blockers are historical evidence and will be rechecked, not presumed current.

## Implementation and final verification

Executed 2026-10-22. Test databases were disposable and uniquely named; the only persistent database operation was the additive migration on the owned local `gather` development database after a verified custom-format backup. No study was withdrawn or hard-deleted in that database.

| Gate | Result | Scope / record |
|---|---|---|
| `npm run test:unit` | Passed: frontend 12 files / 38 tests; backend 30 tests; operations 4 tests | 72 tests total, including 64 deterministic policy examples |
| `npm run test:integration` | Passed: 50 tests, 0 failures | PostgreSQL integration, tenant/RLS boundaries, lifecycle races, provider loopback contracts, member engagement and privacy erasure |
| `npm run test:e2e` | Passed: 11 tests, 0 failures | Includes account/theme, calendar, autosave, publication/member snapshot, engagement, and date-move journeys |
| Focused updated J1 browser rerun | Passed: 1 test | Verified Rooted branding on public church/member study pages, no visible `Gather`, contributor approver options exclude `Local contributor` and admin personas, and question reply after filter refresh |
| Focused onboarding browser rerun | Passed: 1 test | Verified authenticated onboarding displays Rooted, has no visible legacy brand, and no longer describes separate plan/content approvals |
| `npm run typecheck` | Passed | Contracts and frontend/backend TypeScript |
| `npm run lint` | Passed | Frontend, backend, and tooling |
| `npm run build` | Passed | Optimized Next.js build and backend TypeScript build |
| `npm run test:research` | Passed | 36 Markdown files, 58 source definitions, 128 references, 14 PNGs, 8 diagrams, 18 UI checks; 0 errors |
| `node BuildPrompts/1.2.9/validate-package.mjs` | Passed | 9 Markdown files, 71 links; 0 errors |
| Local database backup and migration | Passed | Backup: `.local/postgres/backups/gather-1792669775696-bfd597ac-6861-47fb-be52-dab22adc9df8.dump`; migrations applied after duplicate-date preflight returned no rows |
| Local stack smoke check | Passed | Frontend `http://127.0.0.1:3000` returned 200 with Rooted branding; API liveness/readiness returned `ok`; tenant isolation reported `enforced` |

Browser screenshots are real Playwright captures under `frontend/test-results/`: `129-approved-and-published-desktop.png`, `129-member-question-reply-decline-mobile.png`, `129-dashboard-desktop.png`, and `129-hard-delete-warning.png`. The end-to-end Hard Delete used only the unique disposable test database and typed confirmation.

### Changes made after failures

- First J1 run exposed a `RangeError` in Study Engagement because PostgreSQL's `date` value was serialized as an ISO timestamp and passed to a date-only formatter. The engagement API now returns `YYYY-MM-DD`; `longDate` also safely normalizes ISO timestamps. The full J1/J2 E2E flow then passed.
- The inherited browser test still selected the old `pastor` persona, which no longer has workspace access in the two-role design. Updated it to use a distinct eligible contributor approver (`james.contributor`); the targeted approval/publication browser test passed.
- The J1 member-answer browser test could race the comments list refresh after changing its filter. It now waits for the unanswered-comments response before acting; the focused run passed.
- Test publications use the controlled browser clock. Several can share the same `published_at`, so the Dashboard's specified publication-ID tie-breaker may select a different record than the one created last. The API metric assertion now requests the exact publication ID under test; the user-facing Dashboard continues to show the stable latest-publication projection.
- The approver API now omits the legacy `contributor` / `Local contributor` fixture. The focused browser test verifies the list contains James Ellis and excludes the local fixture and admin account.
- A privacy erasure could leave a member question marked answered after its only contributor reply was erased. Erasure now locks the publication/question/reply in the documented order, removes the answer body, reopens the question with an audited resolution, and the integration test verifies the unanswered count updates.
- Removed the remaining visible legacy `Gather` branding from the public church, public study, and onboarding screens. Public member pages now render `Rooted`; a browser assertion rejects exact visible `Gather` text. Internal npm workspace identifiers and the localStorage migration key remain compatibility details, not user-facing product branding.
- Replaced outdated onboarding guidance that described separate plan/content approvals, and verified the revised onboarding screen in Playwright.
- Migrated device-local study drafts from the legacy `gather:draft:` key to `rooted:draft:` without discarding valid saved text; added a unit test for the compatibility path.

### Phase status and remaining evidence

- **Phase 0 — Complete:** source baseline, approval amendment, fixture isolation, research and contracts are recorded.
- **Phase 1 — In progress:** the lifecycle/date implementation and automated paths pass, including published Delete denial, withdrawal retention, admin-only Hard Delete, move conflict, approval invalidation, and runtime-role boundaries. The full D01–D12/R01–R09 scenario matrix still needs one-to-one trace evidence before formal phase closure.
- **Phase 2 — In progress:** month/week grouping, three-step creation, large logo treatment, responsive member pages, and date moves pass browser checks. Full 320/768/1440 viewport coverage and human keyboard review remain open.
- **Phase 3 — In progress:** deterministic local policy rules automatically decline tested clear attacks and keep uncertain/respectful cases private for church review. The 64-case corpus is not an independently labeled two-reviewer holdout; do not claim general NLP accuracy or close the C10 calibration gate.
- **Phase 4 — In progress:** publication audience, unique opens, reactions, question answers, Dashboard, privacy export/erasure, withdrawal, and purge are integration-tested. Full large-history pagination, scale, and retained-identifier expiry matrix remains open.
- **Phase 5 — In progress:** all 11 browser regressions pass, including J1–J3 journeys. Release closure depends on the outstanding Phase 1–4 evidence above.

External SMS/email/push providers remain disabled in the local development stack. Existing provider and worker tests use loopback HTTP and prove application contracts; they do not prove delivery through a real church sender account. Human visual/keyboard review, independent policy holdout review, live-provider delivery, and a full accessibility claim remain explicitly unverified.

## Preserved first-run failures

The first full E2E run had one failure: the stale pastoral approver identity in `core.spec.ts`; this was corrected and the full suite passed. An earlier J1 run exposed the date serialization error described above. A later focused run exposed the filter-refresh race; it was corrected by synchronizing the test to the actual comments response. A full run later exposed an invalid test assumption about publication insertion order when timestamps tied; the test now selects the exact publication through the documented API contract. The latest full run passed all 11 browser tests. These failures remain documented here rather than removed from the record.
