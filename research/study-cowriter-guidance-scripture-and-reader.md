# Study Co-Writer guidance, Scripture, and reader: research and recommendation

Status: proposed for review, 2026-11-08. No implementation is authorized by this document.

## Requested outcome

An administrator can set church-wide Study Co-Writer guidance, including teaching principles and KJV wording preferences. **KJV is the only translation in this build.** A contributor can discuss a new series, add a source such as a sermon outline or story, review the proposed direction, and create the series and its studies without first creating a series elsewhere. A published study displays the complete KJV text of each selected Scripture verse and a single, cited, italic verse in a reading-side quote.

## What the application does today

| Area | Current code and behavior | Gap |
| --- | --- | --- |
| AI Assistance | `frontend/components/settings-integrations.tsx` already has one 8,000-character “Assistance profile and biblical guidance” field plus a manually entered profile version. `backend/src/api/provider-routes.ts` stores both in `provider_budgets`. `backend/src/modules/study-workflows.ts` snapshots the profile and hash at workflow creation. | The field is broad and does not give an administrator a clear, structured place for doctrine, translation, or reusable writing guidance. Later edits invalidate an in-progress workflow, which needs a clear UX. |
| Scripture | `backend/src/integrations/study-workflow.ts` expressly says “Do not quote Scripture.” `backend/contracts/payloads.ts` stores references but has no verse-text field. `backend/src/integrations/scripture.ts` has an exact-text verification primitive, but no connected authorized text catalog. | The model can suggest references, while the published study cannot reliably show exact verse text. |
| Reader | `frontend/components/member-study-reader.tsx` renders a Scripture card from references. It hardcodes a John 6:68–69 example; other passages appear as references or generic reading guidance. The left rail in `frontend/app/member-study.css` is already sticky section navigation. | Scripture text is usually absent and the requested single verse quote is absent. The hardcoded example is not a general or verified solution. |
| Series | `backend/src/api/study-workflow-routes.ts` requires `seriesId` for source-based create/setup. `frontend/components/guided-study-cowriter.tsx` blocks a sourced first message without one and disables the setup form without one. The conversation path can omit `seriesId`; `backend/src/modules/study-workflows.ts` creates a series on first draft save if conversation notes were reviewed. | Behavior depends on how the conversation started. An attached document triggers “choose a series,” while plain conversation may create one later. The menu has no explicit “Create new series” action or clear series preview. |
| Story grounding | `prepareWorkflowRequest` truncates source text to its first 4,000 characters. The day prompt asks for a complete devotional, but has no explicit requirement to retell an identified story or verify its sequence and details. | A story further into an article may be missing from the model context; generic devotional language can discuss the story’s usefulness without actually explaining what happened. |

## Recommendation

### 1. Church teaching guidance

Add a **Study Co-Writer defaults** area in AI Assistance with explicit fields: doctrinal/denominational principles, interpretation boundaries or topics requiring pastoral review, KJV edition/source information, preferred voice/depth, and optional standing instructions. Show KJV as the fixed Scripture translation for this release. Keep the existing monthly budget and provider configuration. Treat these as church-managed *teaching guidance* for the model, not executable system instructions or a mechanism to override source, rights, approval, or safety rules. Only `settings:manage` can edit them; contributors can see the active version in the Co-Writer.

Store an immutable revision/version and audit who changed it. Snapshot the active guidance into each new conversation and display which version is in use. For an existing conversation, present “start a new conversation with updated guidance” or an explicit rebase/review action; never silently reinterpret an approved plan. Study-specific directions may refine the church defaults, while conflicts are surfaced for human review. Requests for another translation should remain reference-only and clearly say KJV is the sole full-text option in this release.

The existing free-text `profile` can migrate into standing guidance, preserving its version and history. Keep a compatibility reader for legacy records and roll out the new fields additively.

### 2. Authorized Scripture text and full reading

Separate reference selection, exact verse retrieval, and study prose generation. Resolve selected KJV verse ranges from one vetted source keyed by canonical reference, edition, verse number, and text digest. Use that source for model context and deterministic display; the model must not author or paraphrase the canonical verse block. Pin the verified text and provenance to the approved study so later source updates do not silently rewrite it. Render the full selected passage with verse numbers. Each selected verse should be complete; never cut a verse in the middle for display. Distinguish contextual passages from those selected for the study’s “Today’s Scripture” section so the reader is not flooded with every reference the model saw.

