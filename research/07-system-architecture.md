# System architecture

Status: proposed research design. No production services or deployment are implemented here.

## What, why and recommendation

Start with a modular monolith: one API deployable and one independently scaled worker deployable sharing domain packages and PostgreSQL. Modules are identity/tenancy, sermon ingestion, plan authoring, content authoring, review, scheduling/publication, engagement and audit. Module commands own writes; other modules use explicit interfaces. Object storage holds private source files. A queue accelerates background work; PostgreSQL remains authoritative for due schedules and recovery.

The API authenticates the caller, resolves tenant capabilities, establishes a transaction-local tenant context, validates a command and commits domain changes plus an outbox event. An outbox relay delivers events at least once. Consumers deduplicate within the transaction applying their effect. This avoids a database/queue dual-write gap; it does not make transport exactly once. [S23](sources.md#s23)

AI adapters receive minimized, tenant-scoped source extracts and return candidate drafts with provenance. They have no approval or publication capability. External text is untrusted input, including retrieved sermons; prompt separation and output validation reduce risk but are not authorization boundaries. [S22](sources.md#s22)

## Alternatives

| Architecture | Strength | Tradeoff / decision |
| --- | --- | --- |
| Modular monolith + worker | Local transactions, fast iteration, understandable incidents | Recommended for pilot; enforce module ownership to limit coupling |
| Serverless API/functions | Elastic request handling, low idle compute | Valid hosting option for the same modules; pooling, cold starts, runtime limits and scheduled retries need care |
| Microservices | Independent scaling and team autonomy | Defer until measured hotspots or organizational ownership justify distributed consistency and operations |

Serverless and monolith are not mutually exclusive. Choose hosting after connection-budget and load measurements. Avoid a service per entity. Extract a publication or ingestion worker first if it becomes a clear scaling or failure boundary.

## Endpoint contracts

All tenant routes start `/v1/churches/{churchId}` and require membership plus operation capability. Foreign-tenant and absent object IDs both return 404. Missing authentication is 401; known own-tenant forbidden operations are 403. Responses carry opaque strong `ETag` values representing aggregate version, including workflow, schedule and pointer changes. GETs return the version used for the next command.

| Method and suffix | Contract |
| --- | --- |
| `GET /plans/{id}` | Head, workflow, ETag, approval references and separate live-content summary |
| `POST /plans/{id}/revisions` | `If-Match`, idempotency key, `{baseRevisionId,payload}`; 201 new Draft; cancel pending schedules atomically |
| `POST /content/{id}/revisions` | Same; `{baseRevisionId,planApprovalId,payload}`; 201 independent content revision |
| `POST /plans/{id}/submit` or `/content/{id}/submit` | `If-Match`; head revision ID required; 200 In Review |
| `POST /plans/{id}/decisions` or `/content/{id}/decisions` | `If-Match`, `{revisionId,expectedHash,decision,reason}`; decision approve or request_changes; 201 immutable decision |
| `POST /plans/{id}/content` | Explicit contributor action, plan `If-Match`, `{planApprovalId,mode}`; `manual` creates a content identity and blank Draft; `ai` creates the identity plus a proposal job, not approved content; returns 201 with content ID and optional operation ID |
| `POST /content/{id}/schedules` | `If-Match`, `{revisionId,approvalId,localDate,localTime,timeZone,destinationId}`; 201 pinned schedule and resolved UTC |
| `POST /schedules/{id}/cancel` | `If-Match` for owning content aggregate; 200 cancelled or 409 dispatch already started |
| `GET /content/{id}/revision-diff?base=...&target=...` | Authorized tenant-scoped diff with plan-reference changes |
| `GET /operations/{id}` | 200 queued/running/succeeded/failed/needs_reconciliation for async generation or delivery |

Every mutating POST requires `Idempotency-Key`; keys are scoped by tenant, actor, method and normalized route. Hash request body and `If-Match`. Store response status/body/ETag with domain effects in the same transaction. Retry with the same key and request returns the committed response even when its ETag is now old; different request with the same key is 409. Concurrent identical keys serialize on the unique key. Failed preconditions do not commit command effects. Retain successful command keys for a proposed seven days; clients must not assume safe reuse afterward. Publication/delivery uniqueness is durable and independent of this TTL.

Only a current approved plan can authorize the explicit content-creation command. Creating an identity or completing a generation job never approves or publishes its content; generated output stays a proposal until adopted. Where an initial blank draft is persisted, it may contain incomplete fields but cannot submit until required content is present. The initial slot/plan identities are allocated by series management; those setup endpoints are illustrated in [03](03-functional-requirements.md).

Missing `If-Match` is 428; stale version is 412 with current ETag and authorized diff URL. A current version but illegal transition, revoked approval, stale plan dependency or dispatch conflict is 409 with a stable code. Bad fields are 422; unavailable dependencies are 503 with retry guidance. No endpoint auto-merges approval-sensitive text. Errors never include private source bodies.

## Publication transaction and delivery boundary

1. Claim a due schedule using a lease and `FOR UPDATE SKIP LOCKED`; lock the plan and content in the common order plan → content → schedule. Check tenant, heads, approvals, plan dependency, cancellation and due instant.
2. In one database transaction insert publication keyed uniquely by schedule, update live pointer, and insert outbox. On crash before commit nothing happened; after commit a retry reads the existing publication. This is exactly-once **database effect** under the uniqueness and transaction assumptions.
3. For email/SMS, create a durable delivery record keyed by publication, channel and recipient token. Record dispatch authorization before calling the provider. Use stable provider idempotency tokens where supported. Never hold database locks during a network call.
4. Timeout after send means `Unknown`, not `Failed`. Reconcile by provider request ID/idempotency lookup or webhook before retry. If unsupported, require operator disposition; never blindly resend an ambiguous SMS. There is no guarantee of exactly-once SMS delivery. Duplicate provider callbacks are deduplicated by tenant/provider/event ID.

An edit committed before dispatch authorization cancels the pending send. A send authorized first may finish after an edit; the UI reports already-dispatching recipients. Web publication and external delivery are distinct effects and timestamps. The current published pointer survives a replacement draft; it advances only on the replacement's approved publication.

## Time, dependencies, risks and questions

Illustrative schedule only: Monday October 19, Wednesday October 21 and Friday October 23, 2026 at 08:00 `America/New_York`, each resolves to 12:00 UTC. Store local intent, IANA zone, resolved instant and resolver version. Reject nonexistent local times and ask for explicit offset choice for ambiguous times. Timezone changes do not silently move existing schedules; preview and confirm replacements.

Explicit calendar-policy recommendation: the plan approval binds the intended study date and publication wall time/zone through its revision snapshot. `/content/{id}/schedules` must match that approved intent. A calendar change creates a new plan revision and requires dependent content approval before scheduling. A quiet-hours/provider deferral instead changes only delivery `not_before`, with an audited reason; it does not move the study's approved web publication or require doctrinal reapproval. The delivery schema keeps this operational instant separate from `schedule.due_at`.

Dependencies: managed PostgreSQL/PITR, private object storage, identity provider, queue, secrets, approved AI provider and selected delivery providers. Risks: queue duplication, pool starvation, long AI calls, provider outages, leaked signed URLs and noisy tenants. Keep network calls outside database transactions; tenant quotas bound ingestion and generation. UI targets WCAG 2.2 AA, especially accessible conflict dialogs, review diffs and schedule confirmation. [S21](sources.md#s21)

Open questions: hosting vendor, residency, provider reconciliation APIs, expected peak tenant count, language support and cancellation behavior after partial recipient dispatch. Load and failure tests decide sizing, not this proposal.

Primary diagram inventory: [system context](diagrams/system-context.mmd), [containers](diagrams/container-architecture.mmd), [study lifecycle](diagrams/study-lifecycle.mmd), [plan approval](diagrams/plan-approval-state-machine.mmd), [content approval](diagrams/content-approval-state-machine.mmd), [data flow and trust boundaries](diagrams/data-flow-and-trust-boundaries.mmd), [ingestion](diagrams/ingestion-sequence.mmd), [publishing](diagrams/publishing-sequence.mmd).
