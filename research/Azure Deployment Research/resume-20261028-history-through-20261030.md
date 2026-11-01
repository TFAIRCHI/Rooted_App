# Historical acceptance notes — archived October 30, 2026

This file preserves the earlier chronological resume, including superseded pending instructions. It is evidence history, not an active checklist. Use [resume-20261028.md](resume-20261028.md) for the only remaining checks and current state.

---

# Rooted testing resume — October 28, 2026

## Current checkpoint — updated October 30

**Latest:** **rooted-runtime-failures** Review + create screenshot supplied. Visible workspace resource, table rows/Count, GreaterThan threshold configuration, five-minute window/frequency, one violation, no resource split (dontSplit), Warning2, existing rooted-operations-alerts one-email action group, enable-on-create checked, estimate **$1.50/month**. Query collapsed; exact text not visually verified. Next user clicks Create and confirms success/Enabled; no runtime-failure rule creation evidence yet. Existing cap rule Enabled and email delivery already tested, so do not repeat those tests without a failure. User explicitly raised excessive testing time. Provided a fixed six-check remainder and recommended prioritizing alert + two timed checks; deferring three advanced checks was recommended but not explicitly accepted. See fixed list below. Next priorities after alert: October30 08:00 automatic publication and Contributor reverification at least eight hours after last successful sign-in (last reported within three hours, so refreshed access was expected). Managed restore/cleanup complete; cost snapshot $1.36. No extra diagnostic loops unless a listed check fails.

Asking for Wisdom completed live Azure chat/proposal, explicit adoption/refresh persistence, request changes, revision 5 approval, immediate publication, member reading and engagement reporting. Moderated discussion is enabled and approval/privacy/decline passed. Choosing Wisely passed queued worker generation and draft checks; accounting showed monthly_limit 50000, charged_tokens 8300 and reserved_tokens 0, with drafts_saved workflow and all four jobs completed. Completion is browser-local per signed-in user/study; reactions are server-recorded. API rooted-api--0000002 and worker rooted-worker--0000001 are the latest observed revisions; dedicated co-writer flags are enabled with STUDY_COWRITER_ONLY=true. Entries below document earlier checkpoints and are superseded by this current state where they differ.

Saved at the user's request after successful production contributor sign-in with the requested **30-second token clock tolerance**. Planned continuation: tomorrow, October 29, America/New_York, or the next session. Stop point: continue acceptance testing; no further cloud changes are needed tonight.

## Homepage revision prepared after this resume

Before resuming acceptance tests, review and deploy the [October 28 homepage release](../../deploy/azure/homepage-release-20261028.md): CBE stats, church-centered strengths, and the actual-screen showcase. Frontend image `pilot-20261028-3` is built locally; upload/Portal revision pending. Backend stays on accepted `pilot-20261028-3` with 30-second tolerance. This supersedes the earlier statement that no further release is pending.

## Start here next session

1. Open **https://rooted-together.com** and sign in with the working contributor account. Member and contributor tests currently use **different email addresses**. Use separate browser profiles/InPrivate windows to keep their sessions separate.
2. Show or describe the contributor's resulting page. The user reported successful login; the exact landing page, church workspace and role state have not yet been recorded. Do not assume a church was created.
3. If no church exists, continue **Create a church workspace** using the real pilot church's name, slug and time zone. If a workspace already exists, inspect it and continue there. Do not create duplicates or seed fictional production churches.
4. Follow the remaining acceptance checks below, recording actual results and stopping for concrete failures. Do not rebuild images or repeat migrations merely to resume testing.

The [CI/CD runbook](../../deploy/azure/ci-cd-process.md) describes future releases. The [historical deployment handoff](path-b-resume-plan.md) retains detailed setup evidence; this dated document supersedes its earlier pending-login/upload checkpoints.

## Current deployment

| Component | Current state / value |
|---|---|
| Public origin | `https://rooted-together.com`; homepage, HTTPS and API proxy verified |
| Subscription / resource group | Azure subscription 1 / `rooted_study_app` |
| Main application region | Central US |
| Container Apps environment | `rooted-environment-centralus`, VNet-integrated, Consumption workload profile |
| Frontend | `rooted-frontend-centralus`; `rooted-frontend:pilot-20261027-1`; external HTTP ingress target 3000 |
| API | `rooted-api`; latest accepted backend tag **`pilot-20261028-3`** by user confirmation after deployment instructions |
| Latest API revision | Requested suffix `skew-20261028-3`; verify the actual active revision name in Portal at resumption rather than treating the suggested name as a screenshot-confirmed value |
| API ingress / allocation | Internal to Container Apps environment, target 4000; 0.25 CPU / 0.5 GiB; minimum 1 and maximum 1 were retained temporarily for testing |
| Worker | `rooted-worker`; last screenshot-confirmed revision `rooted-worker--worker-20261027-1`; backend `pilot-20261027-1`; no ingress; min/max 1 |
| Worker process | Portal Console confirmed PID 1: `node dist/src/workers/worker.js`; scheduled publication still untested |
| Migration job | `rooted-migrate`, manual; last confirmed backend tag `pilot-20261027-1`; `node dist/src/infrastructure/migrate.js` |
| PostgreSQL | `rooted-postgres-centralus.postgres.database.azure.com`, PostgreSQL 17.11, B1ms, 32 GiB; database `rooted`; private networking |
| Database identity | API/worker use restricted `gather_runtime`; privileged migration credentials stay confined to migration job |
| Registry | `rootedtogethercr-dudpd0aebzeqewa2.azurecr.io` / resource `rootedtogethercr` |
| Monitoring workspace | `workspacerootedstudyapp9de7` |
| Budget | Resource-group alert budget $95/month including AI; PostgreSQL reviewed estimate $18.18/month before allowances; actual spending review pending |

API and worker images intentionally differ following API-only authentication fixes. Align the worker during a controlled later release if needed, preserving its worker command and single active consumer. Neither worker alignment nor migrations are prerequisites for resuming browser testing.

## What passed

- Private migration execution succeeded in 22 seconds; console recorded **Migrations applied**, October 28 at 01:37:39.852 UTC. No demo seed was run.
- API `/health/ready` returned HTTP 200 with `status=ok`, `database=connected`, `schema=current`, `tenantIsolation=enforced`.
- `https://rooted-together.com/api/v1/auth/options` returned `{"localIssuer":false,"demoLogin":false,"accessBasedLogin":true}`.
- Azure custom-domain status is **Secured**, with managed certificate and SNI SSL. Namecheap apex A points to **57.165.185.210**; `asuid` TXT verification was added. Preserve those records. `www` was last seen pointing to Namecheap parking and has not been accepted as a working alias.
- Member self-registration, email verification and callback succeeded. Rooted showed the signed-in user on `/onboarding?intent=join`.
- Separate contributor registration proceeded; after authentication fixes, the user explicitly confirmed contributor sign-in worked, then confirmed the requested 30-second-tolerance deployment worked.
- Latest code: TypeScript, targeted ESLint and **41 backend unit/adapter tests** passed; backend linux/amd64 image built successfully. This is not a claim that the full browser, PostgreSQL integration, capacity or cloud acceptance suite was rerun for the final tolerance change.

