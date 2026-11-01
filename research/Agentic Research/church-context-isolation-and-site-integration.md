# Each church's co-writer: site integration and context isolation

Research date: October 22, 2026. This is an implementation design, not a claim that server-backed co-writer conversations already exist.

## How each church gets its own co-writer

Each church can use the same application and Azure model deployment while having its own conversations, approved teaching instructions, sermon files, study drafts, and spending allowance. The backend must construct each model request using only information that the signed-in contributor is allowed to access in the selected church. A separate model subscription or fine-tuned model per church is not required for the initial release.

The church is the application's **tenant**: its data and permissions form a separate workspace. This does not mean every church needs its own Microsoft Entra tenant. Sharing model weights is different from sharing conversation history. Our application supplies the history, sources, and instructions for each request; it must never maintain a single shared chat thread for all churches.

Microsoft describes shared and dedicated deployment options and the additional segregation required when applications retain state. For this project, start with a shared consumption deployment and application/database isolation to control cost. Consider dedicated resources for churches with stronger contractual or operational requirements. A dedicated resource alone does not define inference-processing geography; choose the appropriate deployment type separately. [Microsoft multitenant Foundry guidance](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/service/foundry-models).

| Example | Church A | Church B |
|---|---|---|
| Model deployment | Shared default model | Same deployment |
| Teaching instructions | A's approved Baptist profile and translation | B's independently approved profile and translation |
| Source material | A's selected, reviewed sermon | B's selected, reviewed sermon |
| Conversation and draft | A's authorized conversation and study | B's authorized conversation and study |
| Result | Proposal stored under A | Proposal stored under B |

Neither church's private notes, teaching preferences, or conversations belong in the other's prompt. Public, licensed Bible text can be shared as a reference corpus; private commentary and annotations cannot become shared reference data.

## What the contributor sees on their site

1. The contributor signs in and selects their church workspace. The floating co-writer opens alongside Live Preview in Create a Study.
2. The panel identifies the current church, study, selected day, active teaching profile, and attached sources. The contributor chooses the sources the assistant may use.
3. The backend verifies membership and the required capability, including `ai:use`, before accepting work. Being able to visit a church's public member site does not grant contributor AI access.
4. Responses remain attached to that church and conversation. A draft suggestion becomes a proposal; only an explicit adoption action changes the study. Approval and publication remain human actions.
5. Switching churches opens the other church's context. Pending replies from the previous church cannot appear in the newly selected workspace.

The repository currently has member-facing `/c/[slug]` pages and church-selected contributor workspaces. Connect the co-writer through the authenticated contributor backend rather than attaching it to a public slug alone. If custom church domains are added, resolve a verified domain mapping to the canonical church ID on the server. Neither a URL parameter nor a client-supplied church ID proves authorization. Validate trusted host/proxy configuration as well as the authenticated membership.

Closing the panel should hide it without silently changing its scope. If persisted conversations are added, reopening may restore the same authorized conversation; closing must not be presented as deleting its history. Show the retention/deletion behavior explicitly.

## The boundary that code must enforce

An instruction such as “only use this church's information” is useful behavior guidance, but it is not access control. The model must never decide which church a tool can access. Microsoft's agent guidance calls for deterministic tenant propagation and datastore enforcement throughout tool calls and handoffs. [Multitenant agent considerations](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/agentic-systems).

For every request, the backend should establish immutable execution context similar to:

```json
{
  "churchId": "authorized-church-id",
  "userId": "authenticated-contributor-id",
  "conversationId": "authorized-conversation-id",
  "studyId": "authorized-study-id",
  "baseRevisionId": "current-draft-revision-id",
  "profileVersion": "church-approved-profile-version",
  "sourceRevisionIds": ["reviewed-source-revision-id"],
  "requestId": "unique-request-id"
}
```

These are illustrative values, not a new implemented API contract. Resolve and verify the identifiers server-side. Check that the conversation, study, draft revision, profile, and every source belong to that church and are accessible to that user. The backend injects this context into tool wrappers and job records. Model-generated arguments, uploaded documents, and conversation text cannot override it.

Default conversations to private to their contributor within the church. If shared editing is introduced, require an explicit conversation access list or role policy. Church membership alone should not automatically expose every contributor's private discussion. A contributor belonging to two churches must pass the same checks separately for both.

Start a new scoped conversation when changing studies or days. An explicit weekly-planning conversation may cover named days in one study. It must not silently inherit unrelated studies' chats. Church-wide reusable summaries should come only from deliberately approved shared sources, not automatic mining of private conversations.

## Isolation across every storage and execution path

The following controls are proposed requirements for implementation. A church ID in a filename or prompt is not sufficient by itself.

