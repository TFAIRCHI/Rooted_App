# Contributor and administrator assessment — rebuilt direction

November 1, 2026. Research only. This role simulates church contributors/administrators; no church staff were interviewed or observed. All seven initiatives have been reassessed. The [baseline archive](../_history/20261031-baseline.zip) preserves the earlier package; its separate CoWriter/Studio journey and visual signoff are superseded.

## Working recommendation

Use **one channel source library and one Compose workspace**. One Import dialog accepts many kinds of material. Identifiable filename/URL rows show processing, ready, error, reference-only and inclusion states. Selected ready sources become visible context beside the docked assistant. In Compose, the contributor edits a rich document/artboard directly while the assistant proposes changes to selected text, blocks or layout. Writing, arrangement, visual generation, commenting and review share one document and save state. There is no required writing-to-visual handoff.

Teaching review, public-deck approval, member sharing and member sign-in remain distinct authority boundaries, shown when relevant without fragmenting authoring. Engineering can stage adapters and editor capabilities internally without recreating separate authoring journeys. Prioritize the real approval-history/cycle defect alongside the unified editor/source contract; homepage demonstration and phone/QR planning can advance independently.

## Current-source evidence reassessed

Today's separate guided and per-study CoWriter surfaces mostly accept reviewed text/TXT, with an existing reviewed-library path. Those are starting points, not the target architecture. [guided-study-cowriter.tsx](../../../frontend/components/guided-study-cowriter.tsx:17), [study-cowriter.tsx](../../../frontend/components/study-cowriter.tsx:103).

The current content contract is text-based; composer media actions insert Markdown-like strings or local-only previews, while the member reader/phone preview render text. A dynamic creator needs real editor transactions, structured content/layout, durable media and shared rendering. [study-composer.tsx](../../../frontend/components/study-composer.tsx:90), [member-study-reader.tsx](../../../frontend/components/member-study-reader.tsx:44), [contracts.ts](../../../frontend/lib/generated/contracts.ts:5).

Administrator review/publication grants do not automatically grant text authoring; define editor/deck/media operations by capability. [onboarding-routes.ts](../../../backend/src/api/onboarding-routes.ts:22). Assignment/decision notes persist, but author reads omit the decision reason and same-revision resubmission conflicts. [Item 7](../items/07-approval-conversation.md).

November 1's [audit](contributor-document-audit.json) compares all **215 application/build-file hashes** to the original source baseline: all unchanged. Both original approval artifact hashes also match the archive. Current-source findings remain relevant; the revised interaction model remains unimplemented.

## 1. Channel library, one Import dialog, embedded context

The primary path is **Import → library row → ready selection → assistant context**. The dialog supports multiple files, pasted text/cells and URLs without requiring four separate type-specific journeys. Use a broad format taxonomy: documents (Word/PDF/text), web links, YouTube/media references or supported transcripts/audio, and spreadsheets/tables. Additional formats shown must be labeled supported, planned or reference-only accurately. Naming a format does not establish parser/provider support.

Rows identify filename or recognizable URL/title, kind, channel/scope, processing/error/ready state and inclusion. Processing, failed and reference-only material cannot silently become selected teaching evidence. A row inspector supplies extracted coverage, omissions, selected ranges and immutable version; manual confirmation appears when policy/uncertainty requires it. The simple Import surface can still use type-specific adapters internally.

| Required input | Contributor-visible proof | Recovery |
| --- | --- | --- |
| DOCX | Ordered paragraphs/headings/tables, original filename and version | Explain unsupported/locked/embedded material; paste text or choose another file |
| Website URL | Captured URL/title/time and selected article text | Actionable inaccessible/dynamic/disallowed-host error; retry/paste fallback |
| YouTube URL | Reference versus usable authorized transcript, language/time coverage | Keep unavailable transcript as reference-only/error; authorized transcript upload/paste |
| Excel/pasted cells | Sheet/range, headers/units, dates and formula/cached/missing values | Select smaller supported range or paste table; no invented values |

Acceptance: mixed-batch import yields one identifiable row per item, with safe retry; only ready sources can be included; embedded filenames/URLs match actual selected IDs/versions; citations resolve to those versions. Changed/removed context marks waiting proposals stale. Large libraries use bounded coverage/retrieval rather than implying every file was read fully. Deselecting changes the next request, not an approved study. Channel/private authorization precedes ranking; channel UI must not broaden private import access.

## 2. Branded decks within the same creator

Choose deck/artboard output or a deck inspector in Compose using the same teaching/assets. Authorized contributors/admins can edit quote, Scripture, image/diagram and verified-data chart cards, reorder and preview church + Rooted branding. The docked assistant can propose words or layout in place; no export-and-restart authoring handoff.

Public-deck review stays separate because excerpts, crops, captions and audiences can change meaning. Pin source study revision, ordered card bytes/text/assets/crops, brand/template/renderer version, caption and destination. Approved source r10 may supply a deck while current draft r12 is being edited; display that relationship. Assign explicit create/edit, independent review, enable-sharing and withdraw capabilities.

Acceptance: prepare a quote/Scripture/chart set in the creator; save/reload it; independently approve the exact rendition; enable it on a published study. Members choose card(s), cancel, download/share voluntarily. Public exports omit private member activity and internal review notes. Scripture attribution/chart data/units remain legible. Withdrawal blocks future delivery while explaining downloaded copies cannot be recalled. Native-device sharing remains a future test.

## 3. Visible autoplay demonstration in the homepage AI tab

