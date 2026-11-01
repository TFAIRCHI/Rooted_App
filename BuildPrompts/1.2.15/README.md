# Rooted 1.2.15 — Focused public pages

Prepared October 30, 2026. **Implemented and verified locally; frontend image built. Tyler’s release review, Docker upload, Portal rollout, and production smoke acceptance remain.** See the [execution report](evidence/execution.md) and [exact release handoff](../../deploy/azure/homepage-navigation-release-20261030.md).

**Real application preview:** http://127.0.0.1:3081/ — the built frontend image. Its public pages work locally; real account integration was verified in the isolated test stack because the candidate retains the Azure-internal production API target.

Implement the approved [Homepage Navigation Research](../../research/Homepage%20Navigation%20Research/README.md) inside the existing frontend. Replace the long marketing homepage with six focused destinations and one shared header, preserving the current real account and member flows.

| Document | Purpose |
|---|---|
| [Master build prompt](MASTER_BUILD_PROMPT.md) | Executable instructions for the implementation session |
| [Testing gates](TESTING_GATES.md) | Six bounded gates for this frontend change |
| [Production rollout](PRODUCTION_ROLLOUT.md) | Local image, user Docker push, Portal release, smoke checks, rollback |
| [Phase tracker](PHASE_TRACKER.md) | Honest status and evidence for implementation through acceptance |

## Implementation entry point (executed)

Give the implementation agent this instruction from the workspace root:

> Implement BuildPrompts/1.2.15/MASTER_BUILD_PROMPT.md using the approved final Homepage Navigation Research mockup. Complete the local implementation and relevant checks, prepare the frontend release artifact and handoff, and update the phase tracker with actual evidence. Preserve the existing production account flows and use the documented manual Docker/Azure Portal release path.

The build prompt was executed locally. The implementation includes shared navigation, five new public routes, existing sample/sign-in/get-started routes, mobile behavior, old fragment-link compatibility, metadata/search indexing, and the five independently reviewed UX corrections. The original invocation below is retained for traceability, not as a request to repeat completed work.

## Path to production

1. Implement and check the real frontend locally against the approved prototype.
2. Present the actual implementation and a tested frontend image for Tyler’s release review.
3. Tyler pushes the image with local Docker and selects it in Azure Portal; assist with exact values from the release record.
4. Run the short production smoke check and record acceptance or roll back the frontend.

This release needs no planned backend, worker, migration, identity-policy, DNS, or scaling changes. The prior [35-check acceptance record](../../research/Azure%20Deployment%20Research/resume-20261028.md) stays complete. The new gates concern this navigation release only.

The research mockup remains the approved reference. Do not deploy its static sign-in simulation or replace the application with the research server.
