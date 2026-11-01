# Rooted public website and church signup exploration

Prepared **October 24, 2026**. **Research and reviewable design prototype only.** This prototype does not create accounts, send email, charge payments, or connect to AI or church records. The separately implemented application is recorded in the [1.2.13 execution report](../../BuildPrompts/1.2.13/evidence/execution.md).

The proposed direction is **“Let Sunday take root. All week long.”** Rooted is introduced as a church-led way to turn sermon teaching into Bible studies, everyday application, and conversations at home.

The approved direction is now prepared for implementation in the [Rooted 1.2.13 build prompt](../../BuildPrompts/1.2.13/MASTER_BUILD_PROMPT.md), with [routing and onboarding defaults](../../BuildPrompts/1.2.13/ROUTING_AND_ONBOARDING.md), [design traceability](../../BuildPrompts/1.2.13/TRACEABILITY.md) and [testing gates](../../BuildPrompts/1.2.13/TESTING_GATES.md). Local application implementation is complete; see the [execution report](../../BuildPrompts/1.2.13/evidence/execution.md) and [actual screenshots](../../BuildPrompts/1.2.13/evidence/README.md). The research prototype remains a separate design reference.

## Start with the visuals

1. [Visual review board](source/review-board.html) or its [screenshot](screenshots/00-design-review-board.png).
2. [Homepage: first impression](screenshots/02-home-desktop-first-impression.png), [complete desktop page](screenshots/01-home-desktop-full.png), and [complete mobile page](screenshots/12-home-mobile-full.png).
3. [Before-Sunday process graphic](screenshots/03-before-sunday-flow-desktop.png) and [Power of 4 section](screenshots/04-power-of-four-desktop.png).
4. [Getting started](screenshots/05-get-started-desktop.png), [sign-in](screenshots/06-sign-in-desktop.png), [email verification](screenshots/07-verify-email-desktop.png), [church setup](screenshots/08-church-setup-desktop.png), and [first steps](screenshots/09-first-steps-desktop.png).
5. [Joining a church](screenshots/10-join-a-church-desktop.png) and [sample devotional](screenshots/11-member-study-desktop.png).

Mobile views also cover [getting started](screenshots/13-get-started-mobile.png), [sign-in](screenshots/14-sign-in-mobile.png), [church setup](screenshots/15-church-setup-mobile.png), and [member reading](screenshots/16-member-study-mobile.png).

The screenshots were captured from the included HTML/CSS prototype; they show actual rendered layouts, not text-only wireframes. All church names, emails and study examples in this package are fictional. The illustrations and proposed sprout mark are original SVG artwork. No stock photos, customer testimonials, partner logos or real member records are used.

The homepage also includes a dedicated **AI Study Co-writer** section: [simple input](screenshots/17-ai-co-writer-simple-desktop.png), [detailed notes](screenshots/18-ai-co-writer-detailed-desktop.png), and [mobile](screenshots/19-ai-co-writer-mobile.png). It explains preparation benefits and keeps safeguards brief.

## Research documents

| Document | What to review |
|---|---|
| [Positioning and homepage plan](01-positioning-and-page-plan.md) | Audience, benefits, complete page narrative, process and calls to action |
| [Power of 4 evidence](02-power-of-four-evidence.md) | Original CBE sources, accurate interpretation and marketing wording |
| [Signup and church onboarding](03-sign-in-and-church-onboarding.md) | Visitor → account → church setup → first steps, with a separate member path |
| [AI-assisted study creation](05-ai-assisted-study-creation.md) | Short prompts, detailed notes, church benefits, complete draft creation and safeguards |
| [Design review and build handoff](04-design-review-and-build-handoff.md) | Visual choices, implementation boundaries, open decisions and validation |

## Click through the prototype

Open [the homepage](source/index.html) directly in Chrome, or start the isolated preview:

```powershell
node "research/Public Website Research/source/preview.mjs"
```

Then open **http://localhost:4331**. The [review board](http://localhost:4331/review-board.html) links the screens. This uses a separate port from the current application.

Use fictional details only. The email-code screen accepts any six digits to demonstrate navigation. This is deliberately a simulation, **not an authentication implementation**. Session storage only carries sample form values between mock pages. The production identity provider, verification behavior, privacy/terms and signup access policy require implementation decisions.

Pricing is intentionally unresolved: there are no invented prices, subscription tiers, free-trial promises or payment forms. The copy says plan options are being finalized and that any paid terms will be shown before commitment.

## Reproduce the artifacts

```powershell
node "research/Public Website Research/source/generate-pages.mjs"
node "research/Public Website Research/source/capture.mjs"
node "research/Public Website Research/source/review-board.mjs"
```

The scripts use the repository’s installed Playwright and local Chrome. [Validation results](validation.json) record responsive checks, working prototype paths and screenshot names. The design is ready for a direction review; public launch and production signup are outside this research deliverable.
