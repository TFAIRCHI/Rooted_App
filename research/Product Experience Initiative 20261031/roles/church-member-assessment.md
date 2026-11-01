# Church member assessment — rebuilt direction

Research date: November 1, 2026. This replaces the October 31 assessment after four product corrections. It is a simulated member perspective and expert task review, not congregation interviews or recruited-human usability testing. All examples and identities are fictional. Application implementation, paid services, account connections, SMS, social posting and production data are outside this work.

## Audit and corrected direction

The corrected direction is one church/channel source library with Import for many source types; one Compose workspace with Write and Design modes; actual document/canvas editing; and a visible homepage AI tab whose muted demo starts without interaction, with pause, reduced-motion and failure alternatives. Old separate CoWriter/Studio navigation and click-through still-frame demonstration no longer describe the proposal.

All six original member-owned artifacts were reviewed individually, including opening all three original PNGs as images. Original hashes and replacement decisions are in [member-file-audit.json](../evidence/member-file-audit.json); originals remain in the initiative baseline archive. Old observations cannot certify the rebuilt prototype. Current evidence requires fresh routes/interactions/output and prototype fingerprints.

## Member goals and priorities

“Help me reach my church's teaching, understand it in my available time and format, and choose what I share.” Returning members, visitors, shared-device households, readers with low vision and people with limited mobile data may need different paths. These are scenarios, not measured audience segments.

1. Correct-church access and account continuity, preserving public reading versus authenticated participation.
2. Faithful accessible reading of actual approved words, order and media, without requiring video or a large screen.
3. Deliberate sharing of separately approved public excerpts, independent of reminders or reading completion.
4. Dependable corrections and grounded teaching from a shared library/Compose revision.
5. Clear, truthful homepage explanation that works silently and remains understandable when paused.

This ranks member value rather than delivery effort. Library versioning, Compose structure, shared rendering and revision-specific approval are dependencies even when members do not see the preparation tools.

## Current application constraints

| Source-verified observation | Member implication | Evidence |
| --- | --- | --- |
| Church/study routes choose member or public endpoints; policy controls public lookup | Do not expose all studies to simplify QR or sharing | [member-server.ts](../../../frontend/lib/member-server.ts:13), [core-routes.ts](../../../backend/src/api/core-routes.ts:349), [001_core.sql](../../../backend/migrations/001_core.sql:198) |
| Member sign-in copy requests email; named-identity invitations are separate | A phone field/QR illustration cannot implement authentication or enrollment | [sign-in.tsx](../../../frontend/components/public/sign-in.tsx:9), [onboarding.tsx](../../../frontend/components/public/onboarding.tsx:22) |
| Reader splits text and adds fixed introductory text/headings/fallback prayer; quoted passage text is hard-coded for one reference | Render approved teaching rather than unsaved template prose | [member-study-reader.tsx](../../../frontend/components/member-study-reader.tsx:44) |
| Browser read-aloud is user-started, pausable and optional | Homepage silent-demo autoplay must not become devotional-media autoplay | [study-audio.tsx](../../../frontend/components/study-audio.tsx:12) |
| Completion is browser-local, scoped to church/user/study | Do not imply cross-device sync or measured spiritual progress | [member-study-reader.tsx](../../../frontend/components/member-study-reader.tsx:9) |
| Discussion contains names, pending/private comments and private reports | Export approved cards, never screenshots of member pages | [member-conversation.tsx](../../../frontend/components/member-conversation.tsx:34) |

These are source observations, not deployed-runtime certification. Engineering owns provider/identity and persisted-contract findings. The research prototype remains separate from the application.

## Seven workstreams and concrete acceptance criteria

### 1. One channel library and many Import types

Members benefit from coherent, grounded teaching rather than file conversion mechanics. Staff import documents, spreadsheets, pasted material, public web material and authorized transcripts into the same permission-scoped library. Reviewed selections, extraction omissions, rights and version provenance must be clear before Compose uses them. Do not imply every URL can be read.

Acceptance: quotations identify passage/translation; charts retain units and an intelligible source label. Authorized staff can trace claims to exact reviewed source versions without exposing private files to members. A changed library source cannot silently rewrite an approved study. Pastoral notes, workbook identities and restricted material remain private; permitted AI context is not automatically permitted public export. Failed/partial extraction cannot become invented teaching. Both Compose modes reference the same reviewed library selection.

### 2. Separately approved public sharing

Members choose Scripture, quote, chart or several approved cards, preview what leaves the church space, and can cancel. Church and Rooted branding travel with excerpts; the complete study may remain members-only. Public invitation links contain neither private study content nor identity-bearing access tokens.

Acceptance: identify exact deck rendition and approved study revision; define stale/withdrawn behavior. Exports contain no names, reactions, private reflections/comments, prayer requests, directory fields or review notes. Explain that anyone may forward copies and downloads cannot be recalled. Cancel restores reading context and meaningful focus. Native share success does not prove social posting. Individual/multiple selection and order are visible, with Download/Copy link alternatives and readable chart data/description. No social connection, share action or reminder consent is required to read or finish.