Latest local image ID, for provenance only (not a remote registry manifest digest):

```text
rooted-backend:pilot-20261028-3
sha256:0a187565039bf1d657e85217122aa6329787c6aeedba7520c56bb143ce132472
```

## Authentication settings to preserve

| Setting | Current required value |
|---|---|
| `OIDC_CLIENT_ID` | `f7147f69-2e1c-4752-944a-32ae3b7084f4` — includes final `4` |
| `OIDC_CONTRIBUTOR_CLIENT_ID` | `b3f1fc17-5b15-46f1-a93f-444b5b5eb77b` |
| `OIDC_TENANT_ID` | `84524f4e-0cf6-4701-b128-dae041d1c910` — Rooted Customers external tenant |
| `OIDC_SUBJECT_MODE` | `entra-oid` |
| `OIDC_ISSUER` | `https://84524f4e-0cf6-4701-b128-dae041d1c910.ciamlogin.com/84524f4e-0cf6-4701-b128-dae041d1c910/v2.0` |
| `OIDC_DISCOVERY_URL` | `https://rootedtogether.ciamlogin.com/84524f4e-0cf6-4701-b128-dae041d1c910/v2.0/.well-known/openid-configuration` |
| `APP_ORIGIN` | `https://rooted-together.com` |
| `OIDC_CALLBACK_URL` | `https://rooted-together.com/api/v1/auth/callback` |
| Token clock tolerance | **30 seconds**, fixed in backend code; no environment variable needed |

Secret references: `DATABASE_URL` → `runtime-db-url`; `OIDC_CLIENT_SECRET` → `oidc-member-client-secret`; `OIDC_CONTRIBUTOR_CLIENT_SECRET` → `oidc-contributor-client-secret`. Values remain private. Frontend `BACKEND_URL=http://rooted-api`, `ROOTED_PUBLIC_ORIGIN=https://rooted-together.com`.

Preserve `NODE_ENV=production`, `EXTERNAL_SERVICES_ENABLED=false`, `STUDY_COWRITER_ENABLED=false`, `STUDY_COWRITER_ONLY=true` until the deliberate live-AI test is prepared.

Contributor requests include `prompt=login`, `max_age=0`, and `amr` with `essential=true, values=["mfa"]`. Callback still verifies signature, issuer, audience, required claims, nonce, tenant/object identity, signed MFA and authentication freshness. The 30-second tolerance applies to token time comparisons; it does not extend contributor assurance beyond its existing eight-hour policy.

## Identity limitation still to resolve

The member account created with email OTP did not acquire a password automatically when entering the contributor flow. Entra requested another factor after OTP. The user then registered a contributor with a different email, which worked. This does **not** establish a general prohibition on one email having multiple church roles.

Member-first OTP cannot also serve as the second email factor. A supported same-object member-to-contributor enrollment path remains unproved. Do not delete accounts, merge identities by email, disable MFA or enable paid SMS to work around this. Rooted intentionally rejects upgrading an existing member session into a different contributor identity; use separate signed-out browser sessions for the two current test accounts.

## Fixed remaining checklist — clarified October 30

The user requested a concrete endpoint after substantial manual testing. Six specific checks remain in the full plan:

1. Finish the runtime-failure alert (review ready, creation success/Enabled pending).
2. Observe Remaining in Christ publish automatically October30 08:00 America/New_York and verify member visibility.
3. Verify Contributor access expires/requires reverification after eight hours and restores after verification.
4. Verify an old session cannot be replayed after logout.
5. Test recovery from zero running replicas.
6. Test recovery of an interrupted AI job.

Recommended pilot priorities are 1–3, with 4–6 recorded as explicitly unverified deferred work if user agrees. The user has continued alert setup but has not explicitly accepted deferral; do not silently mark those three passed or cancelled. Operational findings already recorded (old East US cleanup, optional www, registry admin publisher replacement, budget scope/future spend reconciliation and warning follow-up) should not grow this fixed checklist without a concrete failure or user request.

## Remaining acceptance groups — current October 30

Four groups remain: automatic scheduled publication and three operational groups. Queued AI generation/accounting and managed restore/cleanup passed. Deployment-access assessment completed with admin publishing dependency documented below. These are groups, not counts of individual actions.

| Group | Remaining evidence |
|---|---|
| 1. Scheduled publication | Observe Remaining in Christ publish automatically October 30 at 08:00 America/New_York, then verify member visibility. Manual Publish now already passed. |
| 2. Sessions | Privileged re-verification/assurance expiry and stronger logout/revocation evidence remain. Normal-browser member restart persistence, current-browser logout/re-login and membership persistence passed. |
| 3. Runtime recovery | Scale-from-zero cold start, interrupted-job recovery and appropriate scaling remain. API restart/member-page recovery passed by user confirmation; idle worker restart recovered to Ready 1/1 with saved draft/schedule intact. API endpoint health, probe rollout and one-worker configuration already have evidence. |
| 4. Monitoring and cost | 30-day default retention, 0.1 GB/day cap, saved cap-alert Enabled state and action-group email delivery passed. October reported-cost snapshot totals $1.36 across main/two managed groups; forecast unavailable and future steady spending unverified. Health/error coverage, prior autoscaler warning/live-log failure and main-group-only budget coverage remain follow-ups. |

Deployment-access assessment completed: all four resources use environment-identity image authentication with registry AcrPull grant confirmed. Admin user remains enabled because the existing Docker Desktop helper login uses registry admin username; disabling it would break current manual publishing. Replace/test publisher credentials before a later admin-disable action; no admin-disabled security claim is made. Old East US cleanup and the optional www alias are also separate follow-up decisions. Do not repeat passed authoring, review, publication, member reaction or discussion tests without a new failure/change.

## Original acceptance outline — historical, see current groups above

