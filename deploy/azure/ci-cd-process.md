# Rooted CI/CD process

Current as of October 28, 2026. This runbook documents the implemented checks and the current manual Azure release process. It does not activate a deployment pipeline. For the latest accepted images and next tests, start with the [testing resume](../../research/Azure%20Deployment%20Research/resume-20261028.md).

## What exists today

| Stage | Implementation | Current limitation |
|---|---|---|
| Source / review | Application files and `.github/workflows/check.yml` are present | This workspace has no root `.git` directory. Remote repository, branch protection and actual hosted workflow runs were not verified. Do not describe files alone as a running GitHub pipeline. |
| Continuous integration | [Application checks](../../.github/workflows/check.yml) defines checks on `push` and `pull_request` | Runs only when present in an enabled GitHub repository; results must be checked on the source version being released |
| Image build | Root [Dockerfile](../../Dockerfile), targets `backend` and `frontend` | Current releases are built locally using Docker Desktop |
| Image publishing | User runs `docker push` to the existing Azure Container Registry | No automated publishing workflow is configured |
| Continuous delivery | User selects versioned images and creates revisions in Azure Portal | Manual production deployment; no automated CD is active |
| Acceptance / rollback | Portal health/logs, real browser journeys and retained prior images/revisions | Full pilot and recovery acceptance still pending |

Release flow:

```text
Reviewed source → passing checks → versioned image → registry push
               → migrations if needed → API/worker/frontend revisions
               → health + browser acceptance → release record
                                      failure → compatible rollback
```

## 1. Identify the release

Before building, record the change, source revision (Git commit if available), affected components, required environment changes, schema changes and prior accepted image tags/revisions. If Git is unavailable, record a source snapshot identifier and the local image ID; do not invent a commit SHA.

Choose an unused versioned tag, for example `pilot-20261029-1`. Once pushed and deployed, do not overwrite it. A tag is a conventionally immutable release identifier here; registry enforcement has not been verified. Record the manifest digest printed by `docker push` as the registry artifact identifier. A local Docker image ID is not that digest.

| Change | Build / deploy scope |
|---|---|
| Backend API code | Backend image and API revision; assess worker compatibility |
| Worker behavior | Backend image and controlled worker revision; assess API compatibility |
| Frontend code | Frontend image/revision; shared backend contracts or auth continuation changes may require coordinated builds |
| Schema | Backend image for migration job; reviewed API/worker rollout order |
| Environment only | New affected app revision, same image, unless app-scoped secrets alone are changing |
| Documentation only | Document checks; no image build or cloud rollout required |

## 2. Run continuous integration

The existing workflow uses Ubuntu, Node 24, and an isolated PostgreSQL 17 service on port 54329. It sets test-only database credentials and disables external services. It runs:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test:unit`
5. `npm run test:integration`
6. `npm run build`
7. `npx playwright install --with-deps chromium`
8. `npm run test:e2e`

It attempts to upload the configured browser reports/results as `application-test-results` even on failure. Check the artifact actually exists when using it as evidence. The workflow does not build/push Docker images, deploy Azure resources, run cloud migrations or prove real Entra/AI integration.

For local reproduction, follow [development and test setup](../../README.md) with isolated local PostgreSQL. Run integration/browser suites sequentially against their test database. Never point these commands at production. On Windows, use `npx playwright install chromium` if the local browser is missing; the Linux `--with-deps` step above is for the workflow runner.

For phased acceptance, the repository also has `npm run test:gate -- --phase <phase>`. It is separate from `check.yml`, requires research dependencies and current human/provider evidence, and reports missing evidence rather than manufacturing a pass. See [testing gates](../../BuildPrompts/1.1.1/TESTING_GATES.md). Do not confuse a targeted backend test pass with the full release gate.

Require successful relevant checks on the actual release source. Retain failed results and resolve them before promotion. Most recent authentication change evidence was 41 backend unit/adapter tests, TypeScript, targeted lint and Docker build; the entire hosted CI suite was not verified during that change.

## 3. Build versioned images locally

Run from `C:\Users\tyler\Documents\MyChurch` with Docker Desktop running. These commands prepare artifacts; they do not change Azure.

```powershell
$releaseTag = 'pilot-20261029-1' # Example: choose a NEW unused tag for the real release.
$registryHost = 'rootedtogethercr-dudpd0aebzeqewa2.azurecr.io'

docker build --platform linux/amd64 --target backend -t "${registryHost}/rooted-backend:${releaseTag}" .