The demonstration must be visible and automatically progress when the homepage **AI tab** is active. Show selected channel sources, selected document content, a concrete assistant request, inspectable proposal, Apply, Undo/revision and the saved/reviewable outcome. Do not reenact the superseded writing-to-visual handoff.

Autoplay is muted and pauseable with visible controls and a transcript/text alternative. Reduced-motion preference has an appropriate paused/static equivalent; inactive/offscreen progression follows the explicit playback policy. Label concept, captured replay or genuine recording honestly. No visitor model/paid generation is triggered. Today's product recording can show current capabilities but cannot claim the future combined editor already exists.

Acceptance: AI tab immediately exposes permitted automatic progression; pause/resume/replay work; source selection → scoped proposal → document change is legible at desktop/mobile widths; no autoplay sound or keyboard trap. Genuine recording, media hosting/performance and real-staff comprehension remain separate proof gates.

## 4. Compact working layout without fragmented tasks

One compact context header identifies channel/church, study/date, revision/save state and unresolved-review entry. The editable document/artboard owns the main region. Library/outline, docked assistant and review/properties inspectors are contextual panels, not a mandatory sequence of Sources, CoWriter, Studio and Review pages. A context-aware ribbon follows text/image/chart/page selection.

Acceptance at 1366×768: saved/review context, editable document region, selected-context entry and assistant action entry are visible without initial scrolling. An explicit first-view “Review proposed change” entry may focus/reveal the proposal and Apply, so authors inspect the change before applying it; this is not a claim that every control is above the fold. At 390/320px, panels become deliberate drawers/flow without horizontal page overflow or competing nested scrollers. Changing panel/mode/source retains dirty edits, selection/anchor and proposal state. One authoritative draft handles navigation and conflicts. Time/scroll improvement requires a future real baseline and human comparison.

## 5. One dynamic document/artboard creator with docked AI

Click/type into the document; select a range/block; use text/paragraph/page/image controls; resize/layout visuals; reorder with pointer or keyboard; ask the assistant to improve that selection. Reading/design modes interpret the same ordered teaching, not two copies.

The assistant states scope, source set and base revision. Proposal preview sits beside relevant content; **Apply selected proposal** changes only that content and **Undo** restores prior state. A visual request does not silently rewrite teaching. Distinguish changes to words, layout, data and assets. Assistant output remains a candidate; approval/publication remain independent.

Acceptance: directly edit selected text, apply a scoped replacement, undo, add reviewed image/chart, reorder, adjust page/artboard layout, switch reading/design with identical content/order, then save/reload/approve/publish the same snapshot. Failed/stale proposals leave the draft intact. Member/preview/audio use approved visible/spoken content and alternatives; preview is not engagement.

This needs versioned document/layout contracts, editor transactions/selection, durable assets and a shared renderer. Combining surfaces does not remove those needs. Deterministic charts/licensed images can precede generated visuals; provider video remains conditional. Keep one experience as adapters ship.

## 6. Phone/name, QR routing, future Planning Center

Reassessment retains the target: church QR/link → verified phone entry → preferred name when needed → correct church/study, with enrollment under open/approval/invitation policy. A phone label alone or QR plus current OIDC does not deliver phone-first authentication.

The creator previews approved reading/public cards; access policy stays administrative. Preserve stable identity, verified contact links, recovery and stronger staff access. QR possession adds no staff grant. Shared/recycled phones and names cannot choose another account; People candidates need reviewed church-specific association. Login, enrollment, reminders and sharing are separate choices.

Acceptance: new/returning/multi-church members reach the scanned destination; joining is idempotent; code failures/recovery retain context; changed-number recovery preserves the correct history; QR never escalates team permissions; name edits do not replace identity. People disconnection/unmatched records never blocks ordinary reading. No live SMS/provider/People behavior was tested by this role.

## 7. Review rail in the combined editor, honest cycles

Open review beside the selected passage. Show actor/time, exact revision/hash, review-cycle identity, original quoted selection/block and requested action. If later edits move/remove the anchor, show its prior snapshot rather than silently attaching it to different teaching. Unresolved status links to the rail across modes. Assignment, decision and reply are typed events in one history.

Fix same-revision resubmission as a **review-cycle** problem. A reviewer may need an explanation rather than changed teaching. Permit a fresh request/cycle against unchanged content with a new request ID and correct version checks. Never require fake wording edits solely for a uniqueness constraint. Actual edits still create content revisions/invalidate relevant approvals.

Acceptance: two sessions exchange non-empty notes/replies; reload/mode changes preserve them; a no-edit explanation can be reviewed without 409/23505 or manufactured teaching; actual edits target a new exact revision; stale/wrong-reviewer/cross-tenant/member access fails. [Detailed current proof and rebuilt proposal](../items/07-approval-conversation.md).

## Evidence and limits

Original component verification passed **13 tests across three files** with mocked fetch. Original [real local API evidence](../evidence/approval-roundtrip.json) proves stored notes, author-read gap, same-revision conflict, edited-revision recovery and selected guards; owned resources were closed/dropped. Artifacts remain unchanged historical proof. The hash audit supplies relevance, not a new runtime run or repaired UI.

The old screen/browser signoff belongs to the archived design. [Final rebuilt peer review](contributor-peer-review.md) records **35 new contributor research checks passed**, seven fresh images actually viewed, prototype defects corrected/rechecked, and the explicit first-view proposal-review entry. That demonstrates the local unified-creator interaction, not real ingestion/AI/persistence/publication. Review remains a separate prototype page, deck authoring is a prepared-template preview, and the proposed in-editor rail still needs integration. No provider, production, app build, package, configuration or deployment changes occurred. Actual church-staff usability, real-device/accessibility and provider acceptance remain future gates.

