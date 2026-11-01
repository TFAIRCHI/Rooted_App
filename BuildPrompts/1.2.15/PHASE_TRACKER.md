# Rooted 1.2.15 — Execution and release tracker

Updated October 30, 2026. **Current state: implemented, checked locally, and packaged; ready for Tyler’s release review. Registry upload, Portal rollout, and production smoke acceptance remain pending.** See [execution evidence](evidence/execution.md). This is independent of the 35 already completed production acceptance checks.

## Completed preparation

- [x] Tyler approved the focused-page mockup and requested a build prompt/path to production.
- [x] Independent UX review completed; all five corrections implemented and rechecked in the research prototype.
- [x] Versioned build prompt, route/content contract, six focused gates, and manual production rollout/rollback path prepared.
- [x] Current source/deployment references inspected; real authentication, indexing allowlist, legacy fragments, CSS scope, and historical test-evidence handling included in the handoff.

## Execution phases

- [x] **1 — Implement locally:** shared public shell, six marketing routes, real entry/sample integration, legacy links, public metadata/discovery. Changed files and source snapshot recorded. Production-image preview: http://127.0.0.1:3081/.
- [x] **2 — Verify the application:** local gates 1–4; frontend lint/typecheck, 52 unit tests, all nine latest browser-journey results, 54 layouts, main-page/entry accessibility scans, keyboard/history, no-script, and real local account regression passed. Screenshots and limits recorded in evidence.
- [x] **3 — Prepare release:** gate 5; production frontend build and 72 candidate-container checks passed. Exact tag, image ID, build-input fingerprint, and last recorded rollback image documented. The current Portal rollback target must still be confirmed by Tyler at rollout.
- [ ] **4 — Review, upload, and deploy:** Tyler reviews the actual candidate, performs Docker push, records the remote manifest digest, and creates the Portal frontend revision with intended traffic. [Exact handoff](../../deploy/azure/homepage-navigation-release-20261030.md).
- [ ] **5 — Accept or restore:** gate 6 short real-domain smoke pass, acceptance or rollback result, and final release entry. No unrelated acceptance checks are reopened.

## Evidence to fill during execution

| Field | Status |
|---|---|
| Implementation preview | http://127.0.0.1:3081/ — local standalone production image |
| Execution report / screenshots | [Execution](evidence/execution.md), [screenshots](evidence/production-screenshots/) |
| Source identification | 121-input filesystem snapshot SHA-256 `9d7fb2ea255238a1d286439a468899f8a7660d1fb79b6a66c54f48a5e7d7bd70`; source still matches |
| Local gates | 1–5 complete with the documented scope/limits |
| Candidate image tag / ID | `navigation-20261030-1` / `sha256:cada40492dd89414805358efc375b78ae0132142791b93e64a56183bb6de10f4` |
| Registry manifest digest | Not pushed |
| Previous accepted frontend | Last recorded `pilot-20261028-4`; Tyler confirms the actual active revision before release |
| New Portal revision / traffic | Not deployed |
| Production smoke pass | Not run |
| Final disposition / time | Local implementation complete October 30; production release pending Tyler’s review/upload/Portal steps |

Keep historical evidence untouched. If a completed phase needs revision, append the reason/new results rather than silently replacing prior records.