| Stage | Action | Evidence required |
|---|---|---|
| 1. Workspace | Inspect contributor landing; create or continue the real pilot church; confirm name, slug and time zone | Correct church and contributor/admin capabilities visible; no duplicate workspace |
| 2. Roles / invitations | Invite the existing member identity using the app's supported identity-bound mechanism; accept in member browser | Membership on the intended church; member cannot access contributor/admin actions; avoid sharing invitation tokens in chat |
| 3. Sessions | Verify member browser restart, logout/revocation, contributor re-verification and separate-account behavior | Persistent reading works, logout revokes access, contributor checks remain enforced |
| 4. AI preparation | Verify existing Azure AI endpoint, actual deployment name, supported model and per-church budget; review the two required feature flags before enabling | Real configured deployment, explicit budget and approved one-request test; no invented deployment or provider result |
| 5. Editorial flow | Make one bounded co-writer draft; review plan and content; retain human approval | Draft provenance, budget accounting and required approvals; no automatic publication inferred from generation |
| 6. Worker | Schedule an approved study, observe due publication, member reading and participation | Actual worker processing, visibility at intended time, logs and restart count; one consumer revision |
| 7. Operational checks | Verify API live/readiness probes, cold start, worker interruption recovery and scaling | Recorded recovery behavior; review API/frontend min 0 only after cold-start acceptance; keep worker min 1 |
| 8. Recovery / cost | Isolated managed PostgreSQL restore drill, monitoring retention/caps, actual cost review | Cloud recovery evidence and measured spend; local recovery alone is insufficient |
| 9. Deployment hygiene | Verify all image pulls use managed identity/AcrPull; assess disabling registry admin; review `www` if desired | Pull evidence, safe credential plan, deliberate alias setup |
| 10. Cleanup | Review old East US resources after replacement acceptance | Explicit list and user-authorized removals; preserve shared registry, AI, DNS and database dependencies |

For a new failure, capture the page/error, active revision/tag, time and relevant sanitized log. `identity_token_verification_failed` now reports failure type and numeric token timing without full tokens or identity claims. Do not share callback URLs containing authorization codes.

Original East US resources remain intentionally preserved. PostgreSQL East US support case **2610260040009884** was last known open; no new status was supplied. Central US is working; do not restart region experiments as a routine next step.

## Working agreements

- User performs Azure changes through **Portal**, with local Docker pushes. Do not switch to Azure CLI or configure automatic production deployment without a new decision.
- Keep existing private passwords and client secret values out of source, images, documents and chat.
- Preserve the fixed **30-second** tolerance unless the user requests a change.
- Continue from observed results. Avoid repeating completed uploads, rebuilding for document edits or assuming remaining pilot tests passed.

Suggested opening next session: **“Resume from resume-20261028.md. Contributor login works with the 30-second tolerance. Begin by checking the contributor landing page and real church workspace, then continue the remaining acceptance tests.”**

## Live acceptance progress after homepage work

- User created RiverFront Church - Demo, church ID b150be0c-6cb1-46b6-98ab-7b83155e685e, slug river-front-church-demo. Saved Settings screenshot confirms America/New_York, members-only reading, discussion off; Admin Fairchild can manage settings.
- Administrator created a subject-bound invitation with member role for the existing member identity; user accepted it in the member InPrivate session. Completion page identifies Tyler Fairchild and exposes member experience only. No invitation token was recorded.
- Member church page /c/river-front-church-demo loads. Opening /settings?church=b150be0c-6cb1-46b6-98ab-7b83155e685e returns to the church page: page-level administration restriction observed. Server-side denial is the next read-only test: open /api/v1/churches/b150be0c-6cb1-46b6-98ab-7b83155e685e/workspace in the same member browser and inspect the response. Do not infer all API authorization tests have passed from a redirect alone.
- Still pending: session restart/logout/reverification, contributor/reviewer grants and editorial flow, live AI, scheduling/worker, recovery and operational tests.

## Member restrictions and session checks completed

Member workspace API returned mfa_required, then unauthenticated after Sign out. User signed back in through Member sign in and the church membership persisted without another invitation. These establish live workspace denial and current-browser logout behavior; a separate old-cookie replay/revocation check and normal-browser restart persistence are not yet proved.

Administrator membership screenshot confirms workspace:read, memberships:manage, admin:manage, settings:manage, privacy:manage, audit:read, series:manage, sermons:create, studies:delete, engagement:read and policy:manage. It does not include plans:edit/content:edit or approval/publication grants. Next: register a separate contributor author identity, bind an invitation to user.id and accept with contributor role. Keep existing member read-only. Add a second contributor/reviewer for independent approval. Current reviewer-selection logic requires plans:edit plus content:approve, so the narrow approver role is not sufficient for that selector; inspect this as a role-design issue later rather than falsely promising it works. Policy owner cannot change their own grants via the routine role route.

## Admin/Contributor correction supersedes third-account guidance

User rejected creating another reviewer account. Backend/frontend pilot-20261028-4 and migration 028 let existing administrators review/publish while contributors author. Reviewer selection requires workspace/read plus approval permission, not writing permission. Existing author-self-approval checks remain. Admin Fairchild stays policy owner; no account replacement or routine self-role elevation. User completed the manual migration/API/frontend rollout; see ../../deploy/azure/admin-contributor-review-20261028.md.

## Latest live checkpoint: approved and scheduled

- User pushed backend/frontend pilot-20261028-4. Portal shows the migration job Succeeded in 26 seconds, October 28, 2026 at 22:19:18–22:19:44 UTC. User subsequently confirmed admin approval/publication grants appeared after app deployment.
- Contributor Fairchild authored Remaining in Christ (John 15:1–8) in RiverFront Church - Demo and submitted it to Admin Fairchild. Admin screenshots show In Review and the assigned review of saved content revision 10, followed by Study Approved and then Study Scheduled.
- Scheduled publication: **October 30, 2026, 08:00 America/New_York**. Church ID b150be0c-6cb1-46b6-98ab-7b83155e685e; slot f693cc3c-0169-41e8-bb86-c27b4beb4e31. No third account was created for approval.
- **Pre-publication member visibility passed:** user confirmed from the member account that Remaining in Christ is absent and the church page shows "A new study is on its way" after scheduling. No new registration or invitation was needed.
- Scheduling confirmation does not establish worker execution or member access to published content. Preserve the schedule; due publication, member reading/participation, live AI and remaining operational tests are still pending. Production author self-approval rejection and request-changes/resubmission have not been separately demonstrated; local automated coverage is recorded in the release handoff.

## Worker observation after scheduling

Portal screenshots show one active revision, rooted-worker--worker-20261027-1, with one Running replica, Ready 1/1 and zero restarts. Real-time Application log connection failed with "Internal server error happened. Closing the connection" before application output appeared. Historical Application view reports no results for the last 12 hours. This is not proof of successful job execution or of broken log ingestion. Current worker source has no startup/idle heartbeat; caught iteration failures emit "Worker iteration failed". Next inspect Historical System logs for platform events, then continue operational checks. Actual scheduled publication remains pending.

Historical System logs subsequently show repeated "ScaledObject doesn't have correct triggers specification: no triggers defined in the ScaledObject/ScaledJob" warnings. Treat this as an unresolved autoscaler configuration warning, not proof of a Node worker crash or successful processing. Next inspect rooted-worker > Scale, confirm minimum/maximum replicas both 1 and inspect any configured rules without saving changes. Microsoft documents that a non-ingress app needs a minimum replica or custom rule to avoid becoming stranded at zero: https://learn.microsoft.com/en-us/azure/container-apps/scale-app. Similar warning is reported at https://github.com/microsoft/azure-container-apps/issues/1307; that report alone does not establish the cause in this environment.

