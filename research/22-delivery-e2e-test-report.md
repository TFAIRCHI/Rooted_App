# Delivery and Study Engagement Test Report

**Test date:** 2026-10-21  
**Environment:** Local development PostgreSQL, local OIDC, external providers disabled  
**Scope:** Approval, publication, member reading, Study Engagement, scheduling, idempotency, and delivery failure handling

## Executive result

**Status: Failed delivery gate.** The application has strong coverage around navigation, authoring, tenant boundaries, and member-page layout, but the primary approval-to-publication-to-member journey is not currently passing end to end.

The browser suite passed 8 of 9 tests. The failed test is the critical delivery scenario: create content, submit it, approve it, publish it, and read it as a member. It fails before publication because the API requires a `study_review_requests` row, while the test flow submits the study without first assigning an approver.

The local Grace tenant currently has **zero publications** and **zero delivery records**, so Study Engagement cannot be validated with a real published study until the approval flow is repaired.

## Commands and results

| Command | Result | Evidence |
|---|---:|---|
| `npm run test:e2e` | **8 passed, 1 failed** | Playwright failure at `frontend/e2e/core.spec.ts:189` |
| `npm run test:unit --workspace=@gather/frontend` | **14 passed** | Frontend unit suite |
| `npm run typecheck` | **Passed** | Contract checksum and both workspaces passed |
| `npm run lint` | **Passed** | Frontend, backend, and tooling lint passed |
| `npm run build` | **Passed** | Next.js and backend builds passed |
| `npm run test:integration` | **19 passed, 13 failed** | Existing integration assumptions fail around approver assignment and fixture identity setup |
| `npm run test:research` | **Passed** | 35 markdown files, 48 source definitions, 119 source references, 14 PNGs, 8 diagrams, 18 UI checks |

## Passing browser coverage

- Logo upload, palette extraction, and theme activation.
- Church name editing without changing the Rooted application identity.
- Navigation back to home from theme, settings, and account pages.
- Authenticated public church page logout.
- Calendar list/calendar view and date detail selection.
- Date-first blank manual plan creation, save, and reload recovery.
- Tenant and approval access boundaries through real local OIDC.
- Offline/stale browser editor recovery behavior.

## Critical failed journey

Test: `frontend/e2e/core.spec.ts:167`

Failure:

```text
422 approver_required
Choose an approver before submitting the study for review
```

The failure occurs when the test submits the content revision at `frontend/e2e/core.spec.ts:189`. The backend requires a pending `study_review_requests` record in `backend/src/api/core-routes.ts` before content submission can enter `in_review`. The UI workflow and test do not create that request first.

### Impact

1. A contributor cannot complete the normal create → approve → publish path without discovering an undocumented prerequisite.
2. No publication is created.
3. The member cannot read the study.
4. Study Engagement remains empty and cannot show reactions, comments, or delivery evidence.

## Current state-machine mismatch

The intended user flow is:

```text
Create Study → Gain Approval → Publish Study → Member Reads → Study Engagement
```

The implemented API flow is currently:

```text
Create Plan → Approve Plan → Create Content → Assign Approver
→ Submit Content → Approver Approves → Schedule or Publish
```

The mismatch is not only visual. The backend still requires a separate approver-assignment command and retains a plan-approval dependency. This conflicts with the requested single approval model.

## Delivery-specific weaknesses

### D1 — Critical: approval request prerequisite is not discoverable

**Observed:** Content submission returns `approver_required` when no review request exists.  
**Expected:** The contributor should select an approver in the visible approval step, then submit once; alternatively, submission should create the request using the selected approver.  
**Risk:** Contributors cannot complete the primary workflow; publication and member delivery are unreachable.  
**Recommendation:** Consolidate approver selection and content submission into one command or make the UI block submission until the request is visibly created and confirmed.

### D2 — Critical: Study Engagement has no successful publication evidence

**Observed:** Grace has zero rows in `publications` and zero rows in `delivery`.  
**Expected:** After approval and publish, the study must appear for a member and under contributor Study Engagement.  
**Risk:** Reactions, discussions, and delivery status are unverified.  
**Recommendation:** Add a mandatory release test that asserts publication creation, member read access, contributor engagement listing, engagement detail, and immutable snapshot identity.

