# Rooted 1.2.9 — UX specification

**Recommendation:** all dimensions, wording, interaction states, and date conventions below are proposed design contracts. [Research](../../research/23-study-management-workflow-and-engagement.md) separates inspected behavior from assumptions. [Preview](preview/index.html) is an illustrative local prototype with fictional counts, not a running application.

## Navigation and page inventory

Keep Dashboard, Calendar, Create a Study, Study Engagement, and Settings. Settings retains membership management and theme/logo controls. Account/sign-out and a home link remain reachable from every page. Members stay in published reading pages; no workspace metrics or moderation queues appear for them.

| Page / state | Required change | Main next action |
|---|---|---|
| Workspace shell | Large church logo, church name below, smaller Rooted label; correct first render and church switch | Navigate normally |
| Dashboard | Study Preparation and Member Engagement groups | Open the specific study, review, delivery, or question |
| Create a Study initial | Month with numbered date-range weeks; current week expanded | Select a dated study or Add study |
| Selected study | Date/time above a three-step workflow; optional source context | Create, submit, review, or publish as allowed |
| Calendar list/grid | All active studies in visible period, regardless of source series | Open or move explicit study ID |
| Delete confirmation | State-specific consequences and keyboard-safe dialog | Delete study or Cancel |
| Member study | Response/question composer, warning, examples, private status | Submit comment or question |
| Study Engagement list/detail | Opens/audience/reactions/questions, moderation, replies; Include deleted | Answer a question or review a comment |
| Settings | Discussion policy, automation availability/manual fallback; existing logo upload preview | Save explicit policy/theme change |

## Month and week model

Date-first hierarchy: **October 2026 → Week 4 · Oct 18–24, 2026 → Wednesday, Oct 21 · 8:00 AM → selected study workflow**. Show `America/New_York` once near date controls; include it in confirmations. Dates are church-local civil dates even if the contributor's device is elsewhere.

Proposed Sunday–Saturday, month-clipped ranges for October 2026:

| Label | Inclusive range |
|---|---|
| Week 1 | Oct 1–3, 2026 |
| Week 2 | Oct 4–10, 2026 |
| Week 3 | Oct 11–17, 2026 |
| Week 4 | Oct 18–24, 2026 |
| Week 5 | Oct 25–31, 2026 |

These ranges are a visible assumption for review. Do not copy Oct 1–6 into an algorithm without choosing a nonoverlapping week policy. Dashboard's full current week may cross a month boundary; Create a Study clips that same calendar week into each month view. Header range makes the distinction explicit.

- Previous month / month picker / next month plus **This month**. Default from church-local today; remove fixed October 2026 production defaults.
- Weeks show study count and number needing action. An empty week says **No studies planned** with Add study; do not populate dates automatically.
- Add study asks for date, local time, and optional contributor assignment/source sermon. Reuse the church's saved defaults; do not require a series name or optional plan fields.
- Group all existing slots by current date, including moved dates whose old series anchor differs. Preserve sources/series metadata in optional **Source & planning notes**.
- URL state uses church, month, and stable slot ID. Resolve older `series`/`slot` links; if a study moved, open its actual month/week and show its new date.
- Switching weeks preserves unsaved work with the existing recovery mechanism and a clear save/pending/error status. Never silently discard text.

## Three-step selected-study workflow

Use a semantic ordered list with text/icon status and `aria-current="step"`; do not use interactive tab roles unless actual panels follow the tabs pattern. Steps may navigate to visible sections, but cannot bypass server authorization.

| State | Step 1: Create Study | Step 2: Gain Approval | Step 3: Publish Study |
|---|---|---|---|
| Not started/draft | Current; edit/save | Choose approver when required content is saved | Locked with reason |
| In review | Saved; view revision | Current; Waiting for James / reviewer actions | Locked with reason |
| Changes requested | Current; revise from comments | Retain reviewer context | Locked with reason |
| Approved | Complete | Complete | Current; Publish now or scheduled status |
| Scheduled | Complete | Complete | Current; delivery date + Publish now option |
| Published | Complete | Complete | Complete; Read study / View engagement |
| Deleted | Read-only retained history | Historical only | Removed from member reading |

Only final study content is submitted/approved. Keep the draft title, Scripture/context, reading body, discussion question, application, and existing member preview together; optional planning sections collapsed by default. Use one page-level primary action appropriate to the user's task; avoid duplicate Submit buttons and CSS-only text replacement. Review comments and revision history remain accessible without becoming extra workflow phases. The approver-selection panel follows writing and saving, not precedes them.

Publication time schedules delivery. A past date never blocks approval or an authorized Publish now action. Preserve current late-approval behavior and immutable snapshots. Schedule changes to approved unpublished studies explain renewed approval before confirmation; the new calendar must be saved in both plan and content revisions. Published studies offer a new study instead of altering historical delivery dates.

## Dashboard

**Study Preparation** has a week range, previous/next week, and This week. Its three cards:

1. **Weekly Readiness — 2 of 3 ready:** final content approved, scheduled, or published; empty dates still count toward planned dates. Link to the week.
2. **Review Queue — 1 awaiting approval:** pending final-study requests; show **1 assigned to you** when applicable. Link to an exact pending study or filtered week; no plan-review metric.
3. **Publication Readiness — 1 ready to publish:** approved and not live, with scheduled/blocked subtotals and next delivery. Link to Publish Study.

