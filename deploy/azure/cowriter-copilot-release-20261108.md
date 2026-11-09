# Study Co-Writer copilot: deployment handoff

Image tag: `cowriter-copilot-20261108-1`.

| Component | Image | Local image ID |
| --- | --- | --- |
| API and worker | `rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-backend:cowriter-copilot-20261108-1` | `sha256:fbbe88b65a029dcacde8225e688d40b4a905ada8c777229115c7a9ee47caea24` |
| Frontend | `rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-frontend:cowriter-copilot-20261108-1` | `sha256:950f51e4513f4d5c8134cd4e81b95e245af82236798fd0730db172d23c110a09` |

## What changes

- A selected-study conversation receives its study ID, date, revision, title, references, and bounded body excerpt. It no longer needs to guess which saved study the user means.
- The Create a Study Co-Writer can select an existing scheduled study. A clear edit request naming a unique study date opens that study and carries the message into its Co-Writer. Ambiguous or missing dates ask for a study selection.
- A selected-study request to show the full Scripture passage previews exact verified KJV text from the study's saved reference. Confirmation creates a new draft revision and resets approval. If full KJV text already exists, the app reports that instead of creating a duplicate revision.
- Moving an unpublished study previews its original and destination dates and approval/delivery effects. Confirmation uses the existing move rules, including date conflicts, published-study protection, version checks, and permission checks.
- Edit requests generate a reviewable structured proposal grounded in the existing saved study when no separate transcript is attached. Contributors select exactly which fields to adopt. Other fields remain unchanged.
- Azure incomplete replies now distinguish output limit, content filter, provider failure, cancellation, and malformed response. A safe provider response reference is retained when present.

## Verification

- Backend typecheck, ESLint, build, 44 unit tests: passed.
- Backend full PostgreSQL integration suite: 65 passed. The final targeted Co-Writer integration test passed again after the field-scoped adoption change.
- Frontend typecheck, ESLint, production build, 54 unit tests: passed.
- Final local `linux/amd64` Docker builds: passed.

## Rollout

No migration is required for this release. In resource group `rooted_study_app`:

1. Record the currently accepted API, worker, and frontend revisions and their image tags.
2. Set `rooted-api` to the new backend image. Wait for Running and `/health/ready` HTTP 200.
3. Set `rooted-worker` to the same backend image. Wait for a healthy replica and normal startup logs.
4. Set `rooted-frontend-centralus` to the new frontend image. Wait for Running and the public domain to respond.
5. In a test church, open a scheduled draft and ask to show its entire KJV passage; inspect the preview and confirm. Check a new draft revision and reader preview. From Create a Study, request an edit to the same date and confirm it resolves to the existing study. Request a field edit and adopt only one field. Preview and confirm a move to an unused date; verify approval is reset. Test a date collision and an already published study without changing either.

If a revision fails or the smoke checks fail, restore the recorded API, worker, and frontend revisions together. No schema rollback is necessary.

## Limits

The copilot is bounded to the supported create, field-edit, verified-KJV, and move actions. It does not execute arbitrary application commands. Full-passage attachment requires a supported KJV reference already saved on the study. Model-generated edits remain proposals until a contributor selects fields and confirms. Live Azure model behavior cannot be proven by local fixture tests; use a test church during rollout.
