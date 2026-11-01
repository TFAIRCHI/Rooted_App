# Product Experience Initiative — rebuilt November 1, 2026

**Research only.** The entire October31 package was reassessed against your four corrections, including all original documents, mockup images, helpers and evidence. Application code, dependencies, configuration and production were not changed.

[Open the rebuilt interactive mockups](http://127.0.0.1:3092/) · [Visual guide](mockups/README.md) · [Complete file-change analysis](REBUILD_REPORT.md) · [Proposed path forward](DECISIONS_AND_ROADMAP.md)

## The revised product

1. **One channel source library and Import.** Files, links, pasted material and future cloud connections share one entry. Actual names/URLs remain visible through processing, ready and error states. Broad source families are represented with honest capability/setup status; ordinary success does not create a per-file wizard.
2. **CoWriter and Studio merge into Compose.** Write and Design are two views of one document, with the assistant, sources and feedback beside the work. No required verbal-to-visual handoff or second draft.
3. **Word/Canva-style flexibility.** Rich document editing, insertion, direct manipulation, layout/layers and explicit reading order form the proposed environment. The research prototype exercises a subset; full editor integration and advanced grouping/crop remain future gates.
4. **Homepage AI-tab demo starts immediately.** A visible local recording autoplays muted inline, with Pause, caption/transcript treatment and reduced-motion/blocked-media alternatives. It is labeled a research workflow recording, not a live or genuine production AI session.

NotebookLM is a useful interaction reference. Research also found a preview Enterprise source API; the architecture compares it with Rooted-owned adapters instead of assuming it either does not exist or supplies automatic consumer integration. See [primary sources](SOURCES.md).

## Review the new images

| Experience | Actual rendered PNG |
|---|---|
| Channel library with processed source names | [Source library](mockups/captures/01-channel-source-library.png) |
| One broad import location | [Import](mockups/captures/02-single-import-files.png) |
| Combined writing and assistant | [Compose](mockups/captures/08-unified-compose-reading.png) |
| Dynamic visual authoring in the same workspace | [Design view](mockups/captures/10-compose-design-artboard.png) |
| Selected text/AI proposal | [Selection and proposal](mockups/captures/09-selected-ai-proposal.png) |
| Visible approval conversation | [Review](mockups/captures/14-review-conversation.png) |
| Homepage AI tab, demo immediately visible | [Autoplay demo](mockups/captures/31-homepage-video-first-view.png) |
| Phone treatment | [Demo on phone](mockups/captures/32-homepage-video-phone.png) |

The [mockup guide](mockups/README.md) covers every current capture, working research interaction and concept-only affordance. The [actual WebM](mockups/media/studio-workflow.webm) records scripted fictional research UI actions; production recording/provider generation was not performed.

## All seven items reassessed

| Item | Revised direction |
|---|---|
| [1. Sources](items/01-cowriter-context-inputs.md) | General channel library, capability registry, async processing, versioned retrieval/citations |
| [2. Social sharing](items/02-social-sharing.md) | Reuse Compose design primitives; exact separately approved public decks and member opt-in |
| [3. Homepage demonstration](items/03-real-cowriter-demonstration.md) | Above-fold muted autostart, truthful recording, playback/preferences/fallback behavior |
| [4. Staff workspace](items/04-compact-contributor-workspace.md) | Sources / Compose / Review / Share; one state, contextual panels and compact primary actions |
| [5. Flexible creator](items/05-studio-creator.md) | One semantic rich document plus design/layout projections, selected AI operations and undo |
| [6. Member access](items/06-member-access.md) | Preferred phone entry, QR return context and stable identity; provider/People work remains conditional |
| [7. Approval conversation](items/07-approval-conversation.md) | Visible revision/cycle-anchored feedback in the shared workspace; no fake-edit resubmission workaround |

## Architecture, role review and evidence

[Rebuilt architecture](architecture/README.md) · [Technical feasibility and framework choices](architecture/technical-feasibility.md) · [Charter](RESEARCH_CHARTER.md) · [Validation](VALIDATION.md)

The requested [contributor](roles/contributor-assessment.md), [UX specialist](roles/ux-assessment.md), [data engineer](roles/data-engineer-assessment.md) and [church member](roles/church-member-assessment.md) revisited the proposal and performed independent bounded review. They are agent perspectives, not recruited church-user research. [Contributor peer review](roles/contributor-peer-review.md) distinguishes actual control checks from future integration. Historical approval/API proof is retained only after source/hash relevance checks; old UI verdicts are superseded.

Fresh engineering checks cover extraction, defended URL handling and a source/editor operations model. Fresh prototype tests cover named interactions, responsive layouts, keyboard/focus and video behavior. They do not prove real adapters, installed rich-editor engines, durable media/publication, native social posting, SMS/People integration or human time savings. [Validation](VALIDATION.md) states exact limits.

## Audit and local preview

The [rebuild report](REBUILD_REPORT.md) lists **every modified, created, removed and retained file**, with before/after hashes in the [machine inventory](_audit/change-inventory.json). All106original files are recoverable in the verified [_history ZIP](_history/20261031-baseline.zip). Superseded images are removed from the active image set.

The preview on3092 serves research files only. To start it again if necessary:

~~~powershell
$env:RESEARCH_PREVIEW_PORT = '3092'
node "research/Product Experience Initiative 20261031/mockups/serve.mjs"
~~~

The original3091preview was left running after automatic approval review rejected stopping it; a separate3092process provides updated video MIME handling. No application process was stopped. This is a reviewable research package, not a production build.
