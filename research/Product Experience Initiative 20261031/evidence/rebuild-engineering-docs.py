"""Research-only document rebuild and per-baseline-file audit, 2026-11-01."""
from pathlib import Path
from datetime import datetime, timezone
from zipfile import ZipFile
import hashlib, json, struct
ROOT=Path(__file__).resolve().parents[1]
docs={
'architecture/technical-feasibility.md':r'''# Technical feasibility: channel knowledge and unified authoring

Rebuilt 2026-11-01 for all four corrections. This replaces the former four-format per-study upload and mandatory separate CoWriter/Studio workflow. No application, dependency, configuration, deployment or provider integration changed. [Validation and sources](../evidence/engineering-validation.md), [file audit](../evidence/engineering-file-audit.json).

## Decision and implementation boundary

Build one **Compose** authoring workspace with a channel source library, Write/Design views of the same editable document, selection-aware assistant and immediate member preview. Verbal revision, image/chart/video proposals and layout changes act on one draft model through typed operations; the user need not visit separate tasks. Internal budgets, permissions and job queues remain distinct because operations carry different costs and risks.

Use a semantic document as canonical content and optional canvas/page placements as presentation. Begin with a constrained but useful rich document and design controls; expand into multiple layouts. Do not promise full Word/Canva compatibility or every source type on day one. The 30-check own-model spike supports this architecture's invariants; no candidate editor library was installed or exercised.

## Channel source library: one Import, many capabilities

A channel is an explicit child scope of a church, not an authentication tenant. Current schema has church-scoped sermon sources but no generalized channel library. Proposed `channels(church_id,id,...)`, `channel_access`, `source_assets`, `source_versions`, `source_spans`, `source_indexes`, `import_batches/items`, `source_jobs`, `draft_source_selection` and request manifests all use composite church/channel keys. Every API, job, object key and query must preserve both scopes. Private drafts/conversations can reference permitted channel versions without exposing private uploads to all contributors.

One Import entry accepts many files, pasted text, multiline links and connector picks in the same batch. The library retains actual filename/title, original URL/provider id, uploader, capture/sync time and current version. Show per-item **processing / ready / error** and actionable stage/error; successful siblings remain ready if one item fails. Capability availability—Available, Planned, Connect account, Permission required—is separate from item processing status. Ready means extracted/indexed, not Scripture verified or permission to publish. Unsupported encrypted/macro files fail explicitly while keeping their name and recovery choice.

Ready authorized sources are included by default in the channel context with explicit selection toggles and coverage indicators. Capture permitted use once at import/connection policy level where appropriate; do not impose a mandatory per-source confirmation wizard. Exceptional OCR uncertainty, missing rights, unavailable captions or failed extraction need a focused repair/review state. The default inclusion policy is itself recorded in the request manifest; it must not silently include unready/inaccessible material or exceed context budgets.

Proposed capability registry:

| Semantic source kind | Container/MIME or identity | Pipeline and near-term status |
|---|---|---|
| Uploaded document | TXT/MD, DOCX, PDF, PPTX; MIME plus signature/package structure | UTF-8 first; DOCX isolated subset tested; PDF/PPTX extraction/OCR planned |
| Spreadsheet/table | CSV, XLSX; workbook metadata | CSV bounded typed table; XLSX selected sheets/ranges and cached results; no formula execution; XLSX subset tested |
| Image/scan | PNG/JPEG and approved raster types | Size/decompression/metadata controls; OCR with page/region provenance and confidence; planned |
| Audio/original media | MP3/WAV/MP4 etc. | Scan, trusted duration, rights, async transcription with timestamps; provider configured/authorized before use |
| Public web link | Canonical URL + captured HTML/text or PDF MIME | Existing safe fetch foundation; isolated extraction/OCR by detected response; dynamic/private pages unsupported initially |
| YouTube link | Video/track id, language, timestamp | Authorized caption route or conditional managed enterprise connector; permission/caption failures and transcript fallback |
| Connected content | Drive/Docs/Slides/Sheets, Planning Center or later services | Provider organization/file ids + scopes + ACL/version; no available badge before integration proof |
| Pasted note | Text with retained human title | Local bounded parsing, immutable version and provenance |

`sourceKind` describes acquisition/semantics; `mimeType` describes bytes. A Google Doc is a connector-native resource, not a DOCX file. A URL may return PDF. Registry fields include sniff rules, parser/model version, supported limits, connection/rights requirements, capability state, processing stages, cost unit, output locator and retention policy. Server enforces registry; client accept filters are hints. Detect MIME/signature/ZIP members and reject macro/external/embedded active parts. Do not pass arbitrary document markup or embedded instructions into application authority.

Google's official NotebookLM help currently redirects/names the product **Gemini Notebook**. It documents documents (DOCX/TXT/MD/PDF/CSV/PPTX), images, audio, Docs/Slides/Sheets, web/public YouTube, notes and ePub, with product-specific limits; public video support depends on captions. Treat that as a UX/reference capability, not Rooted runtime proof. [Official source support](https://support.google.com/gemininotebook/answer/16215270?hl=en).

There is also a documented **Preview Enterprise API**: batch source creation, file upload, source read and batch deletion; document MIME list includes XLSX alongside DOCX/PDF/PPTX/TXT/MD. Enterprise licensing/project IAM, target region and Drive authorization are prerequisites, and its preview terms matter. Therefore neither “NotebookLM has no API” nor “consumer support is available through Rooted” is justified. [Enterprise source API](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks-sources).

## Capture, indexing, retrieval and lifecycle

Batch request returns 202 plus durable batch/item ids and idempotency key scoped to church/channel. Each item is an independently retryable job: queued → validating/quarantine → fetching/extracting/OCR/transcribing → indexing → ready, or error/cancelled. Keep attempt id, lease/heartbeat, error code/recoverability and progress; never automatically replay an unknown paid submission. Reserve limits before work, reconcile provider usage and release/reserve conservatively on failure. Removing an item cancels pending work and tombstones access before asynchronous physical cleanup.

Each immutable source version records original-byte SHA-256, normalized-content hash, extractor/OCR/transcriber/model version, provider revision/ETag, capture time, rights purposes/evidence and exact locators. Paragraph/table/cell/page region/slide/timestamp provenance follows the extractor; do not invent DOCX page numbers. XLSX retains workbook date system, values/types and formula/cache distinctions; formulas, macros and external links never execute. OCR uncertainty remains visible. Source text/objects stay private and are not public asset URLs.

Index generation is versioned separately: chunker/version, embedding model/dimensions, tenant/channel/source-version metadata, ready watermark and token cost. Start with SQL full-text/lexical retrieval plus manually selected ranges when the corpus is small; semantic vectors are optional after quality/cost evaluation. If used, partition/filter by tenant/channel/access/selected-version **before** similarity ranking, then verify every retrieved row again. Never query a shared vector index broadly and filter only after generation. Chunk boundaries retain source locators and overlap intentionally. A new embedding model creates a parallel index generation, validated before atomic promotion; readers never mix incompatible dimensions/models.

The draft selection stores exact source versions. An assistant request embeds a bounded text/span manifest with source version/hash/locator, extraction/index versions, permitted purpose, omitted-source/coverage information and base draft hash. “Embedded context” means actual chosen text in the model request; embedding vectors alone are not evidence. Replies contain validated citations to supplied spans. Server resolves a citation to the pinned source version and excerpt, with access checks. If relevant evidence is absent, state that and ask to include a source; no fake citation ids.

Lifecycle operations have different semantics:

- **Select/deselect:** changes next-request context; no source deletion and no retroactive rewriting of accepted content/citations.
- **Refresh:** fetch new original/provider revision and create a new immutable content version; show differences and require an explicit switch for current draft context.
- **Reindex:** rebuild chunk/vector representation of the same content version; no content version substitution or silent source refresh.
- **Remove from channel:** immediately exclude from retrieval/selection and cancel jobs; retain only permitted audit/reference evidence or show citation unavailable under retention policy. Existing generated wording does not prove continued rights.
- **Delete/revoke access:** invalidate caches/index authorization promptly, remove bytes/vectors according to retention/legal policy, propagate connector revocation and avoid retaining unauthorized copied text in prompts/logs. Preserve minimal non-content tombstones where allowed.

Current source snapshots in canonical revisions are a useful extension point, but must include source-version/rights/extractor/context hashes. Existing CoWriter upload limit (256 KiB) and approximately 10–12 KB serialized request checks are much smaller than a channel corpus. Do not send every selected file whole. Enforce per-batch file count, bytes/expanded bytes, pages/cells/audio seconds, selected-context byte/token budgets and per-church monthly quotas. Prompt budgeting must include instructions/history/draft/tools, not just retrieved chunks.

Independent pipeline vs Enterprise delegation:

| Option | Benefit | Cost/constraint |
|---|---|---|
| Rooted-owned extraction + lexical/optional vector index | Exact channel ACL/provenance/lifecycle control, compatible with current stack | Parser/OCR/transcription operations, security and quality ownership |
| Enterprise source service behind connector | Documented ingestion surface and broader managed formats | Preview dependency, subscription/IAM/consent/region, contractual retention, export/citation/grounding parity and costs need live proof |
| Hybrid | Start local known formats, explicitly opt into selected managed pipelines | Registry and manifests must expose which provider handled each source; no silent cross-provider data transfer |

Recommendation: independent bounded text/document library first, with a provider-neutral registry. Evaluate Enterprise only through a separate credentialed, budgeted integration decision. Do not use unofficial consumer browser automation.

Retain existing HTTPS exact-host allowlisting, all-answer public DNS validation, pinned socket lookup, redirect/compression rejection and byte limits in `ingestion.ts`; add isolated HTML extraction and outbound network controls. A broad Import does not authorize arbitrary backend fetches, crawlers, authenticated pages or bypassing provider rights. Generic YouTube Data API caption download still requires video-edit permission; Google's first-party Notebook capability is a different access path. [YouTube caption API](https://developers.google.com/youtube/data/reference/rest/v3/captions/download).

## Unified Word/Canva-like authoring architecture

Canonical draft v2 contains `nodesById`, rich-text trees/marks, semantic `readingOrder`, asset references/hashes, source citations, styles/theme, layout variants and a version number. Stable node ids connect selection, review anchors, assistant targets and design placements. Layouts reference the same nodes: flow document, paged document and optional fixed artboards/canvas. Style/layout changes never duplicate authored text into unrelated stores.

Rich text needs paragraphs/headings/lists/links/tables, inline marks and safe custom nodes. Visual controls need resize/align/group/layer/z-order/crop, styles, text boxes and image/chart/video blocks; library capabilities do not supply the product's accessible UI automatically. Store crop rectangles normalized to asset coordinates and group transforms without duplicating source text. A fixed canvas is a design surface, not the semantic source of truth. Text intended only as decoration must be marked decorative; meaningful text must map to a semantic node. Logical reading order remains explicit and independent from x/y/z or DOM paint order. A small-screen reading rendition reflows semantic content; fixed exports preserve geometry with an accessible text rendition and no claim of identical pagination. Member HTML must remain live text and accessible media, never a flattened screenshot of the editor.

Use an assistant panel in the same workspace. Actions such as explain source, rewrite selection, insert image/chart, rearrange/resize and draft public deck produce typed proposals against `baseRevisionHash + targetNodeId + selection/quoted text`. The server validates operation allowlist, range, node existence, capability, source citations, asset ownership, budget and expected version. Show preview/diff, apply one transaction on consent, preserve selection/focus and allow undo. Generation does not auto-publish or mutate unrelated nodes. No mandatory separate CoWriter/Studio tasks are needed, even though text/media jobs use different internal policies.

Version and editing rules:

- Use optimistic concurrency and a transaction log. Reject stale proposal/base versions with recoverable rebase/review; do not silently overwrite another author's edit.
- Positions/ranges are mapped by the selected rich-text engine; stable node ids plus revision/quote anchors are required for review. Deleted/split targets become orphaned anchors shown against the old snapshot, not attached to unrelated text.
- Undo/redo in the first release is scoped to local transactions and creates a new monotonic version; never restore old server version numbers or undo another author's approved publication. Real-time collaboration needs CRDT/OT mapping and selective history tests; postpone it if unnecessary.
- Approvals hash semantic content, layout/reading order, assets and versions, source manifest and renderer/template version. Published snapshots are immutable. Any accepted wording/visual/layout change creates a new review target; current-reader boilerplate must be removed or explicitly included in reviewed template content. Preview, member HTML, audio text and export derive from the same canonical model.
- Migrate v1 text to explicit nodes without hidden prayer or special passage quotation. Keep legacy renderer/version for old publications until audited migration; no lossy “HTML into body” workaround.
- Mobile supports semantic writing/selection and accessible property controls, with zoom/fit and keyboard alternatives for canvas. No drag-only or precision-only path; meaningful text/alt/captions remain readable with media disabled. Test IME, paste, table editing, keyboard/touch selection, contrast, overflow and reading order.

## Editor and canvas candidate assessment

All links were checked on 2026-11-01. No package is installed in this checkout (lockfile search); current documentation/release feeds show active projects but do not guarantee a support SLA. Licenses must be checked for exact chosen versions/extensions at implementation time.

| Candidate | License/evidence | Fit and cost to Rooted |
|---|---|---|
| Tiptap + ProseMirror | Core MIT; schema/extensions docs; ProseMirror permissive MIT-style license | Preferred rich-text evaluation candidate: schema-backed nodes/transactions, custom node surfaces; paid extensions/conversion/collaboration are separate choices. Needs toolbar/accessibility/paste/IME and stable-id mapping spike |
| Direct ProseMirror | MIT-style project license; official guide access returned 403 here, license read | Maximum transaction/schema control; more editor UI and integration work; not independently runtime-tested |
| Lexical | MIT; immutable EditorState/JSON/custom nodes and React/Yjs documentation | Credible alternative, especially React; its node/selection model needs a different adapter. No reason to switch solely on star counts |
| Konva/react-konva | MIT; retained scene/layer model, transforms and React integration | Preferred canvas evaluation candidate: placements can project application-owned state. Rich-text input and semantic DOM/accessibility remain our work |
| Fabric.js | MIT; objects, IText/Textbox, serialization/SVG docs | Strong visual authoring alternative with built-in object controls/text; avoid treating its serialized scene as sole reading document; React/history bridge needs testing |
| tldraw SDK | Source available under tldraw license; production key/commercial or eligible hobby license | Strong infinite-canvas tooling, but production licensing and whiteboard model add constraints; not an MIT-equivalent fallback or selected default |

Selection is provisional **Tiptap/ProseMirror + Konva adapters over Rooted's own document model**. The own-model spike tests stale proposal rejection, text marks, semantic order vs placement, approval invalidation, snapshot immutability, escaping and monotonic undo. This validates the chosen separation of concerns, not performance or interoperability of those libraries. Gate installation/commitment on a short candidate spike covering mobile IME, clipboard, tables, nested nodes, selection mapping after concurrent edits, design transforms, serialization/migration and accessible render/export parity. Avoid a single freeform canvas swallowing semantic text.

Official evidence: [Tiptap schema](https://tiptap.dev/docs/editor/core-concepts/schema), [core/paid product boundary](https://tiptap.dev/product/editor), [Tiptap license](https://raw.githubusercontent.com/ueberdosis/tiptap/main/LICENSE.md), [ProseMirror license](https://raw.githubusercontent.com/ProseMirror/prosemirror/master/LICENSE), [Lexical](https://lexical.dev/docs/intro), [Lexical license](https://raw.githubusercontent.com/meta/lexical/main/LICENSE), [Konva](https://konvajs.org/docs/overview.html), [Konva license](https://raw.githubusercontent.com/konvajs/konva/master/LICENSE), [Fabric](https://www.fabricjs.com/docs/), [Fabric license](https://raw.githubusercontent.com/fabricjs/fabric.js/master/LICENSE), [tldraw license](https://tldraw.dev/community/license).

## Autoplay demonstration contract

The homepage needs actual local playable media showing the unified import→context→selection→proposal→design flow. A static chapter storyboard is not completion. Prefer compressed local MP4/WebM with poster, muted autoplay and playsinline, optional loop, visible pause/play, captions/transcript and a useful fallback. Call/play promise rejection leads to a still poster plus Play button; reduced motion and data-saving conditions should avoid forced animation. Never claim autoplay can be guaranteed on every browser/device. Root/UX own media generation and actual browser playback proof; this engineering model spike does not validate media playback.

## Re-evaluated social, identity and review boundaries

Social deck creation lives in the unified workspace as another layout/rendition of approved source content, with editable public caption and destination. Exact card order/bytes, font/image assets, brand/template/renderer, public purpose and source revision must be pinned for deck approval. Text approval does not automatically approve shortened public language. A previous approved deck is immutable; choosing a new source/layout creates a new draft. Member sharing remains optional, only after an explicit church public-sharing decision; exclude private discussions/reflections/identity. Native sharing is enhancement over Download/Copy link, and a share promise is not posting proof. Downloaded copies cannot be recalled.

| Operation | Explicit authority |
|---|---|
| Author/edit document or deck/layout | Authorship capability; deliberately assign it to admins who should author—current admin grants omit `content:edit` |
| Review exact content/rendition | Appropriate approval capability + independence policy, not assistant permission |
| Enable/withdraw public deck | Publication/public-sharing authority + audit; no implicit grant through editing |
| Member choose share/download | Approved public rendition only, no generation/edit/approval power |

The merged assistant never resolves review requests by editing text. Existing approval runtime evidence (2026-11-01 03:39 UTC) demonstrated persisted notes missing from author read paths and 409/23505 no-edit resubmission; preserve protected revision/node history and orphaned anchors through flexible edits. Contributor owns refreshed current-API testing. Keep fresh browser evidence separate from DB/API evidence.

Phone/name/QR/People are unaffected by merging authoring: stable principal and verified issuer/subject, distinct phone contact/credential/reminder consent, canonical church route and explicit member-only enrollment policy. Shared/recycled numbers cannot auto-merge or recover an existing account by name. Current Entra external-tenant docs still describe SMS as second factor, not primary auth; select a phone-first OIDC provider/identity bridge explicitly and preserve same-account contributor MFA. Current Twilio Messages adapter is not Verify. Planning Center currently requests Publishing scope only; People association is a future separately authorized read-only integration, never a prerequisite to reading. [Entra](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-multifactor-authentication-customers), [People reference](https://api.planningcenteronline.com/docs/apps/people/versions/2026-10-05).

## Staged delivery, budgets and release gates

1. Channel/library contract + one import + per-item jobs for text, CSV and reviewed document subsets; preserve broad registry and clear unavailable formats. Lexical retrieval or selected spans first. Unified rich document surface + assistant text proposals + source citations.
2. Production DOCX/XLSX/PDF/PPTX extraction corpus, OCR/transcription as explicit pipelines, versioned indexes, context coverage and deletion/refresh controls. Add deterministic visuals and limited canvas/page layouts using the same model, transaction and review boundary.
3. Credentialed connectors and optional semantic embeddings; image generation, then video after real rights/latency/cost/accessibility tests. Enterprise delegation evaluated separately. Full collaborative editing and advanced layout import/export remain additional projects.
4. QR/current OIDC enrollment can progress independently; phone-first provider architecture and People OAuth require dedicated tests and funded trials. Homepage local autoplay must pass actual playback/fallback/reduced-motion tests before calling correction 4 complete.

Budget by unit, not number of import buttons: extraction pages/expanded bytes, OCR pages, audio seconds, embedding tokens, storage/index size, retrieved/context tokens, generation variants/video duration, export bytes/egress. Illustrative planning scenario: 1,000 sources × 20,000 tokens = 20M embedding input tokens initially; 10% refresh = 2M extra plus chunk/storage overhead. At 1,000 assistant requests × 8,000 selected tokens, context input alone is 8M tokens before draft/history/output. Apply the selected provider's current regional rates; no numerical model-price quote is established here. Monthly hard/soft quotas, per-job reservations and cancellation/unknown-submission reconciliation are required. The single Import UX is not an unlimited processing promise.
''',
'roles/data-engineer-assessment.md':r'''# Data engineer assessment — rebuilt November 1

The prior proposal constrained sources too narrowly and split verbal and visual work into mandatory tasks. That verdict is withdrawn. Recommend a channel knowledge library with one multi-item Import and one flexible authoring workspace: rich document plus design layouts, one draft model and a selection-aware assistant. Internal operation policies remain separate without imposing separate user tasks.

## What is supported by evidence

| Area | Current judgment |
|---|---|
| Broad source-library UX | Feasible architecture; current Rooted supports only narrow TXT/VTT/SRT paths. Capability registry must show actual stage/availability per MIME/connector. No claim all formats are live |
| NotebookLM reference | Official help documents broad first-party support; official Enterprise source API exists in Preview. Neither consumer support nor API documentation proves Rooted entitlement/integration |
| Batch/version/context lifecycle | New own-model spike passes 30 checks across partial failure, tenant/channel selection, refresh pinning, removal, bounded retrieval and structured editing. In-memory contract only, not SQL/RLS or semantic retrieval quality |
| Unified assistant/editor | One model and typed operations are feasible; choose Tiptap/ProseMirror + Konva as evaluation candidates, not installed/proven engines. Word/Canva compatibility is not established |
| Flexible layouts | Semantic reading order and optional placements can share content and approvals. Fixed canvas needs a distinct responsive accessible reading rendition, not shrinking a page on phones |
| Autoplay homepage | Actual local media and playback/fallback proof required. Old still storyboard verdict is withdrawn. Root/UX own the new media/browser test |
| Phone/social/item 7 | Guardrails remain necessary in unified workflow; old integrated-UX approvals are withdrawn and must be peer-tested against rebuilt surfaces |

Fresh runs on November 1: **28** extraction/identity/provenance checks, **21** current-source URL/export checks, **30** new library/editor model checks and **8** existing backend security/transport tests passed. [Validation](../evidence/engineering-validation.md). Results go to a new dated folder; old raw results remain historical. I re-inspected all three old PNGs and minimal zipped fixtures; they demonstrate only synthetic export/extraction, not the rebuilt editor.

## Recommendation and necessary decisions

Choose the channel/library + provider-neutral capability registry first. Sources retain actual names/URLs and immutable versions; content spans are selected, embedded into bounded requests and cited. Do not silently refresh draft context or treat index vectors as citations. Decide independent extraction/retrieval vs Enterprise delegation with licensing/IAM/region/retention evidence; no unofficial consumer automation.

One document model should hold rich text, semantic nodes, reading order, citations and layout variants. Text/media/layout proposals target exact selection and base revision; consent applies a transaction; undo creates a new version; stale targets fail recoverably. The editor, member renderer, spoken text and exports must derive from approved snapshots. Existing source-snapshot hashes are reusable, while current strict v1 payload and member fallback teaching need a deliberate migration.

Stage advanced extraction, OCR/transcription, embedding indexes, connector ACL refresh, generated video and collaborative editing behind real quality/security/cost tests. Current synthetic tests intentionally do not execute macros/formulas/scripts or contact paid providers. No dependencies installed. [Architecture, comparison and stages](../architecture/technical-feasibility.md).

Current phone-first still requires an identity-provider choice; canonical QR/member enrollment, phone credential, reminder consent and People association remain distinct. Public deck approval binds actual words/assets/layout/caption/destination, with explicit author/reviewer/publication capabilities. Existing admin label does not imply editing permission. Review notes/history remain protected against member/public reads; editing or assistant adoption never resolves an approver's request automatically.

First-pass research ready for rebuilt UX cross-review. Acceptance of old screenshots, separate Studio tabs or old 15-check browser results does not carry forward. New rendered interaction/media checks are required before final peer acceptance.
''',
'roles/engineering-peer-review.md':r'''# Engineering peer review — rebuild status

Rebuilt 2026-11-01. **The October 31 UI acceptance is superseded.** The old 15-check browser JSON is historical evidence for the retired storyboard and cannot validate the corrected product. Its helper now requires an explicit legacy flag to prevent accidental reuse. Final acceptance awaits review of the rebuilt actual screens and media.

Engineering direction accepted for prototyping: channel source library and one Import across files/links/paste/connectors; one selection-aware verbal/visual assistant in one rich document/design workspace; semantic reading order plus optional canvas placements; actual playable local autoplay demo with fallback. The new own-model spike tests contracts, not a browser editor/library/provider.

## Required final peer checks

1. Import multiple named/URL sources through one entry. Observe independent processing→ready/error, a meaningful extraction preview and retained source identities. Unsupported or unconnected pipelines must not look ready. Ready permitted sources default into context without a mandatory confirmation wizard; select/deselect and verify actual embedded context/citation manifest in the simulation. Exceptional OCR/rights errors are repair states; refresh/remove cannot silently substitute old draft evidence.
2. Without leaving the workspace, select text and request a rewrite; inspect a proposed change, apply, edit rich text, add/design a visual, undo and preview. Confirm assistant operations share one draft/version. A selected rich-text block with no real editing/selection operation is insufficient.
3. Change a meaningful visual's position/size/layer and logical reading order separately. Check actual preview/member DOM order and text equality, phone reflow, keyboard alternatives and review anchors. Caption/alt/reading text stay usable when media is unavailable. A session-storage reorder does not prove application persistence or approval implementation.
4. Observe actual local video time advance under muted playsinline autoplay, blocked autoplay fallback, pause/play and reduced-motion behavior. A video tag/poster, stock loop or chapter stills alone do not demonstrate the corrected flow. Root owns the autoplay primary evidence.
5. Recheck exact approved public deck source/rendition/assets/caption/destination, stale state and explicit role capabilities in the merged workspace. Reading cancellation/focus and optional share remain member requirements; no actual posting or native OS share claim.
6. Recheck canonical church choice and verified account continuity through expired-code/conflict/recovery/enrollment; no phone/name merge, no private household disclosure, no People prerequisite to reading.
7. Keep request notes/reasons visible across flexible edits and orphaned/deleted anchors; preserve original reviewed snapshot. Runtime evidence is not UI evidence. A reply/AI change never resolves the approver's decision; no-edit resubmit gets a specific recoverable outcome.

## Evidence retained with limits

The approval roundtrip recorded at 2026-11-01 03:39 UTC proves the old current-source note-read gap and 409/23505 same-revision retry failure in a disposable local DB, with cleanup and no provider requests. Contributor owns its refreshed evidence. Old research screenshots, separate-task UI verdicts and old playback-absent storyboard conclusions are not accepted for this rebuild.

Fresh model/source tests are listed in [engineering validation](../evidence/engineering-validation.md); per-file baseline reassessment is in [audit](../evidence/engineering-file-audit.json). No app/package/configuration/deployment modifications by this role. Final rendered acceptance is intentionally pending rather than inferred from unchanged files.
''',
'evidence/engineering-validation.md':r'''# Engineering validation — rebuilt 2026-11-01

All engineering artifacts stay in this research initiative. No app/dependency/configuration/deployment changes, paid calls, secrets read/output or external writes. Baseline inventory and ZIP are owned by root; this role only reads `_audit`/`_history`. [Per-file reassessment](engineering-file-audit.json) lists every baseline-owned file with old/current SHA-256, verdict and proof. Old raw results remain byte-preserved historical records; they are not fresh evidence for new UI.

## Fresh current-source reads

Re-read `backend/contracts/payloads.ts` (strict text v1, no generalized document/canvas), `backend/src/integrations/ingestion.ts` (existing allowlist/public-IP/pinned-DNS/redirect/size controls), `backend/src/integrations/cowriter.ts` (tools empty and 12,000-byte serialized prompt guard), `backend/src/modules/revisions.ts` (source snapshots in canonical hash), `backend/src/integrations/planning-center.ts` (Publishing-only scope), `backend/src/api/onboarding-routes.ts` (admin lacks content:edit), auth/session source and member-reader fallback structure. No channel library/vector/index/flexible editor integration is implied by these foundations. Lockfile search found no Tiptap/ProseMirror/Lexical/tldraw/Fabric/Konva installation.

## Fresh isolated runs and exact outputs

Commands from workspace root, run separately:

```powershell
python 'research/Product Experience Initiative 20261031/evidence/engineering-spike.py'
node --import tsx 'research/Product Experience Initiative 20261031/evidence/engineering-runtime-spike.ts'
python 'research/Product Experience Initiative 20261031/evidence/unified-model-spike.py'
node --import tsx --test backend/tests/integrations/source-fetch.test.ts backend/tests/integrations/security.test.ts
```

| Run | Observed result | Scope and falsifiable boundaries |
|---|---|---|
| Python extraction/identity/provenance rerun | 28 passed, exit 0; [dated JSON](engineering-rerun-20261101/engineering-spike-results.json) | DOCX split-run/paragraph/table order; XLSX shared/inline strings, boolean, 1900/1904 dates and absent/stored formula results; rejects traversal/VBA/external relationship/entity/expanded size; tenant/rights/extractor hashes and shared-phone ambiguity |
| Current-source URL + sharp rerun | 21 passed, exit 0; [dated JSON](engineering-rerun-20261101/engineering-runtime-results.json) | Reject HTTP/credentials/port/suffix/fragment/encoded loopback/mixed DNS/private IP; accept mocked allowlisted public address; three unique synthetic PNG exports with dimensions checked |
| New own structured model | 30 passed, exit 0; [JSON](engineering-rerun-20261101/unified-model-results.json), [source](unified-model-spike.py), [escaped semantic output](engineering-rerun-20261101/shared-reading.html) | Mixed batch retains names/URLs, idempotency and partial failure; unavailable PDF/YouTube stay errors; reject cross-tenant/channel selection; refresh pins old manifest; removal excludes future retrieval; context budget. Rich-text mark, stale/missing target rejection, canvas position vs reading order, approval invalidation, immutable snapshot, shared render, escaping, missing-alt/duplicate-order reject, monotonic undo and reviewed anchor |
| Existing backend tests rerun | 8 passed, 0 failed, exit 0 | Mocked HTTPS transport verifies DNS pinning/original hostname/redirect/oversize; transcript bounds, crypto/webhook signatures, Scripture distinctions. No production network/security audit |

The old helpers were updated only to direct fresh outputs into `engineering-rerun-20261101`, preserving original raw results/fixtures/PNGs. Minimal synthetic OOXML packages are not Office interoperability fixtures. No formulas/macros/scripts ran. The new source retrieval is a simple in-memory lexical ranking after authorization filtering; it does not test embedding quality, an actual index, DB RLS, HTTP jobs or production deduplication. The editor model is synthetic paragraph runs/marks/placement transactions; no IME, native selection/paste, collaboration, real editor engine, layout performance or browser integration is proved. Own renderer equality is deliberately narrow. Final rebuilt browser/editor/media tests belong to the next peer review.

## Official primary sources researched November 1

| Source | What was verified / limit |
|---|---|
| [Google source support](https://support.google.com/gemininotebook/answer/16215270?hl=en) | Current title Gemini Notebook; broad first-party formats, source selection and public-caption video constraints; not Rooted capability. Consumer and enterprise surfaces differ |
| [Enterprise source API](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks-sources) | Preview source batch/upload/get/delete, supported MIME list and Drive credentials/regions; subscription/IAM/retention/quotation-grounding parity and paid integration untested |
| [Tiptap schema](https://tiptap.dev/docs/editor/core-concepts/schema), [product](https://tiptap.dev/product/editor), [license](https://raw.githubusercontent.com/ueberdosis/tiptap/main/LICENSE.md) | Core MIT; schema/extensions fit; separate Core/Paid products. No package installed |
| [ProseMirror license](https://raw.githubusercontent.com/ProseMirror/prosemirror/master/LICENSE) | Permissive MIT-style text checked. Official guide/ref fetch returned 403; do not claim full guide read or engine runtime proof |
| [Lexical intro](https://lexical.dev/docs/intro), [license](https://raw.githubusercontent.com/meta/lexical/main/LICENSE), [releases](https://github.com/meta/lexical/releases) | MIT, immutable state/custom nodes/React and current release activity; no runtime trial |
| [Konva overview](https://konvajs.org/docs/overview.html), [license](https://raw.githubusercontent.com/konvajs/konva/master/LICENSE), [changelog](https://github.com/konvajs/konva/blob/master/CHANGELOG.md) | MIT, scene/layer/transform model; changelog includes 10.9.0 dated 2026-10-14. No package/version commitment |
| [Fabric docs](https://www.fabricjs.com/docs/), [license](https://raw.githubusercontent.com/fabricjs/fabric.js/master/LICENSE), [releases](https://github.com/fabricjs/fabric.js/releases) | MIT, object/Textbox/IText/serialization and current activity; no integrated React editor proof |
| [tldraw licensing](https://tldraw.dev/community/license) | Source available license with production key requirement; not ordinary permissive open source for commercial deployment |
| [YouTube download](https://developers.google.com/youtube/data/reference/rest/v3/captions/download) | Reconfirmed edit permission/OAuth, 200-unit download. Reported update 2026-10-15 UTC |
| [Entra customer MFA](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-multifactor-authentication-customers) | Reconfirmed SMS not first factor for external tenants. Reported update 2026-05-28 |
| [PCO People](https://api.planningcenteronline.com/docs/apps/people) | Current docs resolve to 2026-10-05; actual app remains Publishing-only. No People directory read/write |

Living docs above had no exact publication date established unless listed. License text and checked docs are not an SLA or full dependency/legal/security audit. No consumer Notebook automation, enterprise entitlement or vendor account was used. OCR/transcription/embeddings/model/media generation costs and rate limits remain estimates/formulas until selected-provider tests. Root owns autoplay official-source and actual local-media validation; this ledger makes no playback claim.

## Retained evidence and changed conclusions

Old `engineering-peer-browser.json` is dated 2026-11-01 03:43 UTC and tests the retired split-task storyboard. It remains raw only; the helper requires `--legacy-20261031` to prevent accidental rerun. The 15-pass old verdict is withdrawn for the rebuild. Original extraction/runtime JSON, DOCX/XLSX and three PNGs retain only their stated synthetic scope and hashes; fresh outputs are linked above. All three old PNGs were visually re-inspected, and both old fixtures' ZIP members were reviewed in the per-file audit.

Existing approval-roundtrip JSON was re-read: it records no providers, exact local note-read statuses, failed no-edit retry and cleanup. Its runtime facts remain dated; contributor owns source revalidation/rerun against the merged editor proposal. Fresh UI history rendering, phone/enrollment recovery, public deck operations and autoplay need rebuilt-screen tests rather than inheriting old approvals.
'''
}
docs['roles/engineering-peer-review.md']=r'''# Engineering peer review — final rebuilt concept

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
'''
docs['roles/data-engineer-assessment.md']=docs['roles/data-engineer-assessment.md'].replace('First-pass research ready for rebuilt UX cross-review. Acceptance of old screenshots, separate Studio tabs or old 15-check browser results does not carry forward. New rendered interaction/media checks are required before final peer acceptance.','Final rebuilt peer review is complete: 10 independent engineering browser checks passed, including actual local media decode/time advancement, reduced motion, shared document order and exact deck-source boundary. Contributor/member evidence is separately attributed. Accept the revised concept for implementation planning with explicit limits: review is a separate page; full crop/grouping, providers and durable backend editing remain unimplemented. Old split-task screenshots and 15-check browser verdict do not carry forward. See engineering-peer-review.md.')
docs['evidence/engineering-validation.md']+='''

## Final rebuilt browser peer run

Executed `node "research/Product Experience Initiative 20261031/evidence/engineering-rebuild-peer.mjs"` against `http://127.0.0.1:3092` on November 1. **10 passed, zero page errors, zero external requests**; [exact JSON](engineering-rebuild-peer.json) records app hash and observed media properties/time. Uses installed headless Edge; no dependency installation or application/provider calls. Verified single import/error exclusion, URL version/locator in assistant context, selected Apply/Undo, placement/order independence, actual preview DOM order, r10/deck-v3 approval boundary, stale no-approval, local video decode/advancing time and reduced-motion fallback. This replaces the old browser helper as current engineering concept evidence. It does not validate ingestion, generation, authentication, approval enforcement or session state as durable backend behavior.

Read contributor 35/35 rebuilt controls results and member 13/13 groups, and visually inspected four contributor PNGs. Those checks remain attributed, not independently repeated in full. Final [peer verdict](../roles/engineering-peer-review.md) records planned crop/grouping, separate review page, below-fold Apply, simulation and phone/social/provider limits. Root/UX own broader autoplay failure/keyboard/reflow coverage.
'''
docs['architecture/technical-feasibility.md']=docs['architecture/technical-feasibility.md'].replace('Root/UX own media generation and actual browser playback proof; this engineering model spike does not validate media playback.','Root/UX own media generation and comprehensive playback-policy coverage. The final engineering peer browser run independently decoded the local WebM, observed advancing time with muted/playsinline and tested reduced-motion fallback; this is research-browser evidence, not live application or all-device proof. See evidence/engineering-rebuild-peer.json and roles/engineering-peer-review.md.')
for rel,content in docs.items(): (ROOT/rel).write_text(content,encoding='utf-8')
baseline=json.loads((ROOT/'_audit/before-20261101.json').read_text(encoding='utf-8'))
owned=lambda p: p in docs or any(k in p for k in ['evidence/engineering-peer-browser.','evidence/engineering-runtime-','evidence/engineering-spike','evidence/synthetic-deck-','evidence/synthetic-fixtures/'])
entries=[]
for b in baseline['files']:
    rel=b['path']
    if not owned(rel): continue
    path=ROOT/rel;data=path.read_bytes();digest=hashlib.sha256(data).hexdigest()
    proof=[]
    if rel in docs:
        verdict='rebuilt';proof=['Full content replaced for four corrections; see revised dated document.']
    elif rel.endswith('.json'):
        value=json.loads(data);verdict='retained-dated-limited-evidence';proof=['JSON parsed; baseline SHA-256 unchanged.','Not evidence for rebuilt UI. Fresh dated outputs referenced in engineering-validation.md.']
        if 'peer-browser' in rel:proof.append('Old 15-check split-task UI acceptance explicitly superseded, not rerun.')
        else:proof.append('Underlying helper rerun November 1 into separate dated directory.')
    elif rel.endswith('.png'):
        verdict='retained-synthetic-export-only';width,height=struct.unpack('>II',data[16:24]);proof=[f'PNG IHDR {width}x{height}; baseline SHA-256 unchanged.','All three images visually re-inspected November 1; fictional, no Scripture quote, not rebuilt flexible editor.','Fresh counterpart rendered in dated rerun directory.']
    elif rel.endswith(('.docx','.xlsx')):
        verdict='retained-minimal-fixture-only'
        with ZipFile(path) as z:proof=['ZIP members: '+', '.join(z.namelist()),'Baseline SHA-256 unchanged; fixed-member minimal XML package, not Office interoperability corpus.','Fresh equivalent extraction fixture generated and tested November 1.']
    elif 'peer-browser.mjs' in rel:
        verdict='retired-helper-guarded';proof=['Old route/selector assertions audited and not reused; explicit legacy flag added.','New unified UX/media peer checks pending rebuilt prototype.']
    else:
        verdict='reassessed-rerun-output-isolated';proof=['Source read and output directory changed to dated rerun folder to preserve baseline raw evidence.','Executed November 1; extraction helper 28 checks or runtime helper 21 checks, exit 0.']
    entries.append({'path':rel,'baselineSha256':b['sha256'],'currentSha256':digest,'baselineBytes':b['bytes'],'currentBytes':len(data),'unchanged':digest==b['sha256'],'verdict':verdict,'proof':proof})
audit={'reviewedAt':datetime.now(timezone.utc).isoformat(),'baseline':'_audit/before-20261101.json','scope':'All 15 baseline files owned by engineering role; _audit/_history/application untouched','ownedBaselineCount':len(entries),'files':entries,'newEvidence':['evidence/unified-model-spike.py','evidence/engineering-rerun-20261101/','evidence/rebuild-engineering-docs.py','evidence/engineering-rebuild-peer.mjs','evidence/engineering-rebuild-peer.json'],'finalPeerReview':'Complete: 10 independent rebuilt concept browser checks pass; limits and attributed contributor/member evidence in roles/engineering-peer-review.md','pending':['Production/editor/provider implementations and real-device/accessibility tests remain future gates; no legacy acceptance carried forward.']}
assert len(entries)==15,len(entries)
(ROOT/'evidence/engineering-file-audit.json').write_text(json.dumps(audit,indent=2),encoding='utf-8')
print(json.dumps({'rebuiltDocuments':len(docs),'baselineFilesAudited':len(entries)}))
