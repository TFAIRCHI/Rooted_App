# Study Engagement Research

## Verified repository findings

- Published studies are available through `publishedStudies` and are joined to immutable publication revisions in `backend/src/api/core-routes.ts`.
- Reactions are already modeled per publication and member with the types `thankful`, `encouraged`, and `praying` in `backend/migrations/001_core.sql`.
- Discussions are publication-scoped, have moderation status, and are already separated from editorial approval.
- Contributor navigation is centralized in `frontend/components/workspace.tsx`; the current primary destinations are Dashboard, Calendar, Create a Study, and Settings.
- `MemberActions` already displays member-facing reactions and approved/pending discussions in `frontend/components/member-actions.tsx`.
- Delivery history and provider evidence are already represented by the delivery center and provider routes, but provider availability is configuration-gated.

## Recommended UX

Add one navigation item: **Study Engagement**. Use a two-pane desktop layout:

1. **Published studies list:** title, publication date, scheduled date, reaction total, discussion count, and delivery status.
2. **Admin reading view:** the exact published study content on the left and an engagement summary on the right.

On smaller screens, stack the reading preview first, then reactions, discussions, and delivery evidence. Use a clear “Member view” label and never mix editable content controls into this screen.

Recommended detail sections:

- **Member preview:** title, Scripture references, body, reflection, discussion question, application, and the same visual hierarchy as the member route.
- **Appreciation:** three totals and total responses; do not show member names by default.
- **Conversation:** approved comments first, pending count second, hidden/report count only for authorized moderators.
- **Publication and delivery:** publication timestamp, scheduled local time, church timezone, channel, and provider status with “not verified” language where applicable.

## Permission model

The route requires `workspace:read` and `moderation:manage` or a new narrower `engagement:read` capability. Recommendation: add `engagement:read` and grant it to Contributors by default. Do not grant member users access through route obscurity. Every query filters by `church_id` and every publication must belong to the requesting church.

## Privacy and safety

Default to aggregate reaction counts. Show comment author display names only where the church policy already permits the contributor to moderate discussion; otherwise show “Church member.” Never expose phone numbers, notification addresses, raw provider payloads, or private report reasons in this workspace. Counts should include only persisted reactions and comments, not inferred sentiment.

## Alternatives

- Reuse the existing Delivery page: rejected because delivery operations and pastoral engagement review are different jobs.
- Put engagement inside Calendar: rejected because historical studies are not calendar planning tasks.
- Build a full analytics dashboard: deferred; it adds complexity before the basic contributor question—“How did this published study land?”—is answered.

## Open questions

- Should Contributors see pending comments, or only moderators? Recommendation: show the count and status, but require `moderation:manage` to read comment text.
- Should historical studies be paginated? Recommendation: yes, cursor pagination after the first implementation slice.
- Should member names be visible for approved comments? Recommendation: configurable church policy, default anonymized.
