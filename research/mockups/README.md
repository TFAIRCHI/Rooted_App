# Gather · interactive UX research prototype

Research/design only. All prototype files and generated artifacts are contained in `research/mockups/`; no production application is implemented. Open `source/index.html` in Chrome. No server, package installation, remote fonts, or external service calls are needed.

The authoritative screen inventory is [05 · UX information architecture](../05-ux-information-architecture.md), supported by [03 · Functional requirements](../03-functional-requirements.md). The fourteen primary PNGs use the exact requested names **at this directory’s root**. `source/screens.json` is the capture manifest and includes assertions for each screen’s actual content.

| Screenshot | Actual view |
| --- | --- |
| [01-church-admin-dashboard.png](01-church-admin-dashboard.png) | Readiness, separate plan/content review counts, blocked sends, recent activity |
| [02-sermon-library-and-ingestion.png](02-sermon-library-and-ingestion.png) | Manual metadata, notes, upload/link, provenance, rights confirmation and ingestion |
| [03-weekly-series-date-selector.png](03-weekly-series-date-selector.png) | No selected date; dates, time/zone, assignments, separate statuses and selection instruction |
| [04-selected-date-creation-dropdown.png](04-selected-date-creation-dropdown.png) | Selected date’s planning pane with exactly two native creation choices |
| [05-ai-proposed-plan.png](05-ai-proposed-plan.png) | Inspect proposal evidence, compare, adopt, copy a field, edit or reject |
| [06-manual-plan-editor.png](06-manual-plan-editor.png) | Six blank fields, optional notes, local save state and review submission |
| [07-manual-editor-ai-assist-open.png](07-manual-editor-ai-assist-open.png) | Editor remains visible beside scoped help; editable suggestion, comparison and undo |
| [08-team-comments-and-revisions.png](08-team-comments-and-revisions.png) | Revision comparison, anchored comment, mention, change request and recovered working copy |
| [09-pastoral-review-and-approval.png](09-pastoral-review-and-approval.png) | Exact plan revision, source checks, request changes and explicit approval |
| [10-weekly-calendar-and-status-board.png](10-weekly-calendar-and-status-board.png) | Separate statuses, assignees, due/release times, blocked occurrences and list equivalent |
| [11-member-mobile-study.png](11-member-mobile-study.png) | 390 × 844 reading with John 6:68 anchor, reflection, question and application |
| [12-member-discussion-and-reactions.png](12-member-discussion-and-reactions.png) | 390 × 844 appreciation reactions, moderated comment, report and sign-in boundary |
| [13-sms-preview-and-scheduling.png](13-sms-preview-and-scheduling.png) | Desktop composer and phone preview, per-church sender, consent/suppression and approval gate |
| [14-church-settings-and-integrations.png](14-church-settings-and-integrations.png) | Timezone, M/W/F per-day times, roles, approval policy, AI/discussion and optional integrations |

Desktop primary captures are 1440 × 1050, except SMS screen 13 at **1440 × 1200** to show its full approval notice and blocked scheduling control. Member screens 11 and 12 are exactly **390 × 844**. The navy/cream/teal visual system uses system fonts and CSS-native components. The upper-right selector links all fourteen primary screens and extra approved-plan, content-editor, blocked-schedule, scheduled, member-week, private-reflection and recovery states. Sidebar and member navigation connect the workflows. Native controls, visible labels, keyboard focus and live status messages support inspection; this is not a claim of a completed accessibility audit.

## Dates, approvals and messaging

The series is **To Whom Shall We Go?**, John 6:68. Study publication dates are Monday October 19, Wednesday October 21, and Friday October 23, 2026, at 8:00 AM **America/New_York** (EDT, UTC−04:00). The initial series view has no selection; selecting a date opens its pane below the date cards. Manual creation starts empty. The native creation select has exactly **View proposed study plan** and **Create study plan from scratch**.

Proposal inspection never alters a draft. Explicit adoption creates editable fields, not approval. Contextual objective adoption compares nonempty text before replacement and supports undo. Plan approval preserves a separate snapshot. Full-study content requires its own approval; editing content revokes that approval and scheduling while preserving the approved outline. Changing an editorial date, time, or timezone requires a new plan revision and renewed approvals; the settings demo implements invalidation for time/zone changes. Earlier approvals remain historical records in the proposed production design, not a connected audit service here.

SMS uses a default **09:00–20:00 recipient-local sending window**. The example study publishes at 8:00 AM EDT, while a known New York recipient’s SMS defers to **9:00 AM EDT**, only while its revision is still approved and its occurrence has not expired. Unknown recipient timezone holds for review. A 15-minute catch-up is only for preapproved occurrences and does not override quiet hours or expiry. Consent, registration, budget, recipient counts and suppression are illustrative. Segment estimates are deliberately rough: provider validation is required, including GSM extension and Unicode encoding rules. No SMS is sent.

## Evidence and simulation boundaries

The John 6:68 KJV excerpt is checked against the source register [S55](../sources.md#s55), which supports verse wording only. This does not establish interpretation, public-domain status worldwide, or redistribution rights for a paid SaaS. Other Scripture passages are references; the member reading uses the same John 6:68 anchor excerpt.

Sermon notes, speaker, people, comments, activity, consent counts and review fixtures are **illustrative**. Fictional sermon notes are never a verified biblical source or a real transcript. Proposals are editorial suggestions requiring contextual and pastoral review. Model/prompt labels identify demo fixtures; there is no connected AI model and no token usage. Planning Center and SMS controls do not connect accounts.

Browser local storage demonstrates draft persistence, recovery, reflection, comment submission and reaction state. It is not secure storage, server autosave, tenant authorization, a real moderation queue, immutable revision storage, consent evidence or production approval enforcement. Direct approved/scheduled extra screens are labeled preview fixtures and do not grant workflow approval. Clear browser storage to reset the demo.

## Reproduce and validate

Requires Node 24 and installed Chrome; no Playwright or npm dependencies:

```powershell
node research/mockups/source/capture.mjs
```

Override `CHROME_PATH` if needed. The script launches installed Chrome headlessly, uses its DevTools protocol to set exact viewport dimensions, captures a clean initial state to the fourteen root PNGs, then runs interaction checks. Its temporary profile stays within this folder and is removed afterward. Core checks cover dimensions, expected screen content, overflow, visible mobile primary controls, blank fields, adoption, review gates, approval separation, reload persistence, recovery and member completion. `validation.json` records the actual latest successful run and full list of checks.

## Current validation

All **14 exact-name root PNGs rendered successfully** and **81 automated browser checks passed**, with **zero runtime exceptions**. This includes expected content for every primary screen, exact dimensions, no horizontal overflow, visible mobile primary controls, the fully visible SMS scheduling gate, native creation options, blank fields, explicit/undoable adoption, approval separation, persistence, recovery, team comments, reactions, moderated discussion, source rights confirmation, SMS preview updates and schedule-change approval invalidation. Representative desktop and mobile screenshots were visually inspected. `validation.json` records the actual completed run. The obsolete `screenshots/` directory and temporary `.capture-browser` profile are removed; the fourteen primary PNGs remain at this directory’s root.
