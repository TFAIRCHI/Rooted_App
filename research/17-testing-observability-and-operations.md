# Testing, observability and operations

## What, why and assumptions

Treat tenant isolation, approval binding and scheduling correctness as release gates. Use the common [04 load envelope](04-nonfunctional-requirements.md): 20 pilot churches, 500 opted-in members each, three studies/week, two to five editors/church and a 2,000-concurrent-reader publication burst. These are sizing assumptions, not measured demand. Include a possible 10,000-recipient due-time burst before quiet-hour deferral; measure provider throughput separately. Rebaseline before contracting SLOs.

Recommend managed PostgreSQL with PITR, encrypted private object storage, two API instances across failure domains and independently scalable workers. A queue failure should delay work while the outbox and due-schedule sweep preserve intent. [S23](sources.md#s23)

## Required validation matrix

| Area | Evidence required before release |
| --- | --- |
| Isolation | Two-tenant tests on every table/route; cross-tenant FK writes fail; tenant cache/search/object/export tests; normalized errors reveal no existence |
| Database roles/pooling | Real nonowner NOBYPASSRLS role; FORCE enabled everywhere; absent tenant context returns none; alternating tenants through one transaction-pooled connection never leak after commit, rollback or retry |
| Revisions/approval | Mutation/delete of revisions and decisions rejected; wrong hash/plan approval fails; revoked grants and approvals fail; independent plan/content revision numbers |
| Workflow | Exhaustive transition table; no plan Scheduled/Published; edit cancels pending schedules and creates Draft; old published pin remains; stale plan dependency blocks reschedule |
| Concurrency | Save/save 412, save/approve, edit/schedule, edit/publish, cancellation/dispatch, plan-edit/content-edit deadlock recovery; local buffer survives merge |
| Idempotency | Duplicate commands return original effect/response; key/body mismatch 409; crash before/after commit; key expiry cannot duplicate durable publication |
| Delivery | Relay and webhook duplication, expired leases, provider accepted-then-timeout, reconciliation without blind SMS resend, suppression checked just before dispatch |
| Time | Example Oct 19/21/23 2026 08:00 America/New_York → 12:00 UTC; DST gap/overlap, timezone changes, delayed job catch-up and clock skew |
| Security/accessibility | Revoked membership, MFA, signed URL boundaries, injection documents, webhook replay; automated and manual WCAG 2.2 AA review |
| Recovery/privacy | Restore SQL plus objects, replay deletion ledger, preserve approval hashes, rebuild queue from outbox, confirm tenant boundaries before traffic |

Use property tests for arbitrary edit/review/schedule sequences and model-based state assertions. SQL constraints are tested against PostgreSQL, not an in-memory substitute. Fault injection should interrupt every commit/provider boundary. Load tests include a noisy tenant, generation backlog and due-time bursts, with quotas preventing starvation. Manual review remains necessary for doctrinal quality and accessibility. [S21](sources.md#s21)

## Proposed SLOs and telemetry

| Indicator | Initial objective and boundary |
| --- | --- |
| Published reading availability | 99.9% over rolling 30 days after pilot stabilization; measure public and authenticated reads separately, planned maintenance counts; report dependencies separately |
| Authoring and read latency | p95 save acknowledgment under 1 second; p95 read API under 500 ms at assumed load; exclude upload/AI completion but include database time |
| Web publication timeliness | 95% within 60 seconds of due time for eligible preapproved schedules under healthy service; report all missed/blocked/late occurrences separately |
| External delivery submission | 99% authorized submissions attempted within five minutes; provider acceptance/delivery measured separately, not promised as end-to-end delivery |
| Recovery | Regional outage target RPO ≤15 minutes and RTO ≤4 hours for database plus required objects; validate with drills before promising |

API 99.9% permits about 43.2 minutes of unavailability in a 30-day window. Page on multiwindow error-budget burn, a tenant-isolation signal, missed due-schedule thresholds or an increasing ambiguous-send backlog. Treat a confirmed cross-tenant disclosure as a security incident regardless of aggregate availability. Define RPO as last recoverable complete database/object point; RTO starts at incident declaration and ends after validation and reopening.

Emit structured request/trace IDs, opaque tenant ID, command type, revision ID and outcome. Track pool saturation, query latency, approval rejection codes, queue age, outbox oldest age, due-schedule lateness, lease expirations, reconciliation age and duplicate-effect prevention. Do not put draft bodies, tokens or recipient addresses in telemetry. Avoid per-tenant metric labels at unbounded scale; use restricted logs for tenant drilldown. Audit access separately from general diagnostic logs.

## Backup, restore and runbooks

Enable continuous WAL/PITR and daily snapshots with a proposed 35-day retention. Back up object versions and key-recovery procedures; a database-only restore may produce unusable source references. Separate backup permissions and storage from runtime credentials. Monitor backup completion and recovery-point freshness; an untested snapshot is not recovery evidence.

Monthly restore drill: restore into an isolated environment, block outbound communications, verify row counts and representative hashes, assert nonowner RLS, verify object references, replay erasure/suppression ledger, and rebuild pending work. Sample multiple churches and run duplicate publication and provider-reconciliation checks before enabling workers. Quarterly simulate region loss and record observed RPO/RTO against the whole service, including key access and DNS. Delete drill environments under the retention policy.

Runbooks:

1. Database outage: pause publication claims, keep user drafts locally only under recovery policy, restore/promote and validate isolation before accepting writes.
2. Provider outage/ambiguous sends: stop blind retry, reconcile provider IDs and webhooks, quarantine unresolved sends with an owner and reason. Resume per tenant/channel after consent checks.
3. Queue loss: replay undelivered outbox and sweep due schedules; uniqueness constraints prevent duplicate database publications.
4. Bad deployment: stop workers, roll back compatible application code, use expand/contract migrations; never rewrite approved payloads to repair behavior.
5. Tenant leak: revoke relevant access, isolate affected paths, preserve minimal incident evidence, invoke scoped break-glass only if needed, and follow jurisdiction-reviewed notification procedures.
6. Missed schedules after recovery: apply the canonical [12 bounded catch-up](12-scheduling-sms-and-notifications.md): at most 15 minutes for already approved unchanged schedules; beyond it require skip or explicit future reschedule. An approval-pending missed deadline never qualifies. SMS expiry, quiet hours and reconciliation remain separate checks.

## Alternatives, dependencies, risks and questions

Alternatives: single-instance pilot is cheaper but cannot reasonably support the availability target; active-active regions reduce some outage time but complicate publication ordering and cost. Recommend one write region with tested standby recovery initially. Use managed metrics/logs with export capability rather than inventing an observability platform.

Dependencies: on-call ownership, backup retention budget, synthetic tenants, stable clock synchronization, provider test accounts and a deletion ledger available during disaster recovery. Risks: nonrepresentative restore drills, third-party outage exclusions hiding impact, retry storms, oversized tenant exports and missing object/key backups.

Open questions: contracted support hours, weekend incident coverage, real peak deliveries, exact provider reconciliation limits, region failover capabilities, stakeholder acceptance of the proposed 15-minute catch-up policy and budget. RPO/RTO/SLOs remain hypotheses until load and recovery results substantiate them.

Diagrams: [deployment boundaries](diagrams/container-architecture.mmd), [trust boundaries](diagrams/data-flow-and-trust-boundaries.mmd), [publishing recovery boundaries](diagrams/publishing-sequence.mmd). Validation of this research deliverable is distinct from the implementation release gates above.

## Research artifact validation performed

On 2026-10-18, executed `schema.sql` in an isolated temporary PGlite PostgreSQL engine. The final schema creates 24 tables; catalog inspection confirmed ENABLE and FORCE RLS on all 24. Two complete tenant chains from church through approval, schedule and publication inserted successfully. A real nonowner test role with `NOBYPASSRLS` could see only its transaction's tenant; missing context returned no rows and both commit and rollback cleared context on the reused connection.

Negative checks rejected an existing foreign-tenant parent through a composite FK, cross-tenant writes, revision update/delete, a mismatched canonical-byte hash, approval hash/reference mismatches, plan Scheduled/Published values, publication mutation and a second publication for the same schedule. SQL timezone conversion confirmed 12:00 UTC for all three illustrative October 2026 dates. These are representative relational checks, not validation of unimplemented command handlers.

Mermaid parsed and rendered all eight exact primary filenames to SVG in headless Chrome. All 17 diagram links in the five assigned design documents resolved. Initial rendering was in memory; the package validator additionally saves SVGs under `diagrams/rendered/`. No production application or outbound delivery was exercised. Source pages S20–S23 were accessed; package-wide results and reproducible commands are recorded in [validation](validation.md).

Remaining validation: deployed PostgreSQL version and actual transaction-pool behavior, production role/grant provisioning, command authorization and atomic edit cancellation, canonical JSON/reference equivalence, provider ambiguity/reconciliation, load/SLO measurement, accessibility with users, and backup/restore drills. PGlite and diagram rendering do not establish production readiness, end-to-end exactly-once delivery, security certification or legal compliance.
