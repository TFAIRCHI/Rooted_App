# Master Build Prompt — Rooted 1.2.9

**Execution status: approved; implementation in progress.** The user's [published-history amendment](APPROVED_AMENDMENT.md) overrides earlier deletion recommendations in every linked document. Execute every phase below, maintain [phase tracker](PHASE_TRACKER.md), and record actual gate results. Keep source in `./frontend` and `./backend`; retain earlier version snapshots.

## Objective and required reading

Implement the six user requests as one coherent improvement: safe study deletion, correct current-week dates after moves, legible sidebar branding, a month/week/date creation workflow, member comments with automatic policy-based declining, and preparation/engagement Dashboard analytics.

Read [research](../../research/23-study-management-workflow-and-engagement.md), [UX](UX_SPECIFICATION.md), [data/API](DATA_AND_API.md), [tests](TESTING_GATES.md), [traceability](TRACEABILITY.md), [1.2.8 evidence](../1.2.8/evidence/implementation-2026-10-21.md), and scoped AGENTS instructions. Research and local prototype are Recommendations; do not present them as implemented behavior. Resolve actual source differences before applying patches. Do not assume old failed tests are still reproducible or that historical source references are permanent line numbers.

## Product rules

1. Rooted remains the application identity. Church logo/name are prominent, with Rooted below the sidebar church name. Render accessible actual text; remove affected runtime Gather replacements and generated-content workarounds when replacing those components.
2. Contributor flow is **Create Study → Gain Approval → Publish Study**. One final immutable study approval; optional planning context is not another approval task. Keep the live iPhone preview and saved-state recovery.
3. Group by month/week/current slot dates across all source series. Use the proposed Sunday–Saturday month-clipped convention consistently unless the review explicitly changes it. Current month/week comes from church-local time.
4. Ordinary Delete is limited to never-published studies. Ever-published studies are unique historical artifacts: Withdraw hides them from members while preserving exact history/engagement. A separate admin-only Hard Delete is available only after withdrawal, with typed irreversible confirmation and reason. Follow the amendment's purge/audit/tenant/concurrency requirements. Members cannot manage lifecycle.
5. “Negative” for this proposal means hostile/policy-breaking comments. Automatically decline confident violations; grief, prayer requests, sincere questions, and respectful disagreement remain eligible for human approval. Uncertainty/provider failure stays private pending. If review changes this definition, update policy/corpus/copy before coding.
6. Dashboard sections: **Study Preparation** (Weekly Readiness, Review Queue, Publication Readiness) and **Member Engagement** (unique opens/audience, reactions, unanswered questions). A view is an opening, not proof of reading; external notification delivery is a separate fact.
7. Preserve tenant isolation, immutable revisions, exact-approval publishing, late approval/immediate delivery, optimistic locking, retries, and idempotency. No due-window approval blocker may return.

## Phase table

Relative effort is comparative, not a promised timeline. Every phase requires its whole gate, evidence, and tracker update. The live execution status is maintained in [phase tracker](PHASE_TRACKER.md).

| Phase | Deliverables | Dependency | Relative effort / risk | Completion gate |
|---|---|---|---|---|
| 0 | Source/browser baseline; contract and fixture lock; carry-forward failure inventory | Approval of this prompt | S / medium | Six issues mapped; relevant current failures captured; calendar/moderation defaults explicit |
| 1 | Deletion, active-date constraint, synchronized move/calendar revisions, safe workers | 0 | L / high | Deletion/move/API/tenant/concurrency tests pass; no obsolete publication |
| 2 | Declarative brand component, month/week/date navigation, three-step editor and one save/submit | 1 | L / medium | Responsive/keyboard tests; one final approval; latest writing submitted |
| 3 | Member guidance, versioned automated decline/manual fallback, replies/resolution | 0 policy, 1 deleted-root guards, 2 workflow | L / high | Moderation corpus/orchestration/security tests; no unsafe preapproval exposure; questions can be answered |
| 4 | Publication audience, first opens, server Dashboard projections and engagement filters | 1–3 | L / high | Exact deterministic metric fixtures, privacy/authorization checks and legacy unknown states |
| 5 | Full changed-journey E2E, regression, operational evidence and screenshots | 1–4 | M / high | Every gate in testing document passes; failures are not waived or hidden |

