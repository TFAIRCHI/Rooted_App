# Functional requirements and proposed contracts

All behavior below is **Recommendation**, except the mandatory date-first interaction supplied by the product brief. Need: a testable editorial workflow that remains usable without AI or external integrations. Why: contributors and church leadership must retain authorship and publication authority.

## Capabilities

| ID | Required behavior | Priority / acceptance |
|---|---|---|
| F01 | Tenant workspace, invitations, multiple church memberships, least-privilege roles and explicit day assignments | P0; AC13–14 |
| F02 | Manual sermon title, preached date, speaker, passages, notes; asset provenance and source revision | P0; AC01, AC18 |
| F03 | Weekly series and configurable dated slots, per-day time/zone, assignees, separate plan/content status | P0; AC02, AC12 |
| F04 | Expand selected date first; creation dropdown has exactly the two specified choices; manual fields start empty | P0; AC03, AC05 |
| F05 | Plan title, primary Scripture, objective, outline/key points, question, optional notes; typed extension sections with schema version | P0; AC06 |
| F06 | Server autosave, locally recoverable working copy, day switching, immutable revision history, conflict detection | P0; AC10–11 |
| F07 | Field/revision comments, tenant-scoped mentions, notifications, change requests, separate plan/content approvals | P0; AC07, AC15 |
| F08 | Explicit manual full-study draft after approved plan; reflection, discussion, application, source links and preview | P0; AC21 |
| F09 | Exact-revision approved publication, withdrawal, blocked missed occurrence, audited scheduling/cancellation | P0; AC08–09 |
| F10 | Responsive public/member-only reading chosen by church; no drafts leak in metadata, search, previews or cache | P0; AC22, AC13 |
| F11 | Weekly/day proposals and contextual help; field-by-field explicit adoption, rejection and comparison | P1; AC04, AC19–21 |
| F12 | SMS consent ledger, per-church sender, preview, quiet-hours checks, suppression, callbacks and budget | P1; AC23–27 |
| F13 | Allowlisted appreciation reactions, optional moderated discussion, reports, staff actions and appeal contact | P1; AC16 |
| F14 | Read-only Planning Center import with incremental reconciliation; Church Center links | P1; AC17 |
| F15 | Account export/deletion request, tenant offboarding, retention policies, audit access | P0 foundation; AC29 |

P0 is core workspace release; P1 rollout is gated independently. Prototype controls may demonstrate an interaction without implementing its server behavior; see [mockup README](mockups/README.md).

## Proposed API conventions

Tenant comes from authenticated membership and is checked against route tenant ID. Every resource read/write is authorized, including job payloads and signed asset URLs. UUIDs are identifiers, never authorization. JSON error envelope: `{ "code": "revision_conflict", "message": "A newer draft exists", "requestId": "...", "details": {"currentRevisionId":"..."} }`. Do not return another tenant's identifiers in errors.

