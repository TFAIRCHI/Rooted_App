# 1.2.8 Implementation Evidence

**Execution date:** 2026-10-21

## Implemented

- Added migration `backend/migrations/016_single_study_approval.sql` to remove the live plan-approval trigger dependency while preserving historical provenance and immutable approval binding.
- Updated revision saving and publication eligibility so a mutable plan head cannot invalidate an approved study revision.
- Separated `manual_once` delivery from timed catch-up evaluation.
- Made content submission accept `approverId` and `note`, validate the eligible approver, create the review request, notify, and transition to review in one transaction.
- Made explicit publish idempotent for an existing publication and replaced the generic publication failure with an actionable worker failure code.
- Updated local fixture/test identities and approval tests to use contributor-capable approvers.
- Updated contributor approval copy to describe one final study submission.

## Validation

- `npm run typecheck`: passed.
- `npm run lint`: passed after removing an unused publication variable.
- `npm run test:research`: passed.
- Editorial integration: 10 passed, 2 remaining legacy/privacy expectation failures.
- Critical Playwright delivery test: blocked by the isolated browser harness losing its Next process during the run; no reliable browser pass is claimed.

## Live local verification after API restart

- Restarted the local API, worker, identity service, and frontend so the 1.2.8 source was loaded.
- Retried approved Grace study `b1bb3772-0801-4a85-9b12-9a0d9ef6a20b` with `anna.contributor`.
- `publish-once` returned `201` with status `published`.
- Publication ID: `c5a2b94f-2ad6-4731-b2f6-2fef7d76e805`.
- `riley.member` received the exact published snapshot through the authenticated study API.
- `anna.contributor` saw the same publication in Study Engagement.
- External providers remained disabled; only web publication was verified.

## Remaining work

- Finish the browser harness failure and run the complete member-to-Study-Engagement journey.
- Add direct Study Engagement assertions to the canonical delivery test.
- Decide whether the remaining privacy/public-study expectation is an intended public-reading policy or an authorization defect.
- Repair/reconcile the remaining legacy integration expectations before marking the final release gate complete.
