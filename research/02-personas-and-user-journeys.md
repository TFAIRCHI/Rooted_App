# Personas and user journeys

**Assumption:** Initial churches have one pastor/approver and two to five contributors, with uneven technical confidence. Validate in interviews; this is not a market statistic. The system should reduce clerical effort without relocating teaching authority.

| Persona | Job / authority | Friction to investigate |
|---|---|---|
| Church administrator, Elena | Onboard church, invite team, configure timezone, integrations, consent and discussion policy | Confusing external accounts, uncertain SMS budget; admin role must not imply doctrinal approval |
| Pastor/approver, David | Inspect theological intent and exact member-facing text; approve or request changes | Reviewing an opaque generated document or losing the differences between revisions |
| Contributor, Maya | Own Monday's plan, use notes, ask optional focused assistance, respond to review | AI replacing wording, unsaved work, unclear due dates |
| Member, Jordan | Read a short study on phone, follow Scripture, reflect and participate safely | Forced account creation before public reading, long messages, unreadable text |
| Platform operator | Keep service available and tenant data protected | Support requests that would otherwise encourage unrestricted tenant access |

## Contributor: date to approved plan

1. Opens Studies → “To Whom Shall We Go?” and sees Monday October 19, Wednesday October 21, Friday October 23 with individual times, assignees, and two status badges.
2. Selects Wednesday; its pane opens below the day rows. Chooses exactly one of “View proposed study plan” or “Create study plan from scratch.” No selection triggers AI generation automatically.
3. Manual route displays blank title, primary Scripture, objective, talking points, question, and optional notes. Required fields are identified without supplying a hidden generated draft.
4. Contributor can open “Ask AI for assistance,” inspect an objective suggestion with source context, and adopt only that field. Existing text is preserved unless a comparison is explicitly accepted.
5. Autosave confirms a server revision. Switching dates retains each day's draft; an offline state clearly distinguishes locally recovered edits from server-saved work.
6. Submit freezes the review revision. A change request links to a field and revision; contributor creates a new revision and resubmits. Pastor approves the exact revision.

See [screens 03–09](mockups/README.md) and [approval](11-collaboration-approval-and-versioning.md). Success: participant completes the manual path unaided and can explain which words are approved.

## Pastor: review to publication readiness

Pastor opens review inbox, sees objective, Scripture/source evidence, differences and unresolved comments, then requests a specific change or approves. Approval cannot be performed by email reply or a notification link alone; authentication and revision confirmation are required. After plan approval a contributor explicitly drafts content. Pastor sees full reflection, application, and SMS preview and approves those exact fields separately. Scheduling shows “Content approved · ready to schedule” versus “Plan approved · content draft.”

At a missed review deadline staff see a blocked occurrence and in-app notification; members receive no preview of unapproved content. No “send anyway” bypass exists. Success: pastor correctly predicts whether Monday will publish when only its plan is approved.

## Administrator: onboarding and consent

Admin sets IANA timezone, configurable weekdays and per-day times, invites contributors, selects approvers, chooses public or member-only reading, and leaves discussions off until moderators are assigned. Admin can add a Church Center link manually. SMS setup requires provider account/sender validation, campaign evidence where applicable, budget, and a test opt-in/STOP round trip. An imported directory phone number is not an opt-in record. See [12](12-scheduling-sms-and-notifications.md).

## Member: message to study

Member opts into Grace Community's study alerts through a clearly scoped form. A message at the permitted local time identifies the church, includes a short preview and stable HTTPS study URL, and gives STOP instructions. The page opens at readable font size; Scripture references, reflection, one discussion question, and a concrete application are scannable. Public reading may require no account; reacting/commenting requires sign-in and tenant membership. Pending comments explain moderation. Reports acknowledge receipt privately. Phone loss or recycled numbers require fresh verification for account changes.

## Dependencies, alternatives, validation

Dependency: one consistent status vocabulary across admin, reviewer and member views. Alternative: chat-first creation; rejected by the date-first requirement. Alternative: require every reader to log in; reserve for churches choosing private content. Risks: unfamiliar approval terms, over-notification, social pressure from visible participation. **Recommendation:** no public “least engaged members” analytics; show aggregate trends with small-group privacy thresholds.

**Unknown:** preferred study length, notification cadence, accessibility needs, translation choices, and minors' participation. Phase 0 interviews should observe a real weekly handoff, measure time on task and recovery, and include low-bandwidth phone testing. No usability claim is Verified until those sessions occur.
