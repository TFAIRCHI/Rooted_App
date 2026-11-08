# Option B implementation and release handoff

Recorded 2026-11-04. Local source base: `fe567d8489e157c923f432da7abef99776fa5267` plus uncommitted workspace changes. This is not a commit or a reproducible registry digest. Earlier co-writer work was already uncommitted in this workspace and is included in the images. No Azure migration, image push, Portal revision, or live Twilio send was performed.

## Implemented

- Migration `029_public_study_migration.sql` adds disabled-by-default church gates, immutable schedule publication IDs, independent contact records, consent-audit state, tenant-isolated public reactions/comments/reports/moderation actions, anonymous rate-limit records, and versioned SMS approval snapshots. Existing member engagement remains private. Existing churches already using `reading_policy='public'` retain their current public GET behavior until individually reviewed; new guest participation stays off.
- `/c/{slug}` and `/c/{slug}/studies/{publicationId}` use the existing live-publication check without reader sign-in. Public reactions need no name, can be changed/removed, and are counted approximately. Named comments enter a separate pending moderation queue and show an unverified name only after staff approval. A visitor can remove an approved comment from the same browser. Staff can approve/hide/decline, reply to approved questions, and handle reports. The public reader never loads legacy member comments.
- The Delivery workspace accepts recipient phones without creating member accounts. New contacts begin suppressed; study-text consent requires recorded source, wording version and evidence reference. A creator writes a short note. Another authorized reviewer approves the exact body, registered sender name, canonical reserved-publication URL, STOP line and segment count. The worker creates at most one intent per publication/contact after publication, within 24 hours, and rechecks consent, sender, current approval, quiet hours, budget and authority before Twilio. Editing the note invalidates unsent intents. The old immediate SMS route rejects new intents once this church's public SMS gate is on.
- Staff can pause guest participation, SMS, or public reading. Pausing reading also pauses SMS and suppresses unsent public intents. Staff can remove stored recipient phone ciphertext while retaining a keyed suppression tombstone and historical consent/delivery records. Published study withdrawal and hard delete still remove associated public records.

## Local verification

| Check | Result |
|---|---|
| Backend and frontend lint/typecheck | Passed after implementation |
| Generated payload contracts | Regenerated and verified against current source |
| Backend integration suite | 63/63 passed after the final migration, guest removal and phone-removal changes |
| Backend unit/adapter tests | 41/41 passed after updating stale 12,000-token and 256-KB assertions to the already implemented 25,000-token/6-MB limits |
| Frontend unit tests | 52/52 passed |
| Optimized frontend/backend source build | Passed after the final changes |
| Guest browser journey | Passed: account-free open, reaction, named pending comment, staff approval, visible comment, and private replacement revision |
| Public entry browser journeys | Three targeted tests passed after copy and sign-in expectations were updated |
| Full browser suite | 24/24 passed on a fresh isolated database after updating historic member-only expectations and enabling demo personas only in the E2E fixture |
| Local built-image smoke | Backend `/health/live` and `/health/ready` returned 200; frontend `/find-church` returned 200 with the account-free reader copy |

The first full browser run exposed stale member-only assertions and an E2E fixture with missing demo personas. Those tests now exercise the public reader and current document controls. The final full run passed 24/24. The live Twilio and Azure gates below remain separate from local browser acceptance.

## Local images

| Component | Local and ACR-ready tags | Local image ID |
|---|---|---|
| Backend API/worker/migration | `rooted-backend:option-b-20261104-1`; `rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-backend:option-b-20261104-1` | `sha256:9089349c14289268118bdb5c8bf7c029d98bed24ff58341308a342a63485e706` |
| Frontend | `rooted-frontend:option-b-20261104-1`; `rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-frontend:option-b-20261104-1` | `sha256:9e63511f12d7c6e1a89718412d875adf8a647a00d0912f29f2a2c459ea93d229` |

These IDs identify local Docker images, not ACR manifest digests. The images are tagged locally and have not been pushed. If code changes after these IDs, rebuild and record new IDs before any release.

## November 5 migration image correction

The first Azure migration run using `rooted-backend:option-b-20261104-1` failed with `Applied migration changed: 001_core.sql`. The Windows checkout had CRLF line endings in historical SQL files, while the previous production backend image packaged LF endings. The migration runner correctly rejected the changed byte checksum before applying migration 029. `backend/scripts/copy-assets.mjs` now writes LF line endings for packaged SQL files. A replacement backend image was built locally as `rooted-backend:option-b-20261105-2` and `rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-backend:option-b-20261105-2`, local image ID `sha256:5c3957e3ed04cc1f2e77c53be35de55869176837dbefc7bf24f4508adb21e468`. Packaged migration hashes 001–028 match the previous `pilot-20261028-4` backend image; migration 029 is present. Use the replacement backend tag for the migration job, API and worker. The frontend tag remains `option-b-20261104-1`. The replacement image has not been pushed or run in Azure.

