# Research checklist and requirement traceability

Status meanings: **Complete** = design artifact exists; **Open validation** = external proof, user testing, or operational evidence still needed. Design completeness is not production acceptance.

| ID | Requirement / research checklist | Primary artifacts | Mockup | Status / release evidence |
|---|---|---|---|---|
| R01 | Church → sermon → series → dated plan → content | [01](01-product-mental-model.md), [06](06-data-model-and-tenant-isolation.md) | 01, 02, 03 | Complete; AC01 |
| R02 | Date and weekday first, expandable day | [05](05-ux-information-architecture.md) | 03, 04 | Complete; AC02 |
| R03 | Exactly two creation choices | [03](03-functional-requirements.md), [05](05-ux-information-architecture.md) | 04 | Complete; AC03 |
| R04 | Proposal accept/reject/edit/selective adoption | [10](10-ai-workflows-and-guardrails.md) | 05 | Complete; AC04 |
| R05 | Blank manual editor and optional assistance | [05](05-ux-information-architecture.md), [10](10-ai-workflows-and-guardrails.md) | 06, 07 | Complete; AC05 |
| R06 | All six plan fields and extension structure | [03](03-functional-requirements.md), [06](06-data-model-and-tenant-isolation.md) | 06 | Complete; AC06 |
| R07 | Separate plan/content approvals | [11](11-collaboration-approval-and-versioning.md), diagrams | 08, 09 | Complete; AC07–09 |
| R08 | Autosave, switching days, versions, conflicts | [11](11-collaboration-approval-and-versioning.md) | 06, 08 | Complete; AC10–11 |
| R09 | Configurable days/times/zone/assignees | [12](12-scheduling-sms-and-notifications.md) | 10, 13, 14 | Complete; AC12 |
| R10 | Roles, tenant isolation, permissions | [06](06-data-model-and-tenant-isolation.md), [13](13-auth-security-privacy-and-compliance.md) | 14 | Complete; AC13–14 |
| R11 | Comments, mentions, change requests, audit | [11](11-collaboration-approval-and-versioning.md) | 08, 09 | Complete; AC15 |
| R12 | No unapproved publication, pending deadline | [11](11-collaboration-approval-and-versioning.md), [12](12-scheduling-sms-and-notifications.md) | 09, 10, 13 | Complete; AC08–09 |
| R13 | Reactions, moderated discussion, reports | [03](03-functional-requirements.md), [13](13-auth-security-privacy-and-compliance.md) | 11, 12 | Complete; AC16 |
| R14 | Planning Center OAuth/scopes/events/limits | [08](08-planning-center-integration.md), [sources](sources.md) | 02, 14 | Open validation: credentialed PoC; AC17 |
| R15 | Transcript/SSO/posting assumptions challenged | [08](08-planning-center-integration.md) | 02, 14 | Complete evidence boundary; AC17 |
| R16 | Manual/upload/link/transcription/rights | [09](09-sermon-ingestion-and-transcription.md) | 02 | Complete; AC18 |
| R17 | Provenance, Scripture verification, injection | [09](09-sermon-ingestion-and-transcription.md), [10](10-ai-workflows-and-guardrails.md) | 05, 07, 09 | Complete; AC19–20 |
| R18 | Weekly/day AI and explicit devotional action | [10](10-ai-workflows-and-guardrails.md) | 05, 07, 09 | Complete; AC21 |
| R19 | Prompt-only/RAG/provider/cost comparison | [10](10-ai-workflows-and-guardrails.md), [14](14-tech-stack-options-and-tradeoffs.md), [15](15-cost-model-and-unit-economics.md) | 14 | Complete design; model eval open |
| R20 | Mobile, tablet, desktop, a11y | [05](05-ux-information-architecture.md), [04](04-nonfunctional-requirements.md) | 11, 12 | Open validation: device/a11y usability; AC22 |
| R21 | SMS providers, consent, opt-out, costs | [12](12-scheduling-sms-and-notifications.md), [15](15-cost-model-and-unit-economics.md) | 13, 14 | Open validation: vendor/legal onboarding; AC23–25 |
| R22 | DST, retries, idempotency, queues | [12](12-scheduling-sms-and-notifications.md), diagrams | 10, 13 | Complete design; AC26–27 |
| R23 | Authentication versus People directory | [08](08-planning-center-integration.md), [13](13-auth-security-privacy-and-compliance.md) | 11, 14 | Complete design; AC14 |
| R24 | Alternatives, operations, secrets, DR | [07](07-system-architecture.md), [14](14-tech-stack-options-and-tradeoffs.md), [17](17-testing-observability-and-operations.md) | 01 | Complete design; AC28–29 |
| R25 | Costs, competitors, phased plan/backlog | [15](15-cost-model-and-unit-economics.md)–[20](20-decisions-and-architecture-decision-records.md), [backlog](backlog.md) | 01 | Complete; stakeholder validation open |
| R26 | 14 actual PNGs + reproducible source | [mockups](mockups/README.md), [validation](validation.md) | 01–14 | See validation report for actual render evidence |
| R27 | Eight valid Mermaid diagrams | [diagrams](07-system-architecture.md), [validation](validation.md) | — | See rendering evidence |
| R28 | Sources, confidence, unknowns, no production | [sources](sources.md), [18](18-risks-assumptions-and-open-questions.md) | — | Complete; production untouched |

## Checklist to complete discovery

- [x] Inspect workspace and preserve existing files.
- [x] Assign parallel research and reconcile high-risk capability claims.
- [x] Define object ownership, independent approvals, and tenant boundaries.
- [x] Specify UX, API examples, schema, architecture alternatives, and delivery policies.
- [x] Produce prototype source, diagrams, roadmap, backlog, ADRs, and acceptance scenarios.
- [ ] Run credentialed vendor PoCs with a consenting church (Phase 0 exit gate).
- [ ] Observe at least two contributors, one pastor, one admin, and three members using the prototype.
- [ ] Obtain jurisdiction, translation rights, and church SMS campaign approval.

Prototype interaction and artifact checks are recorded separately from these stakeholder/API validation gates in [validation.md](validation.md).
