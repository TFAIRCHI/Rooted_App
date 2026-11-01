# Monthly costs for every deployment option

Added **October 25, 2026** to correct the original research's missing per-option estimates. These are **alternative deployment scenarios**, not resources to purchase together.

Currency is USD. Compute, Functions, PostgreSQL and Storage use East US rates; Static Web Apps Standard uses its East US 2 meter; Front Door uses North America Zone 1. Monthly assumptions use 730 hours. Public retail rates, model inputs and arithmetic are preserved in the [option price snapshot](pricing/option-retail-prices-2026-10-25.json), [original compute/database snapshot](pricing/azure-retail-prices-2026-10-25.json) and [calculated comparison](pricing/option-comparison.json).

## Side-by-side monthly prices

**Budget column:** a suggested planning allowance for the modeled infrastructure, not a Microsoft quote or hard maximum. **Core column:** calculated hosting + selected storage + PostgreSQL, after the stated compute grants. AI, domain renewal, taxes, registry/build charges, logs, premium identity/SMS and added networking are excluded from both columns. Add those services if selected; no exact all-in total is possible without their usage.

| Original option | What runs | Calculated core/month | Suggested monthly infrastructure budget | Full application? |
|---|---|---:|---:|---|
| **A** | Static Web Apps Free public introduction | **$0.00** | **$0** within quotas | Public pages only |
| **A + optional Storage** | SWA Free plus 1 GB Hot LRS Blob storage and modest operations | **$0.07** | **$0.10–$1** | Public pages only; redundant storage is optional |
| **Storage alternative** | Storage static website + Front Door Standard for custom-domain HTTPS | **$35.99** | **$40–$50** | Public pages only |
| **B** | Container Apps frontend + API + continuous worker + PostgreSQL | **$32.02** | **$35–$50** | Yes, after normal production deployment work |
| **C** | Container Apps frontend + API + finite jobs + PostgreSQL | **$16.09** | **$20–$30** | Yes, after worker refactor and trigger/recovery tests |
| **D, Free frontend** | SWA Free frontend + separate API + continuous worker + PostgreSQL | **$30.94** | **$35–$50** | Candidate; hybrid compatibility or static-client/authentication changes required |
| **D, Standard frontend** | SWA Standard static frontend + linked API + continuous worker + PostgreSQL | **$39.94** | **$45–$60** | Yes after static-client/linked-API integration work |
| **E, Free frontend** | SWA Free + separate Functions Flex On Demand API/finite worker + Storage + PostgreSQL | **$16.28** | **$20–$30** | Yes after substantial serverless/frontend/authentication redesign |
| **E, Standard frontend** | SWA Standard + linked Functions Flex On Demand API/finite worker + Storage + PostgreSQL | **$25.28** | **$30–$40** | Yes after substantial serverless/frontend integration work |

The low-cost C/E examples do **not** keep the existing forever-running worker. Their savings depend on completing and testing the finite-job/function implementation. None of the full-application options has been cloud-deployed by this research. Engineering labor/time is excluded: no implementation billing rate or fixed project price has been agreed. The cheapest monthly bill can require the most code changes.

## Component breakdown

| Option | Website + API + worker/function compute | Selected Blob storage | PostgreSQL | Total |
|---|---:|---:|---:|---:|
| A | $0.00 | $0.00 | $0.00 | **$0.00** |
| A + optional Storage | $0.00 | $0.07 | $0.00 | **$0.07** |
| Storage + Front Door | $35.92 | $0.07 | $0.00 | **$35.99** |
| B | $15.93 | $0.00 | $16.09 | **$32.02** |
| C | $0.00 | $0.00 | $16.09 | **$16.09** |
| D Free | $14.85 | $0.00 | $16.09 | **$30.94** |
| D Standard | $23.85 | $0.00 | $16.09 | **$39.94** |
| E Free | $0.12 | $0.07 | $16.09 | **$16.28** |
| E Standard | $9.12 | $0.07 | $16.09 | **$25.28** |

Displayed components round to cents; totals use unrounded values. Free grants are assumed available to this one alternative deployment. Other workloads in the same subscription can consume them.

## Inputs behind each price

### A — Public website

SWA Free is $0 within its included hosting/bandwidth limits. It includes the static assets and managed custom-domain certificate, so separate Blob Storage is not required. Standard's retrieved US-region price is **$9/app/month**; it is an upgrade choice, not a hidden charge included in A. [SWA pricing](https://azure.microsoft.com/en-us/pricing/details/app-service/static/), [quotas](https://learn.microsoft.com/en-us/azure/static-web-apps/quotas).

