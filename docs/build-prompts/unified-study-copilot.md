# Build Prompt: Unified Study Co-Writer

## Goal

Make the Co-Writer one church-scoped, conversational workspace from both Create a Study and a selected scheduled study. It must understand which study is selected, distinguish conversation from proposed action, and never claim that an action occurred until the application confirms it.

## Current findings

- Create a Study mounts `GuidedStudyCowriter`, which can plan a series and create new studies.
- A selected study mounts `StudyCowriter`, a separate API and interface with a smaller response cap and no general edit or move actions. Its chat does not receive the saved study body.
- The scheduled-study error is not proof of a particular Azure failure: the deployed adapter collapses provider statuses. The local diagnostic patch must be deployed and exercised to identify the exact cause.
- Existing editor revision, KJV resolution, and study move services already enforce parts of the required lifecycle. Reuse them.

## Build

1. Give both entry points the same launcher, conversation layout, source handling, history, and explicit target context. The selected entry point starts with its church, study ID, date, title, revision, and status bound to the conversation. The unselected entry point can select a study by church date or title.
2. Add a tenant-scoped study locator that returns only studies the actor may edit. Resolve dates in the church timezone; show a disambiguation choice for zero or multiple matches. Never infer a target from model prose alone.
3. Add typed proposed actions: create series/study, edit study fields, attach verified KJV passage, and move study. A reply states what was found and what change is proposed. It must not state that a change was saved while it is merely proposed.
4. For edits, supply the exact current study revision and fields to the model. Accept only schema-validated, field-scoped patches. Show current versus proposed content and evidence; require explicit confirmation. Apply with revision and authorization checks, preserving existing review and publication rules.
5. For Scripture, resolve exact KJV text using the pinned corpus. A request to show the full verse must attach verified text to the selected study through existing revision rules; no model-written canonical quotations.
6. For moves, preview the source/destination date and affected approval and delivery state. Apply via the existing move service with its `If-Match` version and date-conflict checks.
7. Preserve create-series and multi-day generation. Moving from a selected study into new planning must be an explicit user choice and must not silently discard the target.
8. Replace generic provider errors with safe status, reason, and response-reference diagnostics. Never silently retry submitted inference. Preserve a failed user message and offer a deliberate retry or edit.
9. Add focused tests for both launchers, same action semantics, selected-study context, date selection, conflicts, permissions, KJV exact text, no-change-on-failure, and completed-action receipts. Run typecheck, lint, unit and integration suites, and a production build. Prepare backend and frontend images and a rollout/rollback handoff.

## Acceptance examples

- From the November 9 scheduled study: “Show the entire KJV passage in this study” returns a precise preview and, after confirmation, the updated November 9 study. It never starts a new series.
- From Create a Study: “Find the November 9 study and show its entire KJV passage” first resolves the target, then follows the same preview and confirm flow.
- “Move this study to November 12” previews the date and approval consequences; a collision gives a specific conflict and makes no change.
- “Create a new three-day series” follows the existing reviewed-source, plan, and confirmation workflow from either entry point.
- Provider output-limit and content-filter failures are distinguishable and include a safe reference when available.
