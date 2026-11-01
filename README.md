# Rooted — sermon-to-study workspace

Growing Deeper Together.

The church theme editor is available at `/theme?church=<church-id>` for members with `theme:manage` or `settings:manage`.

Build request **1.1.1**. A local full-stack implementation with separate [`frontend/`](frontend/) and [`backend/`](backend/) workspaces. Product research is preserved in [`research/`](research/README.md); approved instructions and completion gates are versioned in [`BuildPrompts/1.1.1/`](BuildPrompts/1.1.1/README.md).

**Readiness:** local development, not a deployed or production-approved service. Consult the [phase tracker](BuildPrompts/1.1.1/PHASE_TRACKER.md) and [acceptance matrix](docs/acceptance-matrix.md) for actual passing evidence and outstanding work. Test doubles are not live-provider certification. No real messages are authorized.

## Run locally

Prerequisites: Node.js 24.11+, npm, PostgreSQL 17 binaries, and Chrome/Chromium for browser tests. The native database helper discovers PostgreSQL or accepts `POSTGRES_BIN`; see [database setup and Docker alternative](backend/LOCAL_DATABASE.md). Docker being installed does not mean its daemon is running.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Copy the environment example only if `.env` does not already exist. `npm run dev` starts the isolated local database, applies migrations, seeds fictional churches, and runs identity, API, worker and frontend. Open **http://127.0.0.1:3000**. Use this host consistently; do not interchange it with `localhost`. Local logs are in `.local/logs/`. Ctrl+C stops the application processes; `npm run db:stop` stops PostgreSQL without removing its data.

For an already-running local PostgreSQL container, set `GATHER_DATABASE_MODE=external` in `.env` after creating both databases. The bootstrap then skips native cluster management. Development bootstrap accepts only the loopback `gather` database and refuses production mode before applying migrations or fictional seeds.

The database binds loopback port 54329 using local-only trust authentication. It is unsuitable for a shared or production host. `.local/` and `.env` are ignored. Do not delete `.local/postgres` to troubleshoot a startup problem.

## Fictional identities

Choose a persona on the sign-in page. The development issuer performs an actual OIDC authorization-code/PKCE exchange; persona selection is not production authentication.

| Persona | Purpose |
|---|---|
| Contributor | Create sermons/series and edit assigned plans/content |
| Pastor | Independently approve exact plan/content revisions; schedule publication; moderate |
| Administrator | Church settings, membership and integrations; **no implicit doctrinal approval** |
| Member | Read authorized published snapshots and participate when enabled |

Grace Community contains the example **“To Whom Shall We Go?” — John 6:68**, Monday/Wednesday/Friday at 08:00 America/New_York. These are configurable fixture dates, not a platform-wide schedule. Riverside is accessible only to the administrator fixture. To exercise publication after fixture dates have passed, create a new future dated slot: late approval must not bypass the approved calendar.

## Validate

```powershell
npm run db:start
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run build
npm run test:e2e
npm run test:gate -- --phase 4
```

Integration and browser suites use real PostgreSQL test data; do not run them concurrently against the same database. Browser tests start their own frontend/API/issuer on ports 3002/4102/4014, use a test-only controlled publication clock, and leave real providers disabled. The test-clock route exists only in the guarded test server, never the application server. Install Chromium with `npx playwright install chromium` if installed Chrome is unavailable; `CHROME_PATH` overrides detection.

The gate runner writes machine-readable results and redacted logs under `BuildPrompts/1.1.1/evidence/automated/`. Exit 0 means the defined gate passed, 1 means automated failure, and 2 means required human/provider evidence is missing or stale. Never edit a review record to manufacture a pass. Research tooling has its own lockfile: `npm ci --prefix research/tools`, then `npm run test:research`.

`npm run test:capacity` exercises the research's 20-church/10,000-member/2,000-reader envelope and an isolated local restore. It intentionally fails when latency targets are missed. See the [operations runbook](backend/OPERATIONS.md); a passing functional browser suite is not capacity certification. `DATABASE_POOL_MAX` defaults to 12 and is bounded to 2–40 per process: budget the sum of API, worker, migration and recovery connections before tuning. Migrations create a missing runtime role but never rotate an existing password; credential rotation is a separate privileged operation.

`npm run contracts:generate` regenerates frontend payload types from authoritative backend contracts; `npm run contracts:check` rejects drift and runs automatically during type checking. Review generated changes rather than manually editing them.

## Boundaries and configuration

- All ordinary local commands force external services off. AI, transcription, SMS and Planning Center require separately authorized accounts, secrets, rights and provider proofs; unavailable adapters must return an explicit unavailable/held status.
- Plan and devotional approvals are independent and revision-bound. Editing approved work creates a draft and invalidates pending dependent work without replacing an older live snapshot.
- Member pages fetch published snapshots on the server with no-store caching. Provider keys and database credentials belong only to the backend.
- The local issuer and fictional seed reject production mode. Production also requires HTTPS identity/app origins and confidential client credentials; this is not a substitute for deployment/security review.
- Backup commands are documented in `backend/LOCAL_DATABASE.md`. A local restore drill cannot establish managed-cloud RPO/RTO or authorize deployment.

See [development details and prerequisites](docs/development.md), [implementation decisions](docs/decisions.md), [core API contract](backend/contracts/API.md), and [version policy](BuildPrompts/README.md). A resumed request stays on 1.1.1; the next distinct approved build request increments the archived prompt patch version.
