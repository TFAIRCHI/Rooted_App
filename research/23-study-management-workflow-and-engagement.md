# Rooted 1.2.9 — Study management, weekly workflow, and engagement research

Research date: **2026-10-21**. Scope: prepare a precise build request for six user findings. No production changes or live church-data mutations are part of this research.

**Approved execution amendment:** the user subsequently approved implementation and changed published-study lifecycle: ordinary deletion is forbidden after first publication; Withdraw preserves the historical artifact/engagement and hides it from members; a separate admin-only irreversible Hard Delete is available after withdrawal with explicit confirmation. [Approved amendment](../BuildPrompts/1.2.9/APPROVED_AMENDMENT.md) supersedes conflicting original recommendations below. [Execution evidence](../BuildPrompts/1.2.9/evidence/execution.md) distinguishes actual implementation/results from this research snapshot.

Review prototype: [interactive screens](../BuildPrompts/1.2.9/preview/index.html) and [rendered screenshot/validation evidence](../BuildPrompts/1.2.9/VALIDATION.md). All example content and counts are illustrative.

## Evidence and method

**Verified — repository:** inspected existing routes, components, CSS, migrations, worker behavior, and prior delivery evidence. Two parallel read-only research tracks examined lifecycle/date consistency and UX/workflow. Findings below describe source behavior; no fresh production bug reproduction or end-to-end application pass is claimed. The supplied screenshot independently shows an undersized sidebar logo.

