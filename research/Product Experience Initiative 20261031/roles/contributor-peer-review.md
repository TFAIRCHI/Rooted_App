# Contributor peer review — final November 1 rebuild pass

Research-only simulated contributor/administrator review. The [baseline archive](../_history/20261031-baseline.zip) preserves October 31's package and earlier peer review. Its three resolved visual findings were observations of that design; they are **not signoff on the rebuild**.

## Initial verdict

Proceed with one channel source library and one dynamic Compose workspace: one broad Import dialog, ready filename/URL rows selected as visible assistant context, directly editable rich document/artboard, context ribbon and docked selection-scoped assistant proposals with Apply and Undo. No required CoWriter→Studio handoff. The homepage AI tab must contain a visible automatically progressing demonstration with honest labeling, pause/mute and reduced-motion behavior.

The existing approval-history defect supports a concrete repair brief. Resolve repeated review cycles without fake content edits. Richer imports/editor/media, phone and public-deck services remain implementation/integration work.

## Retained evidence reassessed

The [document audit](contributor-document-audit.json) covers all **22 baseline Markdown files** with exact hash, excerpts and correction/disposition. All **215 application/build source hashes** match the October 31 baseline. Both original approval artifacts match archived hashes.

Retain their dated actual local API findings: assignment/decision notes persist; author reads omit decision reason; same-revision resubmit is 409/23505; changed-revision resubmit/approval succeeds; selected invalid-input/access guards pass; owned fixture cleanup was verified. No repeat DB test is warranted by a research-only design change. These results do not validate the new editor/review-cycle contract.

Earlier component/browser/capture counts retain their named old scope. No additional application test or provider call ran in this initial rebuild pass.

## Fresh review priorities sent to UX

| Priority | Required demonstration | Failure to catch |
| --- | --- | --- |
| 1 | One Import dialog and channel library with broad files/text/table/URL paths; ready/processing/error/reference-only rows differ | Four old primary source journeys relabeled; upload implying usable context |
| 2 | Selected ready filenames/URLs are actual docked assistant context | Generic source badge, selectable failures, private-channel leakage or stale versions |
| 3 | Directly editable rich document/artboard, meaningful selection, context ribbon, docked proposal, Apply and Undo | Static cards controlled only by inspector; separate disconnected verbal/visual editors |
| 4 | Reading/design share ordered content; AI adoption/reorder changes the same research model | Different preview prose or cosmetic outline-only reorder |
| 5 | Review rail beside selected teaching with original/current revision, cycles and persisted event story | Hidden notes, silently reassigned anchors, fake edit required to resubmit |
| 6 | Deck cites exact approved source/rendition distinct from current draft; voluntary member sharing | Draft layout change silently approving cards or modifying published output |
| 7 | Visible automatically progressing AI-tab demo with pause/replay and honest concept/recording label | Hidden click-only player or simulated output claimed as live product |
| 8 | Useful editable region/context/assistant controls at 1366×768; usable narrow-panel behavior | Chrome crowding content, obscured focus, competing scroll panes or lost edits |

## Independent rebuilt-control review actually performed

Executed the new [contributor research check](evidence/contributor-rebuild-check.mjs) against the standalone November 1 prototype at http://127.0.0.1:3091 using headless installed Microsoft Edge. The script permits requests only to that exact local origin; no application API, provider, account, upload, native sharing or clipboard action ran. All writes from the final helper are inside this initiative. [Machine-readable results](evidence/contributor-rebuild-results.json) include the prototype app hash, exact checks, screenshots and limits; old UI pass counts are not combined with these results.

Actual paths exercised: library with URL-opened Import, normal library, unified Compose reading/design, immersive preview, research member rendition, Review, default deck, approved-source deck and stale deck. Text range setup uses a DOM Range plus the actual mouseup handler; subsequent adoption/undo and the other controls use browser clicks, checkboxes and text/select/number inputs. This proves the research model's behavior, not natural pointer selection or real AI.

The first complete pass found two real prototype defects: closing URL-opened Import then toggling a context source reopened the dialog; selecting a different visual left the prior block's X/Y/width inspector values displayed. UX corrected both; independent regression checks confirm the corrections. Source citations were also corrected to follow selected context; the checked proposal no longer claimed the deselected DOCX. The [before-correction result](evidence/contributor-rebuild-before-corrections.json) preserves the failures. The final expanded run exited **0: 35 checks passed, zero page errors and zero external request attempts**. These are only the new contributor research checks, not an aggregate with retired tests.

