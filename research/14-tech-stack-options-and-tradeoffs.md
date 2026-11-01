# Technology options and tradeoffs

**Needed:** A stack a small team can operate while enforcing transactional publication and tenant isolation. **Recommendation:** Modular monolith first; independently run its worker from the same repository and shared domain contracts. These are candidate technologies, not a production dependency selection.

| Layer | Candidate A: managed containers | Candidate B: serverless | Tradeoff / recommendation |
|---|---|---|---|
| UI | React + TypeScript; SSR member routes and interactive staff UI | React/TypeScript framework on managed frontend host | Both viable; approved member HTML should render without waiting for client JavaScript |
| API | Node.js/TypeScript modular API in managed container | TypeScript functions with managed gateway | Containers simplify transaction lifetime and long operations; functions simplify sporadic scale but require pool/timeout discipline |
| Database | Managed PostgreSQL with PITR and RLS | Managed PostgreSQL with connection proxy | Same integrity model; avoid unmanaged database operations during MVP |
| Files | Private S3-compatible object storage, signed authorized access | Managed object storage | Isolate quarantine from ready assets; pin asset versions |
| Work | Managed queue + dedicated worker | Managed queue + functions / container jobs for long transcription | Long media tasks favor worker jobs regardless of API deployment |
| Authentication | Managed OIDC provider + app memberships | Same | Provider handles identity; application owns tenant roles, invitations and revocation |
| AI | Narrow adapter to evaluated provider | Same | Selected-source prompt first; optional retrieval later |
| SMS | Twilio API adapter as first technical candidate | Clearstream church-owned API as alternative | Twilio offers explicit programmatic controls; Clearstream may reduce church operational effort; validate account/sender model |
| Telemetry | OpenTelemetry-compatible traces/metrics plus hosted logs | Host-native telemetry plus portable trace IDs | Redact message/sermon bodies; avoid vendor-specific domain events |

**Recommendation hosting posture:** Choose one cloud and region after residency/budget discovery; use managed app/container service, database, storage, queue and secrets. AWS, Azure and other managed platforms are possible; this research does not claim identical features or current prices. Keep concrete hosting SKU and region **Unknown** until infrastructure quotes and restore tests exist.

## Architecture alternatives

**A — Modular monolith with worker (recommended):** Editorial, membership, ingestion, AI requests, publication and delivery are modules sharing PostgreSQL. A transaction can atomically record publication and outbox. One deployable API and one worker are easier to trace and migrate. Risks: shared failure domain and a need to enforce module boundaries; mitigate with workload queues, process separation and resource limits.

**B — Serverless API and managed event workers (viable):** Useful for low steady usage with sharp bursts. API is stateless, managed queue handles execution. Risks: cold starts, provider quotas, database connection pressure, long media timeouts, distributed tracing and local reproducibility. Require a realistic burst/connection test and pricing simulation before choosing it over A.

**C — Microservices (defer):** Separate teams could own ingestion, editorial, publication, identity and messaging. Benefits are independent scaling/deployment and blast-radius control. Costs include distributed authorization, schema/event evolution, cross-service approval consistency, additional CI/CD and incident coordination. Trigger reconsideration when measured scaling or team ownership cannot be served with separate workers from the monolith; tenant count alone is insufficient.

**D — BaaS-heavy prototype:** Can demonstrate member sign-in and simple tables quickly, but direct client data access increases the importance of policy correctness. Prefer service-mediated editorial mutations so approval and schedule rules remain atomic. This option remains viable if the team proves RLS, export, backup and migration requirements.

## Decision criteria

Weight: integrity/isolation 30%, team operational familiarity 25%, delivery speed 20%, predictable pilot cost 15%, portability 10% (**Assumption**; stakeholder weights pending). Reject any option that cannot meet invariant tests regardless of weighted score. Do not turn qualitative scores into false measured performance.

Dependencies: team skills, cloud account, auth provider region and MFA capability, budget, expected volume, legal/data-processing review. Risks: framework churn, coupled UI/API upgrades, provider-specific scheduled messages creating a second scheduling authority. **Recommendation:** App database remains schedule source of truth; provider scheduling disabled for MVP. Unknown: chosen vendors and pricing plan, billing/payment processor and tenancy pricing; defer billing until pilot demand is established. [07](07-system-architecture.md) specifies containers, trust boundaries and contracts; [20](20-decisions-and-architecture-decision-records.md) records provisional decisions.
