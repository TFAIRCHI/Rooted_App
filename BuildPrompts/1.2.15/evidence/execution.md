# Rooted 1.2.15 — Local implementation and release evidence

Completed locally October 30, 2026. **The real frontend is implemented, verified, and packaged. The image has not been pushed and Azure has not been changed.**

## Review the real implementation

Open **http://127.0.0.1:3081/** while the local Docker preview is running. This is the built production frontend image, not the research server. The six main pages have their own routes and the same shared header. The account and sample-study pages use their existing application components.

This candidate retains `BACKEND_URL=http://rooted-api`, the Azure-internal production target. Its public pages work locally; real account integration was verified separately in the isolated local browser stack. The preview container is not connected to the production API, and its sign-in controls are not a local production login environment.

Preview container: `rooted-navigation-1215-preview`, bound only to `127.0.0.1:3081`. Stop it with `docker stop rooted-navigation-1215-preview`; restart with `docker start rooted-navigation-1215-preview`.

## What changed

- Home is now a compact introduction. Added `/why-rooted`, `/how-it-works`, `/ai-co-writer`, `/power-of-four`, and `/questions` as explicit Next pages.
- A shared public header/footer provides real links, current-page state, a responsive disclosure menu, keyboard operation, and ordinary browser history. Existing public account/sample pages share the shell; the signed-in workspace and member pages retain their own layouts.
- Rebuilt the approved weekly examples, product tour, illustrative co-writer, differentiation/context disclosures, and FAQs in React. All five original fictional-data screenshot assets remain available; only the selected tour image is rendered.
- Preserved the five UX corrections, honest research qualifications, human review, per-day draft confirmation, and church/account scope. The sample study keeps its existing content and reflection action; real sign-in/onboarding/invitation logic is unchanged.
- Updated public metadata, the explicit robots/sitemap allowlist, public screenshot-resource crawling, and older public section links. Private route headers and API rewriting are unchanged.
- Scoped the new CSS to `.marketing-site`. Reset inherited global details padding/summary styling inside that scope to match the approved compact layout, and corrected a low-contrast decorative book label.
- Kept one root skip link. It now focuses/scrolls to main content without introducing a fragment-only App Router history entry, with the native href retained when JavaScript is unavailable.

Changed-file and source evidence: [source-before.json](source-before.json), `source-before/`, [changed-files.json](changed-files.json), and [release-source-manifest.json](release-source-manifest.json). No dependencies, backend behavior, database schema, identity policies, DNS, scaling, or cloud resources changed.

## Verification

| Check | Result and evidence |
|---|---|
| Full frontend ESLint | Passed, exit 0 |
| Frontend TypeScript | Passed, exit 0; production Docker build also completed TypeScript |
| Frontend unit suite | **52/52 passed in 18 files**, including the final source; [unit log](frontend-unit.log) |
| Browser journeys | **9/9 latest results pass** across the focused navigation suite and existing public/account regression suite; [summary](browser-validation-summary.json) |
| Layout matrix | **54 layouts**: six main routes at nine widths, including both sides of the mobile-menu breakpoint; no horizontal overflow; [measurements](layout-validation.json) |
| Automated accessibility | No violations in **18 main-page axe scans** (desktop, 390px, 320px) plus existing entry/sample scans in the public-site test |
| Keyboard/history | Skip/focus, Escape/menu focus return, eight mobile destinations, current account actions, Back/Forward, example switches, expanded detail, product tour, mobile jump links all passed |
| Older entry links | All **16 known fragments**, requested Before/After and AI examples, trust/differentiation disclosure, unknown fragments, and no Back-loop passed |
| No-script public navigation | Passed: visible mobile topic links, normal page navigation, readable server content, native disclosure |
| Real local account regression | Church creation validation, uncertain-response idempotency, actual role/capability checks, invitation identity binding, safe continuation/callback replay, member/workspace entry and sign-out passed with the existing isolated fixture |
| Marketing external activity | Six static marketing pages made no API requests in the layout run; public examples made no writes/live AI calls |
| Production frontend build | Passed `next build`, static-page generation, standalone image packaging; [Docker log](docker-build.log) |
| Candidate-container checks | **72/72 passed**, no browser runtime errors; [release validation](production-candidate-validation.json) and [rendered discovery output](production-discovery.txt) |
| Source identity | All 121 captured inputs still match the recorded build-input snapshot; its SHA-256 is also an image label |

Executed local commands included:

