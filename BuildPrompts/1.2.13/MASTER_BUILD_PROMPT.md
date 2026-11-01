# Master build prompt — Rooted 1.2.13 public website

Execution status: implemented locally following the user's authorization. See the [execution report](evidence/execution.md), [screenshots](evidence/README.md) and [phase tracker](PHASE_TRACKER.md). The instructions below preserve the build scope and acceptance requirements.

## Objective and execution boundary

When the user instructs you to execute this version, implement and verify the approved public Rooted website inside `C:\Users\tyler\Documents\MyChurch`.

A visitor arriving from search should understand what Rooted offers a church and its members, see how pastor-led teaching becomes meaningful weekday Bible engagement, understand the AI Study Co-writer's preparation benefits and human safeguards, and follow a working getting-started or member-joining path. Deliver the actual integrated application, rather than another isolated prototype.

This package currently authorizes preparation only. Once execution is requested, complete the authorized local implementation and verification without repeated phase approvals. Make routine choices using the defaults below, record material deviations, and keep progressing on independent work if a provider-dependent capability is unavailable. Public deployment, paid services and production identity-provider provisioning are outside this build.

## Required reading and baseline

Read applicable `AGENTS.md` files and the local Next.js documentation required by [frontend/AGENTS.md](../../frontend/AGENTS.md) before editing frontend code. Inspect the installed project and existing conventions rather than assuming framework APIs.

Read this package's [routing contract](ROUTING_AND_ONBOARDING.md), [traceability matrix](TRACEABILITY.md), [testing gates](TESTING_GATES.md) and [phase tracker](PHASE_TRACKER.md). Read all six documents indexed in the [approved research package](../../research/Public%20Website%20Research/README.md), including the [AI section specification](../../research/Public%20Website%20Research/05-ai-assisted-study-creation.md) and [CBE evidence guidance](../../research/Public%20Website%20Research/02-power-of-four-evidence.md).

Inspect the approved HTML/CSS/SVG assets and screenshots in that research folder. These are the visual and content reference. The prototype's forms and session-storage simulation are not application contracts. Read current auth/session, onboarding, API helper, church routing, role capabilities, theming and private-cache implementations before integration. Use the current 1.2.12 implementation and [execution evidence](../1.2.12/evidence/execution.md) as the co-writer baseline; older batch-creation instructions were superseded by per-day confirmation behavior.

Record the pre-change test baseline and preserve existing local data. Do not reset/reseed the user's database, overwrite church identity, remove conversations or alter saved studies. Use isolated test fixtures. Do not inspect or print credentials as part of this website task. Do not change `.env`, cloud resources, model deployment, usage limits or provider settings.

## Public homepage

Implement the following approved narrative in order, using the screenshot references in the traceability matrix:

1. **First impression:** Rooted navigation, sign-in, church get-started CTA, headline **“Let Sunday take root. All week long.”**, an immediate explanation of church-led Bible studies and AI preparation assistance, and original sermon-to-phone artwork. A visitor must understand the product before scrolling.
2. **Church and member benefits:** staying connected throughout the week, preparing for an upcoming sermon when the pastor supplies material beforehand, and exploring a sermon beyond the time available on Sunday.
3. **AI Study Co-writer:** the dedicated **“A little input. A helpful head start.”** section. Show keyboard-accessible **Simple request / Detailed notes** examples with a short conversation and proposed plan. Explain less writing from scratch, a consistent teaching thread, audience-appropriate explanations, and complete editable daily drafts in the workspace. These are static explanatory examples, clearly labeled; switching tabs must not call a model or create records.
4. **Brief AI safeguards:** **“Helpful AI. Your church stays in charge.”** Explain agreeing on direction before creation, confirming each day, checking Scripture and teaching before publication, and conversations scoped to the contributor and church. Keep the section compact, adjacent to the AI benefits.
5. **Weekly rhythm:** an accessible **Before Sunday / After Sunday** switch. Show how teaching can prepare a congregation or deepen a delivered message. Keep weekday examples distinct from Sunday attendance; four Scripture-engagement days are not four app opens or a required product schedule.
6. **Faith at home:** family-table artwork, parents and families taking their pastor's teaching home, deeper understanding, reflection and practical application. Include a working link to the fictional sample devotional.
7. **How Rooted helps:** bring an idea or teaching notes → discuss and shape with the AI co-writer → confirm daily drafts and human review → share approved studies → read, reflect and live the teaching. Publication remains a separate human-authorized action.
8. **Power of 4:** use the research package's source-linked wording, restrained graphic and explanation of frequent Scripture engagement. Preserve the observational association qualification and attribution to the Center for Bible Engagement. Do not claim causal proof, guaranteed transformation, app-use equivalence, endorsement or invented percentages.
9. **FAQ, closing CTA and footer:** address preparation before Sunday, frequency, AI authority, church/member getting started and pricing still being established. Every control needs a real destination or an honest explanation. No fake customer logos, testimonials, prices or trial promises.

