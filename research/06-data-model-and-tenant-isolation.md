# Data model and tenant isolation

Status: proposed research design, not a production migration. Recommendations below require implementation and adversarial integration tests.

## What and why

Use PostgreSQL with a shared schema, explicit church ownership, immutable revision payloads, and separate mutable workflow records. The chain is **church → sermon → weekly series → dated slot/plan → plan revision → content item → independent content revision → schedule → publication → engagement**. A weekly series can begin without a sermon and link multiple sermons through an explicit join; a sermon can inform multiple series. A dated slot represents calendar intent and can exist before its plan. Initially one plan belongs to each slot, rather than one plan for the entire week. Content items are channel/language variants belonging to that plan.

`schema.sql` is the representative relational design. UUIDs are identifiers, never authorization. Every tenant table uses `(church_id, id)` as its key; every relationship includes `church_id`. Additional composite foreign keys ensure a content revision references a plan approval for the same dated plan. Unique revision numbers are scoped to their parent, not to the whole tenant.

| Record | Meaning and ownership |
| --- | --- |
| Church / membership | Tenant settings, timezone, explicitly assigned capability set |
| Sermon / weekly_series / series_sermon | Source provenance and the week receiving one or more sermons |
| Dated slot / plan / plan_revision | Stable calendar intent, daily plan identity and immutable outline, scripture references, locale and source snapshot; approvals also bind a calendar snapshot |
| Plan approval | Approver, immutable revision hash, decision time; cancellation/revocation recorded separately |
| Content / content_revision | Stable channel identity and independently numbered immutable body, linked to an approved plan revision |
| Content approval | Immutable content hash plus exact plan approval ID and plan hash |
| Schedule | Approved revision pinned to one instant and one destination; lifecycle is separate from the plan |
| Publication | Immutable publication event; content's live pointer can advance to an approved replacement |
| Engagement | Tenant-scoped, pseudonymous event attached to the publication actually seen |

Hashes use SHA-256 over a versioned canonical UTF-8 JSON envelope, including tenant, parent identity, revision number, authoring payload, source snapshot and, for content, approved plan reference and plan hash. Store the canonical bytes as well as parsed payload where needed; do not hash arbitrary JSON serialization. SQL checks the stored bytes against their SHA-256; the trusted command layer must also verify canonicalization and that the bytes match the parsed payload and relational references. A hash demonstrates binding, not doctrinal correctness or author identity. Approvals also require authenticated actors, authorization, audit and revocation handling.

## Invariants and recommendation

Plan states are exactly `Draft`, `In Review`, `Changes Requested`, `Approved`, `Cancelled`. Content states add `Scheduled` and `Published`. Workflow status is mutable metadata outside immutable revision payloads. Editing inserts a new revision in Draft, advances the head with optimistic concurrency, cancels pending schedules and appends audit/outbox records in one transaction. It never rewrites an approved payload or approval. Existing published pointers stay live until an approved replacement publishes; emergency withdrawal is a separate audited action.

Editing a plan cancels its unclaimed schedules and marks dependent content heads as needing rebase; it does not silently rewrite their approved plan references. Historical approvals remain evidence, but cannot authorize new schedules against a superseded plan head. Content must explicitly adopt and reapprove the replacement plan. The simplest policy is **cancel on edit**: no UI path schedules an older approved revision, even though the schema preserves historical pins. A future older-pin feature would require explicit confirmation showing revision and plan differences and an audit event; it is not part of the recommendation.

Publication authorization rechecks current head, exact approval and revocation state under the same aggregate lock used by edit. Once an external delivery has entered dispatch, it cannot be reliably recalled; expose that boundary to editors. See [collaboration](11-collaboration-approval-and-versioning.md).

## Tenant boundary

Enable and FORCE RLS on every tenant table, including approvals, jobs, idempotency, outbox and audit. Runtime and workers use nonowner roles with `NOBYPASSRLS`; migration credentials never serve traffic. FORCE does not constrain superusers or BYPASSRLS roles. PostgreSQL also exempts referential-integrity checks from RLS, so normalize constraint errors to avoid exposing another tenant's existence. [S20](sources.md#s20)

Authenticate, authorize church membership from trusted identity, then begin a transaction and run `SELECT set_config('app.church_id', $1, true)`. This is transaction-local (`SET LOCAL` semantics), never session-scoped in a transaction pool. Missing/empty context returns no rows; malformed context fails closed. Set context on every transaction, including reads and retries. Commit/rollback before returning a connection. A request-provided church ID alone is insufficient. A compromised application role can set its own context: RLS mitigates query omissions, not arbitrary trusted-server compromise.

