# Item 7: approval conversation inside the combined editor

Reassessed November 1, 2026; original source/runtime investigation October 31. Simulated contributor/admin research, not human church interviews. No application or production data changes were made. The rebuilt interaction is one dynamic Compose document/artboard with a docked assistant and review rail; the old separate CoWriter/Studio workflow is superseded.

## Why the original runtime proof is retained

November 1's [document/source audit](../roles/contributor-document-audit.json) compared all **215 application/build-file hashes** to the original source baseline: all identical. The original [harness](../evidence/approval-roundtrip.ts) and [results](../evidence/approval-roundtrip.json) also match their archived hashes. Their real local API storage/read/conflict findings therefore remain relevant to unchanged application logic. They are retained verbatim as dated evidence, not relabeled as a new run. No repeat database test was warranted by a research-only change. Source-library/editor changes and repaired review-cycle behavior remain proposals, not proven application capabilities.

## Conclusion

Repository tracing and a narrow local current-API reproduction confirm a retrieval/rendering gap. A contributor's “Note for approver” is stored in `study_review_requests.note` and returned by the review-request API, but the frontend does not render it. An approver's “Review notes / reason for changes” is stored in `reviews.reason`; tested author aggregate/request/comments reads do not return that reason. A contributor can therefore receive “changes requested” without the instruction. The local reproduction confirms this with fictional fixtures; it does not establish the database state of any reported production incident. Frontend rendering remains source-inspected, with no live browser reproduction.

## The three existing streams must not be confused

| Stream | User action | Persistence | Current read/display |
| --- | --- | --- | --- |
| Assignment note | Contributor types “Note for approver” on submission | `study_review_requests.note` | Returned by latest review-request GET, omitted from frontend type/render |
| Decision reason | Approver writes requested changes or optional approval note | `reviews.reason` | No ordinary editorial decision-history GET or rendered reason found |
| Revision comment | Team adds a comment on an exact revision | `comments.body` | Revisions & comments UI fetches and renders it separately |

Posting a revision comment can be a temporary human workaround, but asking the user to type the same change explanation twice is not a fix. Do not backfill a duplicate comment automatically without a stable link to the original decision; that would create two sources of truth.

## Exact source trace

### Contributor submission note

1. `ContentEditor` holds `reviewNote` in component state at [content-editor.tsx:107](../../../frontend/components/content-editor.tsx:107). The textarea at [line 704](../../../frontend/components/content-editor.tsx:704) is labelled “Note for approver (optional)”.
2. `command('/submit')` waits for pending draft saves, then sends `revisionId`, `approverId`, and `note: reviewNote` at [line 342](../../../frontend/components/content-editor.tsx:342). This is a real API payload, not only a visual input.
3. Submission validates the assigned independent reviewer and inserts the note into `study_review_requests` at [core-routes.ts:225](../../../backend/src/api/core-routes.ts:225). A separate explicit assignment endpoint also persists it at [line 203](../../../backend/src/api/core-routes.ts:203).
4. Schema [012_study_review_requests.sql:8](../../../backend/migrations/012_study_review_requests.sql:8) declares a non-null `note` with an empty-string default. The request is tied to revision/hash, requester and approver; tenant row-level security is enabled at [line 20](../../../backend/migrations/012_study_review_requests.sql:20).
5. GET `/content/:id/review-request` uses the ordinary aggregate read permission check and queries the latest request at [core-routes.ts:182](../../../backend/src/api/core-routes.ts:182). Its DTO includes `note: row.note` at [line 188](../../../backend/src/api/core-routes.ts:188).
6. Frontend `ReviewData.request` declares approver ID/name, revision ID and status, but no note, created time, requester or request ID at [content-editor.tsx:57](../../../frontend/components/content-editor.tsx:57). The request is fetched at [line 117](../../../frontend/components/content-editor.tsx:117), and the rendered assignment display at [line 677](../../../frontend/components/content-editor.tsx:677) contains only waiting/status text.
7. `reviewNote` starts empty on mount and is not hydrated from persisted request data. This means a reload clears the input even when a note was saved; that is not evidence the persisted note was deleted.

### Approver request-changes reason

