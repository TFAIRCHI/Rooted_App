# Build prompt: church guidance, exact Scripture, reader quote, and conversation-first series

Status: **approved and implemented in the local workspace on 2026-11-08**. See the [deployment handoff](../../deploy/azure/study-cowriter-kjv-release-20261108.md) for test evidence, image IDs, and rollout order. Read [the research and recommendation](../../research/study-cowriter-guidance-scripture-and-reader.md) for the design rationale.

## Goal

Implement the five requested Study Co-Writer and reader changes end to end, with **KJV as the only full-text Bible translation**. Preserve church isolation, existing plan/day confirmation, approval and publication workflow, source rights, and existing published studies. Produce tested code and a deployment handoff. Do not deploy production or alter live provider credentials as part of implementation unless separately authorized.

## Functional requirements

### A. AI Assistance defaults

1. In the existing AI Assistance settings view, provide church-managed fields for denominational/biblical principles, doctrinal boundaries and topics requiring review, KJV source/edition information, teaching voice/depth, and optional standing instructions. Show KJV as the fixed full-text translation for this release; do not present other translations as selectable full-text options. Write user-facing labels and examples that explain how each affects drafts. Keep budget/provider controls intact.
2. Enforce `settings:manage` for writes and appropriate church read permissions for use. Validate bounded lengths and safe text server-side. Make saves versioned, immutable/audited, and church scoped. Migrate `provider_budgets.profile` / `profile_version` into the new structure without losing existing guidance; continue reading legacy data during rollout.
3. Snapshot guidance at conversation creation and bind its version/hash to generated proposals and confirmations. Display the active snapshot to the contributor. If guidance changes during an active workflow, require an explicit rebase/review or a fresh workflow; present this clearly. Apply it consistently to guided Co-Writer and other study assistance paths that use the church profile. User text remains data and cannot override permission, verification, rights, or approval rules.

### B. Exact Scripture pipeline

1. Implement a vetted **KJV-only** verse source and resolver. Include canonical reference parsing/ranges, edition, ordered verse text, provenance, digest, and attribution. Verify the exact source text and exclude publisher-owned notes/formatting. Confirm the UK Authorized Version rights position before enabling global full-text display. Do not add adapters, settings choices, or feature flags for other translations in this build.
2. Before drafting, identify which passages are primary study readings and which are context. Give the model exact KJV verse text from the vetted source as bounded context, plus references, and keep the instruction against quoting from memory. The model writes exposition; the server supplies canonical verse text for display.
3. Add a structured, additive KJV scripture-reading field to content schema, revisions, composer, public DTO, and audio text where appropriate. Include full text of each selected verse, verse numbers, exact citation, edition, and provenance. Add a `featuredVerse` reference/index restricted to exactly one verse in that verified reading. Prefer a schema version bump or backward-compatible optional field with explicit validation and migration plan; never change old revision hashes in place. Pin the exact approved KJV text so subsequent source updates cannot silently rewrite published studies.
4. Make contributor review show exact passage text, KJV edition, attribution, and selected featured verse. Reject mismatched, truncated, or AI-authored quotations at save/approval/publication. For a non-KJV request or unresolved KJV source/territory issue, show a useful reference-only state. Keep legacy reference-only reading available.
5. Remove the hardcoded John 6 verse from the reader. Render full selected readings in “Today’s Scripture” and one italic semantic featured-verse quote in a side rail on desktop. On mobile, place the quote within normal document order. Keep the existing section navigation and interactions usable. Cite passage location and translation visibly. Handle long verses, empty/legacy payloads, keyboard access, screen-reader order, audio rights, and print behavior.

### C. Series from conversation

1. In `guided-study-cowriter.tsx`, add a clear “Create new series from this conversation” action in the hamburger menu and use the same choice in the planning setup. Keep “Use existing series” available. Show the AI-suggested title/theme/dates and allow contributor edits before confirmation.
2. Update both source-based create/setup endpoints and the plain conversation route to accept one explicit series destination: existing `seriesId` **or** `createNewSeries`. Permit an attachment and reviewed source before a series exists. Unify the backend paths so both lead through the same source/plan/intent/day review gates.
3. On the first explicitly confirmed study save, create the series and study drafts in one transaction with idempotency, church scope, permission checks, and no orphan/duplicate series on failure or retry. Return the new `seriesId` and show a link to the series. Never create a series merely by chatting or attaching a file.

### D. Story fidelity

1. Stop using the first 4,000 characters as the only source context for long documents. Select bounded, relevant source spans from the entire reviewed text, store span IDs/hashes, and show the chosen story excerpt for contributor review. Keep token and cost limits; reject or ask for a narrower selection when the story cannot be found reliably.
2. Add explicit plan intent for requests to explain a story. The generated study should retell the actual events in order with detail supported by the source, then explain the biblical/teaching connection. Do not replace the retelling with meta-commentary on the story's value. Avoid invented specifics and expose uncertainty for review. Preserve source attribution and copyright/permission checks.
3. Add deterministic grounding checks for cited source spans and evaluator-style fixtures for answer relevance. A prompt change alone is insufficient. Ensure a contributor can revise the story objective in the plan.

## Implementation sequence

1. Inspect current schemas, migrations, routes, model adapters, public DTOs, settings, composer, and reader; identify all consumers. Read applicable `AGENTS.md` and local framework docs before coding.
2. Add additive database migrations and contracts for guidance, verse evidence, scripture reading/featured verse, and explicit series intent. Keep existing data readable.
3. Implement API/domain logic and deterministic validation. Then update model context/prompt and UI.
4. Update preview and public reader with responsive styling. Replace the hardcoded Scripture branch.
5. Test and document rollout, feature flags where warranted, rollback, and data compatibility. Do not publish or deploy until a separate release instruction.

## Required acceptance tests

| Area | Verify |
| --- | --- |
| Guidance | Church A guidance cannot affect Church B; unauthorized write fails; existing profile migrates; saved conversation uses its pinned version; changing guidance triggers an explicit review path. |
| Scripture | Correct KJV multi-verse order/text/citation and selected single quote; source digest mismatch, partial verse, wrong edition, and non-KJV exact-text requests fail closed; legacy reference-only studies still render. |
| Series | New conversation and sourced/document conversation both create a series after confirmation; existing series remains selectable; cancel/failure does not create one; concurrent/replayed requests create exactly one. |
| Story | Source story located after character 4,000 is selected; generated narrative states supported events in order; meta-commentary-only and fabricated-fact drafts fail review/evaluation. |
| Reader | Desktop sticky quote, mobile in-flow quote, screen-reader citation, keyboard focus, no overlap at zoom/large text, and permitted audio text. |
| Release | Relevant unit/integration/browser suites and type checks pass; migration up/down or safe rollback tested; deployment handoff includes image tags/digests if images are built, required config, migration order, smoke checks, and known risks. |

Use only synthetic or rights-cleared test passages and stories. Do not call live AI or publish a test study unless explicitly authorized. Record exact commands and results in an implementation evidence document. If KJV source verification or UK distribution rights remain unresolved, implement the safe reference-only state, document the blocker, and do not claim global full-text completion. Recheck [KJV source availability](https://www.api.bible/bibles), [Tyndale's public-domain description](https://tyndalechristianresources.tyndale.com/permissions), and [Cambridge's UK rights process](https://www.cambridge.org/us/rights-and-permissions) before release.
