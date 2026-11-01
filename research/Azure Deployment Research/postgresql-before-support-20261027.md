# PostgreSQL path before support responds

Researched **October 27, 2026**. This is a concrete decision path for the user's request to explore proceeding before Microsoft resolves case `2610260040009884`. Research and public price lookup are complete. The user subsequently supplied Central US quota results: **384 total cores / 0 used**, **40 Burstable family allowance / 0 used**, returned units `Count`. The reported allowances are not exhausted. No server creation has been reported. All Azure management actions remain manual in Portal; no CLI.

## Recommendation

Keep managed PostgreSQL and evaluate **Central US first**, using a regional quota check in addition to the capability response already supplied. Make one small, deliberate deployment if the checks and Portal price pass. One further region can be considered only after the first result is classified and the second region passes the same checks. Limit this path to **two actual server-creation submissions**, rather than a sequence of regional rebuilds. This is a proposed stopping rule; no submission has yet occurred.

Central US is a reasonable first candidate because its user-provided capability result includes the intended configuration, no actual Central US failure is recorded, and the current public base price fits the discussed database budget. None of those observations proves that capacity is available to this subscription. No public source inspected establishes that Central US has more free capacity than another region.

Keep the existing East US support request open in parallel. A successful deployment elsewhere does not enable East US region access.

## What we know and what remains unknown

| Evidence | What it establishes | What it does not establish |
|---|---|---|
| `Microsoft.DBforPostgreSQL` is Registered | Provider registration prerequisite is met | Region entitlement or free SKU capacity |
| East US region-access ticket is Open, last observed | Microsoft has the request | Approval or a guaranteed response/provisioning time |
| East US 2 B1ms / PG18 create failed with `SkuNotAvailable` | That exact attempt failed | That every PostgreSQL version/SKU in every region is unavailable |
| Central US and East US 2 capability responses list B1ms and PG17/18 | The subscription-scoped responses list those supported offerings | A live allocation or reserved server |
| `OfferRestricted: Disabled` in those responses | That feature flag was disabled in the observed response | A blanket permission to provision; the separate location restriction/status fields were not supplied |
| Public Central US retail price lookup | Current public list rates for the named meters | This subscription's price, credit eligibility, quota, or capacity |
| User-supplied Central US PostgreSQL quota usage | Total cores 384/0 used; Burstable family 40/0 used; no exhaustion indicated | Region access permission or live hardware capacity |

