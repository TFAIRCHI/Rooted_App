# Conversation-to-study creation bridge

Implemented October 24, 2026 after the user explicitly authorized the update and replay of the saved three-day conversation.

Previously, conversation-only replies could discuss and even write study text without producing a structured plan or scheduling generation. New creation requests such as “Create these now” now promote the user's supplied notes and references into an immutable conversation source and queue a structured plan. The contributor can also choose **Prepare the discussed study plan** in chat. The original conversation remains available.

Only user messages become source evidence; assistant suggestions cannot attest rights or authorize creation. The intention card shows the captured notes and requires source review before confirmation. Each day still requires its own reviewed direction and creation confirmation. The first confirmed day creates a series in the same database transaction if none was selected; merely discussing or preparing the plan creates no series or study dates.

Migration 024 adds conversation-source and source-review flags. Existing uploaded/reviewed source workflows and confirmed legacy jobs retain their established behavior. Worker reservations, leases, capability checks, actor/church isolation, calendar conflicts and all-or-nothing saving for each confirmed day remain in force.

## Validation and authorized replay

- Contract/type checks, lint, production builds and unit tests passed: 42 frontend, 35 backend and 4 operations.
- Full backend integration suite: 53 passed. Additional cases verify promotion from chat without menu setup, no series creation before consent, source review gating, assistant text excluded from source snapshots, and series creation only when the first day is saved.
- Three co-writer browser checks passed. The complete three-day test now begins with conversation notes, uses the natural-language creation request, reviews the source in chat, confirms each day and verifies all saved editor fields. Ordinary chat, long replies, reload/history recovery, the pinned composer and the existing single-day proposal path remain covered.
- The explicitly authorized local replay recovered the saved user's dates, audience and teaching requirements and created complete drafts for **October 26, 27 and 28, 2026** using the actual Azure deployment. It used one planning request and three day-writing requests: **11,139 additional tokens**. This was user-requested study creation, separate from the historical synthetic verification ledger.
- Each real saved editor was opened and reloaded successfully. All seven content fields were populated, closing prayers were present, and all three studies remained unapproved, unpublished drafts. The original conversation was preserved. Private conversation text and generated content were not copied into this research/build package; the detailed replay receipt and screenshots remain under `.local/replay/`.

See the current [demo runbook](../DEMO_RUNBOOK.md). Earlier evidence records earlier behavior and is not retroactively rewritten.
