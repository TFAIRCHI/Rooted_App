# Rooted 1.2.9 — Data and API contracts

**Status:** proposed implementation contract. Routes and columns below are not claims about currently available APIs. Read [research](../../research/23-study-management-workflow-and-engagement.md) and [UX](UX_SPECIFICATION.md) first. Use current `frontend/` and `backend/` boundaries and existing tenant transactions/idempotent commands. Update generated contracts through the repository's generator.

## Identity, permissions, and invariants

- **Study ID = slot ID** for lifecycle/date operations. Plan aggregate ID, content aggregate ID, revision ID, and publication ID remain distinct. A slot exists before a content aggregate; deletion must support that state.
- Current role/capability definitions are in `backend/src/api/onboarding-routes.ts`, seed/migrations, auth session projections, and membership UI. Add `studies:delete` to current contributor and admin mappings/backfill. Member never receives workspace/delete/moderation/analytics authority. Preserve finer restrictions; do not treat every `workspace:read` user as an unrestricted contributor.
- Contributor replies/decisions require `moderation:manage`; engagement aggregates require `engagement:read`. A dedicated admin without either capability does not automatically gain comment-reading or editorial approval authority merely because it can delete studies.
- An active **Church Member** for audience/view metrics uses one centralized existing-role resolver. With the current capability model, member-only means active membership without `workspace:read`; document/version this mapping and test all fixture roles. Do not hardcode usernames, rely on display names, or count contributor previews.
- Every new table has tenant-scoped keys, composite foreign keys, ENABLE/FORCE RLS, least-privilege grants, migration tests, and privacy handling. Test using the runtime role, which must not bypass RLS. PostgreSQL documents owner/superuser exceptions. [S68](../../research/sources.md#s68)
- Every mutation authenticates, checks active tenant membership/capability, validates CSRF/origin, scopes resources to tenant, and uses the existing idempotency machinery. Use `If-Match` for edits/deletion/moderation. Reused keys replay the original outcome; distinct keys for the same terminal deletion/open must remain safe.
- Approval authority remains the exact final content revision/hash. Date passage is never an approval blocker. Optional planning-note edits cannot mutate or revoke a separately approved member-facing snapshot.

## A. Study lifecycle and date reservation

Brand DTO extension for Phase 2: expose original asset width/height and authorized mark/lockup URLs without embedding bytes in workspace JSON. Select variants declaratively for each layout. If introducing a sidebar derivative, keep the source immutable, use a versioned variant route with existing authorization/cache behavior, and remove only mathematically known canvas padding added by Rooted normalization. Update public/member theme projections consistently. Existing assets must continue working without reupload.

Representative additions, not executable migration SQL:

| Table | Fields / constraint | Purpose |
|---|---|---|
| `slots` | `lifecycle_version integer NOT NULL DEFAULT 1`; `deleted_at timestamptz`; `deleted_by text`; `deletion_reason text` | Root tombstone and optimistic concurrency |
| `slots` | Unique `(church_id, local_date) WHERE deleted_at IS NULL AND withdrawn_at IS NULL` after duplicate preflight | One active church study per civil date across series; deletion or withdrawal releases the date |
| `slots` | FK `(church_id, deleted_by)` to membership; consistent deleted metadata check | Audited actor binding |

Review all positional `INSERT INTO slots VALUES(...)` statements before adding columns; replace them with explicit column lists, including fixtures/tests. Preserve old per-series history; do not delete immutable rows to satisfy a new unique index. Preflight existing active cross-series duplicates and emit IDs/dates for explicit repair. If present, stop migration before introducing the index and document the required move/delete action. Render all legacy duplicates during repair; no `Map(date → one slot)` may silently hide a study.

In the new additive migration, replace the old **unconditional** `one_study_per_series_date` index from migration 011 after the preflight/new partial constraint is in place. Leaving both indexes would still reserve a deleted study's date inside its original series/container. Do not edit migration 011 itself. Prove same-container date reuse as well as cross-container conflict prevention on an upgraded database.

Expose `slot.etag = "slot:<id>:<lifecycle_version>"` and a `deleted` flag in lifecycle/admin DTOs. Increase lifecycle version for meaningful date/time/assignment changes and delete. During compatibility transition, the existing PUT may accept a current plan ETag under an explicit documented branch; new UI must use slot ETags. Reject unsupported/stale formats without guessing.

### `POST /v1/churches/:churchId/slots/:id/delete`

Headers: CSRF, Idempotency-Key, current slot If-Match. Body: `{ "reason": "Optional text up to 500 characters" }`.

Under deterministic locks: read locator, lock plan root, then associated content IDs in order, then slot, then schedules/send records in documented consistent order. Worker paths must use compatible ordering; test deletion versus publication and provider claims. Require `studies:delete` and active membership. Mark tombstone; clear live content pointers; withdraw pending review requests; cancel all nonterminal/superseded schedule work and eligible local/provider queued deliveries; mark queued AI work against the root cancelled and account for reserved budgets. Preserve final approval/publication/audit history. Do not change immutable teaching payloads or pretend provider-accepted requests can be recalled. Callback reconciliation may still update an accepted send's delivery evidence.

Response 200:

```json
{
  "studyId": "slot-uuid",
  "deleted": true,
  "deletedAt": "2026-10-21T15:00:00.000Z",
  "cancelledPendingWork": 2,
  "alreadyDispatched": 0,
  "retainedHistory": true
}
```

Concurrent second deletion with another key is a successful already-deleted result after authorization; handle terminal tombstone before applying stale-version rejection. Never make arbitrary missing/foreign IDs successful. New mutation/read commands against a deleted root return 404 to members and normal active-study clients. Authorized history queries can expose the tombstone. Include delete guards in edit/submit/approve/publish/AI/adopt/community/open endpoints, workers, member/public reading, and new notification claims. Idempotent replay of an earlier response must not reexecute effects or resurrect a deleted record.

### `PUT /v1/churches/:churchId/slots/:id`

Retain calendar request fields and explicit IDs; move to slot ETag as above. Require current date/assignment management authority. Date conflict is church-wide, backed by the active unique index, and returns `409 date_conflict` with a nonleaking recovery message.

For an actual calendar change to an unpublished root, atomically create new immutable plan **and existing content** revisions with the same new calendar, preserve each payload/source snapshot, withdraw old pending review requests, clear final approval, and cancel obsolete scheduling/sending. Preserve exact existing assignee set unless explicitly changed. Return current slot plus new plan/content DTOs. No-op requests do not create revisions. Assignment-only changes update lifecycle assignment/version without clearing content approval or changing calendar. Prevent moving an already published slot with `409 published_study_date_immutable`; offer a new study instead. Optional plan-text edits are a separate operation and do not call broad delivery cancellation for an approved study snapshot.

## B. Month workflow and Dashboard projection

### `GET /v1/churches/:churchId/study-workflow?month=2026-10`

Returns church timezone, Sunday week-start convention, month, ordered month-clipped week ranges, all authorized nondeleted dated studies and final study states. IDs use date range/start, not week number alone. Each item includes slot ETag, current content revision/approval, pending reviewer projection, live publication summary, and `nextAction`. Reuse existing assignment/draft-read authorization. A narrow request projection can make an assigned review readable without disclosing unrelated drafts. Do not return every private comment to calculate a count.

Creation may keep the legacy series API internally. Add a simple date-first `POST /v1/churches/:churchId/study-workflow/studies` with date/time/timezone, assignee IDs, optional sermon/source IDs, and optional existing series ID. Resolve/create an internal date container transactionally with a stable date-derived key and DB uniqueness; response exposes study/slot ID. No required series title, approval, or optional planning field. Month/week browsing is read-only and creates no records. Source context remains attached on moves; grouping ignores old `series.week_anchor`.

### `GET /v1/churches/:churchId/dashboard?weekStart=2026-10-18&publicationId=<optional>`

Explicit scope: church-local Sunday start through Saturday inclusive, or equivalent `[start,nextSunday)` civil dates. Absent weekStart uses church-local today. A publication selector affects engagement only; readiness week remains explicit.

| Metric | Definition |
|---|---|
| `plannedCount` | Distinct authorized nondeleted slots in week |
| `readyCount` | Those with final content state approved/scheduled/published and valid current approval; count each once |
| `pendingReviewCount` | Pending review requests for current final content revisions of those slots |
| `assignedReviewCount` | Same pending requests assigned to current actor |
| `readyToPublishCount` | Current approved final content with no live publication and no active future schedule |
| `scheduledCount` | Current approved unpublished final content with valid pending future schedule |
| `publicationIssueCount` | Those in retryable/blocked delivery states; separate from editorial approval |
| `uniqueAudienceOpens` | Distinct members in frozen publication audience with a successful authenticated open |
| `audienceMemberCount` | Publication-time active member-only audience; nullable for legacy history |
| `additionalMemberOpens` | Valid current member opens outside original audience |
| `positiveReactions` | Current persisted thankful/encouraged/praying reactions, grouped by type |
| `questionsNeedingAnswer` | Approved, nonerased question roots in unresolved state for the selected live publication |

Reuse one state projection across Calendar/Workflow/Dashboard. Approved optional plans never make an unapproved final study ready. For a replacement draft with an older live publication, expose both current draft status and live snapshot; do not relabel the draft approved. Percent = audience opens / frozen denominator; zero denominator yields null percent and explanatory copy. Legacy missing observations yield null/unknown, not invented zeros. Scope/denominator labels must be returned explicitly. Select latest visible nondeleted publication with `(published_at DESC,id DESC)`.

Return readiness independently of engagement failure; a failed analytics query must not remove basic week tasks. Calculate independent grouped aggregates before joining to avoid multiplication. Add indexes for date, pending requests, publication/comment filters and review EXPLAIN plans on stated fixtures; totals cannot come from the first paginated list.

## C. Publication audience and authenticated opens

Representative tables:

```text
publication_audiences(church_id, publication_id, captured_at, member_count,
  eligibility_version, tracking_state)
  PK(church_id, publication_id); FK to publication
publication_audience_members(church_id, publication_id, user_id)
  PK(church_id, publication_id, user_id); composite FKs to audience and membership
study_opens(church_id, publication_id, user_id, first_opened_at)
  PK(church_id, publication_id, user_id); composite FKs to publication and membership
```

Capture audience synchronously in the successful publication transaction, immediately after publication insertion and before commit/outbox processing. Replayed publication does not refresh audience. Define a consistent database snapshot relative to membership changes; the frozen set is the set observed by the publication snapshot, never a later dashboard query. Use existing immutable publication rows unchanged. Leave historical audiences missing unless reliable historical evidence exists; no current-membership backfill masquerading as historical facts.

`POST /v1/churches/:churchId/studies/:publicationId/open` accepts an empty body. Authenticate member, recheck current live/nondeleted publication and reading policy, then insert first open with conflict-safe uniqueness. Response 200 `{ "recorded": true }`; authorized contributor previews return `{ "recorded": false, "reason": "workspace_preview" }`. Member client calls only after successful study display while visible; no writes during server render, prefetch, or GET. Refresh, retries and multiple devices never increase unique count. Opening is not a read-completion event. Anonymous activity is excluded from the membership metric.

Privacy/export: include subject's opens/audience membership in tenant export; erase/pseudonymize under a recorded retention policy, preserving only permitted aggregates with reduced precision labels. Proposed 90-day identifier retention requires explicit deployment configuration and a tested compaction strategy that does not double count retained totals/new events. If that is not ready, release only with a documented finite retention and cleanup job; do not claim indefinite exact historical deduplication after identifiers expire.

## D. Comment content, moderation, replies, and resolution

Existing discussion `version` increments for both content and moderation. Add a separate `content_version` incremented only on author edits so a machine job can bind to exact text without confusing moderator decisions with changed text.

| Object | Proposed changes |
|---|---|
| `discussions` | `kind=response/question/reply`; nullable `parent_id`; `content_version`; status includes existing pending/approved/hidden/erased plus declined |
| Parent relation | Root for response/question; reply points to same-church, same-publication root; no recursive thread in MVP; same-publication composite FK |
| `discussion_evaluations` | Church, discussion ID, content version, policy version, classifier version/provider, input hash, verdict, safe reason codes, origin, timestamp; immutable |
| `moderation_actions` | Support approve/hide/decline and explicit origin; preserve old rows/enum compatibility |
| `discussion_resolutions` | Question ID/content version, resolved/reopened, actor, reply ID if applicable, reason, timestamp; append-only events, current projection/version |
| Moderation jobs | Unique discussion/content/policy version, retry/timeout state and provider budget; tenant RLS and minimal payload |

New member comment/edited text: persist pending and enqueue evaluation atomically. Worker reads untrusted text outside long-lived DB transaction, obtains schema-validated classification, then applies a verdict under current-version/decision locks. `policy_violation` at calibrated high confidence may set declined; safe or uncertain stays pending until human approval. Provider disabled/error/unsupported language stays pending with recorded fallback. A late result may never change an edited, erased, hidden or manually decided comment. No network call while holding publication/comment locks. Jobs on deleted roots cancel; discussion-disabled policy pauses them.

Public/member community reads expose approved comments/replies plus appropriate existing removed placeholders. Own pending/declined comments are visible only to their author and authorized moderators. Safe author feedback uses generic policy reasons; raw scoring/prompt/provider responses are private. All HTML is escaped, length/rate limits apply, edits requeue, privacy erasure cancels jobs and removes live text. This extends existing discussion functionality rather than introducing a second comment system.

### Proposed route changes

| Route | Request / semantics |
|---|---|
| Existing `POST /studies/:id/discussion` | `{body, kind:"response" or "question"}`; default response for older callers; 201 pending with moderation mode |
| Existing `POST /discussion/:id/revisions` | Exact ETag; body/kind changes increment content version, requeue moderation, reopen changed question |
| Existing `POST /moderation/:id/decisions` | Add decline; exact ETag, nonempty reason; human action wins over older machine job |
| `POST /discussion/:id/replies` | Authorized contributor `{body}`; root ETag; approved reply and answered resolution in one transaction; respects church discussion/delete policy |
| `POST /discussion/:id/resolution` | `{decision:"resolve" or "reopen",reason}`; ETag; only approved question roots; audited |
| `GET /engagement/studies/:id/comments?filter=unanswered&cursor=...` | Authorized, paginated/filterable; private declined text only with moderation capability |
| Existing engagement list/detail | Explicit active vs retained deleted/withdrawn visibility; display archived/deleted label and retained immutable snapshot to authorized users only |

Contributor replies may be hidden/reported; if the last approved answer disappears, reopen automatically unless an explicit still-valid manual resolution applies. Member edit of question content reopens it and requires moderation again; moderator-only status updates do not pretend the content changed. Count unanswered **root questions**, not every comment/reply or question-mark character.

Use a stable `(created_at,id)` cursor for comments and `(published_at,id)` for publication lists so equal timestamps do not drop items. Totals and same-publication tenant checks are server-side.

## E. Moderation adapter acceptance contract

Retained study-writing AI must also work with an optional unapproved plan. Replace existing content-generation/adoption checks against `currentPlanApproval` with exact draft/source-snapshot, tenant, source-rights, and current revision checks. Planning notes may be supplied as explicitly unapproved context; no separate plan approval is required to request or adopt a draft suggestion. Keep explicit contributor action, inspectable acceptance, budgets and final content publication approval intact. This is distinct from automatic comment moderation, whose verdict cannot approve/publish studies.

Provider-neutral input: comment text/content version, small bounded context if necessary, church policy version, supported locale, and max budget. Output: `policy_violation | needs_review | no_violation`, bounded reason codes, classifier/model/prompt version and calibration metadata. Validate schema, limits, content identity and policy version; output cannot execute tools or write arbitrary states.

No provider has been selected or exercised for this workflow. Evaluate rule-only, sentiment, and contextual classifiers per research; use the contextual adapter plus manual fallback recommendation. “No violation” never means verified theology or auto-approved study. Thresholds must be calibrated and recorded against a holdout set including grief, disagreement, Scripture quotations, sarcasm, obfuscation and malicious instructions. Record false positives/negatives and cost/latency; fixture transport proves orchestration, not real classifier effectiveness. [S64](../../research/sources.md#s64)

## Error and concurrency contract

| Code | Recovery |
|---|---|
| `not_found` | Missing, foreign or deleted active resource; return to valid list |
| `date_conflict` | Choose another date; no overwrites or automatic swaps |
| `revision_conflict` / stale slot | Reload current date/content; preserve unsaved writing |
| `published_study_date_immutable` | Open historical publication or create another dated study |
| `discussions_disabled` | Keep entered text locally, explain church policy |
| `moderation_unavailable` | Comment remains private pending; moderator can act |
| `participation_rate_limit` | Respect retry guidance; no repeated submissions |
| `delivery_worker_failed` | Use existing actionable publication retry; never reinterpret as permission to publish unapproved content |

Client request cancellation/generation checks prevent an older response overwriting a newer church/week selection. Mutation success triggers relevant workspace/dashboard/calendar/engagement refresh; focus revalidation covers another contributor's changes. A delete/approval/publish race must have one serializable outcome and retained audit, never a ghost live study.
