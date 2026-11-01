# API and State Contract

## Canonical lifecycle

```text
draft → in_review → changes_requested → draft
draft → in_review → approved
approved → scheduled → published
approved → published
draft/in_review/changes_requested → cancelled
```

`approved` and later states refer to the study content revision. A plan has editable supporting fields but no independent publication gate.

## Proposed commands

### Submit study for review

`POST /churches/:churchId/studies/:studyId/submit`

```json
{
  "revisionId": "immutable-study-revision-id",
  "approverId": "active-contributor-id",
  "note": "Please check the application question",
  "idempotencyKey": "client-generated-key"
}
```

The server atomically verifies tenant, editor capability, revision head, required fields, approver capability (`plans:edit` and `content:approve`), creates/replaces the pending review request, transitions the aggregate to `in_review`, and records an audit event. A repeat with the same key returns the existing request.

### Approve exact revision

`POST /churches/:churchId/studies/:studyId/approval`

```json
{
  "revisionId": "immutable-study-revision-id",
  "decision": "approved",
  "comment": "Approved for delivery",
  "idempotencyKey": "client-generated-key"
}
```

The server rejects a non-head or edited revision. If the planned time is past, it creates/reuses a `manual_once` publication and returns the publication state. If future, it leaves the study approved for the scheduler.

### Explicit publish

`POST /churches/:churchId/studies/:studyId/publish`

The command requires an approved exact revision, ignores whether the planned time is past or future, creates/reuses a `manual_once` publication, and records `deliveryMode: approval_override | explicit_publish`. It must never return a due-window error.

## Structured failure codes

| Code | Meaning | UI action |
|---|---|---|
| `revision_not_current` | submitted revision is not the head | Reload and compare changes |
| `approver_required` | no approver was supplied | Select an eligible approver |
| `approver_not_eligible` | selected user lacks approval capability | Choose another contributor |
| `approval_required` | publish attempted without exact approval | Submit for review or ask approver |
| `approval_revision_mismatch` | approval does not cover requested revision | Re-submit the current revision |
| `publication_already_exists` | idempotent duplicate request | Open existing publication |
| `publisher_permission_revoked` | actor/tenant no longer authorized | Contact church administrator |
| `delivery_worker_failed` | publication exists but processing failed | Retry delivery; preserve publication ID |
| `data_repair_required` | legacy dependency needs review | Re-save and submit this study |

## Invariants

- A publication has one tenant, one approved content revision, and one immutable snapshot.
- A unique constraint prevents duplicate publication for `(tenant_id, study_id, content_revision_id, delivery_mode)` where applicable.
- Publication creation and audit insertion are transactional; provider side effects use an outbox/idempotency key.
- The worker may retry delivery without changing approval state.