Microsoft distinguishes quota exhaustion, provider registration, region access, availability-zone capacity, and SKU availability. Handle the actual nested service error rather than changing unrelated settings. [Capacity guidance](https://learn.microsoft.com/en-us/azure/postgresql/troubleshoot/how-to-resolve-capacity-errors).

## Step 1: add the missing read-only quota check

Use the same Microsoft Learn **Try it** experience used for capabilities, signed into **DefaultDirectory / Azure subscription 1**. Open [Quota Usages — List](https://learn.microsoft.com/en-us/rest/api/postgresql/quota-usages/list?view=rest-postgresql-2025-08-01), select `centralus`, and run this GET:

```http
GET https://management.azure.com/subscriptions/5704fb14-2bf3-48cd-b8fd-b2799aca2e1a/providers/Microsoft.DBforPostgreSQL/locations/centralus/resourceType/flexibleServers/usages?api-version=2025-08-01
```

Record only the response code and returned quota rows. Look for the Burstable family, shown in Microsoft's example as `standardBSFamily`, and retain `name`, `unit`, `currentValue`, and `limit`. The API represents its unit as `Count`; inspect the returned family and unit rather than treating an arbitrary row as a usable B1ms allowance. A zero or fully used relevant allowance blocks the attempt. An absent row, empty response, HTTP 403, or unsupported endpoint is **inconclusive**, not an approval or proof of zero quota. Diagnose the exact response before continuing.

Positive available quota is a useful eligibility signal. It is **not** physical server capacity and does not override a region restriction. This endpoint reports quota usage, not a capacity reservation.

A comparison with East US and East US 2 can help explain the earlier failures, but it is not necessary to repeat their deployments. Change only `locationName` when comparing. If Central US is excluded, compare `southcentralus` and `northcentralus` read-only before choosing at most one fallback. These are a shortlist for evaluation, not claims of current availability; confirm Container Apps Consumption/VNet support and price in the same candidate region before choosing it.

## Step 2: check eligibility and price in the actual create wizard

1. Use **Azure Database for PostgreSQL flexible server → Create**, not Redeploy on the old failed template.
2. Select Azure subscription 1, resource group `rooted_study_app`, **Central US**, PostgreSQL **17**, Burstable **Standard_B1ms**.
3. Confirm there is no explicit subscription/region restriction and B1ms is selectable. If the capability response includes `restricted`, a `Restricted` feature, or a disabled capability with a reason, retain and interpret it. Missing fields are unknown. `OfferRestricted` alone is not the separate location restriction indicator. [Capability field definitions](https://learn.microsoft.com/en-us/rest/api/postgresql/capabilities-by-location/list?view=rest-postgresql-2025-08-01).
4. Select standard **Premium SSD / ManagedDisk, 32 GiB**, its default included performance tier, 7-day backups, HA Disabled, geo-redundant backup Disabled, and availability zone **No preference**. Avoid carrying over more expensive wizard defaults. PostgreSQL 17 is the intended application version; changing from 18 is not a demonstrated cure for capacity errors.
5. Check the actual monthly compute plus storage quote against **$25/month** before creation. Do not assume the previous East US 2 quote or introductory credit applies. Do not select B2s or General Purpose simply to get past a warning without a new cost decision.
6. Run Review + create validation and inspect any errors. A passing validation is another check; it does not reserve capacity. ARM's [validation API](https://learn.microsoft.com/en-us/rest/api/resources/deployments/validate?view=rest-resources-2025-04-01) checks template acceptance, and our earlier deployment already demonstrated that a valid form can fail at allocation.

Public pricing retrieved through the [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices) on October 27, 2026:

| Central US meter | Public rate | Illustrative monthly cost |
|---|---:|---:|
| Flexible Server Burstable B1MS | $0.01921/hour | $14.02 at 730 hours |
| Flex Server Storage, standard Storage meter | $0.13/GB-month | $4.16 at 32 billed storage units |
| **B1ms plus storage** | | **$18.18** |
| B2S compute plus the same storage | $0.07684/hour plus storage | **$60.25** at 730 hours |

These are budget estimates, not a subscription quote or availability check. They exclude tax, separately charged backup usage, networking/DNS, logs, AI, registry and app compute. Check the exact selected disk and displayed units in Portal. See the [captured nonsecret meter snapshot](postgresql-centralus-price-snapshot-20261027.json). The existing **$95 resource-group budget includes AI and remains an alert, not a cap**. Burstable is a pilot choice; monitor CPU credits and connections and size production from measured workload. [Compute characteristics](https://learn.microsoft.com/en-us/azure/postgresql/compute-storage/concepts-compute).

## Step 3: prepare only the selected region's necessary private network

**Correction to the earlier sequencing:** a VNet-integrated PostgreSQL server needs a same-region VNet and delegated subnet at creation. The database cannot first become Ready and then acquire that VNet integration. Defer the application environment and DNS cutover until after database acceptance; prepare the minimal database network before submitting the database.

For Central US, inspect for existing resources first. If absent, the proposed network is:

| Item | Proposed value |
|---|---|
| VNet | `rooted-vnet-centralus`, `10.22.0.0/16` |
| PostgreSQL subnet | `snet-postgresql`, `10.22.2.0/27`, delegated to `Microsoft.DBforPostgreSQL/flexibleServers` |
| Reserved app subnet | `snet-containerapps`, `10.22.0.0/23`, for the eventual Container Apps environment; no environment yet |
| Private DNS | Existing `rooted-postgres.private.postgres.database.azure.com`, after verifying suitability; link selected VNet |
| Server name | `rooted-postgres-centralus`, or available `-01` suffix |
| Connectivity | Private access / VNet Integration; no public database endpoint |

Confirm address spaces do not overlap any actual network intended for later peering. A failed previous database can leave subnet or DNS resources; inspect before reusing or removing them. Do not create networks in every candidate region or create replacement apps before a database works. Do not provision publicly as a throwaway capacity probe: this would not validate the intended network and the two connectivity models are not freely interchangeable. [Private networking requirements](https://learn.microsoft.com/en-us/azure/postgresql/network/concepts-networking-private), [Portal creation settings](https://learn.microsoft.com/en-us/azure/postgresql/configure-maintain/quickstart-create-server).

## Step 4: submit once, then follow the observed result

Record region, version, SKU, disk/backup settings, zone preference, Portal quote, actual state and the nested error code/correlation ID. Do not record passwords, bearer tokens, or complete parameter exports.

| Result | Next action |
|---|---|
| **Ready** | Stop searching regions. Record FQDN and verify private DNS and database access through a private migration/job path before moving the app. |
| Explicit region/subscription restriction | Stop that region. Keep the existing case; obtain access guidance. Consider only the preflighted fallback, without rebuilding applications. |
| Relevant family quota exhausted/zero | Resolve that quota or evaluate the one fallback. A different zone does not fix a quota limit. |
| `SkuNotAvailable` without a zone-specific message | Do not rerun identical creates or assume a version change will fix it. Classify as SKU/allocation failure; compare the preflighted fallback or review a separately budgeted alternative size. |
| Explicit zone-only capacity error | The service specifically identifies a zone. A different allowed zone may be reasonable if it stays within the attempt limit and does not add HA; preserve the exact error evidence. |
| Network/DNS/RBAC/Azure Policy error | Inspect and correct the stated problem before any further submission, staying within the attempt limit; switching database products or regions does not diagnose it. |
| Server not Ready, timeout, or ambiguous operation state | Inspect the existing deployment and server until its state is established. Do not issue a duplicate create while it may still be provisioning. |

After two actual creation submissions without a usable server, stop this managed-server experiment and review the evidence. The fallback shortlist is not an instruction to try every region, and quotas/catalogs cannot guarantee eventual allocation. The open ticket remains the managed-service path to explicit access assistance.

## Step 5: make a successful placement usable

Once one server reaches Ready:

1. Confirm the private DNS zone link and FQDN resolve from inside the selected VNet. Use the finite private migration job path; the public Portal/browser does not itself provide private TCP access to PostgreSQL.
2. Create the application database and apply the current migrations with privileged credentials, then verify the restricted `gather_runtime` role, schema checks, and forced row-level security. Do not use the database administrator as the API/worker account. No demo seed data by default.
3. Create the final Container Apps environment in that region. Deploy API, continuous worker and frontend with fresh versioned images containing the current authentication changes. Keep the existing East US homepage until the replacement is accepted. Shared ACR and AI resources can stay in East US.
4. Verify private database access, API readiness and worker processing in the final environment. Bind the main domain and verify HTTPS before testing the real identity callback. Then verify member/contributor sign-in and human approval/scheduling as part of the full pilot. Preserve the dependency order in the main resume plan and existing identity acceptance checklist.
5. Review backup/restore behavior and actual costs before calling the database deployment complete. If a later support approval arrives for East US after a working placement, it does not by itself justify another move.

## If all managed candidates fail and the deadline cannot wait

The alternative that preserves PostgreSQL and keeps data on Azure is **PostgreSQL on an Azure Linux VM**. It uses VM resource availability/quota instead of the managed PostgreSQL service, so it may bypass this particular service restriction; VM availability is still unproven. It requires a separate decision and a full compute, disk, backup, and access estimate before creation. [Azure VM creation](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/quick-create-portal).

This would add operating-system/PostgreSQL updates, monitoring, backups and restore procedures to our responsibilities. Use persistent managed disks, a private database address, a normal VM subnet (not the PostgreSQL-delegated subnet), and a controlled administration path. An East US VM could potentially use the existing app VNet, subject to inspecting its actual network and VM eligibility. Do not host the durable PostgreSQL data on a disposable Container Apps filesystem. This route preserves database compatibility but increases operational work; it is a contingency, not the first recommendation and not yet an authorized deployment.

## Immediate next step

The Central US quota response has been supplied and does not indicate exhausted total/Burstable allowances. **Proceed to Step 2: configure the proposed server and inspect the actual Portal price and any region restrictions.** If the quote meets the $25 target and the configuration is eligible, prepare the private network and submit one deliberate creation. No allocation success can be inferred yet.
