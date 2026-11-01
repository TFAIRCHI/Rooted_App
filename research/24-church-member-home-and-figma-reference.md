# Rooted 1.2.10 — Church member home and Figma reference research

Research date: **2026-10-22**. Status: **Prepared for product review; no application implementation authorized or performed.** This research defines a focused proposal for the church-member landing page after sign-in.

## Executive finding

The desired Figma Make file is a required design input, but this session cannot inspect it. The supplied URL loads a Figma sign-in prompt (“Want to check out this file? Sign up or Log in”); the design frame itself, any generated preview, and mobile variants are not visible. [S73] No colors, layout, copy, imagery, navigation, or interaction details are therefore described as Figma-verified. The prompt is intentionally gated: when execution is approved, first obtain a readable public preview or user-provided screenshots/export. If that is still unavailable, stop before visual implementation and ask for the missing design evidence.

## Evidence labels

- **Verified** — directly observed in source or in an accessible primary source.
- **Assumption** — a provisional product interpretation, not confirmed by the Figma file.
- **Recommendation** — a proposed implementation or UX direction for approval.
- **Unknown** — unresolved product/design detail.
- **Blocked** — an action cannot be completed with current access.

## Current application baseline (source inspection)

- **Verified:** The church member route is `frontend/app/c/[slug]/page.tsx`; it fetches published studies server-side through `publishedResource(slug)` and renders a church-specific member home.
- **Verified:** `frontend/lib/member-server.ts` forwards the request cookie to the backend with `cache: "no-store"`, reads the session, and selects the member endpoint when the slug matches the member's church. Otherwise, it uses public-reading endpoints.
- **Verified:** `backend/src/api/core-routes.ts` exposes public study reads only when `public_church(slug)` returns the church. The SQL function in `backend/migrations/001_core.sql` filters to `reading_policy='public'`. Authenticated church-member reads use the church-scoped route. The build must preserve these distinctions and tenant authorization.
- **Verified:** The published-study query only returns live publications whose slot is not deleted or withdrawn. Ordering is newest publication first with a stable publication-ID tie-break.
- **Verified:** The current home displays “Read. Reflect. Grow.” and a list of published study titles/date links, or a sign-in/empty/error state. Reactions and conversation are on the study detail route, not in the home feed.
- **Verified:** The member shell is church-theme-aware, but church branding is rendered in both `MemberNavigation` and `MemberSlugLayout`; a Figma-driven revision should check whether this duplicates the church logo/name.
- **Verified:** A published study detail contains reflection, discussion, application, Scripture references, and member actions. Comments remain subject to church settings and moderation; the home must not reveal private comments or unpublished studies.
- **Verified:** The current member list uses a hard-coded `America/New_York` date formatter. Any redesign that shows study dates must use a verified church IANA time zone or a date value already normalized for church-local display; do not perpetuate that hard-code.
- **Verified:** Existing signed-in member navigation includes church studies and sign-out; current login flow returns to a requested route. Avoid altering authentication/session policy unless the reference and product need require it.

## Design access assessment

| Item | Finding | Confidence / action |
|---|---|---|
| URL identity | Figma Make file named “Login screen design” | Verified from supplied URL/title only |
| Visual frame access | Figma sign-in wall; no design content returned | Verified blocker [S73] |
| Desktop layout, colors, type, copy, artwork | Not visible | Unknown; do not invent as reference facts |
| Mobile/responsive frame | Not visible | Unknown; request corresponding frame or screenshot |
| Interactions and login redirect | Not visible | Unknown; confirm with Figma prototype or user |
| Owner sharing/access | Not provided | Blocked; requester can enable link access or attach desktop/mobile captures |

## Product scope and mental model

The target is the **post-login church member home**, not the contributor workspace. A member signs in, returns to the intended church context, sees only studies the current member can read, opens a study, and may interact only within that study's allowed church policy.

`Identity → church membership/context → member home → live published study → member engagement`

These are independent boundaries: authentication determines the identity; membership/reading policy determines church access; publication state determines which studies exist for members; study detail governs discussion and reaction. A UI enhancement must not make the home route an authorization boundary of its own.

## Recommended requirements (provisional until Figma inspection)

