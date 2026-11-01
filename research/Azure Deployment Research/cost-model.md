# Cost model: a free introduction versus a working pilot

Snapshot: **October 25, 2026**, **USD**, **East US**, pay-as-you-go public retail rates. These are estimates, not an Azure subscription quote. The subscription's offers, credits, other running workloads, regional capacity and actual load were not inspected.

The [Option B resource breakdown](Option%20B/README.md) expands this example into functional documents, including Azure SQL/MySQL alternatives, optional registry costs and worker savings.

## Prices for every option

The original draft priced B in detail but omitted the other paths. The [complete per-option comparison](option-cost-comparison.md) now gives every A–E option, Free/Standard variants, Storage alternatives, component charges, assumptions and free-database scenarios.

| Option | Calculated core/month | Monthly infrastructure planning allowance |
|---|---:|---:|
| A — SWA Free public site | **$0.00** | **$0** within quotas |
| A + optional small Blob account | **$0.07** | **$0.10–$1** |
| Storage website + Front Door Standard | **$35.99** | **$40–$50** |
| B — Container Apps + continuous worker + PostgreSQL | **$32.02** | **$35–$50** |
| C — Container Apps + finite jobs + PostgreSQL | **$16.09** | **$20–$30** |
| D — SWA Free + separate API/continuous worker + PostgreSQL | **$30.94** | **$35–$50** |
| D — SWA Standard + linked API/continuous worker + PostgreSQL | **$39.94** | **$45–$60** |
| E — SWA Free + Flex Functions/Storage + PostgreSQL | **$16.28** | **$20–$30** |
| E — SWA Standard + linked Flex Functions/Storage + PostgreSQL | **$25.28** | **$30–$40** |

These alternatives assume light usage and available grants, exclude AI/domain renewal/tax/other selected services, and are not invoice caps. C and E require worker/serverless changes; D requires compatibility or frontend/authentication changes. Only A and the two public-storage alternatives are brochure-only. The detailed comparison specifies exactly which compute and database services each full-app price includes.

## What can be free?

| Deployment | Cost interpretation |
|---|---|
| Static public introduction on SWA Free | **$0 Azure hosting target within its quotas**; domain renewal and source/build usage remain separate |
| Full current app with continuously running worker and ordinary PostgreSQL pricing | Ongoing infrastructure cost; worked example below |
| Full app after worker optimization, with qualifying introductory PostgreSQL allowance | Potentially near $0 infrastructure under combined limits, temporarily; requires engineering and offer eligibility |
| Full app with an external free PostgreSQL provider | Possible low-cost alternative, subject to compatibility, quotas, backups and provider terms; not an all-Azure resource stack |

