# Rooted 1.2.9 — Traceability and affected surfaces

All entries are proposed work. Findings are grounded in [research](../../research/23-study-management-workflow-and-engagement.md); test IDs are defined in [testing gates](TESTING_GATES.md).

| User request | Source findings / proposed affected paths | Contract / UX | Phase / proof |
|---|---|---|---|
| 1. Manage older studies safely | `backend/src/api/core-routes.ts`; `modules/study-lifecycle.ts`; publication/provider workers; migrations 017–018; frontend study/engagement actions | Ordinary Delete only before publication; ever-published artifact requires Withdraw; admin-only Hard Delete after withdrawal with reason and typed confirmation | 1; D01–D12, J3 |
| 2. Calendar move leaves Dashboard stale | `workspace-pages.tsx:16`; `studies.tsx`; `studies-with-calendar-move.tsx`; `core-routes.ts:128`; `save-revision.ts`; migration 011 | Current slot date; shared week projection; matching content calendar; church-wide active date rule | 1; R01–R09, J2 |
| 3. Sidebar logo too small | `frontend/app/globals.css` `.brand-logo`; `workspace.tsx`; existing theme assets/settings/member shell | Contained wide logo stage, real church name/Rooted text, declarative updates | 2; U07–U08; preview dashboard/workflow |
| 4. Week/date-based creation workflow | `studies.tsx`; `slot-settings.tsx`; unified/plan/content editor and preview; workflow CSS; source/API contracts | Month → ranged week → date → three steps; single save/submit; optional series/plan | 2; U01–U06, J1–J2; preview workflow |
| 5. Comments, warning/examples, automatic decline | `member-actions.tsx`; `community-routes.ts`; moderation inbox; worker/provider config; discussions schema; privacy routes | Policy definition, pending/declined versioned verdict, author privacy, replies and answers | 3; C01–C10, J1; preview member |
| 6. Preparation and engagement Dashboard groups | `workspace-pages.tsx`; API summary; publication worker; `study-engagement.tsx`; member load/open call; views/audience/resolution schema | Exact metric definitions, snapshots, unknown legacy values, drilldowns | 4; A01–A08, J1; preview dashboard |

## Additional weaknesses found during review

| Weakness | Consequence | Required proof |
|---|---|---|
| Move updates plan calendar but not content calendar | Old delivery intent can survive a move/save | R05, J2 |
| Drag handlers use first series/DOM index and ineffective timer cleanup | Wrong study addressed or duplicate handlers | R03 |
| Plan approval contributes to calendar readiness | Unapproved study can look ready | A01, U04 |
| Optional plan save calls broad cancellation | Approved final study can lose approval unexpectedly | R07 |
| Submit wrapper is detached from editor dirty/save state | Last saved revision could be submitted instead of latest writing | U05, J1 |
| Imperative brand insertion doesn't update existing image src/alt | Wrong church's logo after switching | U07 |
| Publication list includes history, detail requires live pointer | Historical engagement link can fail | A07 |
| Timestamp-only engagement cursor | Same-time publications can be skipped | A07 |
| No views/audience/question-resolution records | Requested reach/answer metrics cannot be honestly inferred | A02–A06 |
| Legacy unconditional per-series date index survives a partial new index | Deleted date still cannot be reused in the same container | D07 upgrade fixture |
| AI source/generation/execution still checks separate plan approval | Optional plan flow encounters a hidden prerequisite | U06 |
| Prior browser harness and regression gates incomplete | Release-level E2E remains unproven | Phase 0 baseline, J1–J3/full gate |

These are source-reviewed weaknesses or inherited reports; they are not all newly reproduced runtime defects. Phase 0 must record actual reproduction and current baseline.

## Cross-cutting coverage

- Tenant isolation, CSRF, current capability checks and same-tenant foreign keys: D02/D08, R04/R09, C09, A08.
- Immutable approval, late approval and publication idempotency: R05–R08, U04–U05, J1–J2 and 1.2.8 delivery matrix.
- Unsaved work, accessibility and responsive design: U03/U05/U06/U08.
- Classifier limitations/privacy/manual fallback: C02–C06/C10, A08.
- Migration/backfill/grants/positional inserts: D07/D08, A02/A04/A08.
- No unintended external messages or fabricated provider claims: D03/D06, J1–J3 and final evidence.

## Reconciled research tracks

Parallel lifecycle review and UX review agreed on source defects, one final approval, explicit date grouping, and larger proportional sidebar artwork. UX review proposed Monday–Sunday/full boundary weeks as an alternative; this package chooses Sunday–Saturday/month-clipped dates to match the existing Calendar and the request's month-contained labels. This remains an explicit review assumption. UX review proposed displaying duplicate same-date records; this package requires doing so for legacy repair visibility, then enforces the user's earlier one-study-per-church-day rule for new active records. Neither conflict was silently treated as a verified product preference.
