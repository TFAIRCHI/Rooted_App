# Mandatory testing and phase gates

Prompt version: **1.1.1**. These instructions govern the authorized build. **No application gate has been executed or passed.** The existing [research validation](../../research/validation.md) is artifact evidence only. The full behavior baseline is [AC01–AC29](../../research/21-acceptance-criteria-and-test-scenarios.md).

## Gate rules that apply to every phase

Completion requires **all** applicable checklist items below and **all** checklist items for that phase. Do not count a phase as complete if a required test/review is failed, skipped, quarantined, unsupported or unrun. Keep incomplete work In Progress, Ready for Review or Blocked in the [tracker](PHASE_TRACKER.md).

- [ ] Entire phase scope is implemented, integrated between `frontend/` and `backend/`, and documented; required paths contain no fixture-only implementation or TODO substitute.
- [ ] Relevant unit, real-database integration, API contract and browser end-to-end tests assert behavior and negative cases. Frontend-only state and disabled buttons do not establish backend enforcement.
- [ ] All prior required automated gates pass; unrelated/pre-existing failures are recorded and assessed rather than hidden. Any failure in a required gate prevents completion until resolved or the user explicitly approves a narrower scope.
- [ ] Lint, type checking and production builds pass for both source components. Dependency/security findings that threaten required invariants are resolved before completion; other findings have explicit disposition and owner.
- [ ] Required manual accessibility/product review and authorized provider tests are recorded with reviewer, date, environment and result. Automation does not stand in for human review or a real provider proof.
- [ ] Evidence records the tested revision/file-state fingerprint, exact commands, exit codes, versions, counts, fixture/clock configuration and redacted artifacts. Any change that invalidates evidence is retested.
- [ ] Applicable authorization, tenant, approval, privacy and failure-path checks pass. No confidential bodies, phone numbers, tokens or secrets enter normal logs, CI artifacts or source control.
- [ ] The phase report, acceptance mapping, tracker, setup/configuration and runbooks match the actual result. A runnable local system is not reported as deployed or production-approved.

### Test-command contract to establish during execution

Phase 0 documents planned commands; phase 1A implements them. Prefer a private root workspace with `frontend` and `backend` as the two source workspaces. Provide these root orchestration scripts, or document equivalent commands with the same checks:

| Command | Required behavior |
|---|---|
| `npm run lint` | Check both components using their configured linters |
| `npm run typecheck` | Validate frontend/backend and generated contract/client compatibility |
| `npm run test:unit` | Run deterministic meaningful component/domain unit tests |
| `npm run test:integration` | Migrate disposable PostgreSQL, use actual runtime roles and API/service boundaries, verify constraints/transactions and cleanup |
| `npm run test:e2e` | Start the real local frontend/backend with test identity and database, run browser journeys; stub only explicitly external systems |
| `npm run build` | Produce actual frontend/backend builds; no echo-only or no-op success scripts |
| `npm run test:gate -- --phase <id>` | Run that phase's mandatory automated checks and previous required regressions, save results and return nonzero for failures or required skipped/unrun tests |

The gate runner cannot automatically certify a human review or authorize completion. It reports outstanding manual/provider checks separately. If prerequisite infrastructure is unavailable, return a blocked/nonpassing gate result, not a successful skip. Keep the gate definition versioned and tied to the acceptance mapping.

Use disposable data/environments. Integration tests must use PostgreSQL and the intended pool/role configuration; PGlite research checks or SQLite are not substitutes. Browser tests exercise real API/persistence, fresh sessions and two tenants. Use a controlled clock for publication/DST/retries and live tests restricted to explicitly authorized test accounts/numbers. Never send member messages as a side effect of ordinary CI.

## G0 — Build readiness

Required evidence: phase-0 report, decision log, command/environment manifest, acceptance mapping and prerequisite register. This gate establishes readiness for local implementation; it does not complete the original research's unexecuted vendor or stakeholder proofs.

- [ ] Explicit execution authorization, approved phase range and exclusions are recorded.
- [ ] Applicable repository instructions and current files/changes are inspected. Research/prototype source remains preserved.
- [ ] Existing research validation reproduces, or each discrepancy has a corrected artifact/recorded resolution; it is not reported as an application test.
- [ ] Concrete frontend/backend frameworks, supported versions, database/migrations, identity, queue/storage, test tools and local run strategy are selected with reasons; local defaults make no real provider calls.
- [ ] Tenant roles, approval/calendar semantics, exact two-choice UX and security invariants are translated into implementation decisions without weakening the brief.
- [ ] Every AC01–AC29 has an owning phase, planned test/review layer and evidence requirement. Every high-risk Unknown has an owner and a gate that prevents unsafe activation.
- [ ] Rights, country, provider entitlements, real-church access and human reviews are classified Required/Blocked/Not Yet Needed, with no invented successful proof. Initiate feasible authorized discovery early.
- [ ] Define test commands and clean-environment verification, failure reporting and gate-runner behavior. Missing future phase tooling is planned, not falsely claimed to exist.

