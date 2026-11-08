# Church-first invitations: implementation evidence

Date: 2026-11-08. Source: `main` (release commit and image IDs are recorded in the [Azure handoff](../../../deploy/azure/church-first-invitations-release-20261108.md)).

## Implemented

- Settings → Members & access asks for first name, last name, email, and role, and shows church-scoped invitation status, resend, revoke, and history. New contributors receive preparation permissions without automatic approval or publication rights. Existing subject-first invitations and endpoints remain available through their expiry for compatibility; the normal UI no longer asks for a provider subject or exposes a manual token.
- Migration `031_email_invitations.sql` adds tenant-isolated email invitations, delivery attempts, one-time token hashes, acceptance identity, email challenge records, and session email evidence. A person keeps one provider identity and can have memberships in multiple churches.
- The API sends branded invitation and challenge emails through Azure Communication Services Email. It records provider acceptance, failed configuration, and uncertain sends separately. The invite link puts the token in the URL fragment; the frontend submits it in a POST body and removes the fragment from browser history.
- Acceptance checks the signed-in subject, invited mailbox evidence, MFA, token validity, inviter's current authority, self-grant, and existing membership before an atomic church membership insert. When the provider does not supply a trustworthy verified email, the invitee completes a code challenge to the invited mailbox.
- Team sign-in carries the selected church slug through one-time OIDC state, checks active membership after callback, and opens that church. Existing multi-church users can choose a church after sign-in. Public study readers remain on link-based access.

## Local verification

| Check | Result |
| --- | --- |
| TypeScript contracts and both workspaces | Passed |
| ESLint for frontend, backend, tooling | Passed |
| Frontend/backend/ops unit suites | Passed: 53 / 41 / 4 |
| Invitation and access-session integration tests | Passed: 8 tests; migration applied to disposable PostgreSQL databases |
| Extra invitation authority/rotation integration checks | Passed: unprivileged inviter, token rotation, authority revoked at acceptance |
| Browser journeys | Passed: invitation into second church, acceptance, repeat church-first sign-in; Settings, public sign-in links, public pages and marketing navigation (12 tests total across focused runs) |
| Docker | Both `linux/amd64` API and frontend images built; inspect IDs in Azure handoff |

The browser email transport is isolated and simulated. No live Entra customer flow or Azure Communication Services sender was available for a real delivery test. Production rollout remains gated on verified sender configuration, real email/MFA claims, and a live test-address acceptance journey. Do not infer real inbox delivery or carrier/provider behavior from the local tests.

## Compatibility and follow-up

The old subject-first invitation API remains for previously issued tokens until their original expiry. New invitations use the email route. Keep the old table and endpoint through the maximum legacy expiry, then remove them in a later reviewed migration. A failed or uncertain send leaves the invitation without access and allows an authorized administrator to resend, rotating the token. Monitor the `unknown` status for provider reconciliation before repeated sends.
