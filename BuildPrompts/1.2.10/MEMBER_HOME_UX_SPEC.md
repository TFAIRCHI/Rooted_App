# Rooted 1.2.10 — Member home UX specification

Status: **Proposed; visual fidelity is blocked until the supplied Figma file can be inspected.** This document describes the current baseline and interaction contract, not the unknown Figma appearance. Use the [research](../../research/24-church-member-home-and-figma-reference.md) for verified source findings and evidence IDs.

## Purpose

Help a signed-in church member quickly find the study their church has published, read it, and participate when the church has enabled that capability. Do not introduce contributor/admin workflow into the member experience.

## Information architecture

`Rooted member route → selected church home → live published studies → study detail → optional reactions/comments`

Keep existing member navigation and sign-out unless Figma explicitly changes them. A member with more than one church must remain within the target church in the sign-in return path. If no target is known, provide an explicit selection rather than guessing.

## Screens and state inventory

| State/screen | Required behavior | Data boundary |
|---|---|---|
| Signed-in home with publications | Match accessible reference; list the authorized live studies and provide clear study links | Only rows from the selected church's authorized live-publication read |
| Empty church | Explain there are no studies currently available; do not show draft/scheduled content | Distinguish true empty success from failure |
| Signed-out/public church | Respect church `public` vs `members` read policy; offer sign-in without leaking restricted content | Public studies endpoint only for public policy; member-only content requires authenticated membership |
| Member lacks church membership | Provide safe sign-in/access guidance or not-found behavior consistent with existing API; never reveal member-only titles | Do not disclose whether a private church has a particular publication |
| Loading | Use restrained, accessible skeleton or status that does not imply a study exists | No cached cross-user response |
| Service failure | Explain studies cannot load and offer retry; do not present as empty feed | Keep original route/context on retry |
| Study detail | Preserve existing study sections, theme, reactions and discussion policy | Study endpoint validates membership/public policy; comments obey existing moderation |

## Proposed content hierarchy (only a fallback if Figma cannot be inspected after explicit product decision)

This is **not** a description of the Figma design. If the owner later authorizes a fallback design, use this minimal hierarchy and record the deviation:

1. Church identity/brand and member navigation.
2. One concise welcome/context heading.
3. A clear current/featured published study selected only from eligible live publications.
4. A compact list of remaining recent published studies.
5. A calm, helpful empty state when none are available.

Avoid fake reading-progress indicators, invented announcements, unverified devotion streaks, member counts, or app-generated personal recommendations.

## Responsive and accessibility behavior

- Extract the actual Figma frame sizes, grid, font sizes, spacing, color values, and breakpoints during Phase 0. Do not hard-code guesses from this proposal.
- Verify the member home at minimum 320 CSS px, 375 CSS px, tablet width, and desktop frame width, plus 200% zoom. Content must reflow without clipping or loss of actions, subject to WCAG exceptions. [S76](../../research/sources.md#s76)
- Keep a single primary action per study card. Ensure all clickable cards have an accessible name and a visible focus state.
- Provide practical touch controls of at least 44×44 CSS px where layout permits; at minimum test WCAG 2.2 SC 2.5.8 (24×24 px or spacing exception). [S74](../../research/sources.md#s74)
- Preserve semantic landmarks, a single meaningful page `h1`, logical heading structure, descriptive church-logo alternatives, keyboard navigation, and screen-reader status for loading/error/empty changes.
- Do not encode publish status, unread status, or actions by color alone. Meet text and non-text contrast requirements for the actual church theme.

## Brand and theming

Rooted remains the application identity; the church name/logo/theme identify the specific member context. Use existing theme tokens and logo assets. During design reconciliation check current double-rendered logo/banner paths and consolidate only in a way that matches the Figma. Test no logo, long church name, transparent logo padding, light/dark theme, and theme contrast.

## Interaction details

- Clicking/tapping a study card opens `/c/{slug}/studies/{publicationId}`.
- Browser back returns to the same church and (where practical) same feed position.
- A member does not see a contributor preview or a study card for a scheduled, pending, withdrawn, deleted, or replaced publication.
- Reaction/comment counts or excerpts are not added unless shown in the inspected design and approved for member privacy. Existing engagement APIs do not authorize private moderation-state display.
- Login return URL continues to the chosen church/study route; preserve existing session and logout flow.

## Required design artifacts at Phase 0 exit

- Reference access result and exact Figma frame URL/name.
- Desktop and mobile screenshots or equivalent approved exported frames.
- Design-to-code inventory: logo variant, tokens, type scale, spacing, card anatomy, breakpoint behavior, and interaction/empty/loading/error states.
- A short list of differences between the Figma and current application, with the user-approved scope for each.
- If reference remains blocked, a written pause/escalation; no visual implementation proceeds.
