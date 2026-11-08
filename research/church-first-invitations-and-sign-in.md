# Church-first invitations and sign-in

Research and recommendation · November 8, 2026

## What is difficult today

The new Members & access screen asks an administrator for an **Exact provider subject**. Rooted creates a seven-day token and tells the administrator to share it manually. The invitation can be accepted only by a signed-in identity whose subject was known in advance. That makes inviting a new contributor impractical. The public team sign-in screen does not ask which church the person intends to open; after login the API can choose the first membership alphabetically, and the workspace can also default to the first church. A person in two churches therefore may land in the wrong context. These behaviors are visible in `settings-members.tsx`, `onboarding-routes.ts`, `auth/routes.ts`, and `workspace.tsx`.

Rooted already has the right underlying shape for multi-church access: one verified identity can have several `memberships`, keyed by `(church_id, user_id)`. A second identity account per church would make cross-church work harder and would not fix church selection.

## Recommended journey

1. **Administrator invites:** In the selected church’s Members & access view, enter first name, last name, email, and role. Show the church name and the permissions that role grants. Send an invitation email; display Pending, sent/failed, expiration, resend, and revoke states. Do not ask for a provider subject or expose a raw token in the normal UI.
2. **Recipient accepts:** The email says “Join **[Church]** on Rooted” and opens a single-use, expiring church-bound link. Rooted shows the church and intended role, then sends the person through the existing Entra External ID sign-in/sign-up flow. Verify mailbox ownership and the returned tenant identity before binding the invitation to the subject. For contributor/admin privileges, preserve the current MFA requirement. Then atomically create that church’s membership and take them to its workspace.
3. **Later sign-in:** The home-page **Team sign in** path asks for the church first (a public church slug/link or a controlled chooser) and then the email used at the identity provider. After authentication Rooted verifies an active membership in that selected church and opens `/dashboard?church=<id>`. A person with multiple churches can deliberately switch in the existing church picker. If they arrive from an invitation, the church is already selected.
4. **Existing account, new church:** An invitation to the same email in another church adds a membership to the same verified identity. It never creates a competing password account or merges identities solely because email strings match.

The administrator creates the church profile with only first name, last name, email, and role. Entra External ID authenticates the person through its configured email-based flow. [Microsoft user-flow options](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-user-flow-sign-up-sign-in-customers).

## Important boundaries

- **Identity:** Keep the current `entra:<tenant-id>:<object-id>` subject as the durable key. Never grant access from a typed email, `login_hint`, or church name alone. Bind only after the provider callback and a verified match to the invitation mailbox; if the configured token lacks trustworthy email evidence, add an email challenge to that mailbox before acceptance. Validate the real production claims in both sign-in paths. Microsoft documents `email_verified` semantics for federated OIDC, but Rooted must verify its actual Entra configuration rather than assume the claim is always present. [Claims mapping](https://learn.microsoft.com/en-us/entra/external-id/customers/reference-oidc-claims-mapping-customers).
- **Authorization:** Church selection is navigation, never permission. Every API action keeps its existing church-scoped membership, capability, MFA, CSRF, and tenant-isolation checks. Preserve role approval rules, self-elevation protection, final-admin protection, invitation revocation, and audit records.
- **Email:** Rooted has no production invitation email sender today. A real sender, verified domain, delivery status, retries without duplicate invites, suppression/abuse controls, and an operator setup are required. Azure Communication Services Email fits the existing Azure deployment, but the Build may choose an equivalent provider already approved for Rooted. [Azure email setup](https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/email/send-email).
- **Church discovery:** An invitation link supplies church context. For general sign-in, allow an exact public church slug/link and a chooser of the person’s authorized churches after authentication. Do not reveal whether a particular email belongs to a church before authentication.
- **Readers:** Public study links continue to work without login. Church choice on Team sign in concerns contributors and administrators.
- **Existing data:** Keep existing memberships and prior invitations usable during migration. Convert the admin UI and new invitation endpoint to email-first; retire the subject-first form only after the new flow passes production-provider validation.

## Decision

Build an **email invitation with church-bound acceptance and church-first team sign-in**. Retain one identity across churches. The administrator enters first name, last name, email, and role; the person signs in through Entra using their email. This addresses the unavailable provider subject, makes the destination church explicit, and allows the same person to work with two churches without duplicate accounts.

The build needs a live Entra External ID validation and a working outbound email sender before deployment can be called ready; local mocks alone cannot prove either integration.
