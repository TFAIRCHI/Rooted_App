# Homepage research and product showcase release

Prepared October 28, 2026. Frontend-only change; production deployment is pending. Continue the previously accepted backend `pilot-20261028-3` with its 30-second token tolerance. No database migration, identity setting change or worker rollout is needed.

## What changed

- Research strip directly below the opening hero, before the existing church/weekly-rhythm strip: **228% higher reported odds of sharing faith**, **231% higher reported odds of discipling others**, **416% higher reported odds of giving financially to a church**. Attributed to CBE's four-or-more-days Scripture-engagement research. The visible source/caveat describes survey associations rather than Rooted outcomes or guarantees. Percentages refer to odds, not the share of people experiencing a result.
- A new **Purposeful by design** section positions Rooted around local church teaching, human review, a connected preparation/member journey, and Scripture engagement beyond a content feed. No competitor names, comparisons tables or unsupported exclusivity claims appear publicly.
- **Take a look inside**: interactive audience and step selectors display five actual application screenshots: member church home, published reading view, team dashboard, study publication workspace and calendar/list. The sample-study link offers an existing account-free reading experience. The screenshot walkthrough is not a live signed-in admin sandbox.
- Responsive layouts, keyboard-operable native buttons, selected-state announcements, descriptive image text and a polite live region. Screenshots are compressed WebP assets, loaded with Next Image.

## Research

[Internal positioning report](homepage-positioning-research-20261028.md) contains the CBE evidence and five official competitor profiles: YouVersion for Churches, Dwell for Churches, RightNow Media, Subsplash and Sermon Shots. Vendor-advertised features are not independent effectiveness evidence. Public copy emphasizes Rooted's fit rather than claiming no other product offers sermon-derived devotionals or AI assistance.

Primary public source: [CBE, Bible Engagement and The Power of 4](https://www.odbm.org/en/center-for-bible-engagement/blog/bible-engagement-and-the-power-of-4-a-key-to-spiritual-growth).

## Screenshot provenance

The images in `frontend/public/showcase/` were captured from the running application at **127.0.0.1:3002**, using the isolated disposable PostgreSQL browser-test stack. They contain fictional Grace Community Church data and no production accounts. A study titled **Words of eternal life** was created, submitted to a separate fixture approver, approved and explicitly published through local application APIs. No real AI request, production data writes or live external provider calls were made.

Capture helper: [capture-homepage-showcase.mjs](capture-homepage-showcase.mjs). Start `node backend/scripts/e2e-stack.mjs` from the workspace root first, then run the helper from another terminal. It is fixed to loopback ports, checks the guarded local test endpoint before writes, and uses local fixture personas. It adds fictional records to that disposable database; restart the stack for a clean capture. It uses installed Edge through Playwright. Shut down the stack with Ctrl+C to remove its disposable database.

## Verification / review artifacts

- Frontend TypeScript and targeted lint checks passed; all 52 frontend unit tests passed. Final production Docker build passed.
- Browser checks of both audiences and all five screenshot steps; images decode successfully.
- Desktop full-page automated WCAG A/AA audit: zero violations; not a substitute for manual accessibility review.
- No browser runtime errors during the walkthrough check.
- No horizontal overflow at viewport widths **390px** and **320px**.
- [Validation results](../../research/Azure%20Deployment%20Research/homepage-20261028/validation.json).
- [Opening hero and stats preview](../../research/Azure%20Deployment%20Research/homepage-20261028/homepage-desktop.png).
- [Member showcase preview](../../research/Azure%20Deployment%20Research/homepage-20261028/showcase-member.png).
- [Church-team showcase preview](../../research/Azure%20Deployment%20Research/homepage-20261028/showcase-team.png).
- [Positioning section preview](../../research/Azure%20Deployment%20Research/homepage-20261028/difference-desktop.png).

## Portal revision handoff

Final production image ID (local): `sha256:0d2b1e205594b2d823580aa21c1bcb42e0ed2fe78e4c003157bc2d1d85892fb8`. Production build, TypeScript and targeted lint passed. Production build, TypeScript and targeted lint passed.

Prepared frontend artifact:

```text
rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-frontend:pilot-20261028-3
```

After review, user uploads locally:

```powershell
docker push rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-frontend:pilot-20261028-3
```

Portal → **rooted-frontend-centralus → App → Revisions and replicas → Create new revision**. Use suffix `homepage-20261028-3`; edit container to select `rooted-frontend` / `pilot-20261028-3`. Preserve blank command/argument overrides, environment identity for registry pulls, `BACKEND_URL=http://rooted-api`, `ROOTED_PUBLIC_ORIGIN=https://rooted-together.com`, existing allocation/scaling, port 3000 external ingress and HTTPS/custom-domain settings. Save the container and create the revision. Confirm Running and intended traffic routing.

Accept on the real domain: visible CBE strip and source link; new strengths section; both audience selectors and all screenshot steps; sample-study link; mobile layout; existing sign-in and API proxy. No competitor names should appear on the public page. Keep the previous frontend `pilot-20261027-1` revision/image for rollback. Resume [remaining application tests](../../research/Azure%20Deployment%20Research/resume-20261028.md) after this frontend release is accepted.

## Giving and attendance follow-up

Replaced the loneliness card with CBE’s +416% higher odds of giving financially to a church. This is giving participation odds, not donation amounts, revenue uplift or Rooted efficacy. Rechecked the requested CBE synthesis: church attendance is a control variable, and it does not establish a numerical attendance increase caused by Bible engagement. Added an attendance-oriented invitation to stay connected between Sundays and make gathering again part of the week; no unverified attendance uplift is presented as a research finding. Updated frontend image pilot-20261028-3 supersedes the previous unpushed homepage artifact.

## Stat order and asterisk follow-up

The giving statistic is now farthest left, followed by sharing faith and discipling others. Each percentage has a superscript asterisk linking to the CBE note; matching asterisks precede the nearby source note and the detailed Power of 4 source note. User requested this presentation update after approving the giving/attendance wording. New frontend tag pilot-20261028-3; Portal suffix homepage-20261028-3. Upload/deployment remains a user action.
