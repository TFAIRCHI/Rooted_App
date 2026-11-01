# Rooted Role, Navigation, and Approval Simplification Research

**Status:** Recommendation package; not yet implemented  
**Date:** 2026-10-20  
**Evidence:** Current repository code and prior Rooted UX audit

## 1. Executive recommendation

Rooted should present only two product roles:

| Product role | What the person can do |
|---|---|
| **Church Member** | Read published studies for their church. No staff workspace, drafts, review queue, settings, sermons, or delivery controls. |
| **Contributor** | Manage the church workspace, create studies, select an approver for each study, review assigned studies, configure church settings, and publish or schedule approved studies. |

Approval authority should be a **per-study assignment**, not a third product role. A pastor is commonly selected, but the approver can be any eligible Contributor in the same church. This keeps the product language simple without removing server-side permissions and auditability.

The contributor workspace should have four primary destinations:

1. **Dashboard** — what needs attention and the current publication pipeline.
2. **Calendar** — dated studies, status, assignee, approver, and drag/drop scheduling.
3. **Create a Study** — the writing surface, source context, and live member preview.
4. **Settings** — church identity, theme/logo, people, approvers, schedule, and delivery.

The normal study flow should be visible as three steps:

**Create Study → Gain Approval → Publish Study**

After publication, the member-facing study is technically available immediately at its protected church URL. At the scheduled date/time, configured notification channels may deliver it. Publication availability and notification delivery are separate states and must not be represented as the same guarantee.

## 2. Current-state findings

### Visible Gather branding

Known user-facing source leaks include:

- `frontend/app/c/[slug]/page.tsx` member list header.
- `frontend/app/c/[slug]/studies/[id]/page.tsx` member study header.
- `frontend/components/workspace.tsx` login/sidebar/footer source text.
- `frontend/components/onboarding.tsx` and other legacy staff surfaces.
- `frontend/README.md` and package identifiers are internal documentation/build names, not necessarily user-visible.

CSS and runtime text replacement currently mask some labels, but masking is fragile and does not satisfy a true brand removal. The implementation should replace user-facing strings at their source and add a regression scan for visible Gather text. Internal npm package names, migration names, cookies, environment variables, and historical audit values may remain until a separately planned technical rename.

### Navigation overload

Current staff navigation exposes Dashboard, Sermons, Studies, Calendar, Reviews, Moderation, Delivery, Settings, and onboarding. This forces contributors to understand implementation boundaries before they understand their next task.

Recommended consolidation:

| Current area | New destination | Placement |
|---|---|---|
| Dashboard | Dashboard | Primary navigation |
| Studies, Reviews | Calendar / Create a Study | Calendar status and selected study detail |
| Sermons, source uploads, AI context | Create a Study | Collapsed “Source” section inside the flow |
| Delivery, provider setup, notification policy | Settings | “Messages” subsection |
| Moderation | Settings or study detail | “Community” subsection; show only when enabled |
| Membership, roles, approver selection | Settings | “People and approval” subsection |
| Theme/logo/church identity | Settings | “Church identity” subsection |

Advanced operational details may remain routable for support and deep links, but they should not be primary navigation items.

## 3. Target role model

### Church Member

- Can authenticate and view published studies available under the church reading policy.
- Can receive configured notifications only with explicit consent and valid delivery settings.
- May react or participate in discussion only if the church enables those features; these are engagement actions, not staff navigation.
- Cannot access `/dashboard`, `/calendar`, `/studies`, `/settings`, source material, drafts, approvals, schedules, provider controls, or member administration.
- Direct staff-route access returns a safe authorization response and does not reveal whether a draft exists.

### Contributor

- Can access the four-item staff navigation.
- Can create and edit church studies assigned to them or otherwise authorized by the church.
- Can configure church identity, theme/logo, schedule, delivery, people, and eligible approvers according to church policy.
- Can select an approver for each study before submission.
- Can review comments and respond to requested changes.
- Can publish or schedule only after the selected approver approves the exact immutable study revision.

### Approval assignment

An approver is an eligible Contributor selected on a study review request. Store the assignment on the review request or approval request, not only in a global role. Required properties:

- `churchId`, `studyId`, `revisionId`, `requestedBy`, `approverId`.
- Immutable revision hash and creation timestamp.
- `pending`, `approved`, `changes_requested`, `withdrawn`, or `expired` status.
- Comments anchored to the exact revision and optional field path.
- Reassignment reason and audit event.

The selected approver must belong to the same church, be active, and possess the Contributor-level approval capability. A contributor cannot approve their own request unless an explicit church policy enables self-approval; default remains prohibited.

## 4. Three-step study state model

### User-facing flow

1. **Create Study** — choose a date, add source context, write necessary member-facing fields, optionally attach plan notes, select an approver, and save.
2. **Gain Approval** — submit the exact study revision to the selected approver; comments and change requests stay with that revision.
3. **Publish Study** — after approval, choose immediate publication or a future church-local schedule. The member route becomes available when published.

