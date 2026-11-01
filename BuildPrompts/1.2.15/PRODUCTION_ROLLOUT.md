# Production path: focused public pages

Prepared October 30, 2026. **Execution update: local implementation and candidate image are complete; upload and Portal rollout are pending.** Use the [exact prepared artifact and next steps](../../deploy/azure/homepage-navigation-release-20261030.md). The procedure below follows Tyler’s existing local Docker and Azure Portal process.

## Release baseline

| Item | Last accepted recorded value |
|---|---|
| Main origin | `https://rooted-together.com` |
| Resource group | `rooted_study_app` in Azure subscription 1 |
| Frontend app | `rooted-frontend-centralus` |
| Environment | `rooted-environment-centralus` |
| Registry | `rootedtogethercr-dudpd0aebzeqewa2.azurecr.io` |
| Accepted frontend image | `rooted-frontend:pilot-20261028-4` |
| Accepted frontend revision | `rooted-frontend-centralus--admin-review-20261028-4` |
| Runtime configuration | `BACKEND_URL=http://rooted-api`; `ROOTED_PUBLIC_ORIGIN=https://rooted-together.com` |
| Allocation / ingress | 0.5 CPU / 1 GiB; external HTTP target port 3000; HTTPS/custom domain retained |
| Scaling | Minimum 0, maximum 10, existing HTTP rule; cooldown 300s, polling 30s |
| Image pull | Environment system-assigned identity with existing AcrPull |

Baseline source: [completed October 30 acceptance record](../../research/Azure%20Deployment%20Research/resume-20261028.md). Confirm the actual active frontend image/revision once before releasing; if a later accepted release exists, retain that as rollback instead. Do not use the older homepage release note’s superseded `-3` tag.

## 1. Build the real application and review it locally

Execute the [master prompt](MASTER_BUILD_PROMPT.md), then complete gates 1–5 in [testing gates](TESTING_GATES.md). Show Tyler the implemented pages, representative desktop/mobile screenshots, and any deviation from the approved mockup. The static research preview is a reference, not the release candidate.

Record release source identity, changed files, passed checks, image settings, and rollback configuration in `evidence/execution.md`. This workspace previously had no root Git repository; use a real commit if one exists at execution time, otherwise a dated source snapshot and hashes of affected build inputs. Do not invent a commit.

No database migration or API/worker release is needed for the planned scope. Keep this a single frontend image update.

## 2. Prepare the versioned image locally

Use the root Dockerfile with Docker Desktop running. The following tag is a **proposed candidate**, not an existing artifact. Confirm it is unused before choosing it; increment the suffix/date if necessary and use the same final tag throughout the handoff.

```powershell
$navigationReleaseTag = 'navigation-20261030-1'
$rootedRegistryHost = 'rootedtogethercr-dudpd0aebzeqewa2.azurecr.io'

docker build --platform linux/amd64 --target frontend -t "${rootedRegistryHost}/rooted-frontend:${navigationReleaseTag}" --build-arg BACKEND_URL=http://rooted-api --build-arg ROOTED_PUBLIC_ORIGIN=https://rooted-together.com .
```

Check the exit code. Record the actual image ID, `linux/amd64` platform, source identification, check results, and proposed Portal suffix. Smoke the candidate container’s public pages/discovery output locally. Both the build-time configuration and runtime values matter here: API rewrites and public metadata are part of this application’s production build.

Present the concrete candidate and local review evidence before the production step. Do not overwrite the accepted `pilot-20261028-4` image tag. Do not pass secrets as build arguments.

## 3. Tyler uploads using local Docker

Once the release candidate is ready for production, use the existing private registry login:

```powershell
docker push "${rootedRegistryHost}/rooted-frontend:${navigationReleaseTag}"
```

These variables refer to the values selected in step 2. If using a new PowerShell window, set them again first. Capture the pushed repository/tag and actual registry manifest digest. A local image ID is not the remote manifest digest. Do not retrieve passwords or put credentials into chat. No Azure CLI is part of this path.

## 4. Tyler updates the frontend in Azure Portal

1. Open **rooted-frontend-centralus → App → Revisions and replicas** and note the currently accepted revision/image and revision mode.
2. Create a revision from the accepted frontend configuration, selecting **rooted-frontend** and the exact new tag. Proposed suffix: `navigation-20261030-1`, adjusted to match the chosen release if needed. The current Portal may expose container editing through **Containers → Save as a new revision**; use that equivalent flow if applicable.
3. Preserve blank command/argument overrides, both runtime environment variables, environment identity image pulls, allocation, existing scale rule, port 3000 ingress, HTTPS, certificate, and custom domain.
4. Save and confirm readiness/health and intended traffic. Retain the accepted previous image/revision. Do not change revision mode or unrelated settings just for this release.

Azure revisions snapshot revision-level configuration; application-level settings can affect multiple revisions. In single-revision mode, Azure transitions traffic after the new revision is ready; in multiple-revision mode, verify the intended traffic assignment explicitly. These are documented Azure behaviors, not evidence that this particular rollout succeeded. See [Microsoft: revision lifecycle and modes](https://learn.microsoft.com/en-us/azure/container-apps/revisions).

This release does not require DNS, identity, database, worker, alert, or scaling changes. No new Azure resource or staging environment is planned.

## 5. Accept the release with one short smoke pass

Perform gate 6 once on the real domain and record its evidence. The assistant can batch read-only public route/discovery/proxy requests and help inspect the combined result. Tyler’s existing account sessions supply the real member/contributor visual confirmation when needed; avoid repeated logins and serial screenshot requests.

The known scale-to-zero activation observation was approximately 20.5 seconds in the earlier completed test. Record an actual delay/failure if observed, but do not manufacture another idle wait/cold-start experiment or change scaling as part of this navigation release.

Update the version tracker and a dated release entry with final image/digest/revision, traffic, smoke results, acceptance time, and retained rollback target. Keep the previous acceptance record complete; add a reference to this navigation release rather than reopening unrelated checks.

## Rollback if the frontend release fails

Use Azure Portal to return to the retained accepted frontend configuration/image. In multiple-revision mode, restore intended traffic to the accepted ready revision and stop serving the failing revision. In single-revision mode, use the Portal’s available reactivation/copy/update-from-accepted-image flow to restore the previous image; confirm the actual outcome instead of assuming traffic changed.

Recheck the homepage, sign-in entry/proxy, and the affected route. This frontend-only release has no planned schema or data change, so database restore is not a rollback step. Keep a record of the failure and restore result. [Microsoft revision management](https://learn.microsoft.com/en-us/azure/container-apps/revisions-manage) describes the underlying revision operations; follow Tyler’s Portal workflow.
