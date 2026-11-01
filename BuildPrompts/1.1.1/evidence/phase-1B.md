# Phase 1B — Manual sermon and date-first planning evidence

Build: **1.1.1**. Status: **Ready for Review — automated gate passed; human review outstanding**. Completion timestamp/fingerprint: **not set**. Existing approval covers phases 0–4; no new permission is required for authorized independent work. Dependent implementation/acceptance must respect the [master sequence](../MASTER_BUILD_PROMPT.md#6-phase-execution-table).

## Observed implementation

[Core API](../../../backend/src/api/core-routes.ts), [plan editor](../../../frontend/components/plan-editor.tsx), [slot settings](../../../frontend/components/slot-settings.tsx), [draft recovery](../../../frontend/lib/drafts.ts). Source contains manual sermon/series/slots, exact date-first choices, blank plan editing, autosave/local recovery, optimistic preconditions, revision comments/mentions and notifications.

These observations are supplemented by the current automated gate report; they do not replace the required human/editorial/accessibility review.

## Test definitions and supplied results

[Browser workflow definitions](../../../frontend/e2e/core.spec.ts), [editor component tests](../../../frontend/components/plan-editor.test.tsx), [draft recovery tests](../../../frontend/lib/drafts.test.ts), [editorial integration definitions](../../../backend/tests/integration/editorial.test.ts). Frontend unit suite: 7 passed reported by main; exact current command artifact/fingerprint not supplied. Browser and full integration results pending.

The current gate ran the complete regression set and 4 Playwright browser tests. The machine-readable result is [automated/phase-1B.json](automated/phase-1B.json); its `automatedPassed` value is true and its status is `blocked_required_review`.

## Complete required gate — unchecked

Primary acceptance: AC01–AC03, AC05–AC06, AC10–AC12, AC15, manual portion of AC18; regress AC13–AC14.

- [ ] Browser → backend → database journey creates a manual sermon/notes source, weekly series and independent dated slots. No AI/provider required; corrections preserve source revisions/provenance.
- [ ] Dates/weekdays appear before the planning pane, with time/zone, assignee and distinct plan/content statuses. Keyboard/mobile selection opens the correct date below the selector.
- [ ] Dropdown has exactly the two required primary choices. Scratch fields start blank, notes optional; proposal-unavailable state is truthful before AI exists. No hidden generated content or generation on selecting/viewing a method.
- [ ] Partial drafts save but incomplete plans cannot submit. Typed extensions/schema versions validate. Add Tuesday, change one day's time, change zone and assignment without applying changes to every day.
- [ ] Server acknowledgment, offline/local buffer, sign-out clearing/expiry and same-user/tenant recovery differ correctly. Switching dates, reloads and reconnects preserve work without crossing user/tenant boundaries.
- [ ] Two independent sessions saving one ETag produce a 412 conflict with preserved local work and accessible comparison. Recovery never auto-approves or auto-publishes.
- [ ] Comments/mentions target an exact revision/field and active same-tenant members; changes/assignment notifications deduplicate and exclude private body text.
- [ ] Browser/component tests cover empty/loading/error/forbidden/offline/conflict states. Automated accessibility plus manual keyboard/focus/reflow checks cover complete authoring at phone, tablet and desktop sizes.

All common mandatory gate rules and prior required regressions also apply. A future automated runner pass does not replace an item absent from its suite or any required external/human proof.

## Known blockers and missing evidence

The G1A prerequisite has passed. Required authoring accessibility review and editorial review are absent. These are the remaining phase-1B blockers; automated coverage includes the date-first manual workflow, approval/publication flow, tenant boundaries and stale/offline recovery, but does not certify human keyboard/focus/reflow or pastoral content review.

## Current gate refresh — 2026-10-19

The current automated gate passed research validation, lint, typecheck, unit, integration, build and all 4 browser journeys. Phase 1B is intentionally not marked Complete until the required human review evidence is attached.

Owners: main/backend/frontend agents for missing implementation/test/operational artifacts; church/account/rights/privacy/accessibility reviewers for external decisions and sign-offs. See [development prerequisites](../../../docs/development.md#prerequisites-and-blockers) and [source-to-acceptance mapping](../../../docs/source-evidence.md). No capability is excluded from approved scope and no required gate is waived.

## Completion decision

**Not complete.** All required test/review checkboxes remain open until concrete command results, test IDs, UTC execution times, tested source/lockfile/migration fingerprint and actual reviewer/provider artifacts are recorded. Deployment/live messaging remain unauthorized. Independent research, provider preparation and test design may continue; unmet prerequisite gates still prevent dependent phase advancement.
