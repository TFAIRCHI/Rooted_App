# Rooted 1.2.12 — Workflow and data contract

This is an implementation contract, not an existing API. Use repository naming conventions when adding types/routes, but preserve the behavior and invariants below.

## Scope and context

A workflow belongs to one church and initiating contributor. Default visibility is private; collaboration/sharing is deferred. It may create 1–7 new study dates in one selected existing series/container, within an explicitly confirmed week, timezone and assignee context. Occupied dates require choosing alternatives. Replacing existing studies is outside this batch feature's first-release scope.

The church's timezone resolves relative dates. Sunday–Saturday weeks may cross months or years. Store canonical date-only values plus the church IANA zone and local delivery time. Display exact dates before confirmation; do not rely on the browser timezone, UTC midnight or a model's guess about “next week.” Missing cadence/time/assignee choices must be made or visibly proposed for confirmation.

## Persisted records

| Record | Required information |
|---|---|
| Workflow run | Church/actor, selected container, timezone, state/version, model/settings, created/updated timestamps, access expiry, run-token ceiling, attempt count, cancellation and commit IDs |
| Source binding | Workflow-owned immutable source text or reviewed source revision pointer, rights/review actor, hash, source-span identifiers, retention/provenance |
| Plan version | Overall theme/takeaway, audience/depth/translation, exact dates, each day's objective/title/passages/progression/application emphasis, assumptions and unresolved choices |
| Decision/event | Who requested/edited/agreed to which direction, version, timestamp; bounded messages or summaries needed to resume |
| Generation confirmation | Authenticated actor, exact plan/source/profile hashes, target dates, assignee/local time, allowed creation scope, reserved allowance and confirmation time |
| Day job/attempt | Run/plan/date identity, actor context, lease/status, idempotency/fingerprint, provider request ID if available, usage/reservation, safe failure category and staged result |
| Staged day | Complete validated payload, source evidence, validation result, plan/date/hash binding, generation version |
| Commit mapping | Run/confirmation → exact created slot/plan/content/revision IDs; committed once with the batch transaction |

All tenant relationships require composite ownership keys and forced RLS. Private actor ownership also needs enforcement. Do not store private transcripts in shared caches, general traces or numeric global counters. Use separate global allowance controls that reveal no church content, as in the current demo.

## State and confirmation rules

```text
clarifying → plan_proposed → direction_review → awaiting_generation_confirmation
          → queued → generating → ready_to_commit → drafts_saved
```

Also support `paused_conflict`, `failed`, `submission_unknown` at the attempt level, and `canceled`.

- Reviewing/accepting a plan does not authorize generation or database creation.
- The explicit generate confirmation authorizes the named new draft set and its bounded model work. It does not approve or publish study content.
- Any change to the plan, dates, source, teaching profile, assignee or delivery time invalidates that confirmation. Pause incompatible work and require confirmation of the new version.
- Resume transitions from stored state/version. The browser cannot set workflow state, approval flags or generated content by posting a desired status.
- A failed day leaves valid results staged. Retry only the failed day after explicit contributor action and renewed budget reservation. A changed shared plan invalidates dependent results instead of mixing plan versions.
- Cancellation must prevent subsequent generation/commit when it wins the state transition. If a batch already committed, return the saved mapping; cancellation is not deletion of created studies.

## Structured outputs

Use shared schemas and bounded enums. Model outputs can propose intent, clarification questions, a plan or a day payload; they cannot include executable code, SQL, arbitrary tool names, authorization context or a model-generated confirmation.

Intent must indicate requested day count, time period/date intent and missing information. Code resolves authoritative dates and checks the calendar. Plan output must include exactly the selected dates once each, a meaningful daily progression and no hidden writes.

The new full-day output should contain:

```text
date
content:
  schemaVersion: 1
  title
  references[]
  body
  reflection
  discussionQuestion
  application
  outboundPreview
evidence[]: field + approved source revision/span IDs
warnings[]
```

Use `backend/contracts/payloads.ts` as the current saved-payload authority. `references` maps to the editor's Primary Scripture & source links box. `outboundPreview` maps to Message preview; no notification is sent. Do not accidentally return the old `smsPreview` name without mapping it, or populate an obsolete plan-only field instead of the content editor.

Required text fields must be nonempty and within schema lengths. Require at least one relevant passage/reference per day for the source-based acceptance case, using supplied/confirmed references; if none is grounded, ask rather than inventing one. Source links must come from approved allowed sources. A complete draft need not contain a hyperlink if an authorized passage reference is sufficient.

Validate source/span IDs and hashes, absence of unexpected keys, exact day count/date membership, meaningful field completeness and provider completion status before staging. Interpretive/theological quality requires human review; schema validity is not proof of truth. Reject truncated output. Use a concise agreed reading length and a measured output allowance for a complete day.

## Tool and endpoint boundaries

Implement church-scoped workflow routes for create/read, source review, bounded plan conversation/versioning, confirm generation, status, explicit failed-day retry, cancel and content erasure. Polling is sufficient for progress. Never accept a caller-supplied tenant override or arbitrary provider/thread URL.

The orchestrator's narrow tools are: inspect authorized calendar, read bound source, propose/update plan, generate staged day, validate staged day, commit confirmed set and inspect/retry/cancel run. Only deterministic application code records human confirmation and authorizes commit. Tools must check state/version/capability every time, even when previously authorized work is resumed.

Use existing permissions: `ai:use` plus relevant series/date creation, content creation/edit and assignee checks. Show which permission is missing; do not grant capabilities automatically. An approved profile is data associated with this church, not a way to override tool security.

## Atomic saving, retries and accounting

Do not create calendar dates as a side effect of the initial prompt. Once all results are staged, take consistent date locks and verify no occupied/deleted/withdrawn target conflicts, source/profile changes, revoked permissions, or cancellation. In one transaction create the normal slots, plans, content aggregates, complete content revisions, provenance/audit records and commit mapping. Use current calendar/uniqueness rules and existing editorial helpers. No approval, publication, schedule activation or outbound provider work is part of commit.

Commit is idempotent; replay returns the same mapping. Day jobs use stable run/plan/date/generation identities and leases. Do not claim exactly-once Azure inference: a transport interruption may leave an ambiguous billable submission. Hold or conservatively reconcile that attempt and require explicit retry, rather than auto-resubmitting it.

Use one ledger relationship from workflow reservation to day attempts. Reserving the parent and child must not deduct the same allowance twice; settling/retrying/canceling must not refund it twice. Planning calls also consume budget. Reconcile used tokens and release only unused reservations. Durable daily/global caps count each inference, including repairs and clarification.

Keep private workflow access/retention for 30 days with scheduled cleanup. Preserve necessary numeric usage and disclosed audit/provenance records. Already saved studies follow their normal retention rules. Ensure schema relationships, privacy erasure/export, withdrawn-study purge and immutable source snapshots remain consistent; no new cascade should delete an unrelated study or break an existing purge function.
