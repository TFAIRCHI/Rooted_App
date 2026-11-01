# From Study Co-writer to a guided workflow command center

Research date: October 24, 2026. This dated roadmap informed the [implemented 1.2.12 workflow](../../BuildPrompts/1.2.12/DEMO_RUNBOOK.md). The core plan → agree → confirm → complete saved drafts journey passed live verification. Sections describing broader tools, transcription, research and orchestration remain future proposals.

## The experience we are aiming for

A contributor should be able to say:

> Create a three-day study for next week based on this sermon outline.

The co-writer should resolve the request into a reviewed plan, help the contributor settle the teaching direction, and then create complete saved drafts for the agreed dates. The contributor should not have to copy the chat answer into each day's editor.

The recommended first version uses **one GPT-5.6 Luna deployment, a durable workflow in the existing backend, and a small set of permission-checked application tools**. The model proposes content and actions; application code decides which actions are authorized and records their results. A hosted agent service or several independently running agents is optional, not a prerequisite.

OpenAI's official orchestration guidance distinguishes specialist handoffs from specialists used as tools and cautions against splitting workflows too early. For this project, a single assistant coordinating bounded planning and writing steps is a reasonable starting design. This is our architecture recommendation, not a claim that an OpenAI-hosted runtime is required for Azure inference. [Official OpenAI orchestration guidance](https://developers.openai.com/api/docs/guides/agents/orchestration).

## Walkthrough: request to three completed drafts

| Step | What the contributor sees | What the application does |
|---|---|---|
| 1. Understand the request | “Three days, next week, using this outline.” The assistant asks only for missing choices that matter. | Authenticate the contributor, resolve the church and timezone, inspect actual dates/permissions, and bind the reviewed outline to this workflow. |
| 2. Review the plan | Three proposed dates, daily titles, passages, objectives, themes, and the progression between days. | Produce a structured plan proposal. Detect existing studies on those dates before promising new ones. No study is created yet. |
| 3. Agree on direction | The contributor edits or discusses audience, central takeaway, depth, translation, illustrations, and application. | Save each plan revision. Distinguish required decisions from optional details and mark unresolved questions. |
| 4. Confirm generation | A final summary lists dates, source, teaching direction, target fields, existing-draft treatment, and estimated usage. Button: **Confirm direction & generate 3 drafts**. | Record consent against the exact plan/source/profile versions. Reserve the bounded workflow budget and authorized target dates. |
| 5. Draft the days | “Day 1 ready · Day 2 writing · Day 3 waiting,” with cancel and retry controls. | Generate each day's complete content into private staging records. Validate it against the confirmed plan and reviewed evidence. |
| 6. Save the complete set | “Three drafts created,” with a card to open each date's editor. | Once all days pass validation, save the agreed set in one short database transaction. Create new draft records or explicitly confirmed revisions, without publishing. |
| 7. Review individual days | Each editor is filled out, Live Preview reflects the saved draft, and the contributor can revise normally. | Use the ordinary Create Study → Gain Approval → Publish Study process. Planning consent does not grant final study approval. |

Confirming the plan alone should not unexpectedly spend tokens drafting or create records. The final confirmation explicitly authorizes the named batch. After that confirmation, the normal path should produce all three saved drafts without asking the contributor to adopt each field manually. This batch adoption is a proposed new capability; today's selected-day adoption flow is separate.

If all information is already present, do not force a long questionnaire. Offer an editable summary and the confirmation button. If the sermon lacks an essential passage or theological distinction, ask before committing to a definitive direction.

### Dates and existing studies

Resolve “next week” in the church's IANA timezone and show the absolute week and dates. The current calendar uses Sunday–Saturday weeks clipped for monthly display; a new workflow must define whether it can span a month boundary and show that boundary clearly. Do not infer a different week convention from server UTC.

If the church has a configured three-day cadence, propose it. Otherwise ask which dates, or present an explicitly proposed cadence for confirmation. For example, a request on October 24, 2026 could propose October 26, 28, and 30; those are example choices, not a universal definition of a three-day study week.