### Internal states

Keep detailed internal states for correctness, but translate them in the UI:

| Internal state | User label | Next action |
|---|---|---|
| `draft` | Create Study | Continue writing |
| `in_review` | Gain Approval | Wait for approver or view comments |
| `changes_requested` | Create Study | Address comments and resubmit |
| `approved` | Publish Study | Publish now or schedule |
| `scheduled` | Publish Study | View schedule or cancel |
| `published` | Published | Open member view |
| `cancelled` | Not available | Review cancellation reason |

Editing an approved or scheduled revision creates a new draft and requires renewed approval. A scheduled time arriving while approval is pending must not publish; it remains unpublished and creates a visible blocker notification.

## 5. Page-by-page application impact

### Dashboard

Replace multiple metrics with three queues:

- **Create Study:** dates with no usable draft.
- **Gain Approval:** submitted studies waiting for the selected approver or needing changes.
- **Publish Study:** approved studies needing a publication decision.

Primary CTA: **Continue next study**. Secondary CTA: **Open calendar**.

### Calendar

Keep List and Calendar views. Each dated study shows the three-step state, assigned contributor, selected approver, publication time, and next action. Drag/drop remains available for authorized Contributors. Selecting a date opens the study detail, not a separate review tab.

### Create a Study

Combine sermon/source context, optional plan notes, study writing, approver selection, comments, and live iPhone preview. Keep plan fields collapsed under **Supporting direction**. Required member-facing fields remain obvious: title, main passage or Scripture reference, body, reflection, discussion question, and application as configured by the church.

### Settings

Use sections rather than primary nav items:

- Church identity: church name, logo, Rooted presentation.
- Appearance: object palette and theme preview.
- People and approval: invite Contributors, choose eligible approvers, manage assignments.
- Schedule: time zone, default times, quiet hours.
- Messages: SMS/email/push settings, consent, templates, delivery status.
- Community: discussion/reaction policy and moderation.
- Advanced: provider connection, audit, privacy, and integration diagnostics.

### Member pages

Member pages show Rooted nowhere as a staff tool and never show Gather. They show only published studies and the church identity. Draft, review, approval, source, schedule, and provider concepts are not exposed. A study URL that is not published returns the existing safe unavailable/sign-in behavior without leaking status.

## 6. Approval-request UX

The Create a Study screen should show a compact review box:

- **Approver:** required select of eligible Contributors, with display name and optional role description.
- **Review note:** optional contributor message.
- **Submit study for approval:** disabled until required study fields and approver are present.
- After submission: show approver, revision number/hash summary, submitted time, comments, and **Withdraw request** if policy permits.

Approver view opens the rendered member study beside source context and comments. Actions are exactly:

- **Approve study**
- **Request changes**

Request changes requires a concise comment. It returns the study to Create Study and keeps the prior revision immutable.

## 7. Notification and publication behavior

- Publication makes the member URL available immediately after the approved snapshot is stored.
- Scheduled publication uses the church-local time zone, DST-safe resolution, idempotency, and retry rules already documented in the research package.
- Notification delivery is asynchronous and channel-specific. SMS, email, and push may have different consent, quiet hours, and failure states.
- The UI must distinguish **Published**, **Notification queued**, **Delivered**, **Held**, and **Failed**.
- A failed notification must not unpublish the study.

## 8. Branding acceptance requirements

1. `rg` over user-facing frontend source finds no visible `Gather` labels.
2. Member list and detail pages display Rooted and the church identity.
3. Login, loading, footer, sidebar, onboarding, settings, contributor pages, empty states, and error states use Rooted.
4. Internal package names and historical migration identifiers are explicitly excluded from the visible-brand gate.
5. Add an automated browser assertion that visible body text does not contain `Gather` for contributor and member routes.

## 9. Risks and open questions

- **Risk:** Converting existing approver/publisher/moderator/admin memberships to two roles may remove needed least-privilege controls. Recommendation: expose two product roles while retaining internal capabilities and policy checks during migration.
- **Risk:** “Contributor has all admin access” can over-grant privacy and provider access. Recommendation: treat this as product navigation access, not unconditional authority to export, erase, connect providers, or change ownership.
- **Risk:** Selecting any Contributor as approver can create self-approval or circular review. Default to no self-approval and require a different active Contributor.
- **Unknown:** Whether churches need multiple approvers or an approval group. Start with one required approver per submission; model the request so a later group policy does not require a schema rewrite.
- **Unknown:** Whether member reactions/discussion remain in the first simplified member experience. Keep them behind the published study, not in staff navigation.
- **Blocked:** Final role migration cannot be completed safely until existing memberships and invitation records are mapped to the two-role model.

