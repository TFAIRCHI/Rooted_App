# Phase <id> — <name> evidence report

Prompt version: **1.1.1**.

**Template only. This file is not evidence of executed work.** During an authorized build, copy/populate it as `BuildPrompts/1.1.1/evidence/phase-<id>.md` and use real links relative to that report. Keep all completion items unchecked until verified.

## Scope and tested state

| Field | Actual value to record |
|---|---|
| Phase / gate | <id and gate link> |
| Status | <In Progress / Blocked / Ready for Review / Complete> |
| User authorization | <message/date and phase range; no self-authorization> |
| Scope and approved exclusions | <required outcomes; reference explicit scope-change approval> |
| Prerequisite gates | <actual passing report links> |
| Started / tested / completed at | <UTC timestamps; completion blank until done> |
| Tested state | <Git revision plus dirty-state/file hashes, or deterministic source/lockfile/migration manifest hashes if no commit> |
| Environment | <OS, runtime, database/pool/roles, frontend/backend/test versions, dependencies, controlled clock> |
| External services | <real authorized test provider versus stub; country/account class; no secrets or real contact data> |

## What works

Describe the actual end-to-end behavior, frontend and backend changes, relevant contract/schema versions and migrations. Separate implemented behavior from planned work and local simulation from verified provider behavior. Link the runnable setup and demonstration steps.

## Deliverable and gate checklist

Copy the phase's complete scope and gate items here; do not replace them with only the subset that passed.

- [ ] All required frontend and backend deliverables are implemented and integrated.
- [ ] Every required automated gate passes, including prior mandatory regressions.
- [ ] Required human/external reviews pass with actual evidence.
- [ ] Acceptance scenarios are mapped to test/review evidence below.
- [ ] Configuration, migrations, permissions, documentation and recovery/runbooks are current.
- [ ] No required failed/skipped/unrun checks or placeholder-only paths remain.
- [ ] Tracker completion date, tested state and report are updated only after all of the above.

## Commands and results

| Exact command / check | Environment / test data | Exit code | Passed / failed / skipped / unrun counts | Actual report / redacted artifact | Result |
|---|---|---|---|---|---|
| <command> | <runtime-role, two-tenant, clock and provider mode> | <actual> | <actual; required skips/unrun block completion> | <existing relative path> | <Pass / Fail / Blocked> |

Do not paste secrets or sensitive payloads. Include meaningful negative/race/failure tests, not just a successful smoke run. Identify how the frontend used the real backend/database. If evidence becomes stale after a code change, record retest rather than leaving the old result as current proof.

## Acceptance evidence

| AC / gate item | Test file and test ID / manual scenario | Actual evidence | Reviewer if required | Outcome / remaining gap |
|---|---|---|---|---|
| <ACxx> | <real implemented test or observed scenario> | <existing report link> | <name/role/date or not required> | <Pass / Fail / Blocked> |

## Manual and provider validation

Record accessibility devices/viewport, keyboard/screen-reader scenarios, editorial reviewer, real provider/account/sender authorization and scope, rights decisions, observed outcomes and limitations. An automated test persona or a mocked callback is not human or live-provider sign-off. Record Not Yet Applicable where outside this phase rather than suggesting the review happened.

## Blockers, exceptions and risk

| Unmet requirement / failure | Impact and dependent phases | Owner | Required next action | Scope approval if changed |
|---|---|---|---|---|
| <actual blocker, or explicitly None after checking> | <actual> | <owner> | <action> | <real approval or none> |

List known limitations and whether they prevent phase completion or only a later release. No required gate can be waived by the executor. If a user approves narrower scope, retain the original gap and name the narrower completed capability.

## Completion decision and handoff

- Gate decision: <Pass / Fail / Blocked / Awaiting Review>.
- Why the whole required phase is or is not met: <concrete evidence and outstanding items>.
- Completion timestamp: <only when Complete>.
- Next eligible authorized phase: <id and prerequisites, or stop at approved range>.
- Deployment/member messaging status: <actual, with separate authorization requirement>.
- Reopened/retested history: <preserve prior results and corrections>.