When a date already has a study, offer an authorized choice: use another date or replace an explicitly selected editable draft. Never overwrite approved, scheduled, published, withdrawn, deleted, unassigned, or currently unsaved work automatically. A date becoming occupied after planning must block final commit and request a revised plan.

## What “filled out completely” means

The generated day must populate actual study fields, not return a long chat message with the contributor left to copy it. The current editor's field mapping is:

| Editor area | Saved content field | Completion rule |
|---|---|---|
| Day title | `payload.title` | A specific, nonempty title for that day's emphasis |
| Primary Scripture & source links | `payload.references` via editor `referencesText` | Reviewed passage references and authorized source links; do not confuse this with the older plan's `primaryScripture` object |
| Study content | `payload.body` | A complete devotional explanation grounded in the sermon and agreed objective |
| Reflection | `payload.reflection` | A focused personal reflection prompt |
| Discussion question | `payload.discussionQuestion` | An accessible question suitable for the intended audience |
| Application | `payload.application` | A concrete next step for that day |
| Message preview | `payload.outboundPreview` | A concise preview, saved without sending a notification |

The current proposal adapter returns six suggested fields, including `smsPreview`, which adoption maps to `outboundPreview`; it does not fill `references`. The command-center contract must add and validate references explicitly. Filling only title/body or leaving the reference box blank would not meet this proposed completion gate.

Require every field to fit the existing payload schema and length limits. Check required text is meaningfully nonempty, dates match exactly, source citations belong to this run, and the day fits the agreed progression. Exact Scripture quotations need an authorized text source; a reference suggestion does not establish quotation accuracy or interpretive correctness. Do not invent links to make the reference box appear complete.

Measure the output allowance needed for a complete day. The demo's 1,500-output-token limit may be too small for the intended length across all fields. Either agree on a concise study length that fits or deliberately adjust the budget after measurement; never save a truncated answer as a complete study.

## The gap from today's implementation

Current code evidence: [co-writer API](../../backend/src/api/cowriter-routes.ts), [Azure adapter](../../backend/src/integrations/cowriter.ts), [proposal adapter](../../backend/src/integrations/ai.ts), [revision saving](../../backend/src/modules/save-revision.ts), and [demo evidence](../../BuildPrompts/1.2.11/evidence/execution.md).

| Area | Current state | Needed for the command center |
|---|---|---|
| Conversation scope | One contributor, church, selected study and date | Add a church-scoped workflow that can plan multiple authorized dates, while retaining the selected-day chat mode |
| Natural-language actions | User selects chat, weekly outline, or selected-day draft | Convert a request into a validated action proposal; ask for missing dates/direction rather than executing model-written commands |
| Weekly plan | Read-only answer for dates already scheduled in the selected series/week | Persist an editable plan that can propose unscheduled dates, number of days, objectives, and progression |
| Plan agreement | No workflow-level approval state | Bind contributor confirmation to exact plan, source, profile, dates, and permitted writes |
| Generation | One bounded HTTP call; no tool loop | Durable background jobs for each agreed day, resumable progress and staged results |
| Complete fields | Six-field selected-day proposals; references remain separate | Generate and validate every editor field, including references, for every day |
| Saving | Explicit single-day adoption via existing `saveRevision` | Confirmed batch creation/adoption, atomic commit, revision checks, and safe conflicts |
| Sources | Private text versions tied to a selected-day conversation | Immutable workflow source versions shared only across that workflow's authorized day jobs; optional sermon-library linkage |
| Recovery | Panel state is lost on reload; server history expires after seven days | Resume pending workflows across reloads, use explicit workflow retention, and distinguish hiding a panel from canceling a run |
| Verification | Real chat and follow-up passed; the live draft gate remains open after a rejected response | Verify single-day generation/adoption first, then evaluate complete multi-day outcomes and failure recovery |

The rejected live draft is a useful warning: reaching Azure successfully is insufficient. Structured schemas and deterministic validation must stay in place as orchestration becomes more capable. This research does not authorize another live verification call or change the earlier request allowance.

## Application tools the assistant can use

