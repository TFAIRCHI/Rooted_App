# Executive summary

**Recommendation:** Begin with a church workspace that supports manual sermon notes, dated study planning, independent pastoral review of plans and full studies, and mobile reading. Keep AI optional and make every adopted suggestion a contributor action. A date is the unit of work; immutable revisions are the unit of approval.

The product serves a teaching mission under church leadership. Successful use means a contributor can prepare a coherent week, a pastor can inspect what changed and approve the exact words, and members can return to Scripture together. Reaction counts measure participation, not spiritual maturity. “To Whom Shall We Go?” — John 6:68 illustrates Monday October 19, Wednesday October 21, Friday October 23, 2026, 08:00 America/New_York. Dates, schedule, and doctrinal preferences are tenant settings.

## Consequential findings

| Finding | Consequence |
|---|---|
| Planning Center integration needs a credentialed capability check; directory data is not member authentication | Independent sign-in and manual ingestion are viable launch paths; see [08](08-planning-center-integration.md) and source evidence |
| Scripture references and generated interpretation have different verification needs | Record verse source, translation, source spans, and reviewer decisions; no generated “verified” badge |
| Approved content must remain tied to an immutable revision | Editing creates another revision; revoke pending schedules and request approval again; [11](11-collaboration-approval-and-versioning.md) |
| PostgreSQL RLS has privileged-role exceptions | Enforce application authorization and composite tenant keys as well as RLS; [S20](sources.md#s20) |
| SMS cost and delivery depend on segments, route, registration, and consent | Use a consent ledger and per-church identity; price messaging separately; [12](12-scheduling-sms-and-notifications.md) |

## Product and architecture choice

**Recommendation:** React/TypeScript UI, modular Node/TypeScript application and worker from one codebase, managed PostgreSQL, private object storage, managed queue, and narrow AI/SMS adapters. A serverless API/worker architecture is also viable for irregular usage; microservices add avoidable ownership and transactional coordination costs at this stage. [07](07-system-architecture.md) and [14](14-tech-stack-options-and-tradeoffs.md) compare alternatives.

Release gates are exact-revision approval, tenant isolation, recoverable drafting, accessible date-first UX, and reliable publication. AI and SMS are capability flags with independent rollout gates. Scheduling never converts pending review into approval; the missed occurrence is blocked and staff must explicitly reschedule. Readable public pages may be enabled by church policy; member participation requires authentication.

## Delivery decision

Run Planning Center, sender-registration, and translation-rights PoCs during Phase 0 even though deep integrations arrive later. Deliver the manual editorial slice in Phase 1; add AI in Phase 2 and consented SMS in Phase 3. Basic safe publication belongs in Phase 1 so member pages can be exercised without messaging. See [roadmap](16-phased-build-roadmap.md).

**Unknown:** Initial country, member age policy, translation licenses, church doctrinal profiles, Planning Center account entitlements, approved SMS sender route, and budget. These are explicit [risk-register](18-risks-assumptions-and-open-questions.md) items. No authenticated vendor API behavior or user usability outcome has been demonstrated by desk research.

First implementation slice after approval: two isolated test churches; one manual sermon and one dated plan per church; reviewer approval; explicit manual full-study draft; separate content approval; authenticated member read. Include a negative test proving church A cannot retrieve church B's content and an edit-after-approval test proving publication is blocked.
