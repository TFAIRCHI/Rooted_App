# Rooted 1.2.9 — Testing and acceptance gates

These are the acceptance criteria. Passing implementation checks are recorded separately in [versioned execution evidence](evidence/execution.md); an executed test does not close a broader row unless the full scenario is covered. Implementation phase completion requires the whole applicable gate and a reproducible test environment. Documentation/prototype validation is recorded separately in [validation](VALIDATION.md). Preserve the [1.2.8 delivery matrix](../1.2.8/DELIVERY_TEST_MATRIX.md) and [research baseline](../../research/22-delivery-e2e-test-report.md).

## Fixture and environment requirements

Use an isolated DB with the actual runtime DB role, injected/frozen time, two churches, member-only user, full contributor, second eligible contributor/approver, admin without editorial capabilities, restricted contributor, inactive/foreign users. Use current demo identities where supported; never weaken role assertions or modify the user's live prepared study to make fixtures work.

Seed dates across current/next week, October/November, year end, leap February; multiple source series; all editorial states; same-timestamp publications; queued/deferred/accepted/unknown sends; live and withdrawn publications. Include a legacy dataset with duplicate cross-series dates and absent audience snapshots. Browsers run at 320, 390, 768, and 1440 px with keyboard and automated accessibility checks. Human visual/keyboard review complements automation.

## Deletion — Phase 1

| ID | Scenario | Must prove |
|---|---|---|
| D01 | Contributor/admin delete an unstarted slot and each editorial state | Correct authority; all active views lose the root; only selected study affected |
| D02 | Member, inactive and cross-tenant delete attempts | Rejected server-side; no root existence/body leak; data unchanged |
| D03 | Delete scheduled study; advance worker to due time | No publication or new provider submission; pending review/AI/sends cancelled safely |
| D04 | Ordinary-delete attempt on a published study, then withdraw it | Ordinary Delete is rejected; member/public deep links stop returning content only after explicit withdrawal; history remains authorized/labeled; dispatch facts honest |
| D05 | Repeat same/different idempotency keys; stale version | No repeated effects/resurrection; safe terminal replay; stale active edit rejected |
| D06 | Race delete with publish, provider claim, approval and comment | Compatible locks; no deadlock/ghost live study/late comment exposure; accepted sends reconciled |
| D07 | Reuse deleted date in same series/container and another container; preexisting duplicates | Old unconditional index replaced on upgrade; active date reusable; duplicate preflight reports instead of silently deleting; concurrent conflict safe |
| D08 | Audit/immutable rows/permissions and private history | Approved revisions/publications unchanged; member cannot query tombstones or retained comments |

## Calendar and Dashboard consistency — Phase 1

| ID | Scenario | Must prove |
|---|---|---|
| R01 | Move within selected week | One row on new date in Calendar, Dashboard and workflow, correct order/count |
| R02 | Move out of week/month, then in | Old rows/counts disappear; destination appears once after mutation, navigation, reload, focus |
| R03 | Drag a nonfirst-series study | Explicit ID/date controls correct study; repeated renders leave one handler and one request |
| R04 | Occupied day in another series; simultaneous moves | DB-backed church-wide 409; neither study overwritten; old position restored |
| R05 | Move → save writing → submit → approve → schedule/publish | Slot/plan/content/schedule calendars match new intent; no publication at obsolete due time |
| R06 | Approved unpublished move, no-op and assignment-only updates | Actual date change renews final approval; no-op creates no revision; assignments preserved and do not revoke approval |
| R07 | Edit optional planning notes after final approval | Approved content/snapshot remains valid; no dependency on a second plan approval |
| R08 | Move an already published study; late approve an unpublished one | Historical date immutable with clear action; late approval/immediate publishing still succeeds |
| R09 | Church/device zones, DST gaps/overlap, stale/out-of-order responses | Church-local day stable; explicit overlap resolution; no old church/week overwrite |

## Workflow and branding — Phase 2

| ID | Scenario | Must prove |
|---|---|---|
| U01 | October 2026 selection without URL | Sunday-clipped five ranges 1–3/4–10/11–17/18–24/25–31; current week chosen from church-local date |
| U02 | Four/six-week months, leap year, month/year boundary | Every date appears once in selected month; month navigation creates nothing |
| U03 | Add/select without a series; legacy deep link; browser history | No series-title prerequisite; correct source context and current date; recoverable invalid/deleted link |
| U04 | Draft/review/changes/approved/scheduled/published | Exactly three coherent steps and one task-level primary action; one final study approval |
| U05 | Type during save, immediately select approver and submit | Latest text is saved/submitted; exact revision/hash; conflict/failure blocks submit with text intact |
| U06 | Source/notes/AI/phone preview and week switching, with no plan approval | Manual drafting and AI generate/adopt work against authorized source/draft snapshots without approving a plan; inspect/accept explicitly; preview shows latest writing; no lost work |
| U07 | Logo aspect/padding/resolution, dark/light, switch/replace/remove/failure | Large visible artwork, correct church name/Rooted hierarchy, first-render/accessibility tree agrees |
| U08 | Keyboard, zoom and mobile, delete dialog and sign-out | Actions reachable, no horizontal clipping at 320 CSS px, real labels, focus restores, no drag-only task |

## Conversation and moderation — Phase 3

