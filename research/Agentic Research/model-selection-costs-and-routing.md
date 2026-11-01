# Study Co-writer model selection, costs, and routing

Research date: October 22, 2026. Recommendation for a future Azure integration; no models were deployed or benchmarked on church content for this document.

## Recommended starting configuration

Evaluate **GPT-6 Luna as the default text model**, with **GPT-6.1 Sol available only for explicit, capped deeper-review requests**. Use the same default deployment for both the sermon-notes collaborator and the Baptist professor teaching profile. Their different behavior comes from approved instructions and selected sources, not a requirement to buy a model for each persona.

This recommendation combines current documented capabilities with verified Azure retail rates; it is not a claim that Luna has passed our theological or teaching-quality tests. Choose the default only after running the [behavior evaluation checklist](agent-behavior-evaluation.md) on representative sermons.

OpenAI's current model guide identifies Luna as the cost-oriented GPT-6 option and Sol as an option for more complex work. Azure's Responses documentation lists both models, but availability and quota for your subscription, deployment type, and region still require checking. [Official OpenAI model guidance](https://developers.openai.com/api/docs/guides/latest-model), [Azure Responses support](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/responses).

## Which model does which job?

| Component or model | Recommended work | Why it is needed | When to use it |
|---|---|---|---|
| GPT-6 Luna | Ask clarifying questions, expand sermon notes, explain simply, propose weekly outlines, draft the selected day, rewrite for clarity | Converts reviewed sources and contributor instructions into conversational explanations and proposed study fields | Default candidate for the text pilot |
| GPT-6.1 Sol | Compare difficult interpretations, synthesize conflicting approved resources, perform a second editorial review | A higher-capability candidate may improve difficult synthesis; verify that improvement on our examples | Optional escalation with a visible cost estimate and church budget check |
| GPT-5.4 mini | Alternative text/vision candidate if its task scores or availability fit the account better | Useful comparison point, not an additional always-running stage | Benchmark alternative; do not chain it behind Luna on every request |
| GPT-4.1 mini | Historical cost/latency comparison for the earlier setup document | Explains the older recommendation; current OpenAI documentation marks this model deprecated | Avoid selecting for a new default without reviewing Azure's own lifecycle and account availability |
| GPT-4o mini transcribe | Turn uploaded sermon audio into text | A text model cannot transcribe audio it cannot accept; transcription produces reusable source text | Add when recordings are used and no suitable transcript exists |
| Default vision-capable model, initially Luna | Explain selected slide images or sampled frames from a sermon clip | Adds visual information that an audio transcript omits | Later phase; include timestamped frames and cap image-processing work |
| Bible-text lookup and approved-resource retrieval | Find the passage and surrounding context, retrieve reliable text and source references | Research requires actual source access; a model's memory is not a verified Scripture database | Add as deterministic read-only tools, not a separate “Bible expert” model |
| Embedding model | Semantic search across a larger sermon library | May improve retrieval when keyword search is insufficient | Defer for the pilot; selected-source and PostgreSQL text retrieval may be enough |

Luna supports text and image inputs, with text output; its documentation does not list native audio or video input. Clip analysis therefore needs an audio/transcription path and, if requested, a separate sampled-frame path. GPT-5.4 mini also documents text/image support. [GPT-6 Luna capabilities](https://developers.openai.com/api/docs/models/gpt-6-luna), [GPT-5.4 mini capabilities](https://developers.openai.com/api/docs/models/gpt-5.4-mini).

A more capable model is not a doctrinal authority or an automatic fact checker. A second model can repeat the first model's mistake. The church profile, verified passage text, evidence checks, and human review remain necessary for either teaching profile.

## Verified Azure price snapshot

The following are **public USD retail consumption rates** retrieved from Microsoft's Retail Prices API on the research date, filtered to service `Foundry Models` and region `eastus`. The selected meters are Global Standard/short-context meters where applicable, excluding priority, fine-tuning, and Batch. They are not a subscription-specific quote.

| Text model | Uncached input / 1 million tokens | Output / 1 million tokens | Cached input / 1 million tokens | Decision |
|---|---:|---:|---:|---|
| GPT-6 Luna, short context | $0.10 | $0.50 | $0.01 | First default to evaluate |
| GPT-6.1 Sol, short context | $2.00 | $10.00 | $0.10 | Optional deeper-review route |
| GPT-5.4 mini | $0.75 | $4.50 | $0.075 | Alternative candidate |
| GPT-4.1 mini | $0.40 | $1.60 | $0.10 | Historical comparison; lifecycle caution |

Evidence: [saved Azure meter snapshot](azure-model-prices-2026-10-22.json), [Microsoft Retail Prices API](https://prices.azure.com/api/retail/prices), and [Microsoft API documentation](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices). The snapshot preserves meter IDs, names, units, effective dates, product/SKU names, and source filters. GPT-4.1 mini meters use `1K` units, so their prices were multiplied by 1,000 to produce the table.

The current [OpenAI GPT-4.1 mini page](https://developers.openai.com/api/docs/models/gpt-4.1-mini) marks it deprecated. That does not establish an Azure retirement date. An existing price meter also does not prove that Azure will let your subscription create a new deployment.

The saved Luna long-context meters are $0.20/million input and $0.75/million output. Confirm the deployment's context-band rules before budgeting large prompts. Our 12,000-input-token examples below are deliberately small. Luna's short-context cache-write meter is $0.125/million tokens; cached-read discounts alone do not capture the cost of creating a cache. Do not assume that every input qualifies for the cached price.

Global, Data Zone, regional, priority, Flex, Batch, long-context, image, and cache-write meters may have different rates. Validate the exact deployment's meters, privacy requirements, and quota in Azure before enabling it. The public Azure pricing webpage timed out during this research; the numeric Azure rates above come from the directly retrieved retail API, not inferred parity with OpenAI's API.

### Transcription costs

The Azure snapshot includes these Global GPT-4o mini transcribe meters:

| Meter | Azure price / 1 million tokens |
|---|---:|
| Audio input | $3.00 |
| Text input | $1.25 |
| Text output | $5.00 |

An audio token is not a text token. For Azure, measure actual audio/text usage on representative files and use the corresponding meter rates. A transcript already supplied by the church incurs no model transcription call.

For comparison only, OpenAI's direct API publishes an estimated **$0.003/minute** for GPT-4o mini transcribe. That is a useful rough workload reference, **not a verified Azure per-minute rate**. At that direct-provider estimate, four 45-minute sermons would be about $0.54 in transcription; do not put that number into an Azure invoice forecast without measuring Azure's usage. [OpenAI transcription pricing](https://developers.openai.com/api/docs/pricing), [transcription model](https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe).

Azure Speech is an alternative to evaluate if its languages, timestamps, transcription mode, or regional availability better fit the church. It uses separate pricing and quota rules. Do not deploy both transcription paths merely to process the same clip twice; compare samples and choose one. [Azure Speech pricing](https://azure.microsoft.com/en-us/pricing/details/speech/).

## What a small church's usage could cost

These are calculations from the text rates above, not measured production bills. Assume an average request consumes **12,000 uncached input tokens and 2,000 billable output tokens**, with no paid tools or cache writes. For reasoning models, count all billable output/reasoning usage, not only the answer visible in chat.

| Routing choice | One request | 100 requests/month | 500 requests/month |
|---|---:|---:|---:|
| Luna only | $0.0022 | $0.22 | $1.10 |
| Sol only | $0.0440 | $4.40 | $22.00 |
| 90% Luna, 10% Sol | $0.00638 average | $0.638 | $3.19 |
| GPT-5.4 mini only | $0.0180 | $1.80 | $9.00 |

Calculation: `input_tokens / 1,000,000 × input_rate + output_tokens / 1,000,000 × output_rate`.

At the mixed-route assumptions, 20 churches each making 100 requests would consume about **$12.76/month in text-model tokens** before retries and all other services. Add a 30% planning reserve to that text subtotal: approximately $16.59. A reserve is not a hard cap.

These amounts exclude transcript processing, image tokens, resource storage, downloads, hosting, database, observability, evaluation runs, search/tool charges, taxes, and account-specific discounts. Long conversations, repeated transcript resends, reasoning overhead, and automatic retry loops can change the average substantially.

## Low-cost routing policy

1. Use one Luna deployment for both personas and most tasks, subject to evaluation and Azure account availability.
2. Supply only reviewed source spans needed for the current request, a bounded conversation summary, the selected day, and the church-approved profile.
3. Begin with no/low reasoning where supported and compare quality and latency on the evaluation set. Sol does not support `none`; use a supported setting and a total output cap. [Luna settings](https://developers.openai.com/api/docs/models/gpt-6-luna), [Sol settings](https://developers.openai.com/api/docs/models/gpt-6.1-sol).
4. Offer an explicit deeper-review action for Sol; do not silently escalate every uncertain answer. Questions or missing-source warnings are often more useful than another model call.
5. Cache reusable transcript extraction and summaries within the correct church boundary. Reuse them only when the source and profile versions match.
6. Transcribe a recording once. Analyze a short requested clip instead of the whole sermon when that is sufficient.
7. Enforce per-request token/tool limits, per-church monthly currency reservations, bounded retries, and a global pilot ceiling in backend code.

Neither persona needs fine-tuning initially. Adding an image-generation model, a realtime voice model, or a multi-agent supervisor is unnecessary for the requested first release.

## Choosing the final deployment

Compare Luna, Sol, and the alternative mini model on the same notes and instructions. Measure clarity, groundedness, relevant Scripture connections, appropriate follow-up questions, intermediate-depth stopping, latency, and total billable cost. Start with the [behavior evaluation set](agent-behavior-evaluation.md). Keep the cheaper candidate if it meets the agreed quality gate.

Record model/deployment/version, prompt/profile versions, region, processing type, price-meter IDs, evaluated reasoning setting, and review date. Recheck Azure availability and lifecycle notices before launch. A model change must not silently change a church's doctrinal profile.

This document supersedes the earlier setup guide's provisional GPT-4.1 mini starting candidate and hypothetical token-rate example. It changes the research recommendation, not the application configuration.
