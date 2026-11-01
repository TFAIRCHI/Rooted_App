# 5. One creator: writing, design and AI in the same document

**Revised decision: merge CoWriter and Studio.** Open **Compose**, use a Word-like document surface and Canva-like Design view, and ask one docked assistant for wording or visuals. Switching Write/Design changes tools; it does not create another draft or require a second creation process.

## A flexible environment

The old distinct Studio and mostly fixed blocks fall short of the requested flexibility. Start from blank, template, imported outline or existing draft. Mix direct editing, source-grounded AI and visual composition whenever useful.

[Word image positioning](https://support.microsoft.com/en-gb/word/wrap-text-and-move-pictures-in-word) informs inline/wrapped content and anchors. [Canva layers](https://www.canva.com/help/finding-and-arranging-layers/) and [group/alignment](https://www.canva.com/help/layer-group-align/) inform object selection/arrangement. These are interaction references, not proprietary editor embeddings or a promise of every feature.

| Area | Direct tools desired | Assistant in the same context |
|---|---|---|
| Write | Rich text, headings/lists/tables, selection, links, undo/redo and section outline | Draft from selected sources, revise selected words, adjust audience/tone |
| Insert | Images, quotes, callouts, diagrams, verified-data charts, audio/video references and reusable components | Propose visuals or placement; selected candidates require Apply |
| Arrange | Reorder/duplicate sections, drag or keyboard move, columns, wrap/align/resize/crop | Preview “put application before reflection” against exact nodes |
| Design | Page/artboard templates, typography/colors, position, layers/grouping, align/distribute and brand styles | Suggest a layout while preserving teaching and reading order |
| Inspect | Element properties, source/rights, alt text, data, captions and phone reading order | Identify missing support; never invent chart values |
| Review | Requests/replies, exact preview, changes and shared revision/save state | Help draft a response/edit; no approval or publication authority |

The prototype implements a bounded subset; its guide separates working research controls from labeled concept affordances. It is not a production Word/Canva replacement.

## One semantic document, two projections

Stable content node IDs and reading order sit beside layout data. **Write** flows as a rich document. **Design** uses page/artboard objects anchored to those same nodes. Text boxes, images, charts and grouped graphics can be positioned inside designed regions; visual layering is distinct from reading order.

An editable outline defines what phones, screen readers and narration read. Desktop overlaps can become stacked phone content, previewed before approval. Keep selectable/resizable text, accessible descriptions and chart data. Do not flatten the study into screenshots. Generated backgrounds can be raster; Scripture/quote text and chart labels/values should render deterministically from reviewed data.

## AI proposals and integrity

The assistant knows the active study, selection, included source versions and base document version. It proposes text, insert, reorder, style or media jobs. Show a highlighted candidate/before-after with **Apply selected changes**, Reject and Undo. Simple manual formatting can apply directly; teaching/media proposals require clear selection. Manual creation always remains possible.

Atomic operations target a base version; late generation cannot overwrite new edits. Source changes, captions, informative alternatives, crops, content order and meaning-changing layout invalidate relevant approval. Keep approved snapshots immutable. A single user experience can use separate internal text/image/data/video tools with bounded policies and costs—no forced product handoff.

## Framework route and sequencing

Use a maintained semantic rich editor, not a production editor built from generic contenteditable. Compare ProseMirror/Tiptap and Lexical for schema/selection/history/accessibility/licensing. Evaluate Konva/Fabric or another object-canvas layer for designed regions; canvas alone does not solve text semantics or member rendering. Engineering compares these from official sources and names license gates in [technical feasibility](../architecture/technical-feasibility.md). No editor libraries were installed or integrated in this research.

First establish shared state, rich text, approved asset insertion, reorder/undo, deterministic layout and one preview/member renderer. Then extend positioning/layers/grouping and durable source-grounded visual jobs. Generated video can follow without delaying useful authoring.

Current source evidence remains a strict text contract, Markdown/object-URL toolbar previews and fixed reader sections. A schema version, legacy adapter, durable assets and approval/renderer integration are substantial work. Do not hide document JSON in body text or reinterpret old hashes.

## Acceptance

Save/reload a rich document with positioned image, diagram, chart and optional clip. Move application earlier, undo, and compare Write/Design/preview/review/published reading. Test selection, paste, serialization, long documents, multi-selection/group/layers, keyboard, zoom/phone reflow and screen-reader order. Exercise concurrent edits, late AI jobs, unknown nodes, private assets and removed media; compare legacy studies unchanged. Real media providers require separate rights/quality/latency/cost tests.

**Feasibility:** the unified interaction and semantic/layout model are credible and locally explored. Full editor integration, durable assets, live generation and production publication remain unimplemented. See [mockups](../mockups/README.md) and [validation](../VALIDATION.md).
