# Guided Study Co-writer demo

Implemented October 24, 2026. Start the local application with `npm run dev` and open [Rooted](http://localhost:3000). The project-root `.env` supplies the existing Azure deployment; credentials stay on the backend.

1. Sign in as an authorized contributor and open **Create a Study**. Open the floating sparkle assistant, then open the **hamburger menu** in its banner. Choose **Plan studies** under Study tools if a day is already selected. Expand the assistant for more reading space.
2. Type your request in the blank message box and click **Send** or press **Enter**. **Shift+Enter** inserts a new line. Sending saves the private conversation and submits a model request; it does not open setup or require a series or source first.
3. Discuss the co-writer's questions and clarify the intention. Include sermon summary notes and passage references in the conversation. When ready, say **Create these now** or choose **Prepare the discussed study plan**. The co-writer converts the agreed conversation into a structured plan in the same chat; no menu setup is required. The source snapshot uses your messages, not assistant suggestions. The menu remains available for attaching a separate source or choosing an existing series.
4. Review the proposed intention, exact week, day count and audience. Ask for any adjustments. Once correct, review the captured notes, confirm permission to use them, and choose **Confirm understanding of my request**. This creates no study.
5. Review day 1's details and teaching direction. Discuss adjustments, choose **Review day 1 direction**, then **Confirm & create day 1**. Repeat this review and explicit creation confirmation for each remaining day; later days never start automatically. Each saved draft fills all seven normal editor fields. Reloading and selecting the conversation from menu history restores the current review step.
6. Review the saved content and use the existing Next/Back stages for Gain Approval and Publish Study. Conversation and workflow confirmation do not approve or publish anything.

## Current boundaries

The first release creates 1–7 new dates in one Sunday–Saturday church-local week, assigned to the requesting contributor. Creating a saved study requires reviewed source passages. A conversation-derived plan can create its own series inside the transaction that saves the first confirmed day; it does not require a preselected series. Occupied dates must be changed; existing studies are never batch-replaced. Reviewed text is supported; automatic video/audio transcription, web research, external tools, autonomous publication and additional model routing are deferred.

New requests create **one explicitly confirmed day at a time**. A failed day does not undo previously confirmed saved days and does not create future days. Retry applies only to the current confirmed day, reusing a complete staged result if database saving failed. An ambiguous provider submission is conservatively charged and is not automatically submitted again. Cancel stops pending work; an already submitted provider call may still incur tokens. Existing confirmed batch jobs from before this update retain their original behavior; unconfirmed old requests enter the new intent/day confirmation flow when reopened.

Runs, messages and sources are private to the contributor within their church. Runtime row policies and API checks enforce this; church administrators do not receive general access to another contributor's chat. Authorized privacy export/erase uses the existing privacy procedure. Private workflow content expires after 30 days and is scrubbed by the running worker. Explicit deletion also scrubs private content. Saved adopted studies remain normal church records, with hash provenance; numeric accounting remains. Existing backup retention still applies: an erase is not an immediate rewrite of backups.

The existing provider monthly cap applies (a new provider budget defaults to 200,000 tokens). Each workflow is capped at 100,000 reserved/used tokens and 12 attempts, with at most 12,000 conservatively estimated input and 3,000 output tokens per model step. The shared daily admission gate allows 30 calls per church and 100 across churches, with one active call per church. These are application controls, not an Azure billing guarantee. No new Azure service or hosted agent platform is required.

## Chat presentation

The same message box stays at the bottom before and after every response. Only the conversation above it scrolls. New replies follow the latest message when you are near the end; reading earlier messages does not force a jump. Enter sends and Shift+Enter inserts a newline throughout the conversation.

Progress, usage, cancellation/retry, deletion and detailed day editing are in the hamburger menu. Ordinary discussion stays a chat; compact intention/day review cards appear when there is a concrete proposal to confirm. You can keep discussing adjustments using the same message box. The layout uses the supplied Rovo example and [Atlassian's conversation guidance](https://support.atlassian.com/rovo/docs/accessing-chat/) as references while retaining Rooted's confirmation rules.

## Conversation history

Open the hamburger menu and use **Previous conversations** under Conversations in the planning assistant to reopen any retained planning conversation, read earlier messages and resume its review step. **New conversation** starts another request without deleting the current conversation. After all days are saved, you can continue asking questions; those replies cannot create or modify studies.

The selected-day assistant also has **Previous conversations** under Conversations in its hamburger menu for that study. Recommendations, study tools, transcript controls and privacy options also live in the menu; they do not appear on the initial canvas. It restores messages and the reviewed transcript. Starting another conversation, or confirming a different source, preserves earlier conversations. Histories remain church- and contributor-private, subject to their existing access periods: 30 days for planning and 7 days for ordinary selected-day chats. Explicit deletion and expiration still remove private content.

## Verified local examples

The actual Azure deployment generated one complete draft for **November 16, 2026**, then three complete drafts for **October 26, 28 and 30, 2026**. These synthetic examples are in the local demo church. All four drafts persisted across editor reloads; none was approved or published.

Those live examples verified the earlier batch behavior before the day-by-day follow-up. The new consent/history flow was verified with isolated database and browser tests using a mocked provider; no additional paid calls were made. The bounded live checks used **6 calls / 10,526 tokens**. [Live ledger](evidence/live-verification.json), [saved-draft checks](evidence/live-demo.json), and [execution report](evidence/execution.md) retain the technical evidence. Human theological review is still needed.

Normal `npm run dev` does not enable the verification ledger. `STUDY_WORKFLOW_VERIFICATION=1.2.12` is a special bounded verification mode, not a normal demo setting. The live verification script requires explicit `--run-live`; automated tests use isolated databases and a provider fixture with external services disabled. Do not repeat paid checks merely to view an already saved example.
