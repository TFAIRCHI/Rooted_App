# Rooted Build Prompt 1.2.3

Consolidate the contributor workflow around one study submission.

1. Keep plan fields available as optional context and supporting information.
2. Allow a contributor to create a study draft from any saved plan.
3. Hide the plan submission action from the normal contributor flow.
4. Require only the study’s necessary member-facing fields before submission.
5. Send the study revision to pastoral review once.
6. Preserve immutable revisions, comments, optimistic locking, approval binding, and publication safeguards.
7. Do not auto-publish or auto-approve because a plan exists.

## Testing gate

- `npm run typecheck`
- `npm run lint`
- `npm run test:unit`
- `npm run build`

The phase is not complete if a contributor must approve a plan before creating or submitting a study.