Scale screenshot confirms rooted-worker--worker-20261027-1: min replicas 1, max replicas 1, current replicas 1, no scale rules, cooldown 300 seconds and polling interval 30 seconds. These match the intended fixed single-replica configuration. No scaling change was made or requested. The autoscaler warning remains recorded for follow-up; adding an unrelated rule solely to silence it is not part of acceptance. Worker due execution/recovery and real-time log connectivity remain unproved. Next operational check: inspect rooted-api container health probes and compare with /health/live and /health/ready on port 4000 before proposing changes.

## API health probe inspection

Screenshots confirm API revision rooted-api--admin-review-20261028-4. All three probes use TCP port 4000. Observed initial delay / period / timeout / success threshold / failure threshold (seconds where applicable): liveness 0/10/5/1/3; readiness 0/5/5/1/48; startup 1/1/3/1/240. No changes saved.

Source inspection confirms unauthenticated GET /health/live returns status ok without a database query; GET /health/ready queries schema/session requirements and forced tenant RLS before returning database connected/schema current/tenantIsolation enforced. Proposed improvement: HTTP liveness /health/live and HTTP readiness /health/ready on port 4000, retaining startup TCP and existing timing initially. First verify both endpoints from the current API container Console, then configure and validate a new revision through Portal. This remains pending, not an accepted deployment. Reference: https://learn.microsoft.com/en-us/azure/container-apps/health-probes.

Current-revision Console verification passed: rooted-api--admin-review-20261028-4 returned HTTP 200 for /health/live with status ok, and HTTP 200 for /health/ready with status ok, database connected, schema current and tenantIsolation enforced. Next configure HTTP liveness/readiness on port 4000 using those paths, preserving all existing timings and TCP startup probe; save as a new revision and confirm readiness/routing afterward. HTTP probe deployment has not yet been observed.

After instructions to save HTTP liveness/readiness probes, user supplied the API Active revisions screenshot: one automatically named new revision Running (at max), one replica, 100% traffic, creation time displayed October 28, 2026 at 9:46:17 PM. This confirms new revision rollout/routing. The saved probe fields have not been independently re-opened; user followed the configuration steps. Next refresh the existing Admin study page through rooted-together.com, confirming the study remains Scheduled for October 30 at 08:00 America/New_York, and confirm the member page still loads with the study absent. Post-rollout application regression checks remain pending until reported.

**Post-rollout browser checks passed:** user explicitly confirmed both checks: Admin Fairchild still sees the study Scheduled for October 30 at 08:00 America/New_York, and the member church page loads with the study absent. This validates these journeys through the public frontend/API proxy after the probe revision rollout; it does not establish failover, cold-start or scheduled worker execution. Next independent stage: inspect existing rooted-ai-components / proj-rooted-study-dev-ai and actual model deployment, endpoint, quota and church budget before any live co-writer enablement. Keep existing external/AI flags disabled during preparation. Scheduled study remains unchanged.

## Foundry deployment inspection

User opened rooted-ai-components Overview: API kind AIServices, location eastus, provisioning Succeeded, then Foundry project proj-rooted-study-dev-ai. Deployments list shows one deployment: name/model **gpt-5.6-luna**, version **2026-07-09**, status **Succeeded**, type **Global Standard**. The exact deployment name matches the code requirement in backend/src/integrations/cowriter.ts. This is provisioning/name evidence, not a successful Responses API test. Project home displays the resource host rooted-ai-components.openai.azure.com; configure the resource root https://rooted-ai-components.openai.azure.com/ or /openai/v1 only after deployment endpoint verification (the displayed project /api endpoint is not accepted by cowriterConfig). Keep key values private. Next open deployment details for endpoint and token/request limits, inspect server settings and church budget, then prepare one bounded live request. No AI flags have been enabled or live model requests made in this stage.

Deployment Details screenshot confirms the actual displayed endpoint **https://rooted-ai-components.services.ai.azure.com/openai/v1/responses**, provisioning Succeeded, GlobalStandard, upgrade policy OnceNewDefaultVersionAvailable, no spillover deployment. Use **AZURE_OPENAI_ENDPOINT=https://rooted-ai-components.services.ai.azure.com** and **AZURE_OPENAI_DEPLOYMENT=gpt-5.6-luna** for this verified hostname; cowriterConfig accepts the root and appends /openai/v1, then adapters append /responses. Do not put the complete /responses URL into the endpoint variable. API key remains masked. Rate limits were not visible in this screenshot; inspect the lower Details section next. Existing container AI env/secret references and church budget have not yet been verified or changed.

Lower deployment Details screenshot confirms **125,000 tokens/minute**, **125 requests/minute**, model version 2026-07-09, lifecycle GenerallyAvailable and guardrail DefaultV2. These are deployment throughput limits, not a financial cap or proof of working credentials/model compatibility. Next inspect an explicit allowlist of nonsecret API env fields (AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT, EXTERNAL_SERVICES_ENABLED, STUDY_COWRITER_ENABLED, STUDY_COWRITER_ONLY) plus a boolean indicating API-key presence. Never print AZURE_OPENAI_API_KEY or a full environment dump. Church hard-token budget and worker configuration still need verification before the bounded live test.

API Console on new revision rooted-api--0000001 confirms AZURE_OPENAI_ENDPOINT unset, AZURE_OPENAI_DEPLOYMENT unset, AI_KEY_PRESENT false, EXTERNAL_SERVICES_ENABLED false, STUDY_COWRITER_ENABLED false, STUDY_COWRITER_ONLY true. No live call was made. Next open RiverFront Church - Demo Settings as Admin Fairchild > Integrations & assistance > Set church AI profile & hard budgets. This form can save while external services remain disabled (server requires settings:manage). Establish profile and explicit monthly token allowance, SMS/transcription limits zero, before adding the Foundry key through a Container Apps secret and enabling the deliberate test. API/worker configuration changes remain pending; do not create another account or modify the scheduled manual study for AI testing.

User filled the church profile form with pilot-v1, monthly token limit 50000, SMS/transcription limits 0, source-rights checkbox checked, and the supplied concise editorial guidance. User was instructed to save and look for the success notice, then add the API secret; latest user says this is done and screenshot confirms rooted-api Secrets now contains **azure-openai-api-key**, with values hidden and existing identity/runtime secrets preserved. The budget save notice itself has not been pictured. Next set API endpoint/deployment and secret reference, enable EXTERNAL_SERVICES_ENABLED/STUDY_COWRITER_ENABLED, preserve STUDY_COWRITER_ONLY=true, then save a new revision retaining current HTTP probes and image. Worker needs a separate secret/env inspection and controlled single-consumer configuration before queued workflow testing. No live model request has been made. Source confirms STUDY_COWRITER_ONLY=true disables the broad provider runtime while allowing the dedicated co-writer/workflow runtime; generic provider-status labels can still report disabled and are not proof that the dedicated co-writer is misconfigured.