These are proposed server-side capabilities, not implemented endpoint names. They can be called by a deterministic workflow first and exposed as constrained model tools later.

| Capability | Purpose and boundary |
|---|---|
| Inspect church calendar | Read date availability, assigned contributors, timezone and editable draft states within the selected church |
| Read approved source | Retrieve only the selected reviewed source revisions; no arbitrary URLs or cross-church library search |
| Propose/update study plan | Return structured dates, objectives, themes and decisions; changes invalidate prior generation consent |
| Record generation confirmation | Capture the contributor's explicit consent to the exact plan and write set; the model cannot confirm on their behalf |
| Generate day proposal | Use one day's confirmed objective plus the shared plan/source context; stage results rather than editing live records |
| Validate complete day | Run schema, evidence, reference, date and required-field checks in code; flag theological review separately |
| Commit confirmed draft set | Recheck membership, assignment, source/profile versions, date availability and draft bases, then write atomically |
| Report/retry/cancel run | Show progress and actual usage; retry failed work explicitly without regenerating completed days |

Church/user IDs, permissions, budget and workflow IDs must be injected by trusted backend code. A sermon, prompt, model tool argument or specialist handoff cannot change them. No tool should provide arbitrary SQL, shell access, approval, publication, outbound messages, or access to another church.

Human review and automatic validation serve different purposes: application checks enforce constraints, while the contributor confirms direction and authorized side effects. This distinction follows the [official OpenAI guardrails and human-review guidance](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals); implement it in this application's backend even if no agent SDK is used.

## Durable workflow and data design

Proposed states:

```text
clarifying → plan_proposed → direction_review → awaiting_generation_confirmation
          → queued → generating → ready_to_commit → drafts_saved
```

Also support `paused_conflict`, `failed`, and `canceled`. A model's message saying “approved” must never move a run across a confirmation boundary. Store the actual confirming actor and plan version.

Add additive migrations for a workflow run, immutable plan versions/decisions, source bindings, confirmed target-day records, day jobs, staged proposals, confirmations and commit results. All tenant records need forced RLS and composite ownership relationships. Reuse existing aggregates, slots, revisions and provider usage accounting rather than creating a parallel study storage system.

A run should bind `churchId`, initiating user, authorized collaborators if any, church timezone, exact dates, source IDs/hashes, profile version/hash, plan version/hash, model/settings, target draft bases and a total token allowance. Default workflow visibility to private; collaborating contributors require an explicit access policy. Link each saved revision to its generating run and reviewed source provenance.

Queue day jobs in the current PostgreSQL-backed worker. Do not keep a browser HTTP connection open for the entire three-day workflow. Use authorized status polling initially; streaming is optional. Recheck current membership/assignment and source/profile state before execution and commit.

Generate into staging, then validate the whole set. At commit, lock target dates/aggregates in a consistent order and recheck the plan confirmation and every precondition. Create all three drafts in one short transaction. The model calls happen outside that transaction. If any day fails or a conflict appears, leave the staged results available for resolution but save none of the batch automatically. This avoids presenting a partly created week as complete.

Use durable idempotency keys for the run and `(run, planVersion, targetDate, generationVersion)` for day jobs. A double click or worker restart must not create duplicate studies or trigger automatic duplicate inference. If a provider call times out ambiguously, show that state and reconcile/reserve conservatively before an explicit retry. Cancellation stops future work; it cannot guarantee cancellation of an already submitted billable model request.

An altered plan/source/profile invalidates the corresponding confirmation and dependent proposals. Editing one day later should affect only that day's draft unless the contributor deliberately restarts the shared plan. Never silently regenerate the other two days.

## Costs beyond the deployed model

**The proposed first version does not require buying another AI service.** The existing backend/database can coordinate planning and drafting. More steps usually mean more GPT-5.6 Luna input/output tokens: a simple three-day flow might use one planning call plus three day-writing calls, before clarification, revisions or retries. That is increased model usage, not a separate fee for calling something an “agent.” This call count is an architecture estimate, not a fixed billing promise.

