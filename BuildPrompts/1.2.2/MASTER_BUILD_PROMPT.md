# Rooted Build Prompt 1.2.2

Implement safe study-date reassignment for the weekly workflow.

1. Use the existing tenant-authorized slot update API.
2. Enforce one study per series date on the backend.
3. Expose a date selector from the selected study’s settings.
4. Make calendar study cards draggable to empty dates.
5. Keep occupied dates protected and show a clear instruction to move the existing study first.
6. Renew approvals and cancel pending schedules through the existing slot-change behavior.
7. Preserve published snapshots and show the user the consequence before saving.

## Testing gate

- `npm run typecheck`
- `npm run lint`
- `npm run test:unit --workspace=@gather/frontend -- --run components/slot-settings.test.tsx`
- `npm run build`

The phase is not complete if duplicate dates can be created or if a move bypasses approval renewal.
