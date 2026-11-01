# Development readiness — build 1.1.1

Status: **Phase 0 Complete; phase 1A In Progress.** G0 passed at 2026-10-19T02:26:02.349Z with its actual fingerprint in the [phase-0 report](../BuildPrompts/1.1.1/evidence/phase-0.md); [phase-1A evidence](../BuildPrompts/1.1.1/evidence/phase-1A.md) records outstanding application checks. Root package version is 1.1.1 and exposes the prescribed commands. Main reports corrected dependency installation and audit total 0 vulnerabilities; application build/runtime/security gates remain incomplete. Main agent owns root manifests/scripts/test orchestration and generated `BuildPrompts/1.1.1/evidence/automated/**` reports; this assignment owns manual phase reports, tracker and docs.

## Candidate local environment

The workspace is Windows/PowerShell at `C:\Users\tyler\Documents\MyChurch`. Observed supported runtime: Node 24.11.1, npm 11.6.2. Selected frontend: Next.js 16.4.2, React/React DOM 19.3.1, TypeScript 7.0.2. Selected backend: Fastify 5.12.7, pg 8.23.1, oidc-provider 9.12.2, jose 6.2.12, zod 4.6.7, tsx 4.23.15. Frontend tests use Vitest 5.0.5/jsdom 27.4.0; browser runner Playwright 1.64.1; backend tests use Node through tsx. The current G1A gate records passing lint, typecheck, unit, integration and production-build checks at the versioned [phase evidence](../BuildPrompts/1.1.1/evidence/automated/phase-1A.json).

Docker daemon is absent. Native PostgreSQL binary `C:/Program Files/PostgreSQL/17/bin/initdb.exe` is confirmed. Main reports PostgreSQL 17.2 running at 127.0.0.1:54329 using `.local/postgres`, with `gather` and `gather_test` databases; DB agent reports three persistence/backup/restore tests passed and documentation in `backend/LOCAL_DATABASE.md`. Full application migrations/grants/runtime-role/session tests remain G1A work. Local identity uses actual oidc-provider protocol validation rather than the former Keycloak candidate. Selected local storage is backend-private filesystem; durable jobs/outbox use PostgreSQL with versioned SQL migrations through pg. Node ICU/IANA support resolves calendar intent; scheduling tests must establish gap/overlap behavior. Production equivalents and cloud hosting remain unresolved. Main owns local environment configuration; no external keys exist or are invented.

Use two fictional churches, distinct member/contributor/approver/admin identities, and controlled time. Example slots are October 19/21/23, 2026, 08:00 America/New_York. Ordinary tests must never trigger live sends. The [local API contract](../backend/contracts/API.md) specifies frontend `/api/v1` proxy → backend `/v1`, frontend port 3000, backend 4000 and local OIDC issuer 4010, with code+PKCE and session/capability checks. Backend alone accesses database/provider secrets. Main agent must prove configured callback/issuer/audience/session and explicit production rejection of local identity settings. External feature adapters stay disabled in production until credentials, authorization and their gates exist; references-only Scripture fallback requires no corpus key.

## Command contract

Run from repository root. These commands are **planned**, unless an actual result is recorded in the [phase report](../BuildPrompts/1.1.1/evidence/phase-0.md). Main agent implements application orchestration in phase 1A; phase 0 records the contract.

| Command | Required outcome | Current evidence |
|---|---|---|
| `npm ci --prefix research/tools --registry=https://registry.npmjs.org` | Restore existing research-only locked tooling, if needed | Not run by this assignment; main agent coordinates installation |
| `node research/mockups/source/capture.mjs` | Reproduce screenshot/prototype checks with installed Chrome | Pending main-agent run; may update research artifacts outside this assignment |
| `node research/tools/schema-check.mjs` | Reproduce representative SQL structural checks | Pending main-agent run; PGlite is not application PostgreSQL proof |
| `npm run validate --prefix research/tools` | Reproduce research package/links/diagrams/browser audits | Passed main-agent rerun: exit 0; full-package report completed 2026-10-19T02:20:04.994Z, 34 Markdown, 48 sources/119 references, 14 PNGs, 8 diagrams, 18 UI checks, zero errors |
| `npm ci` | Reproducible application workspace install from pinned lockfile | Main reports corrected second install and available lockfile; exact install command/clean lockfile reproduction not yet evidenced |
| `npm run lint` | Both source components' configured linters | Planned, not executed |
| `npm run typecheck` | Both components plus API/client compatibility | Planned, not executed |
| `npm run test:unit` | Deterministic meaningful component/domain checks | Planned, not executed |
| `npm run test:integration` | Disposable real PostgreSQL, runtime roles, two tenants, transaction/authorization failures | Planned, not executed |
| `npm run test:e2e` | Real frontend/API/database/validated test OIDC browser journeys | Planned, not executed |
| `npm run build` | Actual frontend and backend production builds | Planned, not executed |
| `npm run test:gate -- --phase <id>` | Phase checks and required regressions; nonzero for failed/required skipped/unrun checks | G1A automated gate passed; G1B automated gate passed with human review still required. Reports are under `BuildPrompts/1.1.1/evidence/automated/` |

