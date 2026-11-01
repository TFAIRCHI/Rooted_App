# Prioritized implementable backlog

**Recommendation:** Engineering stories below remain unstarted. Priority P0 = invariant/core editorial path; P1 = gated extension; P2 = demand-led post-MVP. Relative size S/M/L compares stories, not calendar estimates. Every story requires tenant authorization and accessible UX; those are acceptance conditions, not a later hardening phase.

| Story / epic | Priority / phase / size | Implementable outcome and acceptance | Dependency |
|---|---|---|---|
| D01 Validate identity and Publishing access | P0 / 0 / M | Capture redacted ordinary-member `/current/v2/me`, publishing episode and note results; explicitly record absent capabilities; AC17 | Consenting test church, OAuth registration |
| D02 Validate sender and rights setup | P0 / 0 / M | Obtain provider quote/account model and translation decision; prove consent → send → STOP with test number; AC23–25 | Authorized vendor accounts and rights contact |
| D03 Observe date-first prototype | P0 / 0 / S | Contributors complete manual and proposal routes; pastor correctly distinguishes approvals; record usability findings and fixes | Local prototype and representative participants |
| E01 Establish tenant/account boundary | P0 / 1 / L | Two churches and multi-membership login; cross-tenant requests/assets/jobs denied; platform support has no implicit content access; AC13–14 | Auth/cloud decision |
| E02 Invite and assign team | P0 / 1 / M | Admin invites contributor; approver capability separately granted; invite expiry/revocation; per-day assignment enforced | E01 |
| E03 Capture manual sermon sources | P0 / 1 / M | Title/date/speaker/Scripture/notes and source revision provenance; no integration needed; AC01, AC18 | E01 |
| E04 Build configurable weekly slots | P0 / 1 / M | Add/remove dates, weekday labels, per-day time/zone/assignee and statuses; date-first navigation; AC02, AC12 | E02–03 |
| E05 Manual plan editor | P0 / 1 / M | Exactly two primary creation choices; scratch has six blank labeled fields and typed extensions; AI optional; AC03, AC05–06 | E04 |
| E06 Durable drafts and conflicts | P0 / 1 / L | Server acknowledgment, local recovery, immutable revisions, If-Match 412 and accessible comparison; no lost day-switch edits; AC10–11 | E05 |
| E07 Review plans | P0 / 1 / L | Submit exact revision, anchored comments/mentions, request changes, separate approver decision/audit; AC07, AC15 | E02, E06 |
| E08 Draft/review full studies | P0 / 1 / L | Explicit manual draft from approved plan; independent reflection/discussion/application and preview approval; plan change blocks dependencies; AC07–09, AC21 | E07 |
| E09 Publish/read/withdraw safely | P0 / 1 / L | Due-now approved publication transaction, pinned snapshot, mobile public/member reading and withdrawal; never expose draft in metadata/cache; AC08–09, AC22 | E08 |
| E10 Establish deployment/recovery | P0 / 1 / M | CI role-isolation tests, secret injection, staging, backup/restore drill, alerts and audit retention; AC28–29 | E01 |
| A01 Version church AI profile and evaluation | P1 / 2 / M | Pastor approves profile, corpus rights and benchmark; store prompt/model/source versions; AC19–20 | E03, D02 |
| A02 Weekly/day plan proposals | P1 / 2 / L | Explicit job/cancel, grounded source evidence, selective adoption/reject/diff, no automatic plan mutation; AC04 | A01, E06 |
| A03 Contextual manual assistance | P1 / 2 / M | Field/task scope and compare-before-replace; untouched fields preserved; budgets/outage manual fallback; AC05, AC19 | A01, E05 |
| A04 Explicit full-study AI draft | P1 / 2 / M | Only contributor action after approved plan starts draft; result unapproved and traceable; AC21 | A01, E08 |
| N01 Materialize local-time occurrences | P1 / 3 / L | Store civil intent/version/UTC; gap reject/overlap choice, invalidation and bounded catch-up; AC12, AC26 | E09 |
| N02 Build consent/suppression ledger | P1 / 3 / L | Sender/purpose-specific proof, imported contacts not opted-in, STOP races and new consent path; AC23–25 | D02, E01 |
| N03 Preview and authorize SMS | P1 / 3 / M | Approved preview, per-church sender, segment estimate, eligible audience/quiet hours/expiry/budget displayed; AC23, AC25 | N01–02, E08 |
| N04 Deliver and reconcile | P1 / 3 / L | Outbox/recipient intents, duplicate callbacks, signed callback verification, ambiguous timeout queue and partial-cancel UI; AC24–27 | N03 |
| I01 OAuth lifecycle and sermon sync | P1 / 4 / L | Secure tokens, one refresh at a time, versioned import IDs, revocation and tombstones, periodic reconciliation; AC17–18 | D01, E03 |
| I02 Verified webhooks and Church Center link | P1 / 4 / M | Enumerated event names/signature tests; durable inbox before 200; link opens mobile read with independent auth | I01 |
| M01 Optional engagement and moderation | P1 / 3–5 / M | Authenticated allowlisted reactions, church discussion flag, pending/report/remove/restrict flows and audit; AC16 | E09, assigned church moderator |
| S01 Aggregate analytics and onboarding | P2 / 5 / M | Consent-aware aggregate participation and onboarding funnel; no spiritual ranking; explicit privacy thresholds | Pilot demand, M01 |
| S02 Billing/additional channels | P2 / 5 / L | Separate subscription/usage caps; email/push consent and template lifecycle; no automatic channel fallback | Proven economics, jurisdiction/provider decisions |

## Definition of ready and done

Ready: role/tenant scope, source evidence, state transition and UI state named; acceptance IDs assigned; external access prerequisites resolved. Done: reviewed implementation, invariant tests, accessible complete process, appropriate telemetry/redaction, migration/rollback plan and operator runbook. Product/pastor sign-off is required for editorial semantics, not inferred from unit tests.

Alternatives: build by technical layer or broad feature bundles. Recommendation: thin vertical slices (manual sermon → dated plan → review → study → read) with invariant gates; avoids a large frontend with untested permission semantics. Dependencies/risk: external registration, rights and stakeholder feedback can block specific stories without blocking manual work. Unknown: team velocity and sprint capacity; re-size after Phase 0 and avoid translating story sizes into dates without capacity evidence.