**Static Web Apps does not need an extra Storage Account to host its frontend files.** Its [pricing page](https://azure.microsoft.com/en-us/pricing/details/app-service/static/) includes hosting, managed SSL and custom domains. The Free plan has no SLA and is positioned for hobby/personal use; do not promise that a public church service has paid-plan guarantees. Capacity limits and a separate Standard charge become relevant as requirements grow.

## Verified allowances and meter rates

| Item | Source-checked allowance or rate |
|---|---|
| Container Apps Consumption monthly grant | 180,000 vCPU-seconds, 360,000 GiB-seconds, 2 million requests **per subscription**, not per application |
| East US active CPU | $0.000024 per vCPU-second |
| East US active memory | $0.000003 per GiB-second |
| East US idle CPU | $0.000003 per vCPU-second |
| East US idle memory | $0.000003 per GiB-second |
| East US requests | $0.40 per million beyond the applicable request grant |
| PostgreSQL Flexible Server B1MS compute | $0.017/hour |
| Selected PostgreSQL provisioned storage meter | $0.115/GB-month |

Grant source: [Container Apps pricing](https://azure.microsoft.com/en-us/pricing/details/container-apps/). Rate evidence: [saved API snapshot](pricing/azure-retail-prices-2026-10-25.json), retrieved using Microsoft's [public Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices). API filters and meter identifiers are preserved. Rates are not copied from a blog or invented where the pricing website shows dynamic `$-` placeholders.

The PostgreSQL meter selection is specifically Flexible Server B1MS/storage. The same API response family can contain unrelated products or zero-priced storage meters. A free storage meter is not evidence that a complete PostgreSQL server is free.

## Worked example: preserve the current worker

Assumptions:

- One tiny single-region pilot, no high availability. Validate memory, CPU and connection capacity before using these sizes with real churches.
- Frontend: **0.5 vCPU / 1 GiB**, 20 active hours/month, minimum replicas zero.
- API: **0.25 vCPU / 0.5 GiB**, 20 active hours/month, minimum replicas zero.
- Worker: **0.25 vCPU / 0.5 GiB**, running 730 hours/month, conservatively modeled at active rates. It is not safe to assume a polling worker costs zero while awaiting work.
- A single shared free grant is entirely available for this deployment. Requests remain under its grant. No extra replicas.
- PostgreSQL: one B1MS instance, 730 hours, 32 GB provisioned storage, introductory offers not applied.

Calculation:

```text
CPU seconds = (0.5 × 20 + 0.25 × 20 + 0.25 × 730) × 3600
            = 711,000
Memory GiB-seconds = (1 × 20 + 0.5 × 20 + 0.5 × 730) × 3600
                   = 1,422,000

CPU charge = (711,000 − 180,000) × $0.000024 = $12.744
Memory charge = (1,422,000 − 360,000) × $0.000003 = $3.186
Container compute subtotal = $15.93

Database compute = 730 × $0.017 = $12.41
Database storage = 32 × $0.115 = $3.68
Database subtotal = $16.09

Illustrative core infrastructure = $32.02/month
```

The [machine-calculated example](pricing/cost-estimate.json) is generated from the retrieved meters. This is a **usage scenario**, not a minimum invoice, a ceiling, or a capacity claim. Idle/cooldown allocation, cold starts, more traffic, larger memory, exhausted subscription grants and networking can raise the total. A B1MS choice also needs actual workload testing; select a larger tier if needed and recalculate.

For early planning, hold approximately **$35–$50/month before AI, taxes and separately selected services**, rather than advertising a $32 hard cap. This is the author's planning allowance around the worked example, not a Microsoft quote.

PostgreSQL includes backup capacity up to the documented provisioned-storage allowance; excess backup use is additional. Stopping a server stops compute charges but does not remove storage charges. Stopped servers cannot serve the application. [PostgreSQL pricing](https://azure.microsoft.com/en-us/pricing/details/postgresql/flexible-server/).

## How to move closer to zero

1. **Use SWA Free for the public introduction.** This can be the only newly deployed Azure application while the full product remains local. No API, database or model calls are required for its illustrative AI examples.
2. **Check introductory PostgreSQL eligibility.** Azure's free-services offer lists 750 B1MS hours, 32 GB storage and 32 GB backup for 12 months. This is conditional and time-limited; having an Azure account or an existing model deployment does not establish eligibility. Verify the subscription's remaining allowance in the portal. Do not assume a second account resets eligibility. [Azure free services](https://azure.microsoft.com/en-gb/pricing/free-services/).
3. **Reduce worker allocation through bounded jobs.** With the example frontend/API usage, 126,000 CPU-seconds and 252,000 GiB-seconds remain in the shared grant. At 0.25 vCPU / 0.5 GiB, that is approximately **140 active worker hours/month**, including startup. A finite job implementation may fit comfortably, whereas a 730-hour worker does not. Measure startup, actual drafting time, retries and scheduler overhead; do not treat job scheduling as free execution.
4. **Keep replicas and optional services small.** Start with explicit maximums appropriate to the pilot, short logging retention and existing secret storage. An Azure Container Registry, Key Vault, private endpoints, fixed egress/NAT and enhanced monitoring can add charges. An external registry may avoid a new ACR bill but has its own terms and limits.
5. **Consider external PostgreSQL only if acceptable.** Neon's [direct Free plan](https://neon.com/pricing) currently lists $0 with 100 CU-hours/month and 1 GB per project. It is a candidate, not verified compatibility: test creation of the restricted role, ownership/forced RLS, migrations, TLS, connection limits, backups and recovery. Always-on polling can keep serverless databases awake and consume their allowance. Do not assume an Azure Marketplace purchase has the same free terms or region as the provider's direct plan.

The practical near-zero **full pilot** therefore requires both low measured compute and a qualifying/free database arrangement. It is not the unmodified current app running indefinitely for free.

## Other costs and exclusions

| Item | Treatment |
|---|---|
| Existing co-writer model | Separate from hosting. Use the deployed model's actual billing; retain church/run limits. No new model or agent platform is needed merely for domain hosting |
| Identity | Entra External ID's core offering currently includes the first 50,000 MAU; premium features and SMS authentication can be additional. Confirm a suitable MFA method and token integration before relying on $0 identity. [Pricing](https://azure.microsoft.com/en-us/pricing/details/microsoft-entra-external-id/) |
| Domain | Already purchased; annual renewal remains with the registrar |
| File storage | No separate Storage Account required for current logos/reviewed text. Add private Blob storage deliberately when new media demands it |
| Email/SMS delivery | Not required to serve the website; chargeable providers or identity options must be evaluated separately |
| Build pipeline/registry | Existing free allowances may suffice; usage, private artifacts and retention can exceed them |
| Logs, egress, private networking and backups | Inspect separately; not represented by the core compute/database subtotal |
| TLS | Use the chosen host's managed certificate subject to its validation/renewal conditions; avoid buying an additional certificate by default |

## Spending controls

Use resource tags and a resource-group budget with actual/forecast notifications. For example, use review thresholds at $10, $25 and $50 if those match the chosen budget. These are suggested review points, not automatically configured limits.

**Azure budget alerts do not stop resources or spending.** They also evaluate delayed billing data. Enforce actual application model allowances, finite job work/retries, replica caps and log retention; monitor the resulting bill and decide explicitly whether to pause services. [Cost Management budget behavior](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets).

Use a seven-day pilot measurement before committing to a public service level. Record real replica allocation time, request volume, database CPU/storage, model usage and billable ancillary resources. Recalculate after the introductory offer expires. No recurring-cost guarantee is possible from this research snapshot alone.