After API AI environment instructions, user provided active revision **rooted-api--0000002**, Running (at max), one replica, 100% traffic, displayed creation October 28 at 10:35:35 PM. Intended env is verified Foundry resource root/deployment, AZURE_OPENAI_API_KEY secret reference azure-openai-api-key, EXTERNAL_SERVICES_ENABLED=true, STUDY_COWRITER_ENABLED=true, STUDY_COWRITER_ONLY=true; current revision env has not yet been re-read. No inference test has been submitted. Next add the same named secret separately to rooted-worker (Container Apps secrets are app-scoped), inspect worker deployment mode, and plan a controlled cutover preserving one active consumer, entry point, no ingress and min/max 1. Do not assume the API secret is automatically available in the worker. Preserve the current worker image unless deliberately aligning it as a separate compatible change.

Worker Deployment mode screenshot confirms **Single deployment (Current)**. Worker secret was requested before this screen, but its list has not been pictured. Source review: publication serializes on aggregate/schedule row locks and rechecks pending state; provider/workflow job claiming uses transactional FOR UPDATE SKIP LOCKED and transitions to running before submission. For this configuration-only rollout (no AI test submitted), retain Single deployment and the current compatible worker image; Azure briefly provisions the new revision before automatically deprovisioning the old one. After convergence require one active revision and one Running replica. This is not an endorsement of arbitrary multi-consumer operation or proof of interruption recovery. Next apply the same six AI env fields/secret reference as API, preserve command node / argument dist/src/workers/worker.js, min/max 1 and no ingress, save a new revision, and verify the resulting active list before submitting any AI request. Reference: https://learn.microsoft.com/en-us/azure/container-apps/revisions.

Worker AI configuration rollout screenshot confirms **rooted-worker--0000001**, Running (at max), one replica, sole active row, created October 28 at 10:49:54 PM as displayed by Portal. No AI request has been submitted yet. Next use the selected current worker Console to verify PID 1 command and the allowlisted nonsecret endpoint/deployment/flags plus key-present boolean. API current revision remains rooted-api--0000002. Church budget form was filled for pilot-v1 / 50000 monthly tokens / SMS 0 / transcription 0; save was instructed, and no budget success notice or stored-row verification has yet been supplied. Keep October 30 scheduled manual study unchanged; use a separate unpublished study for AI acceptance.

**Current worker runtime verification passed:** Console on rooted-worker--0000001 shows COMMAND=node dist/src/workers/worker.js, AZURE_OPENAI_ENDPOINT=https://rooted-ai-components.services.ai.azure.com, AZURE_OPENAI_DEPLOYMENT=gpt-5.6-luna, EXTERNAL_SERVICES_ENABLED=true, STUDY_COWRITER_ENABLED=true, STUDY_COWRITER_ONLY=true and AI_KEY_PRESENT=true. This establishes runtime wiring, not credential validity or inference success. Next Contributor Fairchild creates a separate unpublished study date (proposed October 31) and opens the selected-day Study Co-writer. Expect Configured / Ready to try after its dedicated status check; opening the panel makes no model inference request. Then run one small, explicit request and inspect usage/output before broader generation. Existing October 30 Remaining in Christ remains scheduled and unchanged.

October 29 continuation: Contributor Fairchild screenshot shows saved October 31 draft **AI Pilot: Asking for Wisdom**, selected day Saturday 31, draft-only preview, and dedicated Study Co-writer status **Configured · Ready to try**. This verifies API co-writer configuration discovery on the new draft; it is not a live inference result. Next use the co-writer menu > Sources > Sermon transcript to confirm short original pilot notes on James 1:5, then submit one chat-mode request for two reflection questions and one practical action (under 120 words, no Scripture quotation). Inspect response and usage before any retry, proposal adoption, review or publication. This selected-day chat path executes through the API; a successful chat alone will not establish queued workflow processing by the worker.

## First live co-writer request passed — October 29

Contributor Fairchild confirmed the supplied original James 1:5 pilot notes and submitted the requested single chat action. Screenshot shows **Connected · Azure**, two source-aligned reflection questions, one practical action, a James 1:5 reference flagged for human verification, and **395 input / 93 output tokens** (488 total). Reply is under 120 words and contains no Scripture quotation. No displayed error. This establishes successful live Azure authentication/request/response parsing and displayed usage for the dedicated API chat path; backend accounting balances and the exact model response ID have not been independently read. No proposal adoption or queued worker inference is demonstrated. Next select **Selected-day draft proposal** in the same co-writer menu, request a concise complete study from the confirmed notes, and inspect the separate proposal before adoption. Keep the October 31 study unpublished and October 30 study scheduled.

## Structured proposal generated — adoption pending

User selected Selected-day draft proposal and kept the confirmed transcript. Latest screenshot shows **Draft proposal ready for review. Your study has not changed.**, separate expandable fields title/body/reflection/discussionQuestion/application/smsPreview, and **Adopt proposal into saved draft**. Displayed usage **714 input / 638 output tokens** (1352 total; the two observed requests total 1840 displayed tokens). This establishes successful live structured proposal generation/validation and proposal-review UI; field contents are collapsed and have not yet been inspected in the supplied screenshot. No adoption, persistence after refresh, approval or publication is demonstrated for this AI draft. Next user reviews each field, adopts if suitable, then refreshes the editor to verify fields persisted with Draft status. This remains the API selected-day co-writer path, not queued worker inference.

## Adoption acceptance failure under investigation — October 29

User clicked Adopt proposal into saved draft but reports no success notice and no proposed material appearing in the draft editor. **Do not mark adoption/persistence passed.** No further inference or deployment has been requested. Source checks preserve source/profile/base-revision validation and explicit saving; no confirmed root cause yet. Current local restricted-PostgreSQL co-writer integration test (including adoption and stale source/profile rejection) passed, as did 4 study-composer component tests. These do not reproduce or disprove the production symptom. No application code changes were made during this investigation. Next collect any co-writer footer error or the existing adoption request's HTTP status and JSON response in the Contributor browser (Network filter adopt); do not collect cookies/authorization headers or regenerate the proposal. Repeating the existing adoption POST performs no model inference. Preserve the current proposal/conversation and scheduled October 30 study.

## Adoption now visibly succeeded — persistence check pending

Latest user screenshot while opening Edge DevTools shows the co-writer footer **Proposal adopted as a new saved draft revision. Approval and publication still require human action.** The editor now contains the proposed reflection/discussion/application and a 272-character body, and exposes **Undo last content AI adoption as a new draft**. This supersedes the reported unchanged-editor symptom: adoption is now observed in the UI. No application code changes, production deployment or additional model generation occurred during the investigation; the reason the notice/content was initially missed or delayed is not established. No need to repeat adoption or collect Network diagnostics for this resolved symptom. Next close DevTools and co-writer, refresh the page, and confirm proposed fields remain saved with Draft status. Do not claim reload persistence or AI-draft approval/publication before evidence.

