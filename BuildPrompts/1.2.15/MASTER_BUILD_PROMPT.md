# Build Rooted 1.2.15: approved public navigation

## Objective and authority

Tyler approved the final Homepage Navigation Research mockup on October 30, 2026 and requested a build prompt and a path to production. When this prompt is invoked for implementation, build that approved design into the existing Next.js frontend, complete the local checks and release preparation, and provide a reviewable handoff for the existing user-operated Docker/Azure Portal deployment process.

This is a frontend marketing-navigation release. Preparing this prompt did not implement or deploy it. Record actual progress in `BuildPrompts/1.2.15/PHASE_TRACKER.md`; keep design approval, local verification, image preparation, registry upload, Portal rollout, and live acceptance distinct.

## Read first

1. `frontend/AGENTS.md` and any newer applicable workspace guidance. Resolve the installed Next package from `frontend/package.json`; read the relevant bundled routing, layouts, linking, client/server, metadata, images, and CSS documentation before writing code. Current installed versions are Next 16.4.2 / React 19.3.1; do not upgrade dependencies for this task.
2. `research/Homepage Navigation Research/README.md`, `navigation-research.md`, and the **final Follow-up status** in `ux-prototype-review.md`.
3. The actual final mockup files: `mockup/*.html`, `mockup/styles.css`, `mockup/app.js`, plus desktop/mobile screenshots and `validation-summary.json`. The implementation must follow the corrected prototype, not the review’s initial screenshots or findings before correction.
4. Existing `frontend/app/page.tsx`, `frontend/app/layout.tsx`, `frontend/app/[route]/page.tsx`, `frontend/components/public/`, public styles, `frontend/lib/public-metadata.ts`, `frontend/app/sitemap.ts`, `frontend/app/robots.ts`, and `frontend/next.config.ts`.
5. Existing `frontend/e2e/public-site.spec.ts`, root Playwright configuration, root `Dockerfile`, `.dockerignore`, and this package’s testing/rollout documents.
6. `research/Azure Deployment Research/resume-20261028.md`: all 35 prior checks are complete. Its current-state record takes precedence over older deployment notes with stale pending items or tags.

## Product and visual contract

Match the approved final mockup’s layout, spacing, typography, colors, illustration, concise copy, content ownership, and interactions. Keep the warm cream surface, deep teal text, green actions, Georgia-style headlines, system body text, and sage/peach/lilac/lime accents. Do not redesign the signed-in application.

Use actual pages with normal URLs and browser navigation. The header may look like tabs but must remain semantic page navigation, not an ARIA tablist. Render a clear current-page indicator and `aria-current="page"`. Sign in and Get started remain persistent actions. On mobile/intermediate widths, use the approved disclosure menu, including those actions; reset its expanded state after navigation, support Escape/focus return, and avoid invisible focusable links. Keep the header accessible while scrolling.

Aim for the approved compact default views: at 1366×768 Home fits one screen and other main pages are approximately 1.03–1.24 screens. At 390×844 they are approximately 1.41–1.72 screens; at 320×568 approximately 2.14–2.85 screens. These are visual benchmarks, not a reason to clip content, shrink readable text, or hide detail. Natural scrolling is required at zoom and when optional content is expanded. Preserve the early mobile shortcuts to the weekly and AI examples.

## Routes and shared shell

| Route | Required content/behavior |
|---|---|
| `/` | Compact approved headline, explicit Bible-study explanation, sermon-to-phone illustration, team CTA, existing member entry link, short topic links |
| `/why-rooted` | Three outcomes including deeper exploration and household use; Before/After Sunday selector; expandable four-point differentiation explanation |
| `/how-it-works` | Concise preparation-to-reading process; member/team product tour with all five existing screenshots; full-size links; existing sample study link; human review note |
| `/ai-co-writer` | Benefits; simple/sermon-notes examples; clarifying question before labeled agreed-plan example; per-day confirmation and editable saved drafts; visible human review and account/church-context explanation |
| `/power-of-four` | Four-day example rhythm; existing numerical highlights and adjacent full attribution/qualifications/source link |
| `/questions` | Six concise expandable answers; sample study and next-step links; current honest pricing wording |
| Existing `/sample-study` | Preserve the working sample content and reflection behavior; integrate the shared public header/footer without replacing it with the simplified research devotional |
| Existing `/get-started`, `/sign-in`, `/find-church` | Retain real functions, intents, validation, access-mode handling and safe continuation. Integrate shared public navigation in their public shell where appropriate. Never use the research mock account choices as application authentication. |

