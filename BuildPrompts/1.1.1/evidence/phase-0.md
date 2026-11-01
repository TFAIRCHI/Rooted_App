# Phase 0 — Build readiness evidence

Build prompt: **1.1.1**. Status: **Complete**. Gate: [G0](../TESTING_GATES.md#g0--build-readiness). Completion timestamp: **2026-10-19T02:26:02.349Z**. This report records local readiness, not application acceptance or provider/human sign-off.

## Authorization and scope

Exact user authorization, as supplied in the current conversation:

> Okay I approve. I want you to go ahead and execute until completed. Ensure that these current build prompts are versioned under a version 1.1.1 folder and with each build request we will increment the versioning. Keep me updated as you progress through the build.

Authorized scope is phases **0–4** under the master prompt's no-range default. No product exclusions are approved. Phase 5 remains deferred; deployment, purchases, real-account connection and member messaging require their applicable separate authorization. No repeated permission is needed for authorized local work. Each new build request increments the patch version; continuing this build and status questions keep 1.1.1.

## Scope and tested state

| Field | Actual state |
|---|---|
| Prerequisite | Explicit user execution authorization recorded above |
| Execution record dates | User approval/version date 2026-10-18; inspected research rerun completed 2026-10-19T02:20:04.994Z |
| Git state | Inspected workspace has no Git repository; do not invent revision |
| Tested fingerprint | `426c6757347bcfb0221a581f4088acae8efd738fb2b58ff5b220830b3565bc64`; initial/final source fingerprint equal in the passing [automated report](automated/phase-0.json). Subsequent documentation/source changes require the main agent's planned refreshed fingerprint, not attribution to this earlier tested state |
| Environment | Windows/PowerShell; observed Node v24.11.1, npm 11.6.2; research browser report Chrome 155.0.8059.80 |
| Stack | Exact selections and verification provenance in [decisions](../../../docs/decisions.md) and [environment/commands](../../../docs/development.md) |
| Database | Main reports native PostgreSQL 17.2 running at 127.0.0.1:54329, `.local/postgres`, `gather`/`gather_test`; DB agent reports three persistence/backup/restore checks passed. These are supplied results, not the full G1A runtime-role/session gate |
| External services | No cloud/live-provider credentials available. Local OIDC selected; AI/SMS/Planning Center activation disabled; references-only Scripture fallback |
| Application install | Main subsequently reports corrected second install completed and lockfile available; audit total 0 vulnerabilities across all severities. This supplied observation does not complete G1A clean-install/build/runtime/security checks |

Root build version is 1.1.1; source component package versions may remain 0.1.0. Prompt versioning is independent of component package versions.

## Required G0 checklist

- [x] Execution authorization, phase range and unchanged product scope recorded.
- [x] Applicable instructions/current prompt and research files inspected; research preserved by this assignment. No scoped AGENTS instructions found for owned files.
- [x] Existing full-package research validation reproduced by main agent; current machine-readable report inspected, passed with zero errors. Historical schema/capture runs are distinguished below.
- [x] Concrete frameworks/versions, SQL migrations, PostgreSQL, local protocol-validating identity, durable queue/private storage, test tools and local strategy selected in decision/command records. Runtime implementation proof belongs to G1A and later gates.
- [x] Tenant roles, approval/calendar policies, two-choice UX and security boundaries translated without weakening mandatory requirements. Pending policy adoption is explicit.
- [x] AC01–AC29 each has owning phases, planned test/review layer and required evidence in the [acceptance matrix](../../../docs/acceptance-matrix.md).
- [x] Provider/rights/country/test-church/human-review unknowns classified with owners and blocking gates in [prerequisites](../../../docs/development.md#prerequisites-and-blockers).
- [x] Required command contract, clean-environment checks, failure reporting and nonpassing skipped/unrun gate behavior documented; root scripts declared by main agent.
- [x] Final combined report/fingerprint inspected: main ran `node backend/scripts/gate.mjs --phase 0`, exit 0; `automatedPassed:true`, `complete:true`, `status:gate_passed`, no required reviews. Readiness artifact check and source-stability check pass; research exit 0 with no required skips.

## Commands and actual results

| Command / inspection | Provenance / environment | Exit code | Counts / outcome | Evidence |
|---|---|---|---|---|
| `npm run validate --prefix research/tools` | Main agent executed; current report inspected by documentation agent | 0 reported by main | Pass: 34 Markdown, 48 source definitions, 119 references, 14 PNGs, 8 diagrams, 18 UI checks; errors 0 | [Full-package results](../../../research/tools/validation-results.json), generated 2026-10-19T02:20:01.011Z, completed 2026-10-19T02:20:04.994Z |
| `node --version` / `npm --version` | Documentation agent read-only commands | 0 | v24.11.1 / 11.6.2 | Terminal observations; exact versions recorded here |
| Native `initdb.exe` file existence | Documentation agent read-only inspection | 0 | Binary confirmed under `C:/Program Files/PostgreSQL/17/bin/` | Main reports PostgreSQL 17.2 cluster subsequently started |
| `git status --short` | Documentation agent read-only inspection | Nonzero; individual code not captured | No Git repository; no application failure inferred | Use deterministic manifests/hashes for gate evidence |
| `node research/tools/schema-check.mjs` | Not rerun by this assignment; historical report inspected | Not newly observed | Historical 22 checks, not a new application/real-PostgreSQL test | [Schema report](../../../research/tools/schema-validation.json), recorded 2026-10-18T19:50:01.196Z; source hash matches inspected schema |
| `node research/mockups/source/capture.mjs` | Not rerun by this assignment; historical report inspected | Not newly observed | Historical screenshot/workflow evidence; current package rechecked PNGs and bounded UI | [Capture report](../../../research/mockups/validation.json), generated 2026-10-18T19:54:26.636Z |
| `node backend/scripts/gate.mjs --phase 0` | Main agent executed; documentation agent inspected report | 0 reported by main | Pass: readiness artifacts (6 files, 68 links, failures 0), research (exit 0, requiredSkipped false), stable source state; complete true | [Gate report](automated/phase-0.json); started 2026-10-19T02:25:57.737Z, completed 2026-10-19T02:26:02.349Z; [research log](automated/phase-0-research.log) |
| Application lint/types/build/unit/integration/browser gates | Not executed by this assignment | Unrun | Planned; no application pass | Required under G1A and later phase reports |

No command or report above establishes live provider behavior, complete accessibility, doctrinal acceptance, production readiness or cloud recovery guarantees. Database-agent persistence/restore checks are distinct from full application isolation, membership/session/authentication and worker tests.

Documentation-agent read-only PowerShell audit passed (exit 0): 10 owned Markdown files, 90 relative file links with zero missing targets, 29 unique AC table rows, and only `README.md` remaining at the BuildPrompts root. This bounded audit checks target existence, not all heading anchors or application behavior; the main G0 runner performs the final combined validation. Full prompt instructions and gate checklists are preserved through archival; only version metadata, paths and execution state were updated.

## Inspected research fingerprint

SHA256 values observed 2026-10-19 UTC; these identify the bounded research proof, not the completed application state.

| File | SHA256 |
|---|---|
| `research/tools/validation-results.json` | `5f5ac889bd74681b4ecd16526b241ac2be4632b3a9d6648bdd01f51018d57884` |
| `research/tools/validate.mjs` | `590e124893dd9b4c992ae6fd348109d12a3feff6197c2827dd7f758e41720c23` |
| `research/schema.sql` | `87ff3e40eb5a0b48ecc0638babc542311fd9895220c0d09730da06bc2e004304` |
| `research/tools/package-lock.json` | `854ea6a565030060f7acc387c114d5baeb1f80cbd8805f40fc998eeeb0bab1ff` |

The passing G0 runner reran research and replaced its timestamped report/hash; the hashes above retain the earlier inspection as history. The passing source fingerprint is recorded in the tested-state table. Automated report directory is owned by main agent/gate tooling; this assignment does not write generated reports or rerun the gate. Main plans another refresh after these documentation updates; retain each actual tested fingerprint separately from later state.

## Gate history

1. Initial attempt: main reports G0 failed because this manual phase-0 report did not yet exist. Exact failed-attempt timestamp, exit code and artifact path were not supplied; none are invented. The failure is retained here rather than erased by the later pass.
2. Resolution: created this report, decisions, development manifest and all 29 planned acceptance rows. Documentation link audit passed; original gate requirements were retained.
3. Passing attempt: `node backend/scripts/gate.mjs --phase 0`, exit 0 reported by main, completed 2026-10-19T02:26:02.349Z. The inspected JSON has three passing checks and stable fingerprint `426c6757347bcfb0221a581f4088acae8efd738fb2b58ff5b220830b3565bc64`. This is the latest result received at this update; main retains runner logs and owns generated-report refreshes.
4. Dependency follow-up: main reports second install corrected jsdom to 27.4.0 and removed the incompatible/vulnerable Next ESLint development chain; audit reported total 0 vulnerabilities. No dependency-security completion or application build claim is derived from G0. G1A verifies the final installation, configured lint coverage, full runtime behavior and remaining security requirements.
5. Subsequent inspection confirms the latest generated G0 report still contains the 2026-10-19T02:26:02.349Z pass and fingerprint above. Root manifests/lockfile have since changed for legitimate engine/dependency corrections. The earlier pass is preserved as historical evidence; a refreshed combined result is pending the main agent's automated rerun. No newer fingerprint or completion time is invented. This documentation assignment does not execute the runner because generated automated reports and research outputs are owned by the main agent.

## Manual/provider prerequisites and handoff

No human/provider review has passed through this documentation task. External credentials, corpus rights, country/sender/consent decisions, church test access, accessibility/editorial review and pilot-equivalent operations remain pending or blocked at their named gates. They do not turn local G0 into a claim of completed research vendor PoCs. Full phase-1C human review and phase-2/3/4 provider/human evidence remain mandatory.

Gate decision: **Pass for local build readiness**, at the recorded completion timestamp/fingerprint. All G0 readiness requirements are documented and the combined verifier passed; no required G0 reviews are listed. The [tracker](../PHASE_TRACKER.md) records completion and phase 1A is now In Progress. See [phase-1A evidence](phase-1A.md): it needs actual PostgreSQL runtime-role isolation, real OIDC/session and authorization tests, clean install/build/lint/types and the complete G1A checklist. G0 does not waive later manual/provider/security gates or authorize deployment/live messaging; the automated report explicitly records both authorizations false.
