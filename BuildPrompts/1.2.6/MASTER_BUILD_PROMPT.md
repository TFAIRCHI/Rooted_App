# Master Build Prompt — Rooted 1.2.6

Implement an explicit **Deliver once published** recovery action for contributors.

## Required behavior

- Show the action for approved or scheduled content to contributors with `publication:schedule`.
- Reuse only the current `headRevisionId` and `approvalId`.
- Find the matching pending, staff-review, or approval-blocked schedule in the same church tenant.
- Convert that schedule to `manual_once`, set its due time to the current server time, and publish through the existing worker.
- Record an audit event and preserve the immutable publication snapshot.
- Reject stale revisions, missing schedules, missing approval, unauthorized users, and cross-tenant identifiers.

## Testing gate

The phase is complete only when migrations, typecheck, lint, unit tests, build, and a targeted runtime test prove that the action publishes only the exact approved snapshot and does not silently publish without an explicit contributor action.
