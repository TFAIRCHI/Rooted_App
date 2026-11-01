# Final advanced acceptance evidence — October 30, 2026

All three advanced checks completed. The active [acceptance record](../resume-20261028.md) now has 35 checked items and no unchecked items.

| Check | Execution and observed result | Evidence |
|---|---|---|
| Old-session replay after logout | Live production frontend/API; isolated Edge context with actual interactive Contributor verification. Session/workspace200 before logout, logout200, captured old-cookie replay401 on both endpoints, logged-out context401. Finished14:21:07.620UTC. | [session-replay.json](session-replay.json) |
| Frontend recovery from zero replicas | User Portal screenshot confirmed frontend current replicas0, min0/max10, existing HTTP scaler. First request200/Rooted HTML in20474ms, warm request200 in72ms, API proxy200 with production options intact. Finished14:38:19.601UTC. | [cold-start.json](cold-start.json) |
| Interrupted queued AI-job recovery | Isolated local PostgreSQL and actual process SIGKILL after claim/provider-fixture entry. Waited real two-minute lease; recovery at122seconds marked submission_unknown/failed, reserved tokens0, charged7860 conservative reservation once, no automatic inference resend over two recovery ticks. Explicit retry completed with70 fixture tokens, two total submissions/attempts, zero reservations and no duplicate drafts/publications. Finished13:54:48.027UTC. | [interrupted-workflow.json](interrupted-workflow.json) |

## Scope and cleanup

The interruption test uses the compiled workflow module matching the inspected deployed worker image version rooted-backend:pilot-20261027-1, SHA256 `1d8286830785f9ce2201c331827fc878d53014cb4beef767d1ac7424bb76cae4`. The provider is a deterministic local fixture. No production worker was killed and no paid Azure AI request was made/interrupted. This verifies process-interruption, lease, accounting and explicit retry behavior of that module; it is not provider-invoice reconciliation.

The recovery database was created only on localhost54329, guarded by hostname/port/database-name checks, and dropped after validation. A separate query confirmed zero remaining gather_recovery fixture databases. Existing development PostgreSQL was retained.

Session cookies and CSRF values remained in memory in an ephemeral browser context. No cookie/token values, authentication codes, traces or storage state were saved. The helper logged out only its own test session and closed its test browser. Initial helper timeout before interactive login was not an application failure; the completed report reflects the successful run.

Frontend scaling and all deployed images/settings were unchanged. The cold-start test applies to the frontend; API and worker retained their existing minimum replicas. The first request was not retried to hide a failed response. **Observed cold startup latency was20.5seconds, versus72ms warm.** No latency SLO had been defined for this acceptance check; this value remains visible for future operating decisions.

Eight targeted local session/workflow regression checks passed before the advanced exercises. No application business-logic code was changed for these checks.

Operator scripts are in deploy/azure: check-session-replay-20261030.mjs, check-interrupted-workflow-20261030.mjs and check-cold-start-20261030.mjs. They are evidence/reproduction tools, not an instruction to repeat acceptance automatically.
