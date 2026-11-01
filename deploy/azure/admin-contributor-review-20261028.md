# Admin reviews contributor work — release handoff

The user requires the existing Admin Fairchild and Contributor Fairchild accounts to complete the editorial test. No third account is needed. The earlier requirement to register another contributor was a limitation in the application role model and reviewer selector.

## Implemented behavior

- Admin role now includes `plans:approve`, `content:approve`, `publication:schedule` and `comments:write`, while retaining administration permissions. It does not gain `plans:edit` or `content:edit`.
- Migration **028_admin_review_authority.sql** adds those grants to existing administrator memberships and records each change in immutable audit history. Existing policy-owner identity and grants are preserved. Member and contributor grants are unchanged by the migration.
- Reviewer discovery and validation require active church membership with `workspace:read` and `content:approve`. Writing permission is no longer required. This also lets the narrow approver role be selected correctly.
- The acting user is excluded from the reviewer list. Existing author/self-review, exact-revision/hash, reviewer-assignment, MFA, tenant and publication checks remain. Routine self-elevation and policy-owner replacement protections remain.
- Frontend settings and onboarding explain that administrators review and publish contributor work. The editor permits selecting an administrator without writing permissions.
- The requested 30-second identity-token tolerance and latest homepage remain included.

## Validation

Both workspaces passed TypeScript and changed files passed ESLint. All **52 frontend unit tests** passed. The real PostgreSQL/OIDC editorial suite passed **13 tests**, including the administrator migration, duplicate-run audit behavior, contributor authoring, administrator review/publication, member denial and author self-approval denial. Migration and runtime-isolation suites passed **10 tests**. The dedicated browser test passed (1 test) with a future publication date, exercising real author submission and admin approval. A dedicated browser test is included at `frontend/e2e/admin-review.spec.ts` to exercise author selection/submission and administrator approval through the real screens.

## Artifacts

```text
rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-backend:pilot-20261028-4
rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-frontend:pilot-20261028-4
```

Local image IDs (not pushed registry manifest digests):

- Backend: `sha256:2b95373749fc91fdaa691fd9cc1e8a1af461c2113d57ab0e5128e35ed57d1ed8`
- Frontend: `sha256:12df967e9d9aa8e9b2bf4877475fd8f5832982d717c279209d671dce6893e8d3`

Production has not been modified by the assistant. User performs the following through local Docker and Azure Portal.

## Deploy in order

**Completed by user, October 28, 2026:** both images pushed, migration job Succeeded (26 seconds, 22:19:18–22:19:44 UTC), app revisions deployed and admin grants confirmed. Live screenshots subsequently show Contributor Fairchild's study assigned to Admin Fairchild, revision 10 approved and scheduled for October 30 at 08:00 America/New_York. User confirmed from the member account that the scheduled study remains absent and "A new study is on its way" appears. Due publication and subsequent member reading remain pending. The steps below are retained as the release procedure; do not repeat this rollout solely to resume testing.

1. Push both images:

   ```powershell
   docker push rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-backend:pilot-20261028-4
   docker push rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-frontend:pilot-20261028-4
   ```

2. **rooted-migrate → Containers**: edit the job image to `rooted-backend:pilot-20261028-4`. Preserve command `node`, argument `dist/src/infrastructure/migrate.js`, production setting and migration/runtime-password secret references. Save/apply, then **Run now** once. Require **Succeeded** and **Migrations applied** before moving on. The checksum-aware runner skips already applied migrations 001–027 and runs 028. Do not seed production.
3. **rooted-api → Revisions and replicas → Create new revision**: suffix `admin-review-20261028-4`; image `rooted-backend:pilot-20261028-4`. Keep command/arguments blank and preserve current env, secret references, ingress and scaling. Save/Create, wait for Running and check routing/readiness.
4. **rooted-frontend-centralus → Revisions and replicas → Create new revision**: suffix `admin-review-20261028-4`; image `rooted-frontend:pilot-20261028-4`. Preserve existing settings and make the new revision serve intended traffic.
5. Hard-refresh both signed-in browser sessions. Grants are read from membership on each request; do not create duplicate accounts or alter membership roles. Admin Fairchild's membership should now show approval/publication grants and should be selectable as the reviewer from Contributor Fairchild's study editor.

The continuous worker does not select reviewers, so it can remain on its verified current image during this API/frontend correction. Align it later in a controlled release if needed, preserving `node dist/src/workers/worker.js`, no ingress and min/max 1.

## Resume acceptance

Keep Admin Fairchild in the normal browser and Contributor Fairchild in the separate browser session. Contributor prepares a study and submits it to Admin Fairchild. Check that an author cannot select/approve their own study. Administrator opens the assigned study, reviews the exact draft and approves it. Check publication/scheduling, then read the published result as the existing member. Live AI setup and budgeted provider testing remain a separate pending stage; the manual editorial path can be tested first.

For rollback, previous images can be restored while the added administrator grants remain. Image rollback does not undo migration 028. Any reversal of review authority needs a separately reviewed, audited membership change; do not remove the policy-owner or final administrator to undo these grants.

Migration 028 runs inside the migration runner transaction. It temporarily removes FORCE for memberships/audit so a privileged table owner without BYPASSRLS can update all admin memberships, then restores FORCE before commit. Runtime ownership and RLS policies do not change; tests verify enabled/forced RLS afterward. Backend image was rebuilt after this migration refinement.
