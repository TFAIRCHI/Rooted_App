# Rooted Simplicity UX Audit

**Status:** Recommendation package, prepared 2026-10-20  
**Scope:** End-to-end contributor, reviewer, administrator, and member experience  
**Mission:** Make faithful study preparation feel simple without making Scripture shallow.

## 1. Executive finding

Rooted should behave like a calm weekly preparation tool, not like a collection of administration screens. The primary user outcome is:

> Choose a day, understand the source, write a clear study, review it once, and help people take their next faithful step.

The current product has strong foundations—date-first planning, church identity, approval safeguards, and a member reading experience—but it still exposes too many concepts at once. The largest opportunity is to simplify the mental model and make the writing surface the center of gravity.

**Recommendation:** Organize the product around three simple workspaces:

1. **This week** — see what needs attention and open a day.
2. **Write** — create or edit one study with Scripture, context, application, and a live member preview.
3. **People** — review feedback, discussion, reactions, and delivery.

Keep settings, integrations, audit history, and technical controls behind progressive disclosure. They are necessary, but they are not the daily job.

## 2. Audit principles

| Principle | Meaning in Rooted |
|---|---|
| One next step | Every screen has one primary action, stated as a verb. |
| Plain before precise | Explain the task in everyday language; expose technical detail on demand. |
| Scripture stays central | Source passage and church-provided teaching remain more prominent than AI output. |
| Show, do not describe | Prefer status, previews, and examples over explanatory paragraphs. |
| Drafting is safe | Autosave, version history, and explicit acceptance make experimentation low-risk. |
| One review moment | Avoid making pastors approve the same idea twice unless the church explicitly chooses that policy. |
| Calm density | Use whitespace, short labels, restrained status colors, and progressive disclosure. |

## 3. Where to consolidate

### High priority

1. **Dashboard, calendar, and review queue:** Make **This week** the shared home for upcoming dates, status, assigned contributor, and the next action. Calendar and list are views of the same object, not separate workflows.
2. **Plan and study draft:** Treat a dated study as one working document with one approval gate. Internally, retain plan and content revisions for auditability, but present contributors with one “Study” workflow. This aligns with the prior product direction to avoid two pastor approvals.
3. **AI actions:** Replace multiple AI entry points with one contextual **Ask for help** button. The selected task—clarify Scripture context, suggest an outline, shorten wording, or propose a question—determines the response.
4. **Status language:** Use four user-facing states: **Not started**, **In progress**, **Needs review**, and **Ready / Published**. Keep detailed machine states in audit views and APIs.
5. **Settings:** Group church identity, theme, logo, schedule, members, notifications, and integrations under one settings navigation with a short “What this changes” description. Hide provider IDs, webhook details, and delivery diagnostics under Advanced.

### Medium priority

- Combine repeated “series,” “week,” and “study plan” explanations into one sentence at the top of the weekly workspace.
- Replace separate empty-state panels with one useful action and one example.
- Use one reusable `DateStudyCard`, `StatusBadge`, `SaveStatus`, `ReviewSummary`, and `MemberPreview` pattern throughout the staff workspace.
- Put comments beside the relevant field or paragraph instead of making contributors search a separate review page.
- Make SMS preview a mode of the member preview, not a separate composition experience.

### Do not consolidate

- Do not hide the source sermon or primary Scripture inside AI controls.
- Do not merge member discussion moderation with writing controls.
- Do not remove immutable revisions, audit events, or permission checks merely to make the UI shorter.
- Do not make AI suggestions look like approved church teaching.

## 4. Wording reduction pass

The UI should use short labels and reserve pastoral tone for meaningful moments. Recommended replacements:

| Current or likely wording | Recommended wording | Reason |
|---|---|---|
| “A moment to discern.” | “Review this study” | Names the action. |
| “A faithful week, in view.” | “Your study calendar” | Removes metaphor from navigation. |
| “A shared direction for the week.” | “Plan this week” | Short, actionable, familiar. |
| “Your words. Your direction.” | “Write the study” | Centers the contributor’s job. |
| “A little space for faith” | “This week’s studies” | Improves scanability. |
| “Optional · inspect before adoption” | “Optional AI help” | Explains the control without jargon. |
| “A proposal to discern.” | “Suggested outline” | Makes the artifact obvious. |
| “Good work grows together.” | “Prepare this week’s studies” | Removes decorative copy where a task is needed. |
| “Creation method” | “How do you want to start?” | Uses conversational language. |
| “Primary Scripture” | “Main passage” | Keep “Primary Scripture” in advanced or accessibility context if needed. |
| “Learning objective” | “By the end, members can…” | Converts curriculum language into a writing prompt. |
| “Changes requested” | “Needs changes” | Shorter and easier to scan. |
| “Approval pending” | “Waiting for review” | Explains who must act. |
| “Publication schedule” | “When it goes live” | Plain language; retain exact time below. |

