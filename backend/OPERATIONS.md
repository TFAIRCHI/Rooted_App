# Local operations evidence and runbook

The objectives in `research/04-nonfunctional-requirements.md` and
`research/17-testing-observability-and-operations.md` remain proposed targets.
This drill measures local API capacity and logical recovery with native PostgreSQL.
It does not establish cloud availability or regional disaster recovery.

## Reproduce

From the repository root, with dependencies installed and PostgreSQL 17 running:

```powershell
node --test backend/tests/operations/load-check.test.mjs
node backend/scripts/load-check.mjs --run
```

The performance command is deliberately explicit and separate from normal unit
tests. It exits 0 only when the complete envelope, all latency targets, zero
request errors, restore checks and cleanup succeed. Exit 1 means a target was
missed or a check failed; exit 2 means the hard deadline expired. Never convert a
nonzero result into release evidence by skipping assertions or lowering the load.
Without `--run`, it prints usage and performs no database work.

Defaults: 20 tenants, 500 fictional opted-in members each, two staff roles
(contributor and independent approver), three approved study occurrences per
tenant, plus one future occurrence per tenant for recovery. Each tenant has two
independent draft save chains, both exercised by its contributor. The measured
load is 2,000 simultaneous authenticated reads, 40 concurrent save chains with
five saves each, and 40 due publications; then a separate 2,000-public-read burst.
All commands, approvals, CSRF, ETags, idempotency, membership and tenant checks
execute through the actual Fastify API using the existing `Database` pool of 12
connections and `gather_runtime`. Fixture sessions are inserted directly; OIDC
issuance is outside this measurement. There are 2,000 distinct member sessions.
The other 8,000 members and their consent rows remain in the database.

Each reader owns one preconnected HTTP/1.1 keepalive socket. Socket setup occurs
in batches of 40 before measurement, avoiding an OS accept-backlog connection
storm. The 2,000 requests are then launched together without a concurrency cap
or retries. Read and save timings include client dispatch, API/database work,
response transfer and JSON parsing. p95 uses nearest rank and strict `<500 ms`
reads / `<1,000 ms` saves. Errors fail the metric; timings include failed attempts
when there are errors, so consult error counts before interpreting percentiles.

Publication uses the real local worker with a controlled due clock. All 40 due
occurrences must become API-visible and p95 visibility must be `<60,000 ms`.
Visibility is measured after the complete worker sweep, conservatively assigning
each tenant's observed time to its two new occurrences. Actual scheduler polling,
clock skew, queue transport and provider submission latency are not measured.

The client, API and database share a host. Other local agents/processes can affect
results. Repeat on the intended deployment hardware before making capacity
commitments; retain every result, including failures. Sustained traffic, noisy
tenants, AI backlogs, 10,000-recipient provider bursts and starvation remain
additional tests. Mobile LCP and browser rendering are outside API latency.
Both authenticated and public requests hit Fastify and PostgreSQL directly;
there is no CDN or HTTP response-cache layer in this measurement. Warm database
pages and preconnected sockets are allowed and disclosed. Backend read capacity
does not measure Next.js SSR, browser cache behavior, asset loading or mobile LCP.

## Safety and configuration

The administrator defaults to `postgres://postgres@127.0.0.1:54329/postgres`.
`OPERATIONS_ADMIN_URL` may specify a different local port; only `postgres` on
literal IPv4 loopback is accepted and URL query options are rejected. The supplied
database path is discarded. Every run creates unique `gather_load_<24 hex>` and
`gather_restore_<24 hex>` databases. It never selects, migrates, seeds or drops
`gather` or `gather_test`. Cleanup drops only exact names successfully created by
that invocation, without FORCE or terminating unrelated connections.

The preexisting `gather_runtime` must have LOGIN and no superuser, RLS bypass,
create-role or create-database privilege. Its fixture password is
`gather_local_development`. The existing migrator is reused with a narrow,
temporary client adapter: the exact expected shared-role ALTER statement is
suppressed, unexpected role provisioning fails, and all other migration SQL and
grant logic execute unchanged in the new database. Runtime authentication and
nonownership are verified. The shared role's complete catalog record, including
its password verifier, is compared before and after without logging it.

External services are disabled after configuration loads, fetch rejects outbound
HTTP, no provider worker is invoked, and the API binds only to loopback. The drill
does not need real phone numbers, provider accounts, cloud storage or credentials.

Optional arguments: `--readers=1..4000`, `--rounds=1..20`, `--timeout=30..900`
(seconds; default 300), `--keep-databases`. A reader count below 2,000 always fails
the complete-envelope gate even if latency is low. Tests remain bounded; the hard
deadline writes a report and exits. After interruption or timeout, inspect the
reported names and remove only those exact disposable databases when no clients
remain. `--keep-databases` is for investigation and requires manual cleanup.
Set `OPERATIONS_PG_BIN` to the PostgreSQL executable directory if needed; Windows
defaults to `C:/Program Files/PostgreSQL/17/bin`, other platforms use PATH.

## Backup and restore drill

