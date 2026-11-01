# Rooted Build Prompt 1.2.1

Execute the approved simplicity audit from [`../1.2.0/SIMPLICITY_UX_AUDIT.md`](../1.2.0/SIMPLICITY_UX_AUDIT.md).

## Product rules

1. Make the contributor’s next action clear and short.
2. Keep Scripture and church-provided teaching more prominent than AI output.
3. Use one user-facing study workflow and one pastoral approval moment while retaining immutable internal revisions.
4. Treat the iPhone preview as a safe draft visualization, never as publication.

## Build scope

- Create a reusable client-side Member/Message preview component.
- Place it beside the study-writing surface on desktop, collapse it into a stacked preview on narrow screens, and keep it keyboard accessible.
- Render title, Scripture references, body, reflection, discussion question, application, church name, logo, Rooted identity, and theme tokens.
- Update preview content from the current draft without a server request for each keystroke.
- Shorten high-density wording in the contributor study surface.
- Preserve server-side approval, revision, optimistic locking, recovery, and publication behavior.

## Testing gate

- `npm run typecheck`
- `npm run lint`
- `npm run test:unit --workspace=@gather/frontend -- --run components/content-editor.test.tsx components/plan-editor.test.tsx components/member-phone-preview.test.tsx`
- `npm run build`

Do not mark this request complete if any gate fails or if the preview can be mistaken for published content.