1. Approver text is held as `reason` at [content-editor.tsx:93](../../../frontend/components/content-editor.tsx:93). The textarea and action occur only for workflow step 1 and `content.status === 'in_review'`, at [line 749](../../../frontend/components/content-editor.tsx:749).
2. The request-changes button sends `{ decision: 'request_changes', reason }` at [line 773](../../../frontend/components/content-editor.tsx:773). `command` supplies the saved head revision, expected hash and If-Match version at [line 348](../../../frontend/components/content-editor.tsx:348).
3. POST `/content/:id/decisions` requires `content:approve`, the current submitted revision, a matching hash, a pending request assigned to the acting reviewer, and independence under church policy. See [core-routes.ts:236](../../../backend/src/api/core-routes.ts:236).
4. The server requires non-whitespace reason text for requested changes at [line 246](../../../backend/src/api/core-routes.ts:246), inserts the entire reason into `reviews` at [line 247](../../../backend/src/api/core-routes.ts:247), resolves the request status at [line 248](../../../backend/src/api/core-routes.ts:248), and sets the aggregate to `changes_requested` at [line 249](../../../backend/src/api/core-routes.ts:249).
5. `reviews` stores church, aggregate, exact revision, actor, decision, reason and timestamp at [001_core.sql:86](../../../backend/migrations/001_core.sql:86). Update/delete is rejected by the original immutable trigger at [line 174](../../../backend/migrations/001_core.sql:174); this is durable historical evidence under ordinary editing operations, with explicit lifecycle/privacy operations handled separately.
6. The decision route sends a notification to the revision author at [core-routes.ts:261](../../../backend/src/api/core-routes.ts:261), but notifications contain type/resource ID, not note text. See [editorial.ts:47](../../../backend/src/modules/editorial.ts:47) and [core-routes.ts:46](../../../backend/src/api/core-routes.ts:46). Audit metadata records revision/hash, also not the reason.
7. The response is `aggregateDto`, whose fields omit reviews and reason at [editorial.ts:25](../../../backend/src/modules/editorial.ts:25). The workspace uses the same DTO at [core-routes.ts:86](../../../backend/src/api/core-routes.ts:86). Frontend `Aggregate`/`WorkspaceData` also have no decision/reason field at [types.ts:4](../../../frontend/lib/types.ts:4).
8. Search of `backend/src` found one non-editorial read of `reviews`: a subject data export at [privacy-routes.ts:20](../../../backend/src/api/privacy-routes.ts:20). This exports decisions by that subject; it is not the contributor-facing review conversation. No ordinary study review-history reader was found.
9. After state becomes `changes_requested`, the only decision textarea/panel disappears because it requires `in_review`. Neither retained in-memory `reason` nor the generic state label is a persistent conversation surface.

### Revision comments are separate

`RevisionComments` in [plan-editor.tsx:90](../../../frontend/components/plan-editor.tsx:90) loads revisions and `/comments` at line 94, and renders `comments.body`; the API reads comments at [core-routes.ts:264](../../../backend/src/api/core-routes.ts:264). The decision endpoint does not insert a comment. Existing “Revisions & comments” therefore does not recover missing decision reasons automatically.

## Combined-editor review rail and repair proposal

Keep review alongside the document/artboard being edited. Selecting teaching opens its relevant comments/request in the rail; a persistent unresolved badge opens that rail from reading/design mode or the assistant panel. The docked assistant can propose a selected-content response or edit, but an author must adopt any content change and a distinct authorized reviewer must decide. There is no forced move from a verbal tool to a visual tool or detached review page.

Distinguish the immediate history/read/display repair from repeated-review-cycle semantics. The reproduced no-edit conflict must support an explicit new request/cycle against the **same content revision** when an explanation is the response. Never require a meaningless wording edit to bypass a uniqueness constraint. Actual teaching/layout/media changes create real revisions and invalidate relevant approvals. Prior decision events remain immutable when the reviewer considers identical bytes again.

1. Expose a read-only editorial review-history response protected by the same church/aggregate read authorization as the draft. Include stable event/request/cycle ID, event kind, actor ID/display name, revision ID/number/hash, text, status and created/resolved timestamps. Return stored assignment notes and stored decisions without duplicating their text into a detached chat store. Keep member/public endpoints excluded.
2. Immediately render the latest assignment note for its approver and the latest change reason for its author. Preserve formatting safely as text. Show actor, time and “Requested on revision N”; never attach an older note to a newer draft without a revision label.
3. Present a chronological rail combining assignment, decision and existing comments while retaining event type/ID and review cycle. Anchor selected text with revision/hash, stable block/field identity, range and a quoted snapshot. A new draft must not erase the request. If selection text changes or disappears, show “On prior revision” with its quote; do not silently move the note onto unrelated text. Keep whole-study requests valid without artificial selection anchors.
4. Reuse exact-revision comments for replies, extended with explicit request/cycle linkage where needed. “Reply and resubmit” first settles actual dirty changes, then opens a new request/cycle for the resulting exact revision, including an unchanged revision. Retain the reply on failure. Approval is an explicit independent decision on the exact content and request cycle; a reply or assistant proposal cannot grant it.
5. Clear transient form text only on confirmed success. Retain text on failure and prevent duplicate submissions through the existing idempotent command mechanism. Add visible loading/error/retry states for review history so failure cannot look like “no notes.”