## G1A — Foundation and tenant boundary

Primary acceptance: AC13–AC14; infrastructure foundations for AC27–AC29.

- [ ] Clean documented setup starts the real frontend, backend API, worker entrypoint, PostgreSQL and selected local dependencies. Both source components build/typecheck/lint, and CI runs meaningful tests.
- [ ] Migrations apply to an empty database and upgrade the supported prior schema; grants separate migrator/owner and nonowner runtime. No production login has migration/superuser/BYPASSRLS privileges.
- [ ] Authentication validates issuer/audience/session/protocol correctly; expired/revoked sessions and revoked memberships fail. Role/invitation escalation and unassigned contributor actions are denied. Test identity configuration cannot silently activate in production.
- [ ] Seed two churches and distinct member/contributor/approver/admin users. Multi-church switching checks active membership; church admin cannot automatically approve doctrine; platform admin has no implicit private content read.
- [ ] Real runtime-role tests cover RLS reads/writes, composite cross-tenant foreign keys, missing tenant context, tenant reassignment and pooled connection reuse after commit/rollback/error. Never test all isolation as the table owner.
- [ ] Direct API authorization tests cover guessed foreign IDs and stable nonleaking errors. Storage URLs, cache keys and initial job payloads are tenant-bound; add tests as each store is introduced.
- [ ] Contracts/version preconditions and error envelopes have executable tests; generated frontend types match backend contracts.
- [ ] Secret/config validation, redaction, health/readiness and correlation IDs function. Public frontend build output contains no backend/provider secret.

## G1B — Manual sermon and date-first planning

Primary acceptance: AC01–AC03, AC05–AC06, AC10–AC12, AC15, manual portion of AC18; regress AC13–AC14.

- [ ] Browser → backend → database journey creates a manual sermon/notes source, weekly series and independent dated slots. No AI/provider required; corrections preserve source revisions/provenance.
- [ ] Dates/weekdays appear before the planning pane, with time/zone, assignee and distinct plan/content statuses. Keyboard/mobile selection opens the correct date below the selector.
- [ ] Dropdown has exactly the two required primary choices. Scratch fields start blank, notes optional; proposal-unavailable state is truthful before AI exists. No hidden generated content or generation on selecting/viewing a method.
- [ ] Partial drafts save but incomplete plans cannot submit. Typed extensions/schema versions validate. Add Tuesday, change one day's time, change zone and assignment without applying changes to every day.
- [ ] Server acknowledgment, offline/local buffer, sign-out clearing/expiry and same-user/tenant recovery differ correctly. Switching dates, reloads and reconnects preserve work without crossing user/tenant boundaries.
- [ ] Two independent sessions saving one ETag produce a 412 conflict with preserved local work and accessible comparison. Recovery never auto-approves or auto-publishes.
- [ ] Comments/mentions target an exact revision/field and active same-tenant members; changes/assignment notifications deduplicate and exclude private body text.
- [ ] Browser/component tests cover empty/loading/error/forbidden/offline/conflict states. Automated accessibility plus manual keyboard/focus/reflow checks cover complete authoring at phone, tablet and desktop sizes.

## G1C — Independent approvals and member reading

Primary acceptance: AC07–AC09, AC11, AC14–AC15, manual AC21, AC22 and core AC27–AC29; regress all prior gates.

- [ ] End-to-end: contributor drafts plan → submits → reviewer requests changes → contributor revises → reviewer approves exact plan → contributor explicitly creates manual content → separate content review/approval → publisher publishes due-now → member reads the approved snapshot.
- [ ] State-machine tests cover every allowed/disallowed transition. Plans never enter Scheduled/Published. Approval requires the correct capability, current revision/hash/dependency and separation policy; direct unauthorized API commands fail.
- [ ] Database constraints/privileges plus trusted command tests enforce immutable revisions, approval binding, canonical payload/hash/reference equivalence and audit attribution. A research SQL constraint alone is insufficient.
- [ ] Edit-versus-review, approval-versus-edit and publication-versus-edit/cancel tests use separate real database transactions with explicit synchronization; verify ordering, stale preconditions and rollback. Editing approval-sensitive calendar fields also invalidates dependent readiness.
- [ ] Approved plan alone never publishes full content. Editing approved content or SMS preview creates Draft and cancels pending work; prior live publication remains pinned. Superseded plan cannot authorize a new publication.
- [ ] Due-now publication uses a pinned approved occurrence and atomic publication/live pointer/outbox. Duplicate commands/events and crash-boundary tests have one logical database effect. Withdrawal hides the page and records why.
- [ ] Public/member-only pages authorize on the server, work with server-rendered approved HTML and leak no drafts in page data, metadata, API, search or cache. Test direct links as guest, member, outsider and revoked member.
- [ ] Member reading at 320/390px, tablet and desktop, zoom/reflow, keyboard and screen-reader review passes the required scope; complete-process review finds no unresolved required accessibility defect. Store actual screenshots/review notes.
- [ ] Export/deletion and retention foundations are implemented; restore a local/database-plus-required-object backup into isolation, verify integrity/tenant boundaries and reapply deletion/suppression evidence before reopening workers. Report actual recovery duration; do not infer managed-cloud RPO from a local exercise.
- [ ] A designated human reviewer accepts the editorial workflow and explains the distinction between plan/content approval. Real church content still needs that church's pastoral approval before real publication; test accounts are not pastoral sign-off.

