# Low-cost Azure deployment and Namecheap domain research

**Next session:** [October 28 testing resume](resume-20261028.md). Main-domain HTTPS, member signup and separate contributor login now work; the requested 30-second token tolerance is accepted. Continue real church/workflow and operational testing from that document. [CI/CD runbook](../../deploy/azure/ci-cd-process.md) documents future releases.

**Active deployment handoff (October 26, 2026):** [Path B resume plan](path-b-resume-plan.md) records the user's deployed resources, failed PostgreSQL attempts, region/cost decisions and remaining Portal steps. The research-only statement below describes the original October 25 research, not subsequent user-executed deployment work.

Researched **October 25, 2026**. Research only: no Azure resources, paid subscriptions, public deployments, DNS changes or production accounts were created. No secrets were read or changed.

Start with the [monthly cost for every option](option-cost-comparison.md), then [the deployment decision and step-by-step guide](low-cost-domain-deployment.md). It answers whether **Azure Static Web Apps + a Storage Account** can host Rooted and separates a free public introduction from the complete working application.

| Deliverable | Contents |
|---|---|
| [Deployment guide](low-cost-domain-deployment.md) | Options, required resources, application changes, portal steps, Namecheap records and acceptance checks |
| [Per-option monthly prices](option-cost-comparison.md) | Costs for A–E, Free/Standard variants, Storage alternatives and component breakdowns |
| [Option B resource breakdown](Option%20B/README.md) | Separate functional resource documents, relational database alternatives/pros/cons, recurring charges and ranked cost reductions |
| [Cost model](cost-model.md) | Verified free allowances, dated USD/East US unit rates, explicit assumptions and low-cost alternatives |
| [Retail price snapshot](pricing/azure-retail-prices-2026-10-25.json) | Public Azure Retail Prices API responses filtered to the example's meters |
| [Calculated example](pricing/cost-estimate.json) | Reproducible arithmetic; estimates rather than a subscription quote |

**Recommendation:** Static Web Apps Free is a reasonable first home for Rooted's public marketing pages. It already includes static asset hosting, custom domains and managed certificates, so an additional Storage Account is unnecessary for that stage. For the complete application, retain a server runtime, PostgreSQL and a durable worker. Use the existing continuously running worker for the first functional pilot, then consider a bounded scheduled/on-demand worker to reduce idle costs.

Static Web Apps also supports **hybrid Next.js in preview**. It is not limited to static HTML, but its support for this project's exact Next.js/Node versions, backend proxy and authentication must be proved before choosing that deployment path. The full app cannot be reduced to uploading files to Storage.

Refresh the public retail-price evidence without accessing an Azure account:

```powershell
node "research/Azure Deployment Research/pricing/refresh-prices.mjs"
node "research/Azure Deployment Research/pricing/compare-options.mjs"
```

The refresh script updates the dated snapshot and cost example. It does not deploy anything. Free-offer eligibility and negotiated subscription prices remain unverified.
