# Rooted 1.2.13 — Public website and church onboarding

Prepared October 24, 2026. **Implemented locally and verified.** See the [execution report](evidence/execution.md) and [implemented screenshots](evidence/README.md). The five public-site acceptance journeys pass; the broad browser suite retains two documented member-page failures.

This package turns the approved public-site research into an executable local application build. Introduce Rooted to church leaders and members, explain its AI Study Co-writer, show how Sunday teaching becomes weekday discipleship, and connect getting started to real authentication and church onboarding.

## Execution entry point

[MASTER_BUILD_PROMPT.md](MASTER_BUILD_PROMPT.md) records the executed implementation instructions. The prompt includes the approved design references, scope, integration decisions, preservation requirements, acceptance gates and handoff. Preparing this package does not execute the application build.

| Document | Purpose |
|---|---|
| [Master build prompt](MASTER_BUILD_PROMPT.md) | Complete implementation instructions |
| [Routing and onboarding](ROUTING_AND_ONBOARDING.md) | Public routes, real identity, church creation, member joining and permissions |
| [Traceability](TRACEABILITY.md) | Approved research and screenshots mapped to acceptance criteria |
| [Testing gates](TESTING_GATES.md) | Functional, security, accessibility, visual and regression verification |
| [Phase tracker](PHASE_TRACKER.md) | Execution status and required evidence |

## Approved direction

**“Let Sunday take root. All week long.”** Preserve the warm illustrated design, Before/After Sunday rhythm, family devotion benefits, responsible Power of 4 explanation, and the dedicated **“A little input. A helpful head start.”** AI section with simple-request and detailed-notes examples. Keep **“Helpful AI. Your church stays in charge.”** brief and visible.

Review the [research package](../../research/Public%20Website%20Research/README.md), [full desktop homepage](../../research/Public%20Website%20Research/screenshots/01-home-desktop-full.png), [mobile homepage](../../research/Public%20Website%20Research/screenshots/12-home-mobile-full.png) and [design board](../../research/Public%20Website%20Research/screenshots/00-design-review-board.png).

## Implementation defaults

- Build inside the existing Next.js application and backend; no separate marketing platform or research-preview runtime dependency.
- Keep `/` public and the existing workspace available at `/dashboard` and its other established routes.
- Reuse real OIDC authentication. The research email-code simulation must never become authentication. Match the approved visual shell to the configured provider's supported flow.
- Use existing authenticated church creation for the local getting-started path. Do not introduce prices, subscriptions, a free-trial commitment or a public production signup rollout.
- Keep member joining separate from church creation and preserve identity-bound invitations.
- Preserve current co-writer behavior, existing church branding, studies, conversations, permissions, approval and publication controls.
- No paid AI calls, email/SMS delivery, billing setup, new cloud resources, production deployment or edits to secret files are needed for this build.

Implementation evidence is recorded in this version's [execution report](evidence/execution.md). Existing 1.2.12 evidence remains historical evidence for the working co-writer; it is not proof that this public-site build has passed.