docker build --platform linux/amd64 --target frontend -t "${registryHost}/rooted-frontend:${releaseTag}" --build-arg BACKEND_URL=http://rooted-api --build-arg ROOTED_PUBLIC_ORIGIN=https://rooted-together.com .
```

Run only the builds required by the release scope. Check each command's exit code before continuing. The backend image contains API, worker and migration entry points; both final images run as the `node` user. The build uses the root lockfile and excludes `.env`, dependencies, tests and generated outputs via [.dockerignore](../../.dockerignore). Do not pass passwords, client secrets or production database URLs as build arguments.

Inspect the resulting image if necessary, for example:

```powershell
docker image inspect "${registryHost}/rooted-backend:${releaseTag}" --format '{{.Id}} {{.Os}}/{{.Architecture}} user={{.Config.User}}'
```

## 4. Push and record registry artifacts

Using the user's existing private registry login:

October 29 access review: the Docker Desktop credential helper lists this registry under username `rootedtogethercr`, matching the enabled registry admin account; no password was retrieved or printed. Current manual publishing depends on that login. Runtime API/worker/frontend and the migration job separately use the environment's system-assigned identity, with `AcrPull` confirmed at the registry. Keep admin access enabled until a replacement publishing login is configured and tested; successful runtime pulls alone do not verify a replacement push path. Do not store registry passwords in this runbook or shell commands.

```powershell
docker push "${registryHost}/rooted-backend:${releaseTag}"
docker push "${registryHost}/rooted-frontend:${releaseTag}"
```

Push only built components. Record each successful digest and verify the tag exists in Portal → **rootedtogethercr → Repositories**. If authentication fails, repair the local registry login privately; do not paste credentials into scripts or chat. Keep previously accepted images for rollback.

## 5. Apply schema changes only when required

Review new migrations for compatibility with the currently running API and worker. Prefer additive changes that allow both old and new versions to operate during rollout. Record the schema baseline and recovery plan before a destructive or incompatible migration; an image rollback cannot undo a database change.

In Portal → **rooted-migrate**, select the release's backend image and preserve:

- Command `node`; argument `dist/src/infrastructure/migrate.js`.
- `NODE_ENV=production`; `MIGRATION_DATABASE_URL` secret reference to `migration-db-url`; `RUNTIME_DATABASE_PASSWORD` reference to `runtime-db-password`.
- Manual trigger, retry 0, parallelism 1, completion count 1; current timeout 1800 seconds.

Save/apply changes, then **Run now** once. In **Execution history**, require **Succeeded** and inspect console logs for **Migrations applied**. On failure, inspect the actual error before deciding whether rerunning is safe. Do not run fictional seeds. Do not copy administrator credentials into API/worker settings. If no schema change exists, skip this stage.

## 6. Deploy through Azure Portal

Environment: **rooted-environment-centralus**. Resource group: **rooted_study_app**. Base the new revision on the last accepted configuration. Preserve required secret references and image-pull managed identity. Review the actual before/after values; a new tag does not preserve settings by itself.

### API: rooted-api

1. Open **App → Revisions and replicas → Create new revision**.
2. Choose a fresh lowercase suffix, such as `release-20261029-1`.
3. Edit the container; choose **rooted-backend** and the release tag. If Image/Image tag are blank in the Properties panel, reselect both; blank required fields prevent Save.
4. Preserve blank command/argument overrides so the image runs `node dist/src/server.js`.
5. Preserve production settings from the [resume](../../research/Azure%20Deployment%20Research/resume-20261028.md), including named-host discovery, exact issuer, complete client IDs and three secret references. Review intentional environment changes explicitly.
6. **Save** the container, inspect Scale and **Create** the revision. Current API min/max is 1/1 during acceptance. Preserve internal HTTP ingress to target 4000.
7. Wait for Running and test readiness. Verify the accepted revision receives intended traffic; in multiple-revision mode, explicitly review routing. Running alone is insufficient application acceptance.

### Worker: rooted-worker

Deploy only when the release requires worker changes or controlled image alignment. Use the same backend artifact as the compatible API release, with **command `node` / argument `dist/src/workers/worker.js`**. Preserve no ingress, min/max 1 and runtime secret references. The worker currently loads shared production auth configuration, so required client settings must remain even though it does not handle browser login.

Check deployment mode before rollout. A second active revision can consume background work regardless of its HTTP traffic percentage. Use a controlled cutover; deactivate the superseded worker revision and verify exactly one active worker replica after convergence. If an overlap is not known to be safe, stop the old consumer before starting the new one and record the brief processing pause. Do not leave two active worker revisions as a traffic-splitting experiment.

Verify `/proc/1/cmdline` in Portal Console, logs/restart counts and one scheduled approved task. Quiet logs alone do not prove work is processing.

### Frontend: rooted-frontend-centralus

Create a new revision using **rooted-frontend** and its release tag. Preserve blank command/arguments, `BACKEND_URL=http://rooted-api`, `ROOTED_PUBLIC_ORIGIN=https://rooted-together.com`, external HTTP ingress target 3000, HTTPS requirement, custom-domain binding and certificate. Current allocation is 0.5 CPU / 1 GiB. Record the actual scale settings; frontend min 0 was intended but not independently confirmed.

Deploy API compatibility before frontend changes that require it. For breaking changes, plan the whole API/frontend/worker/schema transition first. Do not modify DNS or certificate bindings for an ordinary image release.

