# Rooted Build Request 1.2.8 — Phase Tracker

**Status:** Prompt prepared; implementation not started.

| Phase | Scope | Exit gate | Status |
|---|---|---|---|
| 0 | Reproduce baseline and lock the API/state contract | Current failure reproduced and all impacted paths inventoried | Complete |
| 1 | Single approval domain and stale-data repair | No publication-time plan approval dependency; immutable history preserved | Implemented; targeted gate passed |
| 2 | Atomic approver selection and one-submit UX | Contributor submits once; eligible approver and revision checks pass | Implemented; targeted API gate passed |
| 3 | Late, explicit, scheduled, and idempotent delivery | Past-due approval and explicit publish deliver without duplicate publications | Implemented; editorial delivery tests passed |
| 4 | Member visibility and Study Engagement | One E2E journey proves shared publication/revision snapshot | Blocked by browser harness failure |
| 5 | Regression, observability, and release evidence | All testing gates pass and report is updated | Blocked by remaining regression failures |

Phase status may be changed only with recorded evidence. A phase is not complete because code exists; its entire exit gate must pass. See [implementation evidence](evidence/implementation-2026-10-21.md).