```powershell
npm run lint --workspace=@gather/frontend
npm run typecheck --workspace=@gather/frontend
npm run test:unit --workspace=@gather/frontend
npx playwright test frontend/e2e/public-site.spec.ts frontend/e2e/marketing-navigation.spec.ts
npx playwright test frontend/e2e/marketing-navigation.spec.ts --grep 'navigation, disclosure'
node "BuildPrompts/1.2.15/check-release.mjs"
```

The last full browser run passed eight cases; its remaining navigation assertion incorrectly required HTTP 404 from the existing streamed async catch-all. The assertion was corrected to verify the actual not-found UI, absence of marketing/workspace content, and noindex, then that single case passed in a focused rerun. Application source was unchanged after the full run. The summary preserves each journey’s latest real result and its originating report; it does not present those runs as a single nine-pass command. Earlier failed reports are retained.

Two older 1.2.13 expectations were stale before this change: the sign-in action now uses Member sign in/Verify contributor access, and the accepted administrator release already permits review/publication while denying authoring/AI. Updated selectors and capability assertions to the current source contract, retaining real idempotency, permissions, invitation, and continuation checks. No authentication or role implementation was relaxed.

## Visual comparison

| Default page | Approved 1366×768 | Implemented 1366×768 | Approved 390×844 | Implemented 390×844 |
|---|---:|---:|---:|---:|
| Home | 768px | 768px | 1244px | 1244px |
| Why Rooted | 949px | 964px | 1449px | 1464px |
| How it works | 855px | 870px | 1238px | 1253px |
| AI Co-writer | 870px | 837px | 1448px | 1416px |
| The Power of 4 | 874px | 874px | 1331px | 1331px |
| Questions | 789px | 789px | 1187px | 1187px |

Differences are small: natural image/control rendering adds 15px on two pages; removal of the prototype-only AI note shortens that page. Production replaces the research footer label with a useful next-step link. Body text, detail, and overflow were not clipped to meet height targets. At 320×568, the implemented main pages range from 1215px to 1615px (about 2.14–2.84 screens).

Manually inspected the real rendered Home desktop, Why mobile, and existing sign-in shell alongside the approved reference. Final standalone-image captures are in [production-screenshots](production-screenshots/); broader application and entry captures are in [screenshots](screenshots/) and this evidence folder. All preserved screenshots use fictional/local demonstration data.

## Release artifact

```text
rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-frontend:navigation-20261030-1
```

| Field | Actual value |
|---|---|
| Local image ID | `sha256:cada40492dd89414805358efc375b78ae0132142791b93e64a56183bb6de10f4` |
| Platform / runtime user | `linux/amd64` / `node` |
| Version label | `1.2.15` |
| Build-input snapshot SHA-256 | `9d7fb2ea255238a1d286439a468899f8a7660d1fb79b6a66c54f48a5e7d7bd70` |
| Source identification | Filesystem hashes, not an invented Git commit; no root repository |
| Registry tag availability | Read-only manifest lookup returned “no such manifest” before the local build |
| Registry upload / remote manifest digest | **Not pushed / not available** |
| New Portal revision / traffic | **Not deployed** |
| Proposed revision suffix | `navigation-20261030-1` |
| Last accepted rollback image | `rooted-frontend:pilot-20261028-4`; confirm actual active revision before rollout |

Image inspection: [image-inspect.json](image-inspect.json). The local image ID is not a registry manifest digest.

## Limits and next actions

- Tyler’s review of the actual implementation/release candidate is pending. Then use local Docker upload and the existing Azure Portal frontend revision process. [Exact release steps](../../../deploy/azure/homepage-navigation-release-20261030.md).
- Production smoke acceptance is pending because production was not changed. Only the new frontend needs rollout; the previous 35 acceptance checks remain complete.
- The local candidate cannot exercise the Azure-internal API hostname. Existing isolated-stack real account/proxy checks passed; the real-domain proxy/account confirmation belongs to the short post-rollout smoke check.
- Automated browser magnification and reduced-viewport reflow checks passed. They do not establish every desktop toolbar zoom or assistive-technology combination; no formal accessibility certification or recruited-user study is claimed.
- Unknown single-segment paths still use the unmodified workspace catch-all’s Next not-found boundary. As documented in this installed Next version, a streamed response may carry HTTP 200 while rendering not-found/noindex. This task did not change that existing transport behavior or broaden the workspace route allowlist.
- The temporary E2E frontend/API/identity listeners were stopped after tests. Removed only the four exact disposable databases whose creation timestamps matched the four recorded browser runs, after verifying zero active connections; [cleanup evidence](fixture-cleanup.json). Older fixture databases and the existing local PostgreSQL service were preserved. The local production preview is intentionally left running for review.