Optional Blob example: **1 GB × $0.0208 + 10,000 reads × $0.004/10,000 + 10,000 writes × $0.05/10,000 = $0.0748/month**. This assumes Hot LRS with no additional replication, versioning, inventory, retention or network charges. It is a light illustrative workload, not a minimum charge or a complete media-storage budget. [Blob pricing](https://azure.microsoft.com/en-us/pricing/details/storage/blobs/), [meter evidence](pricing/option-retail-prices-2026-10-25.json).

### Storage website with Azure-managed custom HTTPS

This example specifically selects **Front Door Standard**, rather than claiming every possible external HTTPS proxy has the same price. Its **$35/month base**, plus **10 GB North America delivery at the retrieved $0.0825/GB**, **100,000 edge requests at $0.009/10,000**, and the Blob example, produce **$35.9898 → $35.99/month**. Cached delivery assumes 10,000 origin reads. Additional rules, security features, origin operations or transfer can add charges. This option still does not run Rooted's private application. [Front Door pricing](https://azure.microsoft.com/en-us/pricing/details/frontdoor/).

### B — Current application architecture

Uses the original [worked example](cost-model.md#worked-example-preserve-the-current-worker): frontend 0.5 vCPU/1 GiB for 20 active hours; API 0.25 vCPU/0.5 GiB for 20 active hours; worker 0.25 vCPU/0.5 GiB for 730 hours at active rates. Apply **one shared** Container Apps grant: resulting compute **$15.93**, plus B1MS PostgreSQL/32 GB **$16.09**. [Container Apps pricing](https://azure.microsoft.com/en-us/pricing/details/container-apps/), [PostgreSQL pricing](https://azure.microsoft.com/en-us/pricing/details/postgresql/flexible-server/).

### C — Container Apps with finite worker jobs

Keeps B's frontend/API but replaces the 730-hour worker allocation with **20 total billed job hours/month at 0.25 vCPU/0.5 GiB, including startup**. Combined use is 72,000 vCPU-seconds and 144,000 GiB-seconds, inside the same available grant, so the modeled compute charge is **$0** and PostgreSQL is **$16.09**. More job/startup time, larger allocations or another app using the grant increases cost. This is not achieved by setting the current worker's minimum replicas to zero. [Container Apps jobs](https://learn.microsoft.com/en-us/azure/container-apps/jobs).

### D — Static Web Apps with separate application services

The 20-hour frontend compute allocation is removed from B because SWA provides the frontend host. API plus continuous worker remain: **$14.85** after the shared Container Apps grant. PostgreSQL adds **$16.09**. Free frontend gives **$30.94**; Standard adds **$9**, giving **$39.94**.

For Free, a hybrid Next.js frontend needs proof with Rooted's exact versions/proxy; a static frontend needs a private-page/client/authentication redesign. Do not interpret the Free row as a working linked backend: SWA's bring-your-own API linking requires Standard, and hybrid preview has additional integration limitations. The Standard row assumes a static-client implementation with the linked API, not unsupported hybrid linking. [API support](https://learn.microsoft.com/en-us/azure/static-web-apps/apis-overview), [hybrid preview limitations](https://learn.microsoft.com/en-us/azure/static-web-apps/deploy-nextjs-hybrid).

### E — Functions rather than a continuous API/worker process

Use **Flex Consumption On Demand**, with **no Always Ready instances**. The example provisions 2 GiB instances and assumes non-overlapping billed durations:

| Work | Monthly executions | Seconds/execution | GB-seconds |
|---|---:|---:|---:|
| Ordinary HTTP API requests | 100,000 | 0.2 | 40,000 |
| Finite scheduled checks every five minutes across 730 hours | 8,760 | 3 | 52,560 |
| AI workflow steps, including time waiting on the model | 100 | 60 | 12,000 |
| **Total** | **108,860** | — | **104,560** |

Flex's current grant is **250,000 executions + 100,000 GB-seconds/subscription/month** on eligible on-demand billing. Thus requests cost $0 in this scenario, and excess duration is **4,560 × $0.000026 = $0.11856**. Add **$0.0748** modeled host Blob usage and **$16.09** database: **$16.28336 → $16.28**. Standard adds $9: **$25.28**. The Functions grant does not include host storage. Additional deployment blobs, leases, queues/tables or monitoring use must be measured; the rounded planning budget gives some room but is not an invoice cap. [Functions pricing](https://azure.microsoft.com/en-us/pricing/details/functions/).

The Free frontend row assumes independently hosted Functions endpoints with suitable CORS and an approved authentication redesign. The default Azure HTTPS function hostname avoids assuming a separate custom API certificate is free; it also changes the origin/cookie design. The existing host-only Rooted session cookie cannot simply be copied into that architecture. Use the Standard same-origin linked API option if that is the chosen integration. Static-client rendering and finite worker execution still need implementation in either variant.

Actual cold-start/instance allocation, concurrency and waiting time can differ from this example. Higher usage follows the published metered rates. Do not apply the larger **classic Consumption** grant to **Flex** or assume a constantly running/premium Functions host has these costs.

## Effect of a qualifying PostgreSQL free offer

The preceding totals pay for PostgreSQL. If the actual subscription qualifies for and remains inside the introductory PostgreSQL offer, subtract the modeled **$16.09** from each full-app total for the eligible period:

| Option | Core/month with eligible database allowance |
|---|---:|
| B | **$15.93** |
| C | **$0.00** |
| D Free | **$14.85** |
| D Standard | **$23.85** |
| E Free | **$0.19** |
| E Standard | **$9.19** |

These remain quota-dependent core examples, not a free-forever offer or an all-in bill. Eligibility has not been checked. The Azure offer is time-limited; verify its remaining hours, storage and backup allowances before relying on it. [Azure free services](https://azure.microsoft.com/en-gb/pricing/free-services/).

An external free PostgreSQL tier can potentially replace the modeled database cost as well, but its role/RLS/migration compatibility, quotas and recovery must first be proved. See [external PostgreSQL discussion](cost-model.md#how-to-move-closer-to-zero).

## Recommendation based on monthly cost and implementation work

- **Public website now:** A, **$0 hosting target**.
- **Working pilot with the least architectural change:** B, **$35–$50/month planning allowance**, before excluded charges.
- **Lower ongoing cost while retaining the current server architecture:** C, **$20–$30/month**, after the finite-worker work is complete.
- **SWA is a priority:** D Free/Standard, **$35–$50 / $45–$60**, after the relevant compatibility or frontend changes.
- **Willing to undertake a serverless redesign:** E Free/Standard, **$20–$30 / $30–$40**, after implementing and testing it. The small hosting saving must be weighed against that development effort.

No cloud resources, DNS changes or model calls were made to obtain these estimates. Refresh the calculations with `node "research/Azure Deployment Research/pricing/compare-options.mjs"`; refresh the original compute/database rates first if they have changed. The scripts update evidence/calculated JSON, not the written tables automatically.
