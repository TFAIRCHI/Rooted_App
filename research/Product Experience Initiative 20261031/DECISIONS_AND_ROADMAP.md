# Revised decisions and path forward — November 1

This is a research recommendation, not implementation authorization, a delivery estimate or a deployment plan already executed.

## Decisions replacing the earlier package

| Question | Decision | Why / necessary constraint |
|---|---|---|
| Source experience | Channel library with **one Import**, broad adapters and processed filenames/URLs | Reuse context without format-specific products; actual adapters remain gated |
| Merge CoWriter/Studio? | **Yes: Compose** with Write/Design views, one draft and assistant | Removes duplicate setup/handoff; internal specialist tools can still be bounded |
| How flexible? | Semantic rich document plus designed regions/artboards, layers and explicit reading order | Enables Word/Canva-style work while preserving phone/accessibility/publication integrity |
| Homepage demo? | Visible above fold on AI tab, muted inline autostart | Shows value immediately; pause, reduced-motion and blocked-play fallback remain necessary |
| Approval comments? | Visible conversation in same workspace; typed revision/cycle events | Demonstrated stored/read gap remains real after source-hash revalidation |
| Social? | Shared design primitives; separately approved exact public decks | Flexible creation does not make private source/draft material public |
| Phone/QR? | Preserve preferred phone-first; QR context can precede provider work | New creator UX does not solve identity linking or People permissions |

Google's preview enterprise source API makes delegation an option, not a default or a reason to claim all imports already exist. Framework comparisons are provisional until an actual candidate editor is integrated and tested; a synthetic operations model is not a Tiptap/Konva integration.

## Proposed delivery slices

### A. Shared workspace and visible feedback

Create Sources / Compose / Review / Share shell, one authoritative draft/save state, persistent revision and requested-change summary. Repair protected history reads and cycle-aware same-revision resubmission. Establish semantic content/layout contract and legacy migration strategy before coupling new editor widgets to old text fields.

Exit: contributor and approver find each other's actual notes in fresh sessions; same-revision response has valid new-cycle semantics; tenant/member guards and exact-hash approval hold. Navigation preserves dirty state/selection and recovers conflicts. Approval repair can ship independently of full design features.

### B. General source library with first real adapters

Ship the broad capability-driven Import interface and reusable channel rows from the start. Enable tested text/PDF/DOCX/CSV/pasted cells, then add PPTX/XLSX/web and staged OCR/audio/cloud connectors. Distinguish setup/planned/unsupported from processing success. Build source versions, jobs, indexing, permission-filtered retrieval and citation manifests.

Exit: mixed-batch import with named ready/error rows, no per-source wizard for ordinary success, correct citations and partial coverage, delete/reindex/revocation/duplicate/retry behavior and real privacy/cost tests. Broad product design does not imply unlimited support at release.

### C. Unified creator foundation, then design depth

Integrate a maintained rich editor and tested object-layout approach under the same document model. Deliver manual rich text, approved assets, source-grounded selected proposals, reorder/undo, layout templates and shared preview/member rendering. Then extend free positioning, layers/group/align/crop, reusable components and durable visual jobs.

Exit: save/reload a mixed study, switch Write/Design with no lost changes, apply/reject/undo selected proposals, resolve concurrent edits, review/publish exact content/layout/assets, and verify member reading order/mobile/legacy parity. Separate text/image/video budgets can exist behind one assistant. Do not wait for generated video to release useful editing.

### D. Demonstration and approved sharing

Autoplay player/layout can be built early in parallel; the final recording must match real product availability. Replace the research workflow video with an accurately labeled genuine application recording once the advertised flow works. Test startup/codec/performance, reduced motion, pause, blocked media and user comprehension.

Quote/Scripture decks may ship before advanced media generation, using exact public-rendition approval and shared design primitives. More complex visual decks depend on C. Test persisted exports, stale/withdraw rules, member opt-in, download/caption fallback and actual target devices.

### E. Member access and later church-system connections

QR/current-auth routing can proceed independently. Deliver true phone-first only after choosing an identity route and proving owned-number delivery, stable account links, recovery, household/recycled-number safeguards and abuse budgets. Planning Center People is separately authorized and reconciled; existing Publishing access is insufficient.

## Architectural decisions

One semantic draft owns text, node order, layout, source selection and version. Source library lifecycle is independent of study approval. Public rendition approval is separate from private full-study access. Source imports/asset jobs cannot approve/publish. Review replies do not resolve requests automatically. Number/name/directory matching cannot create identity/staff authority.

No automatic provider/model choice, commercial editor license, new cloud resource, schema migration or production release is authorized here.

## Before a build prompt

| Decision | Suggested default / owner |
|---|---|
| Source backend | Rooted-owned adapters/retrieval; evaluate Enterprise delegation only with product/engineering/privacy approval |
| Editor/tooling | Prototype semantic editor + object-layout candidate; verify open/paid terms and mobile/reading performance |
| First enabled adapters | Text/PDF/DOCX/CSV; product+engineering validate corpus and budgets before enabling |
| Layout versus member reading | Designed regions plus explicit semantic order; UX/member pilot signs off |
| Public assets | Dedicated author/reviewer capabilities, exact rendition and destination; church policy owner |
| Phone provider/enrollment | Managed identity evaluation, per-church open/approval/invitation policy; product/security/church |
| Autoplay release asset | Genuine current workflow recording, muted by default; product/UX approves accuracy and performance |

## Pilot measures and honest limits

Measure actual baseline before promising improvement: time/errors importing a mixed batch, switching writing/design, finding feedback and recovering save conflicts; faithful mobile reading; correct church/account; voluntary sharing; clear understanding of recorded versus live demo. Agent perspectives and local check counts do not prove adoption, spiritual impact or percentage time savings.

The roadmap remains open for product review. Research completes its own evidence package; provider integration, implementation and recruited-user pilots remain future work.
