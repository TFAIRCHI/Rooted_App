# Decisions and provisional ADRs

**Recommendation:** Keep architecture choices reversible where possible and record trigger conditions for reconsideration. All ADRs below are **Proposed**, pending stakeholder/engineering validation. Desk research does not constitute church approval.

## Decision log

| ADR | Decision / why | Alternatives / consequences | Revisit trigger |
|---|---|---|---|
| 001 | Date-first slots and exactly two creation methods; aligns weekly accountability | Chat-first or editor-first rejected by brief; AI remains contextual | Observed usability changes layout, not this mandatory interaction |
| 002 | Separate plan and content aggregates with immutable approval snapshots | One mutable document is simpler but loses intent/prose distinction and exact approval | Review workload demonstrates need for batch decisions; preserve separate approvals |
| 003 | Cancel pending publication on plan/content edits; require renewed approval | Keeping old pinned schedules risks staff expectations; historical published snapshot stays | Explicit church demand for older-pin scheduling with separate confirmation |
| 004 | Modular monolith + separate worker + transactional outbox | Serverless host viable; microservices deferred due operational/consistency cost | Measured scaling/failure boundary or independent team ownership |
| 005 | Shared PostgreSQL schema, tenant composite keys, forced RLS and app authorization | Database per church provides stronger separation at higher operating cost | Residency, contracted isolation, noisy-tenant or restore requirements |
| 006 | Independent app identity; Planning Center read integration and member identity PoCs | Treating People access as Church Center SSO unverified | Successful ordinary-member, multi-org and revocation PoC |
| 007 | Manual ingestion first; external transcripts optional and reviewed | Full automatic media import would depend on rights/API availability | Verified account/media/rights workflows and measurable import demand |
| 008 | Selected-source AI context, proposal artifacts, explicit adoption | Broad web/RAG/fine-tuning add evidence and rights burden | Evaluated library-retrieval need exceeds bounded context approach |
| 009 | App owns schedules; queue delivers work; publication separate from messaging | Provider-native scheduling risks stale sends after approval change | Proven provider cancellation/version controls and operations benefit |
| 010 | Twilio first technical SMS candidate; church-specific identity and budgets | Clearstream viable operational alternative; TIC blocked for adapter selection until contract clarified | Pilot provider preference, quote, onboarding/API evidence |
| 011 | Optimistic locking with accessible three-way diff/recovery | CRDT and pessimistic locks add complexity or stranded locks | Frequent measured conflicting edits make current UX unacceptable |
| 012 | Public reading optional; member participation authenticated; discussion off by default | Mandatory sign-in may reduce reach; always-public discussion increases moderation risk | Church policy and user testing; retain independent privacy controls |
| 013 | Licensed Scripture text/reference verification, church-approved doctrinal profile | Model-memory quotations cannot establish accuracy/rights | Rights agreement and evaluated alternate text source |
| 014 | Move API/sender/rights PoCs to Phase 0; safe manual publication to Phase 1 | Original strict order delays foundational feasibility and member feedback | Phase 0 capability evidence or staffing changes |

## Expanded ADR 002 — Exact-revision editorial authority

**Context:** A pastor may approve a plan before the reflection exists. Contributors may edit content after review or while publication is queued. A mutable approval flag can authorize words never reviewed.

**Decision:** Append-only plan and content revisions, separately approved. A content revision binds its approved plan dependency and member-facing fields. Publication points to exact approved content with active approval. Editing advances a Draft head and cancels pending occurrences; earlier live publication stays pinned until replacement or withdrawal. Hashes bind canonical payloads, but do not themselves establish identity, doctrine or resistance to privileged tampering.

**Consequences:** More status labels and explicit drafting actions; reliable review history, conflict resolution and audit. Approval/scheduling commands lock common aggregates and use preconditions. See [11](11-collaboration-approval-and-versioning.md), [06](06-data-model-and-tenant-isolation.md), [publishing diagram](diagrams/publishing-sequence.mmd). **Validation:** AC07–11 and AC26–27. **Dependencies:** role policy, transaction design and canonicalization. **Open:** quorum, delegation, and self-approval exception policy.

## Expanded ADR 004 — Modular monolith with worker

**Context:** MVP needs reliable source handling, review, publication, delivery and tenant isolation, with a small team and uncertain scale.

**Decision:** One domain codebase; API and worker processes; managed PostgreSQL/object storage/queue; outbox commits with publication. Modules own writes and expose typed interfaces. Provider adapters cannot make editorial decisions. [S23](sources.md#s23) supports the outbox pattern, not an exactly-once SMS claim.

**Consequences:** Simpler migrations and local transactions; shared database and code deployment need disciplined boundaries. Long operations move to worker; independent services remain an extraction option. **Validation:** transaction/failure tests, burst/connection test and restore drill. **Dependencies:** hosting quote and team competence. **Open:** region/provider and actual capacity envelope.

## ADR template

```markdown
# ADR NNN — Short decision title
Status: Proposed | Accepted | Superseded
Date: YYYY-MM-DD
Owners / approvers:
Requirement IDs / acceptance IDs:

## Context and problem
What is needed, why now, constraints, and what is Verified versus Assumption?

## Options
At least two viable options, costs, dependencies and risks.

## Decision and rationale
Selected option, evidence source IDs, and scope exclusions.

## Consequences and reversibility
Operational/security/UX effects, migration implications, owner and revisit trigger.

## Validation and unresolved questions
Measurable exit evidence; unknowns; rollback/recovery plan.
```

Dependencies: authoritative product owner and church approvers; risks: ADRs diverge from code or treat proposals as authorization. Alternative: undocumented consensus; rejected because future engineering must know which constraints are mandatory. Record acceptance dates only after actual review; no proposed ADR is silently promoted to Accepted by this package.
