# Option B public study migration build package

Prepared **2026-11-04**. **Local implementation and both deployment images are built. Production activation has not occurred.** The full browser suite passes; see the [execution evidence](evidence/implementation.md) for local tests and remaining live pilot gates.

- [Master build prompt](MASTER_BUILD_PROMPT.md): implementation instructions, phase order, test gates and release handoff.
- [Migration research](../../research/member-access-options-20261104/option-b-migration-plan.md): target contract, current-state map, data and route migration, release order and verification matrix.
- [Option B architecture](../../research/member-access-options-20261104/option-b-public-links.md), [Twilio owner guide](../../research/member-access-options-20261104/option-b-twilio-setup.md), and [reader mental model](../../research/member-access-options-20261104/member-mental-model-comparison.md).
- [Execution evidence and rollout handoff](evidence/implementation.md): implemented paths, migration, tests, local images, rollout order and remaining gates.

The original build instruction was:

> Implement `BuildPrompts/option-b-public-study-migration/MASTER_BUILD_PROMPT.md` against the current repository. Follow the linked migration research, verify current code and migrations before editing, complete the local checks and image preparation, and provide a release handoff with actual evidence. Activate production SMS only after the sender, consent and church-content gates in the research have been met.

The prompt is a work instruction, not an executable PowerShell file. Its implementation status is tracked in the evidence report.
