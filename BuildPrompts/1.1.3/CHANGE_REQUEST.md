# Change Request 1.1.3 — Rooted Church Brand Themes

## Problem

The current theme editor primarily changes CSS variables that affect text and broad page colors. Churches need the application to feel like their own space: logo, cards, navigation, buttons, badges, dividers, panels, reading surfaces, and member-facing brand moments should carry a coherent visual identity.

## Desired experience

1. An authorized pastor, contributor, or administrator opens **Settings → Customize your church theme**.
2. They upload one church logo from desktop or mobile.
3. Rooted validates and normalizes the image, shows a preview, and suggests a palette derived from the logo.
4. The user can accept the suggestion or adjust individual object-style tokens.
5. A live preview shows staff workspace, member reading page, navigation, cards, primary actions, badges, and logo placement.
6. Saving publishes one tenant-scoped theme revision atomically. Cancel leaves the active theme unchanged.

## Required design direction

- Prioritize object styling: shell/background surfaces, cards, navigation, buttons, active states, badges, borders, dividers, reading surfaces, logo placement, and optional decorative accents.
- Do not make the feature primarily about changing font colors. Text color is a derived accessibility output, not the main user-controlled design surface.
- Preserve Rooted identity and “Growing Deeper Together” while allowing church-owned visual expression.
- Use safe contrast-aware text colors automatically; allow an advanced override only when it passes validation.
- Keep the existing light/dark/system mode, but make object tokens work coherently in each mode.

## Out of scope

- AI-generated logos or images.
- Arbitrary CSS, JavaScript, HTML, fonts, or user-supplied SVG execution.
- Multiple logos per tenant in the first implementation.
- Public logo browsing or cross-tenant asset reuse.
- Rebranding the product name itself.
