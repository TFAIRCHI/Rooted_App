# Engineering validation — rebuilt 2026-11-01

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


## Final rebuilt browser peer run

Executed `node "research/Product Experience Initiative 20261031/evidence/engineering-rebuild-peer.mjs"` against `http://127.0.0.1:3092` on November 1. **10 passed, zero page errors, zero external requests**; [exact JSON](engineering-rebuild-peer.json) records app hash and observed media properties/time. Uses installed headless Edge; no dependency installation or application/provider calls. Verified single import/error exclusion, URL version/locator in assistant context, selected Apply/Undo, placement/order independence, actual preview DOM order, r10/deck-v3 approval boundary, stale no-approval, local video decode/advancing time and reduced-motion fallback. This replaces the old browser helper as current engineering concept evidence. It does not validate ingestion, generation, authentication, approval enforcement or session state as durable backend behavior.

Read contributor 35/35 rebuilt controls results and member 13/13 groups, and visually inspected four contributor PNGs. Those checks remain attributed, not independently repeated in full. Final [peer verdict](../roles/engineering-peer-review.md) records planned crop/grouping, separate review page, below-fold Apply, simulation and phone/social/provider limits. Root/UX own broader autoplay failure/keyboard/reflow coverage.
