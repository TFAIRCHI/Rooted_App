# Agentic Research

Research and proposed behavior specifications for the Study Co-writer. The dated documents distinguish implemented behavior from future capabilities.

Implementation update, October 24, 2026: the [1.2.12 guided workflow](../../BuildPrompts/1.2.12/DEMO_RUNBOOK.md) now plans 1–7 days and atomically saves complete drafts after confirmation; live single-day and three-day checks passed. Human content review remains separate. Earlier history: the [1.2.11 local demo](../../BuildPrompts/1.2.11/DEMO_RUNBOOK.md) now connects the floating assistant to the user's Azure `gpt-5.6-luna` deployment. The [execution evidence](../../BuildPrompts/1.2.11/evidence/execution.md) distinguishes verified live chat from draft/adoption verification and remaining research proposals. The dated research below is not a claim that every proposed feature is implemented.

The teaching goal is to make complex ideas simple, then add enough explanation to reach a useful intermediate understanding. The agent should be curious about missing context, careful with Scripture, and helpful to readers with different levels of biblical knowledge.

| Read | Purpose |
|---|---|
| [Agent behavior and teaching design](agent-behavior-and-teaching-design.md) | How instructions, sources, tools, examples, and evaluation produce the desired behavior |
| [Study co-writer profiles](study-cowriter-profiles.md) | Reusable instructions for a sermon-notes collaborator and a Baptist seminary professor teaching assistant |
| [Behavior evaluation checklist](agent-behavior-evaluation.md) | Concrete tests for questions, research, clarity, doctrinal fit, and stopping depth |
| [Azure setup and costs](25-azure-study-cowriter-setup-and-costs.md) | What to configure in Azure and what still needs implementation |
| [Model selection, costs, and routing](model-selection-costs-and-routing.md) | Recommended model candidates, verified Azure token rates, workload estimates, and low-cost routing |
| [Church context isolation and site integration](church-context-isolation-and-site-integration.md) | How each church uses the co-writer without mixing conversations, sources, permissions, or teaching profiles |
| [Guided workflow command-center roadmap](study-cowriter-command-center-roadmap.md) | How a natural-language request becomes an agreed multi-day plan and complete saved daily drafts; implementation gaps, tools, job orchestration, and additional costs |
| [1.2.12 agentic workflow build prompt](../../BuildPrompts/1.2.12/README.md) | Implemented guided multi-day workflow, runbook and bounded live evidence |
| [Azure price evidence](azure-model-prices-2026-10-22.json) | Dated retail-meter snapshot supporting the model cost comparison |

For the wider application design, see [Contributor-controlled AI workflows](../10-ai-workflows-and-guardrails.md) and [Sermon ingestion](../09-sermon-ingestion-and-transcription.md). Those documents remain in the main research collection because they cover the application as a whole.

Start by reviewing the two behavior profiles with church leadership. Record the preferred Bible translation, approved statement of faith, intended audience, and matters that require pastoral review. Then evaluate one model with those profiles before adding separate agents or paid research tools.