### 3. Homepage AI tab with visible muted autoplay

On ordinary entry the selected AI tab shows a demo that advances without click, tap or keypress. Show source selection → human direction/correction → changed draft → review, rather than generic motion. A useful still, short explanation and step list support visitors who do not watch. Label a scripted research walkthrough honestly; only a recording of working product is a real product recording.

Acceptance: panel visible/selected on entry; frame/progress changes with zero interaction; sound muted; named Pause freezes progression; Resume is deliberate. Reduced-motion starts with a useful still and manual-play option. Failed/unsupported autoplay shows a meaningful poster and transcript/steps. Do not trigger paid AI on entry. Study video remains optional/user-started. Mobile autoplay policies, captions/narration accuracy and performance need later device checks. A poster with a play button alone does not satisfy ordinary autoplay.

### 4. Compact preparation with genuine editing

Member value comes from reliable publication and fewer missed corrections. Compactness must preserve readable text, saved/review state and recoverable errors. Word-like formatting and Canva-like selection/resizing/reordering should operate on the same document, rather than changing a decorative sample while preview stays fixed.

Acceptance: edited Write text survives a switch to Design; block reorder changes shared preview; returning to Write retains content. Saving/reloading/approval later proves the same immutable revision. Member reading reflows at 320/390px and 200% zoom without horizontal page scrolling or overlap. Do not apply a staff no-scroll target to contemplative reading.

### 5. Compose Write and Design, one faithful reader

Compose joins verbal help and visual arrangement while preserving distinct modes. Members receive one authored sequence. Coordinates/cropping/layers cannot hide the passage or accidentally reorder screen-reader/narration content. Provide an explicit semantic block-order control with keyboard moves; overlapping visual groups need a meaningful linear equivalent.

Acceptance: edit text → insert media → arrange/reorder → switch modes → preview actual text and identical ordered stable block IDs. Label draft preview clearly; published reader remains pinned to the approved snapshot, isolated from working changes. Session-only research behavior cannot establish future save/reload/approve/publish parity. Images have alt text; diagrams readable equivalents; charts labeled data; video captions/transcripts/controls/duration cues. No study autoplay, media-gated completion or drag-only editing. Text remains useful with media unavailable. Full-screen reading has a named Exit and focus return. Narration follows authored order with no unsaved fallback teaching.

### 6. Phone/name, church QR, enrollment and future People

Keep church identity before/after login and provide a real alternative for no SMS/shared phones. Reading enrollment is separate from formal church membership, reminders, directory association and staff roles. Open, approval-required and invitation-only churches need honest states.

| Edge case | Required behavior |
| --- | --- |
| Existing account | Preserve immutable account/memberships/history and stronger staff verification; link credentials only after deliberate verification, never phone/name matching |
| Shared household phone | Another credential/reviewed support; no private household account list or name-based account selection |
| No SMS, landline, delayed/expired code, unsupported country | Actual alternative/recovery; preserve church/destination; deliberate resend timing and useful errors |
| Recycled/changed number or lost device | Possession alone cannot take over established account/staff role; reviewed recovery/session handling |
| Wrong account on shared browser | Show current identity before enrollment, permit switching and explain persistent sessions |
| Multiple churches | QR church persists through login/enrollment/reader/share/cancel; one church cannot change another's membership/consent |
| Wrong/stale/copied/revoked QR | Re-resolve policy; actionable recovery; no embedded role authorization |
| Reminder consent | Separate from verification/enrollment/People; default off |
| Preferred name | Explain comment visibility; changing label changes no ownership; legal name unnecessary just to read |
| Future Planning Center | Unmatched/disconnected service does not block permitted reading; shared/duplicate/household candidates require review; no automatic person merge/cross-church leak |

Acceptance: synthetic fixtures exercise each row, idempotent enrollment, destination retention and no identity disclosure/staff escalation; later prove chosen-provider delivery/recovery. A sample phone screen does not demonstrate an SMS-less alternative.

### 7. Visible review requests and member updates

Keep authorized revision-scoped requests/replies in Compose/review, distinct from member discussion. Open requests remain discoverable in Write and Design. A reply is not approver resolution; changed text/media/cards need appropriate new approval.

Acceptance: members receive only the available published revision; withdrawal provides a useful unavailable state; stale decks follow policy. Material changes have an intelligible dated indication. Never export internal reviewer messages or reinterpret prior completion as consent to changed teaching.

## Rebuilt peer review

The replacement [helper](../evidence/member-peer-review.mjs) completed its **full run with exit 0: 13 task groups passed, zero failed**, in headless Edge 155.0.4283.62 at `http://127.0.0.1:3092/index.html`, November 1, 12:36:01–12:36:10 UTC. [Raw results](../evidence/member-peer-review-results.json) record exact times, assertions and SHA-256 fingerprints before/after for app, styles, index, server, WebM, VTT, poster and helper. They remained identical throughout the final run. There were no page script errors or external requests; the browser guard permitted only the local prototype origin. No October 31 pass/image is carried forward as current proof.