| ID | Scenario | Must prove |
|---|---|---|
| C01 | Enabled/disabled discussion; submit Response/Question | Examples and warning appear before submission; correct persisted kind/policy/status |
| C02 | Confident insult/harassment/threat/spam violation | Automatically declined against exact content version; never visible to another member; author can revise |
| C03 | Grief, doubt, respectful disagreement, Scripture quotation | Not automatically declined merely for negative sentiment; pending for human review |
| C04 | Sarcasm, obfuscation, unsupported language, timeout/malformed output/budget exhaustion | Private manual fallback and observable reason; no auto-publication |
| C05 | Edit versus machine callback/human decision; re-enable discussion | Latest version wins; manual decision not overwritten; obsolete jobs cannot expose old text |
| C06 | Decline reversal, reports/restrictions, privacy erasure | Authorized audit preserved; member/private body boundaries; erased text/jobs not reintroduced |
| C07 | Contributor reply to approved question | Same-church/publication parent enforced; public reply and answered state commit once |
| C08 | Edit question, hide last answer, explicit resolve/reopen | Unanswered count/state follows defined content-version rules; moderation distinct from answer state |
| C09 | XSS/injection, rate limits, idempotency, parent IDs and permissions | Plain escaped output; no tool/instruction execution; no foreign comment/reply access |
| C10 | Candidate classifier on labeled holdout set | Provider/model/prompt/policy/threshold recorded; false positives/negatives, cost and latency measured; no fixture-only effectiveness claim |

Classifier evaluation minimum: a versioned corpus of at least 60 cases spanning the categories above, separate calibration and holdout sets, independently labeled and reconciled by two reviewers. Proposed release gates: no auto-decline of the critical grief/prayer/respectful-question holdout examples; no public exposure of declined text; correct adapter result application in every orchestration/race test. Report exact sample sizes and confusion matrix; “all examples passed” is not a guarantee for all future language. Record a church-approved acceptable error policy. Missing provider/holdout review leaves C10 and the automation release gate incomplete even when a manual fallback works.

## Analytics — Phase 4

| ID | Scenario | Must prove |
|---|---|---|
| A01 | Final-study states, multiple weeks/series and plan-only approvals | Exact scoped readiness/review/publication counts; each study counted once; correct action links |
| A02 | Publish once; repeat/retry; simultaneous membership change | Frozen audience snapshot captured exactly once under documented transaction ordering |
| A03 | Member opens repeatedly/from devices; preview/prefetch/public/failed load | One unique authenticated open; no preview/bot/nonmember read count; opening labeled honestly |
| A04 | Add/remove member after publication; zero/legacy audience | Fraction never exceeds initial audience; additional readers separate; no fake historical denominator |
| A05 | Seed audience 80, opens 42, extra opens 2, reactions 18, unanswered roots 3 | API/Dashboard/engagement show 42/80 (53%), +2, 18 and 3 without multiplicative joins |
| A06 | Question pending/declined/answered/reopened; response with '?' | Only approved unresolved question roots counted; a reply or '?' alone does not add unanswered question |
| A07 | More than 20 publications, equal timestamps, deleted/withdrawn history | Whole-scope totals; stable cursor; selected/latest publication policy; history/detail no dead links |
| A08 | Cross-tenant/role denial; export/erasure/retention; analytics failure | No unauthorized raw metrics/text; cleanup audited; independent preparation panel and honest unavailable states |

## Canonical browser journeys — Phase 5

**J1 — Create → review → publish → open → respond → answer**

1. Contributor selects month/week/date and creates the study without naming a series or approving a plan.
2. Contributor types while autosave is active, chooses second contributor, submits once. Assert final displayed text matches requested revision.
3. Approver reads exact revision, comments/requests changes if exercising that branch, then approves the corrected revision.
4. For a past planned date, assert approval and immediate web publication; separately exercise future Schedule and Publish now.
5. Member logs in, sees and opens published study; assert same publication/revision IDs as approval and engagement.
6. Member reacts and submits a sincere Question after seeing guidance; comment stays private pending human approval.
7. Contributor approves question, sees unanswered metric, replies; member sees approved reply and question count clears once.
8. Member submits a clearly policy-breaking test comment; real configured classifier auto-declines it; another member cannot see its body. Exercise manual fallback separately if configured.
9. Dashboard shows exact unique open/audience/reaction/question counts; Study Engagement shares immutable teaching snapshot and statuses.
10. Repeat publish/open/reply network requests after simulated response loss; no duplicate publications, unique opens or replies.

**J2 — Move → new approval → correct delivery**

Move an unpublished approved study across weeks/months using drag and date control in separate cases. Confirm renewal consequences, verify Dashboard/Calendar/workflow dates and counts, save/submit/reapprove the new calendar, advance past the old due time, then publish/deliver at intended time. Verify one member-visible publication and one engagement entry.

**J3 — Delete → stop future work → retain restricted history**

As contributor and dedicated admin, delete a draft and a scheduled unpublished study in separate cases. Advance worker and assert no delivery. Attempt ordinary Delete on a published study and verify it is rejected; explicitly withdraw it, verify member/public direct URLs no longer expose content, authorized history remains labeled, and retries stay safe. Hard Delete only a disposable withdrawn fixture after typed confirmation and reason. Verify sign-out/home navigation from the resulting list.

Record browser traces/screenshots plus actual API/DB identities, not screenshot-only evidence. Failure to run a browser is a blocked browser gate, not an API substitute.

## Required execution commands and evidence

Use repository scripts; confirm current script names before execution:

```text
npm run contracts:check
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm run test:e2e
npm run build
npm run test:research
```

Apply migrations only in isolated validation DBs before testing upgrades against a backed-up local environment. Capture command, environment, timestamp, exit code, counts, artifact paths and a short interpretation in versioned evidence. First run tests specific to each changed module, then required regression gates. Report preexisting unrelated failures separately and keep mandatory release status incomplete; do not rewrite old evidence or delete tests to get green output.

Final release requires all IDs above/J1–J3 passing, no unresolved critical/high changed-path defect, and evidence of genuine configured automation if claiming automatic declining. External SMS/email/push delivery needs independent provider evidence; a published web page is not proof of a delivered notification.
