# Change Request 1.2.7

## Product outcome

Rooted needs a recognizable login screen and a controlled way for church administrators to onboard people into their church workspace.

## Login experience

Use the supplied reference image at `Images/Login_Screen_Example.png` as the visual direction:

- split desktop composition;
- Rooted brand and “Growing Deeper Together” identity;
- dark editorial panel with the existing “Good work grows together” message;
- light form panel with email/username, password, show-password control, forgot-password affordance, sign-in button, and access-help link;
- mobile layout collapses to the form first while preserving the Rooted identity.

The user does not select a role during sign-in. The server authenticates the identity and derives the destination from active church memberships and capabilities.

## Roles and routing

- **Church Member:** published study reading and permitted member engagement only; route to the church member experience.
- **Contributor:** workspace access, study creation, review coordination, publication, and Study Engagement; route to the contributor dashboard.
- **Administrator:** contributor access plus membership administration, church settings, integrations, security events, and role assignment; route to Settings or the administrator dashboard.

The current product’s Contributor role remains the authoring role. Administrator is an elevated capability set, not a client-side toggle.

## Admin membership space

Add a Settings section where an authorized Administrator can:

- invite or create a Church Member;
- invite or create a Contributor;
- invite or create an Administrator;
- view active/inactive status and invitation state;
- revoke pending invitations;
- deactivate accounts without deleting church-owned editorial history;
- require reauthentication for administrator role changes;
- see an audit entry for every membership change.

Prefer subject-bound invitations for production. Local demo accounts may be seeded behind an explicit development flag.
