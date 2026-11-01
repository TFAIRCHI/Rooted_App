# Rooted — Master Build Prompt 1.1.3

Implement the approved `CHANGE_REQUEST.md` against the existing Rooted 1.1.2 implementation. Read `research/`, `BuildPrompts/1.1.2/`, `BuildPrompts/1.1.3/`, `docs/`, `frontend/`, and `backend/` before editing. Do not deploy or send live provider messages.

## Required execution rule

Do not execute until the user explicitly approves build request **1.1.3**. On approval, record the exact authorization in `PHASE_TRACKER.md` and preserve prior evidence.

## Required implementation

1. Implement logo upload, bounded image processing, normalized derivatives, palette suggestions, preview, semantic object tokens, and active-theme revisioning described in `CHANGE_REQUEST.md` and `RESEARCH_NOTES.md`.
2. Keep `./frontend` and `./backend` as the two source workspaces.
3. Use additive migrations only. Preserve the existing theme fields through a compatibility read/migration path.
4. Keep logo assets and theme revisions tenant-isolated with authorization, audit events, digest binding, and safe deletion/replacement behavior.
5. Make the Settings page the primary entry point. Do not require users to know a hidden URL.
6. Apply the theme to objects and surfaces across staff and member experiences. Do not make font recoloring the primary result.
7. Keep user-selected colors reviewable and reversible. Preview must not mutate the active theme.
8. Add unit, integration, browser, accessibility, migration, authorization, image-security, and failure-recovery tests.
9. Update API contracts, data model, UX docs, README, acceptance matrix, and ADRs.

## Non-negotiable invariants

- Unauthorized users cannot upload, inspect, activate, restore, or delete another tenant’s logo or theme revisions.
- Invalid, oversized, malformed, or unsupported image input never reaches public serving or palette extraction.
- Uploaded image bytes are never trusted based only on filename or client MIME type.
- A failed upload or processing job cannot replace the active theme.
- Preview and extraction suggestions never silently activate a theme.
- Accessibility validation rejects unsafe object/text combinations or derives safe text colors.
- Existing churches without a logo continue using the Rooted fallback theme.
- Existing study approval, publication, tenant isolation, moderation, consent, and audit behavior remains intact.

## Phase execution

Execute phases in `TESTING_GATES.md` order. Stop at the first unmet gate, record evidence and the exact failure, and do not claim completion. Do not add AI image generation or arbitrary CSS customization.
