# Phase 2 — Controlled AI and source ingestion evidence

Build: **1.1.1**. Status: **Blocked — partial source inspected; prerequisite and required evidence unmet**. Completion timestamp/fingerprint: **not set**. Existing approval covers phases 0–4; no new permission is required for authorized independent work. Dependent implementation/acceptance must respect the [master sequence](../MASTER_BUILD_PROMPT.md#6-phase-execution-table).

## Observed implementation

[Provider API/worker](../../../backend/src/api/provider-routes.ts), [AI adapter](../../../backend/src/integrations/ai.ts), [ingestion](../../../backend/src/integrations/ingestion.ts), [transcription](../../../backend/src/integrations/transcription.ts), [Scripture verification](../../../backend/src/integrations/scripture.ts), [AI UI](../../../frontend/components/ai-assistance.tsx), [source UI](../../../frontend/components/source-manager.tsx). Source includes explicit queued actions, provenance, selective stale-base adoption, budget reservations, reviewed sources, TXT/VTT/SRT parsing and URL restrictions. Production audio inspection remains an operator-injected requirement.

These observations identify source, not executed behavior or a passed phase. Inspection after build resumption does not establish when dependent work was authored or that its prerequisite gate passed.

## Test definitions and supplied results

[Adapter/unit definitions](../../../backend/tests/integrations/providers.test.ts), [security definitions](../../../backend/tests/integrations/security.test.ts), [source-fetch definitions](../../../backend/tests/integrations/source-fetch.test.ts), [PostgreSQL + HTTP-stub integration definitions](../../../backend/tests/integration/providers-api.test.ts). Main reports backend unit total 24 passing (including revision/adapter tests); this is local fixture/loopback proof, not actual vendor testing. Full API/worker integration results pending.

This documentation assignment has not run application tests, modified generated reports, or obtained manual/provider review. Latest main-supplied summary: component type checks pass; frontend 7 unit tests and backend 24 unit tests pass; root lint reported 15 provider errors under repair; full browser and integration execution pending. Exact commands/count reports/fingerprints must be linked when received, and a later suite result supersedes this supplied summary only for its tested state.

## Complete required gate — unchecked

Primary acceptance: AC04–AC05, extended AC18–AC21, AI degradation AC28; regress all prior gates.

- [ ] Weekly/day proposals, field assistance and full-study drafting occur only after explicit authorized actions; full study generation requires current approved plan. Viewing a cached proposal does not spend again.
- [ ] Proposal output is separate from the draft. Selective adoption, comparison, edit/reject/undo preserve untouched work and reject stale-base application. Generation never approves, publishes, exports members or sends messages.
- [ ] Church profile/source/model/prompt/schema versions and evidence spans are recorded. Direct quotations compare against authorized source text; nonexistent/mismatched references and uncertain claims never receive verified labels. Interpretation is visibly distinct.
- [ ] Rights checks, quarantine/type/size parsing, private storage and SSRF/redirect controls cover selected upload/link/transcription paths. Partial/chunk failures, cancellation, corrections, duplicate finalization and retries preserve provenance.
- [ ] Cross-tenant retrieval and adversarial direct/indirect/multilingual/encoded source tests prove no unauthorized side effects/disclosure; model refusal text alone is not a pass.
- [ ] Budgets, per-tenant caps, bounded retries, cache invalidation and no-member-data defaults work. AI/transcription failure leaves manual workflows usable.
- [ ] Selected real AI and, if in scope, transcription providers pass authorized representative contract/usage/failure tests. Simulated results do not close this item. Excluding transcription or changing providers requires explicit scope/decision evidence.
- [ ] The selected translation/corpus usage has an authorized rights decision. Church-designated reviewers evaluate the consented benchmark against thresholds recorded **before** the evaluation; doctrine/quality sign-off and unresolved issues are explicit.

All common mandatory gate rules and prior required regressions also apply. A future automated runner pass does not replace an item absent from its suite or any required external/human proof.

## Known blockers and missing evidence

G1C prerequisite is unmet. Real authorized AI/transcription usage/failure evidence, corpus licensing, and church-reviewed benchmark with thresholds fixed before evaluation are absent. Audio malware/duration inspection must be implemented/provisioned rather than inferred from injected test inspectors. Chunk cancellation/retry/provenance, broader adversarial/multilingual injection and full browser adoption/undo coverage remain to demonstrate. Source review/rights booleans do not supply legal or doctrinal sign-off.

Owners: main/backend/frontend agents for missing implementation/test/operational artifacts; church/account/rights/privacy/accessibility reviewers for external decisions and sign-offs. See [development prerequisites](../../../docs/development.md#prerequisites-and-blockers) and [source-to-acceptance mapping](../../../docs/source-evidence.md). No capability is excluded from approved scope and no required gate is waived.

## Completion decision

**Not complete.** All required test/review checkboxes remain open until concrete command results, test IDs, UTC execution times, tested source/lockfile/migration fingerprint and actual reviewer/provider artifacts are recorded. Deployment/live messaging remain unauthorized. Independent research, provider preparation and test design may continue; unmet prerequisite gates still prevent dependent phase advancement.
