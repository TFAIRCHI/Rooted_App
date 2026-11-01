# Engineering peer review — final rebuilt concept

Reviewed 2026-11-01 against the rebuilt research prototype at `http://127.0.0.1:3092`. **Accept the revised direction for implementation planning with the limits below.** This supersedes the October 31 split-task UI verdict; it is not deployment or live integration approval.

## Actual inspection and independent checks

I read the rebuilt `mockups/app.js` and current contributor/member result JSON. I visually inspected [library](evidence/contributor-library.png), [first Compose viewport](evidence/contributor-compose-first-view.png), [design](evidence/contributor-design.png) and [deck](evidence/contributor-deck.png) PNGs. The design screenshot contains deliberate overlapping placements, demonstrating flexibility rather than a completed publication layout; overlap/overflow checks belong before publication.

I independently ran [engineering-rebuild-peer.mjs](../evidence/engineering-rebuild-peer.mjs): **10 checks passed, zero page errors and zero external request attempts**. [Exact result](../evidence/engineering-rebuild-peer.json) records timestamp and app SHA-256. Installed headless Edge accessed only the local server. I did not rerun the guarded legacy helper or represent another role's checks as mine.

Observed independently:

- One Import entry and disabled error-source context checkbox; selected real-looking URL retained in assistant context with v2/section locator.
- Apply changed the selected document text inside Compose; Undo restored it. The same workspace exposes writing and design modes and the assistant.
- Changing artboard X placement preserved logical order; moving a block changed actual immersive DOM order to match the shared draft. This was a live DOM assertion, not an assumption from JSON.
- Deck v3 explicitly references approved r10 and excludes changes-requested current r12; stale deck had no simulated approval action.
- Local WebM decoded with nonzero intrinsic dimensions/duration, muted+playsinline true and advancing currentTime. Reduced-motion emulation paused autoplay and exposed the fallback. This is actual media playback evidence in headless Edge, not a guarantee across devices or browser policies.

Contributor independently reports **35/35** checks in [results](evidence/contributor-rebuild-results.json), including actual DOM-range selection/formatting, Apply/Undo, import partial failure and design operations. Member independently reports **13/13 groups** in [results](../evidence/member-peer-review-results.json), with proper-MIME 3092 service, media/reading/phone/share limits. These are simulated-role checks with no human participants. I read their results; their detailed scenarios remain attributable to those roles. UX owns final capture/keyboard/reflow evidence.

## Accepted recommendations and remaining boundaries

1. **Channel library:** the new name/URL/status library and single Import resolve the former four isolated upload-panel design. Source capability labels distinguish planned parser/OCR/transcription/connector work from ready fictional fixtures; one failed batch item does not imply the whole batch fails. Production needs durable async jobs, registry enforcement, tenant/channel ACLs, versioned text/index/citation manifests, deletion/reindex/refresh and measured retrieval quality. The UI's source-version/locator strings are simulated context, not actual AI retrieval proof. The architectural recommendation is ready permitted sources included by default with clear selection/coverage, not a mandatory source-by-source confirmation wizard; current fixture selections are deliberate examples rather than a complete production default policy.

2. **Unified authoring:** Compose places rich text, writing/visual assistant and design geometry in one workspace. The first viewport visibly offers “Review proposed change”; Apply can be below the fold and requires scrolling. This is acceptable for the current concept but deserves task testing with real contributors. The review conversation remains a **separate page**, linked from a persistent strip; an integrated review rail is not implemented. Publishing/deck controls also remain separate research surfaces. Do not describe every workflow as already consolidated.

3. **Word/Canva scope:** real direct text editing, selected-range formatting (contributor evidence), insertion, placement/width, alignment, layering, logical reordering and Undo establish a more flexible concept than fixed fields. Full crop and grouping are explicitly **planned**, not working operations. Contenteditable/DOM-range/sessionStorage code is a research model, not an adopted Tiptap/Lexical/ProseMirror engine. No collaborative history, robust selection mapping, clipboard/IME, responsive table editing, accessible canvas engine or version migration has been proved. The provisional library recommendation and 30-check own-model spike remain evaluation evidence only.

4. **Shared rendering:** preview derives from the same draft and logical order; mobile must reflow live text rather than flatten a canvas screenshot. Geometry and reading order remain independent. Production must publish immutable approved v2 snapshots, preserve v1, include template/assets/context hashes and remove unreviewed fallback teaching. The concept's session edits are not backend saves and must never mutate a real member publication.

5. **Media demo:** there is now a real local workflow recording, not a still-frame-only claim. Independent decode/time advancement and reduced-motion fallback passed. Browser-rejection, media-error, captions/transcript, pause/play and phone behavior are covered by root/member/UX ledgers to their stated scope; this role only directly tested the two media paths recorded in its JSON. The recording demonstrates the research interaction, not live extraction/AI/provider behavior.

6. **Deck, phone and review:** exact public deck approval remains separate from study text/layout edits and member sharing remains optional; no native OS sharing or social posting tested. Phone/name/QR recovery needs stable verified identity and explicit church enrollment; no SMS/People integration or household merge is established by conceptual states. Retain protected revision/node review history through edits/orphaned anchors. The rebuilt proposal permits a fresh review cycle against an unchanged revision; current 409/23505 is an engineering defect, not a requirement to make a meaningless edit. A reply/assistant adoption never resolves a reviewer decision automatically.

Old approval harness/results remain unchanged dated API/DB evidence, with cleanup and zero providers; current source read gap and same-revision defect were not re-executed by this peer run. Fresh UI conversation states remain simulations. Credentialed providers, parser corpus, semantic retrieval, secure durable publication, mobile/screen-reader usability and performance/cost tests are future gates.

All new engineering artifacts remain in the research initiative. No application, packages, configuration or deployment modified. [Engineering validation](../evidence/engineering-validation.md) and [refreshed 15-file audit](../evidence/engineering-file-audit.json) define the evidence boundary. Root owns final source-preservation and complete-artifact checks.
