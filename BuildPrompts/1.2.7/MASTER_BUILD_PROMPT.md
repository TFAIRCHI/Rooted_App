# Master Build Prompt — Rooted 1.2.7

Implement the login and administrator membership capability after approval.

## Phase 1 — Rooted login screen

- Recreate the supplied split-screen visual direction from `Images/Login_Screen_Example.png` using responsive HTML/CSS and existing Rooted tokens.
- Replace visible Gather/demo persona wording with Rooted language.
- Provide username/email, password, password visibility control, forgot-password/help affordance, submit state, error state, loading state, and mobile layout.
- Do not offer a client-selected role field.

## Phase 2 — Authentication and routing

- Preserve production provider-backed authentication boundaries.
- Add development-only username/password fixtures behind `ROOTED_ENABLE_DEMO_LOGINS=true`.
- Seed the four identities listed in `DUMMY_LOGINS.md` using secure password hashes.
- After authentication, query server memberships and route Church Members to `/c/:slug`, Contributors to `/dashboard?church=:id`, and Administrators to `/settings?church=:id` or an equivalent admin landing page.
- If multiple church memberships exist, show a secure church chooser after authentication; never infer a church from an untrusted role parameter.

## Phase 3 — Administrator membership settings

- Add an Administrator-only “People & access” settings section.
- Support invite/create for Church Member, Contributor, and Administrator.
- Use the existing subject-bound invitation system for non-demo flows.
- Show pending, accepted, revoked, active, and deactivated states.
- Require backend capability checks, tenant filters, CSRF, idempotency, audit events, and step-up/reauthentication for Administrator grants.
- Prevent self-escalation, removal of the final administrator, and unauthorized administrator creation.
- Revoke sessions when a membership is deactivated or materially downgraded.

## Phase 4 — Testing and security gate

The build is complete only when:

- all four dummy logins work only in development/test mode;
- Church Member, Contributor, and Administrator route correctly from server-derived memberships;
- role tampering, cross-tenant IDs, self-escalation, final-admin removal, CSRF, replayed invitations, and deactivated sessions are rejected;
- admin membership changes create auditable records;
- passwords never appear in logs, responses, fixtures outside the approved file, or client bundles;
- login is accessible by keyboard, screen reader, and mobile viewport;
- typecheck, lint, unit, integration, build, accessibility, and targeted browser tests pass;
- demo credentials are documented in `DUMMY_LOGINS.md` and marked development-only.