Root lifecycle commands now declared: `npm run db:start`, `npm run db:status`, `npm run db:stop`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`, `npm run dev:frontend`, `npm run dev:backend`, `npm run dev:identity`. Their successful execution is not yet evidenced here. Worker entrypoint is `npm run worker --workspace=@gather/backend`; destructive reset must target disposable fixtures only and requires a documented command before use. Clean-environment verification records exact versions/configuration (without secrets), empty-database migration and supported upgrade, seed/reset cleanup, service readiness, runtime grants, clock/zone and browser configuration. Capture exit codes, counts, UTC times and source/lockfile/migration hashes with artifacts. Missing infrastructure produces a blocked/nonpassing result, not a passing skip. No echo-only script satisfies this contract.

## Prerequisites and blockers

| Requirement / status | Owner / next action | Gate and effect |
|---|---|---|
| Execution approval — recorded | User instruction authorizes current prompt until completed; main agent proceeds within phases 0–4 | G0 authorization satisfied; phase 5 unselected |
| Stack/tool selections — recorded; native PG17.2 running | DB agent reports local cluster and three persistence/backup/restore tests passed; main proves full application migration/roles/protocol/session/API integration | G0 decisions recorded; full G1A runtime proof outstanding |
| Research reproduction and G0 — passed | Main agent combined verifier exit 0; actual report/fingerprint recorded in phase-0 evidence; standalone historical schema/capture reports retain their original timestamps | G0 complete; research is not application acceptance; main owns subsequent source-fingerprint refresh |
| Git revision — unavailable in inspected workspace | Read-only `git status --short` returned “not a git repository”; main agent records deterministic source/lockfile/migration hashes | Evidence identification needed; Git absence does not waive gates or authorize creating a repository |
| Cloud credentials/pilot environment — unavailable | Authorized environment/account owner supplies environment and deployment approval when needed; prepare runbooks independently | G4 pilot-equivalent restore/operations proof blocked; local development may proceed after its gates |
| AI/transcription credentials and usage authority — unavailable | Provider/account owner provides authorized test setup; main agent verifies current contracts and records measured usage/failure results | G2 real-provider gate blocked; selected transcription scope cannot be silently removed |
| Translation/corpus rights — unresolved | Rights holder/church owner records authorized corpus/translation usage; use references until quotation rights and verification exist | G2 rights/citation gate; no fabricated “verified” label |
| Church doctrine/quality evaluation — pending | Church-designated reviewers adopt thresholds before reviewing consented benchmark | G2 human gate; fictional personas are not church sign-off |
| SMS account/sender/country/consent/test recipients — unavailable | Provider/account and church consent owners establish registration, lawful policy, budgets and explicit authorized recipient set | G3 real round-trip, callback, STOP and suppression evidence blocked |
| Planning Center OAuth/test church/entitlements — unavailable | Consenting church/account owner supplies authorized access; main agent verifies selected fields/scopes/events/revocation | G4 live integration blocked; independent sign-in/manual ingestion remain supported |
| Human accessibility/editorial review — pending | Designated human reviewers record device/keyboard/screen-reader/full-process outcomes and editorial understanding | G1B/G1C/G3/G4 as applicable; automation does not replace review |
| Retention/privacy/support and recovery targets — unresolved | Church/privacy/operations owners adopt jurisdiction, retention, deletion/suppression replay, support-access and RPO/RTO requirements | G1C foundations and G4 release/restore review; no unsupported availability claim |

These blockers retain original scope and gate strength. They do not require repeating already granted local-build permission. Independent research, provider discovery and test design may continue; dependent implementation waits for its prerequisite gate. See [decisions](decisions.md), [acceptance matrix](acceptance-matrix.md) and [tracker](../BuildPrompts/1.1.1/PHASE_TRACKER.md).

## Resumed build status — 2026-10-19

Current automated evidence records 13 frontend unit tests, 24 backend unit/integration tests, 4 operations tests, 32 integration tests, 4 browser tests, passing lint/typecheck/build, and stable source fingerprints for G1A/G1B. Human accessibility/editorial review, live provider credentials, authorized church pilot, and capacity targets remain open.

Current backend declares `eslint src tests`; TypeScript-only lint is no longer its configured command. Calendar helper implementation now uses pinned Luxon 3.7.2 (`@types/luxon` 3.7.6), with ICU/IANA underneath, and actual local DST/window/segment test definitions. Provider API/worker contract is now documented in `backend/contracts/PROVIDERS.md`; these are disabled-by-default adapters and local HTTP-stub contracts, not verified live integrations. Handwritten frontend DTOs do not establish generated-contract compatibility.

Use [source-to-AC mapping](source-evidence.md) for concrete files/test definitions and missing deliverables, and [phase reports](../BuildPrompts/1.1.1/PHASE_TRACKER.md) for the full unchecked gates. Required later provider/human proof remains blocked; discovery and test design may continue independently while dependent phases wait for prerequisites.
