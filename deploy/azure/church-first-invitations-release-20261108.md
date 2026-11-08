# Church-first invitations: Azure deployment handoff

Release tag: `church-invites-20261108-1`. Source commit: **record from `git rev-parse HEAD` after pull**. This package is built locally for `linux/amd64`; the images have not been pushed to ACR or deployed. The live Entra and Azure Communication Services checks below are required before production activation.

| Component | Local image | Local image ID |
| --- | --- | --- |
| API and migration job | `rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-backend:church-invites-20261108-1` | `sha256:75fc11f9ac89de3dc7610d4d44be8304cdc38ecb33d7997f8894443d3f2ebb1c` |
| Frontend | `rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-frontend:church-invites-20261108-1` | `sha256:c5bac47de52f141fd31ff3b40345043b90d68ea1b02080329225590d42d6d2ee` |

These are local image IDs, not ACR manifest digests. Confirm the tag is unused in ACR before push; if already used, retag both images to a fresh release tag. Record the digests printed by `docker push`.

## Required Azure configuration

1. Create or select an Azure Communication Services Email resource and connect a verified sender domain. Complete all DNS/domain verification shown in Azure Portal. Record the exact **MailFrom** sender address for `ACS_EMAIL_SENDER`. Azure's [Email quickstart](https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/email/send-email) describes the resource and sender requirements.
2. In **rooted-api → Security → Secrets**, add `acs-email-connection-string` containing the ACS connection string. In **rooted-api → Containers → Environment variables**, add `ACS_EMAIL_CONNECTION_STRING` as a reference to that secret and `ACS_EMAIL_SENDER` as the verified sender address. Save as a new revision. Keep these values out of the frontend and build arguments. The worker does not need them for this release.
3. In the production Entra External ID customer flow, verify that new and existing contributor accounts complete the configured MFA requirement. Inspect the real ID-token email and verification claims for test accounts. If `email_verified` is absent or cannot be trusted, the app's mailbox code challenge must deliver and succeed; do not assume a plain email claim proves mailbox ownership. Verify the stable tenant/object identity across the configured clients. See the [customer flow documentation](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-user-flow-sign-up-sign-in-customers) and [OIDC claims mapping](https://learn.microsoft.com/en-us/entra/external-id/customers/reference-oidc-claims-mapping-customers).
4. Use a test church and test inboxes for the first live invitation. Confirm provider acceptance and actual inbox receipt before inviting real contributors. Monitor API logs for email send failures and `unknown` states without logging tokens or codes.

## Publish

From this workspace after the release commit is pulled and local images are present:

```powershell
docker push rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-backend:church-invites-20261108-1
docker push rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-frontend:church-invites-20261108-1
```

Verify both tags under **rootedtogethercr → Repositories**. Use the existing private registry login and keep credentials out of scripts and chat.

## Rollout order

Resource group: **rooted_study_app**. Container Apps environment: **rooted-environment-centralus**. Record the currently accepted image tags and revision names before changes. Preserve ingress, health probes, scale, existing secrets and image-pull identity.

1. **rooted-migrate:** Select the new backend image. Keep command `node`, argument `dist/src/infrastructure/migrate.js`, and current `MIGRATION_DATABASE_URL`/`RUNTIME_DATABASE_PASSWORD` secret references. Run once and require **Succeeded** with migration `031_email_invitations.sql` applied. The migration is additive, but a database migration is not reversed by switching images.
2. **rooted-api:** Create a new revision from the accepted configuration, select the new backend image, set the two ACS variables above, and keep internal HTTP ingress on port 4000. Wait for Running and `/health/ready` HTTP 200. Keep old revision available for rollback.
3. **rooted-frontend-centralus:** Create a new revision with the new frontend image. Preserve `BACKEND_URL=http://rooted-api`, `ROOTED_PUBLIC_ORIGIN=https://rooted-together.com`, external ingress on port 3000, and custom domain. Wait for Running.
4. **Live acceptance:** Test invite creation from Settings, inbox receipt, link preview, account creation/sign-in, mailbox challenge if needed, MFA, dashboard entry, a second-church invitation for the same account, later church-first sign-in, wrong-church denial, resend/revoke, and public study link reading. Check desktop and mobile and confirm no sensitive link token appears in access logs.

The worker's code path and environment do not change. A worker revision is unnecessary. If rollout fails, restore the previously accepted API/frontend revisions or tags; retain the additive migration and inspect any invitations already created. Do not reuse or overwrite a release tag. Follow the [manual Azure process](ci-cd-process.md) for health checks and rollback.

Implementation evidence: [church-first invitations](../../BuildPrompts/church-first-invitations/evidence/implementation.md).
