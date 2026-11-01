# Phase 1A — Foundation and tenant boundary evidence

Build prompt: **1.1.1**. Status: **Complete**. Gate: [G1A](../TESTING_GATES.md#g1a--foundation-and-tenant-boundary). Completion timestamp: **2026-10-19T19:24:14.526Z**. The complete automated gate passed at the recorded fingerprint.

## Authorization and prerequisite

Existing user approval covers phases 0–4; exact quotation and unchanged product scope are in the [tracker](../PHASE_TRACKER.md). Prerequisite [G0 passed](phase-0.md) at 2026-10-19T02:26:02.349Z, fingerprint `426c6757347bcfb0221a581f4088acae8efd738fb2b58ff5b220830b3565bc64`. No repeated execution permission is needed. Deployment and live member messaging remain unauthorized; phase 5 remains deferred.

## Environment and current evidence

Windows/PowerShell; observed Node 24.11.1/npm 11.6.2. Selected exact framework/dependency versions and local strategy are in [development](../../../docs/development.md) and [decisions](../../../docs/decisions.md). Main reports a corrected second npm installation, jsdom 27.4.0, removal of the incompatible/vulnerable Next ESLint development dependency chain, an available lockfile, and audit total 0 vulnerabilities. Exact install/audit command logs, counts and final dependency fingerprint have not been supplied here; these observations do not close G1A.

Main reports native PostgreSQL 17.2 running at 127.0.0.1:54329 in `.local/postgres`, databases `gather` and `gather_test`, and three DB-agent persistence/backup/restore tests passing. Those tests establish bounded database behavior and do not establish application migrations, least-privilege runtime RLS, tenant/session authorization, full backup recovery or all G1A requirements. Local oidc-provider protocol validation is selected; authentication bypass is forbidden. External adapters remain disabled for production until authorized credentials and relevant gates exist.

| Field | Current value |
|---|---|
| Phase started | Opened after G0 pass; separate implementation start timestamp not supplied |
| G1A tested revision/fingerprint | `a5f29e02fd7527e6a91e77ecc143e36bfc1cb8bd178aa3c90cc74ee56ca5cb57` |
| G1A test execution/completion time | 2026-10-19T19:24:14.526Z |
| Provider mode | Local/test only; no cloud/live-provider credentials |
| Primary AC ownership | AC13–AC14; infrastructure foundations AC27–AC29; see [matrix](../../../docs/acceptance-matrix.md) |

## Entire required G1A scope and gate

All boxes remain unchecked until actual integrated evidence exists, even where implementation or an independent database test has begun.

- [ ] Clean documented setup starts the real frontend, backend API, worker entrypoint, PostgreSQL and selected local dependencies. Both source components build/typecheck/lint, and CI runs meaningful tests.
- [ ] Migrations apply to an empty database and upgrade the supported prior schema; grants separate migrator/owner and nonowner runtime. No production login has migration/superuser/BYPASSRLS privileges.
- [ ] Authentication validates issuer/audience/session/protocol correctly; expired/revoked sessions and revoked memberships fail. Role/invitation escalation and unassigned contributor actions are denied. Test identity configuration cannot silently activate in production.
- [ ] Seed two churches and distinct member/contributor/approver/admin users. Multi-church switching checks active membership; church admin cannot automatically approve doctrine; platform admin has no implicit private content read.
- [ ] Real runtime-role tests cover RLS reads/writes, composite cross-tenant foreign keys, missing tenant context, tenant reassignment and pooled connection reuse after commit/rollback/error. Never test all isolation as the table owner.
- [ ] Direct API authorization tests cover guessed foreign IDs and stable nonleaking errors. Storage URLs, cache keys and initial job payloads are tenant-bound; add tests as each store is introduced.
- [ ] Contracts/version preconditions and error envelopes have executable tests; generated frontend types match backend contracts.
- [ ] Secret/config validation, redaction, health/readiness and correlation IDs function. Public frontend build output contains no backend/provider secret.
- [ ] All applicable common gate requirements pass, including meaningful integration/browser negative tests, no required skipped/unrun checks, required regressions, documentation and tested-state evidence.

## Commands and results

The following are required/planned checks, not executed results. Main owns orchestration and generated `automated/**` reports; this report will link actual artifacts only after receipt.

| Command/check | Required evidence | Actual result |
|---|---|---|
| Clean lockfile installation | Exact command, versions, exit code and clean environment | Pending; corrected install reported, clean reproduction not evidenced |
| Dependency/security review | Actual audit command/report plus disposition and verification of required invariants | Main reports audit total 0; report/command details pending; security gate incomplete |
| `npm run lint` / `npm run typecheck` / `npm run build` | Both components; configured lint adequacy and API/client compatibility | Main reports component types PASS; root lint 15 provider errors under repair; build/current final logs pending |
| `npm run test:unit` | Actual test files/IDs, counts, deterministic fixtures | Main reports frontend 7 PASS and backend 24 PASS; exact executed command logs/fingerprint pending |
| `npm run test:integration` | Real PostgreSQL nonowner roles, two tenants, OIDC/session/capability negatives, pool reset paths | Pending; three independent database checks are not a substitute |
| `npm run test:e2e` | Real frontend/API/PostgreSQL/local OIDC and fresh sessions | Pending |
| `npm run test:gate -- --phase 1A` | Complete G1A checks and prior required regressions, final tested fingerprint | Pending; no generated G1A report received |

## Acceptance evidence and outstanding work

| Scenario | Required proof | Status |
|---|---|---|
| AC13 | Real nonowner runtime-role RLS and composite FK negatives, missing context, tenant reassignment, pool commit/rollback/error, guessed IDs and applicable stores | Planned / not run in supplied application evidence |
| AC14 | Protocol/session validation, expiry/revocation, active membership on church switch, denied escalation/unassigned edit/admin approval and support boundary | Planned / not run in supplied application evidence |
| AC27–AC29 foundations | Atomicity/observability/redaction/recovery configuration and later phase-specific proof retained | Planned; later full acceptance remains outstanding |

Main supplied the complete machine-readable gate report at [automated/phase-1A.json](automated/phase-1A.json). Complete-process accessibility/editorial review and later live-provider/rights/country/pilot gates remain pending or blocked as registered in [prerequisites](../../../docs/development.md#prerequisites-and-blockers); G0 and local database tests cannot satisfy them.

Latest supplied test clarification: 21 tests exercise local HTTP stubs only. Their exact command/report and scenario coverage have not been supplied to this manual report. They are not live-provider proof and do not close any required external review, production integration, complete OIDC/session test or full G1A gate by count alone. All required external/human proof remains pending or blocked.

Gate decision: **Complete; G1A automated gate passed**. Dependent phase 1B may proceed to its required review gate. No live-provider proof or human review is implied.

## Current gate refresh — 2026-10-19

The current [automated G1A report](automated/phase-1A.json) records research validation, lint, typecheck, contract verification, 13 frontend unit tests, 24 backend unit/integration tests, 4 operations tests, 32 integration tests, production builds, and a stable tested source fingerprint. The provider fixture was corrected to select a future seeded study slot so deadline assertions do not depend on the current calendar date; production deadline behavior was not relaxed.

## Resumption source review — 2026-10-19

User resumed this same build after a usage limit. Main supplied component type checks PASS, frontend 7 unit PASS, backend 24 unit PASS; root lint still has 15 provider errors under repair. Full browser and integration suites are pending; no final G1A report was received. This supersedes earlier pending-unit statements only for those supplied counts, not for full acceptance. Exact command invocation, exit codes, result artifact, runtime configuration and tested fingerprint are still needed.

Inspected actual test definitions: [six real-runtime boundary tests](../../../backend/tests/integration/runtime-boundary.test.ts), [OIDC/editorial integration tests](../../../backend/tests/integration/editorial.test.ts), [provider API/worker suite](../../../backend/tests/integration/providers-api.test.ts), [browser journeys](../../../frontend/e2e/core.spec.ts), [frontend draft tests](../../../frontend/lib/drafts.test.ts) and [editor tests](../../../frontend/components/plan-editor.test.tsx). Real-runtime tests require configured PostgreSQL and do not silently substitute SQLite/PGlite; no executed pass is inferred from their source.

Backend now declares real `eslint src tests`, replacing the earlier TypeScript-only lint placeholder. CI configuration exists in `.github/workflows/check.yml`; CI execution evidence has not been inspected. API DTOs are handwritten in `frontend/lib/types.ts`; generated schema/client compatibility still needs explicit evidence. See [all acceptance/source gaps](../../../docs/source-evidence.md) for missing later-phase deliverables. G1A remains In Progress; all gate checklist boxes remain unchecked until integrated current-state results demonstrate them.