The main header topic order is **Home, Why Rooted, How it works, AI Co-writer, The Power of 4, Questions**. Preserve the approved Sign in/Get started placement. The active state must work on direct load, refresh, client navigation, Back, and Forward, including account action routes.

Use a shared marketing shell and reusable content components. A scoped `MarketingFrame` around public pages is acceptable and avoids moving unrelated application routes. A route group is also acceptable if it introduces no duplicate path definitions or broader routing churn. Do not place the marketing header in the global root layout where it would wrap church/member/workspace screens. Preserve one `main#main`, one H1, and the existing root skip link; avoid duplicate skip links/main IDs.

Current `/[route]` is an allowlisted workspace route. Add the public routes explicitly; do not turn the workspace allowlist into an unrestricted marketing or authenticated catch-all. Unknown routes should retain 404 behavior.

## Preserve real entry and application behavior

- Keep `/dashboard`, `/studies`, `/calendar`, `/settings`, `/c/[slug]`, `/c/[slug]/studies/[id]`, onboarding, invitation flows, and API rewrites functioning as before.
- Preserve sign-in `returnTo`, `access=member|contributor`, safe continuation, provider options, callback/session checks, and existing membership/permissions. Public navigation must not reinterpret or discard account query parameters.
- Home’s member link uses existing `/find-church`; team/primary entry uses existing `/get-started`; sample links use `/sample-study`. Do not add a team/member chooser that changes working authentication behavior merely to match a mock endpoint page.
- Marketing content must render anonymously without waiting for a private session/API request. Illustration, tours, examples, and FAQs have no API writes, live AI, payments, account creation, or provider dependency.
- Retain screenshot assets in `frontend/public/showcase/`; they contain fictional demonstration data. Do not import anything from `research/` at runtime, embed the HTML via iframe, or ship the research server.
- Use ordinary React rendering with limited client components for interactions. Do not carry over raw `innerHTML`, document-wide event mutation, or unscoped global prototype CSS. Scope the new visual rules so existing member, workspace and onboarding styles do not change unintentionally.
- Reuse optimized local imagery/SVG and existing dependencies. Avoid remote font dependencies and loading all five tour images eagerly.

## Content corrections already approved

Carry forward all five fixes from the UX re-review:

1. AI: confirmation for each day before saving an editable draft; church/account scope; teaching/Scripture/wording review before publication; a clarification question preceding the example agreed plan.
2. Why Rooted: deeper exploration plus the four differentiation points—your teaching, human direction, preparation to participation, and a Scripture rhythm beyond the feed.
3. Research: expand Center for Bible Engagement (CBE), keep source/association/odds/outcome qualifications adjacent, distinguish Scripture engagement from app visits, and identify research citation rather than partnership.
4. Mobile: early links to the weekly and AI examples land below the sticky header and place focus predictably.
5. Current page: both content navigation and matching Sign in/Get started actions show current-location state at desktop/mobile sizes.

Retain existing production percentages/order: **+416% financial-giving odds, +228% sharing-faith odds, +231% discipling-others odds**. They are survey associations, not Rooted outcomes, causal effects, guarantees, donation amounts, or percentage-point changes. Use the approved source and qualification; introduce no new numerical or commercial claims. Do not promise automatic video ingestion, automatic AI publication, SMS delivery, or unavailable integrations.

Remove prototype-only wording such as “Navigation concept,” “Research prototype,” “Preview team path,” and “No AI request is sent” from production marketing UI. Preserve meaningful labels such as illustrative conversation, example rhythm, and fictional screenshot data. Do not claim the examples are live generated content. Reuse existing honest pricing language.

