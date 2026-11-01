# Rooted product experience storyboard

Research-only, rendered October 31, 2026. Fictional Grace Community Church and fictional people/teaching. The HTML and PNGs explore seven connected product ideas; they do not implement provider, account, media, ingestion, publishing, or social-network services.

Open [the visual storyboard](index.html), or start the optional localhost-only preview from the repository root:

```powershell
node "research/Product Experience Initiative 20261031/mockups/serve.mjs"
```

Then open **http://127.0.0.1:3091**. The static browser storyboard is interactive: choose reviewed sources, switch visual types, reorder the fictional model, preview the same block order, step through phone states, and opt into simulated share options. No personal information is collected. Sample fields are deliberately fictional/read-only where they would otherwise invite credentials or uploads. “Concept” labels remain visible.

## Start with these actual images

| Exploration | Primary images |
|---|---|
| Compact team workspace | [Overview](captures/01-workspace-overview.png), [1366×768 source action](captures/35-compact-source-first-view.png), [1366×768 Studio action](captures/36-compact-studio-first-view.png) |
| Four source paths | [Word review](captures/02-source-word-review.png), [Website](captures/03-source-website-review.png), [YouTube captions](captures/04-source-youtube-review.png), [Excel cells](captures/05-source-excel-review.png), [Empty](captures/06-source-empty.png), [Error/recovery](captures/07-source-error.png) |
| CoWriter and adoption | [Conversation + proposal](captures/08-cowriter-proposal.png) |
| Branded share decks | [Author](captures/09-deck-author.png), [Approved-source review](captures/10-deck-approval.png), [Stale rendition](captures/11-deck-stale.png), [Member share](captures/29-member-share.png), [Opt-in options](captures/30-member-share-options.png) |
| Authentic homepage demo concept | [Desktop](captures/12-homepage-demo.png), [Mobile](captures/33-mobile-demo.png) |
| Separate visual Studio | [Diagram](captures/13-studio-diagram.png), [Chart/data equivalent](captures/14-studio-chart.png), [Video empty state](captures/15-studio-video-empty.png), [Immersive preview](captures/16-immersive-preview.png), [Phone rendition](captures/28-member-reading.png) |
| QR and phone access | [Church QR concept](captures/18-church-qr.png), [Phone welcome](captures/19-phone-welcome.png), [Verification](captures/20-phone-verification.png), [Expired code](captures/21-phone-code-expired.png), [Name confirmation](captures/22-phone-confirm-name.png), [Church ambiguity](captures/23-phone-church-choice.png), [Enrollment](captures/24-phone-enrollment.png), [Pending](captures/25-phone-pending.png), [Identity conflict](captures/26-phone-identity-conflict.png) |
| Visible review conversation | [Desktop](captures/17-review-conversation.png), [Phone](captures/34-mobile-review.png), [1366×768 action entry](captures/37-compact-review-first-view.png) |

The complete [capture manifest](captures-manifest.json) records the local URL, viewport, document dimensions, and overflow/scroll-container information for each capture. Most images are full-page captures so that meaningful content remains visible. The three compact “first-view” captures show the actual 1366×768 viewport without extending the image to include off-screen controls.

## Actual share-card design exports

Four rendered 1080×1080 PNGs are supplied: [card 1](exports/grace-rooted-card-1.png), [card 2](exports/grace-rooted-card-2.png), [card 3](exports/grace-rooted-card-3.png), [card 4](exports/grace-rooted-card-4.png). Both church and Rooted branding are embedded. [Accessible caption](exports/accessible-caption.txt) accompanies them. They are fictional research assets, not approved production cards or an implemented export pipeline. They contain no member information or private reflection.

## Interaction and verification scope

The prototype distinguishes current draft r12 from the deck's separate approved-source r10 example. An author can prepare a draft deck but cannot turn the changes-requested study into an approved public deck. The approver simulation explicitly uses the previously approved source. Member sharing previews all four approved cards in order, one card at a time; individual/multiple-card selection is a future design requirement. Copy/download buttons describe the proposed fallbacks and do not access a social account, clipboard, or downloads API. The research PNG exports above are actual files.

The homepage player is an honest still-frame storyboard with chapter selection and proposed narration. No recorded video or live AI demonstration is supplied. The phone journey is an identity architecture concept: current SMS first-factor support is not claimed. The QR pattern is deliberately non-scannable; its preview link drives the sample journey.

The typed sample block model is rendered by one research function in both immersive and member rendition previews; reorder controls update the research session's fictional block order. This demonstrates the proposed contract, not the actual application's member renderer or persistence. Actual published members must continue receiving only the approved published snapshot, unaffected by draft changes.

See [browser-validation.json](browser-validation.json) for the current results and [UX assessment](../roles/ux-assessment.md) for acceptance criteria and peer-review corrections. All 37 task checks pass; the 35 reflow layouts have no horizontal page overflow, and no script errors or external requests were observed. Checks cover keyboard source selection, confirmation gates, move buttons, actual renderer order, deck revision context, church retention/reload, sharing off by default, cancellation to the reading anchor, revision-specific review replies, first-view desktop actions, and 320/390/800/1024/1440 reflow. An additional [keyboard focus audit](keyboard-focus-validation.json) checks 57 focused controls at 1366×768; all remain unobscured by the action rail after adding appropriate scroll padding/margins. No backend/provider behavior is certified by these tests.

## Reproduce PNGs and checks

With the isolated preview running:

```powershell
node "research/Product Experience Initiative 20261031/mockups/capture.mjs"
```

The script uses the repository's already-installed Playwright/Edge. It writes captures, exports, manifest, and validation **only inside this mockups folder**. Browser requests are restricted to localhost; external requests are blocked and recorded. No package installation, build, deployment, identity connection, or production browsing is needed. The `refine-*.mjs` and `finalize-block-renderer.mjs` files record one-time research editing steps and are not regeneration commands.
