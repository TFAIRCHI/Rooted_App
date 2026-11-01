# Versioned images for Central US

Prepared October 27, 2026. Both images were built locally from current source and tagged **pilot-20261027-1**. Backend build and frontend production build succeeded for linux/amd64; both run as the nonroot `node` user. Backend packaging includes migration 027 and the server/worker/migration entry points. Cloud migrations, sign-in and full-pilot acceptance are still pending.

**Latest result:** user confirms both uploads succeeded. Portal Container screenshot shows the new frontend tag selected and both intended environment variables. Remote manifest digests are not yet recorded. Upload commands below are retained as history; no repeat upload is needed.

## Manual upload

Run in local PowerShell with Docker Desktop running, using the existing registry login:

```powershell
docker push rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-backend:pilot-20261027-1
docker push rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-frontend:pilot-20261027-1
```

Upload has not been performed by the assistant. If authentication fails, resolve the existing Docker registry login locally; never put passwords in chat. Do not use Azure CLI. Record each final pushed manifest digest once available. Preserve existing `pilot` tags.

Local image IDs (not remote manifest digests):

- Backend: `sha256:896f49e7664f0fe16969c11e1f20f0e1b68bbab6e6d20392c5fcf6ecfbf20118`
- Frontend: `sha256:53dd3cbe7304910c6074c421064f3d2d4fbd131fe860acf290c6e25a8f8fca7b`

## Continue the pending frontend wizard

After upload succeeds, refresh the repository/tag selectors and choose **rooted-frontend:pilot-20261027-1**. A `(new)` environment in this wizard is pending creation until the parent app is submitted.

| Setting | Value |
|---|---|
| App | `rooted-frontend-centralus` |
| Region / environment | Central US / `rooted-environment-centralus` |
| Registry | `rootedtogethercr-dudpd0aebzeqewa2.azurecr.io` |
| Pull authentication | Environment system-assigned managed identity; verify AcrPull after deployment |
| Command / arguments | Blank |
| Deployment stack | Unspecified |
| Workload / allocation | Consumption, 0.5 CPU, 1 GiB |
| `BACKEND_URL` | `http://rooted-api` |
| `ROOTED_PUBLIC_ORIGIN` | `https://rooted-together.com` |
| Ingress | Enabled, external HTTP, target port 3000, Auto transport, insecure connections disabled |

No backend API is deployed in this environment yet; initial frontend availability is not full application acceptance. Keep the existing East US frontend until the replacement is accepted. Use the same backend tag for the private migration job, API and continuous worker, following the [current deployment handoff](../../research/Azure%20Deployment%20Research/path-b-resume-plan.md).