## Phase 0 — Reproduce and contract lock

- Inspect current source and version state; do not overwrite existing local changes. Capture relevant API/browser behavior using isolated fixtures, not destructive cleanup of the user's prepared studies.
- Establish fresh unit/integration/browser baseline. Diagnose the previously documented isolated Next/Playwright process termination if it still blocks required tests; do not substitute API-only proof for a browser gate.
- Reproduce Dashboard move within week, out of week and across month; selected nonfirst-series drag; content calendar after move; undersized sidebar logo; lack of delete; comment policy; absent view/answer data.
- Inventory routes/workers/grants, role mappings, `INSERT INTO slots VALUES`, review requests, cancellation and privacy exports. Document duplicates before creating a church-wide active-date index.
- Lock the proposed routes/DTOs/week convention and moderation definition from [data/API](DATA_AND_API.md). Record review changes in this version's execution evidence without altering old snapshots.

**Gate:** reproducible baseline and impacted paths/fixtures listed; unknown provider access and inherited failures explicitly recorded.

## Phase 1 — Lifecycle and date correctness

- Implement additive tombstone/lifecycle-version migration, delete permissions/backfill, active-date constraint and duplicate repair report. Replace the old unconditional per-series date index so deleted dates can be reused in the same container. No immutable-row updates/deletions. Update positional inserts and runtime grants.
- Add the study-root deletion command and UI action contract. Cancel pending review/scheduling/sending/AI adoption work, hide member/public access, and preserve authorized historical engagement.
- Apply compatible lock order and deleted-root checks in commands, publication worker, provider claims/callback reconciliation and community paths. No promise to recall already-sent messages.
- Repair rescheduling so current slot, new plan revision and new content calendar revision agree; cancel old intent and renew final study approval only for actual unpublished calendar changes. No-op and assignment-only edits are distinguished. Optional planning-note edits do not revoke an independently approved final study.
- Replace first-series/DOM-index drag inference with explicit slot ID/target date events and reliable cleanup; use church-wide conflict checking. Maintain accessible date-picker movement and unchanged assignees unless edited.
- Use one date/status projection and explicit selected-week range for all consumers. Prevent out-of-order church/week loads overwriting current state.

**Gate:** [D01–D08 and R01–R09](TESTING_GATES.md) pass; move/save/approval/publishing preserves the new calendar; old due time does not deliver.

## Phase 2 — Workflow and branding

- Implement the reusable brand rendering and consolidate conflicting rules. Use available sidebar width with a 112 px-high contained logo stage; church name then smaller Rooted. Preserve the large centered header logo. Use original aspect metadata to choose square-mark/wide-lockup or a source-preserving sidebar derivative; test actual visible artwork, not merely a padded image box. Never crop source design whitespace. Test actual upload asset padding, replacement and church switching.
- Replace series-first navigation with month/week/date selection, all active studies grouped by actual local date, empty weeks and simple Add study. Backing series/source provenance remains compatible but optional to the user.
- Render one three-step semantic workflow and one current primary action. Remove conflicting separate-plan review guidance, hidden duplicate submit controls, and generated-content label replacement in affected components.
- Connect submit to the editor save-drain/optimistic-locking mechanism: finish the user's latest writing, validate saved required fields, then atomically select approver and submit that exact saved revision. Stop on save failure/conflict; no stale saved revision is accidentally submitted.
- Keep phone preview, contextual AI assistance, manual creation, optional notes, comments and history. Remove hidden separate-plan-approval dependencies in AI source checks, draft generation and adoption; bind suggestions to authorized rights-checked source/draft snapshots instead. Reviewer can view only what current permissions/assignment allow; no expanded cross-tenant draft access.
- Preserve deep links, browser history, account/sign-out, current church context and unsaved work when browsing weeks or deleting the selected study.

**Gate:** [U01–U08](TESTING_GATES.md) pass; no plan-only status says publish-ready; responsive snapshots and keyboard evidence recorded.

## Phase 3 — Member conversation and automatic moderation

