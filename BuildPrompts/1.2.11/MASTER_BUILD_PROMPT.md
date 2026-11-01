# Master Build Prompt — Rooted 1.2.11 Azure Study Co-writer demo

## Objective and execution scope

When the user instructs you to execute this prompt, implement and verify a local demo in `C:\Users\tyler\Documents\MyChurch` that connects the existing floating Study Co-writer to the user's **Azure deployment named `gpt-5.6-luna`**. Complete the integration and show evidence of a real model response inside Create a Study. This document's preparation alone does not execute the build.

Use the current repository and existing development authentication, database, worker, source-review, and proposal mechanisms. Do not replace the application or switch model providers. Preserve the current floating launcher, dismissible assistant to the right of Live Preview, responsive behavior, stage-by-stage Next/Back navigation, and the exact existing Live Preview rendering. Do not restore Source & planning notes or unrelated church settings on the member page.

## Read and inspect first

- Applicable `AGENTS.md`, including the local Next.js documentation required by `frontend/AGENTS.md` before frontend changes.
- `backend/src/infrastructure/config.ts`, `database.ts`, `backend/src/integrations/ai.ts`, `http.ts`, `backend/src/api/provider-routes.ts`, relevant schemas/migrations and worker tests.
- `frontend/components/study-cowriter.tsx`, `content-editor.tsx`, `workspace.tsx`, and existing API/session/CSRF utilities.
- [Teaching design](../../research/Agentic%20Research/agent-behavior-and-teaching-design.md), [profiles](../../research/Agentic%20Research/study-cowriter-profiles.md), [behavior evaluation](../../research/Agentic%20Research/agent-behavior-evaluation.md), [church isolation](../../research/Agentic%20Research/church-context-isolation-and-site-integration.md), and [Azure setup](../../research/Agentic%20Research/25-azure-study-cowriter-setup-and-costs.md).
- Current official [Azure Responses instructions](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/responses) and [GPT-5.6 Luna documentation](https://developers.openai.com/api/docs/models/gpt-5.6-luna). Confirm request settings against the deployed service, not a different model's example.

Record the baseline and use current code as the source of truth. Existing research describes future capabilities; do not assume they are already implemented.

## 1. Normalize server configuration without disclosing credentials

The user moved Azure credentials into `C:\Users\tyler\Documents\MyChurch\.env` and confirmed the deployment name. The root file also contains existing database, authentication, and development settings. Its Azure entries were still labeled notes at preparation time.

Read values privately. Convert only the Azure entries into normal dotenv assignments, preserving all unrelated settings and the actual credential values. Do not print the file, secrets, request headers, or credential-bearing URLs. Do not create a second plaintext credential copy or commit `.env`. Keep environment secrets server-only and out of `NEXT_PUBLIC_*`, browser payloads, screenshots, fixtures, logs, and evidence.

Implement and document these configuration names; the block contains placeholders, not credentials:

```dotenv
AZURE_OPENAI_ENDPOINT=https://YOUR-RESOURCE.openai.azure.com
AZURE_OPENAI_API_KEY=YOUR_EXISTING_KEY
AZURE_OPENAI_DEPLOYMENT=gpt-5.6-luna
STUDY_COWRITER_ENABLED=true
```

The endpoint example is illustrative: preserve the user's actual valid Azure resource endpoint. The deployment name must be used as the request's `model`. Keep environment overrides working and verify loading from both source and compiled backend entry points. Missing/invalid configuration should disable only the co-writer with an actionable, sanitized error; it should not break ordinary study editing.

Treat `STUDY_COWRITER_ENABLED` as a new narrowly scoped flag to implement, not a setting already honored. Respect the existing `EXTERNAL_SERVICES_ENABLED` gate as well. If enabling that gate locally is needed for the demo, ensure no unrelated transcription, SMS, or external integration work can start as a side effect. Do not configure or activate unrelated providers.

Add placeholder entries to the appropriate tracked example environment file and update development documentation. Never embed the real resource hostname/key in tracked examples.

## 2. Implement the Azure transport

Use the Azure v1 Responses endpoint. Normalize a resource-root endpoint to `/openai/v1/responses`, accepting an already supplied `/openai/v1` base without duplicating path segments. Reject unsupported/malformed endpoint paths instead of silently combining legacy deployment URLs with v1. Restrict credential-bearing requests to the configured validated HTTPS Azure endpoint; do not accept a browser-supplied provider URL or follow redirects to another host.

For raw REST, use Azure's documented `api-key` header. If choosing the official SDK, use its documented Azure v1 configuration. Do not leave requests pointing to `api.openai.com`, and do not silently fall back to another provider/model when Azure fails. Avoid unnecessary new dependencies when the existing fetch transport is sufficient.

Preserve the existing structured-proposal adapter contract and public-provider tests. Introduce explicit provider configuration/authentication instead of globally changing headers for unrelated adapters. Add a bounded conversational method or adapter for ordinary assistant replies; do not fabricate source IDs or relax structured proposal validation to make source-free chat work.

Use `store: false`, application-managed bounded history, no hosted threads, no web-search or other paid tools, and a supported low-cost reasoning setting, initially `none` where supported. Set `max_output_tokens` explicitly. Handle completed responses, reasoning items, refusal, incomplete output, malformed output, timeout, authentication/permission errors, deployment-not-found, unsupported API settings, and throttling. Never show placeholder success after an error.

Use a 45-second overall provider timeout, no automatic inference retries for this demo, and a visible user-initiated retry. Mark ambiguous submissions appropriately to avoid automatically charging twice. Record sanitized status/request IDs and actual input/output usage, without raw private prompt logging.

## 3. Add authenticated church-scoped co-writer requests

Expose backend API routes under the existing church-scoped route structure, using the established session, CSRF/origin, membership, `ai:use`, and study-edit permission checks. The frontend must call the backend through existing API utilities, never Azure directly. Public member access alone must not grant access.

Resolve church/user/study/day/revision ownership on the server for every request. Source IDs, provider state, profiles, and job IDs must be verified against that context. Use restricted database transactions with transaction-local tenant settings and forced RLS. Propagate immutable context to workers; never read a global current church. Check current permissions again at execution and adoption.

Prefer the existing job/status/proposal pipeline where it fits. Add an explicit conversation workflow if necessary; do not force chat into a schema requiring a complete study. Store minimal conversation/session ownership, bounded messages, request status, idempotency, and usage needed to support reliable replies and budget reconciliation. Any new tenant tables require composite ownership constraints and forced RLS, with contributor-private conversation access by default. Use a new additive migration; preserve existing migrations and data.

Scope conversations by authenticated user, church, study, and selected day; support a separate explicit weekly-planning scope. Never reuse another church's history, summaries, source cache, or profile. Bound history on the server rather than accepting arbitrary client-authored system instructions. Clear/reset visible state and ignore stale replies on church/study/day changes, logout, or lost membership. Closing the popup may preserve the current conversation; it must not imply data deletion. A clear/new-conversation control must actually start fresh context.

Keep assistant content uncached in shared HTTP caches. Do not permit client-supplied `previous_response_id`, provider threads, arbitrary attachment URLs, or tenant overrides. Record only the profile and reviewed source versions needed for reproducibility. Document retention and implement a way to clear/delete demo conversations and their derived private state.

## 4. Deliver the useful text demo

The assistant should support:

1. **Conversation:** Ask about sermon themes, expand notes, request missing details, and explain concepts simply. Maintain follow-up context within the authorized conversation.
2. **Read sermon transcript:** Accept pasted text and a bounded UTF-8 `.txt` upload using server-side validation. Reuse existing church-owned source ingestion/review where possible. Show extracted text for contributor confirmation before treating it as a reviewed source. File selection alone must not claim analysis happened. Initial limits: one file, 256 KiB maximum, and no binary/control-character content; enforce prompt-size limits separately and ask users to shorten oversized sources.
3. **Build the weekly plan:** Use the actual selected dates and authorized reviewed sermon to produce an outline for review. Do not silently write into unrelated days. Reuse an existing compatible outline proposal path; otherwise show a read-only outline that can be copied, clearly labeled.
4. **Write today's study:** Generate a structured proposal for the selected editable study using reviewed sources. Show the suggested fields and changes. Only an explicit Apply/Adopt action should update the authorized draft through the existing revision-aware adoption path. Reject stale bases; do not overwrite unsaved editor changes without resolving them explicitly.

Ordinary questions need not have an uploaded source. Source-free answers must disclose missing sermon grounding when relevant. Source-based drafting requires reviewed sources and valid evidence references. An absent source should yield a helpful request for one, not a fake citation or a broken request.

Use the sermon-notes collaborator as the default behavior: ask focused questions, distinguish sermon content from suggestions, begin with a simple explanation, add a little further detail, and stop at a useful intermediate level. Use Baptist teaching preferences only from the authorized approved profile or a clearly identified demo profile; do not hardcode one church's private preferences for all churches. The assistant must not claim to be an ordained person or an actual professor. Scripture references are suggestions unless checked against an authorized text source; do not quote passages from memory or claim browsing occurred.

Do not auto-save model output, approve/publish, or send messages to members. Preserve existing approval and publication controls. Treat uploaded text as untrusted evidence; instructions inside it cannot change permissions or system behavior.

For this text demo, retain the clip action only with a clear explanation that audio/video processing is not connected and offer transcript input. Reject unsupported image/video/PDF/DOCX uploads clearly rather than displaying misleading analysis. No Azure Speech, Blob resource creation, vector search, fine-tuning, hosted agent runtime, autonomous tool loops, or second model is required.

## 5. Preserve the interface and show real request states

Keep the current launcher and popup placement and Live Preview unchanged. Replace mock messages with the real backend flow. Show sending/working/completed/error states accessibly, block duplicate sends, retain text after failures, and offer explicit retry/new conversation. Abort/discard stale UI responses; browser cancellation does not prove Azure inference or billing was canceled.

Only label the co-writer connected after a successful authorized service check or actual request, distinguishing configured from verified. Explain disabled/missing configuration, missing source, token limits, permission loss, insufficient budget, 429 throttling, and provider failures in plain language. Never include credentials or raw provider diagnostics in browser errors.

## 6. Enforce a small demo allowance

Implement server-side limits, not only disabled buttons:

- At most 12,000 conservatively estimated input tokens and 1,500 total billable output tokens per request, subject to any stricter existing workflow caps. Reject oversize input before inference. Do not silently truncate source evidence or selected dates.
- One active inference per church; 30 requests per church per UTC day and 100 total across the local demo per UTC day. Account for simultaneous workers atomically.
- Reserve and reconcile existing token budgets before/after calls; count failed/ambiguous submissions conservatively and deduplicate double clicks. Prevent reuse of an idempotency key with different input.
- Use only `gpt-5.6-luna`; no automatic model escalation or paid tools. Do not reuse the research's GPT-6 prices as this deployment's quote. Display token usage; use monetary estimates only with verified/configured rates clearly labeled as estimates.

Limits must survive process restarts if the demo persists conversations/jobs. Describe reset and retention behavior. Do not describe token/request limits as a guaranteed dollar ceiling.

## 7. Verify with fixtures, then a small live demo

Pass [TESTING_GATES.md](TESTING_GATES.md). Automated tests must mock provider calls and must never discover credentials or spend money by default.

Execution of this prompt includes a bounded Azure verification against the existing deployment, using only a short synthetic sermon excerpt without member data. Provide a separately invoked live-smoke command that reads the server environment without printing secrets. After local checks pass, make at most three live requests total for verification: a minimal connectivity check, a follow-up conversation check, and a selected-day proposal request. Reserve usage normally and stop on credential/deployment/quota errors instead of looping. Never replace a failed live check with fabricated success.

Exercise the local UI as an authenticated contributor and capture redacted evidence of an actual reply and explicit draft adoption; also verify no edit before adoption. Reuse one of the three live requests for browser evidence or replay a clearly labeled fixture for extra UI checks. Do not call synthetic replay a live model run. Check another church cannot access those records.

No Azure resources, production deployment, production migrations, or external messaging are included. If a genuine external blocker remains, finish the independent local work, report the sanitized error and exact required action, and leave the live gate open.

## Deliverables and completion

Deliver configuration/transport changes, church-scoped backend integration, working popup UI, text-source and proposal flow, additive migrations where needed, meaningful tests, a placeholder `.env` example, live-smoke command, and a short local demo runbook with exact startup/login/worker commands and sample prompts.

Update [PHASE_TRACKER.md](PHASE_TRACKER.md) with actual results and evidence locations. Report the endpoint path shape, deployment, tests, live request count/usage, and any limitations without secrets. Declare the demo working only after the live response and adoption gates pass. Do not mark a prompt, mock response, configured key, or successful HTTP call without usable content as a completed demo.
