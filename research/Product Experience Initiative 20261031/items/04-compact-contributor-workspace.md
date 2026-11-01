# 4. Compact staff workspace — one creation task, predictable panels

**Revised navigation:** **Sources / Compose / Review / Share** around one selected study and draft. Inside Compose, **Write / Design** switch tools on the same content. The old CoWriter/Studio tabs and separate creation handoff are retired.

## Primary layout

A compact persistent row shows church/channel, study, saved/dirty/error state, revision and review status. Sources form a reusable channel library. Compose offers a document outline, useful editing canvas and one docked assistant/property/comment panel at a time. A visible request-changes summary opens the conversation without navigating away or hiding the selected text.

A Word-like ribbon groups writing/insert/design controls. Selection determines inspector tools; avoid displaying every property and all chat history simultaneously. A full preview has a named return action and preserves selection/focus. Long document content can scroll naturally. “All in one view” means task/control coherence, not clipping content, shrinking type or trapping three nested scrollers.

| Area | First useful view | Deliberate detail |
|---|---|---|
| Dashboard/calendar | Current week, review queue, next study | Open the selected workspace; do not inline every editor |
| Sources | Named entries, ready/processing/error, selection and Import | Source detail, coverage, refresh and connection setup |
| Compose Write | Editable document, outline and selected assistant tools | Source citations, prior prompts and full document reading |
| Compose Design | Same document/artboard, selected objects/properties | Layers, grouping, crop, layout and reading order |
| Review | Latest request/reply and associated selected passage | Older cycles, exact revision comparison and resolution authority |
| Share | Approved source snapshot and public-deck assets | Exact public rendition/caption/link and member preview |
| Settings | Task sections for brand/access/integrations/policy | Focused form with its own save/error state |

## Panels rather than required extra windows

Use an in-page inspector/drawer for focused details. Modals fit short Import/confirmation tasks with [WAI dialog behavior](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). Persistent authoring and unresolved feedback should not be buried in modal stacks. An optional multi-monitor pop-out could follow, but [Document Picture-in-Picture](https://developer.chrome.com/docs/web-platform/document-picture-in-picture/) is a specific capability, not a universal baseline.

On narrow screens collapse secondary panels into named views/drawers with a clear return. Keep the content and primary action readable. Hide tool complexity progressively, not required error messages or missing-feedback states. Member reading remains optimized for reading rather than a compressed staff dashboard.

## Shared state

One document store owns text, visuals, source selection, layout, selection and save history. Switching Write/Design, opening feedback or preview cannot create divergent copies. Routes restore supported study/task/node context and Back/Forward. Extend the current safe-return allowlist narrowly; do not allow arbitrary redirect URLs.

Persist selection/scroll deliberately; failed saves, concurrent edits and dirty navigation must offer recovery. Assistant proposals use base document versions. Review and source errors distinguish loading/failure/empty rather than implying “no feedback” or “no sources.”

## What was and was not demonstrated

New rendered screens and research interactions supersede prior compact-source/Studio images. Browser tests check bounded interaction, width and control visibility; see [validation](../VALIDATION.md). Dashboard/calendar/settings remain an information architecture proposal, not fully rebuilt application pages. No measured time-saving percentage follows from agent roles or screenshots.

Release gates: primary action/save/review status visible initially at 1366×768 and 1440×900; natural 320/390px growth and zoom; keyboard task/selection/move/preview return; save/conflict/reload/back handling; and real contributor comparison of finding sources, applying feedback and composing without a handoff.
