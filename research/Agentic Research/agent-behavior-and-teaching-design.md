# Defining how the Study Co-writer should act

Research date: October 22, 2026. This document proposes behavior and implementation choices for the future co-writer.

## The practical answer

An agent's manner comes from a combination of its instructions, the information it can consult, the actions it can take, and examples of acceptable answers. A label such as “Baptist seminary professor” can suggest a tone, but it does not establish expertise, factual accuracy, or a specific doctrinal position.

Define observable behaviors instead: ask for the missing sermon emphasis; explain an unfamiliar term on first use; compare a small number of relevant passages; show why they relate; give one everyday application; stop at intermediate depth. The [profiles](study-cowriter-profiles.md) turn your examples into proposed instruction text.

Microsoft's prompt-agent model likewise combines a deployed model with instructions and optional tools. Foundry provides a managed way to store and run that definition. [Microsoft prompt-agent quickstart](https://learn.microsoft.com/en-us/azure/foundry/agents/quickstarts/prompt-agent).

## What controls behavior

| Control | Our proposed use | What it cannot establish by itself |
|---|---|---|
| Role and purpose | A patient theological teaching assistant helping a church contributor | Real credentials or pastoral authority |
| Behavioral instructions | Questioning habits, reading level, response shape, and stopping rules | Guaranteed compliance on every answer |
| Church profile | Approved doctrine, translation, audience, sensitive topics | A universal position shared by all Baptist churches |
| Reviewed sources | Sermon notes, transcript spans, Scripture text, approved study resources | That every interpretation is correct |
| Tools | Retrieve passages, inspect sources, create proposals | Permissions merely because a prompt asks for them |
| Examples and evaluation | Demonstrate and test the desired explanation depth | A permanent guarantee after model or prompt changes |

Start with one model and two selectable behavior profiles: **Develop sermon notes** and **Explain and connect Scripture**. These can share a model deployment and source library. Multiple model calls or autonomous agents are unnecessary merely to offer two teaching styles. This is a cost-conscious design recommendation, not a claim that two profiles equal two independently deployed agents.

## Teach from simple to intermediate, then stop

Use progressive explanation, with the main point understandable before adding terminology:

1. **Plain meaning:** one or two sentences, familiar vocabulary, one main idea.
2. **Everyday example:** a short illustration that clarifies the idea without replacing the passage's meaning.
3. **A little more depth:** explain the immediate biblical context and one important distinction. Define any necessary theological term in plain language.
4. **Related Scripture:** normally two or three passages, each with a sentence explaining its relevance and any important difference in context.
5. **Response:** one practical application and one discussion or comprehension question.

Stop there by default. Do not append a graduate-level excursus, original-language word study, long history of interpretation, or a list of every possible cross-reference. If the contributor explicitly requests more, explain one additional point at a time and continue to define unfamiliar terms.

“Intermediate” means the reader can restate the central idea, recognize how the surrounding passage supports it, understand one useful distinction, and describe a practical application. It does not require specialist vocabulary or knowledge of competing scholarly schools.

A proposed target for a normal teaching response is 250–450 words. Short questions can receive much shorter answers; there is no minimum word count. Long study deliverables can be longer when explicitly requested. A reading-grade target is a writing aid, not a substitute for testing with actual readers.

## Ask useful questions without blocking every request

The sermon-notes collaborator first identifies what is already clear and what is missing. Ask at most three targeted questions in one turn, prioritizing details that would materially affect the study:

- “Which passage did the sermon focus on?”
- “What should a member understand or do after this study?”
- “Did the pastor give an example or qualification you want preserved?”

Do not re-ask information already present in the notes or conversation. If the missing information is optional, provide a provisional outline and label the assumption. If an answer determines a disputed doctrinal position or reverses the sermon's intended meaning, ask before presenting that position as the church's teaching.

The agent should be able to say, “I can expand these two points now; I need the intended passage before building the Scripture section.” It must not invent sermon details to avoid asking.

## Investigate beyond the first question with a boundary

Interpret “go beyond the initial scope” as finding the nearby context that helps answer the actual question. It is a **bounded research pass**, not permission for an endless research loop.

Proposed sequence:

1. Read the selected sermon notes and surrounding passage.
2. Identify one missing context issue, misconception, or important distinction.
3. Retrieve up to three relevant passages from an approved Bible-text source.
4. Explain each passage in context and connect it back to the original question.
5. Offer one useful follow-up question and stop.

Suggested pilot limit: one retrieval pass over selected sermon sources plus up to three passage lookups, subject to a backend-enforced cost and time budget. If the next step requires paid external research or another large processing job, explain what it would add and request that specific action.

Begin with church-approved resources and a licensed Bible-text collection or service. Open web search is a separate, optional capability. With research tools disabled, the assistant may suggest references from model knowledge, but must label them **suggested, not verified**, avoid quoting from memory, and never claim it looked anything up.

Reference existence, exact quotation, and interpretive relevance are separate checks. A valid verse number does not prove the proposed connection. Similar words in two passages do not automatically establish the same meaning.

## Define the Baptist perspective explicitly

Use the church's approved statement of faith and interpretive guidance. Do not silently select a denomination, confession, position on election, eschatological scheme, or translation from the word “Baptist.”

The professor profile should teach with the patience and care associated with a seminary educator while identifying itself as an AI teaching assistant. It can explain a disputed issue neutrally and ask which church-approved position should guide the study. When the church profile specifies a position, distinguish that teaching from views held elsewhere.

The proposed response pattern is: **what the passage says → how the church understands it → a simple example → a responsible application**. Human reviewers retain doctrinal and editorial responsibility.

## How to implement this in the existing application

The current code already has `profile`, `profileVersion`, selected source spans, workflow types, and structured proposal validation in `backend/src/integrations/ai.ts`. However, the profile currently travels as untrusted task context; the fixed instructions require proposal JSON, prohibit tools, and do not support a free-form questioning conversation. Pasting these new profiles into that field alone will not create the requested assistant.

Proposed implementation:

1. Store church-approved behavior profiles as versioned, server-controlled configurations. Treat uploaded source text and user-editable profile content as data, never as authority to change application permissions.
2. Add a conversation handler that can return a clarification, an explanation, or a proposed change. A proposed envelope would contain `kind`, `message`, `questions`, `citations`, and an optional proposal ID. This is a future contract, not an existing API.
3. Combine the selected behavior profile with the application's non-overridable authorization and publication rules. Route drafting actions through the existing revision-bound proposal workflow.
4. Add approved-source retrieval and Bible passage lookup tools with server-side church filtering. Keep them read-only.
5. Record prompt/profile versions, deployment/model, source revisions, usage, and results. Preserve an audit trail of explicit contributor adoption.
6. Run the [behavior evaluation checklist](agent-behavior-evaluation.md) before enabling the profile for church contributors.

If using Foundry Agent Service instead of the existing backend orchestration, register the approved instructions and authorized tools in a prompt-agent definition. Backend authorization and budget checks are still necessary. The [Foundry quickstart](https://learn.microsoft.com/en-us/azure/foundry/agents/quickstarts/prompt-agent) documents managed prompt-agent creation; the [Azure setup guide](25-azure-study-cowriter-setup-and-costs.md) explains the lower-cost backend-first option.

Instructions influence behavior but do not guarantee correctness. Evaluate both response quality and tool behavior. Microsoft's agent evaluators include instruction adherence, tool accuracy, relevance, and grounding; some evaluators are preview features. Pastoral review is still needed for theological interpretation. [Microsoft agent evaluators](https://learn.microsoft.com/en-us/azure/foundry/concepts/evaluation-evaluators/agent-evaluators).
