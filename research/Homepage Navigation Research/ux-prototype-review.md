# Independent UX review of the navigation prototype

Reviewed October 30, 2026. Independent review of the local prototype served at `http://127.0.0.1:3090`, including a second rendered review after corrections. Initial findings remain below as a record; the final disposition is in the follow-up section.

## Assessment

The prototype achieves the main architectural change: a compact home introduction and focused pages reached through a consistent header. It retains the cream/teal editorial style, recognizable headline and sermon-to-phone illustration. The desktop home fits both 1440×900 and 1366×768. Topic pages require modest scrolling rather than the original long narrative. The important remaining issues concern preservation of meaningful content and explanatory context, rather than broken navigation.

No P0 navigation, clipping, or keyboard failure was found in the tested paths. This is not a completed assistive-technology audit or a validation of research statistics.

## Prioritized corrections

### P1 — Restore the actual AI confirmation and saved-draft workflow

**Where:** `ai-co-writer.html`, `app.js` example content, and the AI answer in `questions.html`.

**Evidence:** The safeguard currently says “Confirm the plan. Edit the draft. Review before publishing.” The prior production page explicitly distinguishes confirming **each day** before it becomes a **saved editable draft**. Its fourth safeguard explains that conversations are scoped to the contributor and church. Neither point is present in the new prototype. The two example conversations also jump directly from a request to a plan without demonstrating the co-writer's clarifying-question role.

**Correction:** Add a compact sequence such as “Agree on the plan → confirm each day → refine the saved drafts → review before publishing.” Preserve scoped church/account context in one short sentence or an expandable safeguards detail. Include one clarifying question in the illustrative exchange, or clearly label its plan as occurring after discussion. Keep the existing human-review statement prominent.

**Why it matters:** These details explain what the team receives and which confirmations remain under human control. A short public page can preserve them without reinstating the long safeguards section.

### P1 — Give the omitted differentiation and deeper-study benefit a home

**Where:** `why-rooted.html`.

**Evidence:** The three cards currently cover connection, preparation, and household use. The original “Go further in what you heard” benefit—context, supporting passages, and room to explore beyond the sermon—is reduced to a short weekly step label. The original four differentiators are absent as a coherent explanation: church teaching as the starting point, human direction of assistance, preparation connected to participation, and a sustained rhythm beyond a content feed. The bottom-note sentence preserves part of the third point only.

**Correction:** Add a concise deeper-study sentence to the outcomes and a compact “What makes Rooted different?” disclosure with those four points. This preserves meaningful ownership without adding another default section of cards. Keep household use in its current outcome text or a short supporting sentence. Restoring the full family illustration is optional; restoring its practical meaning is the priority.

### P1 — Restore source identity and the definition of Scripture engagement

**Where:** `power-of-four.html` research panel.

**Evidence:** The panel correctly says the numbers concern higher reported **odds**, describes survey associations, and separates these from measured Rooted results or guaranteed outcomes. However, it introduces only the acronym “CBE,” and the original explicit distinction between Scripture engagement and app opens is missing. The prior non-affiliation statement is also omitted.

**Correction:** Expand “Center for Bible Engagement (CBE)” on first use. Add adjacent compact text: “Scripture engagement means encountering Scripture, considering its meaning, and responding; app opens alone do not count. Rooted is not affiliated with or endorsed by CBE.” Preserve the existing nearby statistical limitations and source link.

**Limit:** The external research link was not opened, and this review does not independently verify the percentages. Their relocation to a dedicated, qualified research page is preferable to using them as the home hero.

### P2 — Offer earlier mobile access to the examples

**Where:** Why Rooted and AI Co-writer, at 390×844 and 320×568.

**Evidence:** On the initial version, the first weekly-example control begins at y=812px at 390px width and y=986px at 320px width. The AI-example control begins at y=788px/y=903px respectively. At the smaller viewport the first screen contains only the heading and benefits; visitors must travel to discover the interactive example. See `screenshots/ux-review/ai-co-writer-320.png`.

**Correction:** Add a small introductory link such as “See an example week ↓” or “See the co-writer example ↓” linking to the corresponding section. Keep appropriate scroll margin for the sticky header. Do not shrink body text, hide safeguards, or force a screen-height container.

**Severity rationale:** The pages are already reasonably short and the header remains available. This is a discoverability improvement, not a failed mobile experience.

### P2 — Apply current-page semantics to account destinations

**Where:** Desktop Get started link and dynamically appended mobile account links in `app.js`.

**Evidence:** Marketing-page links use `aria-current="page"` consistently. Mobile Sign in/Get started links are appended without it. Sign in has current state only on the desktop action; Get started lacks current state in either header form.

**Correction:** Set `aria-current="page"` on the matching account link using the current page identity, and give it a visible selected treatment. Ensure both account pages receive the same behavior as the content pages.

## What was actually checked

Read the rendered prototype HTML/CSS/JS, compared content to the existing production public components and prior public-site research, and inspected actual screenshots with `view_image`. Viewed desktop Home, How it works, Power of 4; mobile Home, Why Rooted, AI Co-writer, How it works; and independently captured 1366px/320px first views and the open 320px menu.

