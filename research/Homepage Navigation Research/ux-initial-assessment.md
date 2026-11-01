# Initial UX assessment: focused public pages

Prepared October 30, 2026 from local source and existing research. Scope: independent architecture advice for a reviewable research prototype. No production files, live site, accounts, or external sources were accessed or changed.

## Finding

The current homepage has the right material but asks visitors to traverse a large narrative to find it. Its header exposes only four anchor destinations, while the actual page also contains research highlights, a four-part differentiation section, a five-screen product walkthrough, the weekly rhythm, household benefits, FAQs, and repeated invitations. Converting these sections into full pages will improve deliberate exploration only if the pages are also edited for a focused first view. Moving every existing section unchanged onto separate pages would leave several long landing pages.

The first screen must still say that Rooted turns a church's teaching into reviewed Bible studies for the week. The poetic headline, warm illustration, and clear Bible-study description should work together. The study co-writer helps prepare content; the church confirms, reviews, and publishes it.

## Recommended architecture

Use one shared marketing header on every proposed public page: Rooted home link, the existing four familiar subjects, Sign in, and Get started. Make the active destination explicit. The home logo provides a clear Home destination; a separate Home item can be retained if the resulting header remains comfortable at intermediate widths.

| Destination | Visitor's question | First-view content | Optional depth |
|---|---|---|---|
| Home | What is Rooted, and where do I begin? | Existing headline, concise Bible-study description, sermon-to-phone illustration, Get started, and See how it works | A compact set of links to the four subjects; no repeated full sections |
| Why Rooted | Why would this help our church? | Three core outcomes: connection between Sundays, preparation for Sunday, and deeper exploration | Concise differentiation, household use, and Before/After Sunday examples; expose one supporting example at a time |
| How it works | What does our team do, and what do members receive? | Four-step notes → co-writer → human review/publication → member experience | Product walkthrough with audience/step controls, sample study, and relevant FAQs |
| AI Co-writer | What can AI help us prepare, and who stays in charge? | Practical benefit summary, one illustrative conversation, and the human-control statement | Simple request / Detailed notes switch, confirmation safeguards, and a process link |
| The Power of 4 | Why encourage a Scripture rhythm through the week? | Four-day visual, attributed research summary, and the limitation beside the claim | Existing meaningful research highlights, clear source links, and fuller interpretation notes |

This is a content ownership map, not an instruction to fit all listed depth into one visible panel. The parent prototype can use a separate Example week or Product tour page if the How/Why pages otherwise exceed the scroll target. Any added page must remain available through the same header or a clearly labeled header submenu, rather than being reachable only through the footer.

Sign in and Get started are persistent actions, not content tabs. Preserve the distinction between creating a church and joining one. A member should be able to find the existing join path through Get started and a clear text link without reading the entire public story. The sample devotional remains accessible without an account.

The existing `PublicFrame` is an onboarding frame with a minimal header, and `PublicHome` duplicates its own header/footer. For the research mockup, demonstrate a shared marketing shell consistently across all focused pages. Treat the production frame as a reference, not permission to edit it.

## Content and visual guardrails

- Retain cream surfaces, deep teal, Georgia-style editorial headlines, system body text, original sprout/sermon-phone/family graphics, and supporting sage/lilac/peach accents. Avoid introducing a dashboard appearance into the public marketing pages.
- Preserve meaningful content by assigning it a visible destination. Compress repetition first: repeated church-control paragraphs and calls to action can become one compact explanation per page.
- Keep actual application screenshots legible and label fictional demonstration data. A shrunken screenshot cannot carry the explanation; its nearby text should explain the task it depicts.
- Keep research claims and their qualifications together. The current production source contains prominent percentage highlights, while older research advises a qualitative lead. Preserve their meaning in the research page without elevating an unqualified statistic into the new home hero. This review does not independently revalidate those numerical claims.
- Keep existing capability limits: supported notes and outlines, editable drafts, church review before publishing, an illustrative weekly schedule, and unresolved pricing. Do not add automatic ingestion, autonomous publishing, guaranteed outcomes, or invented commercial terms.