Reproduce from the workspace root with the research preview running on that port:

```powershell
node "research/Product Experience Initiative 20261031/evidence/member-peer-review.mjs"
```

The optional `--base=http://127.0.0.1:PORT/index.html` changes the local endpoint; `--core-only` deliberately omits all media checks and is recorded as such. The final evidence is `runMode: full`.

| Task group | Actual rebuilt result and limit |
| --- | --- |
| Shared library | One Import opens Files / Links / Paste text / Connections; failed YouTube fixture cannot be selected as context. No real extraction/provider connection proved |
| Genuine editing and semantic order | Edited reflection survives Write→Design→Write. Changing X placement preserves logical order; keyboard Move down changes `title,reflection,connection,question` to `title,connection,reflection,question`; both immersive and phone draft previews match actual text and stable IDs |
| Inserted chart/video | Newly inserted chart exposes illustrative data; unattached video is explicitly a text placeholder with no playback. This does not prove real hosted-video accessibility |
| Church routing/enrollment | Salem/North persists through verification/profile/enrollment to reader; reminders default off; primary Read action does not require sharing |
| Public-deck boundary and cancel | Fixed approved source r10 deck excludes synthetic edited private draft. Checkbox Space + share-button Enter reveals options; Cancel preserves north church and restores `member-reflection` focus |
| Household conflict | No household account list/name-based merge; alternate provider is described honestly as not started |
| Responsive reading | Phone, reader, share and immersive preview each have document width equal to viewport at 320, 390 and 1280px: 12 layout observations |
| Zero-interaction autoplay | Fresh page/context, AI tab selected, video visible at y316–883 in 1000px viewport, muted, currentTime 0.336→0.897 seconds before any interaction |
| Pause/resume | Pause freezes at 0.277 seconds through 650ms wait; deliberate Resume advances to 0.685 seconds |
| Actual decoding/captions | Local WebM decodes at 1280×720; 14 decoded frames and nine loaded VTT cues observed; this is a real local research workflow recording with simulated extraction/AI |
| Reduced motion | Starts paused at time zero, visible still/fallback, explicit Play works |
| Blocked-autoplay example | Simulated blocked state remains paused with useful fallback and readable transcript; no inference about a particular native browser-policy rejection |
| Actual media failure | Intercepted/aborted WebM request reveals “Media unavailable; transcript remains readable.” Poster/fallback and transcript remain available |

The member role opened the final regenerated [phone](../evidence/member-review-phone-390.png), [edited/reordered reader](../evidence/member-review-reader-390.png), [share options](../evidence/member-review-share-390.png), and [homepage autoplay frame](../evidence/member-review-homepage-1440.png) with `view_image`. It also inspected actual current recording frames for [Import](../mockups/media/frames/02-import.png), [Compose Write](../mockups/media/frames/05-compose.png), and [Compose Design](../mockups/media/frames/08-design.png). Church context, actual edited text, distinct public source, consent and visible AI tab are evident. Write and Design keep the assistant beside the same canvas and retain a visible review request. The reader now uses its authored study title as H1. The final video has one readable native-caption layer, replacing the overlapping captions found during review.

Concrete corrections are preserved in [member-review-corrections.json](../evidence/member-review-corrections.json). The initial rebuilt core run found lost Cancel focus. After UX added post-render focus, the helper waited for the animation frame rather than querying too early. A full run then exposed a real media failure: aborting the source request left fallback hidden because only the video element's error was handled. UX added source-error handling and bounded readiness fallback. Actual PNG inspection also found burned-in and native captions overlapping; UX regenerated clean footage with VTT only. A generic unsaved reader H1 was replaced by the authored heading. All applicable final assertions and final image inspection now pass. One intermediate run had 13 passing groups but changed app/style hashes, so it intentionally exited 1 and was not treated as final stable proof.

## Remaining limits and next validation

The member share concept still previews all four cards in approved order; it does not demonstrate Scripture/quote/chart type choice or an individual/multiple subset selector. These remain acceptance requirements. Copy/Download describe fallbacks, without native OS share, clipboard or social publication. Phone/name samples are readonly; no actual login, SMS, recovery, QR scan, enrollment policy service or Planning Center account was exercised.

Session-only draft previews establish edited-content/order parity inside research, not persisted production approval, database isolation, published snapshots, or device-to-device continuity. The chart is illustrative; study video is unattached. Browser media playback was checked in headless Edge, not all browser/device policies. No 200% zoom, screen-reader hardware/software, real congregant comprehension study or complete accessibility audit is claimed. Fixed desktop screenshots cannot substitute for these checks.

Next recruit real church readers across returning/visitor, shared-device and accessibility needs using fictional studies. Ask them to choose their church, handle an unavailable code, explain reading enrollment versus reminders, read without video, choose a public excerpt and cancel back to their place. Separately check whether a visitor understands from the autoplay demo what is real, what the assistant proposes and what a human must review. Observe task completion and comprehension rather than asking only whether the screens look good.
