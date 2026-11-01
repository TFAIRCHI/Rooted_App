# Testing Gates

No phase is complete until every listed gate passes and evidence is recorded in `PHASE_TRACKER.md`. A partial pass is not a pass.

## Required canonical browser journey

1. Sign in as `anna.contributor`.
2. Select the prepared 2026-10-20 study or create an equivalent past-due study.
3. Complete required study fields and retain the plan as attached supporting information.
4. Select `james.contributor` in the visible approval step.
5. Click one submit action and verify `in_review` plus a visible pending-approval state.
6. Sign in as James and approve the exact revision.
7. Verify approval succeeds even though the planned time is past; verify immediate publication or an explicit publish action with no due-window block.
8. Sign in as `riley.member` and verify the study appears at `/c/grace`.
9. Sign in as a contributor and verify Study Engagement lists the same publication.
10. Open engagement detail and verify member-facing snapshot, reactions, discussion state, and delivery evidence.
11. Repeat publish with a new idempotency key and verify one publication only.
12. Edit after approval and verify the new revision cannot publish until reapproved.

## Phase gates

| Gate | Must pass |
|---|---|
| Contract | API/state tests prove one final approval, immutable revision binding, structured errors, and no plan approval blocker. |
| Data | Migration/backfill tests preserve audit history, safely handle stale dependencies, and seed deterministic identities. |
| Delivery | Future schedule, past approval, explicit publish, duplicate publish, worker retry, and provider-disabled web publication all pass. |
| UX | Contributor can select approver and submit once; every failure has an actionable message; no hidden prerequisite remains. |
| Member/engagement | Published snapshot is visible to members and appears with identical publication/revision IDs in Study Engagement. |
| Regression | `npm run typecheck`, `npm run lint`, `npm run build`, frontend unit, backend integration, `npm run test:e2e`, and `npm run test:research` pass. |

## Negative and security scenarios

- Cross-tenant study, revision, approver, publication, and engagement IDs return authorization failure.
- Member cannot see draft, in-review, changes-requested, or unapproved content.
- Ineligible administrator/member/legacy local contributor cannot be selected as approver.
- Concurrent submit/approve/publish requests produce one valid state transition and one publication.
- Revoked approver or changed revision invalidates the pending request without publishing.
- Worker/provider failure leaves a retryable publication record and does not create duplicate engagement.
