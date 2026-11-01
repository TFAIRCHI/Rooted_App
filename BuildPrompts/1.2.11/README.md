# Rooted 1.2.11 — Azure Study Co-writer demo

Prepared October 24, 2026. **Status: Implemented locally after user authorization. Live chat and follow-up verified; live draft/adoption verification remains open after a safely rejected draft response.** See [execution evidence](evidence/execution.md) and the [demo runbook](DEMO_RUNBOOK.md).

Use [MASTER_BUILD_PROMPT.md](MASTER_BUILD_PROMPT.md) as the execution instruction. It connects the existing floating co-writer to the user's Azure deployment, `gpt-5.6-luna`, using credentials in the project-root `.env`. The prompt includes configuration normalization, authenticated church-scoped requests, bounded model usage, text-source handling, proposals, and an actual live demo verification.

Review [testing gates](TESTING_GATES.md) and record implementation results in the [phase tracker](PHASE_TRACKER.md). Earlier build packages remain historical references; this package does not require repeating the member-home Figma work.

No secrets are copied into this package. Implementation normalized the root Azure entries into valid dotenv assignments and changed the Foundry project URL to the same resource's inference base. Three synthetic live model requests were attempted: chat and follow-up completed; a draft failed deterministic validation and changed no study. The schema was then tightened and local tests passed. A fourth draft verification request requires the user's explicit extension of the three-request allowance.

This demo uses the user's deployed GPT-5.6 Luna. The broader research's GPT-6 recommendations do not override that choice. See [church isolation research](../../research/Agentic%20Research/church-context-isolation-and-site-integration.md) and [behavior profiles](../../research/Agentic%20Research/study-cowriter-profiles.md).
