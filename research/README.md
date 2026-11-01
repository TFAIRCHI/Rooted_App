# Sermon-to-study research package

Research snapshot: **2026-10-18**. Deliverable: product definition, evidence, architecture, and a local UX prototype. Engineering and deployment require a subsequent decision.

Deployment research, **2026-10-25**: [Low-cost Azure deployment and Namecheap domain](Azure%20Deployment%20Research/README.md), comparing Static Web Apps, Storage, the working application's server/database/worker requirements, source-checked DNS steps and a reproducible East US cost example. Research only; no cloud resources or DNS records were changed.

New exploration, **2026-10-24**: [Rooted public website and church signup](Public%20Website%20Research/README.md), with a visual review board, desktop/mobile screenshots, a clickable research prototype, benefits and onboarding design, and source-checked Power of 4 attribution. This is a proposal for review; it does not replace the running application's homepage.

Latest follow-up, **2026-10-22**: [Rooted 1.2.10 church member home and Figma reference research](24-church-member-home-and-figma-reference.md) and [versioned build proposal](../BuildPrompts/1.2.10/README.md). Prepared for review only; it does not change the application's current behavior. The linked Figma file currently requires sign-in, so the visual reference remains uninspected and is a mandatory execution gate.

Prior follow-up, **2026-10-21**: [Rooted 1.2.9 study management, workflow, and engagement research](23-study-management-workflow-and-engagement.md) and [versioned build proposal](../BuildPrompts/1.2.9/README.md). Implementation and open gates are recorded in the 1.2.9 package.

## Start here

For the application's current implementation and deployment, see [Rooted application mental models](Mental%20Model/README.md): member journey, contributor workflow, and Azure infrastructure design. These current-state views supplement the October 18 research snapshot below and distinguish implementation from proposed options.

1. [Executive summary](00-executive-summary.md) and [mental model](01-product-mental-model.md).
2. [Clickable mockups](mockups/README.md), [UX specification](05-ux-information-architecture.md), and [traceability](traceability.md).
3. [Architecture](07-system-architecture.md), [schema](06-data-model-and-tenant-isolation.md), [approval](11-collaboration-approval-and-versioning.md), and [ADRs](20-decisions-and-architecture-decision-records.md).
4. [Roadmap](16-phased-build-roadmap.md), [backlog](backlog.md), and [acceptance scenarios](21-acceptance-criteria-and-test-scenarios.md).
5. [Evidence register](sources.md), [risks](18-risks-assumptions-and-open-questions.md), and [validation report](validation.md).

## Reading conventions

**Verified** means an accessed primary source supports that narrowly stated capability, not that our integration was exercised. **Assumption** means an input to design/costing needing stakeholder confirmation. **Recommendation** means a provisional product or engineering choice. **Unknown** means evidence or a decision remains missing. **Blocked** means a specific action could not be completed. Source IDs link to `sources.md`; prices are snapshots, not quotes. All unspecified product behavior and proposed contracts in this package are Recommendations.

Example church: Grace Community; fictional staff and member names; fictional sermon notes. Series: “To Whom Shall We Go?” — John 6:68. Dates: Monday October 19, Wednesday October 21, Friday October 23, 2026, at 08:00 `America/New_York`. This is a configurable example. No real member data, credentials, account connections, outbound messages, or doctrinal sign-off were used.

## Document inventory

| Document | Decision it supports |
|---|---|
| [00 Summary](00-executive-summary.md) | What to validate and build first |
| [01 Mental model](01-product-mental-model.md) | Ownership and object boundaries |
| [02 Personas](02-personas-and-user-journeys.md) | Jobs and journeys |
| [03 Functional requirements](03-functional-requirements.md) | Scope and contracts |
| [04 Nonfunctional requirements](04-nonfunctional-requirements.md) | Quality targets |
| [05 UX](05-ux-information-architecture.md) | Date-first contributor interaction |
| [06 Data](06-data-model-and-tenant-isolation.md) | Integrity and isolation |
| [07 Architecture](07-system-architecture.md) | Deployable boundaries |
| [08 Planning Center](08-planning-center-integration.md) | Verified integration boundaries |
| [09 Ingestion](09-sermon-ingestion-and-transcription.md) | Source provenance and rights |
| [10 AI](10-ai-workflows-and-guardrails.md) | Contributor control and grounding |
| [11 Approval](11-collaboration-approval-and-versioning.md) | Revision-bound publication |
| [12 Delivery](12-scheduling-sms-and-notifications.md) | Consent and reliable scheduling |
| [13 Security](13-auth-security-privacy-and-compliance.md) | Identity and privacy |
| [14 Stack](14-tech-stack-options-and-tradeoffs.md) | Candidate technology selection |
| [15 Economics](15-cost-model-and-unit-economics.md) | Sensitivities and budget gates |
| [16 Roadmap](16-phased-build-roadmap.md) | Phases and exit criteria |
| [17 Operations](17-testing-observability-and-operations.md) | Deployment, testing, recovery |
| [18 Risks](18-risks-assumptions-and-open-questions.md) | Unresolved decisions and owners |
| [19 Competition](19-competitive-landscape-and-differentiation.md) | Positioning hypotheses |
| [20 ADRs](20-decisions-and-architecture-decision-records.md) | Provisional decisions |
| [21 Acceptance](21-acceptance-criteria-and-test-scenarios.md) | Release evidence |
| [22 Delivery E2E test report](22-delivery-e2e-test-report.md) | Approval, publication, member reading, and Study Engagement evidence |
| [23 Study management/workflow/engagement](23-study-management-workflow-and-engagement.md) | Rooted 1.2.9 approved workflow and lifecycle implementation evidence |
| [24 Church member home](24-church-member-home-and-figma-reference.md) | Rooted 1.2.10 member-home requirements and Figma-access gate |
| [Agentic Research](Agentic%20Research/README.md) | Study co-writer behavior, teaching profiles, Azure setup, and evaluation |
| [Public Website Research](Public%20Website%20Research/README.md) | Public introduction, church/member benefits, CBE evidence, sign-in journey and screenshot review |
| [Azure Deployment Research](Azure%20Deployment%20Research/README.md) | Free public-site hosting versus a complete low-cost pilot, required Azure resources, Namecheap DNS and dated price evidence; [Option B resource breakdown](Azure%20Deployment%20Research/Option%20B/README.md) includes DB alternatives and cost reductions |
| [25 Azure study co-writer](Agentic%20Research/25-azure-study-cowriter-setup-and-costs.md) | Azure setup, phased integration, media storage, and a small pilot budget |

## Repository inspection and method

Initial directory listing contained no existing files; no applicable `AGENTS.md` was found in the workspace, Documents, or user directory. No existing application or conventions were changed. The configured sandbox shell failed to start with access denied; approved shell execution was used for inspection/rendering. Node, Chrome, and Edge were present; Playwright and Mermaid CLI were initially absent. Parallel research tracks cover Planning Center, messaging, and security; separate artifact owners cover UX and architecture. Findings are reconciled in the source register and decision log. No production application was scaffolded.