## Success criteria for review

| Area | Observable acceptance criteria |
|---|---|
| Desktop first view | At 1440×900 and 1280×800, every page shows the shared header, active location, page heading, main explanation, and useful primary action without scrolling. The home hero's main CTA and its essential phone illustration fit together. |
| Minimal scrolling | Aim for one screen of core content and no more than roughly 1.5 viewport heights for the default desktop page, including the compact footer. Longer supporting content is deliberately requested through a well-labeled control. Report page height and overflow instead of claiming every page is one screen. Never enforce height by clipping content. |
| Intermediate widths | At 1024px and approximately 800px, the header reflows or switches to a menu before labels collide. No wrapping nav labels, overlapping actions, clipped artwork, or horizontal page scrolling. |
| Mobile first view | At 390×844 and 320×568, the brand, menu, heading, concise product explanation, and main next step remain findable with minimal travel. Essential text precedes large decorative art. A compact menu exposes every content destination plus Sign in/Get started. |
| Mobile page length | Core purpose and next step appear within the first screen or a short scroll; a default focused page should generally fit in two to three screens at 390px width. If a meaningful page needs more, document the exception and offer obvious section access. Do not shrink body text or controls to meet a height target. |
| Navigation | Every header destination changes the displayed page, URL, title, active state, and heading together. Direct loading, reload, browser Back/Forward, and footer links work. Old section-anchor references in reused content do not strand a visitor on an unrelated page. |
| Keyboard | All links/buttons are reachable in a logical order with visible focus. Skip-to-main works. Menu has a named toggle, exposed expanded state, predictable focus, Escape handling, and no off-screen focusable items when closed. Any modal menu returns focus to its opener. |
| Page semantics | Each view has one descriptive H1, meaningful headings, main/nav/footer landmarks, a unique page title, and `aria-current="page"` on the active page link. Navigating views leaves keyboard/screen-reader users at a predictable heading/main location. |
| Supporting controls | Use real links for navigation and buttons for changing examples. Tabs support expected keyboard behavior and identify their selected panel. Expandable details expose their state. Content remains discoverable without hover; avoid auto-advancing walkthroughs. |
| Readability and reflow | Body text remains comfortably readable; key controls target approximately 44×44px. Verify text contrast, visible control boundaries/focus, 200% zoom, and 320px reflow. Focus/selected state must not rely solely on color. Respect reduced-motion preferences. |
| Preservation | A reviewer can locate each meaningful current topic: three benefits, differentiation, both audience tours, AI starting points/safeguards, Before/After Sunday, household application, process, research/limitations, FAQs, join path, sample study, and signup/sign-in. |

## Review priorities once the prototype exists

1. **P0 — Navigation or access failures:** dead routes, missing mobile destinations, broken Back/Forward, inaccessible menu, clipped text, or content inaccessible at zoom.
2. **P1 — Failure of the requested experience:** a long home page remains, core page content/action falls far below the first view, new pages merely reproduce long sections, brand hierarchy breaks, or meaningful source content disappears without an accessible destination.
3. **P1 — Misleading content:** research qualification separated from claims, illustrative screens presented as live output, church review omitted, or signup/member paths confused.
4. **P2 — Clarity and polish:** repetitive copy, weak active-state treatment, excessive empty space, tiny screenshots, awkward line wraps, and inconsistent spacing.

The follow-up review should cite the actual page, viewport, visible symptom, and proposed correction for each issue. Screenshots support visual review; rendered-page interaction checks are required to assess navigation and keyboard behavior.

## Local sources read

- `frontend/components/public/index.tsx`
- `frontend/components/public/frame.tsx`
- `frontend/components/public/product-showcase.tsx`
- `research/Public Website Research/README.md`
- `research/Public Website Research/01-positioning-and-page-plan.md`
- `research/Public Website Research/02-power-of-four-evidence.md`
- `research/Public Website Research/03-sign-in-and-church-onboarding.md`
- `research/Public Website Research/04-design-review-and-build-handoff.md`
- `research/Public Website Research/05-ai-assisted-study-creation.md`
