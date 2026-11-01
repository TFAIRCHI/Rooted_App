# Rooted Build Request 1.2.2 — Phase Tracker

**Status:** Complete; validation recorded on 2026-10-20.

| Gate | Status | Evidence |
|---|---|---|
| G1 Backend collision protection | Complete | `backend/src/api/core-routes.ts` rejects duplicate series dates |
| G2 Study-level date selector | Complete | `frontend/components/slot-settings.tsx` |
| G3 Calendar drag/drop | Complete | `frontend/components/studies-with-calendar-move.tsx` |
| G4 Approval and schedule safety | Complete | Existing slot update path renews the plan revision and cancels pending schedules |
| G5 Testing gate | Complete | Typecheck, lint, focused unit tests, and production build passed |
