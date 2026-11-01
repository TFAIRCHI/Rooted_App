# Design review and implementation handoff

The user approved this direction, including the dedicated AI benefits and safeguards section. [Build version 1.2.13](../../BuildPrompts/1.2.13/README.md) turns it into an executable local implementation package. Its [routing contract](../../BuildPrompts/1.2.13/ROUTING_AND_ONBOARDING.md) resolves defaults for real authentication, local church creation and member entry while preserving unresolved commercial and production launch decisions. Local implementation is complete; the [execution report](../../BuildPrompts/1.2.13/evidence/execution.md) records verification, supported real sign-in and remaining production launch prerequisites.

## Visual direction

Warm editorial typography, cream surfaces and deep teal preserve a connection to the current Rooted application. Sage, lilac, peach and a lively yellow-green bring energy to the public introduction. Original vector illustrations make the story visible: a sermon becomes a week on a phone, and a shared passage becomes a conversation at a family table.

| Element | Proposed treatment |
|---|---|
| Primary colors | Cream `#f7f5ed`, ink `#19383e`, teal `#236e5b`, navy `#17353e` |
| Accent | Yellow-green `#e8edaa`, with sage, lilac and peach supporting illustrations |
| Type | Georgia headlines and system sans-serif body; no remote font dependency |
| Brand | Existing Rooted wordmark, with an optional original sprout symbol for review |
| Graphics | Original SVG icons, church-to-phone scene, family/table illustration and four-day visual |
| Interaction | Before/After Sunday tabs, expandable FAQ, clear link destinations, local form progression |
| Mobile | Stacked illustrations/cards, a vertical weekly rhythm, large controls and readable forms |

The mark and illustrations are draft creative directions, not assertions of approved brand assets. The sample church is fictional and is not a testimonial or customer logo.

## Review decisions

1. Does **“Let Sunday take root. All week long.”** express the product clearly enough alongside the Bible-study description?
2. Does the balance of church-team benefits and member/family benefits feel right?
3. Is this warm, illustrated style sufficiently fun and exciting, or should the next iteration introduce photography or stronger motion?
4. Should “Before Sunday” or “After Sunday” be the default example? Both are included; After Sunday currently leads.
5. Should the optional sprout mark remain, or should the established wordmark stand alone?
6. Is email-code sign-in the desired account experience, subject to identity-provider support?
7. What should Get started mean before pricing is established: pilot request, interest registration or immediate workspace creation with a defined allowance?

These are decisions for reviewing the delivered concept, not blockers that prevented creating the research or screenshots.

## What is built here

Eight static pages, original SVG graphics, nineteen page/section screenshots and a visual review board. The local prototype demonstrates real layout and navigation. It has no application API, payment, email, AI or database connection. Mock account and church values are held only in browser session storage. This keeps the proposed visuals reviewable without changing the user's current site.

The [capture script](source/capture.mjs) generates the page images and records [validation results](validation.json). Checks cover the tabs and arrow-key operation, leader signup navigation, verification simulation, live church preview, setup completion, separate member path, reflection control, browser errors and horizontal overflow. Home is checked at 320px and 390px; desktop captures are 1440px wide. This is not a completed accessibility audit or production security test.

## Production integration after direction approval

The current [root page](../../frontend/app/page.tsx) renders the application dashboard workspace, whose unauthenticated state is a login screen. A public marketing page therefore needs a deliberate route change. Keep the authenticated dashboard at its existing explicit route; do not place the product introduction behind an initial session fetch.

The existing [onboarding component](../../frontend/components/onboarding.tsx) already separates church creation from invitation acceptance. Reuse those real server contracts when implementing the approved experience. Changing a prototype form to say “verified” is not a substitute for the identity provider’s callback and session checks.

The current [Next configuration](../../frontend/next.config.ts) applies private/noindex handling to church pages. Keep that boundary when making the public homepage indexable. Choose the public domain, canonical URLs and open-graph image at implementation time. Prototype pages deliberately remain `noindex,nofollow`.

Implement the marketing surface independently of member/editor styles to avoid cascading design changes. Keep church theming within church experiences. Use the real backend for slug validation, timezone validation, permissions, invitations and idempotent creation. Production needs route-level loading, errors, expired-code handling, existing-account and occupied-slug cases beyond these happy-path screenshots.

## AI preparation value

The dedicated [AI Study Co-writer specification](05-ai-assisted-study-creation.md) expands the public introduction with simple-request and detailed-notes examples, practical church-team benefits and a small safeguards strip. The homepage includes both interactive examples. Keep the distinction between beginning a conversation with minimal input and creating a reviewed study from an agreed teaching basis.

## Feature/copy boundaries

Market the implemented notes → reviewed drafts → explicit publication workflow. Keep automatic YouTube/transcript ingestion, default SMS delivery, social proof, commercial terms and any unverified integration out of launch promises. The upcoming-sermon option depends on the pastor providing teaching material in advance. The “Power of 4” section follows the [evidence guidance](02-power-of-four-evidence.md), not app-usage or spiritual-outcome guarantees.

No production rollout, account connection, announcement or publishing has been performed as part of this exploration.
