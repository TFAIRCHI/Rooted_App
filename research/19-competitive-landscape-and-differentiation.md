# Competitive landscape and differentiation

**Needed:** Understand adjacent offerings before investing in an undifferentiated generator. **Recommendation:** Position the product around church editorial ownership, per-date collaboration, exact-revision pastoral approval and governed delivery. This is a differentiation hypothesis requiring customer and competitor workflow validation.

## Evidence-backed landscape

| Offering / category | What official public evidence establishes | Implication / unresolved comparison |
|---|---|---|
| Sermon Shots | Advertises sermon-derived discussion guides and devotional outputs [S60](sources.md#s60) | “Turn a sermon into questions” is already an available capability. Public evidence here does not establish its revision-bound review or tenant policy model |
| Sermonary Team | Advertises weekly sermon briefs, live notes and team roles including small-group preparation [S61](sources.md#s61) | Team workflow is also an adjacent capability; do not claim collaboration itself is novel |
| Chronicle | Advertises sermon transcription, search/chat and shareable study guides [S62](sources.md#s62) | Searchable sermon libraries and study generation are adjacent; validate actual editorial controls through a demo |
| Planning Center / Church Center | Documented sermon resources, notes and church navigation capabilities [S02](sources.md#s02), [S07](sources.md#s07), [S09](sources.md#s09) | Integrate with an existing church destination; do not promise replacement or undocumented posting/SSO |
| Church SMS providers | Programmatic or church-focused delivery options with differing APIs and consent/accounting models [12](12-scheduling-sms-and-notifications.md) | Delivery could be bought or integrated; building a carrier layer is unnecessary |
| Shared documents + manual texts | **Assumption:** A plausible current workaround, not measured customer behavior | Cheap/familiar; interview churches to learn actual handoff, approval and consent failures |

Public pages are vendor claims, not independent tests. Missing public documentation is not evidence that a competitor lacks a feature. No market-share, accuracy, conversion, or user-count claims are inferred here. Avoid comparing prices until plans, limits, commercial rights and support are equivalent.

## Differentiation hypotheses

1. **Date-first ownership:** A contributor knows “Wednesday is mine” and sees exact review/readiness status without navigating a large chat thread.
2. **Two editorial gates:** Approve teaching intent before investing in prose; separately approve actual member-facing words and SMS preview.
3. **Inspectable assistance:** Optional per-field adoption with source/Scripture evidence, no silent edits, and a complete manual route.
4. **Governed weeklong participation:** Church-specific moderation, consent, local-time publication, mobile reading and appreciation reactions in one workflow.
5. **Operational trust:** Tenant boundaries, review history, explicit blocked deadlines and transparent delivery status rather than autonomous AI publication.

These are product requirements, not established unique market advantages. A competitor may already support them; perform structured demos against [acceptance scenarios](21-acceptance-criteria-and-test-scenarios.md).

## Validation plan and buy/build alternatives

Interview at least five churches with varied staffing and current tools (**Recommendation sample**, not statistically representative). Ask them to demonstrate last week's process; identify who authored, approved and sent each study, and what happened when approval was late. Test the date-first prototype with the same source sermon and compare time to a reviewed day, clarity of responsibility, review burden and recovery from an edit-after-approval. Seek evidence of willingness to pilot and pay; positive comments alone do not establish demand.

Compare buying an existing generator and connecting its export to a governed editorial workspace versus building generation in-house. Buying may accelerate content experiments but must preserve source rights, revision provenance, human approval, export and tenant isolation. Building the workspace and narrow provider adapters offers control but requires support and vendor onboarding. Recommendation: validate the manual workspace's value first, then choose generation implementation based on measured review time and quality.

Dependencies: stakeholder access, comparable competitor demos and feature/contract evidence. Risks: claiming uniqueness from absent docs, underestimating onboarding friction, and measuring engagement instead of teaching usefulness. **Unknown:** target church size, budget, denomination, actual pain severity, existing tool contracts, adoption barriers, and which differentiated controls are purchase criteria. Phase 0 records interviews and comparison outcomes before positioning becomes marketing copy.
