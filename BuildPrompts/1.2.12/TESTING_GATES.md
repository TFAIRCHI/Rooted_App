# Rooted 1.2.12 — Testing and acceptance gates

These are execution requirements, not completed results. Automated tests must mock providers and use isolated local databases. Never load a real credential into a fixture or run paid inference as part of a normal test script.

## Required proof matrix

| Area | Required scenarios and evidence |
|---|---|
| Intent and dates | The sample request and paraphrases resolve to a plan; missing dates/cadence prompt focused questions; church/server/browser timezone differences, DST, month/year boundaries, and Sunday–Saturday weeks produce exact confirmed dates |
| Plan direction | Source/audience/depth/translation/day objectives persist across reload; useful edits change plan version; text saying “approved” cannot forge generation confirmation; already supplied context is not repeatedly requested |
| Complete fields | Every target day has nonempty title, grounded references, body, reflection, discussion question, application and outbound preview in the real saved schema; wrong date/count, missing evidence, fake source IDs/links, unexpected fields, empty or truncated content reject |
| Source/profile changes | Changed/revoked source, changed profile with reused version label, or changed direction invalidates confirmation and pending staged results as appropriate; no mixed-version batch is committed |
| Authorization | Anonymous/member-only/no-`ai:use`/no-series-create/unassigned users cannot perform the corresponding work; permissions are rechecked at execution, private read and commit; no capability is auto-granted |
| Tenant and actor isolation | Two simultaneous churches with distinctive source phrases; guessed workflow/plan/source/job/proposal IDs; one user in both churches; two contributors in one church; direct restricted-role SQL; no private content/usage/history crosses the boundary |
| Durable jobs | Refresh, browser close/reopen, worker restart, lease expiry, duplicate claim and explicit retry resume correctly; successful days are reused, not regenerated; unknown provider submissions do not retry automatically |
| All-or-nothing save | Fail the second day, force an insert/revision failure, occupy a target date during generation, revoke membership or cancel before commit: no partial study set is saved; staged progress and conflict are visible |
| Idempotency and races | Double confirmation, duplicate commands, different input with the same key, two commits, concurrent run on the same dates and cancel-versus-commit races produce one correct mapping or a safe conflict |
| Budgets | Whole-batch reserve plus per-attempt settlement, daily/monthly rollover, failed/ambiguous submission, restart, explicit retry and cancellation neither bypass caps nor double charge/refund; all planning/repair calls count |
| UI | Compact/expanded assistant, desktop/mobile, keyboard/focus, editable plan cards, decision summary, exact-date confirmation, progress, retry/cancel, resume and links to all days work; existing Live Preview/stage navigation remain intact |
| Lifecycle and privacy | Workflow expiration/cleanup, explicit erase/export, adopted provenance and backups documented; existing study withdrawal/purge and tenant deletion procedures remain functional with the new relationships |
| No unintended side effects | No study/date created before final generation confirmation; no existing study overwritten; no automatic final approval/publication/SMS/other external provider activation |

## Automated verification

Run meaningful unit/adapter tests for structured intent/plan/day parsing and budgets, plus restricted-runtime-role PostgreSQL tests for state transitions, locks, permissions, ownership, cancellation and atomic saving. Use an injected clock for date boundaries; do not freeze production code to the example week.

Add browser journeys for the real frontend/backend/worker with a mocked provider transport: successful three-day save, refresh/resume, failed middle day and explicit retry, changed plan requiring reconfirmation, occupied date and canceled run. Validate each target editor's saved fields through API and browser reload. A browser-only intercepted fake response must be labeled and cannot replace persistence/authorization tests.

Run repository contract generation/check, typecheck, lint, unit tests, relevant/full backend integration tests, production builds, workflow browser tests, and document/link checks. Use actual repository commands and record results. Update obsolete selectors for user-removed planning UI where relevant; preserve the user's requested design and show unrelated inherited failures separately. Do not expand into unrelated product redesigns.

## Live acceptance journey

Within the master prompt's **10-attempt / 150,000-token verification ceiling**, with lower application caps still enforced:

1. Use a short synthetic reviewed outline without member details and record the independent 1.2.12 verification ledger. Resolve the earlier single-day complete-output/adoption gate first; reuse useful results instead of repeating paid connectivity tests.
2. As an authorized contributor, request three studies for a specific next week and confirm actual dates. Review the plan and teaching direction, then click the explicit generation-and-save confirmation.
3. Observe real worker progress; reload during the run and resume its persisted state. Capture actual provider IDs and usage, avoiding secrets/raw private content.
4. Confirm exactly three new study dates/complete drafts were atomically created. Open each normal editor, verify every saved field including references, reload, and confirm persisted values and Live Preview.
5. Confirm there was no premature write, existing-study replacement, final approval/publication or outbound notification. Verify another church cannot access the records. Use fixtures for extra failure/race scenarios, rather than consuming live calls unnecessarily.

Capture redacted desktop/mobile screenshots, the batch commit mapping and aggregate/revision IDs, completeness checks, model/deployment/settings, provider completion statuses, total attempted calls and actual/conservative usage. Preserve failed attempts and repair evidence. An HTTP 200, queued job, chat answer, fixture, or staged proposal alone is not a live acceptance pass.

If a real Azure/quota/budget blocker prevents completion, finish independent local implementation and tests, report the precise blocker, and leave the corresponding tracker gate open. Do not claim live success or request more paid calls without a concrete tested correction.

## Human content review

Use the existing [behavior evaluation](../../research/Agentic%20Research/agent-behavior-evaluation.md). A church reviewer should assess simple explanations, faithful use of the sermon, sensible progression, reference handling and intermediate stopping depth across all three days. Record this separately from technical correctness; do not invent reviewer approval when no reviewer has participated.
