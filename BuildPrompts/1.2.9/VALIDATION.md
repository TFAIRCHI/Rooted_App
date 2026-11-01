# Rooted 1.2.9 — Research package validation

Prepared 2026-10-21. Validation applies to research documents and the illustrative review prototype only. Application behavior and new implementation gates have not been tested or claimed complete in this version.

## Completed checks

| Command / review | Result | Evidence |
|---|---|---|
| `npm run test:research` | Passed: 36 research Markdown files, 58 source definitions, 128 source references, 14 original PNGs, 8 rendered diagrams and 18 original UI checks; zero errors | [Research validation report](../../research/tools/validation-results.json) |
| `node BuildPrompts/1.2.9/validate-package.mjs` | Passed: this version's Markdown relative links and referenced Markdown anchors resolve | [Package validation report](package-validation.json) |
| `node BuildPrompts/1.2.9/preview/capture.mjs` | Passed: three review screens render, workflow navigation/phone text preview/delete-dialog interaction work, no page script errors | [Prototype report](preview/validation.json) |
| Prototype responsive checks | Passed horizontal-overflow checks for Dashboard/workflow/member at 320 and 768 px; desktop captures at 1440 px; member capture at 390 px | [Prototype report](preview/validation.json) |
| Generated screenshot visual review | Opened and inspected all three real PNG files; readable layout, large sidebar example brand, dates/workflow and member guidance visible | Screenshot links below |

The reports use UTC timestamps; the research/package preparation date is the local 2026-10-21 session date. Passing these checks does not establish full WCAG conformance or implementation-test success.

## Rendered review screenshots

- [Dashboard desktop](preview/screenshots/dashboard-desktop.png).
- [Study workflow desktop with live phone preview](preview/screenshots/study-workflow-desktop.png).
- [Member conversation mobile](preview/screenshots/member-conversation-mobile.png).

The workflow screen demonstrates the earlier Create stage; Dashboard demonstrates a later approved revision of the example Wednesday study. These are independent illustrative states rather than synchronized application data. The brand mark is a typographic example showing available space, not a claimed reproduction of the user's uploaded logo.

To reopen the interactive prototype, open [preview/index.html](preview/index.html) in a browser. Use its top navigation for Dashboard, Study workflow and Member conversation. Side navigation outside these three screens is illustrative and does not implement Calendar/Settings/account actions. Screenshot regeneration uses existing repository Playwright dependencies and installed Chrome; set `CHROME_PATH` if Chrome is elsewhere.

## Evidence limits

Research findings come from inspected source and two parallel read-only specialist reviews, not live mutation of the user's studies. Prototype counts and brand artwork are illustrative. Screenshots, if generated, demonstrate the proposed review UI only. Production changes, migrations, classifier calls, external notifications, and implementation test suites are outside this preparation request.

Known product decisions for review: Sunday–Saturday/month-clipped week convention; policy-breaking definition of negative comments; soft-delete retention rather than physical erasure; unique opens rather than reading completion. Classifier access/thresholds/effectiveness and identifier-retention rollout remain implementation evidence gates. Prior incomplete release evidence remains recorded in [1.2.8](../1.2.8/evidence/implementation-2026-10-21.md).
