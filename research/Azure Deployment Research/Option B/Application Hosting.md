# Application Hosting — website and API

## Function

The Next.js process renders the public/member/workspace pages and proxies browser `/api/v1` requests. The Fastify process authenticates requests, authorizes church access and performs database/provider operations. These are two application processes, not necessarily two permanently running servers.

## Lean Option B configuration and cost

Use a **Consumption** Container Apps environment, a public frontend app and an internally reachable API app. Start with explicit minimum/maximum replicas and verify cold starts, proxy behavior, health probes and resource needs. The example uses frontend **0.5 vCPU/1 GiB**, API **0.25 vCPU/0.5 GiB**, each **20 active hours/month**, and zero minimum HTTP replicas.

Container charges are allocated CPU/memory time plus applicable requests after shared grants; there is no fixed per-website subscription charge in this example. The baseline frontend/API/worker collectively costs **$15.93/month**. If all free allocation is attributed to the worker first, frontend/API add **$1.62**. This is bookkeeping for the example, not a promise of $1.62 website hosting at any traffic level. [Billing](https://learn.microsoft.com/en-us/azure/container-apps/billing), [core calculation](../pricing/cost-estimate.json).

## Cost-minimization choices

| Arrangement | Pros | Cons / expected effect |
|---|---|---|
| Separate frontend/API, HTTP minimum zero | Preserves deployment boundaries; independent sizing; no allocated replicas while scaled to zero | Cold starts; cached/repeated health traffic and cooldown can increase allocated time |
| Co-locate frontend/API containers in one app | Shared lifecycle and local communication; potentially smaller combined allocation | Shared scaling/failure boundary; must test memory and startup; fewer resource names alone do not reduce charges |
| Keep all three processes together permanently | Simple topology | Worker can keep the entire frontend/API allocation running all month; can cost more |
| Static public brochure as a separate SWA | Marketing traffic can avoid waking the app | Extra deployment; member/private SSR still needs the application runtime; not a replacement for the app |

An **untested sizing hypothesis** combines frontend/API into 0.5 vCPU/1 GiB for 20 hours, preserving the separate worker: core falls from **$32.02 to $31.48**, just **$0.54 saved**. Conversely, keeping the original total allocation **0.75 vCPU/1.5 GiB** running 730 hours as one bundled app gives **$69.82 core**, including the database. Consolidation is not automatically economical. [Scenario arithmetic](pricing/resource-rates-and-scenarios.json).

Container Apps supports [multiple containers per app](https://learn.microsoft.com/en-us/azure/container-apps/containers); this research does not claim the bundled sizes are tested. Start with the separated services and measure before consolidating. Use non-loopback production bindings, deterministic images, a build/runtime backend URL, and the existing same-origin session/CSRF boundary.