| Observed control group | Actual observed result |
| --- | --- |
| Single Import and channel library | Broad file methods/formats with planned labels; mixed sample batch retains filenames; processing/failed rows disabled; selected URL is visible in library context and docked assistant after navigation |
| Selected-content assistant | Selecting a reflection range exposes scope; Apply replaces exactly that substring, leaves the other paragraph unchanged, and Undo restores the original; no CoWriter/Studio navigation occurs |
| Direct rich document | Typing updates the session model; ribbon bold changes the editable paragraph; Insert creates another editable text block |
| Design and reading modes | Same inserted content and ordered IDs persist between modes; corrected inspector reflects the selected visual; changing X moves that visual without changing logical order; Move up changes logical order |
| Immersive/member research rendering | All edited/reordered block IDs match the creator's logical sequence; edited reflection text appears in preview |
| Review context | Original r11 quote is preserved beside current edited r12 reflection; reply status leaves the request open; fresh-cycle status explicitly permits unchanged r12 and says no request/notification was sent |
| Deck boundary | Current changes-requested r12 offers no approval control; approved-source scenario explicitly binds r10 separately; stale deck exposes no approval action |

## Actual fresh images inspected

Opened the independently captured [Import](evidence/contributor-import.png), [Compose after direct edits/insertion](evidence/contributor-compose.png), [Design after placement/reorder](evidence/contributor-design.png), [Review context](evidence/contributor-review.png), [mixed-ready/error library](evidence/contributor-library.png), [approved-source deck](evidence/contributor-deck.png) and [1366×768 Compose first view](evidence/contributor-compose-first-view.png) using the image tool. These are new November 1 captures from actual browser actions, not archived October 31 screenshots. The one Import dialog and integrated editable document/assistant are visible; the design image shows freely overlapping placed blocks after deliberate test movement, so this is not an automatic polished-layout or collision-avoidance engine.

An added exact layout check at **1366×768** initially found Apply below the first viewport: top **913.8px**, bottom **955.8px** while scrolled to zero. UX added a visible **Review proposed change** entry in the assistant header instead of offering blind application before the proposal is read. The final independent check verifies that entry is in the first viewport, clicking it focuses the proposal and reveals Apply, and the actual [first-view PNG](evidence/contributor-compose-first-view.png) shows the entry beside the editable document. This resolves discoverability through an explicit one-step review path. Apply itself remains below the initial fold; do not claim literal no-scroll editing or that every control is immediately visible. [Pre-correction layout result](evidence/contributor-rebuild-before-action-entry.json) records the earlier failure.

## Tight limits and remaining integration requirements

- The library is a fixture/session model: no real DOCX/PDF/PPTX/Excel/OCR/transcription/web/caption adapter ran. Real selected context is represented in the UI, not sent to a model. Planned type labels are important truthful affordances.
- The assistant response is a sample, not live generation. The test proves selected-range application and undo, not request understanding, grounding quality, stale concurrent proposals or universal rich-text range correctness.
- Editor state is sessionStorage, not a backend draft/version/asset transaction. Placement and layers can overlap; crop/grouping and full layout tooling are explicitly planned. No actual image/video generation, durable media, accessibility or publication parity is established.
- Review remains a **separate research page**, not an in-editor review rail. Its reply/resubmit buttons change explanatory status; they do not persist a real conversation or fix the current API's cycle defect. The rail/selection-anchor proposal in item 7 remains implementation work.
- Deck screens preview prepared card templates and approval boundaries; they do not demonstrate fully editable deck authoring, a persisted export service or native member posting. The caption is read-only in this concept.
- This pass did not test the homepage video, mobile keyboard/screen-reader behavior, phone verification/recovery, People sync or real church usability. The root/other roles must cite their separately scoped rebuilt evidence.

Final feasibility: the rebuilt channel library and unified editable document/artboard successfully demonstrate the requested interaction direction without a CoWriter-to-Studio handoff. Accept those scoped research concepts and proceed with concrete API history/cycle repair plus staged implementation planning. Keep the review-rail, real editor/asset persistence, deck authoring and integration limits above explicit. Do not describe successful local research controls as delivery of the seven production features.