Below, **Your week, at a glance** shows that exact week, sorted by local date/time, one current study status. A move out removes the row and changes counts; a move in adds it. A move within the week changes the date and order without adding a row. Hide deleted slots. Published history retains actual publication timestamp separately from the planned date.

**Member Engagement** defaults to the latest visible published study; an explicit selector can inspect earlier studies. Show the study title, publication date, and last-updated time:

- **Members opened — 42 of 80 · 53%** (rounded display from 52.5%); label as unique opens, not read completion. Additional new members are shown separately. Legacy denominator: **42 opens · audience not recorded** only if open records actually exist.
- **Positive reactions — 18**, with Thankful / Encouraged / Praying breakdown.
- **Questions needing an answer — 3**, linking directly to that study's approved unanswered questions.

Small secondary counts distinguish comments pending review, automatically declined, and resolved questions. No published study means a helpful empty state, not invented analytics. Unavailable tracking or automation gets an explicit status. Metrics and controls use theme object/surface tokens without weakening readable contrast.

## Delete study interaction

Entry points: study overflow menu on Dashboard rows, Calendar details/list, Create a Study date row/editor, and Study Engagement detail. Show only for users with `studies:delete`; server enforcement is mandatory. One command targets the slot root, whether only an optional plan exists or full content is already published.

Dialog: **Delete “To Whom Shall We Go?”** followed by the local study date and applicable consequences. Draft: removes date and drafts from active workspace. Scheduled: cancels work not dispatched. Published: removes member reading access and retains authorized history/engagement. “Messages already sent cannot be recalled.” Optional reason, max 500 characters; confirmation names the study so accidental clicks are recoverable before execution. Cancel initially focused for destructive confirmation. Use accessible modal focus trapping, Escape, and return focus to an appropriate row or list heading after success. [S72](../../research/sources.md#s72)

Success: **Study deleted.** Remove its row without leaving an open deleted editor. No-op retry stays successful. Concurrent publication before deletion is reflected in the response and retained audit; a stale editor asks to refresh rather than overwrite. No physical erase/restore promise. Include deleted in engagement is contributor-only and clearly read-only except authorized moderation/records handling.

## Church logo

Use the uploaded lockup, contained in a 112 px-high image stage with width up to available sidebar content width (~180–192 px). Allow a taller stage up to 144 px for a tall mark only if navigation and sign-out remain usable in short windows. Display church name directly below; smaller Rooted below that. Render real React text/image elements, with a descriptive accessible home-link name. Avoid a duplicate alt announcement when the adjacent name already names the same linked image.

Keep the existing prominent centered header logo. Reflow header controls to prevent overlap at narrow widths. On mobile, use the existing compact centered header and a scrollable navigation drawer. At 200%/400% zoom, navigation/account controls stay reachable. Test contain/aspect ratio, broken logo, removed logo, upload replacement, church switching, long church name, transparent padding, light/dark themes, and direct route loads. Existing assets include square mark and wide lockup variants: select the variant based on original aspect metadata, rather than containing a padded 720×220 canvas in every location. If a sidebar derivative is necessary, remove only padding introduced by Rooted, preserving source whitespace. Asset resolution warnings do not silently alter the church's original artwork. [S69](../../research/sources.md#s69) [S70](../../research/sources.md#s70)

## Member conversation and contributor replies

When enabled, show **Join the conversation**, Response / Question selection, and the exact pre-submit guidance from the research. Examples live in an expandable **What can I share?** block. A member cannot edit policy or choose public approval state. Submission feedback distinguishes **Pending review**, **Declined — please revise**, and **Posted**. Preserve the author's own text and offer revision/contact after a decline; never show private decline reasons or raw classifier output to other members.

Strict requirement for review: automatic decline applies to policy-breaking negativity. If the product owner instead intends all nonpositive sentiment, revise the warning, allowed corpus, thresholds, and false-positive acceptance before implementation; do not silently change the meaning of the approved prompt.

Contributor engagement detail combines the immutable study and the conversation. Filters: Questions to answer, Posted, Pending review, Declined, All. Question cards show author display name, date, status, and Reply. Publish an authorized contributor reply and mark answered atomically; do not require a second pastoral study approval for replies. An explicit Reopen/Resolve control supports follow-up; never treat the mere question-mark character as the sole question detector. Replies can be hidden/reported; moderation state and answered state are distinct.

## Accessibility and failure states

- Keep status words/icons with green/orange/red tints; do not rely solely on color. Focus and meaningful controls need visible contrast. [S66](../../research/sources.md#s66) [S67](../../research/sources.md#s67)
- Provide a non-drag date control with identical outcomes. Never require precise mouse movement to reschedule.
- Use labeled inputs, `role="status"` for save/move/post results, and actionable error text. Do not announce every autosave keystroke or rearrange focus on metrics refresh.
- Loading: stable skeletons and headings. Error: retry preserves user text. Empty: Add study / Enable discussions / No publication as applicable. Automation unavailable: private pending/manual review. Forbidden/deleted direct links: no teaching text or hidden comment body.
- Keyboard and screen-reader checks cover week expanders, workflow, delete dialog, phone-preview toggle, comment examples, question filter, and account navigation. Test reflow at 320 CSS px and keyboard-only use. [S69](../../research/sources.md#s69)
