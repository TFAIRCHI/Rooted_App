# Master build prompt — Sermon-to-study discipleship platform

Prompt version: **1.1.1 — 2026-10-18**. Status at archival: **Authorized for phases 0–4; phase 0 in progress.**

This version is an immutable instruction snapshot after archival. The tracker and versioned evidence remain dynamic. A new build request creates the next patch version (1.1.2); status questions and continued work on this build do not.

## 1. Mission and execution authorization

You are the implementation lead for a multi-tenant church discipleship application. Build the application using this prompt and the repository's research as the specification. Church leaders retain doctrinal and editorial authority. AI assists contributors; it cannot approve, publish, or send messages on its own.

**First check:** Has the user explicitly authorized execution of this prompt in the conversation? If not, stop after reporting that it is awaiting approval. Do not scaffold `frontend/` or `backend/`, install application dependencies, connect accounts, or implement features merely because this prompt exists or was opened.

Once authorized:

1. Record the user's approved phase range and material constraints in [PHASE_TRACKER.md](PHASE_TRACKER.md), quoting or accurately identifying the authorization. Never self-authorize by editing a checkbox.
2. If the authorization names no phase range, the implementation scope is phases **0–4** below. Phase 5 is a menu of future increments and requires separately selected scope. A narrower user instruction always controls.
3. Proceed autonomously within the authorized range. Pass each dependent gate before starting the next dependent phase. Independent research, provider setup investigation, and test design may proceed in parallel.
4. Local implementation, fixtures, test infrastructure, and simulation are distinct from production activation. Do not deploy, incur unapproved external charges, contact real members, connect a real church account, or send live messages without the applicable explicit authorization and prerequisites. Use local/test adapters by default.
5. If a gate needs unavailable credentials, a rights decision, church review, or an authorized environment, implement what can be verified locally and record the remaining gate as blocked. Do not label the phase complete, invent evidence, or replace that gate with a simulation. Continue only independent, authorized work that does not depend on the unmet gate.
6. Stop at the end of the approved range. Report working behavior, exact tests, remaining blockers, and the next eligible phase. Do not commit, push, publish, or deploy unless explicitly requested.

## 2. Read the specification before editing

Inspect the current repository, working changes, and applicable `AGENTS.md` instructions. Preserve existing research and unrelated user work. These links are relative to this prompt:

| Read | Use |
|---|---|
| [Research index](../../research/README.md), [summary](../../research/00-executive-summary.md), [mental model](../../research/01-product-mental-model.md) | Mission, ownership, independent objects and revision boundaries |
| [Functional requirements](../../research/03-functional-requirements.md), [quality targets](../../research/04-nonfunctional-requirements.md), [UX](../../research/05-ux-information-architecture.md) | Required behavior, measurable targets, screen states and accessibility |
| [Mockup inventory](../../research/mockups/README.md), [prototype](../../research/mockups/source/index.html) | Visual/interaction reference; inspect PNGs and interactive states, not just filenames |
| [Data model](../../research/06-data-model-and-tenant-isolation.md), [representative schema](../../research/schema.sql), [architecture/contracts](../../research/07-system-architecture.md) | Tenant constraints, API preconditions, transactions, workers, outbox |
| [Planning Center](../../research/08-planning-center-integration.md), [ingestion](../../research/09-sermon-ingestion-and-transcription.md), [AI](../../research/10-ai-workflows-and-guardrails.md) | Verified integration boundaries, source rights and contributor control |
| [Approval/versioning](../../research/11-collaboration-approval-and-versioning.md), [scheduling/SMS](../../research/12-scheduling-sms-and-notifications.md), [security](../../research/13-auth-security-privacy-and-compliance.md) | Canonical lifecycle, calendar, consent, privacy and authority rules |
| [Stack options](../../research/14-tech-stack-options-and-tradeoffs.md), [cost model](../../research/15-cost-model-and-unit-economics.md), [roadmap](../../research/16-phased-build-roadmap.md), [operations](../../research/17-testing-observability-and-operations.md) | Technology decisions, budgets, delivery sequence, recovery and telemetry |
| [Risks](../../research/18-risks-assumptions-and-open-questions.md), [ADRs](../../research/20-decisions-and-architecture-decision-records.md), [acceptance scenarios](../../research/21-acceptance-criteria-and-test-scenarios.md), [backlog](../../research/backlog.md), [traceability](../../research/traceability.md) | Unknowns, proposed choices, implementable stories and release evidence |
| [Sources](../../research/sources.md), [research validation](../../research/validation.md) | Evidence freshness and the distinction between research checks and system acceptance |

