# Application build prompts

Prompt version: **1.1.1**. Status at archival: **Execution authorized for phases 0–4; phase 0 in progress.**

This version translates the [research package](../../research/README.md) into implementation instructions. The user has authorized the current build; the tracker records that authorization and its limits. The original prompt preparation alone did not authorize implementation.

The instruction documents are frozen for this build; the tracker and evidence remain dynamic. New build requests increment the patch version; continuations and questions do not. See the [version registry](../README.md).

## Review order

1. [Master build prompt](MASTER_BUILD_PROMPT.md) — execution instructions, architecture, mandatory behavior, source layout, phase scope, and approval boundaries.
2. [Phase tracker](PHASE_TRACKER.md) — the completion table to update during execution, with required gate/evidence links.
3. [Testing gates](TESTING_GATES.md) — what must pass before each phase is complete, including regression and external validation requirements.
4. [Phase evidence template](PHASE_EVIDENCE_TEMPLATE.md) — the report to populate for each phase; its unchecked template is not completion evidence.

The approved future build places browser/UI source in repository-root `./frontend/` and API, domain, database, integration, and worker source in repository-root `./backend/`. These directories should be created only when implementation is explicitly authorized.

## Authorization contract

The following is an example of a narrower future authorization, not the current build's authorization:

> I approve execution of `BuildPrompts/1.1.1/MASTER_BUILD_PROMPT.md` for phases 0 through 1C. Implement those phases and stop after their gates pass, or report any unmet gate honestly.

The phase range is illustrative. Approval of a particular phase range authorizes that range and its prerequisite work; it does not authorize later phases, deployment, purchases, or real member messaging. Approval without a phase range authorizes phases 0–4 as defined in the master prompt; optional phase 5 still needs a selected scope. Any narrower instruction in the approval controls. Do not interpret favorable feedback about the prompt as permission to execute it.

External credentials, church doctrinal review, authorized test recipients, rights decisions, and deployment approval remain separate prerequisites where required. A simulated integration can support development but cannot close a live-provider gate.

## Completion policy

At archival, phase 0 is In Progress and every implementation phase is uncompleted. Previously passing research/mockup checks validate research artifacts only. During an approved build, the executor updates the tracker with actual test results and a phase report. A phase reaches **Complete** only when every required deliverable and test passes and every required human/external review is evidenced. Otherwise it remains **In Progress**, **Blocked**, or **Ready for Review**, with the exact unmet items listed.