## Pilot rollout order and gates

1. Review a real backup and restore route and capture a read-only count of current public churches, live publications, provider contacts/consent/intents, old member comments and active workers. Avoid exporting phone numbers or comment bodies to the release report. Run migration 029 with privileged migration credentials. Check the migration runner's checksum and `/health/ready` before exposing a new frontend.
2. Deploy the compatible backend API image, then cut over to **one** worker using that same image, then deploy the frontend. Keep public engagement and SMS disabled initially. Older workers should not be restarted against independent contacts/new SMS intents; after such data exists, prefer flags off or a compatible forward fix.
3. Configure a 32+ character `PUBLIC_VISITOR_SECRET` on the backend. For one pilot church, configure the existing Twilio account, authentication secret, sender/from or Messaging Service, encryption key, `TWILIO_CHURCH_ID`, `TWILIO_SENDER_SCOPE`, `TWILIO_SENDER_NAME` (the registered church name) and `TWILIO_ACTIVATION_APPROVED=true`; keep `APP_ORIGIN` equal to the externally reachable HTTPS site. Set a nonzero church SMS segment budget. Register and test exact external inbound STOP and status callback URLs. The current sender registry supports **one church**; tenant-scoped sender secrets are required before expanding to multiple churches.
4. Have the church owner review all live studies and record a moderator/contact. In Settings → Public study access, record the content-review evidence and enable public reading; verify a new private browser and forwarded link. Enable guest participation only after the moderator is ready. Review existing member-only content separately; no historic comments are copied.
5. Audit phone consent individually. A Planning Center phone or church membership alone never grants study-text consent. Add contacts in Delivery, record actual opted-in wording/source/evidence and time-zone basis, then prepare a creator note. A different reviewer must approve the exact preview. Only after sender registration, consent evidence, callback tests and a small pilot audience are verified should the church enable study SMS. Review `provider_send_intents` and Twilio status evidence; queued/sent means neither read nor necessarily handset delivered.
6. Run a real pilot in a controlled window. Test STOP before and after queueing, unknown zones, changed approval, withdrawn publication, timeout/unknown submission and duplicate callbacks. Record ACR manifest digests and Azure revision IDs.

The safe rollback controls are Settings → Public study access → Pause study SMS, Pause guest participation, and Pause public reading and delivery. A copied public study URL or already delivered SMS cannot be retracted. All-church retirement of reader-only sign-in/invitations remains a later contraction stage after intended churches pass the pilot and privacy review. Existing records and sessions are retained for compatibility.

Current pilot limits: the global Twilio sender configuration is scoped to one church; each worker pass considers at most 1,000 opted-in contacts and 20 recent publication snapshots. The guest's browser cookie supports removing their approved comment, while church staff handle requests after that cookie is lost or a publication is withdrawn. Public comment/report retention and independent-recipient export/erasure policy require church privacy review before legacy reader-data contraction.

## November 5 SMS registration change

The operator chose handset keyword opt-in instead of verbal consent. The currently deployed callback handles STOP and delivery statuses, but it does not enroll a recipient from a keyword or perform a confirmation exchange. Do not describe keyword opt-in as active in Twilio campaign registration or activate study SMS until a signed inbound ROOTED/AGREE flow, consent evidence, suppression/resubscription checks, public Privacy Policy and Terms pages, and Twilio webhook/Advanced Opt-Out configuration are deployed and verified. The pilot sender is one Rooted-operated church program; broad multi-church onboarding still needs tenant-scoped sender registration.

### Local keyword candidate

The selected flow is now `ROOTED` then `AGREE` within 24 hours, with exact TwiML replies, signed inbound evidence, and STOP suppression. Migration `030_sms_keyword_optin.sql` stores pending requests; unconfirmed requests cannot grant consent. New public pages `/sms`, `/privacy`, and `/terms` publish the program invitation and policy copy using “Message frequency varies by church.” The [campaign copy](../../../research/member-access-options-20261104/keyword-campaign-registration-20261105.md) records the exact fields and remaining release steps. The focused provider integration test passed (12/12); backend and frontend production builds passed. The public policy text needs operator review before external submission.

Locally built and ACR-tagged, **not pushed**: `rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-backend:sms-keyword-20261105-1` (`sha256:b8fada267946fecbfde32570a89cd77a7568e1b13d1164892ec1e0b1d917887b`) and `rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-frontend:sms-keyword-20261105-1` (`sha256:84a74a92fb9540da9d5ef89bfefc4abdd161d0ec273f302f4c13c735cf1a4f75`). These are local image IDs, not registry digests. Release order: migration job (030), API, one worker, frontend. Keep church SMS disabled until Twilio approval, webhook and consent pilot evidence. The backend still supports one church sender scope; future churches need an ISV sender design.