Read the relevant Mermaid diagrams before implementing the corresponding state transitions. The schema is illustrative, not a ready-made migration. Complete missing entities, constraints, grants, workflow enforcement, and migrations deliberately; do not copy it and declare application integrity solved.

User requirements and explicit approvals control. Use research chapter 07 for canonical API contracts, chapter 11 for revision/approval semantics, and chapter 12 for scheduling/delivery. If documents conflict, record the discrepancy and a reasoned decision before coding that behavior. Preserve mandatory product constraints; seek clarification only where a material unresolved choice prevents safe progress. Research ADRs are Proposed until actually accepted; record implementation decisions and why in a build decision log without rewriting historical findings as verified facts.

Recheck official documentation at implementation time for provider APIs, dependency versions, security configuration, and prices. Record changed evidence and its date; do not assume the research snapshot remains current.

## 3. Required application source layout

Create the following **during authorized execution**, at the repository root:

```text
frontend/
  src/
    app/                 # Routes, layouts, staff and member UI; framework-specific names may vary
    components/
    features/
    api/                 # Typed API client, optionally generated from backend contracts
    lib/
  tests/
  e2e/
  public/
  package.json
  README.md
backend/
  src/
    api/                 # HTTP boundary and authentication/authorization middleware
    modules/             # Tenancy, sermons, plans, content, reviews, engagement, delivery
    workers/             # Ingestion, generation, scheduler, outbox and delivery entrypoints
    integrations/        # Provider-specific adapters and verified callback handling
    infrastructure/      # Database, object storage, queue, secrets and telemetry adapters
  contracts/             # OpenAPI and versioned request/response schemas
  migrations/
  tests/
  package.json
  README.md
BuildPrompts/
  1.1.1/
    evidence/              # Created during execution; actual phase reports and redacted results
research/                # Preserved research/design artifacts
```

`./frontend/` owns all UI application code and UI tests. `./backend/` owns all API/domain/business logic, persistence, security enforcement, provider adapters, workers and backend tests. Keep the backend API and worker in one backend codebase with independently runnable entrypoints. Do not create an additional root `src/`, `api/`, `web/`, or shared application package containing a third source component.

Root workspace manifests, lockfiles, documentation, CI configuration and local orchestration are allowed. Keep generated API client code in `frontend/src/api/`, with its authoritative schema in `backend/contracts/`; do not duplicate business rules across the two components. Framework-specific adjustments inside each directory are fine if documented. Never import backend implementation modules into the frontend bundle.

Frontend server-side rendering may call the backend but must not access the database, secrets for integrations, or domain commands directly. Use a documented same-origin development/production routing strategy and preserve canonical backend `/v1/...` routes. Account for proxy URLs in cookies, OAuth callbacks and provider signature verification. Secrets stay server-side; public frontend configuration must be explicitly allowlisted.

## 4. Architecture and defaults to resolve in phase 0

Use the research's recommended modular monolith with a separate worker process, PostgreSQL, private object storage and a durable queue/outbox. Candidate stack: React/TypeScript with server-rendered published member pages, Node.js/TypeScript API, and managed OIDC identity. Select concrete frameworks, supported versions, migration/query tooling, timezone library, local dependencies, and test runners in phase 0; record reasons and pin dependencies. Favor operational simplicity over microservices.

Application-owned memberships/capabilities authorize tenant access even when identity is delegated to OIDC. Local development may use a local test identity provider with actual protocol validation; it must not introduce an unrestricted authentication bypass that can run in production. Do not implement custom password storage simply to avoid an unresolved provider choice.

Provide deterministic local fixtures for two fictional churches and the specified roles. Start with manual sermon notes and Scripture references. Provider adapters must support controlled test doubles, with live activation explicitly disabled until their respective gates pass. A test double must be labeled and must never fabricate a successful live delivery, citation verification, or provider connection in the UI.

