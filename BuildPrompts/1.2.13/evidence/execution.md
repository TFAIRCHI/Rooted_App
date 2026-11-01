# Rooted 1.2.13 local execution

Executed October 24, 2026 following the user's implementation instruction. The public website and real local onboarding are integrated into the existing application. This is a local implementation, not a production deployment or commercial signup launch.

## Delivered experience

The anonymous homepage now introduces Rooted with the approved **“Let Sunday take root. All week long.”** design, original illustrations, church/member benefits, family devotions, Before/After Sunday rhythm, process diagram, Power of 4 section, FAQ and getting-started links. The dedicated **“A little input. A helpful head start.”** AI section includes keyboard-accessible simple-request and detailed-notes examples and four brief human-control safeguards. These examples are illustrative and make no model requests.

The approved prototype is adapted into native React markup with scoped public-site CSS. The application does not iframe the research prototype or depend on its preview server. Existing church/editor/member styles and AI workflow code are preserved.

New application routes are `/get-started`, `/sign-in`, `/find-church`, `/sample-study`, `/onboarding` and `/onboarding/complete`. `/` is public; `/dashboard` remains the workspace. Guest workspace and member sign-in links use the supported sign-in experience and retain a bounded destination.

Church creation uses the real authenticated backend, server validation, CSRF and durable command idempotency. A browser test deliberately discards the first successful creation response; retrying the unchanged request produces the same church ID and one membership. First steps use actual church capabilities. New administrators receive no implicit AI, authorship, approval or publication grants. Member entry preserves church reading policy and identity-bound invitations; no private church directory or arbitrary external URL fetching was added.

## Identity integration decision

The research email-code screen is a simulation and was not implemented as authentication. The application uses its existing real OIDC authorization-code flow with PKCE, state, nonce, signed-token verification and server sessions. The current local issuer uses explicitly labeled fictional identities. The existing local username/password option appears only when its guarded development capability is enabled. No email was sent and no email verification implementation is claimed.

Migration [025](../../../backend/migrations/025_auth_continuation.sql) adds a nullable continuation to expiring, single-use auth-flow records. Only allowlisted application paths/parameters survive the callback. External destinations, encoded redirect bypasses and unsupported parameters fail closed. Every destination still applies its own authorization. The migration was applied locally through `npm run db:migrate`; existing tenant/study/conversation data was not reset or reseeded. For application rollback, retain the nullable column; remove it only after no deployed code references it. There is no need to remove church or study data.

## Verification

| Check | Result |
|---|---|
| Pre-change unit baseline | 42 frontend, 35 backend and 4 operations tests passed |
| `npm run typecheck` | Passed, including payload contract verification |
| `npm run lint` | Passed |
| `npm run test:unit` | 46 frontend, 36 backend and 4 operations tests passed |
| `npm run test:integration` | All 53 tests passed with real isolated PostgreSQL |
| Expanded onboarding/invitation integration case | Passed separately after adding expired, revoked and changed-inviter-authority rejection checks |
| `npm run test:e2e` | 16 passed; 2 previously documented member-page failures reproduced; see below |
| Public-site browser acceptance | All 5 passed; [final focused results](public-browser-results.json) |
| `npm run build` | Frontend production build and backend build passed |
| Research documents and package links | Research document validator and package link checks passed |

The [full browser summary](full-browser-results.json) preserves the broad run before focused reruns overwrite the test runner's report. Existing logo/theming, calendar, independent editor recovery, co-writer popup and three-day worker/database creation journeys passed. Co-writer tests used isolated deterministic provider fixtures, not live Azure inference.

The two broad-suite failures match those already documented in [1.2.12 evidence](../../1.2.12/evidence/execution.md): member study-reader color contrast, and a community test expecting the absent sentence “Negative comments that attack or demean others.” Neither assertion was removed and neither member feature was redesigned for this marketing build. The full browser suite is therefore **not fully green**.

Public pages were checked at 1440px and 390px, with homepage overflow checks at 320px, keyboard tab switching, FAQ/sample interactions, and automated accessibility checks on the new pages, setup and first steps. Desktop/mobile screenshots were visually reviewed against the approved references. Automated checks do not constitute a complete accessibility audit.

The existing development stack was restarted with the data-preserving option to load the new backend routes. The [live preview check](live-preview-check.json) confirms all five public routes and the real auth-options endpoint return HTTP 200, and the live sign-in page renders its supported OIDC link. [Final validation](validation.json) summarizes the check counts and explicitly records the two inherited browser failures.

## Review and local use

- [Actual implementation screenshots](README.md), including homepage, both AI examples, signup, setup, first steps and sample devotional.
- Home: **http://127.0.0.1:3000/**
- Getting started: **http://127.0.0.1:3000/get-started**
- Existing workspace: **http://127.0.0.1:3000/dashboard**
- Sample devotional: **http://127.0.0.1:3000/sample-study**

Use the configured `127.0.0.1` development origin for the local OIDC callback. Restart an existing installation with **`npm run dev:existing`**: it applies additive migrations and starts the normal services while skipping fictional seed insertion. The existing `npm run dev` remains available for initial development setup. The separate research server on port 4331 remains optional and is not the integrated application.

## Changed implementation areas

- `frontend/components/public/`: native homepage/get-started/sample markup, shared frame, React tab/reflection interactions, supported sign-in, church-link helper and authenticated onboarding/first steps.
- `frontend/app/`: public entry points, metadata/robots/sitemap, scoped public-site styles; root layout defaults private pages to noindex.
- `frontend/lib/public-metadata.ts` and its tests: explicit production-origin validation; unconfigured/local environments remain noindex.
- `frontend/next.config.ts`: retains church privacy headers and extends private/noindex handling to sign-in and key workspace/onboarding paths.
- Existing login/onboarding wrappers and member sign-in links: reuse the supported flow and bounded continuation.
- `backend/src/auth/continuation.ts`, auth routes and migration 025: safe expiring continuation and development-only sign-in capability discovery.
- Backend unit/expanded integration tests and `frontend/e2e/public-site.spec.ts`; one existing onboarding brand assertion now scopes to the header because the new page also has a footer wordmark.
- `backend/scripts/development.mjs` and root `package.json`: data-preserving restart option for the existing local preview; service banner updated to 1.2.13.

## Production launch prerequisites

Production needs a configured identity provider with actual registration/recovery behavior, approved privacy/terms pages, a chosen public domain, and a commercial access/pricing decision. Email-code sign-in requires verified provider support; it is not silently enabled by this build.

For public indexing, set **`ROOTED_PUBLIC_ORIGIN`** to the approved HTTPS public origin in the deployment environment and rebuild. Without a valid explicit origin, pages/robots remain noindex and no domain is invented. The sitemap includes only the public home, get-started and sample pages; private church/workspace routes are excluded. Local share artwork is included.

No production deployment, new cloud resources, billing, analytics trackers, outbound email/SMS or paid model calls were performed. Model deployment and usage limits were not changed. The saved user studies and private co-writer conversations remain in the existing application.