- Extend the existing discussion system with Response/Question, warning/examples, declined state, author feedback and private review.
- Add versioned evaluation records/jobs, classifier adapter/schema/budget/timeouts and deleted/disabled/edited guards. No provider call inside a long-lived DB transaction. Treat member text as untrusted data.
- Confident policy violations become declined; all others remain pending human review. Human decisions take priority over delayed machine output. Provide audited reversal and retained evidence.
- Select/configure a classifier only after current official API/retention/pricing verification for that provider. Evaluate domain examples and holdout errors with church stakeholders. Fixture results prove wiring, not classifier accuracy. If no provider is available, ship-visible manual fallback may be implemented but the automated-moderation release gate remains incomplete.
- Add authorized contributor replies, same-publication parents, explicit resolved/reopened question state and filters. Public authorized reply and answered update are atomic. Edits/hidden answers update unanswered counts correctly.
- Update moderation inbox, engagement detail, settings/help, privacy handling and DTOs together. Keep discussions off until intentionally enabled for a church.

**Gate:** [C01–C10](TESTING_GATES.md) pass; documented classifier evaluation and false-positive review; no claim to detect every negative utterance.

## Phase 4 — Dashboard and engagement analytics

- Capture member audience in publication transaction; implement idempotent authenticated first-open endpoint after successful visible study display. Exclude previews, public traffic, failed loads and prefetches.
- Add privacy-aware views/audience storage, indexes and retention configuration. Historical missing denominators stay unknown; no fake member count backfill. Separate new-member opens from original-audience fraction.
- Build authorized server-side readiness and engagement summaries with independent aggregates and exact metric definitions. Use selected church-local week for readiness; latest current publication or explicit selection for engagement.
- Update Dashboard into the two specified groups; preserve correct next-action/deep links and current church. Add scope/as-of labels, no-publication/loading/error/unknown states, and independently retryable analytics.
- Reuse Study Engagement filters for questions/reactions/views/context. Align archived/deleted list/detail history and stable tie-breaking cursors so no dead links or skipped records remain.

**Gate:** [A01–A08](TESTING_GATES.md) pass; fixture counts match API, Dashboard and engagement; views are explicitly opens.

## Phase 5 — Proof and handoff

- Complete every canonical browser journey and tenant/concurrency/worker negative case in [testing gates](TESTING_GATES.md). Include clean-database and upgrade-data migrations.
- Run contract/typecheck, lint, unit/operations, integration, E2E, build, and research gates using repository commands. Record counts/exit codes/artifacts and honest blockers. Do not delete failing tests, hide errors, weaken approval or convert missing data to success.
- Produce screenshots of the implemented large logo, date workflow, both Dashboard sections, delete confirmation, declined comment, and contributor reply. Keep illustrative preview screenshots distinct from implementation evidence.
- Add operational logs/metrics for deleted work suppression, date conflicts, stale saves, comment evaluation latency/failures/reversals, open-record failures and unanswered questions. Exclude member text/secrets from general logs.
- Preserve 1.2.8 history. Resolve inherited blockers necessary for the changed end-to-end paths, list unrelated failures separately, and leave the final release gate incomplete if mandatory suites still fail.
- Update phase tracker and append research evidence only from actual results. Final handoff: what changed, gates passed, remaining failures/limits, and exact contributor/member test steps. Provider-disabled web success does not establish SMS/email/push success.

**Final gate:** all requested changed paths are functional and browser-proven, all required gates pass, and no critical/high lifecycle, authorization, moderation-exposure or publication regression remains unresolved.

## Engineering constraints

Keep changes focused, use existing module/worker/PostgreSQL architecture, add migrations rather than rewrite applied ones, and preserve original fixtures/data. The amendment permits narrowly scoped immutable cleanup only for deliberately confirmed admin Hard Delete; ordinary writes remain immutable. Do not introduce microservices, new role-selection trust, a second comment store, or third-party analytics as a shortcut. Use real component rendering instead of timer/DOM/text-matching hooks for the rebuilt interactions. Follow repository conventions and scoped AGENTS instructions. Production execution ends with evidence, not a checklist marked complete based on source inspection.