## 5. Product constraints that every phase must preserve

### Date-first contributor experience

The planning screen begins with selectable calendar dates and weekdays, with per-day time/zone, assignees and separate plan/content statuses. Selecting a date expands that day's pane below the date controls. Its creation dropdown has exactly two primary choices, with these exact labels:

1. **View proposed study plan**
2. **Create study plan from scratch**

Viewing an existing proposal does not generate another one. Generating/refreshing a proposal requires explicit action. Before AI is available, retain the two choices and explain proposal unavailability without inserting fake generated work. Scratch starts with blank title, primary Scripture, learning objective, outline/key talking points, discussion question and optional notes; structure supports versioned extensions.

Provide contextual **Ask AI for assistance**, with Scripture context, objective, outline, question and application tasks. Keep suggestions separate and inspectable. Explicitly accept selected suggestions, compare before replacing nonempty work, preserve untouched fields and allow undo. Never silently overwrite a contributor's draft. Manual work continues with AI disabled or down.

Switching days preserves work. Distinguish server-saved, saving, offline/local-recovery and conflict states. Provide revision history, accessible comparisons, reviewer comments/mentions and change requests. Use optimistic locking and recovery; do not implement last-write-wins or transfer approval through a merge.

### Teaching authority, revisions and publication

The object chain is church → sermon → weekly series → dated slot/plan → approved plan revision → explicitly drafted study → separately approved content revision → publication occurrence → member engagement. Preserve independent object identities and immutable source/revision provenance.

Plan states: Draft, In Review, Changes Requested, Approved, Cancelled. Content states additionally include Scheduled and Published. Do not give a plan a Scheduled or Published state. Keep the editable head and existing live published pointer separate.

Approval binds exact immutable revision bytes/hash, approver, policy and dependencies. Content approval binds the approved plan reference. Enforce canonicalization, relational references, capabilities and active approval in trusted backend code/database constraints. An approval boolean on a mutable document is insufficient.

Editing approved/in-review work creates a new Draft revision, supersedes pending review, invalidates dependent future readiness, and cancels pending schedules/intents atomically. Keep historical approval evidence; keep an earlier live publication until an approved replacement or explicit withdrawal. Editorial date/time/zone is included in the plan snapshot: changing it requires renewed plan and dependent-content approval. Operational SMS deferral inside an authorized window does not move the study date or grant approval.

An approved plan only enables an explicit manual or AI content-drafting action. It never automatically generates, approves, publishes, or sends full content. Pastors/approvers retain final doctrinal review; church administration alone is not an approval grant. Default to separate author/approver and separately controlled publisher permissions.

No unapproved content publishes. A deadline missed while approval is pending records a blocked occurrence and alerts staff; later approval requires explicit future rescheduling. The proposed outage catch-up permits only already-approved unchanged occurrences within 15 minutes; after that require staff review. Implement the adopted policy consistently and test boundaries.

### Tenant security, members and delivery

Enforce tenant-scoped memberships/capabilities on every resource and command. Use composite tenant foreign keys, enabled/forced RLS with nonowner runtime roles, and transaction-local tenant context. Protect object storage, caches, jobs, search, exports and telemetry separately. Platform administration does not imply routine private church-content access. Implement the research's controlled support-access policy if that capability is included.

Mobile-first reading supports a church's public or authenticated policy and never exposes drafts in page HTML, metadata, API responses, previews or shared caches. Authentication is required for participation. Reactions are appreciation choices. Discussion is optional, off by default, moderated according to church policy, with private reports and audited staff actions.

Store source rights/provenance and distinguish sermon attribution, verified Scripture text/reference, interpretation and unreviewed AI suggestions. An AI output or a matching verse identifier does not verify an interpretive claim. Verify direct quotations against an authorized translation; use references when rights or verification are unresolved. Uploaded/retrieved text is untrusted. Models receive no approval, publication, member-export or messaging authority.

