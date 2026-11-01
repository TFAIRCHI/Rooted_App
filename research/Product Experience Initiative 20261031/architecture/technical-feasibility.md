# Technical feasibility: channel knowledge and unified authoring

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

The homepage needs actual local playable media showing the unified import→context→selection→proposal→design flow. A static chapter storyboard is not completion. Prefer compressed local MP4/WebM with poster, muted autoplay and playsinline, optional loop, visible pause/play, captions/transcript and a useful fallback. Call/play promise rejection leads to a still poster plus Play button; reduced motion and data-saving conditions should avoid forced animation. Never claim autoplay can be guaranteed on every browser/device. Root/UX own media generation and comprehensive playback-policy coverage. The final engineering peer browser run independently decoded the local WebM, observed advancing time with muted/playsinline and tested reduced-motion fallback; this is research-browser evidence, not live application or all-device proof. See evidence/engineering-rebuild-peer.json and roles/engineering-peer-review.md.

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
