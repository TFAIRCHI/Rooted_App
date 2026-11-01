# Rooted 1.2.11 — Execution tracker

Prepared October 24, 2026; execution authorized by the user the same date. See [execution evidence](evidence/execution.md), [live JSON](evidence/live-demo.json), and [runbook](DEMO_RUNBOOK.md).

| Phase | Exit evidence | Status |
|---|---|---|
| 0 — Baseline and configuration | Root Azure configuration normalized privately; same-resource inference endpoint; source/compiled loaders and live chat verified | Implemented |
| 1 — Azure transport and scoped backend | Mock transport and real restricted-role PostgreSQL checks pass; durable private history, reviewed text, atomic limits and reservations | Implemented; focused checks pass |
| 2 — Co-writer and adoption | Fixture browser test passes for source confirmation, proposal/adoption, mobile, unsaved edits, and unchanged preview | Implemented; fixture-backed UI verified |
| 3 — Regression and live demo | Unit/integration/type/lint/build pass; 7/11 broad browser checks pass with four unrelated/obsolete-flow failures; real chat and follow-up pass | Open: live draft/adoption recheck needs an additional authorized request; broader browser failures recorded |

Append dated commands, results, evidence paths, live request usage, and unresolved limitations as execution proceeds. Do not put secrets or raw private sermon content here. Completion requires all applicable [testing gates](TESTING_GATES.md), including live Azure verification.
