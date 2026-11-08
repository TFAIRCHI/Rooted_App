# Church-first invitations: Azure deployment handoff

Release tag: `church-invites-20261108-1`. Image source commit: `1264cc985af8c04d66418ba62bb81836328d697f` (`Build church-first email invitations and team sign-in`). This package is built for `linux/amd64` and both images have been pushed to ACR. The user reports that `rooted-migrate` completed successfully and its log showed `Migrations applied`. Screenshots show the new API and frontend revisions Running with 100% traffic. The live Entra and email-delivery checks below are required before production activation.

| Component | Image | Local image ID | ACR manifest digest |
| --- | --- | --- | --- |
| API and migration job | `rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-backend:church-invites-20261108-1` | `sha256:75fc11f9ac89de3dc7610d4d44be8304cdc38ecb33d7997f8894443d3f2ebb1c` | `sha256:72dec2ed4e2954754c3860b8c5515f7addf059a06862cea7271d2eb160cdcd63` |
| Frontend | `rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-frontend:church-invites-20261108-1` | `sha256:c5bac47de52f141fd31ff3b40345043b90d68ea1b02080329225590d42d6d2ee` | `sha256:21187b7ef889b5dd385f96584279a0b82a068322c9b282392a8176cb604adc76` |

The push output and a read-only registry inspection confirmed both manifest digests. Do not overwrite these tags.

## Required Azure configuration

1. Create or select an Azure Communication Services Email resource and connect a verified sender domain. Complete all DNS/domain verification shown in Azure Portal. Record the exact **MailFrom** sender address for `ACS_EMAIL_SENDER`. Azure's [Email quickstart](https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/email/send-email) describes the resource and sender requirements.
2. In **rooted-api → Security → Secrets**, add `acs-email-connection-string` containing the ACS connection string. In **rooted-api → Containers → Environment variables**, add `ACS_EMAIL_CONNECTION_STRING` as a reference to that secret and `ACS_EMAIL_SENDER` as the verified sender address. Save as a new revision. Keep these values out of the frontend and build arguments. The worker does not need them for this release.
3. In the production Entra External ID customer flow, verify that new and existing contributor accounts complete the configured MFA requirement. Inspect the real ID-token email and verification claims for test accounts. If `email_verified` is absent or cannot be trusted, the app's mailbox code challenge must deliver and succeed; do not assume a plain email claim proves mailbox ownership. Verify the stable tenant/object identity across the configured clients. See the [customer flow documentation](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-user-flow-sign-up-sign-in-customers) and [OIDC claims mapping](https://learn.microsoft.com/en-us/entra/external-id/customers/reference-oidc-claims-mapping-customers).
4. Use a test church and test inboxes for the first live invitation. Confirm provider acceptance and actual inbox receipt before inviting real contributors. Monitor API logs for email send failures and `unknown` states without logging tokens or codes.

Progress: `rooted-email` and the Azure-managed domain are provisioned; the domain shows Verified with SPF/DKIM Verified and is Connected to `rooted-communications`. Its MailFrom address is `DoNotReply@40c8d53f-d59d-4a60-822a-28f53e0e82a5.azurecomm.net`. The `acs-email-connection-string` secret exists in `rooted-api`; its value was not shared. The API environment variables and new revision are still pending.

## Publish

Completed from this workspace; commands retained for release traceability:

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

Progress on step 1: the user reported a successful migration-job execution and the `Migrations applied` log message. The job's exact image/configuration and schema row have not been independently inspected; verify the job image was this release's backend image before relying on this as confirmation of migration `031`.

Progress on steps 2–3: user screenshots show `rooted-api` revision `rooted-api--church-invites-11826` Running at 100% traffic, with `ACS_EMAIL_CONNECTION_STRING` sourced from a secret and `ACS_EMAIL_SENDER` as a manual entry. A later screenshot shows the frontend `church-invit...` revision Running at 100% traffic. External HTTP smoke checks returned 200 for `/sign-in`, `/invitation`, `/privacy`, and `/api/v1/auth/options`. A read-only preview request with a dummy token returned the expected 404 `not_found`, confirming the new API route and invitation lookup are reachable. The user reports that real invitation emails arrived, including one initially missed because Outlook placed it in Junk. No Azure quota failure is established. Entra sign-in, MFA, and invitation acceptance are still unverified.

Implementation evidence: [church-first invitations](../../BuildPrompts/church-first-invitations/evidence/implementation.md).
