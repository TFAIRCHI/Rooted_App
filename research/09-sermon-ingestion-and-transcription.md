# Sermon ingestion and transcription

**Needed:** A usable source library even when no external account is connected. **Recommendation:** Manual notes and transcript upload first, followed by explicit transcription jobs and a verified Publishing import. Every source has provenance and a rights decision. A link alone is not evidence that its media may be downloaded or transcribed.

## Input options and trust

| Input | Workflow / evidence | Failure and alternatives |
|---|---|---|
| Manual sermon entry | Title, speaker, preached date, Scripture references, church-owned notes; contributor identifies source author | Usable with sparse notes; AI must disclose limited sermon grounding |
| Pasted notes | Preserve original text and normalized source revision; distinguish summary from verbatim transcript | Pasting HTML must strip active content; contributor can correct in new revision |
| Transcript upload | MVP allowlist TXT/VTT/SRT; later scanned PDF/DOCX via isolated extraction; hash and preserve original privately | Reject encrypted, oversized, malformed, or unsupported files; show actionable error |
| Audio upload | Rights confirmation → malware/type checks → duration/cost estimate → explicit transcription → reviewed transcript | Unsupported format or provider failure leaves original and retryable job; never label empty output complete |
| Video/audio URL | Save source URL and metadata; retrieve only on approved hosts with permitted access | Private/paywalled/video-platform download restrictions require manual authorized file; no scraping assumption |
| Planning Center import | Import metadata/notes/media references available to authorizing account [S02](sources.md#s02), [S07](sources.md#s07) | Note text is not guaranteed verbatim speech; reconcile with [08](08-planning-center-integration.md) |

**Verified:** OpenAI file transcription documents a 25 MB input limit and suggests splitting/compression for larger recordings [S52](sources.md#s52). **Recommendation:** Our uploader can accept larger church files under a separately chosen product limit; worker segments/compresses only after approval and tracks overlap to avoid duplicated phrases. Do not confuse the product upload cap with a provider API cap.

## Proposed pipeline

`received → quarantined → validated → extracting/transcribing → needs_review → ready`, with `failed`, `cancelled`, and `rejected` branches. A source may be usable as notes before audio processing completes. Transcription completion produces a new source revision awaiting human review; it cannot approve a plan or overwrite a prior transcript.

Store ingestion job ID, tenant, asset version/hash, requested language, provider/model, consent/rights attestation, duration estimate, actual usage, attempt count, timestamps, and error class. For chunks store original offsets, overlap, ordering and merge algorithm version. Flag uncertainty around names, Scripture references, theological terms, and low-quality audio. Reviewers can compare the transcript to audio when rights permit. A corrected verse reference is a contributor correction with provenance; do not present raw speech recognition as a validated Bible citation.

Retries use the same source hash and operation ID. A stalled worker releases a lease; a unique finalization key prevents duplicate source revisions. Permanent bad media goes to an actionable error queue; a transient provider error backs off with capped attempts. Cancellation after provider acceptance may still incur usage. Partial transcripts remain marked incomplete and cannot claim full-sermon grounding. Never upload private member discussions to a transcription service.

## Source schema example

```json
{
  "sourceRevisionId": "source-r4",
  "kind": "reviewed_transcript",
  "sermonId": "sermon-john6",
  "assetVersionId": "asset-v1",
  "sha256": "illustrative-hash",
  "origin": {"provider": "manual", "externalId": null, "url": null},
  "rights": {"attestedBy": "contributor-maya", "purpose": "church_study", "status": "confirmed"},
  "reviewedBy": "pastor-david",
  "spans": [{"id": "span-18", "startMs": 724000, "endMs": 749000, "text": "Illustrative sermon notes."}]
}
```

Generated fields point to sourceRevisionId/span IDs and Scripture verification records. Character offsets refer to the immutable normalized text; audio offsets refer to the original source. Store retrieval time and adapter version for external media URLs; signed download URLs are temporary credentials and must not enter permanent public citations.

## Costs and rights

**Verified snapshot:** OpenAI lists estimated transcription rates of $0.003/minute for `gpt-4o-mini-transcribe` and $0.006/minute for `gpt-4o-transcribe` [S50](sources.md#s50). At the assumed 40-minute length, estimated provider transcription is $0.12 or $0.24 respectively, before retries, storage, preprocessing and review. These are example candidates, not a model selection outcome; evaluate accuracy on actual church recordings.

**Recommendation:** Church confirms rights to sermon recording, speaker contribution, notes, and third-party quotes, and confirms authorized processing by the selected provider. Provide takedown/offboarding procedures and retain minimal proof of rights. Public availability does not establish redistribution permission. Licensing outcome requires rights-holder review; this package does not assert a blanket legal exemption.

For Scripture text, choose licensed or otherwise authorized sources and track translation edition, retrieval date, quotation span, notice and use limits. Crossway’s API conditions restrict free use to non-commercial contexts and constrain caching; a paid SaaS must obtain the applicable rights decision rather than infer permission from church use [S53](sources.md#s53). Crossway separately publishes quotation guidelines [S54](sources.md#s54). **Recommendation:** Use references and short clearly labeled prototype excerpts until rights are settled. Do not ingest commercial commentary or an entire translation into retrieval without permission.

## Security, lifecycle, alternatives

Treat media and text as untrusted data: private quarantine, content sniffing, archive-bomb limits, scanner, bounded extraction, SSRF-safe fetcher denying private/link-local/cloud-metadata destinations and rechecking redirects/DNS. No arbitrary URL execution by the model. Provider payloads exclude member information. Data controls differ by API endpoint; verify the chosen provider contract and configuration [S51](sources.md#s51).

Alternative: external transcription only; simplest but adds provider dependency and privacy review. Alternative: self-host speech recognition; more control, but GPU/CPU operations, capacity and accuracy benchmarking are additional work. Dependencies: rights, source schema, object storage, worker and spend caps. Risks: incorrect Scripture/name transcription, partial imports, stale signed URLs, malicious documents. **Unknown:** typical sermon languages, duration, recording quality, authorized media hosts, retention needs, and translation rights. Phase 0 trial: compare two candidate transcribers on the same consented audio and measure verse-reference/name error rate, turnaround, reviewer correction time and total cost.