**Refresh persistence passed:** user explicitly confirmed everything remains in Draft after refreshing. Adopted content persistence and retained Draft state are now accepted. Next manual test is request-changes and revision/resubmission on the October 31 AI study with the existing Contributor/Admin pair. Do not regenerate or automatically publish to continue this test.

## Request-changes action passed — resubmission pending

Admin Fairchild screenshot for October 31 **Asking for Wisdom** shows Changes Requested in the study card/header, Study Changes Requested badge and Review: changes requested. This confirms the request-changes state transition. The suggested review note requested an everyday example; the submitted note itself is not visible in this screenshot. Next Contributor Fairchild refreshes this same study, returns to Step 1, manually adds an everyday example to Application, saves, then selects Admin Fairchild and resubmits with a short change note. Admin then checks the new review revision before approval. No new AI generation, account or October 30 schedule change is needed. Actual revised save/resubmission/second review remain pending.

**Revision/resubmission passed:** subsequent Admin Fairchild screenshot shows Asking for Wisdom In Review, waiting for Admin Fairchild, and final review of **content revision 5**. The Practice preview includes the manually requested example about pausing to pray before replying to a difficult message and choosing a thoughtful, respectful response. This establishes the revised saved content reached the assigned reviewer. Next approve full-study revision 5 after review, then inspect the resulting publication step. AI pilot approval/publication has not yet been demonstrated. Original October 30 study remains Scheduled in the visible neighboring card.

## AI study approved and immediately published — member page loaded

Admin screenshot subsequently confirmed **Approved revision 5**, Step 3 Publish Study, with the October 31 planned date intact. User followed Publish approved study now instructions and supplied the member-facing **Asking for Wisdom** publication page, labeled Published Study · October 29. Member header and beginning of study loaded successfully. This establishes immediate publication and page availability, not yet a lower-section content match or member participation result. Source inspection confirms Publish now calls publishOccurrence synchronously inside the API transaction, so this result does **not** independently establish the continuous worker processed a due schedule. Original October 30 schedule must remain untouched; its actual due worker publication still needs observation. Next scroll through Reflection/Consider/Practice, confirm the revised everyday example, then inspect completion/reaction controls before testing them.

## Member content and participation checks passed

User explicitly confirms the requested practical example appears in the published study, Mark as complete persists as Completed after refresh, and Thankful persists at 1 after refresh. Bottom-of-study screenshot also shows discussion is off, matching current church policy. Completion is localStorage-backed and scoped by church/user/publication in member-study-reader.tsx; do not treat it as a server-side completed-reading metric or cross-device sync proof. Reactions are loaded from server-backed community routes. Next verify Thankful 1 in Admin Fairchild > Study Engagement > Asking for Wisdom, then continue moderated discussion/remaining acceptance as appropriate. Opens measure opening, not reading completion. No due scheduled-worker or queued-inference evidence is implied by these results.

## Engagement dashboard passed — discussion test next

Admin Fairchild Study Engagement screenshot confirms one shared study Asking for Wisdom, visible to members, the revised Application text, **Unique opens 1/1**, **thankful 1**, remaining reactions 0 and questions to answer 0. Conversation has 0 Pending/0 Declined and says comment text is restricted to church moderators. Delivery context retains planned October 31 at 08:00 America/New_York and explicitly distinguishes web publication from external notification evidence. No SMS/email delivery was tested. Next Admin enables moderated member discussion in Settings and saves; existing member submits a benign original test comment and checks pending/private state; existing Contributor Fairchild can moderate (moderation:manage). Do not add administrator moderation grants or create a new account for this test. Discussion activation, comment submission and moderation remain pending.

## Discussion enabled; actual commenter identity is Admin Fairchild

Latest screenshot shows discussion form enabled, success notice **Your comment is private while your church reviews it**, the supplied benign test response, and status Pending review. The visible author is **Admin Fairchild**, not Tyler Fairchild/member. This confirms submission/own pending display for Admin's church membership, not yet member-account submission or cross-account pending privacy. Use the existing comment for a privacy check: refresh this publication as existing Tyler Fairchild/member and confirm Admin's pending text is absent. Then submit a distinct original member response and verify Tyler Fairchild author/Pending review. Afterward Contributor Fairchild can moderate with its existing grant. No new account or new permissions are needed; do not mark cross-account privacy or moderation passed yet.

**Member submission/privacy passed:** user says this worked and screenshot shows Tyler Fairchild's distinct response ("I will pause and ask God for wisdom before making a difficult decision") as Pending review, with private-until-reviewed success notice. Admin Fairchild's earlier pending response is absent in the displayed discussion list. Next Contributor Fairchild opens Study Engagement > Asking for Wisdom > Conversation, filters Pending review, supplies a moderation reason and approves Tyler's comment. Leave Admin's test comment pending initially so the non-moderator cross-account visibility check can distinguish approved from pending content. Moderator approval/member-visible result remain pending.

**Moderator approval passed:** user confirms Contributor's moderation action worked and the study as Tyler Fairchild now shows the response posted, no longer pending. Next verify approved response visible from Admin's member-facing view, then decline Admin's distinct pending pilot response with an explicit duplicate-test reason. This tests decline/own-author feedback without deleting or revising Tyler's approved response. Cross-account approved visibility and decline are not yet confirmed. No additional inference, publication or role changes were made.

**Discussion acceptance passed:** user confirms all requested checks: Admin can see Tyler's posted response; Contributor declined Admin's duplicate pilot response using a reason; Admin sees Declined while Tyler's response remains posted. This confirms cross-account approved visibility and decline/author feedback in addition to earlier pending privacy. Both test records are retained; no hard deletion or role expansion. Discussion remains enabled. Next independently test queued study-planning AI on one unused date with the existing Contributor account and configured token allowance. October 30 schedule remains unchanged.

## Queued planning test in progress — November 2, one study

Contributor opened Plan studies, sent a request for exactly one study Choosing Wisely on Monday November 2, 2026 at 08:00 America/New_York, adults/two-minute reading, original James 1:5 notes, reflection/discussion/application/prayer and no Scripture quote. Planning reply restated the scope and asked an example clarification. User answered: difficult message at work; original notes are complete source; retain one study/date/time. Latest screenshot shows a conversational Study plan proposal with matching date/time/title/James 1:5 and work-message example, discussion and practical application. These planning replies are the queued workflow path, but no structured plan confirmation or saved generated day is demonstrated yet. Next scroll inside the planning popup to Prepare the discussed study plan, wait for structured understanding, verify one Nov 2 day/reference, review conversation notes and confirm rights, then Confirm understanding > Review day 1 direction > Confirm & create day 1. Inspect any error without blind retries; verify saved unpublished draft link and accounting after completion. Other studies remain unchanged.

