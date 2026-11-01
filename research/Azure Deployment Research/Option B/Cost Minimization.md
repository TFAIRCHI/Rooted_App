# Cost Minimization — sensible variants of Option B

All examples use the existing USD/East US rates, a 730-hour month and **one available shared Container Apps grant**. They exclude AI, tax, domain renewal, CI/builds, logs, selected network services and optional extras unless shown. These are alternative scenarios, not additive resources or tested performance configurations. [Calculated evidence](pricing/resource-rates-and-scenarios.json).

## Ranked starting choices

| Configuration | Core monthly example | With ACR Basic | Tradeoff |
|---|---:|---:|---|
| **B baseline:** separate web/API/continuous worker, B1MS PostgreSQL/32 GB | **$32.02** | **$37.09** | Least architecture change; constrained pilot sizing |
| **B lean services:** baseline + existing suitable external registry, built-in secrets, bounded logs, no new edge/object-store services | **$32.02** before ancillary usage | ACR avoided | Reduces optional line items, not magically the baseline compute/database |
| Web/API bundled at 0.5 vCPU/1 GiB for 20 hours, worker separate | **$31.48** | **$36.55** | Only $0.54 modeled saving; resource size must be load-tested |
| **B-to-C:** web/API unchanged, finite worker jobs totaling 20 billed hours | **$16.09** | **$21.16** | Finite entry point/triggers/recovery changes; potentially more delay |
| **Private operator-only demo:** database/worker 8 hours × 22 days = 176 hours; web/API 20 hours | **$7.64** | **$12.71** | Full database-dependent app unavailable outside those hours; not 24/7 church access |
| Port to Azure SQL Basic; retain B's worker/web allocation | **$20.83** | **$25.90** | Full data/security migration; SQL Basic only 2 GB/5 DTUs |
| Port to Azure SQL Free within allowance; retain B's worker/web allocation | **$15.93** | **$21.00** | Full migration; continuous activity can consume the free quota and pause service |

With a qualifying introductory PostgreSQL allowance, the baseline core can fall to **$15.93** temporarily, and bounded jobs can potentially fit within a **$0 core** example. Eligibility is unknown and neither is a free-forever/all-in bill. See [DB](DB.md).

## Why reducing resource count is not necessarily cheaper

The baseline lets the web/API scale to zero while the worker stays available. Bundling all three original allocations into **0.75 vCPU/1.5 GiB running all 730 hours** gives approximately **$69.82 core**, including PostgreSQL. It keeps more CPU/memory allocated for much longer. There may be a lower viable combined size, but that requires measurements; it cannot be assumed to save money because the portal shows one Container App.

## Practical sequence

1. **Decide availability first.** A private demo used by the owner can have agreed operating hours; a member service needs realistic church/timezone availability. Do not describe scheduled downtime as transparent savings.
2. **Reuse the current database engine initially.** Validate the small pilot tier, role/RLS behavior and backups. Share the existing tenant-isolated application DB across churches; do not create one managed server per church.
3. **Set HTTP minimum replicas to zero where cold starts are acceptable.** Keep explicit maximums and validate frontend-to-internal-API wake-up and cookie/proxy behavior. Idle allocation/cooldown still needs measurement.
4. **Measure worker allocation and idle eligibility.** Avoid assuming it is free when no user is connected. Reduce excessive polling only after testing how it changes draft latency and publication recovery; lower CPU/network activity does not guarantee Azure idle billing.
5. **Optimize background execution before an engine port.** Finite jobs offer about **$15.93/month modeled core saving**, versus about **$11.19/month** from PostgreSQL to SQL Basic in the current example. Either involves engineering; estimate the smaller, safer change rather than comparing infrastructure prices alone.
6. **Keep optional services intentional.** Use one appropriate image registry, built-in secrets and existing small DB assets. Quote monitoring, storage or networking features before adding them; do not weaken tenant/security controls to avoid a charge.
7. **Review after seven days.** Recalculate from actual allocation, request volume, DB credits/connections, worker duration and provider usage. B1MS and the example container sizes are not a production capacity or SLA commitment.

## Recommendation

For initial cost efficiency, **retain PostgreSQL and start with a lean measured B pilot**. Consider the introductory DB allowance if eligible; use a compatible existing registry if its terms fit. If the expected monthly bill remains too high, first decide between private operating hours and a finite-worker B-to-C change. Investigate Azure SQL migration as a deliberate project only if long-term savings or other requirements justify its testing effort.

For a 24/7 production church service, re-evaluate Burstable rather than treating the tiny pilot estimate as a deployment promise. [Current PostgreSQL compute guidance](https://learn.microsoft.com/en-us/azure/postgresql/compute-storage/concepts-compute).