## Old links must keep working

Fragments are not sent to the HTTP server. Preserve existing public `/#…` entry links with a small, explicit client-side compatibility map on Home; a server redirect rule alone cannot handle this. Run the map on initial load and relevant hash changes, whitelist known fragments, and use history replacement when forwarding to avoid a Back-loop. Unknown fragments must not be interpreted as arbitrary destinations. Map only public marketing links; do not touch authentication callback or account routing.

| Old fragment | Destination |
|---|---|
| `#why-rooted`, `#the-rooted-difference` | `/why-rooted` or its corresponding details target |
| `#your-week`, `#after-panel`, `#before-panel` | `/why-rooted#example-week`, preserving requested before/after state where specified |
| `#how-it-works`, `#inside-rooted` | `/how-it-works` or its product-tour target |
| `#ai-co-writer`, `#ai-simple-panel`, `#ai-detailed-panel` | `/ai-co-writer`, preserving detailed/simple example state where specified |
| `#power-of-four`, `#cbe-research-note` | `/power-of-four` or its research-source target |
| `#questions`, `#trust` | `/questions`, opening the human-review answer when `#trust` was requested |

Use new-page anchors/search state only where needed, and ensure direct deep loads work. Search current internal links and point them to the new routes, including `PublicFooter`, so legacy compatibility is for incoming older links rather than new internal links. With JavaScript unavailable, keep the essential server-rendered navigation and content usable; no-script fragment forwarding is not required.

## Public discovery and private boundaries

Use `publicMetadata` for the new public pages, with unique titles/descriptions, correct production canonical paths, and existing share-image handling. The root layout currently defaults to noindex; explicitly verify each public page’s rendered metadata overrides it correctly in a production build with the configured HTTPS origin.

Update the explicit allowlist in `app/robots.ts` and the URLs in `app/sitemap.ts` to include all six marketing destinations and retain the already approved public routes. Do not replace the allowlist with a blanket allow of the entire application. Keep local/nonproduction origins nonindexable and preserve private/no-store/noindex handling for sign-in, onboarding, church/member, user, and workspace routes. No private church/account/test paths belong in the public sitemap. Verify generated output from the production image, not just source configuration.

Next’s official [layouts/pages](https://nextjs.org/docs/app/getting-started/layouts-and-pages) and [robots metadata](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots) references are supporting background. Installed bundled documentation is the implementation reference for this pinned project version.

## Verification and handoff

Complete the six gates in `TESTING_GATES.md`. Update existing homepage-specific tests to assert the new page architecture; do not leave tests expecting all sections on `/`, remove meaningful checks to make the suite pass, or overwrite 1.2.13 historical screenshot evidence. New evidence belongs in `BuildPrompts/1.2.15/evidence/`.

Capture actual implemented screenshots at desktop/mobile sizes, compare them with the approved prototype, and record deviations explicitly. Save command results, rendered metadata/robots/sitemap checks, route/fragment evidence, and a changed-file summary. A static prototype pass does not count as an application pass. Do not expose production cookies, credentials, invitation values, or personal data in evidence.

After relevant local checks pass, prepare a uniquely versioned **frontend-only** image using the root Dockerfile and the production build arguments in `PRODUCTION_ROLLOUT.md`. Record image ID, source identification, exact proposed tag, and prior accepted frontend rollback target. Do not invent a Git commit where this workspace has no root repository.

Complete all local implementation/review work before asking for a release decision. Tyler uses local Docker for image upload and Azure Portal for rollout; do not use Azure CLI or initiate cloud configuration changes. No backend/worker image, database migration, schema, identity-policy, network, DNS, or scaling change is planned. If actual implementation reveals a concrete need outside this scope, report that specific dependency rather than quietly expanding the release.

Final implementation handoff: what changed, actual preview location, relevant checks and limitations, exact image/revision handoff, rollback target, and only the remaining production steps. Leave the completed 35-check acceptance resume intact; this version’s tracker owns the new work.
