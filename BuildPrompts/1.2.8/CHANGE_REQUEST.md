# Change Request

## Problem statement

The delivery E2E gate is failed. The normal create → approve → publish → member-read → engagement journey cannot complete because content submission requires a hidden `study_review_requests` row. The 10/20 fixture also has content approved against an older plan revision, so the publication worker blocks delivery with a generic error.

## Required outcome

Rooted must expose one understandable workflow:

```text
Create Study → Choose Approver and Submit → Gain Approval → Publish/Deliver → Member Reads → Study Engagement
```

The plan is supporting information attached to the study, not a second approval gate. Approval is bound to one immutable study revision. A planned date/time controls automatic scheduling only; it must never prevent approval. If approval occurs after the planned time, the study is delivered immediately according to the approved late-delivery policy.

## In scope

- Consolidate plan and study approval into one final content approval.
- Make approver selection and submission one visible, recoverable action.
- Remove publication-time dependence on a separately approved/current plan revision.
- Preserve an immutable plan snapshot inside each study revision.
- Make explicit publish and approval-after-due-time delivery immediate and idempotent.
- Repair or safely quarantine stale local/production data without rewriting history.
- Add actionable publication-block reasons and recovery UI.
- Repair integration fixtures and add the canonical delivery fixture.
- Prove member visibility and Study Engagement from the same publication.

## Out of scope

- External SMS/email/push provider certification; providers remain disabled in local tests.
- Planning Center integration changes.
- New AI generation capabilities.
- Broad visual redesign unrelated to the delivery journey.

## Non-negotiable rules

1. No unapproved content becomes visible to members.
2. Approval is always for an immutable revision and records approver, timestamp, tenant, and revision identity.
3. A late planned time is not an approval blocker.
4. Repeated publish requests cannot create duplicate publications.
5. Every publication is tenant-scoped and points to the exact approved snapshot.
6. Contributors must never be told to repair an internal dependency they cannot see; the UI must provide a next action.
