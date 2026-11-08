# Four Settings views: implementation evidence

Implemented November 8, 2026 after Tyler requested the approved Build prompt be built. The pre-build snapshot was committed and pushed to GitHub first as `3adfe4a83c1db132c24b3c164a51454123f6726b` and verified against `origin/main` before any Settings implementation.

## What changed

- Replaced the one Settings sidebar item with Members & access, Church settings, Reading & publishing, and Integrations & assistance. The four existing non-Settings entries, church switcher, account area, and shell remain in place.
- Added explicit `/settings/[section]` routes and a `/settings` redirect preserving `church=`. Updated onboarding and source-library links to their corresponding view.
- Built the four main views with real church data and existing writes, plus working invitation and access-edit drawers. The roster includes inactive memberships using a new authorized `/members/access` read; the existing `/members` study-assignee API was retained unchanged.
- Added a nonsecret provider-settings read so saved profile and budget values repopulate after reload. Provider credentials remain server-side. Public reading and SMS actions still use their existing evidence-gated endpoint.
- Scoped Settings styling to the new views. The supplied Figma's different sidebar was not adopted.

## Product adaptations from Figma

- Public study readers continue using church links without member sign-in. The mock “Church members only” audience is replaced with the actual backend reading state and reviewed access controls.
- Add member requires the exact identity-provider subject; there is no simulated name/email directory search.
- AI assistance shows the server-enforced monthly token limit and current profile. The mock daily budget, separate Bible-translation setting, and separate principles field were not introduced without persistent enforcement.
- Integration badges distinguish unavailable/configured from live verification. Operator-disabled services remain disabled.

## Verification

- `npm run typecheck` — passed, including contract check and both workspaces.
- `npm run lint` — passed.
- `npm run test:unit` — passed: frontend 53 tests, backend 41 unit/integration-adapter tests, operations 4 tests.
- `node --env-file=.env --import tsx --test --test-concurrency=1 backend/tests/integration/access-sessions.test.ts backend/tests/integration/providers-api.test.ts` — passed after correcting the new isolation assertion to reflect an admin who belongs to both fixture churches. New assertions cover roster authorization/MFA, provider-settings readback, and church isolation. The final provider suite alone passed 12/12; the access-session suite passed 6/6.
- `npx playwright test frontend/e2e/settings-views.spec.ts` — passed. Checked all four routes, legacy redirect, sidebar labels, church context, provider settings persistence, invitation creation, access deactivation/reactivation, mobile navigation, and axe WCAG 2/2.1 A/AA checks within each view.
- `npx playwright test frontend/e2e/core.spec.ts -g "church administrators can edit tenant name"` — passed after protecting the church form from an initial asynchronous read overwriting an in-progress edit.
- `npm run build` — passed for frontend and backend.

Screenshots: [Church settings](church-desktop.png), [Reading & publishing](reading-desktop.png), [Integrations & assistance](integrations-desktop.png), [Members & access](members-desktop.png), [Mobile members view](members-mobile.png).

## Release boundary

The code is built and verified locally. No Azure Container App, Twilio, database schema, or production setting has been changed by this work. The release requires both frontend and backend images because the frontend uses two new backend read endpoints. There are no new migrations or runtime secrets for this Settings change. Deploy the backend API first, then the frontend; the worker uses the same backend image but does not need a new revision for these read endpoints.
