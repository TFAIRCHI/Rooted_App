# Study Co-Writer guidance and KJV reader: deployment handoff

Release tag: `cowriter-kjv-20261108-1`. These `linux/amd64` images are built **locally** and have not been pushed to Azure Container Registry or deployed. The source is included in the release commit on `main`; record its hash alongside the registry manifest digests after publishing the images.

| Component | Local image | Image ID |
| --- | --- | --- |
| API, worker, migration job | `rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-backend:cowriter-kjv-20261108-1` | `sha256:4767578650844eebd4510c30d513cca42d7ef850d3ab3232f23f728287a2af55` |
| Frontend | `rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-frontend:cowriter-kjv-20261108-1` | `sha256:ae42a1a8907f06d13f90ffbdf54b4cba23873ace0611b3672cb60f746e7c4fc7` |

The backend image includes the pinned eBible/CrossWire KJV 1769 VPL corpus. Its source file SHA-256 is `7f46250da578d6256d195475c4c94b3909665fc7712efaf1989a58c38bf3c69e`. See [source record](../../backend/scripture/SOURCE.md). The application verifies the file digest at runtime and freezes verified verse text in each new content revision.

## Implemented

- Church AI Assistance now has separate guidance for principles, interpretation boundaries, teaching voice, and standing instructions. Saves increment a revision, append an immutable tenant-scoped history row, and retain legacy profiles. Workflow snapshots remain bound to the church profile hash; a profile change stops stale work until it is reviewed.
- New KJV studies receive exact full primary passage text, verse numbers, source/edition, digest, and one chosen featured verse. The editor shows the verified passage and lets a contributor choose its featured verse. Save rejects altered verse text and fills a primary reading when an editor adds a supported KJV reference. Legacy studies remain readable.
- The member reader displays the full passage and an italic featured quote with exact location. Its old fixed John 6 quotation was removed.
- The Co-Writer can create a series from a reviewed conversation or source after the first confirmed day. The series and first draft are saved in one database transaction. Existing series remain selectable.
- Long reviewed source text is searched beyond its opening 4,000 characters. The selected excerpt is visible for contributor review. Explicit story objectives tell the model to retell supported events first; a deterministic named-event check rejects a response that only describes why the story matters when the source contains named actors.

## Verification

- `npm run typecheck`: passed.
- `npm run build`: passed (frontend and backend).
- Backend unit/integration adapter tests: 43 passed, including KJV text and late-story selection.
- Frontend unit tests: 53 passed across 18 files.
- Full backend integration suite: 64 passed. The new structured-guidance history test also passed after that run, bringing the covered integration cases to 65.
- Targeted guided workflow integration: passed, including new-series transaction and exact reading in saved drafts.
- Migration and runtime-boundary integration: 10 passed, including empty/upgrade migration paths and forced tenant RLS.
- Backend and frontend ESLint: passed.
- Local Docker builds: passed for both images. Runtime inspection confirmed the KJV corpus is present in the backend image and John 3:16 resolves from it.

## Publish and rollout

Push the local images using the existing registry authentication:

```powershell
docker push rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-backend:cowriter-kjv-20261108-1
docker push rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-frontend:cowriter-kjv-20261108-1
```

Inspect ACR manifest digests after push and pin those digests in the release record. In resource group `rooted_study_app`, preserve the existing secrets, ingress, scale rules, and image-pull identity. Record accepted revision names and tags first.

1. Run `rooted-migrate` once using the new backend image and its existing `node dist/src/infrastructure/migrate.js` command. Require **Succeeded** and migration `032_cowriter_guidance_series.sql` applied. The migration is additive; rolling back images does not undo the schema.
2. Roll `rooted-api` to the new backend image. Wait for Running and `/health/ready` HTTP 200.
3. Roll `rooted-worker` to the **same backend image**. It executes the new excerpt, Scripture, and story checks. Verify worker startup logs and a healthy replica.
4. Roll `rooted-frontend-centralus` to the new frontend image. Keep `BACKEND_URL=http://rooted-api` and `ROOTED_PUBLIC_ORIGIN=https://rooted-together.com`. Wait for Running and the public domain to respond.
5. In a test church, save guidance, start a new Co-Writer conversation, review a story excerpt past character 4,000, create a new series through confirmation, inspect the full KJV reading and featured verse in the editor, and read the published test study through an authorized member link. Do not send live SMS as part of this smoke check.

## Release considerations

This initial release is for US-based churches. UK distribution is outside the current rollout scope. The pinned source contains only Bible verse text, with no publisher notes. Other translations are outside this release. Passage resolution supports a single-chapter range of up to 30 verses; unsupported or unresolved passages remain references in manually edited studies and block newly generated KJV workflow drafts. Story grounding is still subject to contributor review; the deterministic check catches a narrow class of missing retellings, not every possible invented detail.

If rollout fails, restore the previously accepted API, worker, and frontend revisions together. The additive migration can remain in place, but revisions already saved with `scriptureReading` should be kept on the new code path for editing. Preserve the old revisions until live acceptance passes.