1. **R1 — Design fidelity:** Use the Figma file as the visual source of truth after access is granted. Record frame dimensions, breakpoints, typography, color tokens, spacing, imagery, card hierarchy, logo placement, navigation and interaction states in the UX review. Do not substitute a guessed design based on the filename.
2. **R2 — Member-only information:** List only currently live publications that this member may read. Exclude drafts, pending reviews, scheduled-but-unpublished, withdrawn, and deleted records. Do not display contributor-only actions.
3. **R3 — Church context:** Keep the member within the church selected by the sign-in return path. If a member belongs to multiple churches and no unambiguous church is selected, use an explicit church selector or ask; do not silently select the first membership.
4. **R4 — Action clarity:** Each published study has one clear action that opens its study page. Do not label the action “Continue reading” unless persistent reading-progress data exists.
5. **R5 — Community privacy:** Home cards may show only approved, policy-authorized aggregate data if the reference calls for it. Never expose a member's comment, question, identity, reaction, moderation verdict or private status in a public/unauthed summary.
6. **R6 — Church branding:** Preserve the church's active theme and logo with a single coherent brand treatment. Inspect the existing duplicate logo/banner before deciding whether to consolidate; respect both wide and compact responsive cases.
7. **R7 — Date correctness:** Display publication dates in the church's verified IANA time zone or use a backend-provided local date. No hard-coded zone or browser-dependent locale output.
8. **R8 — State handling:** Design the reference-matched loading, no-publication, signed-out, unauthorized membership, withdrawn/not-found, and temporary service-error states. Errors must not appear as an empty successful feed.
9. **R9 — Accessibility and responsive behavior:** Preserve landmarks, heading order, visible focus, keyboard operation, text contrast and reflow. W3C describes a 24×24 CSS-pixel target-size minimum with a spacing exception; 44×44 is the proposal's preferred touch comfort target where practical. [S74](sources.md#s74) Reflow is evaluated at narrow widths without loss of content or function, subject to WCAG exceptions. [S76](sources.md#s76)
10. **R10 — Personalization boundary:** Greeting, initials, “new” labels, read status, saved/bookmark state, and reminder settings are **not verified existing capabilities**. Only implement those shown in the accessible Figma and supported by existing data/contracts; otherwise record as out of scope or a future feature.

## Alternatives and recommendation

| Option | Strengths | Tradeoffs | Recommendation |
|---|---|---|---|
| Make a visual-only rewrite from the URL title | Fast | Figma content is not accessible; high chance of fabricating layout and mismatching the design | Reject |
| Rebuild a member portal and new member data APIs at once | Could enable personalized progress/notifications | Expands scope, creates privacy/data/retention requirements, and is not supported by visible design evidence | Reject for this request |
| Inspect the reference, then make a focused home-page adaptation on existing member APIs | Preserves access model, keeps delivery/member interactions intact, minimizes new data, and can meet actual Figma | Requires reference access; may need small API support only after evidence | **Recommend** |

## Architecture, security, and operational notes

- Keep this as a frontend-focused adaptation in the existing Next.js application. Use server-side `publishedResource` for initial member data and dynamic request cookies; Next.js documents cookie access as a Dynamic API. [S75]
- Continue `no-store` handling for identity- and membership-sensitive member reads; never cache one member's home response for another user. Confirm current server and CDN cache headers during Phase 0.
- Reuse church-specific published-study APIs and theme tokens; do not add a cross-tenant aggregator or analytics SDK.
- If the visual design truly needs a new field or endpoint, document the exact gap, source of truth, authorization test, tenant scope, and failure behavior before editing `./backend`.
- Use the existing application-level `./frontend` and `./backend` locations. No third-party design package is required by this proposal.

## Risks and open questions

| Risk / unknown | Why it matters | Resolution |
|---|---|---|
| Figma access is blocked | Cannot fulfill “recreate this design” precisely | User enables anyone-with-link viewing or provides desktop and mobile screenshots/export, including the relevant states |
| Link title references a login screen while request asks for home after login | Could mean the Figma file includes both screens, or only the sign-in page | Confirm intended frame(s) at Phase 0; implementation scope remains post-login member home unless explicitly expanded |
| New home may imply progress/personalization | No data model or saved reading-progress contract is verified | Inspect design; do not imply a member read state from opens/views |
| Church logo currently has multiple placements | A rebuild may duplicate or hide branding | Use actual reference frame, then test long names, missing logo, and mobile placement |
| Multiple church membership | Route identity can be ambiguous without a selected church | Preserve return target; require explicit selection if absent |
| Displayed dates may differ by zone | Current page uses a New York time zone literal | Obtain church zone or canonical local date before rendering dates |
| Automated screenshots cannot prove visual fidelity alone | Typography/spacing/accessibility quality require review | Compare implementation against approved Figma frame and retain human review screenshots |

## Evidence register

- [S73](sources.md#s73): supplied Figma Make file and access limitation.
- [S74](sources.md#s74): W3C WCAG 2.2 target-size criterion.
- [S75](sources.md#s75): Next.js request-cookie rendering behavior.
- [S76](sources.md#s76): W3C WCAG 2.2 reflow criterion.
- Local source paths listed above were inspected on 2026-10-22; these are repository observations, not external-source claims.

Companion implementation proposal: [Rooted 1.2.10](../BuildPrompts/1.2.10/README.md), [UX specification](../BuildPrompts/1.2.10/MEMBER_HOME_UX_SPEC.md), [build prompt](../BuildPrompts/1.2.10/MASTER_BUILD_PROMPT.md), and [testing gates](../BuildPrompts/1.2.10/TESTING_GATES.md).