The first visibility repair can read existing records. Honest repeated cycles need deliberate schema/API changes: replace revision-only request uniqueness with a cycle-aware rule, allow a fresh request ID for unchanged content while preventing duplicate pending requests, and link each decision/reply to its actual request/cycle. Same-revision repeated decisions cannot be joined reliably by revision ID alone. Preserve tenant foreign keys, assignment/independence checks, ETag/hash guards and idempotency. A new general-purpose chat service is unnecessary; selection anchors and unread/resolution semantics can extend the existing editorial model in scoped steps.

## Adjacent edge cases to resolve before implementation approval

- **Resubmit with no edit:** `study_review_requests` has `UNIQUE(church_id,content_id,revision_id)` at [migration line 14](../../../backend/migrations/012_study_review_requests.sql:14), while submit inserts a request for a supplied reviewer at [core-routes.ts:225](../../../backend/src/api/core-routes.ts:225). The local harness reproduced **409 / `23505`**. Its transaction preserved the original note/status. The target is a fresh review cycle against unchanged bytes when appropriate, not a mandatory fake edit. Implement cycle-aware uniqueness/linkage and a specific recoverable UI/API outcome; do not call the old edited-revision workaround the intended policy.
- **Saved draft loses state label:** [save-revision.ts:18](../../../backend/src/modules/save-revision.ts:18) changes the aggregate state to `draft`. Requested changes remain relevant after this edit, so visibility cannot depend only on `status === changes_requested`.
- **Latest request is insufficient history:** the existing GET orders by `created_at DESC LIMIT 1`; older requests and reasons must remain discoverable. Pagination/event ordering needs stable tie-breaking.
- **Author vs assignment:** current notification targets `row.author_id`, not every assigned contributor or necessarily the original submitter. A team should agree who is expected to act, without changing stored author identities. Assignment changes must not leak notes to unassigned contributor accounts.
- **Unavailable actor:** do not hide an old note merely because the reviewer was deactivated or their display name changed. Preserve actor ID and show an appropriate name/fallback under church retention policy.
- **Approval vs media/decks:** the combined creator can edit text, layout, data and assets, but each review targets the artifact/revision actually reviewed. Do not mix a public-deck crop critique with study approval or silently approve changed assets. Reading/design modes share one content model; switching a mode alone must not manufacture a teaching revision.

## Acceptance and verification matrix

| Scenario | Required observed behavior | Current evidence |
| --- | --- | --- |
| Contributor submits non-empty assignment note; approver reloads | Exact note shown with contributor/revision/time | Local DB storage + author request DTO verified; UI render absent in source; browser pending |
| Approver requests changes; contributor opens separate fresh session | Exact reason readable and actionable | Separate OIDC accounts and real API/DB verified; author readers omit reason; browser pending |
| Contributor edits after requested changes | Prior reason remains visible and labels old revision | Local API verified state resets to draft and old reason remains stored; rendering pending |
| Contributor replies and resubmits | Reply and all prior cycles visible to assigned reviewer | Comments exist; unified experience pending |
| Reviewer approves latest revision | Explicit approval; prior notes stay in history | Approve path exists; visibility pending |
| Same-revision explanation and resubmit | New request/cycle targets unchanged revision; no fake edit, duplication or raw constraint error | Old local API reproduced 409 / 23505; repaired cycle contract unimplemented |
| Selected passage comment → edit/reorder/delete → reopen rail | Original revision quote stays accurate; valid block/range anchors persist or explicitly become prior-revision anchors | New combined-editor anchor model proposed; no current runtime proof |
| Assistant proposal in response to review | Scope/source/base revision shown; Apply changes only selection; Undo works; decision stays with independent reviewer | Combined-editor proposal integration proposed; no current application proof |
| Empty change reason | 422/actionable message, input retained | Local API verified 422; UI input retention pending |
| Stale hash/version or wrong reviewer | Rejected without appending a false decision | Local API verified wrong hash 409 and stale version 412; wrong-reviewer test pending |
| Another church/unassigned contributor/member/public | Cannot read internal notes | Local API verified member 403 and cross-church 404; unassigned/public/new-reader cases pending |
| Reload/navigation/error retry | Notes persist; no silent loss or duplicates | New end-to-end verification pending |