**Queued generation reached saved editor:** following structured understanding/day review/create instructions, user supplied a new Choosing Wisely editor at month 2026-11, slot **c4e2912c-723c-4607-ba5f-6c365f146840**. It contains James 1:5 in the references field, generated work-message-focused body (1346 characters shown), reflection/discussion text, and Draft only preview. This is queued generation/materialized draft evidence, distinct from the earlier API-only proposal path. Date/time header, complete prayer/application, persistence after refresh, member invisibility and reservation/accounting balances have not yet been independently verified for this draft. Next refresh and check November 2 at 08:00 America/New_York, full requested content and Draft status, then confirm Choosing Wisely is absent from the member page. Keep it unpublished; no repeat approval/publication sequence is needed for this worker test. Verify usage/reservation state afterward to finish remaining group 1.

**Queued workflow functional checks passed:** user explicitly confirms all four: refresh persistence, November 2 2026 08:00 America/New_York date/time, requested application and closing prayer, and Choosing Wisely absent from Tyler's member church page. Do not repeat approval or publication on this draft. Remaining item in group 1 is read-only accounting inspection: budget monthly_limit expected 50000, charged_tokens positive, reserved_tokens 0; latest Contributor workflow state expected drafts_saved and tokens_reserved 0; inspect job states/usage without printing source content, keys or DATABASE_URL. Use rooted-worker Console and existing Database.transaction with the specific church and Contributor identity to retain tenant context. No model inference or application-data updates are part of that diagnostic.

## Queued AI/accounting group passed — six groups remain

Single-line read-only worker Console diagnostic succeeded after an incomplete multiline paste was cancelled. Budget period 2026-10, monthly_limit **50000**, charged_tokens **8300**, reserved_tokens **0**. Latest Contributor workflow is **drafts_saved**, tokens_reserved **0**, attempts **4**; all four jobs (three plan steps, one day) are completed with input/output usage recorded. No outstanding reservation is shown. This is application token accounting, not an Azure invoice or proof of exact dollar cost. Combined with saved draft/persistence/date/content/privacy results, queued AI group is accepted. No source/app code or production image was changed for this test. Next normal-browser restart persistence and remaining session checks; preserve the due October 30 schedule and November 2 unpublished draft.

## Normal-browser member persistence passed — idle worker restart next

User explicitly confirms the same regular browser profile can be closed/reopened and the existing member can read without signing in again. This accepts normal-browser member session persistence. Eight-hour contributor assurance expiry/re-verification and stronger old-session replay/revocation checks remain pending; initial logout/current-browser denial was already tested. Do not reduce the eight-hour policy or manipulate the production clock to avoid waiting.

Next independent operational test: controlled **idle** restart of rooted-worker--0000001 via Revisions and replicas > revision name > Restart. Accounting just confirmed completed jobs and zero reservations; no new inference has been submitted since. Record new replica/creation time and recovery to one Running replica, Ready 1/1; confirm process/env and persisted draft/schedule afterward. This tests idle recovery only, not interrupted paid-inference recovery. Preserve image/command/env/scaling and October 30 schedule. Portal restart navigation source: https://github.com/microsoft/FHIR-Converter/blob/main/docs/how-to-guides/deployment-options.md; revision semantics: https://learn.microsoft.com/en-us/azure/container-apps/revisions-manage.

## Daily-cap alert review ready — creation/delivery pending

Action group rooted-operations-alerts exists in rooted_study_app, Global, display RootedOps; screenshot shows RootedEmail Subscribed, email only. Alert Review + create screenshots show workspace resource workspacerootedstudyapp9de7, Count/table rows, static GreaterThan 0, five-minute window/frequency, one violation, action group attached with one Email, name rooted-log-daily-cap-reached, severity 2 Warning, region eastus and Enable upon creation checked. Automatically resolve alerts unchecked. Estimated rule cost 1.50 USD/month. Search query is collapsed and has not been visually verified. Next user expands Search query and confirms supplied Ingestion/OverQuota query, then clicks Create. Creation success is not yet evidenced. After creation, test saved action group and confirm actual received test email; this validates notification delivery, not an actual cap event or full alert query trigger. Do not generate excess logs to force a cap event.


## API registry authentication inspected — environment identity

Screenshot of rooted-api > Containers Properties (based on rooted-api--0000002) directly exposes editable fields; this Portal version has no separate Edit and deploy button. No values changed; Save as a new revision is disabled. Azure Container Registry selected, Authentication Managed identity selected, Identity displayed exactly System assigned Identity (environment). Registry is the accepted rootedtogethercr host, image rooted-backend, tag pilot-20261028-4; command/arguments overrides empty, CPU 0.25 visible. This verifies configured environment-identity pull authentication, not an app-specific identity grant or an independently reviewed AcrPull assignment. Prior API restart recovery passed. Next inspect equivalent worker/frontend container image-auth sections, retaining current images/identity selection; migration job and identity role assignments still require inspection before any registry-admin change.

## Migration job image authentication inspected — registry grant next

rooted-migrate Containers > Edit a container screenshot shows rooted-backend:pilot-20261028-4 from accepted rootedtogethercr host; Managed identity / System assigned Identity (environment); command node, arguments dist/src/infrastructure/migrate.js, 0.5 CPU / 1 GiB. Required role assignment displays ACR pull (Scope: rootedtogethercr); this is a requirement label, not independently observed IAM grant evidence. Save/Apply disabled; no changes or new execution requested. All three running apps plus migration job now have environment-identity image-auth configuration evidence. Next registry rootedtogethercr > Access control (IAM) > Role assignments, inspect AcrPull grant for rooted-environment-centralus/environment principal; exact principal matching remains pending. Retain registry admin configuration until manual push access and all pull dependencies are assessed.

## Managed restore drill preparation — target not created

User opened rooted-postgres-centralus > Overview > Restore. Form shows Azure subscription 1 / rooted_study_app; source rooted-postgres-centralus; geo-redundant restore unchecked and source geo-redundant backup not configured; earliest restore point 2026-10-28 00:35:01.1238818 UTC; Latest restore point (Now) selected; Central US / PostgreSQL 17 / availability zone 1. Target name blank. Estimate 18.18 USD/month: Standard_B1ms 1 vCore 14.02, 32 GiB storage 4.16, with free-allowance wording. Do not assume second server free or that its usage has a separate allowance. Plan distinct target rooted-postgres-restorecheck-20261029, retain same region/version/B1ms/32 GiB, then inspect Networking/private subnet/DNS before Create. No new server created, no production connection changed. Temporary server cleanup after validation is part of the drill; do not run application workers or migrations against the restored copy.

## Restore networking reviewed — ready for final Portal validation

