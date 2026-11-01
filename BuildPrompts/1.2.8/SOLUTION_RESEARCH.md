# Solution Research — Delivery Remediation

## Evidence classification

- **Verified:** `research/22-delivery-e2e-test-report.md` records 8/9 browser tests passing, the critical 422 `approver_required` failure, zero local Grace publications/delivery rows, and 19 passing/13 failing integration tests.
- **Verified:** The report identifies a stale plan dependency: content approval references plan revision 56 while the plan head is revision 57.
- **Verified:** Existing code separates approval-request creation from content submission and retains a plan-approval check in publication.
- **Recommendation:** Treat the study revision as the sole approval unit and copy plan data into its immutable snapshot.
- **Recommendation:** Use an atomic submit command that accepts the selected approver and creates/replaces the review request.
- **Unknown:** Whether any deployed non-local tenant depends on the old plan approval relationship. Production migration must inspect data before changing behavior.
- **Blocked:** External notification delivery was not tested because providers were disabled.

## Alternatives considered

### A. Keep separate plan approval and fix the UI

Rejected. It preserves the duplicated approval model and the stale-plan publication failure.

### B. Keep separate assignment and submission, but add a visible prerequisite

Acceptable as a compatibility bridge, but not recommended. It still creates a two-step hidden dependency and is less simple than the requested workflow.

### C. One final study approval with an immutable plan snapshot

Recommended. The contributor submits one study revision to one selected approver. The plan remains useful context and can be edited before submission, but publication validates only the study approval, tenant, revision, and publisher authority.

## Late delivery policy

Recommended behavior:

- Future planned time: approval stores `approved`; automatic worker publishes at the planned instant.
- Planned time already passed: approval creates a `manual_once` publication due immediately and delivers after the approval transaction commits.
- Explicit “Publish now”: immediately creates or reuses the same `manual_once` publication regardless of planned time.
- Repeated command: returns the existing publication and `already_published`; it does not duplicate rows or re-run member-visible side effects.
- Automatic catch-up remains a separate worker policy and must not be reused by explicit publish.

## Data repair strategy

Do not rewrite immutable historical revisions. Introduce a migration/check that:

1. Finds content approvals whose referenced plan approval is absent, stale, revoked, or points to a non-head plan revision.
2. Marks only affected unpublished aggregates as `changes_requested` with a structured reason, or creates a compatibility snapshot if the approved content already contains all needed plan fields.
3. Preserves the original approval and audit history.
4. Gives contributors a visible “Re-save and submit this study” recovery path.
5. Resets development fixtures deterministically to the canonical two-role workflow.

No migration may silently publish stale content.

## Security and operations

The late-delivery override is a policy-controlled publish command, not an authorization bypass. Revalidate tenant membership, approver capability, approval revision, content status, and publication uniqueness on the server. Log the original planned time, actual delivery time, delivery mode, actor, request ID, and publication ID. Redact sermon/member content from operational logs.