**Recommendation:** Keep theological warmth in the content itself, not in every navigation label. A contributor should understand the screen in a quick scan while preparing a Bible study.

## 5. Journey-by-journey findings

### This week / dashboard

**Need:** Answer “What should I do next?” in under five seconds.  
**Simplify:** Show the current week, three to seven dated study cards, one status, one assignee, and one primary action. Move analytics, recent activity, and integration warnings below the fold.  
**Missing:** A “Needs my attention” filter and an explanation of why a study is blocked.

### Sermon source

**Need:** Establish what the study is grounded in.  
**Simplify:** Present one source card: sermon title, date, source type, passage, and “Use this source.” Put transcript processing, provenance, and import errors behind Details.  
**Missing:** A plain-language source confidence indicator that never implies doctrinal verification.

### Date-first planning and writing

**Need:** Make one day’s work feel finite.  
**Simplify:** Keep the date header fixed, show the study fields in a clear top-to-bottom order, and use one primary save state. The two start choices remain: **View suggested outline** or **Start from scratch**.  
**Missing:** A live member preview, clarity feedback, and a single checklist showing what remains.

### Review and approval

**Need:** Help a pastor decide quickly and responsibly.  
**Simplify:** Show the rendered study, source passage, unresolved comments, and a compact readiness checklist. Use one primary **Approve study** action and one **Request changes** action.  
**Missing:** A one-click “show only blockers” view and a visible summary of what changed since the last review.

### Calendar

**Need:** See the week or month at a glance and open a date without losing context.  
**Simplify:** Retain List and Calendar views as views of the same forecast. Keep the green/orange/red legend, but pair every color with text and an icon so status is not color-only.  
**Missing:** Keyboard navigation, a month jump control, and an explicit “today” marker.

### Member reading

**Need:** Move from Scripture to understanding to response.  
**Simplify:** Use a consistent sequence: **Read → Notice → Discuss → Practice**. Keep reactions and discussion below the main reading rather than competing with it.  
**Missing:** A short “In plain words” summary authored or approved by the church, clearly labeled as a summary rather than Scripture.

### Settings and administration

**Need:** Change identity and behavior without understanding the system architecture.  
**Simplify:** Use task labels: **Church identity**, **Appearance**, **People**, **Schedule**, **Messages**, **Connections**.  
**Missing:** A preview of the member-facing result beside logo, color, and church-name changes.

## 6. Live iPhone preview recommendation

### Product behavior

When a contributor writes or edits a study on desktop, a sticky mocked iPhone appears on the right side of the workspace. It renders the actual member-facing study using the current church name, logo, theme, title, passage, reflection, discussion prompt, and application. It updates as the contributor types, without publishing or requiring a save.

The preview should have two compact modes:

- **Member view:** the full mobile reading page.
- **Message view:** the SMS preview and deep-link context.

The phone is a confidence tool, not a second editor. It must not introduce controls that suggest a member can edit content or that a draft is live.

### Layout behavior

- Desktop: editor takes approximately two-thirds of the content width; preview is sticky on the right and remains visible while fields scroll.
- Tablet: preview becomes a collapsible side panel.
- Mobile contributor view: preview becomes a **Preview** tab or bottom sheet so the editor is not cramped.
- Review view: preview defaults to Member view and can be compared with the prior approved revision.

### Update and safety behavior

- Use local draft state with a short debounce; do not call the server for every keystroke.
- Show `Previewing draft` and the current save status separately.
- Render clear placeholders for missing title, passage, or application.
- Truncate only in Message view; never silently truncate the member study.
- Announce significant preview errors politely to assistive technology.
- Treat preview content as untrusted draft data; sanitize rich text and never execute pasted HTML.
- The preview must not create a publication, notification, approval, or audit event.

