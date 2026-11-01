# Change Request — Rooted

## Product identity

- Rename the product from **Gather** to **Rooted**.
- Use the tagline **Growing Deeper Together** across sign-in, staff navigation, member reading pages, metadata, documentation, and accessible labels.
- Preserve each church's own name as tenant content; Rooted is the platform brand.

## Unified study workflow

Replace the two pastor approval sequence with one reviewable study workflow:

`date → study workspace → contributor draft → pastor review → scheduled/published study`

The plan and member-facing devotional draft remain distinguishable sections of one dated study workspace, but they are submitted and approved as one immutable revision package. A pastor/approver may request changes or approve the package once. Approval remains revision-bound, auditable, and required before scheduling, publishing, or messaging. Editing any approved plan or devotional field creates a new draft and requires renewed approval.

Remove the normal-path requirement for separate plan approval and remove separate pastor-facing plan/content approval actions. Preserve historical compatibility only if needed for migration; do not expose two approval actions in the user experience.

## Church theming

Pastor and contributor members with the new explicit `theme:manage` capability may customize their church workspace. Church administrators remain able to manage it through `settings:manage`.

Minimum theme fields: `mode` (light/dark/system), primary color, accent color, and surface/background color. Validate colors server-side, scope settings to the active church, audit changes, apply them to staff and member views, and provide accessible contrast guidance/previews.

## Non-goals

- No production deployment, live provider activation, or real messaging.
- No removal of immutable revisions, comments, audit trail, or pastoral authority.
- No broad redesign beyond the unified workflow and tenant theming.
