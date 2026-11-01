# Conversation-first submission fix

October 24, 2026. The user reported that Send/Enter opened the menu instead of submitting a request. The blank planning composer only toggled the setup menu; the original workflow endpoint also required a series and reviewed outline before accepting input.

The composer now posts to a private conversation endpoint immediately. The durable worker sends a bounded plain-text chat request through the existing Azure adapter, stores the model reply, and supports follow-up messages without requiring setup first. Enter submits, Shift+Enter inserts a newline, duplicate submissions are guarded/idempotent, and failed messages stay available for explicit retry.

Migration 023 allows a conversation to exist without a series. This relaxes only the private workflow record: ordinary studies still require their canonical series/calendar relationships. Ungrounded conversations cannot obtain a structured plan or create a study. Attaching reviewed planning details via the menu continues the same conversation with a new immutable source snapshot. Intention and individual-day confirmation remain required before saved study creation. Existing church/actor privacy, worker leases, daily/monthly budgets, usage settlement, expiration and erasure still apply.

Verification passed:

- Contract and TypeScript checks, lint, production builds.
- Unit tests: 42 frontend, 35 backend, 4 operations.
- Backend integration suite: 53 passed, including initial conversation without setup, follow-up messages, ownership, duplicate submission, rejection of premature generation and transition into source-grounded planning.
- Existing popup/proposal browser check and the three-day flow passed. An additional browser check reproduced the Wednesday/Paul request, sent it with Enter without any setup, received a reply, preserved Shift+Enter, restored the saved conversation after reload, and verified zero study dates created.

Automated checks used mocked provider transport with real frontend/API/worker/database persistence. No new paid Azure verification calls were made. See the updated [demo runbook](../DEMO_RUNBOOK.md).

## Consistent chat layout follow-up

Following the user's Rovo reference, the composer is now one persistent element outside the scrolling transcript, rather than switching to a workflow form after the first reply. Execution details, usage, deletion and full direction editing moved to menu categories. Compact reviewed-action cards preserve explicit intent/day confirmations without replacing the composer.

Type/contract checks, lint, 42 frontend unit tests and production builds passed. Three co-writer browser journeys passed, including the complete three-day flow and checks that a long reply makes only the transcript scroll, the original composer element stays connected at the same vertical position, and progress/deletion controls are hidden from the chat canvas. This presentation follow-up made no paid model calls.
