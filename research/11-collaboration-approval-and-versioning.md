# Collaboration, approval and versioning

## What and why

Maintain stable plan/content identities with append-only payload revisions and separately versioned workflow metadata. Reviewers approve exact bytes and dependencies, not a moving document title. Each command uses the owning aggregate's ETag. Presence indicators and editor cursors may be ephemeral; approval evidence, decisions and published pins are durable.

## State machines

| Object | Allowed forward actions |
| --- | --- |
| Plan Draft | Submit → In Review; cancel → Cancelled |
| Plan In Review | Approve → Approved; request changes → Changes Requested; cancel → Cancelled |
| Plan Changes Requested | Edit → new Draft revision; cancel → Cancelled |
| Plan Approved | Edit → new Draft revision; cancel → Cancelled |
| Content Draft / In Review / Changes Requested | Same review actions as plan |
| Content Approved | Schedule → Scheduled; immediate publish uses a due-now schedule; edit → new Draft; cancel → Cancelled |
| Content Scheduled | Publish → Published; unschedule → Approved; edit → new Draft and cancel pending schedule; cancel → Cancelled |
| Content Published | Edit → new Draft while prior publication stays pinned; replacement publishes only after approval |
| Either Cancelled | Terminal revision workflow; a new authorized revision can restart in Draft |

Editing any noncancelled head, including In Review, creates a Draft revision; old pending review requests close as superseded. The old decision remains evidence. There are **no Scheduled or Published plan states**. A plan's calendar date is a planning attribute. Content workflow tracks its head; live publication is separate, so a Draft head can coexist with an older live publication. Cancelling a draft or schedule does not withdraw live material. An explicit withdrawal command with publisher permission removes the live pointer and audits why.

## Approval binding and recommendation

Plan approval binds `(church, plan, revision, hash, approver, policy version, decision time)`. Content approval adds the exact plan approval ID and plan revision hash. Server recomputes hashes from stored canonical bytes, verifies current head and approver membership/capability, and records a decision atomically. A client hash is a precondition, not trusted evidence. Revocations are append-only records, never edits to the approval. Revoking plan approval invalidates dependent future schedules; historical publications remain available unless explicitly withdrawn.

Assign doctrinal approval explicitly to a qualified church reviewer. Church administration does not imply that qualification. Recommend distinct author and approver for production publication; a small church may explicitly enable self-approval with a recorded policy exception and visible audit marker. No AI or platform support role can approve doctrine.

Use cancel-on-edit throughout. Plan edits cancel unclaimed dependent schedules and require content to adopt the new approved plan before new scheduling. Content edits cancel its unclaimed schedules. Historical approvals cannot schedule an older head through the pilot API. If older pinned scheduling is later required, require a separate explicit confirmation, show both revision hashes and dependency differences, and record the confirmation actor. Do not silently preserve an old pending schedule after editing.

## Concurrency and recovery

Review discussion is tenant-scoped and anchored to an exact revision plus an optional stable field path. Mentions resolve only active members of that church; notifications carry an authenticated deep link and no private text by default. Resolving a comment is a discussion action, never an approval. Changes Requested records actor, reason and target revision; edits do not silently reattach that decision to a replacement. Assignment, mention and review-request events use the outbox so retries cannot create duplicate in-app notifications. The SQL models revision decisions; detailed comment/mention tables remain an implementation dependency.

Editors A and B load version 7. A saves revision 8 with `If-Match: "7"`. B's save with version 7 returns 412, preserving B's local buffer. Offer a three-way comparison of base 7, server 8 and B's proposed body. Auto-merge only nonoverlapping structural fields into an unsaved candidate; overlapping text, scripture changes and approved-plan references require human resolution. Save the resolved result against the newest ETag as revision 9 in Draft. Never transfer revision 7's approval to revision 9.

Use a consistent lock order plan → content → schedule. For a plan edit affecting many content items, lock content IDs in sorted order. Approval/edit and schedule/edit races serialize: edit first makes approval's ETag stale; approval first still permits a subsequent edit but creates a new unapproved head. A scheduler that commits first has published the old approved revision; editing afterward keeps that published pin until replacement. A worker must recheck authorization before a still-pending external dispatch. Already authorized external calls can complete, and the UI must show this limitation.

Offline recovery stores only necessary drafts in a user-scoped local store with a proposed 24-hour expiration and sign-out clearing. After reconnect, refetch membership and head before showing a merge; never replay an offline approve or publish automatically. On timeout, retry the original idempotency key to discover whether save committed. A cancelled browser request is not evidence that the server rolled back.

## Alternatives, dependencies, risks and questions

Alternatives: pessimistic document locks reduce conflicts but strand work when clients disconnect; CRDT editing improves simultaneous typing but does not solve approval snapshots. Recommend optimistic concurrency and explicit diff/merge first. Add collaborative editing later while preserving immutable submission snapshots.

Dependencies: deterministic canonicalization, reliable ETags, role policy, audit storage and accessible diff UI. Require keyboard review, focus restoration after conflict, screen-reader status announcements, and no color-only change indicators, guided by WCAG 2.2. [S21](sources.md#s21)

Risks: reviewer rubber-stamping, accidental self-approval, local draft exposure, stale timezone previews and merge mistakes. Show exact approved revision and approved plan in schedule confirmation. Keep notification messages free of private body text unless explicitly opted in.

Open questions: mandatory reviewer count, reviewer delegation during absences, exception authority for self-approval, content emergency correction SLA and whether cancellation needs a second approver. Until resolved, one explicitly assigned doctrinal approver and separately assigned publisher are the baseline.

Diagrams: [plan states](diagrams/plan-approval-state-machine.mmd), [content states](diagrams/content-approval-state-machine.mmd), [lifecycle](diagrams/study-lifecycle.mmd), [publishing races](diagrams/publishing-sequence.mmd).
