# Execution evidence — October 24, 2026

The user authorized implementation of 1.2.12 after preparation of the build package. The scoped guided workflow is implemented locally and both single-day and three-day Azure acceptance journeys passed. Earlier 1.2.11 failed draft/adoption evidence is unchanged.

## Delivered behavior

The floating, expandable assistant now supports planning before a study day exists. It collects reviewed source text, interprets the request into exact church-local dates, saves editable direction, and requires a separate generation confirmation. Durable worker jobs use the existing Azure Responses endpoint and `gpt-5.6-luna` deployment. Complete day output includes all seven normal editor fields and exact source/reference evidence.

Migration 021 adds private workflow/source/plan/job/command tables with forced tenant/actor row policies. Immutable source and plan snapshots, hashes, version checks, exact-date locks, capability rechecks, leases, whole-batch reservations and idempotent commands protect execution. No database transaction is held across inference. Successful output is staged; ordinary slots/plans/content/revisions are created in one transaction only after the entire set validates. No final approval, publication or outbound notification is triggered.

Cancellation, expiration, privacy erasure, ambiguous submission settlement, failed-day retry and conflict recovery preserve accounting. Sources and plans cannot be rewritten directly by the restricted runtime role. Existing single-day editing, Live Preview and editorial stages remain available. No Azure resources or paid external tools were provisioned.

## Live acceptance

| Journey | Calls | Actual input + output tokens | Saved dates | Result |
|---|---:|---:|---|---|
| Complete single day | 2 | 3,125 | 2026-11-16 | Passed |
| Three-day workflow | 4 | 7,401 | 2026-10-26, 2026-10-28, 2026-10-30 | Passed |
| Total | 6 | 10,526 | Four synthetic drafts | Within 10-call / 150,000-token authorization |

All six provider responses completed with HTTP 200. No automatic paid retries occurred. The [verification ledger](live-verification.json) stores sanitized response IDs, model, status and usage. [Live demo evidence](live-demo.json) records workflow and aggregate/revision mapping, persisted field checks, mobile viewport checks and foreign-church denial. Tests verified no date creation before confirmation, refresh during generation, complete fields after editor reload, draft status, and no publication. Completed example screenshots were refreshed without another model request.

- [Three-day direction](three-day-direction.png), [saved drafts](three-day-saved.png), [mobile](three-day-mobile.png).
- [Single-day direction](single-day-direction.png), [saved draft](single-day-saved.png), [mobile](single-day-mobile.png).
- Saved editors: [October 26](editor-2026-10-26.png), [October 28](editor-2026-10-28.png), [October 30](editor-2026-10-30.png), [November 16](editor-2026-11-16.png).

## Automated verification

- Contract check and frontend/backend TypeScript checks passed.
- Frontend unit tests: 42 passed. Backend unit/adapter tests: 35 passed. Operations tests: 4 passed.
- Full backend integration suite: 53 passed. The subsequently expanded focused workflow integration case also passed, including middle-day failure/retry, staged-day reuse, forced second-day insert rollback, duplicate confirmation, foreign actor/church denial, private source immutability, cancel during inference, expiration, subject export/erase, revoked membership during inference, and expired-lease unknown submission without resubmission.
- Focused real frontend/backend/worker browser journeys for the existing co-writer and new three-day workflow: 2 passed using a mocked provider. Both use real database persistence; they are separate from live Azure evidence.
- The broader 13-test browser run passed 10 and failed 3. The editor recovery failure came from an obsolete text selector and passed after its test was updated for the current conflict UI. Two remaining unrelated member-page checks fail: existing color contrast and an expected community guidance sentence that is no longer rendered. These failures were not hidden or used to redesign the member page in this change.
- Production frontend/backend builds passed. Final lint, document and package link checks are recorded in the accompanying validation artifacts.

Final handoff checks: `npm run lint` passed; research document validation passed (45 Markdown files, no errors); the version package passed 36 local-link checks and a private credential scan across 168 text files with zero matches. The application was restarted without the transient verification flag, frontend returned HTTP 200, and `/health/ready` confirmed the current database schema and tenant isolation.

Not every proposed scenario in the original testing matrix has a separate browser test. Failure, privacy, lease and atomicity cases are primarily database integration tests. The technical live acceptance is verified; this is not a claim of exhaustive adversarial coverage or human content approval.

## Human review and scope limits

No church reviewer has approved the generated teaching content. Use the [behavior evaluation](../../../research/Agentic%20Research/agent-behavior-evaluation.md) for faithfulness, clarity, doctrinal fit and appropriate depth. Automatic sermon transcription, video analysis, browsing and replacement of existing studies remain future work. See the [demo runbook](../DEMO_RUNBOOK.md) for supported inputs and operational limits.
