# Azure study co-writer: setup, implementation, and a small pilot budget

Research date: October 22, 2026. This is a proposed implementation plan, not a deployment. No Azure resources were created and no paid AI requests were sent.

Implementation update, October 24: this dated plan is preserved as research. The [1.2.11 runbook](../../BuildPrompts/1.2.11/DEMO_RUNBOOK.md) documents the implemented Azure text demo, current configuration, supported files, limits, and retention. See [actual execution results](../../BuildPrompts/1.2.11/evidence/execution.md) for live verification status. The “not connected” and “not implemented” descriptions below refer to the original research baseline, not the current code.

Related: [Agentic Research index](README.md), [Defining agent behavior](agent-behavior-and-teaching-design.md), and [Reusable behavior profiles](study-cowriter-profiles.md).

## What works now

The Create a Study editor follows the [Interactive Study Creator Figma Make](https://www.figma.com/make/Mn74h4oE7djpVC1NdhbwDC/Interactive-Study-Creator). It edits the existing saved draft fields, inserts Markdown formatting and hosted HTTPS media links, and previews local images/clips for the current visit. The existing right-hand Live Preview is unchanged, including its current plain-text rendering.

Study Co-writer is an unconnected interface. Starter actions prepare prompts, messages appear in a local conversation, and attachments show their filenames. It does not upload, read, transcribe, analyze, generate, or modify study content. Local files and conversation state disappear when the editor unmounts or the page reloads. Hosted media links are retained in the saved study body; local object URLs are never saved as publication assets.

## Recommended first release

Start with text transcripts, one model deployment, and the current backend and PostgreSQL job queue. One explicit request should produce a proposal for a contributor to review. This can support transcript summaries, a weekly outline, and a draft for the selected day without a hosted agent runtime.

Evaluate GPT-6 Luna as the default candidate, with GPT-6.1 Sol as an optional capped deeper-review route, using representative sermon transcripts. See [Model selection, verified rates, and routing](model-selection-costs-and-routing.md) for the current comparison; it supersedes this guide's earlier provisional GPT-4.1 mini recommendation. Pick the lowest-cost model that produces acceptable grounded studies. Model, region, API, and deployment availability must be checked in your account. Use Standard consumption billing for the pilot; reserved throughput would introduce a capacity commitment before demand is known. [Microsoft deployment overview](https://learn.microsoft.com/en-us/azure/foundry-classic/concepts/foundry-models-overview), [Azure OpenAI pricing](https://azure.microsoft.com/en-us/pricing/details/azure-openai/).

This is an architecture recommendation. It does not require Azure AI Search, a vector database, fine-tuning, a separate agent service, or a GPU deployment for the first pilot.

For how each church's site connects to the shared service while keeping conversations and sources separate, see [Church context isolation and site integration](church-context-isolation-and-site-integration.md).

## What you need to do in Azure

1. Confirm your subscription, billing currency, spending ceiling, and who can create resources. Choose the Azure region based on model availability and your church's data-location requirements.
2. Create a dedicated development resource group, for example `rooted-ai-dev`, so pilot spending is easy to isolate.
3. Create the Azure OpenAI/Foundry resource and deploy one suitable model. Record the **deployment name**, resource endpoint, model/version, region, and deployment type. The deployment name used in requests can differ from the catalog model name.
4. Enable authentication for the application backend. Microsoft recommends Entra ID for the Responses API. Prefer an Azure-hosted backend's managed identity with the appropriate inference role. For a local pilot, use an authorized developer identity or a server-only key stored in local secrets. Keep credentials out of browser code and source control. [Responses prerequisites and examples](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/responses).
5. Set a resource-group budget, for example **$10/month**, with alerts at 50%, 80%, and 100%. Treat this as a notification budget. Azure budgets do **not** stop consumption and usage reports can be delayed. We must also implement an application-enforced budget before enabling paid requests. [Azure budget behavior](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets).
6. Initially test with church-approved sample transcripts, with member names and sensitive pastoral details removed. Decide who may use the co-writer and how long sources and conversations should be retained.
7. Provide the developer with non-secret configuration: subscription/resource identifiers, deployment name, endpoint, region, chosen budget, and expected requests/week. Grant access or configure secrets through Azure's access controls; do not paste keys into chat.

Model quota limits request throughput; they are not a monthly financial ceiling. Keep pilot concurrency small and add backoff for throttling. [Azure OpenAI quotas](https://learn.microsoft.com/en-us/azure/foundry/openai/quotas-limits).

## Additional resources for uploaded files and clips

For permanent attachments, create a Standard Blob Storage account with a private container. Use church-scoped object paths and an authenticated upload authorization endpoint that grants short-lived access to one object. Persist an asset ID in study content, not a temporary signed URL. Member reads must recheck church/publication authorization. Configure CORS only for the application's origins, file limits, retention, and deletion of abandoned drafts. Microsoft recommends user delegation SAS when delegated signatures are needed. [Blob security recommendations](https://learn.microsoft.com/en-us/azure/storage/blobs/security-recommendations), [SAS overview](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview).

This requires application work in addition to creating the storage account: upload/finalization routes, media inspection, asset metadata and tenant isolation, safe member rendering, and immutable publication references. The current local file preview intentionally does not claim this storage integration exists.

If a transcript is available, upload it instead of processing the recording again. Parse TXT/VTT/SRT locally in the backend and keep reviewed source spans. PDF/DOCX extraction would need a parser and review step; merely selecting one in the co-writer does not extract it.

For clips without a transcript, add Azure Speech and a bounded worker that extracts the audio, checks the format/duration, transcribes it once, and saves the timestamped result for reuse. Speech pricing distinguishes real-time and other transcription paths. Do not assume that an F0 real-time allowance covers fast or batch transcription; confirm the chosen API/tier and region before enabling it. [Speech pricing](https://azure.microsoft.com/en-us/pricing/details/speech/), [Speech limits](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-quotas-and-limits), [Fast transcription requirements](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/fast-transcription-create).

Audio transcription cannot establish what a video visually shows. Start “Examine sermon clip” with transcript-based analysis clearly labeled as such. Add visual analysis later by extracting a small, timestamped set of frames and sending those to a supported vision model. Confirm image input support for the selected deployment; preserve frame timestamps and charge separately for that work. This proposed sampled-frame approach is not full continuous video understanding.

## Changes required in this repository

| Area | Existing foundation | Work still required |
|---|---|---|
| Provider | `backend/src/integrations/ai.ts` contains a Responses adapter | Add Azure endpoint/deployment configuration and tested Azure authentication. The adapter defaults to OpenAI's public endpoint; `providerRuntime()` does not currently wire an Azure base URL. Simply setting an Azure key will not connect it. |
| Jobs | `backend/src/api/provider-routes.ts` has AI jobs, proposals, budgets, and source review | Route co-writer actions to those job types, enforce church permissions and spending reservations, add status/cancel/retry UI. |
| Conversation | New co-writer component is local UI state | Add tenant-scoped conversation storage, selected-day context, source references, and bounded history. Do not resend the full transcript every turn. |
| Sources | Existing transcript ingestion and reviewed spans | Connect uploads, rights confirmation, extraction review, and source selection to the co-writer. Add the Azure Speech path separately. |
| Adoption | Existing proposal/adoption flow creates draft revisions | Present a before/after diff; only explicit adoption changes the selected draft. Reject stale revision bases. Never allow AI to approve or publish. |
| Media | Hosted links save as Markdown; local files are staged | Add Blob upload/finalization, typed asset references in contracts, review/member rendering, and asset lifecycle rules. Keep Live Preview unchanged until separately requested. |
| Tests | Existing revision-bound approval and worker tests | Add Azure transport fixtures, request caps, duplicate job suppression, cross-church isolation, stale adoption, timeouts, and source-grounding checks. |

The proposed Azure configuration fields are `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, and an authentication mode. They are **not implemented environment switches today**. Azure's v1 Responses route uses the resource's `/openai/v1` base. Authentication, model support, structured output support, and retention options must be tested against the selected deployment. [Azure REST reference](https://learn.microsoft.com/en-us/rest/api/aifoundry/azureopenai/responses).

## Budget worksheet

Record actual rates from your Azure subscription and region before deployment. The [model cost comparison](model-selection-costs-and-routing.md) now includes verified public retail meters and dated evidence. The hypothetical calculation below remains only as an example of the formula; use the comparison's model-specific rates for current planning, then confirm your account's quote. [Azure pricing](https://azure.microsoft.com/en-us/pricing/details/azure-openai/), [Foundry cost planning](https://learn.microsoft.com/en-us/azure/foundry/concepts/manage-costs).

Use this estimate:

`monthly model cost = input_tokens / 1,000,000 × input_rate + output_tokens / 1,000,000 × output_rate`

Illustrative workload: 100 actions/month, each averaging 12,000 input tokens and 2,000 output tokens = 1.2 million input and 0.2 million output tokens. **If** your selected model costs $0.50/million input and $2.00/million output, the model portion would be **$1.00/month**, or **$1.30** with a 30% retry/testing reserve. Those rates are hypothetical planning inputs, not an Azure price quote.

At 500 actions with the same sizes/rates, the model portion would be $5.00 before the reserve. A long conversation can exceed these sizes, so track real token counts instead of assuming every click has a fixed price.

Total pilot cost must also include transcription hours, image/frame tokens, blob capacity/operations, downloads/egress, worker compute, hosting, database, and logs. The $10 notification budget is a starting target, not a promise that all these services fit inside it.

Recommended application controls for the first pilot:

- One job at a time per church; a daily request cap; a monthly currency-equivalent reservation ledger.
- Reserve estimated input/output expense before calling the provider and reconcile to actual usage afterward.
- Hard maximum transcript size, clip length, output tokens, tool iterations, retries, and total job duration.
- Hash and reuse transcripts/summaries; show estimated work before expensive clip processing.
- Summarize conversations and retrieve only relevant reviewed spans. Avoid a whole-transcript resend on each message.
- Start without paid web search, autonomous loops, audio recording, or always-running model capacity. Log usage and job IDs rather than raw transcripts.

## Delivery order and readiness

1. Connect text-only chat to a sandboxed Azure deployment using approved transcripts and the existing proposal pipeline.
2. Support weekly outlines and selected-day drafts, with explicit diff/adoption and the current human approval gate.
3. Add permanent Blob attachments and member media rendering.
4. Add audio transcription and transcript-based clip analysis.
5. Add sampled visual analysis only after measuring cost and quality.

Before enabling the first pilot, verify that requests cannot cross churches, duplicate clicks do not duplicate charges, spending reservations reject over-budget work, and a failed request leaves the saved study intact. Use a small evaluation set to check source citations, unsupported claims, appropriate tone, and whether weekly outputs match actual selected dates. The co-writer should remain labeled unconnected until those checks pass.