Networking screenshot shows Private access (VNet Integration) selected; Azure subscription 1; rooted-vnet-centralus; snet-postgresql 10.22.2.0/27 delegated subnet with 26 addresses available; existing rooted-postgres.private.postgres.database.azure.com zone. TLS/SSL enforcement text visible. Keep these values. Next Review + create: user verifies distinct target rooted-postgres-restorecheck-20261029, source rooted-postgres-centralus, latest restore point, Central US/PG17, B1ms/32 GiB, private network. If validation succeeds with these intended settings, create the temporary restore target and wait for Ready. Creation is instructed, not yet confirmed. Do not alter runtime DB secrets/production connections, run migrations or attach a worker to restored copy. Validate read-only after provisioning, then remove only temporary target.

**Restore final review matched:** screenshot confirms target rooted-postgres-restorecheck-20261029, source rooted-postgres-centralus, Central US zone1 / PG17, Burstable B1ms 1 vCore/2 GiB RAM/32 GiB storage, storage autogrow Disabled, Latest restore point (Now), geo redundancy not enabled, intended private VNet/subnet/DNS. Estimate remains 18.18 USD/month before allowances. Security summary says Data encryption Disabled; Microsoft documents PostgreSQL flexible server always encrypts all data/logs/backups at rest with service-managed keys by default; optional CMK configuration is distinct. No request to add customer-managed keys. Create step now instructed; still no successful deployment evidence. Next wait for restored target Ready, then read-only checks and cleanup. Encryption source: https://learn.microsoft.com/azure/postgresql/flexible-server/concepts-data-encryption .

## Restored target Ready — read-only data comparison next

Overview screenshot confirms rooted-postgres-restorecheck-20261029 Ready in Central US, endpoint rooted-postgres-restorecheck-20261029.postgres.database.azure.com, PG17.11, B1ms 1 vCore/2 GiB/32 GiB, zone1, HA not enabled, created 2026-10-30 03:28:32 UTC. Local diagnostic source deploy/azure/restorecheck-20261029.mjs syntax check passed; paired .md documents scope and cleanup. User to paste one-line inline Node command in existing rooted-worker Console: two temporary read-only connections compare the three known studies/full-payload checksum, publication count, reactions and discussion-status counts, plus runtime/schema/forced-RLS/unscoped tenant checks. No credentials printed or app settings changed. Actual remote SQL validation has not yet run; do not claim data recovery passed. Keep restored server until results accepted, then delete only temporary target and verify production availability.

## Restore cleanup checkpoint — production availability passed

Delete-panel screenshot targeted only rooted-postgres-restorecheck-20261029; first two acknowledgments and Delete instructed (not Stop; retain shared VNet). User now explicitly confirms production member Asking for Wisdom still loads. This passes post-drill production availability. Deletion completion/temporary target absence has not yet been explicitly reported; ask only for that remaining cleanup confirmation, no need to repeat page check. Retain five-group count until temporary server deletion is confirmed; then managed restore group closes and four original groups remain.

## October 30 session timing clarified — expiry test deferred

User refreshed existing Contributor Fairchild Create a Study tab and retained contributor workspace access. User confirms last successful sign-in was within the preceding three hours. This is expected inside the eight-hour assurance window; it is not expiry/reverification evidence or a failure. Keep existing session and revisit at least eight hours after its actual last verification, without shortening policy or changing clocks. Four groups remain. Next independent check: open existing rooted-log-daily-cap-reached alert rule Overview and confirm saved Enabled status (resource existence, enable-on-create review and action-group test already evidenced). Then remaining useful monitoring coverage can be assessed. Preserve Remaining in Christ scheduled October 30 at 08:00 America/New_York and Choosing Wisely unpublished draft. Managed restore/data validation/deletion and production availability complete; no temporary restore server remains.

## Log ingestion established — system-event reasons next

Workspace Logs query succeeded in KQL mode after switching off new Agent UI toggle. Last24h results: ContainerAppSystemLogs_CL rooted-api 5 rows, latest 2026-10-30 01:54:32.105 UTC; rooted-frontend-centralus 538 system rows, latest 04:21:26.268 UTC; frontend ContainerAppConsoleLogs_CL 385 rows, latest 04:13:00.606 UTC; rooted-worker 91 system rows, latest 04:11:53.278 UTC. Confirms current system ingestion for all three apps and frontend console ingestion. No API/worker console rows are shown; warn-level API/no worker idle heartbeat means this alone is not a broken ingestion finding. No health/error verdict can be inferred from row counts. Next same workspace KQL summarizes system rows by app and Reason_s (column_ifexists fallback), count/latest only, to inspect lifecycle/warning/failure signals without exposing raw log contents. Prior KEDA no-trigger warning/live-stream issue remain unclosed. Saved cap alert Enabled/email delivery passed; four groups remain.

## System event reasons inspected — warning/message and frontend scale pending

Last24h reason summary has 19 groups. Worker ScaledObjectCheckFailed 86, plus one each AssigningReplica/PullingImage/PulledImage/ContainerCreated/ContainerStarted. API has one each of same five startup reasons. Frontend AssigningReplica78, KEDAScaleTargetDeactivated77, PulledImage77, ContainerCreated77, ContainerStarted77, PullingImage74, Terminated41, KEDAScaleTargetActivated37. No explicit crash/probe-failure reason in this supplied summary, but counts alone do not establish failure absence. Next group worker ScaledObjectCheckFailed by Log_s to verify whether recurring message is still known no-trigger warning; inspect frontend Scale min/max/rules to interpret frequent lifecycle events before changing anything. Keep worker min/max1 and no arbitrary rule added to silence warnings. Microsoft scale docs support minimum1 for continuous apps; public issue1307 documents similar fixed-one warning reports but is not proof this tenant is healthy. Useful health-alert selection remains pending; four groups remain.

## Worker warning confirmed; frontend HTTP autoscaling verified

Worker message grouping returns a single repeated message: ScaledObject doesn't have correct triggers specification: no triggers defined in the ScaledObject/ScaledJob. 87 events, latest 2026-10-30 04:28:33.25396 UTC. Confirms the previously recorded no-trigger warning, not an observed worker task exception. Keep fixed worker min/max1; do not add arbitrary trigger just to silence this. Frontend Scale screenshot confirms revision rooted-frontend-centralus--admin-review-20261028-4, min0/max10, cooldown300s, polling30s, current1, http-scaler HTTP rule. These settings are consistent with frontend activation/deactivation/start events; current data does not prove a crash loop or controlled zero-to-one recovery. HTTP concurrency threshold not expanded; max10 is observed, not a recommended new setting. No scale changes made. Next create one scoped runtime-failure log alert using existing email action group: worker iteration failures and explicit platform unhealthy/crash/image/OOM signals; exclude exactly the known missing-trigger worker warning if a broader scaler failure filter is used. This adds monitoring coverage, not a fix for the warning. Review Portal price (previous five-minute one-condition estimate1.50USD/mo). Four original groups remain.
