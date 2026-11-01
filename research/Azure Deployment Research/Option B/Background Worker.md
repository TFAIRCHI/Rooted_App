# Background Worker — jobs and scheduled processing

## Function

The [current worker](../../../backend/src/workers/worker.ts) polls PostgreSQL every second, processes durable co-writer jobs and handles due publication/provider work. It continues after a browser closes. Its database is the existing durable job store; a separate queue service is not automatically required.

## Cost driver

Option B models **0.25 vCPU/0.5 GiB for 730 hours at active rates**. The standalone worker uses **$14.31/month after assigning the entire shared compute grant to it first**. All application processes together use $15.93. The worker is therefore a more promising saving target than shaving a fraction from public-page rendering.

The active-rate assumption is conservative. Actual idle eligibility depends on replica minimum/state and CPU/network thresholds, not simply whether a human is using the site. Database polling and provider work can keep it active. Measure the Azure meters; do not promise the entire worker will be billed at idle rates. [Billing criteria](https://learn.microsoft.com/en-us/azure/container-apps/billing).

## Alternatives

| Approach | Monthly effect in this model | Pros | Cons / required work |
|---|---|---|---|
| Keep a continuous worker | Baseline **$32.02 core** including database | Closest to current behavior; responsive claims/due work | Allocation remains available all month |
| Finite Container Apps Jobs, 20 billed hours/month | **$16.09 core**, compute inside assumed remaining grant | Reuse PostgreSQL jobs/Node modules; large modeled saving | Add finite entry point, authenticated trigger, bounded concurrency/retries and catch-up scheduling |
| Operator-hours worker/database, 176 hours/month | **$7.64 core** with stated frontend/API usage | Very cheap private demo | No drafting/publication outside hours; database unavailable outside hours; not a continuously available church service |
| Functions timer/queue worker | Separately costed in Option E | Event-driven execution | Function adapter/trigger redesign; storage/runtime/billing differ |

Zero minimum replicas alone is not a trigger for the existing worker. A forever-running loop does not become a finite job just because it is deployed as one. [Scaling rules](https://learn.microsoft.com/en-us/azure/container-apps/scale-app), [jobs](https://learn.microsoft.com/en-us/azure/container-apps/jobs).

For finite jobs, reuse immutable context/confirmation versions, leases, per-day consent, reservations and unknown-submission handling. Start work only after authorized commands, keep a bounded UTC catch-up schedule, limit overlapping executions, and prevent an infrastructure retry from repeating paid inference blindly. Test cancellation, revoked membership, restarts and scheduled publication windows. Added job startup plus schedule interval can delay results.

**Recommendation:** start B with one worker if unchanged behavior is the priority. Optimize this process before considering a database-engine migration; doing so is the documented **B-to-C transition**, not a free configuration switch within unchanged B.
