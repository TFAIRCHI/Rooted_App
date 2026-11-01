# Gather backend

TypeScript/Fastify modular monolith on Node24 and PostgreSQL17. API and independently runnable worker share transactional domain code. The local OIDC fixture issuer implements authorization code + PKCE, consent, signed ID tokens and JWKS; it is explicitly forbidden in production. There is no persona-to-session authentication bypass.

## Run locally

Root owns dependency installation and orchestration. Copy the root environment example to `.env` using the root setup instructions, then run these from the repository root:

```powershell
npm run db:start
npm run db:migrate
npm run db:seed
npm run dev
```

Native local database setup, backup and restore commands: [LOCAL_DATABASE.md](LOCAL_DATABASE.md). The default database listener is `127.0.0.1:54329`; databases are `gather` and `gather_test`. Browser/application origin is `http://127.0.0.1:3000`, API is `:4000`, local issuer is `:4010`. Use127.0.0.1 consistently for cookies and callbacks. Fictional fixture users are contributor, pastor, admin and member. Admin alone has Riverside membership. Seed is idempotent and rejected in production; it does not create live scheduled sends.

Individual processes:

```powershell
npm run dev --workspace @gather/backend
npm run auth:dev --workspace @gather/backend
npm run worker --workspace @gather/backend
```

## Database and configuration

`DATABASE_URL` must authenticate as `gather_runtime`, which is a nonowner login without superuser, role-creation, database-creation or RLS-bypass privileges. `MIGRATION_DATABASE_URL` is a separately privileged operational connection. `RUNTIME_DATABASE_PASSWORD` is required when provisioning; production passwords require at least24characters. The migration runner creates a missing runtime role and rejects unsafe existing role attributes; it does not silently rotate an existing credential. Configure local role credentials through the root environment example; no production password is embedded in source.

Migrations are numbered additive SQL files with stored SHA256 checksums. Editing applied history fails. Every tenant table forces RLS with composite church foreign keys. Transactions set tenant/actor context and resolve current application-owned permissions; pooled contexts reset at commit/rollback. Runtime cannot change schema, truncate, disable RLS or alter immutable history. Startup/readiness reject privileged roles, owner connections, stale required schema and disabled tenant isolation. Narrow control-plane lookups expose church memberships, public church IDs and worker tenant IDs rather than a generic cross-tenant content bypass.

Other server environment:

| Variable | Local default / requirement |
| --- | --- |
| `APP_ORIGIN` | `http://127.0.0.1:3000` |
| `OIDC_ISSUER` | `http://127.0.0.1:4010` |
| `OIDC_DISCOVERY_URL` | Optional metadata URL; defaults to `OIDC_ISSUER` + `/.well-known/openid-configuration`. For Entra customers use the named tenant hostname here and retain the exact metadata issuer in `OIDC_ISSUER`. |
| `OIDC_CLIENT_ID` | `gather-local` locally; explicit confidential client in production |
| `OIDC_CLIENT_SECRET` | Required for production identity provider |
| `OIDC_CALLBACK_URL` | `${APP_ORIGIN}/api/v1/auth/callback` |
| `PORT` | `4000` |
| `DATABASE_POOL_MAX` | `12`; bounded2–40 per process, budget total connections |
| `EXTERNAL_SERVICES_ENABLED` | Disabled by default; additional provider-specific activation and rights gates apply |

Root `.env` is loaded only outside production. Production requires HTTPS application and issuer origins, rejects loopback identity/application configuration, uses Secure cookies and requires MFA claims. Actual external issuer/MFA interoperability and operational deployment hardening remain environment-specific gates.

## Contracts and integrity

[API.md](contracts/API.md) defines the canonical `/v1` routes and normalized DTOs. [ONBOARDING.md](contracts/ONBOARDING.md), [COMMUNITY.md](contracts/COMMUNITY.md), [PRIVACY.md](contracts/PRIVACY.md), and [PROVIDERS.md](contracts/PROVIDERS.md) describe the additional workflows. Authoritative payload schemas live in `contracts/payloads.ts`; root contract generation/check commands keep the frontend type artifact synchronized without importing backend implementation into the browser.

`buildApp({database?,settings?,clock?})` in `src/app.ts` builds the server without opening a listener. Production entrypoint is `src/server.ts`. Cookie sessions are opaque, stored hashed in PostgreSQL, HttpOnly/SameSite and CSRF protected. Tenant membership is rechecked on requests; administrative grants do not imply approval or publication. Assigned authoring, distinct author/reviewer, independent plan/content decisions and explicit publisher capability are enforced server-side.

Revision payloads are immutable and hashed over sorted canonical UTF8 JSON containing tenant, aggregate, author, revision number, approved calendar, source snapshot and plan dependency. Approval foreign keys bind exact hashes and parent relationships. Edits make a new Draft, revoke future readiness and cancel unsent schedules/intents in the same transaction. An earlier published pointer remains stable. Strong ETags reject missing/stale preconditions with428/412. Atomic idempotency caches successful command responses and serializes concurrent duplicate keys.

Publication rechecks current heads, approved plan/content dependencies, and current approver/publisher grants under deterministic row locks. Membership revocation and publication serialize. Publication, live pointer and durable outbox commit together; per-schedule uniqueness deduplicates database effects. Notification/provider delivery remains separately visible and does not imply carrier delivery. The background scheduler catches up only unchanged approved occurrences within fifteen minutes, while an explicit contributor publish command delivers the approved snapshot immediately regardless of the planned calendar time.

Provider adapters, ingestion controls, source review, AI proposals/selective adoption, read-only Planning Center sync, consent/suppression, delivery reconciliation and disabled defaults are documented in [integrations/README.md](src/integrations/README.md). Tests use local HTTP stubs, not fabricated external proof. Audio inspection, authorized Scripture quotation rights, live credentials, sender registration, legal/country review and church editorial evaluation remain explicit gates.

## Build and verify

```powershell
npm run lint --workspace @gather/backend
npm run typecheck --workspace @gather/backend
npm run test:unit --workspace @gather/backend
npm run test:integration --workspace @gather/backend
npm run build --workspace @gather/backend
npm run start --workspace @gather/backend
npm run start:worker --workspace @gather/backend
```

Build copies SQL migrations into `dist/migrations`; compiled migration entrypoint is `node backend/dist/src/infrastructure/migrate.js` from the root with operational environment supplied. The source migration/seed/local-issuer entrypoints also work as compiled `.js`. No production startup automatically seeds or uses privileged migration credentials.

Unit tests cover canonical binding and pure provider/time/security contracts. Real PostgreSQL tests cover forced RLS, pooled context reset, migration upgrades/history tampering, real OIDC code/PKCE sessions, CSRF, capability denial, concurrent idempotency, immutable publication, stale moderation, onboarding, privacy cleanup and publication/revocation locking. Editorial and provider suites create unique owned databases and remove only those databases; root browser tests use the separately orchestrated test stack. Tests do not establish live provider approval, blanket legal compliance, manual accessibility conformance, capacity or disaster recovery. See [OPERATIONS.md](OPERATIONS.md) and the root phase evidence for measured results and outstanding gates.

Identity token validation uses a fixed 30-second clock tolerance for expiry/not-before comparisons. Signature, algorithm, issuer, audience and required-claim validation remain mandatory; callback nonce and contributor MFA checks are applied separately.
