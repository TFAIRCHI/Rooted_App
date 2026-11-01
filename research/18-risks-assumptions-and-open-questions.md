# Risks, assumptions, and open questions

**Needed:** An actionable uncertainty register that prevents design choices from becoming unearned promises. **Recommendation:** Product lead reviews this at each phase gate; each unresolved issue has an owner and a test, not merely a disclaimer. Severity is impact × uncertainty, using qualitative High/Medium/Low rather than invented probability estimates.

| ID | Label / uncertainty | Impact / owner | Resolution and gate |
|---|---|---|---|
| U01 | **Unknown:** ordinary-member OAuth eligibility and Church Center session handoff | High / integration lead | No-scope PKCE `/current/v2/me` trial with unprivileged member; independent app auth until proved; Phase 0 |
| U02 | **Unknown:** automatic transcript availability; notes may be summaries | High / ingestion lead | Fetch test episode, compare notes with authorized audio; retain manual path; Phase 0 |
| U03 | **Unknown:** exact subscribed Publishing event names and coverage of note/resource changes | Medium / integration lead | Enumerate available events, mutate test content, record redacted evidence; periodic reconciliation regardless; Phase 0/4 |
| U04 | **Unknown:** translation and commentary use rights in a paid SaaS | High / product/legal + church | Rights-holder approval or reference-only authorized alternative; before text corpus ingestion |
| U05 | **Assumption:** initial U.S. churches and adult pilot participants | High / product/legal | Confirm country, recipient geography, child/safeguarding policy; block SMS/minor discussion rollout until resolved |
| U06 | **Unknown:** sender account/subaccount ownership and onboarding economics | High / messaging lead | Written vendor confirmation for multi-church use, registration, suppression scope, callbacks and fees; Phase 0/3 |
| U07 | **Unknown:** Text In Church current API and billing model | High / vendor owner | Resolve technical/marketing and credit-page conflicts in writing; no adapter commitment before proof |
| U08 | **Recommendation:** exact revision/dependency approval and cancel-on-edit | High / editorial + engineering | Pastor signs workflow; edit/approve/schedule race tests; Phase 1 |
| U09 | **Risk:** RLS bypass, pool context leaks, secondary-store leakage | High / security lead | Actual runtime-role adversarial tests plus storage/cache/job tests; Phase 1 release gate |
| U10 | **Risk:** hallucinated passage, misleading interpretation, injected source | High / AI + pastor | Licensed quote comparison, evidence labels, task evaluation, no privileged model tools; Phase 2 |
| U11 | **Assumption:** optimistic locking adequate for small teams | Medium / UX lead | Observe collaboration/conflict frequency; add presence or CRDT only if recovery unacceptable |
| U12 | **Unknown:** church self-approval/two-reviewer policy | Medium / pastor | Separate-author default; explicit audited exception or quorum policy; before pilot publication |
| U13 | **Risk:** approval after deadline sends stale material | High / publication lead | Block missed pending occurrence permanently; explicit future reschedule; Phase 1/3 |
| U14 | **Risk:** ambiguous SMS provider acceptance leads to duplicates | High / delivery lead | Keep submission-unknown and reconcile; no blind retry; provider-specific evidence; Phase 3 |
| U15 | **Assumption:** 20 churches/500 recipients/3 studies in capacity model | Medium / operations | Replace with actual pilot distribution and burst tests; before SLO commitment |
| U16 | **Unknown:** moderator staffing and escalation path | High / church admin | Discussion off until policy and assigned moderators exist; reports/appeal tests |
| U17 | **Risk:** member activity interpreted as spiritual maturity | Medium / product/pastor | Aggregate participation only; no spiritual ranking or public nonparticipation lists |
| U18 | **Unknown:** support coverage, region, residency, budget, retention | High / product + operations | Approve hosting, incident roster, DPA/subprocessors, retention and restore worksheet before launch |
| U19 | **Risk:** prototype mistaken for implemented security/publication | High / delivery lead | Label fixtures and local state clearly; acceptance requires future server tests; artifact validation is separate |
| U20 | **Risk:** schedule/approval semantics differ across screens/contracts | High / architect | Canonical [11](11-collaboration-approval-and-versioning.md), exact diagrams, regression cases; final cross-check and stakeholder review |

## Explicit assumptions to validate

The weekly example is fictional and configurable. One dated plan per slot is sufficient initially; multilingual/audience variants may require additional content records. One explicit doctrinal approver is the starting policy, with separate publication permission. Staff can use independent identity accounts. Public reading is optional and participation is authenticated. Most member messages can be a short preview/deep link. None of these is a measured market finding.

## What research has and has not verified

**Verified:** Primary documentation and stated vendor contracts/prices where [sources](sources.md) says so. A documented endpoint is not evidence our credentials can call it. **Unknown:** performance, actual delivery, usability, doctrinal acceptance, legal applicability and vendor account eligibility. **Blocked:** Credentialed integration proofs cannot be completed without authorized test accounts, registered senders and opted-in test numbers. This blocks those proofs, not completion of a desk-research/design package. Rendering/tool limitations, if any, are recorded in [validation](validation.md) with actual results.

## Prioritization and alternatives

Resolve U01–U07 early enough to choose viable onboarding paths. Start Phase 1 with manual sources and independent sign-in so U01/U02 cannot silently gate all value. Avoid postponing consent/sender work until the week SMS is expected to launch. Alternative: fixed vendor dependency before feasibility evidence; rejected because access/pricing gaps are material. Dependencies: stakeholder availability and consenting church accounts. Risks: unassigned questions and optimistic estimates. Review on each phase gate and whenever official documentation, source licenses, policy or provider contracts change.
