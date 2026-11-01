# Rooted 1.2.9 — Phase tracker

**Status:** Implementation executed and deployed to the local development stack. Core automated checks pass; the full human/provider acceptance gates listed below remain open where evidence is outstanding. Do not report the version as fully released until every row is complete.

| Phase | Scope | Required complete gate | Status | Evidence |
|---|---|---|---|---|
| Preparation | Source review, official evidence, reconciled specialist findings, UX/contracts/prompt | Complete linked review package with honest validation | Complete | [Research](../../research/23-study-management-workflow-and-engagement.md), [validation](VALIDATION.md) |
| 0 | Execution baseline and contract lock | Six findings mapped to current source, inherited gates inventoried, fixtures/contracts locked | Complete | [Execution](evidence/execution.md) |
| 1 | Lifecycle/delete/withdraw/purge/date correctness | D01–D12 and R01–R09 all pass | In progress — automated lifecycle/date tests pass; full scenario evidence is not mapped one-to-one | [Execution](evidence/execution.md) |
| 2 | Month/week workflow and branding | U01–U08 all pass, real responsive/keyboard evidence | In progress — end-to-end flows pass; full breakpoint and human keyboard review remain | [Execution](evidence/execution.md) |
| 3 | Member comments, automated decline and answers | C01–C10 all pass, classifier calibration/review recorded | In progress — deterministic rules and 64-case corpus pass; independent holdout review is outstanding | [Execution](evidence/execution.md) |
| 4 | Audience/opens/Dashboard/engagement metrics | A01–A08 all pass with exact data and privacy proof | In progress — core deterministic metrics pass; full pagination/scale/retention matrix remains | [Execution](evidence/execution.md) |
| 5 | Browser journeys and full regression | J1–J3 and every required regression gate pass | In progress — 11 browser regressions pass; release inherits outstanding Phase 1–4 evidence above | [Execution](evidence/execution.md) |

Advance one implementation row only when its full gate passes and a real evidence file records commands/results/artifacts. Use In progress or Blocked with exact reason for partial work; never mark a phase complete because code exists. Final release completion requires all implementation rows complete. Preserve prior failures and fixes in append-only execution evidence. Version 1.2.8 retains its own unresolved gate status.