Keep publication and notification outcomes separate. Use an atomic publication/outbox transaction, durable jobs and idempotent database effects. Recheck consent, sender/program scope, suppression, quiet hours, expiry, budget and approval immediately before dispatch. An imported contact or People record is not consent. Process STOP promptly and preserve suppression across imports/restores. A provider timeout after possible acceptance becomes submission-unknown and requires reconciliation; never blindly resend or promise exactly-once SMS.

Store local civil intent, IANA zone, resolved UTC instant and schedule version. Reject nonexistent local times; require a choice for overlapping times. Apply recipient-aware SMS windows; hold unknown/unapproved geography rather than guessing location. The research proposes a 09:00–20:00 recipient-local send window, so an 08:00 study can publish before its SMS is eligible. Current law/provider requirements must be verified for the actual country.

Do not assume Planning Center provides automatic transcripts, ordinary-member SSO, native external-study posting, or messaging. Implement only verified capabilities. People access and Church Center identity/session handoff are separate questions. Manual ingestion and independent sign-in remain valid supported paths.

### Example, accessibility and operational quality

Use fictional fixtures for “To Whom Shall We Go?” — John 6:68, Monday October 19, Wednesday October 21 and Friday October 23, 2026, 08:00 `America/New_York`. These dates are examples, not fixed defaults or operational live schedules. Automated tests use a controlled clock so historical fixtures do not trigger real overdue sends. Test configurable other weekdays/times/zones.

Follow the mockups' consistent visual language while implementing real accessible components. Cover empty, loading, validation, offline, permission-denied, conflict, unavailable-provider and missed-deadline states. Target WCAG 2.2 AA with automated and manual complete-process checks. Measure quality/performance against the research envelope; do not claim availability, recovery or accessibility from unit tests alone.

## 6. Phase execution table

This table defines the build sequence. The mutable completion record is [PHASE_TRACKER.md](PHASE_TRACKER.md); every phase initially remains uncompleted. [TESTING_GATES.md](TESTING_GATES.md) defines mandatory exit evidence.

| Phase | Implementation deliverables | Mandatory exit gate | Depends on |
|---|---|---|---|
| **0 — Build readiness** | Inspect/revalidate research; select local stack and commands; record decisions, research gaps, acceptance mapping and authorization; define provider/rights validation prerequisites | **G0:** scope/decisions/commands and all AC01–AC29 ownership recorded; existing research checks reproduce or discrepancies resolved; no capability invented | Explicit execution authorization |
| **1A — Foundation and tenant boundary** | Root `frontend/` and `backend/`; local setup, real database/migrations, validated identity, memberships/roles, two-tenant fixtures, contracts, CI, secrets/redaction and health checks | **G1A:** clean install/build/type/lint/unit checks, real-PostgreSQL runtime-role isolation and authentication/authorization integration tests | G0 |
| **1B — Manual sermon and date-first planning** | Manual sermon/notes; series and configurable dated slots; exact two-choice UX; blank typed editor; assignments, autosave, recovery, revisions, locking, comments and in-app notifications | **G1B:** browser-to-API-to-database manual workflow, date-first/blank editor, persistence/reload/conflict and cross-tenant negative tests; accessible authoring review | G1A |
| **1C — Independent approvals and member reading** | Plan review/change requests; explicit manual content draft; separate content review; exact-revision due-now publication/outbox, withdrawal, public/private mobile reading, foundational export/deletion/restore procedures | **G1C:** full two-review editorial journey; approval/edit/publication races; no draft leakage; private/public access; regression, recovery and manual accessibility/editorial review | G1B |
| **2 — Controlled AI and source ingestion** | Rights-aware transcript upload/optional transcription, church profile, weekly/day proposals, contextual assistance, selective adoption/diff/undo, explicit full-study generation, citation checks, injection defenses, budgets and provider adapters | **G2:** control/provenance/security tests; real authorized provider/transcription checks for selected capabilities; church-reviewed evaluation and rights sign-off; manual fallback unaffected | G1C plus relevant rights/provider prerequisites |
| **3 — Scheduling, SMS and member engagement** | Durable local-time scheduler and notification queues; consent/suppression, per-church sender, approved SMS preview, quiet hours/expiry, callbacks/reconciliation; appreciation reactions, optional moderated discussion/reports | **G3:** DST/deadline/cancel/crash tests; consent/STOP/unknown-submission cases; authorized provider round trip; moderation/accessibility/security checks; operational recovery evidence | G1C; G2 only if sending AI-derived content |
| **4 — Planning Center integration and pilot readiness** | Verified OAuth lifecycle and read-only sermon sync, webhook inbox/reconciliation, Church Center links; member identity only if proven; complete cross-component regression, observability/load/restore and pilot runbooks | **G4:** authorized test-church integration evidence and lifecycle tests; AC01–AC29 fully traced and passed; pilot human/operational reviews; no unresolved required release gate | G1C and selected G2/G3 capabilities; default full range includes both |
| **5 — Separately scoped post-MVP increments** | Selected analytics, onboarding/billing, collaboration, email/push or other integrations; each increment gets its own scope and acceptance before work | **G5:** each explicitly selected increment's complete tests, privacy/cost/operations review and user acceptance; no blanket completion for an undefined feature list | G4 plus explicit phase-5 scope approval |