**Verified — external:** official PostgreSQL, W3C, OWASP, and Microsoft documentation supports the narrow engineering/accessibility/classifier limitations cited below. URLs, titles, access date, confidence, and supported claims appear in the [source register](sources.md#rooted-129-research-addendum). **Recommendation** marks proposed behavior. **Assumption** marks defaults requiring review. **Unknown** means unconfirmed. **Blocked** identifies a specific incomplete gate, not a guessed failure.

Companion specification: [1.2.9 overview](../BuildPrompts/1.2.9/README.md), [UX](../BuildPrompts/1.2.9/UX_SPECIFICATION.md), [data/API](../BuildPrompts/1.2.9/DATA_AND_API.md), [testing](../BuildPrompts/1.2.9/TESTING_GATES.md).

## 1. Delete a previous study

**Needed/why:** administrators and authorized contributors need an obvious way to remove drafts, obsolete scheduled studies, and previously published studies without leaving dead dates or unintended future deliveries.

**Verified:** `backend/src/api/core-routes.ts` exposes schedule cancellation and content withdrawal, but no complete study deletion command. `publishedStudies()` requires a publication to be the aggregate's live publication; withdrawal clears that pointer. Withdrawal does not remove the slot/plan/content pair from workspace queries. `backend/migrations/001_core.sql` contains interconnected foreign keys and immutable revision/approval/publication/audit triggers. A physical cascading deletion would require careful dependency and retention redesign. PostgreSQL documents explicit referential actions; it does not choose the appropriate product retention policy for us. [S63](sources.md#s63)

**Alternatives:** hard deletion; archive only; audited soft deletion. **Recommendation:** user-facing **Delete study**, implemented as a slot-level tombstone with actor/time/reason and monotonically increasing version. Use one command for slots with and without content. Atomically remove live visibility, withdraw review requests, cancel eligible schedules/delivery/proposal jobs, and exclude the slot from active lists and counts. Keep teaching revisions, approvals, publications, and prior engagement intact. History is available through an explicit **Include deleted** filter in Study Engagement, labeled Deleted. Restore and permanent purge are outside this build.

**Dependencies/risks:** publication and send workers must recheck deletion; immutable rows must remain unchanged. Serialize deletion with publication and scheduling using a documented lock order. An SMS already accepted by a provider cannot be unsent; show this limitation in the delete confirmation, not a blanket “all delivery cancelled” promise. A submitted/unknown provider request must be reconciled rather than retried blindly. Deleted URLs must stop returning teaching content. Date reservations should be reusable; enforce uniqueness only for nondeleted slots. Existing duplicate dates need a migration report and explicit repair, never automatic loss of a study.

**Unresolved:** desired retention duration and any future restore workflow. Recommended default permissions are a new `studies:delete` capability on the current contributor and admin roles; member access remains forbidden. This expands admin deletion authority without giving admins unrelated editorial approval powers.

## 2. Rescheduling and stale Dashboard rows

**Verified:** `Dashboard` in `frontend/components/workspace-pages.tsx` iterates all `data.slots` and uses `data.series[0]` to label “Your week.” It does not select a church-local week. Thus moving a study outside the current week cannot remove it from this list under the current code. Metrics separately count plan and content approvals across the workspace.

**Verified:** the calendar renders slots for the selected series in `studies.tsx`; `studies-with-calendar-move.tsx` separately chooses slots from `data.series[0]`, maps DOM buttons by array position, and installs listeners from inside a timer. Cleanup returned by the timer callback is not registered as React effect cleanup. This creates additional wrong-study/stale-listener risks. The per-series uniqueness index in migration 011 cannot enforce the user's earlier church-wide one-study-per-day rule.

**Recommendation:** canonical grouping comes from the current `slot.localDate`, never the series anchor or an old revision calendar. One church-local date utility and one study-status projection serve Dashboard, Calendar, and Create a Study. Use React handlers with explicit slot/date IDs. Await the mutation, invalidate/reload all affected views, and revalidate when a tab regains focus. Roll back optimistic movement on failure. Adjacent weeks and months must reconcile without duplicating the study. Server-side date/range queries use explicit civil-date boundaries; timezone-aware date handling is documented, but week-start choice remains a product decision. [S65](sources.md#s65)

**Alternatives:** filter only the existing dashboard client; rewrite the calendar library; use shared server projections and focused UI refactoring. **Recommendation:** shared projections without a new calendar framework. Update server constraints and route guards across series. Keep conflicts actionable: “That day already has a study. Move it or choose another day.”

**Dependencies/risks:** date changes currently create a new plan calendar revision and clear dependent approvals/schedules through `cancelPending()`. Preserve the explicit renew-approval behavior for unpublished approved studies in this version and show it before saving. Late approval and explicit immediate publishing must continue to work. Published delivery history must not be moved; offer creating a new study for a new date. **Unknown:** whether the screenshot's actual stale row is solely missing range filtering, a stale browser snapshot, or both; reproduce both cases at execution baseline.

**Verified — additional delivery risk from parallel review:** slot movement does not create a corresponding content calendar revision. `save-revision.ts` carries forward the prior content calendar, while scheduling/late approval uses that calendar. A dashboard-only filtering fix would therefore leave an old delivery date attached to moved content. **Required solution:** when an unpublished study moves, atomically create new immutable plan and content revisions with identical new calendar intent, withdraw old review requests, clear the final study approval, and cancel superseded pending schedules. A later save/reapproval must retain the new date. No-op moves must not change versions; assignment-only edits must not rewrite the delivery calendar or invalidate content approval. Add a move → save → submit → approve → publish test that asserts all dates match and the old due time creates no publication.

## 3. Legible church branding

**Verified:** `frontend/app/globals.css` sets `.brand-logo` to 28×28 px. Earlier enlargements targeted `.topbar-logo`, which is a different element. `workspace.tsx` inserts the logo through DOM effects and uses a tree walker to replace Gather text at runtime. Existing image elements are not updated when their source changes between churches. CSS generated text supplies some Rooted branding.

**Recommendation:** declarative reusable church-brand component. Desktop sidebar image stage: available sidebar width (about 180–192 px with existing padding), 112 px high, `object-fit: contain`, centered. Church name below the image, then **Rooted** in smaller real text. Preserve centered page-header/member branding and existing theme tokens; a sidebar logo fix must not shrink previously approved header logos. Test real uploaded wide, square, tall, padded, transparent, and low-resolution assets. Warn about low-resolution or excessive built-in padding; do not crop artwork automatically or claim CSS can recover missing detail. W3C defines contain sizing; the proposed dimensions are our design choice. [S70](sources.md#s70)

**Alternatives:** enlarge the 28 px square globally; add another stylesheet override; consolidate branding into a component and explicit layout styles. Prefer consolidation so the initial render, accessibility tree, church switching, and logo removal all agree. Keep name fallback when there is no logo. Do not add another full theme editor.

**Verified — asset pipeline:** `backend/src/modules/theme.ts:21` creates a 256×256 transparent mark and a 720×220 transparent lockup using contain sizing. `theme-routes.ts` already serves mark/lockup/preview variants, and the database stores original dimensions. Thus a square original can occupy only the center of a wide lockup even after the CSS box grows. **Recommendation:** choose a suitable variant from original aspect metadata; test the actual artwork size. If needed, add a sidebar derivative that removes only the canvas padding introduced by our own normalization while preserving all source artwork/whitespace. Never silently crop the church's design or replace stored originals. **Unknown:** the uploaded Victory asset's own internal whitespace and resolution, which must be checked during implementation. Keyboard focus, reflow, text, and icon states need independent visibility; status color alone is insufficient. [S66](sources.md#s66) [S67](sources.md#s67) [S69](sources.md#s69)

## 4. Month/week workflow for Create a Study

**Needed/why:** the contributor should answer “what needs to go out this week?” before choosing content organization or tools.

**Verified:** `studies.tsx` gates navigation on a selected series and exposes New series / Weekly series plus an older four-stage strip and plan/content badges. `unified-plan-editor.tsx` adds an approval panel before the editor. CSS hides some legacy actions but does not provide a single coherent workflow model.

**Recommendation:** month selector → expandable numbered weeks with explicit date ranges and counts → study date cards/rows → one selected study with the three steps **Create Study → Gain Approval → Publish Study**. Show a single current status, one next action, the approver, delivery time, save state, and existing live iPhone preview. Planning notes remain optional supporting context; approval belongs to the final study revision. Links and direct study selection work even without selecting a series. Sermons and series remain source metadata, not prerequisite navigation.

**Assumption:** use Sunday–Saturday weeks to match the existing calendar weekday headings. Clip the first and last week at month boundaries, restart numbering each month, and assign each civil date to exactly one displayed month/week. October 2026: 1–3, 4–10, 11–17, 18–24, 25–31. The example Oct 1–6 spans parts of two calendar weeks; use it only as evidence that explicit ranges are desired. Alternative 1–7/8–14 blocks would also work but do not align to Calendar; leave the chosen convention visible for review.

**Dependencies/risks:** backing series IDs may remain for compatibility. Resolve/create an internal date container in one transaction when adding a study; do not require a fake series title from the user or reparent existing sermon provenance after a move. URL month/week selection follows current slot dates; redirect stale deep links to the actual week. Month loading, no studies, add date, errors, unsaved switching, browser back, cross-year and leap-year cases need gates. No recurring studies are created merely because the month is viewed.

**Verified — final specialist review:** `provider-routes.ts` still requires `currentPlanApproval` in content AI source validation, generation and execution. The simplified workflow must replace that hidden prerequisite with rights-checked authorized draft/source provenance, while retaining explicit suggestion acceptance and final study approval. The deletion migration must also replace migration 011's unconditional per-series date index; adding only a new partial index would still block reuse of a deleted date in the same container. These are required U06/D07 acceptance cases, not implementation fixes performed during research.

## 5. Member comments and automatic declining

**Verified:** members can already submit comments when church discussions are enabled. `community-routes.ts` stores new/edited comments as pending and moderators can approve or hide exact comment versions. `member-actions.tsx` lacks friendly examples and automated-decline feedback. `moderation_actions` only accepts approve/hide; there is no machine evaluation record. Study Engagement displays comment text and counts but cannot currently reply or mark questions answered.

**Key distinction:** a negative sentiment score is not a community-policy judgment. Microsoft's sentiment documentation describes domain limitations, sarcasm, subjective thresholds, and false positives/negatives; it does not validate a church moderation model. [S64](sources.md#s64) No automated classifier can guarantee rejection of every negative comment while preserving every legitimate question.

**Recommendation for review:** define “negative comments” as attacks, insults, harassment, threats, hate, or malicious/spam content. Automatically decline confident policy violations before other members see them. Keep uncertain cases private for contributor review. Allow encouragement, sincere Scripture questions, constructive disagreement, lament, and prayer requests through the existing human approval step. Declining never deletes the evidence or rewrites the author's comment. A contributor may reverse an incorrect automated decline with a recorded reason.

Suggested pre-submit copy: **“Share encouragement, a question about Scripture, or a practical takeaway. Negative comments that attack or demean others are automatically declined. Honest questions and prayer requests are welcome.”** Expandable examples: “How can I apply this at work?”, “This reminded me to pray for my family,” “Could you explain what this verse means?” Explain private review/contact without promising a reply time.

| Submitted example | Proposed action | Why |
|---|---|---|
| “This helped me trust God today.” | Pending human approval | Encouragement |
| “I disagree with this reading; how does verse 67 fit?” | Pending human approval | Respectful question |
| “I am grieving and struggling to pray.” | Pending human approval | Personal hardship is not an attack |
| “I still don't understand this.” | Pending human approval | Confusion is a legitimate discipleship response |
| “You are an idiot; nobody should listen to you.” | Auto-declined when confidently classified | Direct insult |
| A quoted insult being discussed in a Scripture question | Private review if uncertain | Context affects interpretation |
| Unsupported language, sarcasm, provider timeout, malformed output | Pending human review | No reliable automated judgment |

**Alternatives:** keyword deny-list (cheap, easy to evade, overblocks quotations); sentiment threshold (misclassifies grief/doubt); context-aware policy classifier plus human review (recommended); manual-only (existing fallback). Reuse provider abstraction, not study-drafting generation. Evaluate an adapter against a separately labeled church-domain corpus before selecting a vendor/model. Do not invent a classifier endpoint, threshold, cost, or accuracy. Version policy, model, prompt, comment content version, verdict, reasons, and decision origin. Treat comments as untrusted data; no instruction/tool execution. Async evaluation avoids holding a transaction during a provider call. Retry or fallback must not publicly expose uncertain text or overwrite newer edits/human decisions.

**Dependencies/risks/unresolved:** churches must enable discussions intentionally. Disabling discussion suppresses submission and pauses jobs without approving old comments on re-enable. Comment bodies may contain sensitive pastoral information; provider use, retention and church disclosure require selection review. Suggested MVP is English with other languages routed to humans. Exact automated thresholds, provider budget, retention, and stricter rejection of all critical comments remain **Unknown**. The build must disclose manual fallback if automation is unavailable; it cannot claim automatic moderation passed based only on fixtures. Log structured IDs and outcome codes without full comment text. [S71](sources.md#s71)

## 6. Dashboard analytics with meaningful actions

**Recommendation — Study Preparation:** Weekly Readiness = approved/scheduled/published final studies divided by nondeleted planned dates in the church-local current week. Review Queue = pending final-study review requests in that week, separately marking those assigned to me. Publication Readiness = approved unpublished studies in the week, partitioned into scheduled and ready to publish; distinguish operationally blocked/failed delivery. Zero dates means “No studies planned,” not 100%. Optional plans never add an approval count.

**Recommendation — Member Engagement:** default latest currently published, nondeleted study, selected by actual publication timestamp with ID tie-breaker. Show **members opened / audience at publication**, positive reactions (Thankful, Encouraged, Praying), and approved member questions needing an answer. Link each metric to the matching Study Engagement filter. Pending and declined comments have separate private counts; they are not unanswered public questions. Keep web visibility and provider delivery status separate.

**Verified:** existing schema has reactions and discussion status, but no study-open events, publication audience snapshots, parent replies, question type, or resolved-state records. `notifications.read_at` records workspace notification reading, not study viewing. Engagement list counts all discussions regardless of moderation status. No existing metric can substantiate “members read.”

**Recommendation:** snapshot active Church Member recipients at publication; authenticated member opens are recorded once per publication/subject, even across tabs/devices/reloads. Exclude contributor previews, bots/anonymous/public opens, failed content loads, and nonmembers. Use an idempotent authenticated POST after successful study load; never add state-changing work to GET or Next prefetch. Freeze denominator at publication. Members added later may read but appear as additional readers outside the initial audience, so the fraction cannot exceed 100%. For historical publications with no snapshot show **Audience not recorded**; do not manufacture historical reach from today's membership.

**Recommendation:** composer offers Response / Question (default Response); contributors may correct type. A published contributor reply marks a question answered in the same transaction; allow explicit resolved/reopened decisions with audit. Member edit re-runs moderation and reopens a previously answered question when meaning changes; hidden/deleted/erased replies trigger re-evaluation of answered state. Add pagination for all engagement filters.

**Alternatives:** derive views from request logs (prefetch/bots distort counts); add third-party analytics (unneeded PII/operations for core reach); persist minimal first-party events (recommended). Avoid joining raw reactions, views, and discussions in one multiplicative aggregate; group independently and test exact fixtures. Composite tenant/publication/member foreign keys, unique keys, and RLS protect these records. [S63](sources.md#s63) [S68](sources.md#s68)

**Dependencies/risks/unresolved:** publication snapshot and membership changes require defined ordering and a non-superuser test. Analytics are estimates of opening, not comprehension. Handle privacy export/erasure, audience retention, disabled tracking and unknown denominators explicitly. Proposed retention: keep view/recipient identifiers for 90 days, then retain labeled aggregate totals under a church-approved policy; deployment policy and pseudonymization details must be recorded before release. Readiness and unanswered-question counts should reflect committed mutations on refresh and focus, not claim real-time multiuser streaming.

## Delivery plan, cost, and release boundary

**Recommendation:** fix deletion/date integrity first; consolidate workflow/branding next; add moderation/replies and then analytics; finish with a browser journey covering publication, member opening/reaction/question, contributor reply, reschedule, and deletion. Relative effort and gates are in the [master prompt](../BuildPrompts/1.2.9/MASTER_BUILD_PROMPT.md). The existing application architecture suffices; no new microservice, real-time collaboration service, or calendar library is required.

Moderation cost is approximately evaluated new/edited comment versions × measured cost per evaluation, plus bounded retry overhead. View storage scales with distinct publication/member pairs; audience storage scales with publications × eligible members. No vendor/model, exact price, throughput, or timeline has been selected. Run an EXPLAIN-based query review on realistic tenant sizes and use existing workers/provider budgets. A recommendation to use a classifier is not verified provider access.

**Blocked — carry-forward release evidence:** 1.2.8 documents incomplete browser harness/regression gates. Do not report the product fully passing because this documentation validates. Execution must first establish a fresh baseline and repair failures that block the required changed-path journeys. Also inspect the legacy plan-approval join in the provider send path before extending cancellation; no external SMS success is claimed by a web publication test.

## Prioritized implementable backlog

| Priority / story | Acceptance | Dependency |
|---|---|---|
| P0 D1: Admin/contributor deletes any study state | Confirm removal; active views/URLs hide it; immutable history retained; pending sends stopped | Lifecycle migration/permissions |
| P0 D2: Move a study across week/month boundaries | One new date everywhere, no stale row/count, church-wide collision safe | Shared dates and active-date constraint |
| P1 U1: Choose month/week/date | Dates group independently of series; partial weeks tested; clear current step | Shared projection |
| P1 U2: Recognize my church | Large contained sidebar logo/name/Rooted on first render and church switch | Brand consolidation |
| P1 C1: Member submits a safe comment or question | Examples/warning/status shown; unsafe text never visible before review | Discussion enablement |
| P1 C2: Auto-decline policy-breaking comments | Versioned decision; uncertain/error fallback; evaluated false positives; human reversal | Classifier adapter/policy |
| P1 C3: Contributor answers a question | Visible approved reply; unanswered count clears once and can reopen | Reply/question version model |
| P1 A1: Two actionable Dashboard groups | Final-study readiness; exact opens/audience/reactions/questions, unknowns honest | Publication snapshot/read tracking/C3 |
| P0 Q1: Prove the entire changed journey | Browser and API IDs/counts agree; tenant and worker races pass | All above; stable test harness |

## Review questions and chosen defaults

1. Week convention: Sunday–Saturday clipped at month edges is the proposed default.
2. “Negative”: hostile/policy-breaking rather than grief, doubt, or respectful questions is the proposed default; this is the main product decision for review.
3. Deletion: remove from member reading and active work, retain labeled authorized history; no restore in this scope.
4. Analytics: unique authenticated opens; denominator captured at publication; older missing history stays unknown.
5. Automation provider/threshold/budget and retention policy remain execution-time evidence gates. Missing configuration uses visibly manual moderation and cannot be represented as fully validated automation.
