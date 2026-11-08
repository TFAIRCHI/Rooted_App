# Four Settings views: deployment handoff

Source commit: `cf134d06dfeadaf8b47ce56502d804ecc15c5a3b` (`Build four Figma-based church settings views`). Verified on `origin/main` after the required pre-build snapshot `3adfe4a83c1db132c24b3c164a51454123f6726b` was pushed.

## Built local images

Both images are in local Docker, built for `linux/amd64` from the source commit above. They have **not** been pushed to Azure Container Registry or deployed to Container Apps.

| Component | Tag | Local image ID |
| --- | --- | --- |
| API | `rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-backend:settings-cf134d0` | `sha256:a276ac42511472108ab78e1828e39071f2f17e3b573597bcf392aef8acb812f4` |
| Frontend | `rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-frontend:settings-cf134d0` | `sha256:05b8d8fc578afe75b70ebf1d2b77c028c197460bfb0fe71e5e6a9cab8bf7c239` |

The tag is a proposed release identifier. If either tag already exists in ACR, choose a fresh tag and retag both local images before pushing. Record the digest returned by each push; an image ID is not a registry digest.

## Publish the images

From the machine with these local images and the existing private ACR login:

```powershell
docker push rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-backend:settings-cf134d0
docker push rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-frontend:settings-cf134d0
```

Confirm both tags appear in Azure Portal → **rootedtogethercr → Repositories**. If Docker is signed out, use the established private registry login flow; keep credentials out of the command history and release notes.

## Roll out in Azure Portal

Use resource group **rooted_study_app** and environment **rooted-environment-centralus**. Record the current accepted revision names and image tags for rollback. Preserve current secrets, environment variables, ingress, health probes, scaling, and image pull identity.

1. **rooted-api:** App → Revisions and replicas → Create new revision. Select `rooted-backend:settings-cf134d0`. Keep the image's default API command and the current internal HTTP ingress on port 4000. Wait for Running and verify `/health/ready` returns HTTP 200 before continuing.
2. **rooted-frontend-centralus:** Create a new revision with `rooted-frontend:settings-cf134d0`. Keep the image's default command, `BACKEND_URL=http://rooted-api`, `ROOTED_PUBLIC_ORIGIN=https://rooted-together.com`, and current external ingress on port 3000. Wait for Running and check the custom domain.
3. Open the four Settings routes in an administrator session: `/settings/members`, `/settings/church`, `/settings/reading`, and `/settings/integrations`. Confirm the church switcher, roles, invitation drawer, saved provider settings, and legacy `/settings?church=` redirect. Check mobile navigation and application logs.

The worker needs no new revision for this release; its background behavior is unchanged. There are no schema migrations or new runtime secrets. If acceptance fails, route back to the previously accepted API/frontend revisions or recreate revisions from their prior tags, following [the deployment runbook](ci-cd-process.md).

Implementation and test evidence: [four Settings views](../../BuildPrompts/settings-four-views/evidence/implementation.md).