| Boundary | Required control |
|---|---|
| Database | Store `church_id` on conversations, messages, attachments, summaries, profile versions, jobs, proposals, and usage. Use composite ownership constraints such as `(church_id, id)` for related rows, tenant-filtered queries, and forced row-level security. Add user/conversation access checks within that boundary. |
| Database connections | Use the restricted runtime role, not an owner/superuser or `BYPASSRLS` role. Set church/user context transaction-locally, verify membership, and commit/roll back before returning a pooled connection. Session-global tenant settings can leak into later requests. |
| Files and Blob Storage | Keep objects private. Authorize upload, download, extraction, and deletion against church-owned asset records. A church-prefixed path helps organization but does not authorize access. Mint short-lived, object-specific access only after checking permissions. |
| Search and embeddings | Restrict the searchable corpus by church and source permissions before selecting results. Filtering a cross-church top-k result after retrieval is insufficient. Validate source IDs again before including excerpts in the prompt. Separate indexes are an optional stronger boundary. |
| Conversation history | Load messages through the authorized conversation record. Scope summaries to the same conversation and permitted source versions. Never use a global “latest conversation” or cross-church memory store. |
| Provider state | Prefer application-managed history and supported `store: false` requests for the pilot. Do not accept arbitrary provider thread, vector-store, or `previous_response_id` values from the browser. If provider state is added, map its IDs to authorized church-owned records and enforce that mapping before every reuse. |
| Caches and duplicate requests | Include church, user/access scope, conversation, profile version, source revisions, study revision, model, and generation settings as appropriate. Identical prompts from different churches must not reuse private responses. Scope idempotency keys and budget reservations by church. |
| Background jobs | Persist validated church, actor, study, source/profile versions, and request IDs in the job envelope. Revalidate current access before execution and proposal adoption. A revoked contributor or deleted source must not remain usable just because a job was previously queued. |
| Browser and streaming | Key panel state by signed-in user, church, study, and conversation. Abort or ignore stale requests when scope changes. Authorize stream/status connections and reject events whose request context no longer matches the visible panel. Clear private browser state on logout or membership loss. |
| Audit and billing | Record church-scoped job IDs, actions, usage, and decisions. Avoid raw prompts/transcripts in general application logs; restrict any diagnostic content and its retention. Enforce per-church budgets and concurrency, plus an overall pilot cap. |

Workers must capture the request context instead of reading a mutable “currently selected church.” A job started for Church A stays A's job even if its contributor opens Church B while it runs. Save its result to A's authorized proposal record; do not send it to B's visible assistant. Check the current draft revision again before adoption so an older generated answer cannot overwrite newer edits.

Treat sermon uploads and retrieved web content as untrusted source data. Instructions inside them cannot change tool permissions, source scope, the church's approved profile, or publication rules. If web research is introduced, allow read-only retrieval through controlled tools; never send church-private content as search text without an explicit, reviewed policy.

## Existing foundation versus work still needed

These observations concern the current repository, not a completed end-to-end isolation audit.

| Area | Existing foundation | Co-writer work still required |
|---|---|---|
| Tenant database access | [Database infrastructure](../../backend/src/infrastructure/database.ts) sets church/user context within a transaction, checks membership, and checks runtime role/RLS configuration | Extend the same controls to new conversation, message, source-selection, and profile tables |
| Tenant schema | [Core migration](../../backend/migrations/001_core.sql) and [provider migration](../../backend/migrations/002_providers.sql) establish tenant policies and provider ownership relationships | Add composite relationships and forced RLS for new records; verify migrations with the restricted runtime role |
| Jobs and proposals | [Provider routes](../../backend/src/api/provider-routes.ts) implement church-scoped source/job/proposal operations, capability checks, budget handling, and revision-bound adoption | Wire the panel to those workflows and add conversation permissions, streaming/status, and revocation handling |
| Provider requests | [AI integration](../../backend/src/integrations/ai.ts) uses bounded workflow requests and `store: false` with no enabled tools | Add Azure transport/authentication and a scoped conversation builder; any future tool needs a server-enforced tenant boundary |
| Interface | [Co-writer component](../../frontend/components/study-cowriter.tsx) is a local mock interface | Implement authenticated requests, persistent scoped history if desired, explicit source/profile selection, and stale-response protection |

The current model adapter defaults to OpenAI's public endpoint; the co-writer UI is not connected to Azure. Existing backend tenant controls are a useful foundation, not evidence that the future co-writer is already production-ready.

## Provider privacy and retention

Microsoft states that prompts and completions for models sold by Azure are not available to other customers and are not used to train foundation models without permission or instruction. Optional stateful features can persist data, and service processing/abuse-monitoring rules still apply. Our backend must prevent Church A's data from being placed into Church B's request; provider privacy does not repair an application authorization mistake. [Azure data privacy documentation](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/openai/data-privacy).

`store: false` is not a promise of zero retention across every service or log. Confirm the selected API's supported settings, processing location, monitoring policy, and retention terms before launch. Set application retention for messages, transcripts, attachments, summaries, indexes, and audit records. Deletion should remove or invalidate all derived private data, expire signed links, and cancel affected jobs, subject to disclosed backup retention. Any later provider-managed files or conversations need their own deletion workflow.

## Checks before allowing multiple churches to use it

- Create Churches A and B with distinct sermon phrases, profiles, users, files, and conversations. Verify each can retrieve only its authorized material, including citations and summaries.
- Have an A user guess B's study, source, conversation, job, provider-state, and attachment IDs. All reads and writes must be denied without disclosing B's content. Repeat with a user belonging to both churches while A is selected.
- Run simultaneous A/B jobs, switch church and study while responses stream, and reuse pooled database connections. Replies, persisted messages, proposals, and usage charges must stay in the original authorized scope.
- Retry identical prompts and idempotency keys across churches. Verify that cached content and spending reservations do not cross boundaries.
- Revoke membership or source access while a job waits, delete an attached source, and edit the draft before adoption. Verify safe rejection or cancellation at the appropriate step.
- Put “use Church B's notes” or “change tenant” instructions inside an uploaded transcript and a model tool request. The server must still deny access.
- Test private versus explicitly shared conversations within one church, logout/login, retained browser tabs, expired file links, and deletion of derived summaries/index entries.
- Verify each church's approved translation/profile stays attached to its requests and that generated content still requires human adoption, approval, and publication.

These tests must exercise real backend authorization and the restricted database role, not only mocked model output. Make their success a launch requirement.

Related: [Model selection and costs](model-selection-costs-and-routing.md), [Azure setup](25-azure-study-cowriter-setup-and-costs.md), [Agent behavior](agent-behavior-and-teaching-design.md), and the wider [data model and tenant isolation research](../06-data-model-and-tenant-isolation.md).
