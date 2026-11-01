# A focused page for each question

October 30, 2026. Scope: the public marketing homepage shown in Tyler’s screenshot. “Home Search Page” is treated as the public home page; this concept does not introduce a search engine or change the signed-in dashboard.

## Recommendation

Replace the four long-page anchor links with a shared page navigation bar. Keep the familiar topics, add an explicit Home destination and Questions, and give each topic a separate URL. Retain the existing cream, teal, green, editorial typography, sermon-to-phone motif, and church-led product positioning.

The header is split into a compact brand/action row and a clear topic row. Its active underline tells visitors where they are. The header stays available while scrolling. On narrower screens, an expandable menu contains all destinations, Sign in, and Get started. Pages keep natural document scrolling so small screens and enlarged text remain usable.

The intended improvement is less hunting through unrelated sections. This is a design hypothesis supported by the architecture review, not a measured usability or conversion result. Splitting pages also introduces additional navigation clicks; visitors who prefer scanning the whole story may find the original layout faster. The Home summary, clear topic labels, and familiar browser Back/Forward behavior reduce that tradeoff.

## Why real page links

The requested “tabs” are expressed visually as a navigation bar, implemented as ordinary links to separate pages. Each page has a unique address, title, heading, and current-location state. Visitors can reload, bookmark, open another tab, and use Back/Forward. In-page example switches remain buttons.

W3C’s navigation guidance supports semantic navigation and `aria-current="page"` for the current item. Typical website navigation does not need the keyboard model of an application menubar. See [WAI menu structure](https://www.w3.org/WAI/tutorials/menus/structure/) and [WAI disclosure navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/). This prototype uses those principles; it does not claim full assistive-technology certification.

## Content ownership

| Existing homepage material | Proposed destination | Treatment |
|---|---|---|
| Brand, main promise, product definition, sermon-to-phone illustration | Home | Compact introduction and useful next steps |
| Connection after Sunday, preparation before Sunday, deeper exploration | Why Rooted | Three concise outcomes |
| After-Sunday and before-Sunday weekly rhythm | Why Rooted | User-selected example, no automatic rotation |
| Household conversation and practical response | Why Rooted | Integrated into the third outcome |
| Four product differentiators | Why Rooted | Expandable explanation: church teaching, human direction, preparation to participation, rhythm beyond the feed |
| Notes → plan → review/share → read/reflect | How it works | One concise process sentence plus concrete application walkthrough |
| Member home/read screens; team dashboard/editor/calendar | How it works | Audience and screen controls; all five real screenshots remain available |
| Public sample reading experience | Sample study, linked from How it works and Questions | Standalone short example, no account needed |
| AI benefits, request examples, saved drafts, church context, human review | AI Co-writer | Two example requests, clarification before an agreed plan, visible review safeguard and optional context detail |
| Four-day rhythm and research highlights | The Power of 4 | Separate source-oriented page, qualifications adjacent to figures |
| Six practical FAQs, including pricing and member access | Questions | Expandable answers so detail is requested deliberately |
| Repeated invitations to begin | Persistent Get started and relevant page links | Repetition compressed, team/member paths distinguished |
| Footer links and brand closing | Shared compact footer | Kept short; main discovery remains in the header |

This is editorial consolidation, not a word-for-word migration. Meaningful topics have destinations; repeated paragraphs, repeated headings, and decorative sections are not reproduced in full.

## Proposed route map

| Research file | Suggested future production route | Main visitor question |
|---|---|---|
| `index.html` | `/` | What is Rooted? |
| `why-rooted.html` | `/why-rooted` | Why use it for our church? |
| `how-it-works.html` | `/how-it-works` | What do the team and members do? |
| `ai-co-writer.html` | `/ai-co-writer` | How does AI assist, and who decides? |
| `power-of-four.html` | `/power-of-four` | Why encourage a Scripture rhythm? |
| `questions.html` | `/questions` | What else do I need to know? |
| `sample-study.html` | Existing `/sample-study` | Can I try reading a study? |
| `get-started.html` | Existing `/get-started` | Am I setting up a church or joining one? |
| `sign-in.html` | Existing `/sign-in` and member entry path | Where do I sign in? |

Routes are proposals, not deployed URLs. Get started and Sign in deliberately stop at explanatory prototype choices. Production would retain the current real account and member-entry flows.

## Scroll and accessibility approach

Aim for one desktop screen of primary content with brief additional scrolling where needed. Do not force a fixed-height canvas or hide overflow to create that appearance. On phones, stack the explanation before large artwork; keep every topic accessible through the sticky header. Mobile shortcuts on Why Rooted and AI Co-writer lead directly to their examples.

W3C’s [Reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) explains why enlarged content should remain usable without two-dimensional scrolling at a 320 CSS pixel width. This concept therefore permits vertical growth at narrow widths and zoom. A 640px viewport is also checked as a reduced-width reflow scenario; that check is not the same as manually testing every browser zoom and screen-reader combination.

The shared shell includes a skip link, one H1 per page, visible focus, named navigation, active-page state, and an expandable mobile menu with Escape/focus return. Example selectors expose their selected state. FAQs use native disclosure elements. Research qualifications and fictional-data labels are part of the visible content.

## Research claim handling

The numerical highlights carry forward existing production copy in the same order: +416% financial giving, +228% sharing faith, and +231% discipling others. They are described as reported odds associated with Scripture engagement, not Rooted outcomes, amounts of money, causal effects, or guarantees. App visits are not a substitute for meaningful Scripture engagement. The full Center for Bible Engagement name and an adjacent qualification remain visible.

The linked source is the existing [CBE Power of 4 article](https://www.odbm.org/en/center-for-bible-engagement/blog/bible-engagement-and-the-power-of-4-a-key-to-spiritual-growth). That page returned an empty application shell to this research browser, so this task does not independently revalidate the percentages. Prior source analysis is in [Public Website Research: evidence](../Public%20Website%20Research/02-power-of-four-evidence.md) and [October 28 positioning research](../../deploy/azure/homepage-positioning-research-20261028.md). No new quantitative claim was introduced for this navigation concept.

## Review outcome and limits

The explicitly requested UX agent first assessed the architecture, then independently inspected the rendered prototype and interactions. Its findings and correction status are recorded in [ux-prototype-review.md](ux-prototype-review.md). The parent agent also captured desktop/mobile screenshots and checked page links, history, menus, examples, disclosures, and default layouts. Use [validation.json](validation.json) for exact measured dimensions rather than treating “one screen” as universal.

Automated accessibility scans are limited evidence. This review does not include recruited visitors, screen-reader user testing, conversion testing, production performance testing, or a production migration. Tyler’s review comes before implementation.

## Implementation notes for after approval

If this direction is approved, create a shared marketing layout in the existing frontend and migrate one content owner per route. Preserve existing account/member flows. Handle old `/#why-rooted`, `/#how-it-works`, `/#ai-co-writer`, and `/#power-of-four` entry links deliberately so existing references still reach their intended material. Give the new pages appropriate metadata, internal links, and canonical paths. Those changes are outside this research-only delivery.
