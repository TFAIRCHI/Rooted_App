# Approved amendment — published history, withdrawal, and Hard Delete

Approved by the user for execution on 2026-10-21. This amendment takes precedence over the original 1.2.9 proposal wherever deletion behavior conflicts. The six requested improvements and remaining phases are approved for implementation.

## Lifecycle rules

1. **Never published:** ordinary **Delete study** removes the root from active work and cancels undispatched work using an audited tombstone. Existing immutable teaching history remains protected.
2. **Ever published/shared:** ordinary deletion is forbidden, including for an administrator. The publication is a unique historical artifact. Show **Withdraw from members** instead. Check publication history, not merely current status/live pointer, so a replacement draft or previously withdrawn study cannot circumvent this rule.
3. **Withdrawn:** stop member/public access and future undispatched notifications. Retain the exact historical publication, revisions, approvals, reactions, discussion and delivery evidence in contributor Study Engagement, labeled Withdrawn. Do not silently erase it, edit its published date, or republish through an old job.
4. **Hard Delete:** a separate administrator-only permanent action on a previously withdrawn artifact. Show an irreversible warning, require explicit typed confirmation naming the study and a reason, and revalidate current lifecycle version/capability server-side. The user must perform this deliberate action; testing uses disposable fixtures only. An ordinary Delete request never falls through to Hard Delete.
5. Hard Delete removes the stored teaching artifact and its dependent live data from application storage. Preserve a minimal independent audit receipt (IDs, actor, time, reason, no retained teaching/comment bodies), plus any irreducible already-dispatched provider receipt under documented reconciliation/retention policy. Do not promise to recall messages, third-party copies, browser downloads or backup copies. Backup restore procedures must reapply purge receipts.
6. Use a narrowly scoped privileged purge operation for immutable dependency cleanup; never globally disable integrity triggers or grant broad immutable UPDATE/DELETE to the runtime role. Recheck tenant, admin, withdrawn root and exact version. Conflicting publication/provider claims serialize; unknown/active provider submissions are resolved or return a clear conflict before permanent deletion.

## Mandatory added acceptance tests

- `D09`: every ever-published state rejects ordinary Delete, even if content is now draft, withdrawn, or has no live pointer.
- `D10`: withdrawal hides member/public URLs but retains the exact historical artifact, engagement and title/date in authorized history; retries cannot republish it.
- `D11`: Hard Delete is absent/forbidden for members and contributors without admin authority; missing/wrong typed confirmation, reason, version, or nonwithdrawn state is rejected.
- `D12`: explicit admin Hard Delete of an isolated withdrawn fixture removes artifact/dependents, records only a minimal purge audit, is retry-safe, respects tenant isolation, and cannot bypass immutability for any other study.

Current execution status and actual results are recorded in [phase tracker](PHASE_TRACKER.md) and [execution evidence](evidence/execution.md). No irreversible operation is authorized against a real church study merely to demonstrate a passing test.