Ran independent Playwright/Edge checks at 1440×900, 1366×768, 1101×768, 1100×768, 1024×768, 800×900, 390×844, and 320×568. This covers both sides of the 1100px menu breakpoint. The 48 measured main-page layouts have no horizontal page overflow. Keyboard tests passed for the disclosure/menu, Escape and focus return, skip link, example buttons, audience tour/calendar, actual page navigation, and Back/Forward. These controls use pressed buttons rather than claiming tab semantics, so normal button keyboard operation is appropriate.

The parent validation report also records no automated WCAG-tag violations in its desktop/mobile axe checks. Automated results support the review but do not replace manual keyboard, visual, or screen-reader testing.

| Initial default page | 1366×768 height | 390×844 height | 320×568 height |
|---|---:|---:|---:|
| Home | 768px / 1.00 screens | 1244px / 1.47 screens | 1215px / 2.14 screens |
| Why Rooted | 949px / 1.24 screens | 1399px / 1.66 screens | 1573px / 2.77 screens |
| How it works | 855px / 1.11 screens | 1238px / 1.47 screens | 1241px / 2.18 screens |
| AI Co-writer | 835px / 1.09 screens | 1219px / 1.44 screens | 1420px / 2.50 screens |
| The Power of 4 | 823px / 1.07 screens | 1237px / 1.47 screens | 1290px / 2.27 screens |
| Questions | 789px / 1.03 screens | 1187px / 1.41 screens | 1251px / 2.20 screens |

The default desktop pages meet the initial approximate 1.5-screen target. Mobile pages fit the intended two-to-three-screen range even at 320×568. Opening optional detail naturally increases page height and should be reported separately.

The product screenshots are small/cropped on desktop, but each includes an explicit full-size link and an adjacent task explanation. This is acceptable for the navigation concept; a later visual iteration could choose a more informative screenshot crop. The read-only example and mocked entry pages clearly disclose their illustrative/non-connected behavior. No actual account or AI request was attempted.

## Evidence artifacts

- `ux-review-check.mjs`: independent layout and interaction capture script.
- `ux-review-validation.json`: measurements and passing interaction results.
- `screenshots/ux-review/`: independent first-view captures at 1366px and 320px, plus the open 320px menu.
- `validation.json` and the primary desktop/mobile screenshots: parent-generated validation, reviewed as supporting evidence.

## Follow-up status

**All five requested corrections are resolved. No unresolved material UX gap was found in the corrected navigation concept.** The research prototype is suitable for Tyler's direction review. This verdict concerns the mockup, not production readiness or approval to deploy.

| Initial finding | Re-review evidence | Disposition |
|---|---|---|
| AI workflow/context | Visible safeguard now specifies per-day confirmation and editable saved drafts. A context disclosure preserves account/church scope and agreement on audience/dates. Both examples ask clarifying questions before a labeled post-agreement plan. | Resolved |
| Differentiation/deeper study | The first outcome explicitly covers going further in the teaching through Scripture/reflection. A working disclosure preserves all four differentiation points. | Resolved |
| Research context | First attribution names Center for Bible Engagement (CBE); the adjacent note distinguishes considering/responding to Scripture from app visits and identifies CBE as a source rather than partner. Existing odds/association/outcome limitations remain adjacent. | Resolved |
| Mobile example discovery | Why and AI have visible early example links. At 320px, each link scrolls its target below the sticky header and moves keyboard focus to that target. Viewed independent screenshots of both resulting states. | Resolved |
| Account current-page state | Matching Sign in/Get started links expose `aria-current="page"` in desktop and mobile headers. Rendered checks pass at 1440px, 390px, and 320px. | Resolved |

The implementation also replaces the decorative club glyph with a church SVG and changes the screenshot treatment to preserve complete screenshots. These are appropriate visual refinements.

Re-ran the 48 main-page layouts and 23 interaction checks after the correction. All pass, with no horizontal page overflow. The default main pages at 1366×768 range from 1.00 to 1.24 screens, at 390×844 from 1.41 to 1.72 screens, and at 320×568 from 2.14 to 2.85 screens. Preserving content did not undermine the shorter-page goal. The home page remains 768px tall at the laptop viewport.

| Corrected default page | 1366×768 height | 390×844 height | 320×568 height |
|---|---:|---:|---:|
| Home | 768px | 1244px | 1215px |
| Why Rooted | 949px | 1449px | 1600px |
| How it works | 855px | 1238px | 1241px |
| AI Co-writer | 870px | 1448px | 1618px |
| The Power of 4 | 874px | 1331px | 1384px |
| Questions | 789px | 1187px | 1251px |

`ux-review-validation.json` and `screenshots/ux-review/` now reflect the corrected version; the initial measurement table above retains the original values. The primary screenshot set should be regenerated from the final source before delivery so that its visible copy matches the corrected mockup.

No prototype implementation files were edited by this reviewer. Changes made by the reviewer are confined to assessment/review documents and independent review scripts/evidence under this research folder.