Retain the approved warm cream, deep teal/navy, lively accent colors, Georgia headings, system body type and original vector illustrations. Reuse the research assets through application-native components or local public assets. Keep public marketing styles scoped so they do not change the editor, Live Preview or member pages. Use responsive layouts at 320px, 390px and desktop widths, meaningful focus states and reduced-motion support. Decorative artwork must not obscure text or create unnecessary screen-reader noise.

## Getting started, authentication and first steps

Implement [ROUTING_AND_ONBOARDING.md](ROUTING_AND_ONBOARDING.md) as the integration contract.

The default local flow is visitor → choose church-leader path → real configured sign-in → authenticated church setup → persisted church and administrator membership → useful first steps. A returning user can sign in and reach the appropriate existing workspace or member experience. Members have a separate church-link/invitation path.

The research email-code page accepts arbitrary six-digit values. Never copy this behavior, synthesize sessions from form values, or treat session storage as proof of identity. Reuse the application's OIDC flow with its existing state, nonce, PKCE and server session protections. If the configured provider supports verified email-code sign-in, use its real supported flow; otherwise adapt the approved sign-in shell to a provider sign-in button. Document the visual deviation and actual provider behavior. Do not add a pretend verification step or provision a new provider/email service just to match a screenshot.

Use real onboarding APIs, server-side validation, CSRF and durable idempotency. Preserve onboarding intent safely across authentication. Do not let a continuation parameter become an open redirect or choose a church permission. Match first-step actions to the authenticated membership's capabilities. Existing church creation grants administrator capabilities, not automatic author/approver/publisher or AI rights; do not expand those grants for marketing convenience. Explain the current team/role setup and link to authorized controls rather than showing a broken Create study button.

Use the existing local self-service church-creation policy for this build. Pricing, commercial access policy and production signup rollout remain unresolved. Do not silently invent a free plan, promotional allowance, payment commitment or unlimited AI access. Preserve existing provider limits and church approval policies.

## Public sample, routing and discoverability

Make `/` an actual public homepage independent of the private workspace's session fetch. Preserve `/dashboard`, `/onboarding`, `/settings`, church-specific routes and normal deep links. Build `/get-started`, `/sign-in`, `/find-church`, `/sample-study` and an authenticated church-scoped first-steps destination using the routing contract. Avoid existing dynamic-route collisions.

The sample devotional is static fictional content that illustrates reading, reflection and application; it is not a route into private production studies. Label it as an example. A public church-link helper must not enumerate private churches or grant membership. Preserve the real reading policy of each church.

Add public metadata, meaningful titles/descriptions, accessible landmarks and local share artwork. Use an explicitly configured validated public origin for absolute canonical/share URLs; never invent a Rooted domain or fall back to a private church hostname. Keep local/test environments noindex. Preserve private/no-store and noindex behavior on church and account pages; do not expose private routes in public sitemaps. Add robots/sitemap output only for the known public routes with environment-aware indexing. Do not publish placeholder legal promises or broken privacy/terms links; record approved legal pages and the public domain as launch prerequisites if not available.

## Preserve current product behavior

Preserve the floating co-writer, Expand/Restore, hamburger categories, blank initial canvas, permanent chat composer, Enter/Shift+Enter behavior, conversation history, source limits, intention confirmation and separate explicit confirmation for each day. No new model calls or AI workflow changes are required for the public site. Marketing copy must reflect current limits and behavior.

Do not advertise automatic YouTube ingestion, audio/video analysis, unlimited transcript input, infallible theology, autonomous publication, guaranteed time savings, zero provider retention or unverified integrations. Short prompts can begin a conversation; draft creation follows source/teaching clarification and agreed confirmations. Preserve church logo/banner rendering, existing member study routing, editorial stages, tenant isolation, invitations and saved studies.

## Implementation approach

Use existing dependencies and application components where suitable. Convert the approved static layouts into maintainable Next.js components; do not iframe the prototype or run the research server as part of the app. Prefer existing APIs; make additive backend changes only where needed for secure continuation or demonstrated integration gaps. If a schema change is necessary, preserve applied migrations and document its rationale and rollback considerations. Do not add billing, transcription, hosted agents, analytics trackers, a CMS or new cloud services.

Follow the phase tracker, recording evidence as each phase completes. Run the checks in [TESTING_GATES.md](TESTING_GATES.md). Add meaningful tests for public routing, identity continuation, church creation, invitation boundaries and permissions; avoid tests that merely mirror static markup. Update obsolete root-login test entry points to the explicit sign-in path without weakening authentication assertions.

## Completion and handoff

Completion requires working public pages in the application, real supported authentication/onboarding, correct role-aware first steps, visual evidence against approved references, and passing relevant gates. Do not count prototype validation as implementation evidence or mark provider-dependent email verification complete without actual provider verification.

Capture the implemented desktop/mobile screens, including both AI examples, safeguards, onboarding and sample reading. Create an execution report with changed files, commands/results, screenshot paths, provider behavior, preserved permissions, any inherited failures and precise remaining launch prerequisites. Update the phase tracker and build index truthfully. Keep the approved research artifacts intact and cross-link the actual implementation evidence.

Finish with a concise user-facing handoff containing local preview URLs, what works, testing performed and material limitations. Do not deploy, send announcements, perform paid calls or claim production readiness as part of this local build.
