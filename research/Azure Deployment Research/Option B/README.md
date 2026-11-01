# Option B — resource-by-resource cost research

Prepared **October 25, 2026**. Research only; no application, database, cloud resource, account or DNS configuration was changed.

**Rooted needs PostgreSQL compatibility for its current implementation; it does not require Azure's particular PostgreSQL hosting product.** Another relational engine is possible after a data-layer/security migration. The [DB document](DB.md) compares Azure SQL Free, Azure SQL Basic, MySQL and self-managed PostgreSQL against keeping the current engine.

## Resources by function

| Document | Function | Is this a separate bill? |
|---|---|---|
| [DB](DB.md) | Durable data, transactions and church isolation | Yes: database compute/storage; alternatives have different allowances |
| [Application Hosting](Application%20Hosting.md) | Website rendering and authenticated API | Yes: allocated Container Apps resources beyond shared grants |
| [Background Worker](Background%20Worker.md) | Durable AI workflows and due publication | Yes: running worker allocation; finite jobs are an alternative |
| [Identity](Identity.md) | Registration, sign-in, recovery and MFA | Potentially $0 core MAU usage; premium/SMS options can add charges |
| [Container Registry](Container%20Registry.md) | Store and distribute deployment images | ACR Basic about $5.07/month in this example; external registry is an alternative |
| [Domain and Networking](Domain%20and%20Networking.md) | Namecheap DNS, HTTPS and application connectivity | Domain renewal/transfer/selected network features; no mandatory Azure DNS or Front Door |
| [Storage](Storage.md) | Durable assets, files and backups | Current PostgreSQL storage is already counted; extra object storage is optional initially |
| [Secrets](Secrets.md) | Protect configuration and credentials | Built-in Container Apps secrets avoid a separate Key Vault initially |
| [Monitoring](Monitoring.md) | Health, logs, usage and budget notifications | Selected ingestion/retention/alerts can be billed; keep explicit limits |
| [Cost Minimization](Cost%20Minimization.md) | Ranked configurations and tradeoffs | Baseline, lean pilot, operator-only demo and migration scenarios |

One Consumption Container Apps environment and a resource group organize the deployment. They are not three additional flat application-hosting fees in the lean baseline. Dedicated profiles, environment private endpoints/planned-maintenance features and attached services can introduce additional charges. [Container Apps billing](https://learn.microsoft.com/en-us/azure/container-apps/billing).

## What consumes the money in the current example?

East US, USD, 730 hours/month, light website/API usage, existing shared compute grants available:

| Cost component | Modeled monthly amount |
|---|---:|
| PostgreSQL B1MS compute | **$12.41** |
| PostgreSQL 32 GB provisioned storage | **$3.68** |
| Frontend + API + continuous worker compute, after one shared grant | **$15.93** |
| **Core Option B** | **$32.02** |
| Optional Azure Container Registry Basic | **+$5.07** |
| **Core plus ACR Basic** | **$37.09** |

The original **$35–$50 infrastructure planning allowance** remains a light-pilot guide, not a cap. AI inference, taxes, domain renewal, build/registry excess, network services, logging and premium identity choices are separate. These are estimates, not measured production costs or a capacity recommendation.

The continuous worker accounts for most of the modeled application allocation. If the entire shared grant is attributed to the worker first, its standalone charge is **$14.31** and website/API add **$1.62**. This is explanatory allocation only: Azure applies shared grants, not an independent allowance to each process.

## Where to start

Keep PostgreSQL for the first deployment, use a small validated nonproduction/pilot configuration, scale the web/API down when idle, avoid unnecessary extra services, and measure the worker. If further savings justify code changes, a finite worker is a smaller change than replacing the relational engine. See [ranked savings](Cost%20Minimization.md).

The original B1MS estimate is a **cost illustration for a constrained pilot**. Microsoft's current guidance positions Burstable mainly for nonproduction and recommends General Purpose for most production workloads. A church service with production availability/performance requirements must be sized and repriced accordingly. [PostgreSQL compute guidance](https://learn.microsoft.com/en-us/azure/postgresql/compute-storage/concepts-compute).

Evidence: [existing core estimate](../pricing/cost-estimate.json), [additional resource rates and scenarios](pricing/resource-rates-and-scenarios.json), [reproduction script](pricing/resource-costs.mjs), and [all deployment options](../option-cost-comparison.md). Eligibility, negotiated rates, region capacity and identity compatibility have not been checked in the user's Azure subscription.