### D3 — High: existing 10/20 fixture has a stale plan dependency

**Observed:** Content approval references plan revision 56 while the plan head is revision 57.  
**Expected:** Delivery timing should not invalidate an otherwise approved study.  
**Risk:** Manual delivery returns a generic publication-blocked error even though the time override is intended to work.  
**Recommendation:** Complete the single-approval redesign so the final approved study revision contains an immutable plan snapshot without requiring a separate current plan approval at publication time.

### D4 — High: generic publication-blocked error hides the actual cause

**Observed:** `The approved study could not be delivered; review its approval and schedule state` covers stale dependency, revoked authority, invalid schedule, and publication-worker failure.  
**Risk:** Contributors cannot determine whether to assign an approver, revise content, change a date, or contact an administrator.  
**Recommendation:** Return structured causes such as `approval_dependency_changed`, `publisher_permission_revoked`, `publication_already_exists`, or `delivery_worker_failed`, with an actionable UI message.

### D5 — Medium: integration suite still encodes the previous approval contract

**Observed:** `npm run test:integration` reports 19 passing and 13 failing tests. Several failures expect content approval without creating a review request, while other failures use the legacy contributor fixture.  
**Risk:** Regression gates do not describe the current product behavior and cannot reliably protect delivery.  
**Recommendation:** Rewrite integration fixtures around the approved two-role model and add one canonical delivery fixture shared by API, browser, and engagement tests.

### D6 — Medium: automatic catch-up and explicit publish need separate evidence

**Observed:** The worker retains a bounded automatic catch-up policy, while explicit publish now overrides the planned time.  
**Risk:** A future change could accidentally reintroduce the worker’s 15-minute rule into manual delivery.  
**Recommendation:** Keep separate tests for scheduled worker delivery, late explicit publish, approval-after-planned-time auto-delivery, duplicate publish, and provider-disabled web publication.

## Required acceptance test

1. Sign in as `anna.contributor`.
2. Create or select a study date whose planned time is already in the past.
3. Complete the study content.
4. Select `james.contributor` as approver.
5. Submit the study once.
6. Sign in as James and approve the exact revision.
7. Assert the approved study becomes published immediately, or that an explicit publish action succeeds immediately.
8. Sign in as `riley.member` and assert the study is visible at `/c/grace`.
9. Sign in as a contributor and open Study Engagement.
10. Assert the study appears in the delivered list with the same publication ID and immutable content snapshot.
11. Open the engagement detail and assert member-facing content, reactions, discussion state, and delivery evidence load.
12. Repeat the publish command with a new idempotency key and assert no duplicate publication is created.

## Recommended remediation order

1. Remove the separate plan approval requirement from the publication dependency chain.
2. Make approver selection and study submission one explicit, observable workflow step.
3. Add a canonical API integration test for late approval and immediate publication.
4. Add the member and Study Engagement assertions to the same test.
5. Add structured publication-block reasons and actionable UI recovery.
6. Re-run the complete unit, integration, browser, research, and build gates.

## Test artifacts

- Playwright failure screenshots and trace: `frontend/test-results/artifacts/`
- Browser test source: `frontend/e2e/core.spec.ts`
- Editorial integration source: `backend/tests/integration/editorial.test.ts`
- Publication worker: `backend/src/workers/publication.ts`
- Editorial API: `backend/src/api/core-routes.ts`

This report records test evidence only; it does not claim that external SMS/email/push delivery was validated. External providers were disabled in the local environment.

## Remediation execution update

Build prompt 1.2.8 implementation began on 2026-10-21. The backend contract changes are documented in `BuildPrompts/1.2.8/evidence/implementation-2026-10-21.md`. Editorial integration now passes the critical approval, late publication, immutable snapshot, schedule, and idempotency scenarios. The final browser delivery gate remains blocked by the isolated Next/Playwright harness terminating during the critical scenario, so member and Study Engagement browser success is not claimed.

The prepared 10/20 Grace study was subsequently verified through the running local services after restart: explicit `publish-once` returned `201`, created publication `c5a2b94f-2ad6-4731-b2f6-2fef7d76e805`, the authenticated Church Member study endpoint returned the immutable snapshot, and contributor Study Engagement listed the same publication. External notification providers remained disabled.