[Azure documents revisions as immutable snapshots, while application-scoped changes can affect all revisions.](https://learn.microsoft.com/en-us/azure/container-apps/revisions)

## 7. Verify before calling the release accepted

API probe target: HTTP liveness on port 4000 at `/health/live`, HTTP readiness on port 4000 at `/health/ready`; startup can remain TCP port 4000. Liveness checks API response without a database dependency; readiness checks database schema and forced tenant isolation. Confirm both endpoints respond successfully from the container before changing probes, and verify the new revision becomes ready afterward. October 28: both endpoints returned HTTP 200 in the API Console; user then followed HTTP probe configuration/save instructions and supplied a new Running revision with one replica and 100% traffic. User confirmed the post-rollout admin Scheduled state and member pre-publication invisibility checks pass. Saved probe fields have not been re-opened independently. [Azure health probe guidance](https://learn.microsoft.com/en-us/azure/container-apps/health-probes).

- API Portal Console: `/health/live` responds, then `/health/ready` returns HTTP 200 with database connected, schema current and tenant isolation enforced. Existing ready-check command:

  ```sh
  node -e "fetch('http://127.0.0.1:4000/health/ready').then(async r=>{console.log('HTTP',r.status);console.log(await r.text())}).catch(e=>console.error(e.message))"
  ```

- Open the main HTTPS homepage and `/api/v1/auth/options`; expect production flags `false`, `false`, `true`.
- Use fresh separate browser sessions for current member/contributor identities. Test login/callback, appropriate capabilities, logout and the changed journey. Keep MFA and identity binding enforced.
- If the worker changed, verify its actual process and approved scheduled work, with one active consumer. If schema changed, check both API and worker compatibility.
- Review Application/System logs and restarts for the new revision. Keep AI/external services disabled unless the release includes an explicitly budgeted provider test.

Record partial acceptance honestly. A passing homepage is not a passing full application. A release that intentionally changes secrets, identity policy or schemas needs those behaviors verified too.

## 8. Roll back a failed release

First determine whether the previous image is compatible with the current database schema and application-scoped settings. Capture the failure and stop promotion of dependent components.

For a compatible rollback, Portal **Revisions and replicas** can activate/deactivate retained revisions. In multiple-revision mode, route HTTP traffic back to the accepted revision. In single-revision mode, create a new revision based on the accepted configuration/image if direct reactivation is unavailable in the current Portal. Preserve working secret references. [Azure revision management](https://learn.microsoft.com/en-us/azure/container-apps/revisions-manage).

For the worker, perform one controlled consumer cutover and confirm the bad worker is inactive. Repeat health and affected-journey checks after rollback. Do not roll a worker to an image that cannot read the current schema.

App-scoped secret updates are not undone by selecting an older revision. Restore required credentials through the private credential-management procedure when necessary. Do not blindly restore the production database: use a reviewed forward fix or an isolated restore/cutover plan accounting for data created since the release.

## 9. Save a release record

Add an entry to the deployment handoff or a dated release record containing:

| Field | Record |
|---|---|
| Release / source | UTC date, tag, source commit or snapshot, concise change |
| Artifacts | Backend/frontend registry manifest digests; local IDs clearly labeled if also recorded |
| Checks | Actual CI run/evidence and targeted local results; distinguish unrun suites |
| Database | Migration execution ID/result or explicitly no schema change |
| Runtime | API/frontend/worker actual revision names, image tags, active replicas, routing and scaling |
| Configuration | Changed variable names and nonsecret values; secret reference names only |
| Acceptance | Health, member/contributor and changed workflow results; unresolved limitations |
| Recovery | Prior accepted compatible revision/tag, rollback action if needed |

Do not record passwords, client secret values, token contents, invitation tokens or callback URLs containing codes.

## Optional future automated CD — design only

A later decision can move image build/push into GitHub Actions, then add production deployment. Before implementation, confirm the actual Git repository/branch, existing CI runs, release ownership, environment controls, Azure tenant/subscription and least-privilege deployment identity. Preserve the user's current Portal-only preference until that decision changes.

Proposed stages: verify source → build versioned images once → publish and retain digests → production environment review → private migration execution → deploy compatible API/worker/frontend artifacts → acceptance → release record. Serialize releases to this environment. Untrusted pull requests must not receive production publishing/deployment credentials. Prefer federated identity over storing long-lived Azure passwords; separate image-publishing privileges from application deployment and privileged migrations.

The database is private. Do not assume a public GitHub runner can connect to it: a future pipeline must orchestrate the existing in-environment migration job or use deliberately provisioned private connectivity. Keep the background worker's single-consumer cutover explicit. Do not simply attach a generic web-app deploy action to all three runtime roles.

[Azure supports deploying prebuilt images with GitHub Actions and recommends unique image tags.](https://learn.microsoft.com/en-us/azure/container-apps/github-actions) This capability is available, but no such workflow, identity, production environment or permissions were created by this documentation task.
