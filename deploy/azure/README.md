# Path B deployment progress

## Current documents — October 30, 2026

- [Focused public-page release](homepage-navigation-release-20261030.md): version 1.2.15 implemented and verified locally; `rooted-frontend:navigation-20261030-1` ready for review/upload/Portal rollout. No backend or migration release is needed.
- [Completed acceptance record](../../research/Azure%20Deployment%20Research/resume-20261028.md): all 35 agreed checks completed; accepted production baseline and operating context. Do not restart completed pilot checks.
- [CI/CD process](ci-cd-process.md): existing CI checks, manual Docker/Portal releases, migrations, acceptance, rollback and future automation design.

The accepted API/frontend baseline is `pilot-20261028-4`; the worker intentionally retains `pilot-20261027-1`. The new navigation candidate affects only the frontend and is not yet deployed. The current process remains local Docker build/push plus manual Azure Portal deployment. These current documents supersede pending identity/region/tag statements in the historical sections below.

## Historical deployment record

**Current handoff:** use [the October 26 research resume plan](../../research/Azure%20Deployment%20Research/path-b-resume-plan.md) for current status and next steps. It supersedes the historical "current next step" and CLI sign-in sections below. User performs all Azure actions manually through Portal. Original `pilot` images were uploaded and the East US homepage works. User deleted both failed PostgreSQL servers; East US region-access request **2610260040009884** is Open, and the PostgreSQL resource provider is Registered. A named East US 2 attempt used **B1ms / PostgreSQL 18** and failed with `SkuNotAvailable`.

**New local authentication implementation:** members use the simpler email-code flow with persistent reading sessions until sign-out; contributor/admin access requires verified MFA and current church capabilities. See [access-based login Portal setup](access-based-login.md). Migration **027** and new versioned frontend/backend images are required; the uploaded `pilot` images do not contain these changes. Local builds/typechecks, targeted UI tests and authentication/editorial integration checks passed. User has now manually created/opened the **Rooted Customers** Entra external tenant; app registrations, flows, MFA policy and real-provider login remain pending. No Azure changes were made by the assistant.

## Confirmed choices

- Region change in progress: PostgreSQL creation in East US was blocked by subscription region access. East US 2 cleared the initial Portal region validation. User created `rooted-vnet-eastus2` (`10.21.0.0/16`) with delegated `snet-containerapps` (`10.21.0.0/23`) and `snet-postgresql` (`10.21.2.0/27`). Existing East US app/environment remain deployed; no East US 2 app environment is confirmed.
- PostgreSQL East US 2 creation failed at deployment with `SkuNotAvailable`: "Specified SKU is not supported in this region. Please choose a different SKU." Reviewed request was PostgreSQL 17, Burstable B1ms/1 vCore/2 GiB, 32 GiB storage, 7-day backup, no HA, private VNet integration, service-managed encryption. Portal had shown $16.09/month before eligible free allowances. Private DNS zone and VNet-link deployment entries succeeded; database deployment failed. A successful form validation did not prove actual SKU provisioning availability. Next step is inspect alternative Burstable sizes/costs or request B1ms availability from Microsoft support; do not assume B2s works or promise the B1ms introductory offer applies to another size. Preserve existing networking/DNS resources.

- Execution preference: user performs all Azure actions manually through the Portal; do not use Azure CLI for subsequent Azure operations. Local Docker commands remain available to the user for image handling.
- Images uploaded by user and confirmed in Portal: `rooted-backend:pilot` and `rooted-frontend:pilot` in `rootedtogethercr`.
- VNet creation and delegations confirmed by user's Portal screenshot: `rooted-vnet`, `snet-containerapps` `10.20.0.0/23` delegated to `Microsoft.App/environments`; `snet-postgresql` `10.20.2.0/27` delegated to `Microsoft.DBforPostgreSQL/flexibleServers`.
- Frontend and environment deployed manually by user; user confirmed the Rooted homepage loads at the Azure Application URL. Reviewed creation summary: app `rooted-frontend`, environment `rooted-environment`, East US, `rooted-vnet`/`snet-containerapps`, external environment IP, zone redundancy disabled; Consumption 0.5 vCPU/1 GiB, `rooted-frontend:pilot`, public HTTP ingress target 3000, Auto transport, insecure HTTP not allowed. Monitoring workspace shown as `workspacerootedstudyapp9de7`. Registry pull uses the environment system-assigned managed identity, with Portal indicating the ACR pull role will be assigned. This is homepage delivery acceptance only; actual auth/API/database/worker journeys remain pending.

- Subscription: Azure subscription 1 (active, user confirmed).
- Existing resource group: `rooted_study_app`.
- Container registry: `rootedtogethercr`, Basic, East US, Tenant Reuse; provisioning succeeded in the user's portal screenshot. Resolve its exact hashed login server using `az acr show` rather than constructing it from the registry name.
- Registry verified through Azure CLI: `rootedtogethercr-dudpd0aebzeqewa2.azurecr.io`, Basic, East US, `LegacyRegistryPermissions` (RBAC). Azure subscription 1 is Enabled.
- Existing Foundry resources: East US. Proposed application region: East US, subject to capacity.
- Monthly resource-group budget: $95, with 50%, 80%, 100% notifications (user confirmed). Includes existing AI resources; alerts do not stop spending.
- Application origin: `https://rooted-together.com` (main domain).
- Registrar: Namecheap. Screenshot shows a `www` parking CNAME and an apex URL redirect.
- Initial production data selection: pending. No import or seed is authorized by default.

