# UX information architecture

**Recommendation:** A calm editorial workspace with the church context always visible. Date/day cards precede every planning pane. AI is a contextual tool, with no full-screen conversation replacing the planning sequence.

## Navigation map

Workspace switcher → Dashboard → Sermons → weekly Series → selected Date → Plan → Review → full Study → content Review → Schedule. Parallel navigation: Calendar, Review inbox, Members/consent, Discussion moderation, Settings/integrations. Member navigation: church home → current series → published date → read → optional reactions/discussion → notification preferences. A deep link restores church, series, date and pane after authentication, with authorization rechecked.

## Screen inventory

| Screen / PNG | Purpose and key interaction |
|---|---|
| [01 Dashboard](mockups/01-church-admin-dashboard.png) | Next week readiness, review queue, blocked sends, recent activity; actionable counts distinguish plans/content |
| [02 Sermon library](mockups/02-sermon-library-and-ingestion.png) | Manual entry, source notes/upload/link, ingestion state and rights confirmation; external import optional |
| [03 Weekly date selector](mockups/03-weekly-series-date-selector.png) | Initial state: three selectable date/day cards, time/zone, assignee, plan/content statuses; no editor before selection |
| [04 Selected date](mockups/04-selected-date-creation-dropdown.png) | Expanded pane starts below selected date; creation select shows exactly two primary choices |
| [05 Proposed plan](mockups/05-ai-proposed-plan.png) | Proposal source evidence, limitations, compare/select/adopt/edit/reject; pending proposal separate from saved draft |
| [06 Manual editor](mockups/06-manual-plan-editor.png) | Six blank labeled fields; optional notes; saved indicator, revision link, submit for plan review |
| [07 Assistance open](mockups/07-manual-editor-ai-assist-open.png) | Contextual help choices and inspectable suggestions; field-specific adoption; original text preserved |
| [08 Comments and revisions](mockups/08-team-comments-and-revisions.png) | Revision comparison, anchored reviewer comments, change request, mentions, saved/recovered working copy |
| [09 Pastoral review](mockups/09-pastoral-review-and-approval.png) | Exact revision, source checks, request changes/approve; explicit distinction between plan and content approval |
| [10 Calendar/status](mockups/10-weekly-calendar-and-status-board.png) | Separate plan/content status, assignees, local due times and blocked occurrence action; list equivalent |
| [11 Member study](mockups/11-member-mobile-study.png) | Mobile Scripture reference, reflection, discussion question, application and series navigation |
| [12 Member discussion](mockups/12-member-discussion-and-reactions.png) | Appreciation reactions, moderated comments, report and pending feedback; sign-in boundary |
| [13 SMS preview](mockups/13-sms-preview-and-scheduling.png) | Preview, sender, consented audience, segments estimate, time/zone, suppression/quiet hours, approval readiness |
| [14 Settings](mockups/14-church-settings-and-integrations.png) | Timezone, weekdays/per-day times, roles/approval policy, AI profile, discussion, provider connection status |

See [mockup source and rendering instructions](mockups/README.md). Screens illustrate states in a workflow, not one simultaneous database snapshot; future screens may show later approval revisions.

## Date-first detailed interaction

Initial state has no selected date and an instruction to choose one. Dates display weekday, full calendar date, local time, timezone, assignee and both statuses. Use buttons or an accessible tab/accordion pattern with selected and expanded state. On selection focus remains predictable and a labeled panel opens below the cards. URL includes stable date/slot ID; back navigation restores selection and scroll.

The creation-method dropdown has **exactly two primary choices**, with these labels:

1. **View proposed study plan**
2. **Create study plan from scratch**

A descriptive label or disabled placeholder is not a third workflow. Viewing a saved proposal must not spend tokens; an explicit “Generate proposal” or “Refresh proposal” action starts a job if none/current sources changed. “View” opens pending proposal evidence first; accepting all creates an editable draft, not approval. Contributors can reject with optional feedback, copy selected fields, or edit selected suggestions before adoption. A proposal made for an earlier source revision is visibly stale.

Manual selection produces blank editable fields and never implicitly generates content. Primary Scripture uses a reference field; translation/quotation controls are distinct. “Ask AI for assistance” opens a side panel on desktop or modal sheet on mobile. Assistance can request Scripture context, objective, outline, questions or application. It returns a suggestion card with requested scope, sources, model/prompt version, and uncertainty; “Use in objective” displays a comparison if the field is nonempty. Only explicit acceptance changes the working draft. Undo adoption remains possible as a new draft revision. Switching creation method with unsaved content requires save/keep/cancel, never silent discard.

Plan review presents title, Scripture, objective, outline, question, notes, source evidence and diff. “Approve plan revision 3” creates exact-revision approval and enables the separate content drafting step. Full content has its own review badge and actions. Scheduling disabled state explains “Full study revision needs approval”; approved plan is insufficient. If a change arrives, “Changes requested” links to the affected revision and preserves the last published snapshot.

## Responsive and accessible behavior

Desktop: persistent navigation, horizontal date cards, main pane and optional side panel. Tablet: collapsible navigation and stacked assistance beneath editor when split panes become cramped. Phone: vertical compact date rows first, single-column fields, separate assistance sheet with return-to-field focus, and sticky save status that does not obscure controls. Member pages use 18px target body text, approximately 60–75 character desktop lines and generous paragraph spacing. User text zoom and system font scaling remain supported.

**Recommendation:** Core flows target WCAG 2.2 AA [S21](sources.md#s21). Use visible labels, semantic headings, error summaries linked to fields, text plus status colors, keyboard-operable dates, visible focus, reduced motion, accessible dialogs, and a polite live region for save/job results. Do not announce every keystroke. Reaction buttons expose name/count/pressed state; report actions have labels. Provide accessible list/form scheduling; no drag-only controls. Paste/password-manager authentication must remain possible. Automated results are insufficient by themselves [S26](sources.md#s26).

## Empty, loading, error, and destructive states

| State | Required response |
|---|---|
| No sermon / no series | Clear manual creation action; integrations described as optional |
| No selected day | Show dates first and selection instruction; no prefilled editor |
| Proposal pending | Job progress/cancel and manual route; date switching remains available |
| No usable transcript | Explain missing evidence; allow notes/manual work; no “sermon grounded” claim |
| Save in progress / offline | “Saving…” / “Saved on this device; not synced”; timestamp server acknowledgment separately |
| Concurrent save | Show base/mine/latest comparison and preserve local copy; no last-writer overwrite |
| Approval invalidated | Show newer draft and cancelled schedule; exact earlier approval remains in history |
| Missed approval deadline | Block publication and SMS, alert staff, offer explicit reschedule after approval |
| SMS insufficient budget / registration | Keep content schedule valid but channel blocked; offer settings action |
| Authentication expired | Recover safe local draft after reauthentication to same tenant/user; redact member pages |
| Discussion off / pending / removed | Clear policy explanation and moderator contact; no confusing empty composer |
| Cancel / withdraw | Confirm consequence, require reason for staff actions, show audit event; never imply SMS recall |

## Alternatives, dependencies, risks, open questions

Alternative: a calendar grid as the only navigation; difficult on phones, so provide date rows and a week overview. Alternative: rich-text planning; typed fields make review and selective adoption clearer. Dependencies: [03 contracts](03-functional-requirements.md), [11 versioning](11-collaboration-approval-and-versioning.md). Risks: statuses collapse into ambiguous “Approved”; distinguish “Plan approved” and “Content in review.” Unknown: whether members want threaded replies, audio reading, or multilingual display. Validate prototypes with representative users before production components are selected.