Splitting research phase 1 into 1A/1B/1C makes large work independently verifiable. Build phase 0 is a technical readiness milestone, not a claim that every research Phase-0 stakeholder/vendor PoC is already complete. Initiate those checks early and carry them as named blocked gates into the phases that need them. Lack of Planning Center or SMS credentials need not prevent an independently authorized manual core, but it prevents completion of the respective live integration phase. Do not silently remove a gate to advance the table.

## 7. Testing and phase completion contract

Follow [TESTING_GATES.md](TESTING_GATES.md) in full. For each phase:

1. Open an evidence report using [PHASE_EVIDENCE_TEMPLATE.md](PHASE_EVIDENCE_TEMPLATE.md), populate its required scope/checklist, and mark the tracker In Progress.
2. Implement small end-to-end slices with meaningful unit, real-database integration, API contract and browser tests. Backend invariants must be enforced server-side even if frontend controls are disabled.
3. Run the phase's checks plus all previously passing mandatory automated gates. Fix regressions before completion. Do not skip failing tests, weaken assertions or substitute mock-only tests to obtain a green result.
4. Record commands, runtime/dependency versions, environment, result counts, exit codes, redacted artifacts and manual/external reviewers. Evidence must identify the tested revision or file-state fingerprint, especially when no Git commit exists.
5. No required test may be failed, skipped, quarantined, unrun or unsupported at completion. Required human and live-provider gates also must be met. Record a blocked dependency instead of a fake pass. An optional capability can be excluded only through explicit scope approval, with tracker and acceptance mapping updated; completion then names that narrower scope.
6. Complete only when all deliverables, gate checklist items, regression checks, required review and operational documentation are done. Mark the table checkbox, date, tested revision and evidence link together. Code written, a screenshot, passing research scripts, test-double success, or a single happy-path demo is insufficient.
7. If subsequent work invalidates prior evidence or regresses a mandatory invariant, reopen the affected phase as In Progress/Blocked until fixed and retested; preserve prior results in its history.

Once phase scope and gates are met, continue to the next authorized phase without requesting redundant permission. Report real blockers promptly and continue independent authorized work; do not end with an offer to do already authorized implementation or tests.

## 8. Delivery expectations for the future run

Maintain a working local application and documented commands; both source components must be independently understandable and jointly runnable. Generate API contracts and validate their client compatibility. Implement migrations and deliberate least-privilege grants, not a research-schema demo. Include deterministic seeds, environment examples with no secrets, test data cleanup, and provider-off defaults.

Provide a root developer README, component READMEs, versioned decision records, per-phase evidence, acceptance-to-test mapping, CI checks, observability conventions, and recovery/deployment runbooks. Production infrastructure manifests may be prepared within scope, but applying them requires deployment authorization. Leave no mock production path that reports successful publication, identity verification or delivery without actual server/provider evidence.

At each phase handoff, summarize: what now works; which gate passed and its evidence; which scope remains; blockers and owners; frontend/backend changes; and the next eligible phase. At the final authorized handoff, list all completed and incomplete phases accurately. A phase-complete application is not automatically an approved production launch.