### Acceptance criteria

1. Editing title, passage, reflection, question, or application updates the phone within one second in normal conditions.
2. The preview uses the active church logo, church name, Rooted identity, and theme tokens.
3. A contributor can switch between Member view and Message view without losing draft text.
4. Missing fields produce useful placeholders and do not break the editor.
5. Preview is hidden or collapsible at narrow widths and remains usable with keyboard and screen reader navigation.
6. A draft preview never appears in the member publication route or notification queue.

**Implementation recommendation:** Build this as a reusable client component around the existing draft form state. No new database table or API is required for the first version.

## 7. Missing simplicity helpers

Prioritized additions:

1. **Study readiness checklist:** “Main passage added,” “Purpose is clear,” “Question invites response,” “Application is actionable,” “Pastor review complete.”
2. **Plain-language helper:** Ask “What should a member understand or do after reading this?” and offer a short editable response.
3. **Clarity pass:** Flag long sentences, unexplained church jargon, repeated ideas, and unanswered prompts. This is an editorial aid, not a theological or doctrinal authority.
4. **Scripture context drawer:** Show passage metadata and church-approved notes separately from generated interpretation; all AI references remain unverified until a human checks them.
5. **Draft recovery:** Make “Saved locally,” “Saving,” and “Saved” visible, with a recoverable local draft when the network fails.
6. **Blocker view:** Filter the workspace to only items preventing review or publication.
7. **First-use examples:** Provide one populated sample study so empty screens teach the workflow.

## 8. Proposed simplification backlog

| Priority | Work item | Outcome | Exit criteria |
|---|---|---|---|
| P0 | Add live Member/Message preview | Contributors see the real delivery while writing | Preview acceptance criteria above pass on desktop, tablet, and mobile. |
| P0 | Consolidate user-facing workflow around one Study approval | Pastors review once; revisions renew approval safely | One primary approve action; immutable revision remains enforced. |
| P0 | Rewrite high-density labels and empty states | Faster comprehension | Usability review finds no unexplained primary action in core flow. |
| P1 | Add readiness checklist and blocker filter | Contributors know what remains | Every blocking validation is actionable and linked to its field. |
| P1 | Unify This week/List/Calendar information architecture | Less duplicate navigation | Same dated study object and status appear consistently in all views. |
| P1 | Add clarity pass and context drawer | Scripture concepts become easier to explain | Suggestions are labeled editorial assistance and never auto-apply. |
| P2 | Simplify settings and add live branding preview | Admin changes are safer and easier | Logo/name/theme changes preview before save. |
| P2 | Add first-use sample and contextual help | Lower onboarding burden | New contributor can complete a sample study without training. |

## 9. Measurement plan

Track outcomes rather than clicks alone:

- Time from opening a date to a saved first draft.
- Percentage of contributors who complete a study without opening Advanced settings.
- Number of reviewer cycles per study.
- Percentage of published studies with all readiness items complete.
- Preview usage and preview-to-save completion rate.
- Member reading completion and discussion participation, segmented by device.
- Support requests containing “where do I…” or “what does this mean…”.

**Guardrail:** Faster completion is not success if it reduces Scripture accuracy, pastoral review quality, accessibility, or contributor ownership.

## 10. Decisions, assumptions, and open questions

- **Recommendation:** Make the writing surface and live member preview the core contributor experience.
- **Recommendation:** Present one approval workflow while retaining separate internal revisions for audit and recovery.
- **Recommendation:** Use plain labels first and move technical/provider vocabulary into Advanced sections.
- **Assumption:** The current draft editor can expose enough local state to render the preview without an API change.
- **Unknown:** Which rich-text editor and content schema will be selected for the final study body; preview sanitization depends on this choice.
- **Unknown:** Whether each church wants the same “Read → Notice → Discuss → Practice” member structure; make section labels configurable later.
- **Blocked:** No usability conclusion is final until at least three contributors and one pastor test the simplified flow with a real sermon.

## 11. Relationship to the build package

This audit complements [`UX_PROJECT_PLAN.md`](UX_PROJECT_PLAN.md), which defines the calendar view work in version 1.2.0. The calendar implementation is complete. The live iPhone preview and the broader wording/consolidation changes are recommendations for the next approved implementation slice; they are not represented as completed production behavior by this document.