Artifacts are written under `backend/tests/operations/results/<run id>/`:
`report.json`, `database.dump` (custom pg_dump archive), and `sources.json`.
They contain fictional fixtures, session records and source text; operational
backups of real data require restricted access and a defined retention policy.
Generated dump/source payloads are excluded from version control. Reports include
hardware, load, error counts, p50/p95/max, table hashes, archive/source hashes,
cleanup and independent capacity/recovery outcomes.

The drill quiesces requests, fingerprints every public table's sorted full rows,
exports the exact embedded source payloads with rights and provenance, and takes
a consistent logical database snapshot. It restores with `pg_restore
--exit-on-error --single-transaction` into a newly created database, retaining
owners/grants/RLS. It compares every table count and SHA-256 fingerprint, source
snapshot bytes, and every revision's canonical SHA-256. This comparison includes
approval references/hashes, consent/suppression state, privacy requests, provider
records and pending outbox/schedules when present. It verifies FORCE RLS, runtime
nonownership, zero source rows without context, and source isolation across all
20 tenants. It recovers the 20 pending occurrences using the restored worker,
repeats the sweep to reject duplicate effects, and checks authenticated restored
API reading for every tenant before considering recovery complete.

Currently source payloads are embedded JSON in PostgreSQL; source recovery here
is therefore meaningful for that implemented storage model. The independent
sidecar/hash confirms exact source recovery, but does not simulate an external
object store. Logical recovery duration starts immediately before creating the
restore database and ends after validation. Backup duration is reported
separately. This is a quiescent snapshot drill, with no WAL/PITR or regional RPO
measurement; a fast local restore cannot prove the proposed 15-minute RPO or
four-hour regional RTO.

## Incident procedures and remaining proof

1. Database outage: stop worker claims and writes, declare the incident and record
   the time; restore/promote into isolation. Keep outbound communications blocked
   until hashes, approvals, tenant boundaries and source references validate.
2. Recovery: choose a complete database/source point, restore required object
   versions and keys, and compare counts/hashes with the backup manifest. Replay
   an independently retained erasure/suppression ledger through the recovery
   cutoff before exposing data. This local fixture has no post-snapshot erasure
   ledger and does not prove that replay process.
3. Lost queue: sweep persisted pending schedules and replay eligible outbox work.
   Validate uniqueness by repeating the sweep. Already approved, unchanged web
   schedules can catch up within 15 minutes; older/mutated/late-approved work
   requires staff action. Do not blindly retry an ambiguous external send.
4. Provider outage: stop submissions, preserve intent, reconcile accepted IDs and
   callbacks, recheck consent/suppression before resuming. Provider recovery is
   separate from the local web publication evidence.
5. Bad deployment: stop workers, revert compatible code and use expand/contract
   migrations. Do not rewrite approved immutable revisions to repair behavior.
6. Tenant disclosure: isolate affected paths, revoke access as appropriate,
   preserve scoped evidence and escalate to the incident owner immediately.

Before production commitments, provision and demonstrate monitored WAL/PITR,
daily snapshots and retention (research proposes 35 days), separate backup
permissions/storage, external source/object version and encryption-key recovery,
independent deletion-ledger replay, multi-instance/failure-domain recovery, DNS
and identity access, real transaction-pool behavior, provider reconciliation and
delivery throughput. Record regional incident declaration through validated
reopening for RTO, and the last complete DB/object recovery point for RPO.
The 99.9% rolling-30-day availability objective needs deployed monitoring and
elapsed operational evidence. Monthly isolated restores, quarterly regional
drills, and manual accessibility/doctrinal reviews still require owners and
execution; this command cannot substitute for them.

## Measured evidence

Latest complete run: `results/96942dba2b4545b697b044e0/report.json`, on native
PostgreSQL 17.2 and Node 24.11.1. A fresh database applied all six migrations,
including privacy/tombstones and canonical-v2 revision source snapshots. Restored
`schema_migrations` contains six rows with the same full-table fingerprint.

| Measurement | Actual | Objective | Outcome |
| --- | --- | --- | --- |
| Authenticated read p95, 2,000 readers | 2,617.29 ms | <500 ms | Missed |
| Public read p95, 2,000 readers | 1,407.63 ms | <500 ms | Missed |
| Save p95, 200 saves / 40 chains | 2,752.61 ms | <1,000 ms | Missed |
| Publication visibility p95, 40 occurrences | 4,093.33 ms | <60,000 ms | Met locally |
| Logical backup | 865.20 ms | Recorded separately | Completed |
| Restore and validation | 2,352.50 ms | Local drill only | Passed |

All 4,000 reads and 200 saves completed without request errors. Every table/source
hash, 20-tenant RLS and authenticated restored API check, recovery of 20 pending
occurrences, duplicate replay, unchanged runtime role and owned-database cleanup
passed. The command correctly exited 1 (`targets_missed`). This is measured
recovery evidence with failed capacity targets; it must not be a green release
gate. Four focused safety/statistics tests and ESLint passed.

Earlier reports are retained: initial fixture authorization failure, a
cold-connection burst with socket failures, and subsequent error-free runs.
The assignment fixture was corrected and reader connections are now staged as
documented. Shared-host contention makes individual runs variable; no latency
target or reader requirement was relaxed to obtain a pass.