Object keys, cache keys, queue envelopes, signed URL authorization, search/vector filters and analytics exports include church identity. Workers resolve an outbox ID within the trusted tenant context, then verify its payload relationships; do not accept arbitrary row IDs from a queue. A narrowly scoped dispatcher can enumerate due tenant IDs through a reviewed control-plane path without content access; per-tenant workers retain RLS. Never implement a generic all-tenants runtime bypass.

The schema intentionally grants no runtime access. Deployment must provision distinct owner/migrator and runtime roles, then grant only module-required privileges. Representative bootstrap, executed by a privileged deployer rather than a request:

```sql
CREATE ROLE church_owner NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE church_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS;
GRANT USAGE ON SCHEMA church_design TO church_runtime;
GRANT SELECT ON ALL TABLES IN SCHEMA church_design TO church_runtime;
GRANT INSERT ON church_design.plan_revision, church_design.content_revision,
  church_design.plan_approval, church_design.content_approval,
  church_design.review_decision, church_design.audit_event TO church_runtime;
```

Run the schema under `SET ROLE church_owner` after an authorized deployer grants schema-creation rights. Runtime login roles may inherit `church_runtime` but never `church_owner`; workers get separately reviewed grants for schedule/outbox updates. This snippet is intentionally incomplete: implement command procedures or narrow table/column grants and membership checks before runtime writes. RLS alone does not enforce capability or workflow transitions. Do not grant runtime `TRUNCATE`, DDL or trigger-disable privileges. Privileged retention can remove records only through a reviewed maintenance procedure with evidence preserved; the immutable triggers deliberately block ordinary deletion.

Calendar edits are approval-sensitive. The slot is the mutable calendar interface, but a plan revision includes a snapshot of date/time/zone. Changing calendar intent must run the same plan-edit command, insert a new revision and cancel pending schedules. Schedule fields are copied from the approved snapshot; changing them requires a new approval, not an untracked UPDATE. Source corrections likewise preserve original revision provenance and require explicit regrounding.

This calendar binding is an explicit, conservative recommendation: approval covers the intended study date and web publication time/zone. It is stricter than approving teaching text alone. Operational notification deferrals for quiet hours, outages or rate limits do not alter that approved calendar snapshot or web publication; record a separate delivery `not_before` instant and reason. Moving the study itself to a different date/time requires plan and dependent-content reapproval. Product owners may choose content-only approval later, but must change this policy consistently before implementation.

Plan payload schema version 1 includes title, primary Scripture, learning objective, outline/key points, discussion question and optional notes, plus typed extension sections. Required fields may remain empty during Draft; submission validates completeness. Content payloads independently include approved member-facing title/body, reflection, discussion, application, references and any outbound preview. Do not let a mutable template or generated SMS preview change approved member-facing words after review.

## Alternatives

| Option | Benefit | Cost / decision |
| --- | --- | --- |
| Shared schema + RLS | One migration path and affordable pilot | Recommended; needs policy coverage and pooling tests |
| Schema per church | Easier namespace inspection | Migration and connection complexity; weak isolation if runtime can access all schemas |
| Database per church | Smaller logical blast radius and independent restore | Consider contracted isolation/residency tiers; more operational work |
| Document database | Flexible generated payloads | Cross-record approval and scheduling invariants become harder; retain JSON payloads inside relational constraints |

## Dependencies, risks and open questions

Dependencies: canonicalization specification, identity/membership service, command transaction layer, key management, timezone library, migration role separation and source retention policy. The SQL demonstrates structural constraints and revision immutability; role grants, transition procedures, revocation validation and command-level approval checks must still be implemented.

Risks: hot tenants, forgotten secondary stores, source PII copied into revisions, restored deleted data, and unbounded event growth. Partition engagement by time only after measuring; index `(church_id, parent_id)` lookups before scale testing. Immutable does not mean exempt from erasure: privileged, audited retention workflows may purge whole aggregates, keys and payloads while retaining nonpersonal tombstones.

Open questions: one dated plan per day or per audience; multiple sermons per series; translation independence; whether source changes require plan reapproval; contracted dedicated databases; minimum analytics retention; and exact legal bases by jurisdiction. Resolve cardinality and approval invalidation policy before production migrations.

Diagrams: [study lifecycle](diagrams/study-lifecycle.mmd), [trust boundaries](diagrams/data-flow-and-trust-boundaries.mmd).