Verification actually run: `npm exec --workspace=@gather/frontend -- vitest run components/content-editor.test.tsx components/study-composer.test.tsx components/studies.test.tsx` — **3 files, 13 tests passed**. Tests use local components and mocked fetch; none asserts stored assignment-note rendering or the decision-reason roundtrip.

Existing [admin-review.spec.ts](../../../frontend/e2e/admin-review.spec.ts:4) was read, not executed. It covers contributor submission and independent administrator approval, with no non-empty note/request-changes visibility assertion. Existing [editorial.test.ts](../../../backend/tests/integration/editorial.test.ts:24) was read, not executed; its helper pattern informed the dedicated research harness below. No production incident reproduction or production database inspection was attempted.

Remaining implementation verification: local isolated two-account **browser** roundtrip in the combined creator, selection-anchor drift, actual-edit and no-edit repeated cycles, stale cycle/decision races, reply retention/retry, and wrong-reviewer/unassigned/public/new-reader denial. Test two cycles against identical bytes and one against changed bytes; history and decisions must identify the correct cycle. The old API evidence below proves the baseline defect and selected guards, not the repaired behavior. Keep stored rows, DTOs and UI evidence separate.

## Retained actual API runtime evidence — October 31

Executed `node --import tsx "research/Product Experience Initiative 20261031/evidence/approval-roundtrip.ts"` using the current backend source. [Harness](../evidence/approval-roundtrip.ts), [exact results](../evidence/approval-roundtrip.json). The successful run lasted approximately 17 seconds, starting 2026-11-01 03:39 UTC / October 31 23:39 America/New_York.

The harness created exactly one uniquely named owned database on loopback PostgreSQL port 54329, migrated and seeded fictional fixtures there, and started the current API and local OIDC issuer on dynamically chosen unused loopback ports. Contributor, administrator and member sessions used the actual local OIDC code/PKCE flow. It never printed session cookies, CSRF tokens, credentials or connection strings. External services and CoWriter were disabled; fetch was restricted to owned API/OIDC origins. No AI/provider endpoints were invoked, and no frontend dev/build service was started.

Initial preflight safely rejected a missing `TEST_DATABASE_URL` before DB creation. This checkout has `TEST_MIGRATION_DATABASE_URL` and `DATABASE_URL` in root `.env`, so the successful run used a documented fallback: require `DATABASE_URL` to be loopback:54329 with `gather_runtime`, replace its database name with the owned unique database **before** creating any runtime pool. It did not query or mutate that URL's original application database. Migration runs were limited to the owned database and preflight required an existing safe runtime role to avoid server-wide role creation.

| Observed step | HTTP status | Verified result |
| --- | --- | --- |
| Submit content with non-empty contributor note | 200 | Note stored verbatim against submitted revision |
| Administrator requests changes with non-empty reason | 201 | Reason stored verbatim against that same revision; aggregate becomes changes_requested |
| Author GET aggregate | 200 | Neither contributor note nor reviewer reason appears in DTO |
| Author GET review-request | 200 | Original contributor note appears; reviewer reason does not; status is changes_requested |
| Author GET comments | 200 | Empty array; decision did not create a revision comment |
| Empty requested-changes reason | 422 | reason_required |
| Wrong reviewed hash | 409 | hash_changed |
| Stale version decision | 412 | revision_conflict |
| Member GET aggregate/review-request/comments | 403 each | No internal content/note read granted |
| Contributor GET another church's aggregate route | 404 | not_found |
| Resubmit same revision without an edit | 409 | PostgreSQL 23505; original request note/status preserved after rollback |
| Edit → resubmit → administrator approve | 201 → 200 → 201 | New revision becomes approved; prior reason still stored alongside final approval reason |

Teardown completed in `finally`: the owned API, runtime/admin pools and OIDC server closed; only the exact owned database was dropped, and its absence was queried and verified. The JSON records the owned name/ports and cleanup result. No application, test, package, configuration or deployment files were changed. This provides runtime evidence for the defect and related resubmission failure in an isolated current-source environment, while production state and fresh browser rendering remain untested.