| Method and illustrative path | Contract / authorization |
|---|---|
| `POST /v1/churches/{churchId}/sermons` | `sermons:create`; manual metadata and source kind; 201 with stable ID |
| `POST /v1/churches/{churchId}/series` | `series:manage`; title, weekAnchor, timezone, sermonIds |
| `PUT /v1/churches/{churchId}/slots/{slotId}` | `schedule:manage`; calendar edits use the plan-edit transaction, new approved calendar snapshot and schedule version; assignments require their own capability |
| `POST /v1/churches/{churchId}/plans/{planId}/revisions` | Assigned `plans:edit`; `{baseRevisionId,payload}`; If-Match and idempotency key; 201 new immutable Draft revision |
| `POST /v1/churches/{churchId}/plans/{planId}/submit` | Assigned contributor; expectedRevisionId; 409 if incomplete or stale |
| `POST /v1/churches/{churchId}/plans/{planId}/decisions` | Explicit approver; `{revisionId,expectedHash,decision,reason}`; If-Match; separate content decision route below |
| `POST /v1/churches/{churchId}/plans/{planId}/content` | Explicit contributor action after current plan approval; `{planApprovalId,mode}` manual/ai; returns content identity and optional job ID; never triggered by approval alone |
| `POST /v1/churches/{churchId}/content/{contentId}/revisions` | `{baseRevisionId,planApprovalId,payload}`; explicit manual draft or adopted AI result; If-Match; independent content revision |
| `POST /v1/churches/{churchId}/content/{contentId}/submit` | Explicit submission of current content revision for independent review |
| `POST /v1/churches/{churchId}/content/{contentId}/decisions` | Content approver checks exact content and approved-plan dependency; no automatic decision on plan approval |
| `POST /v1/churches/{churchId}/ai/requests` | `ai:use`; slotId, workflow, field, sourceRevisionIds, draftBaseRevisionId; 202 job ID, no mutation of editor |
| `POST /v1/churches/{churchId}/content/{contentId}/schedules` | `publication:schedule`; `{revisionId,approvalId,localDate,localTime,timeZone,destinationId}`; If-Match/idempotency key; 201 pinned occurrence |
| `GET /c/{churchSlug}/studies/{studySlug}` | Only published snapshot; apply church public/member policy |
| `PUT /v1/churches/{churchId}/studies/{studyId}/my-reaction` | Authenticated member; allowlisted type; idempotent replace/remove |
| `POST /v1/churches/{churchId}/studies/{studyId}/discussion` | Authenticated member; discussion enabled; rate limits and moderation policy |

Example plan save (illustrative contract):

```http
POST /v1/churches/church-grace/plans/plan-monday/revisions
If-Match: "version-12"
Idempotency-Key: client-generated-unique-save-key
Content-Type: application/json

{
  "baseRevisionId": "revision-12",
  "payload": {
    "schemaVersion": 1,
    "title": "Words of eternal life",
    "primaryScripture": {"reference": "John 6:68", "translation": null},
    "learningObjective": "Explain Peter's response in its narrative context.",
    "outline": ["Read John 6:60–69", "Observe Peter's response", "Discuss faithful response"],
    "discussionQuestion": "What does Peter's response invite us to consider?",
    "notes": "Review the surrounding passage before drafting.",
    "extensions": []
  }
}
```

Return 428 for missing If-Match, 412 for stale If-Match, 403 for an authorized tenant member lacking permission, 404 for resources outside the caller's tenant, 422 for field errors, and 409 for an invalid state transition. Every mutating POST requires an idempotency key; a repeated key with different body yields 409, not a second action. The [07 contracts](07-system-architecture.md) are canonical for aggregate commands. Member-facing “study” URLs map to content/publication identities; they are not another approval aggregate. These are our proposed contracts, not external vendor endpoints.

## Moderation behavior

**Recommendation:** Discussions off by default. When enabled, church chooses pre-moderation or trusted-member posting with report queue; first-time contributors start pending. Reactions are appreciation choices such as thankful, encouraged, praying; no negative voting or anonymous ranking. Moderators can remove/hide reactions and comments with reason, restrict participation, and review reports. A report is visible only to reporter and authorized moderators. Removal leaves a tombstone where thread continuity requires it. Members can edit/remove their own comments; edits re-enter review under pre-moderation. Materially edited comments retain moderator-accessible history subject to retention policy.

## Alternatives, dependencies, risks, questions

Alternative: a single generated article and “publish” button; fails separate planning and approval. Alternative: fully collaborative document editing; defer until optimistic-locking friction is demonstrated. Dependencies: [06](06-data-model-and-tenant-isolation.md), [11](11-collaboration-approval-and-versioning.md), [13](13-auth-security-privacy-and-compliance.md). Risks: mutable approved previews, inherited admin permissions, content in email notifications. Unknown: multi-approver thresholds and multilingual editing. Default notifications contain an action summary and authenticated deep link, not private discussion text.
