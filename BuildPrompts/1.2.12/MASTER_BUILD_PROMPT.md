# Master Build Prompt — Rooted 1.2.12 guided agentic study workflow

## Objective

When the user instructs you to execute this version, implement and verify the complete guided Study Co-writer workflow in `C:\Users\tyler\Documents\MyChurch`.

A contributor says **“Create a three-day study for next week based on this sermon outline.”** The assistant proposes an editable plan, helps settle the direction, obtains explicit confirmation, then creates complete saved drafts for the agreed dates. The contributor opens each date and finds the actual study editor populated. A chat answer, mock preview, or unsaved proposal alone does not satisfy this objective.

Execute the authorized local work through completion. Make routine technical decisions within this scope, document assumptions, and continue between phases without seeking repeated approval. Prompt preparation alone does not authorize implementation or paid calls.

## Required reading and baseline

Read applicable `AGENTS.md`, [WORKFLOW_AND_DATA.md](WORKFLOW_AND_DATA.md), [TESTING_GATES.md](TESTING_GATES.md), the [research roadmap](../../research/Agentic%20Research/study-cowriter-command-center-roadmap.md), [teaching profiles](../../research/Agentic%20Research/study-cowriter-profiles.md), [tenant isolation design](../../research/Agentic%20Research/church-context-isolation-and-site-integration.md), and [1.2.11 execution evidence](../1.2.11/evidence/execution.md).

Inspect current co-writer routes/adapter, proposal validation, restricted database transactions, source/revision contracts, worker claims, study-date creation, final approval/publication, privacy/lifecycle deletion, and frontend API/session/recovery utilities. Read the local Next.js documentation required by `frontend/AGENTS.md` before frontend implementation. Recheck current official Azure Responses and model settings before API changes; preserve `gpt-5.6-luna` rather than choosing a different model.

Record current test results. The earlier broad browser suite had obsolete planning-notes/workflow selectors and a member-page accessibility failure; distinguish inherited failures from regressions. Do not restore user-removed features to satisfy old selectors. Adapt relevant tests to the current intended flow and separately record unrelated failures.

## Product scope and behavior

Preserve the existing floating assistant, Expand/Restore, original compact size, unfinished messages, keyboard behavior, responsive reading view, and Live Preview rendering. Keep normal single-day assistance working. Add a clear church-scoped **Plan studies** path within the assistant that can begin before a target study exists; do not force users to create empty target days manually first.

Use one GPT-5.6 Luna deployment with a durable application-controlled orchestrator. Separate planning, clarification, drafting and validation as logical steps. Do not create additional model deployments or hosted agents merely to give those steps different names. Define narrowly scoped application tools; a deterministic state machine owns authorization, confirmations and writes.

Interpret ordinary requests and follow-up revisions through structured model output, not a hardcoded match for the sample sentence. Accept 1–7 requested days within the configured run budget. Extract missing choices, inspect authorized calendar/source context, and present a bounded action proposal. Ask focused questions only when missing context affects meaning, dates, or direction. Do not repeat questions already answered.

Resolve relative weeks from the church's IANA timezone and a testable server clock. Use Sunday–Saturday week boundaries and support a week crossing months; month clipping is a display concern. Show the absolute date range and proposed dates. A preferred cadence may supply defaults; otherwise ask or clearly propose dates for confirmation. Confirm the existing series/container, assignee and schedule time as well as teaching choices. Do not silently create a new series or assign a different contributor.

This release creates new dates only. If a selected date is occupied or becomes occupied, show the conflict and let the contributor choose another date. Never silently reuse, replace, move, delete or withdraw an existing study. Do not weaken existing date-uniqueness or assignment rules.

## Required contributor journey

