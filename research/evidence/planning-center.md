# Planning Center primary-source evidence

Accessed **2026-10-18** using web tools. IDs S01–S11 appear in the [source register](../sources.md). Confidence describes documentary support, not a live integration result. Claims are deliberately narrow; source content and permissions may change. No authenticated API requests were executed.

## S01 — Authentication

- **Exact URL:** https://api.planningcenteronline.com/docs/overview/authentication
- **Accessed:** 2026-10-18
- **Confidence:** High.
- **Claim:** Product-scoped OAuth/PAT access, user-dependent permissions, PKCE, refresh/revocation and scope-free Current identity are documented.
- **Limitations:** Does not establish ordinary Church Center member OAuth eligibility, silent session reuse, OIDC/SAML, or tenant membership authorization. No flow was exercised.

## S02 — Episode - Publishing API - Planning Center

- **Exact URL:** https://api.planningcenteronline.com/docs/apps/publishing/versions/2024-03-25/vertices/episode
- **Accessed:** 2026-10-18
- **Confidence:** High.
- **Claim:** Documents episode metadata, associations, pagination, CRUD and a signed sermon-audio download action.
- **Limitations:** Real permissions, field completeness, download expiry and transcript availability were not exercised. Publication dates need not equal preached dates.

## S03 — New: Publishing Sermons API - Planning Center Changelog

- **Exact URL:** https://www.planningcenter.com/changelog/publishing/25080772906139-new-publishing-sermons-api
- **Accessed:** 2026-10-18
- **Confidence:** High for the historical announcement.
- **Claim:** April 22, 2024 launch confirms Episode/EpisodeTime lifecycle webhooks and initially read-only sermon endpoints.
- **Limitations:** Not a current capability catalog. S02 now documents writes; exact event subscription strings are not established here.

## S04 — Rate Limiting - Planning Center

- **Exact URL:** https://api.planningcenteronline.com/docs/overview/rate-limiting
- **Accessed:** 2026-10-18
- **Confidence:** High.
- **Claim:** Default per-user request limits, high-offset restriction, adaptive headers and HTTP 429 retry guidance are documented.
- **Limitations:** Defaults are not contractual capacity; endpoint-specific and dynamically adjusted limits may differ. No load test was performed.

## S05 — Webhooks - Planning Center

- **Exact URL:** https://api.planningcenteronline.com/docs/overview/webhooks
- **Accessed:** 2026-10-18
- **Confidence:** High.
- **Claim:** Documents user-bound visibility, POST delivery, acknowledgement/deactivation, retries, HMAC authenticity and no present webhook rate limits.
- **Limitations:** Does not establish exactly-once delivery, ordering, a signed freshness timestamp, or complete Publishing change coverage. Retry wording describes up to 16 retries but also deactivation after 16 consecutive failures; verify the terminal attempt behavior rather than relying on an exact count.

## S06 — AvailableEvent - Webhooks API - Planning Center

- **Exact URL:** https://api.planningcenteronline.com/docs/apps/webhooks/versions/2022-10-20/vertices/available_event
- **Accessed:** 2026-10-18
- **Confidence:** High for discovery schema; unknown for live event inventory.
- **Claim:** Available-event collection exposes event names, applications, resources, actions and versions.
- **Limitations:** Reference examples are placeholders. Authenticated discovery is required to record actual current Publishing names; none were retrieved.

## S07 — NoteTemplate - Publishing API - Planning Center

- **Exact URL:** https://api.planningcenteronline.com/docs/apps/publishing/versions/2024-03-25/vertices/note_template
- **Accessed:** 2026-10-18
- **Confidence:** High.
- **Claim:** Episode note templates expose authored text and state; read and update endpoints are documented.
- **Limitations:** No automatic speech transcript, timed captions, personal congregant-note export, or text fidelity guarantee is established. Format and permission behavior need a test.

## S08 — Add and manage episodes

- **Exact URL:** https://help.planningcenter.com/en/139229-add-and-manage-episodes.html
- **Accessed:** 2026-10-18
- **Confidence:** High.
- **Claim:** Staff can maintain episode details, speakers, media, external links and manually entered sermon notes.
- **Limitations:** UI instructions do not establish equivalent API behavior, automatic transcription, or a church's rights to reuse recordings and notes.

## S09 — Set up Church Center and Publishing

- **Exact URL:** https://help.planningcenter.com/en/179950-set-up-church-center-and-publishing.html
- **Accessed:** 2026-10-18
- **Confidence:** High.
- **Claim:** Church Center navigation can contain custom pages and external URLs managed through Publishing.
- **Limitations:** Link support provides no documented identity assertion, token transfer, or destination authorization. Mobile/browser behavior requires a device test.

## S10 — Log in to Church Center

- **Exact URL:** https://help.planningcenter.com/en/141275-log-in-to-church-center.html
- **Accessed:** 2026-10-18
- **Confidence:** High.
- **Claim:** Church Center uses passwordless phone/email verification-code login, with regional and age restrictions.
- **Limitations:** Describes Church Center's own session, not external OAuth eligibility or seamless third-party SSO. Test with an eligible adult ordinary member.

## S11 — New: Member and Link-Only Pages - Planning Center Changelog

- **Exact URL:** https://www.planningcenter.com/changelog/publishing/25149236642459-new-member-and-link-only-pages
- **Accessed:** 2026-10-18
- **Confidence:** High for the documented feature; current configuration untested.
- **Claim:** Custom pages can restrict access by membership type; link-only pages are accessible to anyone with their URL.
- **Limitations:** Historical announcement does not prove current subscription/configuration details or protect a linked external application. Destination access needs independent enforcement.