## G2 — Controlled AI and source ingestion

Primary acceptance: AC04–AC05, extended AC18–AC21, AI degradation AC28; regress all prior gates.

- [ ] Weekly/day proposals, field assistance and full-study drafting occur only after explicit authorized actions; full study generation requires current approved plan. Viewing a cached proposal does not spend again.
- [ ] Proposal output is separate from the draft. Selective adoption, comparison, edit/reject/undo preserve untouched work and reject stale-base application. Generation never approves, publishes, exports members or sends messages.
- [ ] Church profile/source/model/prompt/schema versions and evidence spans are recorded. Direct quotations compare against authorized source text; nonexistent/mismatched references and uncertain claims never receive verified labels. Interpretation is visibly distinct.
- [ ] Rights checks, quarantine/type/size parsing, private storage and SSRF/redirect controls cover selected upload/link/transcription paths. Partial/chunk failures, cancellation, corrections, duplicate finalization and retries preserve provenance.
- [ ] Cross-tenant retrieval and adversarial direct/indirect/multilingual/encoded source tests prove no unauthorized side effects/disclosure; model refusal text alone is not a pass.
- [ ] Budgets, per-tenant caps, bounded retries, cache invalidation and no-member-data defaults work. AI/transcription failure leaves manual workflows usable.
- [ ] Selected real AI and, if in scope, transcription providers pass authorized representative contract/usage/failure tests. Simulated results do not close this item. Excluding transcription or changing providers requires explicit scope/decision evidence.
- [ ] The selected translation/corpus usage has an authorized rights decision. Church-designated reviewers evaluate the consented benchmark against thresholds recorded **before** the evaluation; doctrine/quality sign-off and unresolved issues are explicit.

## G3 — Scheduling, SMS and member engagement

Primary acceptance: AC09, AC12, AC16, AC23–AC28; regress prior applicable gates.

- [ ] Durable local date/time/IANA/UTC/version resolution matches approved calendar intent. Test spring gaps, autumn overlaps, no-DST/half-hour zones, timezone-data changes and stale jobs.
- [ ] Pending-at-deadline blocks publication/SMS; late approval does not release it. Test preapproved recovery at +15 minutes versus +15 minutes and one second, and approval arriving at +5 minutes. Enforce quiet hours/expiry independently.
- [ ] Real concurrent cancellation/edit/dispatch, lease expiry, process termination/restart and outbox duplication tests demonstrate correct logical publication and recipient intents. SMS failure cannot republish content.
- [ ] Consent evidence is sender/purpose/tenant-scoped. Import does not opt in; STOP suppresses queued intents, fresh consent is required for resubscribe and provider-specific suppression scope is preserved. Test the in-flight STOP limitation honestly.
- [ ] Approved SMS preview, actual provider encoding/segment estimate, per-church sender, recipient geography/zone, budget, registration, send window and explicit expiry are enforced backend-side. Unknown geography or invalid prerequisites hold sending.
- [ ] Authenticated callbacks bind provider account to tenant, reject forgery/cross-tenant routing, deduplicate replays and handle event reordering. Submission timeouts after possible acceptance enter reconciliation; no blind resend or fake read receipt.
- [ ] Authorized provider/test-number round trip demonstrates consent, send/status callback, STOP and suppressed follow-up in the actual approved account/sender setup. Provider registration, country policy and consent review are evidenced; CI/test doubles alone cannot pass.
- [ ] Appreciation reactions require membership and can be moderated. Discussion is off by default; when enabled, test pre-moderation, pending visibility, author edits, private reports, moderator hide/restrict/audit and appeal contact, including direct API abuse.
- [ ] Queue/failed/unknown delivery dashboards, alerts, budget controls, provider outage runbooks, safe replay and recovery tests work. Accessibility/manual review covers scheduling and discussion.

