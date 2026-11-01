# Rebuild validation — November 1, 2026

Research-only validation. This report supersedes October31's active UI signoff. Old raw results remain only where byte/relevance checks justify a dated narrow use; they are not added to fresh UI totals. No application feature, dependency, provider connection or production change was implemented.

## Reassessment and preservation

The frozen baseline contains **106 files, including22Markdown documents**. The verified archive preserves every original byte. [Original-file dispositions](_audit/original-file-dispositions.json) records each baseline file's outcome, rationale and role-audit references; [complete changes](REBUILD_REPORT.md) lists modified/created/removed/retained files.

[Source preservation](evidence/application-source-preservation.json) freshly compares **215 application/build inputs and121prior-release inputs**, with no differences. The original source baseline is itself byte-preserved. [Artifact validation](evidence/artifact-validation.json) checks current local document links and decodes every current PNG/WebP. Archived ZIP content is historical, not part of current link/UI acceptance.

## Fresh engineering evidence

| Run | Result | What it proves / does not prove |
|---|---|---|
| [Extraction/identity/provenance rerun](evidence/engineering-rerun-20261101/engineering-spike-results.json) |28passed| Bounded synthetic DOCX/XLSX order/value/date/hostile-package and hash/ambiguity cases; not production Office/PDF/OCR interoperability |
| [Current-module URL and export rerun](evidence/engineering-rerun-20261101/engineering-runtime-results.json) |21passed| Current bounded URL/public-address cases and actual synthetic PNG export; no live website/channel/social integration |
| [New unified source/editor model](evidence/engineering-rerun-20261101/unified-model-results.json) |30passed| Mixed-batch names/states, scoped selection/lifecycle, budget, typed selected operations, semantic order versus placement, stale/undo/snapshot checks |
| Existing backend source-fetch/security tests |8passed| Mocked transport/source safeguards; not a complete security audit or live hostile-network test |

Commands and exact limitations are in [engineering validation](evidence/engineering-validation.md). The new model uses own in-memory structures and lexical retrieval. No Tiptap/ProseMirror/Lexical/Konva/Fabric engine, embedding/index service, OCR/transcription pipeline or provider account was installed/exercised. Provisional framework fit is documentary plus model evidence, not integrated-library feasibility proof.

## Fresh independent contributor review

[35checks passed](roles/evidence/contributor-rebuild-results.json), with no page errors/external requests; [peer report](roles/contributor-peer-review.md) includes actual independently inspected PNGs. These checks cover one Import, broad capability labels, ready-only context, processing/error rows, selected-range Apply/Undo, direct text editing/ribbon/insertion, same-document Write/Design, placement, order and research preview parity.

Failures were reproduced and corrected: URL-opened Import reopened after context selection; selected visual inspector retained previous values; assistant citations could be stale. A1366×768check found Apply below the fold. A visible **Review proposed change** entry now focuses the proposal and reveals Apply; this is an explicit review path, not a claim every control is initially visible or no scrolling is needed.

Research controls use sessionStorage and sample responses. Review remains a separate prototype page, not a finished in-editor conversation rail. Reply/new-cycle buttons change status text, not actual persisted review. Prepared decks/read-only captions do not prove fully editable deck authoring. Exact substring selection was established via DOM Range followed by the actual event handler, not an exhaustive native selection/IME test.

## Fresh independent member/media review

[13task groups passed](evidence/member-peer-review-results.json) in installed Edge155 using proper MIME preview3092, with stable artifact fingerprints, no page errors or external requests. [Member assessment](roles/church-member-assessment.md) separates source review, browser evidence and remaining gates.

The review covers shared reading content/order after edit and design moves; public-deck/private-draft separation; selected church/return context; default-off reminders; primary Read continuation; twelve responsive width scenarios; and real video playback behavior.

Actual media proof: muted inline video time advances without clicking Play; Pause freezes and Resume advances; decoded1280×720media and nine VTT cues; reduced-motion starts paused with voluntary playback; simulated autoplay-block and genuine aborted-media failures show useful alternatives. Sharing cancellation restores reading focus. [Correction log](evidence/member-review-corrections.json) records earlier focus, media-error classification, duplicated burned-in/VTT captions and generic-reader-title issues rather than erasing them.

This is a silent **research workflow recording**, made from scripted fictional prototype actions. It is not current-production footage, a continuous real AI session or measured generation speed. Native OS sharing, arbitrary multi-card subsets, real SMS/identity/People, screen readers,200%browser zoom and real church users were not tested.

## UX captures and role reconciliation

[Current browser checks](mockups/browser-validation.json), [keyboard checks](mockups/keyboard-focus-validation.json), [capture manifest](mockups/captures-manifest.json) and [image guide](mockups/README.md) describe the rebuilt source library, combined editor and actual media. All38original screen captures were retired and replaced with new named screens; no old separate-creator/manual-play image is used as current acceptance. Four square deck exports are regenerated; application reference WebPs are retained only after visual/hash review and are explicitly current-product references.

[UX assessment](roles/ux-assessment.md), [engineering peer review](roles/engineering-peer-review.md), [contributor peer review](roles/contributor-peer-review.md) and [member assessment](roles/church-member-assessment.md) document their actual review scopes. These are agent expert/heuristic perspectives, not recruited-human research or evidence of reduced task time.

## Retained approval proof

The original [approval roundtrip](evidence/approval-roundtrip.json) and [harness](evidence/approval-roundtrip.ts) are byte-identical to the archive and still relevant after all215source hashes matched. The original disposable-local-DB test demonstrated assignment/decision strings persist, author reads omit reviewer reason, unchanged revision resubmit fails409/23505, and a new revision can be resubmitted/approved. It also exercised named tenant/member/hash/ETag guards and cleanup, with no provider calls.

These are dated facts about unchanged current APIs. They are not a fix, not proof of a merged review rail and not a recommendation to make fake content edits. [Item7](items/07-approval-conversation.md) now proposes explicit review cycles, stable node/quote/revision anchors and protected visible history.

## Remaining implementation and release gates

- **Sources:** genuine enabled adapter corpus, scanning/jobs/storage, connector scopes/revocation, partial coverage/citations, grounded retrieval quality and real cost/latency.
- **Unified creator:** real rich-editor/layout integration, paste/IME/selection/history/conflicts, durable semantic/layout/assets, keyboard/touch/accessibility and exact preview/review/published reading parity.
- **Flexible media:** actual image/video provider quality, rights, alternatives, generation budgets, stale/cancel/retry and immutable publication.
- **Demo:** genuine accurate application recording, final audio/captions/descriptions, startup/transfer performance and real Safari/iOS/Android codecs/power settings.
- **Sharing:** persisted approved renditions, arbitrary member subset, stale/withdraw semantics, actual native target apps and recipient outcomes.
- **Access:** selected phone provider, owned-number delivery/recovery/abuse, safe account migration/enrollment and separately authorized People sync.
- **Approval:** protected history/cycle API and in-editor conversation implementation followed by fresh real session roundtrips.
- **Human validation:** contributors/approvers/members completing meaningful tasks and explaining the demo; no percentage efficiency or adoption claim from test counts.

The local preview is research only. Automatic approval review rejected stopping the old3091process, so it was left running; an isolated3092preview provides new MIME handling. No app process was stopped and no production operation was attempted.
