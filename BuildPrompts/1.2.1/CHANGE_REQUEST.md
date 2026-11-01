# Change Request 1.2.1

## Approved scope

- Implement the approved senior simplicity UX audit.
- Add a persistent, live iPhone preview beside the contributor’s study editor.
- Provide Member view and Message view modes.
- Use the active church name, logo, Rooted identity, and theme tokens in the preview.
- Keep the preview draft-only; it must not publish, notify, approve, or create an audit event.
- Preserve existing autosave, conflict recovery, revision history, and approval safeguards.
- Reduce high-density contributor wording around the study-writing surface.

## Explicit non-goals

- No production deployment.
- No database or publication API changes for the first preview implementation.
- No removal of immutable revisions or authorization checks.
- No automatic AI adoption or doctrinal claims.

## Completion gate

The request is complete only when typecheck, lint, focused unit tests, and production build pass. The preview must remain responsive and keyboard accessible at desktop, tablet, and mobile widths.