1. **Confirm source.** Accept reviewed pasted text, UTF-8 `.txt`, or an explicitly selected authorized reviewed sermon-library source. Reuse extraction/review where appropriate. Show text and rights confirmation; selecting a file is not consent to send it to a model. Keep source versions immutable and workflow-owned.
2. **Propose the plan.** Return structured dates, day titles, passages, objectives, themes, overall takeaway and progression. Present editable cards and source grounding. No dates/drafts are created yet.
3. **Review direction.** Guide the contributor through material choices: audience, central takeaway, reading depth, translation preference, illustrations and practical application. Save plan/decision versions. Label assumptions and unresolved questions; respect the church-approved teaching profile without inventing doctrine.
4. **Confirm generation.** Show the exact dates, source/profile versions, teaching direction, target fields and usage allowance. The button **Confirm direction & generate 3 drafts** must explicitly authorize generation and atomic saving of those three new drafts. Bind the authenticated user's confirmation to the exact version and write set. Ordinary “looks good” chat text must not forge this confirmation.
5. **Generate in the background.** Queue durable per-day jobs and display progress, failed/uncertain states, cancellation and explicit retry. Process one day at a time initially. Keep successful day results in staging without regenerating them when another day fails.
6. **Save the complete set.** Once every day is complete and valid, recheck consent and all preconditions, then create the whole set atomically using existing slots/aggregates/revisions. No per-field adoption click is required after the explicit batch confirmation. Never mark the batch complete before commit succeeds.
7. **Open and review days.** Return working links to each date's normal editor, all required fields populated, with source/plan provenance and a plain-language generation summary. Final human study approval and publication remain separate and unchanged.

## Complete daily content contract

Implement the contract in [WORKFLOW_AND_DATA.md](WORKFLOW_AND_DATA.md). Every day must populate title, references, body, reflection, discussion question, application, and outbound message preview. In particular, populate `payload.references`, which the existing six-field proposal flow does not currently generate. Use the actual saved content schema, not obsolete plan fields or a chat-only representation.

Use strict structured output and deterministic validation. Validate exact dates/day count, meaningful nonempty fields, lengths, source/span ownership, source hashes, and the relationship to the confirmed objective. Return warnings for unverified Scripture references; quote Scripture only from authorized supplied/retrieved text. No fabricated links, quotations, browsing, pastoral identity, or claims of theological verification.

Preserve existing single-day proposal validators; add a distinct full-day workflow contract where needed rather than accepting incomplete legacy output. Measure the output allowance needed for all fields. Start with a 3,000-output-token ceiling per complete day, configurable up to 4,000 within the run budget; existing chat limits can stay lower. Never save truncated/incomplete responses as complete studies.

## Backend, persistence and worker requirements

Add additive migrations and shared contracts for workflow runs, versioned plans/decisions, reviewed source bindings, confirmations, target dates, day jobs, staged complete proposals, budgets and commit results. Preserve applied migrations. Reuse the current study system and `saveRevision`/revision creation mechanisms; do not introduce a parallel store for the final studies.

Build authenticated church-scoped APIs for creating/loading a workflow, discussing/revising its plan, confirming generation, inspecting progress, retrying failed work, canceling and deleting private workflow content. Read/write permissions, CSRF/origin checks, idempotency, ownership and cache behavior must match existing application conventions. Register endpoints in the real app and wire the real frontend; do not leave isolated unused modules.

Persist enough state to resume from another page load and recover a worker claim after a crash. Use leases and compare-and-set transitions. Never hold a database transaction open while calling Azure. Use immutable context snapshots containing church, initiating actor, exact plan/source/profile versions, confirmed dates, assignee and model settings; do not use a global current church or browser-selected identity as authorization.

Add workflow jobs to the existing worker with a dedicated co-writer gate that works in `STUDY_COWRITER_ONLY` mode. Do not enable the legacy general-provider worker paths, SMS, Planning Center or transcription as a side effect. Distinguish deterministic retries from potentially billable inference retries. After ambiguous submission, preserve an unknown state and conservative reservation; no automatic inference resubmission.

For final commit, acquire locks in consistent order for all church dates and target records, recheck current membership/capabilities/assignment, date availability, consent, source/profile/plan versions, and cancellation. The entire new slot/plan/content/revision set and commit mapping must commit or roll back together. Creation uses the existing uniqueness and calendar validation rules. Check immediate-publish hooks so AI draft creation cannot trigger publication.

Store durable idempotency for commands, model attempts and batch commit. Prevent reuse of a key with different input. Exactly-once database writes must not be confused with a promise of exactly-once remote inference. Repeated confirmations, duplicate worker claims, refreshes and retries must not create duplicate dates or charge the same accepted reservation twice.

