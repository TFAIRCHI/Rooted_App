# 1. Channel sources — one Import, many kinds of context

**Revised recommendation:** a reusable channel source library inspired by NotebookLM: import into a named space, see actual filename/title/link and processing status, then use selected ready sources while creating. Replace separate Word, Excel, website and YouTube workflows.

## Reference and feasibility

Google's [source expansion](https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-deep-research-file-types/) and [source help](https://support.google.com/gemininotebook/answer/16215270?hl=en) establish a broad collection-based interaction. They do not establish Rooted ingestion support. There is also a documented **preview** [NotebookLM Enterprise source API](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks-sources); do not claim no API exists. Evaluate delegation separately against licensing, regions, consent, data handling and tenant isolation. A consumer subscription does not establish access to that enterprise service.

The proposed default is a Rooted-owned capability/adapter and retrieval layer. Enterprise delegation remains an alternative requiring a deliberate procurement/privacy decision, not an implementation dependency already selected.

## User flow

1. Open a named church channel, for example **RiverFront / Sermon preparation**. Its library is reusable by studies in that scope.
2. Use **Import** or drop files on the same entry. One dialog offers **Files / Links / Paste / Connections**. Bulk files and links share an import batch. Availability/setup/planned status is explicit.
3. Rows appear with the captured filename, supplied note title or original URL. **Uploading → Processing → Ready** or an actionable **Needs attention / Failed / Unsupported** status shows progress. Failed/processing rows cannot quietly supply context.
4. Ready rows show type, origin/version and an include checkbox. A sensible study selection can be prefilled; the creator can change it. The assistant names/counts the ready versions in use.
5. Open details when needed: extract/coverage, page/paragraph/timestamp/cell citations, OCR uncertainty, sheet/range, rights, refresh or remove. Ordinary success does not require a repetitive review/confirm ceremony.
6. Draft, edit or visualize in **Compose** with those sources. A newly ready source becomes selectable context in the same workspace.

“Embedded context” means scoped, indexed, retrievable evidence attached to the study/request. It does not mean every entire file enters every prompt, arbitrary HTML executes in the editor, or imported instructions gain authority.

## Broad adapter catalogue

These are proposed capabilities, not existing live Rooted integrations. A registry records adapter, accepted MIME/signature, availability, processing state, permissions, limits and coverage.

| Family | Desired inputs | Extraction/coverage concerns |
|---|---|---|
| Documents | PDF, DOCX, TXT, Markdown; RTF/ODT after evaluation | Text/headings/tables and page/paragraph anchors; scans and omitted comments/layout disclosed |
| Presentations | PPTX, consented Google Slides | Slide text/notes and visual descriptions with slide anchors; unsupported embedded objects |
| Tables | CSV/TSV, XLSX, pasted cells, consented Sheets | Typed values, headers/range, formulas versus cached values; no calculation/external-link execution |
| Web | Public HTML, linked PDF, approved pages | Bounded capture, original URL/time, login/paywall/redirect fallback |
| Video reference | YouTube/approved providers | Reference metadata versus actual authorized transcript/captions; timestamps and partial coverage |
| Audio/original media | Rights-cleared MP3/WAV/M4A; uploaded video later | Async transcription, language/time coverage, latency and cost/error states |
| Images/scans | PNG/JPEG/WebP and scanned pages | OCR/description with region/page and uncertainty; no invented chart data |
| Paste | Notes, text, tables, transcripts | Named capture, attribution and date |
| Connections | Drive/Docs/Sheets/Slides, OneDrive/SharePoint; church content later | Explicit setup/scopes/revocation; private directory/person records excluded by default |

Google's [audio/YouTube description](https://blog.google/innovation-and-ai/products/notebooklm-audio-video-sources/) explains its first-party feature. The generic YouTube [caption download API](https://developers.google.com/youtube/v3/docs/captions/download) has separate authorization requirements. Test Rooted's chosen path rather than infer every public URL yields a transcript.

## Architecture and release sequence

ChannelSource → immutable SourceVersion → extraction/index job → span/chunk locators → study selection manifest → scoped retrieval → grounded proposal in the unified document. Capture rights once at batch/channel level when appropriate, escalating uncertainty rather than inserting blanket per-file prompts.

Launch the **general library interface and extensible registry together**. Enable only tested adapters: current text plus PDF/DOCX/CSV/pasted cells first, then PPTX/XLSX and approved web, followed by OCR/audio and consented connectors. This is an engineering sequence, not a permanent four-format product. Planned/connection badges must be truthful; disabled adapters cannot appear successful.

A broad library needs retrieval because current prompt limits are small. Filter church/private scope before ranking, bound work, disclose partial/omitted context, and pin exact versions used. Refresh/remove/reindex changes future operations and invalidates stale pending proposals; approved snapshots retain their audit history under retention policy.

## Validation and release gates

The rebuilt prototype proves fictional library/import interactions. Historical parser/network evidence remains narrow; new capability/state-model checks do not certify production parsers.

Before enabling an adapter, prove real fixtures, malformed/password-protected/oversized inputs, citations and missing/OCR/partial coverage. Test duplicate batches, retry/cancel, deletion/reindex, revoked connections, source-instruction attacks, cross-church denial, actual latency/storage/model cost and source-to-answer grounding. A contributor should import a mixed batch and use ready entries without unnecessary ceremony. No live connector, paid OCR/transcription or real third-party source account was exercised.

See [engineering feasibility](../architecture/technical-feasibility.md), [current mockups](../mockups/README.md) and [validation](../VALIDATION.md).