| Component | Needed for the first text workflow? | Potential additional cost |
|---|---|---|
| Existing application/backend/worker/PostgreSQL | Yes | Existing capacity may suffice; deployed compute, managed databases, backups and logs can have hosting/storage charges |
| Additional agent model or supervisor | No | Avoid an extra inference chain until evaluation demonstrates a need |
| Hosted Foundry agents/tools | No | Tool/runtime choices can introduce their own meters; do not assume every hosted agent feature is free |
| Blob attachments and media delivery | No new service for pasted/TXT source text | Storage capacity, operations and downloads if permanent media uploads are added |
| Speech/audio transcription | No | A separate transcription model/service if recordings have no usable transcript |
| Managed search/vector storage/embeddings | No | Search capacity/storage and embedding usage if a larger sermon library needs semantic retrieval |
| Web grounding or code execution | No | Tool-specific charges if enabled |
| Licensed Bible/reference resources | Only if exact licensed text or restricted commentary is required | Provider licensing/subscription terms, potentially outside Azure |

Microsoft states that Foundry-related service costs are only part of total application costs and recommends checking resource/meter-level charges. [Azure cost planning](https://learn.microsoft.com/en-us/azure/foundry/concepts/manage-costs). Its Agent Service FAQ separately identifies model inference, Code Interpreter sessions and file-search vector storage as billable components. [Agent Service billing FAQ](https://learn.microsoft.com/en-us/azure/foundry/agents/faq).

The current local demo's co-writer only invokes Azure model inference; its application and PostgreSQL run locally. That does not establish that the user's whole Azure subscription has no other active resources or charges. No subscription billing audit or paid service activation was performed for this research.

For planning, use:

```text
workflow model cost = sum of each call's billed input and output cost
solution cost = workflow model cost + hosting/database/storage/logging + enabled tool/service costs
```

Confirm this deployment's actual Azure meters before attaching dollar estimates. Do not use the earlier GPT-6 research prices as GPT-5.6 Luna's quote. Reserve the whole batch allowance before starting, process days sequentially at first, reuse the approved plan/source summary, and retry only the failed day. Keep hard per-run, per-day, per-church and overall limits. Request/token caps are not an invoice guarantee.

## Implementation order and proof required

1. **Complete the single-day reliability gate.** Verify the tightened schema against the real deployment with separately authorized bounded testing, including explicit adoption and references. Add representative sparse/detailed sermon examples and measure completeness, latency and cost.
2. **Persist the plan and its decisions.** Add structured plan schemas, exact dates, questions, editable direction and version-bound confirmation. Prove changing direction invalidates consent and does not create studies.
3. **Add staged multi-day jobs.** Queue three day proposals, resume after reload/restart, show progress, and validate every field. Prove a failure on day two does not cause days one/three to be regenerated or partially saved.
4. **Commit the confirmed set.** Create the target dates/drafts or explicitly confirmed revisions atomically, using normal revision saving and source provenance. Prove date conflicts, reassignment, revocation, stale bases, duplicate clicks and cancellation cannot overwrite work.
5. **Add the command-center interface.** Show the agreed plan, unresolved choices, run progress, per-day review links and usage in the expanded assistant. Preserve the standard editor and Live Preview for each saved day.
6. **Add optional capabilities only after measurement.** Consider approved Bible lookup, sermon-library retrieval, transcription or specialist critique when an actual limitation justifies its cost and permissions.

Acceptance scenario: from a new synthetic outline and three confirmed dates, the contributor agrees on the direction, starts one bounded run, reloads mid-run, and receives exactly three complete saved drafts with different daily emphases. Opening each date shows all editor fields populated. No member publication or notification occurs. Repeat with two churches simultaneously, a conflicting date, a revoked contributor and a failed middle day. Capture actual usage and a church reviewer's clarity/source-fidelity feedback.

Related: [Agentic Research index](README.md), [behavior profiles](study-cowriter-profiles.md), [tenant isolation](church-context-isolation-and-site-integration.md), and [current demo runbook](../../BuildPrompts/1.2.11/DEMO_RUNBOOK.md).