## Church isolation and lifecycle

Enforce forced RLS and composite tenant relationships on every new tenant table, plus contributor-private workflow access. Use the restricted runtime role and transaction-local context. Revalidate permissions before each day job, before returning private results, and at commit. A source document or model tool argument cannot choose the tenant, actor, provider URL, permissions or confirmation state.

Share one deployment, not church histories or private source caches. Workflow source reuse is limited to its authorized day jobs. Do not expose another church's plan, transcript, job, draft, summaries, errors or billing data. Reject guessed IDs even for a contributor who belongs to both churches but is operating in the other workspace.

Keep workflow drafts/resume state separate from the demo conversation's seven-day access period. Implement an explicit 30-day private-workflow access/retention policy with scheduled cleanup, except content already adopted into study revisions follows normal study retention. Never erase numeric accounting to reset limits. Explain retained audit, immutable adopted provenance and backup limits. Integrate new foreign keys with study purge/privacy procedures and exports so existing deletion flows do not break or silently leave private source copies.

## Spending and configuration

Use the server-only root `.env` settings and current validated Azure v1 transport. Do not print or copy credentials, expose them to the client, alter unrelated root settings, or add paid services. Preserve `store: false`, redirect rejection, supported reasoning settings and sanitized diagnostics.

Enforce at most 12,000 conservatively estimated input tokens per call and a **100,000-token total per workflow**, including plan/intent/clarification calls, day output, explicit repairs and unknown submissions. Bound a run to 12 inference attempts. If the proposed scope cannot fit, show the limit and let the contributor reduce it before starting more work. Do not silently truncate source evidence.

Keep one active inference per church, the existing 30/church and 100/global daily call caps, and any lower monthly church allowance. Count every workflow model call against those same persistent controls; a batch is not one model request. Reserve the planned batch budget before queueing generation. Planning/clarification also reserve usage before their calls. Share accounting between run and child attempts so tokens are neither double-reserved nor double-refunded. Reconcile actual usage and release only provably unused allowance.

No automatic second model, paid web search, code execution, embeddings, Speech, Blob provisioning, fine-tuning or Azure AI Search. Display token estimates/actuals. Dollar estimates require verified deployment-specific rates; do not reuse GPT-6 research prices as GPT-5.6 Luna's quote.

## Live verification authority for this version

Explicit approval to execute **1.2.12** includes a new local verification allowance of **up to 10 live Azure inference attempts and 150,000 total verification tokens**, using synthetic content only. This prospectively replaces the earlier demo's three-call verification ceiling for this build; preserve the old report and do not reset its counters or claim its failed request passed.

Record each attempted live submission before sending it in a separate 1.2.12 verification ledger. Reserve the conservative input/output allowance for each call and enforce the aggregate cap across process restarts. Ambiguous or missing usage consumes its full reservation. Existing lower church/monthly/daily limits still apply. This allowance permits bounded corrective rechecks without another approval question; it does not authorize unbounded retries or a dollar billing guarantee.

Use fixtures by default. After local contract and authorization checks pass, first resolve the real single-day complete-generation reliability gate. Then run the genuine three-day acceptance journey through the UI/backend/worker, reusing those calls as evidence. Budget for intent/planning, three day drafts and a small number of explicit corrective calls; do not spend the allowance repeatedly proving basic connectivity. Stop paid testing when either cap or a real account/quota blocker is reached, finish independent local work, and report the precise open gate. Do not ask for extra calls until a concrete fix and local evidence are ready.

## Phases and deliverables

Follow [PHASE_TRACKER.md](PHASE_TRACKER.md) and pass [TESTING_GATES.md](TESTING_GATES.md). Deliver real code, additive migrations, shared schemas, worker integration, guided UI, meaningful fixture and restricted-role database tests, resumable browser tests, a safe opt-in verification command, and a runbook with exact local startup steps and a synthetic example.

Update version navigation and append actual evidence as work completes. Verify every saved target date opens the standard editor with all fields filled and no publication or messaging side effect. Report model usage, constraints, inherited failures and remaining human review separately. Declare the workflow working only after a live three-day run has atomically saved complete drafts and the browser has opened all three successfully.
