# Master Build Prompt — Rooted 1.2.8

Execute this prompt only after explicit approval. Read `research/22-delivery-e2e-test-report.md` and every linked 1.2.8 document before changing code. Do not expand scope into unrelated branding, AI, or integration work.

## Product objective

Repair the complete Rooted delivery journey so a contributor creates one study, chooses one eligible approver, submits once, receives one approval, and delivers one immutable study to members and Study Engagement. The planned date/time schedules automatic delivery; it is never an approval blocker.

## Phase 0 — Baseline and contract lock

- Reproduce the reported E2E failure and capture current API/UI behavior.
- Inventory all plan-approval checks, review-request prerequisites, publication guards, worker catch-up rules, and engagement queries.
- Write/update contracts from `API_AND_STATE_CONTRACT.md` before implementation.
- Add an evidence entry showing the current failing baseline.

**Gate:** baseline reproduced; impacted routes, workers, migrations, fixtures, and tests are listed; no implementation starts with an undocumented state transition.

## Phase 1 — Single approval domain model

- Make the study content revision the only approval/publication authority.
- Embed an immutable plan snapshot in the study revision or equivalent versioned payload.
- Remove publication-time validation that requires a separately current/approved plan.
- Preserve old approvals and audit history; never mutate immutable revisions.
- Add migration/backfill handling for stale legacy dependencies using `data_repair_required` or a safe compatibility snapshot. Never silently publish.

**Gate:** unit and integration tests prove current plan edits cannot invalidate an already approved study revision; old audit records remain queryable; unapproved content remains inaccessible.

## Phase 2 — One visible submit and approval command

- Replace the hidden “assign request, then submit” dependency with the atomic submit command.
- Keep reassignment available while in draft/in-review/changes-requested, but make it visible and status-confirmed.
- Filter approvers to active contributors with approval capability; do not show members, administrators without capability, or legacy local fixtures.
- Enforce optimistic locking on revision head and idempotency on submit/approve.
- Add clear UI status: `Ready to submit`, `Awaiting James Ellis`, `Changes requested`, `Approved`, or `Published`.

**Gate:** a contributor completes the flow with one submit click after choosing an approver; API tests reject stale revisions, ineligible approvers, replayed requests, and cross-tenant IDs.

## Phase 3 — Late and explicit delivery

- Ensure approval after the planned time creates/reuses an immediate `manual_once` publication.
- Ensure explicit “Publish approved study now” delivers immediately for past and future planned times.
- Keep automatic future scheduling and worker catch-up as separate code paths.
- Add unique publication/idempotency constraints and an outbox or equivalent retry-safe side-effect mechanism.
- Replace generic `publication_blocked` responses with the structured codes and actionable recovery copy in `API_AND_STATE_CONTRACT.md`.

**Gate:** past-due approval publishes, repeated publish creates one publication, worker retry is safe, and no due-window error is returned from an authorized explicit publish.

## Phase 4 — Member and Study Engagement proof

- Use the same publication snapshot for member reading and contributor engagement detail.
- Verify the published study appears at `/c/grace` for `riley.member` and remains hidden before publication.
- Verify Study Engagement lists the publication, revision, delivery mode, delivery status, reactions, discussion moderation state, and member-facing content.
- Add empty, loading, processing, failed, and retryable delivery states.

**Gate:** the required 12-step browser journey passes with real local data and asserts shared publication/revision identity.

## Phase 5 — Full regression and operational readiness

- Repair integration fixtures to use the canonical workflow and current dummy identities.
- Run all unit, integration, browser, research, typecheck, lint, and build gates.
- Add dashboards/log fields for publication ID, revision ID, tenant ID, delivery mode, idempotency key, and failure code.
- Document provider-disabled limitations; do not claim external SMS/email/push success.
- Update research evidence and archive the final phase results.

**Final gate:** every gate in `TESTING_GATES.md` passes, no critical/high delivery issue remains open, and the exact member-to-engagement journey is reproducible from a clean local database.

## Implementation constraints

- Work only in the existing `frontend/` and `backend/` components plus migrations, tests, and documentation.
- Preserve tenant isolation and server-side authorization.
- Do not use a client-selected role or client-provided church ID as authority.
- Do not weaken approval checks to make a test pass.
- Do not add production bypasses, test-only behavior to production paths, or silent data mutation.
- Update tests with the contract, not by deleting failing coverage.
