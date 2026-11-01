# Conversation history and per-day consent follow-up

Implemented October 24, 2026 following the user's request to reopen earlier conversations and confirm each study day separately. This supersedes the original batch interaction for new requests; the earlier live batch evidence remains historical.

## Behavior

- Planning history lists the contributor's retained conversations in the selected church. Reopening restores messages, source, plan, saved-day links and the current confirmation step. Starting a new conversation preserves earlier ones.
- The selected-day assistant lists earlier conversations for that study and restores their messages and reviewed source. Confirming another transcript through the interface creates a separate conversation, preserving the earlier discussion.
- The co-writer first explains its understanding of the request and asks for confirmation. Users can exchange messages and refine the intention before confirming it. This step creates no study.
- Each day has its own discussion, editable details, direction review and explicit **Confirm & create day N** action. Only the current day is queued. After saving, the next day waits for review; no generation starts automatically.
- Revisions after consent invalidate the pending confirmation. A later day's discussion cannot rewrite previously saved day plans. A failed current day leaves earlier confirmed days saved and future days untouched.
- Users can continue discussing completed planning conversations. These replies cannot create or modify saved studies. Final editorial approval and publication still require their existing actions.

Migration 022 adds sequential/intent-confirmed flags. It preserves already confirmed legacy batch work but moves unconfirmed older requests into the new consent flow. Existing forced church/actor row policies, retention, privacy erasure and usage controls still apply. No new Azure resources or models are required. Model planning output now includes a conversational reply alongside the structured proposal; legacy queued schemas remain parseable.

## Verification

- TypeScript/contract checks, lint and frontend/backend production builds passed.
- Unit tests: 42 frontend, 35 backend and 4 operations passed.
- Full backend integration suite: 53 passed. The focused workflow case also passed after adding completed-conversation discussion checks.
- Real database tests cover intent confirmation, rejecting premature creation, exactly one queued day, duplicate consent, no automatic next-day calls, preserving earlier saved plans, private history access and read-only discussion after completion. Existing legacy batch rollback/failure tests remain as compatibility coverage.
- Browser journeys passed for conversation/source restoration and the complete three-day sequence with adjustments, reload/resume and history reopening. They use the actual application/worker/database with a mocked provider; no additional live Azure calls were made for this follow-up.

Retained history access remains 30 days for planning and 7 days for ordinary day chats. Expiration or explicit deletion still removes private content. The [runbook](../DEMO_RUNBOOK.md) describes the current interface.