## Local container preparation

Run from the repository root. No credentials are required to build images.

```powershell
docker build --platform linux/amd64 --target backend -t rooted-backend:pilot .
docker build --platform linux/amd64 --target frontend -t rooted-frontend:pilot --build-arg BACKEND_URL=http://rooted-api --build-arg ROOTED_PUBLIC_ORIGIN=https://rooted-together.com .
```

The backend image serves both API and worker. API uses its default command. Worker command override is `node dist/src/workers/worker.js`; it has no ingress and must retain one minimum replica. Migrations use `node dist/src/infrastructure/migrate.js`, run separately with a privileged identity. Never run the development bootstrap or seed in production.

API container port is 4000; frontend is 3000. In Container Apps, name the API `rooted-api`, enable internal HTTP ingress, and use its environment-local service name `http://rooted-api`. Container Apps routes this through ingress, so do not append `:4000` to that service URL. Frontend public ingress targets port 3000. If the API name changes, rebuild the frontend with the matching BACKEND_URL and set the same URL at runtime: Next.js rewrites are baked into the build.

Both images run as the nonroot `node` user. The Docker context allowlist excludes the local environment, Secrets, local databases, research, build evidence, and test artifacts. Environment-specific credentials must be injected at runtime.

## Remaining deployment stages

1. Build and smoke-check local Linux images. Record results below.
2. Select an image registry and upload images. Azure Container Registry is an additional paid resource; review its displayed cost before creating it.
3. Configure networking and create the Consumption Container Apps environment.
4. Create PostgreSQL with TLS, restricted access, backups, separate migration/runtime credentials, and validate managed-role/migration compatibility.
5. Configure real OIDC identity and verify MFA claims against the existing production checks.
6. Run migrations, then deploy API, worker and frontend with runtime secrets and explicit scaling limits. Keep optional integrations disabled until configured and tested.
7. Add `rooted-together.com` to frontend custom domains. Use Azure's actual environment IP for apex A record and its actual ownership token for TXT `asuid`. Replace the conflicting apex URL redirect only when ready. Preserve mail records. Configure the managed certificate using Azure's current verification instructions. Decide `www` redirect/certificate handling separately.
8. Verify real signup, church creation, tenant isolation, co-writer, approval, scheduled publication, restart recovery and restore before inviting pilot users.

The existing public homepage is served by the frontend container at the same main origin as the application. A separate Static Web App is unnecessary for this choice.

## Validation record

- Backend TypeScript check: passed.
- ESLint for changed API server and Next.js configuration: passed.
- Backend Linux amd64 image build: passed (`rooted-backend:pilot`).
- Backend image smoke check: `pg` and `sharp` import successfully; API, worker, migration JavaScript and SQL migrations are present; runs as nonroot.
- Frontend Linux amd64 image build: passed (`rooted-frontend:pilot`), including Next.js compilation and TypeScript. Initial build identified a shared sign-in continuation helper; the Dockerfile includes that helper and shared backend contract dependencies.
- Frontend container smoke checks: homepage HTTP 200, main-domain metadata, static JavaScript HTTP 200, sign-in page HTTP 200, nonroot user. This checks page delivery, not real authentication.
- API/worker database connectivity and full application journeys: pending Azure database and identity configuration.

No Azure resources or DNS records have been changed by the agent.

## Current next step: shared virtual network (Portal only)

Proposed `rooted-vnet`, East US, `10.20.0.0/16`, in `rooted_study_app`. Separate subnets: `snet-containerapps` at `10.20.0.0/23` delegated to `Microsoft.App/environments`, and `snet-postgresql` at `10.20.2.0/27` delegated to `Microsoft.DBforPostgreSQL/flexibleServers`. Check for overlap if peering to any existing network becomes necessary. Do not enable paid Bastion, Firewall, NAT Gateway or DDoS protection for this initial topology.

This supports a public frontend in an external Workload profiles environment using only the Consumption profile, with PostgreSQL private VNet integration in the separate database subnet. VNet/environment/database creation remain pending user confirmation. Migration work must later run from a resource with access to this private network; local direct database connectivity is not assumed.

## Next interactive step: local Azure sign-in

Both application images are built on this Windows computer. Azure CLI is not installed as of the registry-confirmation step; WinGet is available.

In local PowerShell, install the CLI:

```powershell
winget install --exact --id Microsoft.AzureCLI --source winget
```

Close and reopen PowerShell after installation. Then authenticate interactively and select the existing subscription:

```powershell
az login
az account set --subscription "Azure subscription 1"
az account show --query "{Subscription:name,State:state}" --output table
```

User must complete the Microsoft sign-in themselves. After sign-in, the next operation is registry authentication, resolve the actual `loginServer`, tag and push `rooted-backend:pilot` and `rooted-frontend:pilot`, then verify repositories. No registry admin password is needed for this flow. Image upload is pending.

Azure CLI installation and ordinary user sign-in are now complete. Registry login returned `AADSTS50076` (interactive MFA required for ACR). Neither image was uploaded. Next user action in local PowerShell:

```powershell
az login --scope https://containerregistry.azure.net/.default
az acr login --name rootedtogethercr --subscription "Azure subscription 1"
```

Complete Microsoft's MFA prompt; no registry admin-account change is required. After `Login Succeeded`, resume agent upload and repository verification.