**KJV rights and source findings (checked 2026-11-08):** [Tyndale describes KJV text as public domain](https://tyndalechristianresources.tyndale.com/permissions), while [Cambridge administers Authorized Version rights in the UK](https://www.cambridge.org/us/rights-and-permissions) and offers a [Bible permissions request](https://www.cambridge.org/sites/default/files/media/documents/Bibles%20Request%20Form%20-%20Permissions.pdf). [API.Bible lists KJV as open access](https://www.api.bible/bibles). The build needs to choose and verify an exact KJV text/edition, exclude publisher-owned notes and formatting, and establish the UK distribution position before enabling full text globally.

If the KJV source or territory review is incomplete, show an actionable reference-only state; never substitute another translation or model-generated text. Human review still checks whether the selected passage and interpretation are appropriate. For an unusually long range, ask the contributor to select the study's primary reading rather than automatically displaying every contextual reference. Include exact KJV text in audio only after verifying the selected source's permitted use and the reader's audio behavior.

### 3. Reader quote

Add one `featuredVerse` selected from the same verified passage snapshot. Show the exact verse text in italics inside a semantic quote, with a visible citation including book, chapter, verse, translation, and edition where required. On wide screens, place it in a sticky rail beside the article without obscuring the current section navigation or study content. On narrow screens, place it in reading order near “Today’s Scripture,” with no sticky overlay. A study with no verified verse uses a reference-only state, never the existing John 6 hardcode. The full passage remains in the main Scripture card; the side quote is one verse, not a replacement. Test keyboard, screen reader order, large text, reduced motion, and long verses.

### 4. Conversation-first series creation

Make “Create new series from this conversation” a visible option in the Co-Writer menu and the setup/confirmation path. Keep “Use existing series” as the other option. The AI may suggest title, theme, date range, and progression from the discussion; the contributor reviews these before committing. Source attachment should work before a series exists, with the same source and rights review already required elsewhere. The backend should accept an explicit `createNewSeries` intent or existing `seriesId`, validate that exactly one is chosen, and create the series transactionally and idempotently only after the existing confirmation gates. Never create a duplicate series on retry or on a failed study save. Show the created series in the result and navigation.

The existing auto-create branch should be consolidated with this explicit intent, including sourced conversations. Preserve the requirement for passage grounding, plan review, per-day confirmation, tenant isolation, and `series:manage` permission.

### 5. Story-specific generation

When the contributor asks to explain a supplied story, capture that as an explicit output objective in the plan: *retell and explain the story itself*. Extract or select the relevant source span from the entire approved source before generation, not only the first 4,000 characters. The day prompt should require a grounded narrative section that covers who, what, where/when if supplied, the sequence, and the outcome; it may then connect the story to the teaching point. It must not invent missing details. Avoid generic prose about “why this story was included” unless the contributor asks for that analysis. Show the contributor the selected excerpt and source reference during review, and allow them to correct the selection. For outside articles, paraphrase in original wording and preserve attribution/rights review; do not publish a copied article body by default.

## Migration and delivery order

1. Add church guidance storage, permissions, API, settings UI, versioning, and legacy migration.
2. Add a vetted KJV Scripture source plus exact-text validation and an additive study payload revision. Wire composer review and publication checks before changing reader rendering.
3. Make both Co-Writer entry paths support reviewed, explicit series creation, then remove the inconsistent series requirement.
4. Add source-span selection and story fidelity checks to planning and day generation.
5. Render full passages and featured verse in public and preview reading, with responsive/accessibility tests.
6. Run targeted unit, integration, browser, migration, and rollback checks. Produce a deployment handoff; do not deploy from this plan.

## Decisions to confirm during build review

- KJV is the sole full-text translation in this build. Select a source/edition and resolve UK distribution rights before global full-text release. Other translations are future work and should not be surfaced as unfinished choices in this UI.
- Whether church guidance applies to all AI proposals or only the Study Co-Writer. Recommendation: apply the teaching guidance across study-related assistance, with the same version snapshot.
- Whether a new series is created at final plan confirmation or first approved day save. Recommendation: first approved day save in the existing atomic transaction, with a clear preview and explicit consent before that step.

## Evidence of completion to require

- A new church can set guidance, see the active version, and generate a draft that follows it without overriding hard constraints.
- A selected multi-verse KJV passage displays every complete, exact verse with correct citation; a non-KJV request remains reference-only.
- The reader shows one verse in an italic side quote on desktop and in reading order on mobile; legacy studies remain readable.
- A new conversation with and without a document creates a new series after review, and retries do not duplicate it.
- A synthetic article with a story after character 4,000 yields a draft that retells the story accurately and is flagged if details are unsupported.
