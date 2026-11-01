# Rooted 1.2.12 — Study Co-writer guided agentic workflow

Implemented October 24, 2026. **Status: Local implementation and live single-day/three-day acceptance passed.** See the [demo runbook](DEMO_RUNBOOK.md) and [execution evidence](evidence/execution.md) for operation, verification and remaining human review.

Follow-up implementation: [conversation history and per-day confirmation](evidence/conversation-confirmation.md) supersede the original batch interaction for new requests. Each day now waits for its own explicit consent.

The original build target was: “Create a three-day study for next week based on this sermon outline” → review an editable plan → settle the teaching direction → explicitly confirm generation → receive complete saved drafts on the agreed dates. Opening each date must show the real editor fields filled out, without copying chat text into the editor.

## Read in this order

1. [Command-center research](../../research/Agentic%20Research/study-cowriter-command-center-roadmap.md).
2. [Master build prompt](MASTER_BUILD_PROMPT.md).
3. [Workflow and data contract](WORKFLOW_AND_DATA.md).
4. [Testing gates](TESTING_GATES.md) and [phase tracker](PHASE_TRACKER.md).

## Scope decisions

- Use the existing Azure `gpt-5.6-luna` deployment, backend, PostgreSQL and worker. A separate hosted agent platform, model, search service or transcription service is not required.
- Keep the floating assistant, Expand/Restore, current Live Preview, and the normal Create Study → Gain Approval → Publish Study stages.
- Support a bounded 1–7-day plan; the required acceptance journey is three days. Resolve actual dates in the church timezone, including a week spanning two months.
- First release creates new study dates and drafts. Existing dates are conflicts to resolve by selecting other dates; batch replacement of existing studies is deferred. Existing single-day editing/adoption stays available under its own rules.
- Planning agreement is distinct from confirmation to generate and save drafts. Generation confirmation authorizes atomic creation of the complete named set; no additional field-by-field adoption is required in the successful new-date flow.
- Resume work after a reload or worker restart. Failed days remain staged; no partial batch is presented as saved.
- Preserve church/contributor isolation, source grounding, human final approval, idempotency and usage accounting.

## Verification and authorization

When execution is explicitly authorized, this version permits **up to 10 live Azure inference requests and 150,000 total reserved/billable verification tokens**, including repairs and the earlier single-day reliability check. Existing lower application limits still apply. This is a new prospective allowance for 1.2.12, not permission to send requests while preparing this package or to rewrite 1.2.11's evidence.

The allowance is intended to let the implementer fix and recheck a validation defect within the same authorized run, without asking again after each routine test. No automatic inference retries, new Azure resources, production changes, paid tools, or outbound messages are included. See the exact accounting and stop conditions in the master prompt.

The preceding demo verified live chat/follow-up but left live draft/adoption open after a safely rejected response. The new full-day writer passed that reliability gate in 1.2.12; the earlier evidence remains unchanged.
