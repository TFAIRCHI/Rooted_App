# Church onboarding and membership contracts

Authenticated global commands require the session cookie, `X-CSRF-Token`, and an `Idempotency-Key` (8–200 characters). Browser origin must match the configured application origin. All tenant commands also verify current active membership; UUIDs and invitation tokens do not authorize a different subject. Request bodies below are exact, with unrecognized fields rejected.

- `POST /v1/churches` `{name,slug,timeZone}` →201 `{id,name,slug,timeZone,capabilities,readingPolicy:'members',discussionsEnabled:false}`. `slug` is 3–60 lowercase letters/digits/hyphens. `timeZone` is IANA. The creator receives explicit administrative and `policy:manage` grants. Creation grants no author, doctrinal approval, or publication authority. The command and response commit atomically; identical retries return the same church.
- `GET /v1/churches/:churchId/invitations` →`{items:[{id,targetSubject,role,invitedBy,expiresAt,acceptedAt,revokedAt,createdAt}]}`. Requires `memberships:manage`; tokens/hashes are omitted.
- `POST /v1/churches/:churchId/invitations` `{targetSubject,role,reason}` →201 `{id,targetSubject,role,expiresAt,token,acceptPath,delivery}`. `targetSubject` is the exact application subject ID shown by the signed-in recipient's session, not an unverified email address. Expires after seven days. Share the token securely with that named recipient; the application does not claim to send invitation email. Basic invitations require `memberships:manage`. `approver`, `publisher`, and `admin` additionally require `policy:manage`. The inviter cannot target themself.
- `POST /v1/churches/:churchId/invitations/:id/revoke` `{}` →`{id,status:'revoked'}`. Only an unaccepted invitation can be revoked.
- `POST /v1/invitations/accept` `{token}` →201 `{churchId,role,capabilities}`. Actual OIDC identity must match the recipient. Issuer authorization, expiry, revocation and inviter's current authority are checked again inside the transaction. Invitation acceptance never authenticates the caller. Existing members use the audited role-change command instead.
- `POST /v1/churches/:churchId/members/roles` `{userId,role,reason}` →`{userId,role,capabilities}`. Replaces a named member's role bundle. Sensitive existing or new grants require `policy:manage`. No self changes. The church policy owner cannot be replaced through this routine endpoint.
- `POST /v1/churches/:churchId/members/status` `{userId,active,reason}` →`{userId,active}`. Same sensitive-grant policy applies. No self change, policy-owner removal, or reactivation of an erasure tombstone. Inactive membership immediately denies subsequent church access; background publication and delivery recheck current authority.

Role bundles:

| Role | Grants |
| --- | --- |
| member | Authenticated published reading and participation only |
| contributor | Assigned editing, manual sermons, series management, comments and AI use |
| approver | Staff reading, exact plan/content decisions and comments; no publication grant |
| publisher | Staff reading, schedule/publication/withdrawal and comments; no doctrinal grant |
| moderator | Staff reading, community moderation and comments; no doctrinal grant |
| admin | Membership administration, settings, privacy, audit, series and sermons; no doctrinal or publication grant |

Roles are explicit bundles, not an authority hierarchy. A reviewed ownership-transfer procedure and privileged bootstrap policy remain required for production operations; there is no routine platform-content access or administrator self-elevation endpoint.