## G4 — Planning Center integration and pilot readiness

Primary acceptance: AC17 and integration portions of AC18/AC28–AC29; final reconciliation of **all AC01–AC29** for default phases 0–4.

- [ ] Reverify official APIs/scopes/events and bind OAuth connections to the correct tenant; encrypted tokens, serialized refresh, revocation/disconnect and lost-permission recovery pass contract/integration tests.
- [ ] Authorized test-church evidence confirms selected episode/notes/media fields, pagination, event names and account entitlements. Signed/authenticated webhook inbox, duplicates/reordering, deletion tombstones, rate limiting and missed-event reconciliation preserve local approved snapshots.
- [ ] The read-only adapter blocks unintended writes even when the product scope permits them. Media/transcript provenance and rights remain explicit; no transcript availability invented from a notes field.
- [ ] Church Center custom links work on devices and direct destination access independently authorizes. Member SSO remains disabled unless ordinary-member eligibility, identity/tenant binding, lifecycle and revocation are actually demonstrated. A documented successful fallback through independent authentication may close the identity decision; it must not be labeled SSO success.
- [ ] Full default-scope acceptance matrix has implementation-test/review evidence for AC01–AC29. Run both-component build/lint/types, unit/integration/contracts, browser/security/accessibility and all prior required gates on the tested state.
- [ ] Exercise the research's capacity envelope with reproducible load and measure read/save/publication performance; remediate unmet adopted targets. Record that monthly availability cannot be established by a short local load run.
- [ ] In an explicitly authorized pilot-equivalent environment, demonstrate monitored backup/restore, required objects/key access, deletion/suppression replay, safe queue recovery and observed RPO/RTO against the adopted targets. If environment authorization is absent, this gate remains blocked; prepare manifests/runbooks without applying them.
- [ ] Security/privacy review, required full-process accessibility review, church editorial review, moderator/consent ownership, support/incident runbooks, cost limits and pilot acceptance are evidenced. Outstanding required jurisdiction/rights/provider decisions block activation and phase completion.
- [ ] Publish an accurate readiness report: local versus pilot versus production evidence, excluded optional features and deployment authorization still required. No live launch is implied by this gate.

## G5 — Selected post-MVP increments

- [ ] User explicitly selects a concrete increment and accepts its scope, acceptance criteria, costs/rights/privacy implications and dependencies before work starts.
- [ ] Assign a separate increment ID, test matrix, gate checklist and evidence report; never check Complete for an undefined list such as “analytics and more.”
- [ ] Implement end-to-end behavior and required negative/security/tenant/regression tests. Billing needs authorization/financial event correctness; each new delivery channel needs its own consent, template, callbacks and retry proof.
- [ ] Demonstrate the increment's adopted performance, accessibility, operations, retention and human/provider requirements; all prior mandatory gates still pass.
- [ ] Record acceptance and limitations; optional unselected increments stay Deferred, not completed by association.

## Acceptance coverage ownership

Create a test-level mapping during phase 0, then replace planned entries with real files/test IDs and review evidence as work proceeds. The phase list below assigns responsibility, not a passing result. Scenarios spanning phases require the full combined evidence for default-scope final acceptance.

| AC | Owning phases |
|---|---|
| AC01 | 1B |
| AC02 | 1B |
| AC03 | 1B |
| AC04 | 2 |
| AC05 | 1B, 2 |
| AC06 | 1B |
| AC07 | 1C |
| AC08 | 1C, 3 |
| AC09 | 1C, 3 |
| AC10 | 1B |
| AC11 | 1B, 1C, 3 |
| AC12 | 1B, 3 |
| AC13 | 1A and every new store/route in later phases |
| AC14 | 1A, 1C, 4 |
| AC15 | 1B, 1C |
| AC16 | 3 |
| AC17 | 4 |
| AC18 | 1B manual, 2 uploads/transcription, 4 imports |
| AC19 | 2 |
| AC20 | 2 |
| AC21 | 1C manual, 2 AI |
| AC22 | 1B authoring foundations, 1C reading, 3 participation, 4 complete review |
| AC23 | 3 |
| AC24 | 3 |
| AC25 | 3 |
| AC26 | 3 |
| AC27 | 1C publication, 3 scheduling/delivery |
| AC28 | 1A foundations, 2–4 provider/operations |
| AC29 | 1C lifecycle foundations, 3 suppression, 4 pilot recovery |

If the user authorizes only a subset, report that subset's completeness precisely and preserve later acceptance as outstanding. Never claim the entire application meets AC01–AC29 after only the manual-core phases.
