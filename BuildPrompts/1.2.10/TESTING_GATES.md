# Rooted 1.2.10 — Testing and acceptance gates

All gates are proposed and **not yet executed**. See [research](../../research/24-church-member-home-and-figma-reference.md), [UX](MEMBER_HOME_UX_SPEC.md), and the [build prompt](MASTER_BUILD_PROMPT.md). Existing test scripts and project instructions must be confirmed before execution.

## Phase 0 — Figma access and baseline

| ID | Acceptance criterion | Required evidence |
|---|---|---|
| R01 | Actual Figma frame(s) are visible to reviewer; desktop and mobile states are identified | Frame URLs/names and captured reference screenshots |
| R02 | Layout, visual tokens, study-card anatomy, navigation, empty/loading/error states, and interaction behavior are mapped without assumptions | Approved design inventory cross-linked to UX specification |
| R03 | Current signed-in/public member routes, church membership, read policy, live publication filtering, and theme behavior are verified | Route/data notes and baseline tests; no role/tenant bypass |
| R04 | If access is unavailable, work stops before application source edits | Blocker is recorded; user request for screenshots/access is made |

## Phase 1 — Home behavior and authorization

| ID | Acceptance criterion | Required evidence |
|---|---|---|
| H01 | Signed-in member sees only live published studies in the selected church | API + browser fixture test with at least two tenants |
| H02 | Draft, in-review, scheduled, withdrawn, deleted, or replaced non-live content never appears | Negative fixture tests for each relevant state |
| H03 | Public reading policy remains public only where configured; member-only church content requires an authenticated member session | Unauthenticated/member/nonmember authorization tests |
| H04 | Signed-in member retains target church on return from login; multi-church identity never silently selects an arbitrary church | Login redirect and multi-membership browser tests |
| H05 | Clicking each study opens the correct detail; browser back returns to church feed; sign-out still works | Browser journey with direct-link and navigation checks |
| H06 | Empty feed is distinct from loading and service failure; retry keeps church context | API failure/empty fixtures and accessible browser assertions |
| H07 | No unsupported progress, “continue reading,” private comments, moderation status, or fake analytics are presented | UI/data contract assertions |
| H08 | Dates are formatted from a verified church time zone/canonical local date; DST/date-boundary fixtures are correct | Zone and serialization unit/E2E tests; no hard-coded New York formatter |

## Phase 2 — Visual fidelity and accessibility

| ID | Acceptance criterion | Required evidence |
|---|---|---|
| V01 | Implementation screenshot matches approved Figma composition and major spacing/type/color/brand choices | Side-by-side desktop and mobile images with reviewer checklist |
| V02 | Layout tested at 320, 375, 768, and reference desktop widths, plus 200% zoom | Viewport captures and no horizontal overflow/clipped controls |
| V03 | Keyboard can reach and activate every navigation/study action; focus is visible and returns logically | Manual keyboard pass and automated interaction test |
| V04 | Page has semantic landmarks, single page heading, ordered headings, descriptive links/images and status announcements | Automated accessibility scan plus manual screen-reader spot-check |
| V05 | Touch controls meet WCAG 2.2 SC 2.5.8 minimum or spacing exception; 44px comfort target used where practical | Measured controls and spacing review [S74] |
| V06 | Color is not the only state cue; contrast, church theme, logo variants, long names, and absent logo are reviewed | Theme matrix, contrast evidence and screenshot review |

## Phase 3 — Regression and release evidence

| ID | Acceptance criterion | Required evidence |
|---|---|---|
| E01 | Existing focused unit tests pass | Command, exit code, count |
| E02 | Existing integration tests pass with tenant/public-policy cases | Command, exit code, count |
| E03 | Relevant and full E2E regression passes, including login → member home → study → engagement → sign-out | Playwright output and screenshots |
| E04 | Typecheck, lint, build, and research/build-package validation pass | Commands and exit codes |
| E05 | No real member data is included in screenshots/logs; no new migration/provider integration without approval | Artifact review and schema diff |
| E06 | Phase tracker and final evidence state only what was observed; human review is not replaced by automated axe checks | Updated phase/evidence record |

## Release blockers

- Figma reference cannot be viewed or screenshots are not provided.
- Any nonmember can read a `members`-only church's publication.
- A draft, scheduled, withdrawn or deleted study appears in the member home.
- Cross-tenant member data or private moderation content is exposed.
- Critical keyboard, responsive, or study-navigation flow is broken.
- A test suite fails and the cause is unresolved or the test has been weakened to pass.
