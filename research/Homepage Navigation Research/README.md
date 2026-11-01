# Rooted homepage navigation concept

Prepared October 30, 2026 for Tyler’s review. This research package turns the long public homepage into focused pages with a shared header. It does not change the production website.

**Design approved by Tyler, October 30, 2026; implemented and verified locally.** The [production handoff](production-handoff.md) links **1.2.15 implementation evidence**, the prepared frontend image, and exact release steps. Actual application preview: http://127.0.0.1:3081/. Tyler’s release review/upload/Portal rollout and production smoke acceptance remain pending. The research mockup below stays available as the approved reference.

## Open the mockup

**While the local preview is running:** [Open the interactive homepage](http://127.0.0.1:3090/).

**Without a server:** open [mockup/index.html](mockup/index.html) in your browser. The pages, navigation, example controls, and copied images use relative paths and work locally. No installation is required.

To start the local preview again from the repository root:

```powershell
node "research/Homepage Navigation Research/serve.mjs"
```

This serves only the mockup at `http://127.0.0.1:3090`. Account controls demonstrate the proposed paths; they do not sign anyone in or create accounts.

## What to review

1. Start on **Home**. The product explanation and next step are visible without traversing the whole marketing story.
2. Use the header: **Home · Why Rooted · How it works · AI Co-writer · The Power of 4 · Questions**. Each destination has its own page and URL, with an active-page indicator.
3. On **How it works**, switch between members and the church team, then choose a screen. Open the full-size screenshots if desired, or read the sample study.
4. On **Why Rooted**, switch between before- and after-Sunday examples. Expand the differentiation explanation when you want more detail.
5. On **AI Co-writer**, compare a simple request with sermon notes. This is illustrative; it does not call AI.
6. Narrow the browser to a phone width. The header becomes a menu with the same destinations and account actions. The page remains readable with short vertical scrolling.

For a quick visual overview, open [review-board.html](review-board.html). Full desktop and mobile images are in [screenshots](screenshots/).

## Research and independent review

- [Navigation research and content map](navigation-research.md): rationale, page ownership, tradeoffs, and sources.
- [Initial UX assessment](ux-initial-assessment.md): independent architecture and review criteria.
- [UX prototype review](ux-prototype-review.md): concrete issues, corrections, and re-review disposition.
- [Validation evidence](validation.json): layout dimensions, accessibility scan results, and interaction checks.
- [Independent UX validation](ux-review-validation.json): the reviewer’s separate checks.

## Boundaries

This is a navigation and content mockup for review, not a production build or a full onboarding implementation. The actual application screenshots use fictional demonstration church data. The homepage illustration is decorative. The sample devotional is illustrative. The production account system, authenticated workspace, cloud resources, and resume checklist are unchanged.

## Files and reproducibility

`mockup/` contains nine ready-to-open HTML pages, shared CSS/JavaScript, and five copied WebP screenshots from `frontend/public/showcase`. `build-mockup.mjs` regenerates the HTML and copies those images; it preserves the shared CSS/JavaScript. `check-mockup.mjs` uses the repository’s existing Playwright, Edge, and axe-core installations to record layout and interaction evidence and refresh desktop/mobile captures. The optional preview server uses Node’s standard library.

```powershell
node "research/Homepage Navigation Research/build-mockup.mjs"
node "research/Homepage Navigation Research/check-mockup.mjs"
```

Run the check while the preview server is running. No new dependencies were installed.
