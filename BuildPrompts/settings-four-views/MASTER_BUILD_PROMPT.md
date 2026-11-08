# Build prompt: four Settings views from Figma

**Status:** Approved by Tyler and implemented locally on November 8, 2026. The original scope and acceptance criteria remain below. See [implementation evidence](evidence/implementation.md). Deployment remains a separate user-operated step.

## Objective

Reconstruct the signed-in church Settings experience using the six frames in [the supplied Figma file](https://www.figma.com/design/FprelWdsYmVPRZGT1d629W/Untitled?node-id=0-1&p=f&t=CtTAHb9V1greNECw-0): four main views and the Add member and Edit access drawers. Replace the one current Settings entry in the **existing** left sidebar with four entries: **Members & access**, **Church settings**, **Reading & publishing**, **Integrations & assistance**. Keep every other sidebar entry, label, order, visual treatment, church picker, account area, and mobile behavior as they are today. Do not adopt the different sidebar shown in Figma.

Use Figma's hierarchy, cards, typography, spacing, color, status treatment, and drawer layout as the design reference. Actual copy and enabled controls must reflect Rooted's implemented product and security model. Never populate the interface with the mock people, statuses, schedules, budgets, or provider connections shown in Figma.

## Read and assess before implementation

1. Read `frontend/AGENTS.md` and the relevant bundled Next.js guides in `frontend/node_modules/next/dist/docs/` before changing Next code. Check current working-tree changes first and preserve them.
2. Inspect the Figma file directly. Relevant frames: Members & access `3:11325`, Add member `3:11521`, Edit access `3:11784`, Church settings `3:12045`, Reading & publishing `3:12191`, Integrations & assistance `3:12367`. Verify desktop and narrow-width behavior from Figma where available; make accessible responsive decisions where it is not specified.
3. Inspect `frontend/components/workspace.tsx`, `workspace-pages.tsx`, `membership-settings.tsx`, `account-requests.tsx`, `public-access-settings.tsx`, `provider-settings.tsx`, `theme-settings.tsx`, `public-delivery.tsx`, `frontend/app/[route]/page.tsx`, associated styles and tests. Inspect the corresponding API contracts in `backend/src/api/core-routes.ts`, `onboarding-routes.ts`, `provider-routes.ts`, and public access routes. Use the current code, not older build prompts, as the functional source of truth.

## Current-state map and target views

| Target view | Move or adapt from current Settings | Functional requirements |
|---|---|---|
| Members & access | `MembershipSettings`, `WorkspaceData.members`, invitations API | Real people and invitation lists with All people / Members / Invitations filters, search/filter controls, status/action menus, Add member and Edit access drawers. Preserve subject-bound invitations, role replacement, activation/deactivation, revocation, reasons, self-change restrictions, policy-owner rules, and audit behavior. |
| Church settings | Church name and privacy requests in `AccountRequests`; timezone from `Settings`; theme link | Church identity edit, IANA timezone and schedule explanation, theme preview/link, account export and erasure review requests. Reuse existing audited `/churches/:id/settings` name/timezone writes, `/theme?church=...`, and privacy request endpoints. |
| Reading & publishing | Reading policy/discussions, editorial schedule, reviewer list, `PublicAccessSettings` | Show current reading state, gated public access actions, discussion controls, release schedule, reviewer authority, and publishing path. Preserve the public reading and SMS evidence/review gates and approval rules. |
| Integrations & assistance | `ProviderSettings`, related delivery and source-upload links | Show actual external-service availability, AI profile and enforced monthly budget, transcription availability, Planning Center connection and read-only import, SMS sender state, and links to delivery/consent and help. Keep provider controls honest about configured versus live-verified status. |

## Design-to-product decisions

- **Reading access:** The current product permits public study reading through church links after the required review. Figma's “Church members only” example is sample content. Show the actual `readingPolicy` and public access status; never let a dropdown bypass the public-access review endpoint. Keep guest engagement and SMS opt-in as separate gated states.
- **Members:** Public-link readers do not need a member sign-in. Do not reintroduce member login or require membership to open a published public study. Existing authenticated member records may remain visible for legacy/church administration, but invitation copy should make clear that invitations grant church workspace identity and role access.
- **Identity lookup:** Figma depicts searching an identity provider by name or email. Rooted currently creates invitations for an **exact provider subject**, and the existing API does not perform directory search. Build the drawer around verified exact-subject input with clear guidance; do not render a fake search result or imply email uniquely identifies a person. Directory lookup is a separate feature and is outside this migration.
- **Church name and timezone:** Backend writes already exist. Preserve the warning that changing the church default timezone does not reschedule approved studies; changing a study date/time requires renewed approvals. Refresh the session/workspace presentation after a successful rename without an unnecessary full page reload if feasible.
- **AI budget/profile:** The current backend persists a monthly token limit, profile, profile version, rights confirmation, SMS segment limit, and transcription seconds limit; it exposes provider status but no read endpoint for saved budget/profile. Add an authorized, nonsecret read contract if the new view must display/edit the saved values. Figma's *daily* budget, separate Bible translation setting, and separate biblical-principles fields are not existing enforced settings. Do not present them as saved or enforced. Use the supported profile and monthly limit, or implement and test a server-enforced contract for any additional control before exposing it. Do not expose API keys or provider tokens.
- **Provider and feature status:** Distinguish operator-disabled, unconfigured, configured/unverified, authorized, and genuinely verified states. A “Connect” or “Register” action must call the real endpoint, respect permissions and prerequisites, and report the actual result. Transcript upload links to its existing functional flow; it must not pretend an unavailable transcription service ran.
- **Authority:** Client controls must match actual capabilities, and server authorization remains decisive. `memberships:manage`, `admin:manage`, `settings:manage`, and `theme:manage` are not interchangeable. Avoid showing an editable control to a user who has only read access. Approver/publisher/admin and policy-owner restrictions remain intact; users cannot change their own grants.

## Migration plan

### Phase 1 — Route and component split

Create four bookmarkable routes, recommended `/settings/members`, `/settings/church`, `/settings/reading`, and `/settings/integrations`, using an explicit route allowlist. Keep the current `Workspace` shell and its data loading/church switcher. Replace only the Settings navigation item with the four entries in the stated order. Mark the active entry with `aria-current="page"`; update the topbar crumb. Preserve the selected `church` query parameter across all four links and cross-view actions. Make legacy `/settings?church=...` resolve to `/settings/church?church=...` without losing the church selection; update internal links that currently point to `/settings`. Direct load, refresh, Back/Forward, and church switching must work.

Extract view components and shared settings primitives from `workspace-pages.tsx`; avoid mounting all four views or firing all four views' API calls on each route. Keep existing API operations and CSRF handling. Scope new CSS to settings views so Dashboard, Calendar, Create a Study, Study Engagement, public pages, and the existing sidebar retain their appearance.

### Phase 2 — Build the four Figma views

Implement the cards, forms, tables, statuses, empty/loading/error/success states, and cross-view links in the current visual system, following Figma's main content and drawer design. Use semantic navigation for routes; use real tabs only for within-view filters. On narrow screens, cards stack, tables remain readable, and drawers become usable full-width panels. Provide focus entry/return, Escape/close behavior, labels, validation, confirmation for destructive changes, and keyboard operability.

For Members & access, preserve the existing invitation-token handoff after creation. Ensure pending, accepted, revoked, and expired invitation states are derived from real data. Give explicit explanations when a person cannot be edited. If filtering/searching can be done from already-loaded data, keep it client-side. Do not add a backend directory dependency.

For Church settings, connect church name, timezone, theme, and privacy request cards to the existing endpoints and guards. For Reading & publishing, use actual schedule/reviewer data and keep the public access and approval gates prominent. For Integrations & assistance, surface real provider status and configured budgets, with disabled actions and helpful explanation when prerequisites are missing.

### Phase 3 — Close only the necessary data gaps

Add small backend read support only where the design needs persistent values or accurate status currently unavailable, notably current provider budget/profile settings. Audit any changed settings write, preserve church isolation, validate inputs, and keep secrets server-side. Avoid adding an unaudited daily limit, directory search, new member authentication flow, or a new provider activation path just to imitate mock data. Document any Figma field intentionally adapted to current capabilities in the implementation handoff.

### Phase 4 — Verify and hand off

Run focused frontend unit/component tests for route visibility, church-context retention, forms, permissions, and drawer interaction. Run relevant backend integration tests if a backend contract changes. Run focused browser journeys at desktop and mobile widths: open every settings route directly, switch churches, create/revoke an invitation, change another person's role/status with authorization limits, rename church/change timezone, view and manage public access without bypassing review, submit privacy requests, inspect provider-disabled and configured states, and follow cross-view links. Confirm unrelated sidebar entries and pages have no visual or behavioral regression. Capture implementation screenshots and record actual test results and limitations. Prepare a reviewable image/release handoff only after tests pass; do not deploy without approval.

## Acceptance criteria

1. The left sidebar is unchanged except for the single Settings item becoming exactly the four named entries, in the specified order. The same shell works on desktop and mobile.
2. Each Figma main view has its own route and contains its corresponding real settings; Add member and Edit access use drawers with working actions. No existing Settings function is lost.
3. Church selection and existing `/settings` links survive migration; direct URLs, refresh, Back/Forward, and links between settings views preserve context.
4. All displayed data belongs to the selected church. Privileged controls follow actual capabilities, backend enforcement, audit rules, CSRF protection, and policy-owner/self-change restrictions.
5. Public-link reading remains available without member login; public reading, guest engagement, and SMS gates cannot be bypassed by the new interface.
6. No mock Figma data, fake identity search, unenforced budget, invented provider verification, or exposed secret appears in the UI.
7. Focused automated and browser checks pass, with desktop/mobile screenshots and a concise change/test/risk report for Tyler's review.

## Scope boundary

This is a Settings information-architecture and interface migration with minimal supporting API reads. Do not redesign the rest of the workspace, change the four existing non-Settings sidebar entries, change public/member access architecture, or deploy to Azure/Twilio. Preserve unrelated local work already in progress.
