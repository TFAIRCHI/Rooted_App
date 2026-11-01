# Rooted 1.2.11 — Local execution evidence

Date: October 24, 2026. User authorized implementation of the build prompt. No Azure resources were created, no production deployment was performed, and no notifications were sent.

## Result and current gate

The floating assistant now calls the user's Azure `gpt-5.6-luna` deployment through authenticated backend endpoints. Real browser chat and a contextual follow-up completed successfully. The third live request, for a study draft, failed deterministic output validation and changed no study. That failed result is preserved in [live-demo.json](live-demo.json).

The Azure draft schema/instructions were subsequently tightened: exact field count, nonempty evidence per field, source/span enums, null dates for a selected-day draft, and bare Scripture-reference patterns. Existing deterministic validation remains enforced. The focused adapter/API checks passed after this change. **Live draft/adoption is still an open gate**, pending the user's explicit permission to extend the approved three-request verification allowance by one capped draft call.

## Implemented changes

- Normalized only the Azure entries in ignored root `.env`; retained credential values and unrelated database/auth settings. The supplied Foundry project URL became the same host's resource-root inference base. No secrets were displayed or copied into tracked artifacts.
- Added Azure v1 REST key authentication, strict HTTPS endpoint validation, redirect rejection, bounded output, no tools/provider fallback/automatic retry, `store: false`, and sanitized failure handling.
- Added contributor-private conversation/source/request tables with forced RLS and composite tenant ownership relationships, plus selected-date binding. Both additive migrations were applied to the local development database. Existing migrations were preserved.
- Added authenticated church/study endpoints with membership, `ai:use`, assigned-editor, CSRF/origin and revision checks. Request envelopes and idempotency records persist; source changes invalidate old proposals and reset context. Profile identity includes a content hash.
- Added database-atomic global/per-church daily allowances, one active inference per church, persistent monthly token reservation/reconciliation and conservative interrupted-request handling. Runtime cannot directly read/write the global numeric allowance table.
- Replaced placeholder panel replies, added confirmed pasted/UTF-8 `.txt` sources, read-only weekly outlines, selected-day proposals, explicit revision-aware adoption, source/permission failures, token usage, and retained input on error. Existing Live Preview rendering and stage navigation were preserved.
- Added the [runbook](../DEMO_RUNBOOK.md), opt-in live browser command, transport tests, restricted-role database integration test, and fixture-backed co-writer browser test. Other external integrations remain disabled in the development launcher.

The conversational path runs within authenticated HTTP requests; it does not add a hosted Azure agent service or depend on provider-worker polling. Reviewed panel transcripts use private co-writer source-version records because ordinary chat need not be attached to a shared sermon-library record. Adoption uses the existing `saveRevision` mechanism, records source hash/request/revision provenance in audit, and leaves approval/publication to humans.

## Validation performed

| Check | Result |
|---|---|
| Workspace type checking and payload contract check | Passed |
| Workspace lint and tooling lint | Passed |
| Frontend unit suite | 42 tests passed |
| Backend unit/integration-adapter suite | 32 tests passed |
| Full backend PostgreSQL integration suite | 52 tests passed |
| Focused co-writer API and adapter/provider tests after schema tightening | Passed |
| Production frontend/backend builds | Passed |
| Co-writer fixture browser test | Passed: source confirmation, explicit proposal adoption, unsaved-edit blocking, preview unchanged before adoption, mobile popup bounds |
| Broader existing browser suite | 7 passed, 4 failed; see details below |
| Live Azure calls | Two completed chats, one safely rejected draft; no edit/adoption occurred |

Later changes are checked with focused tests and recorded in this document before handoff; no result here claims a fixture was a live Azure response.

## Broader browser suite limitations

Saved summary: [browser-regression.json](browser-regression.json). These failures were outside the co-writer test and were not repaired by restoring user-removed UI:

1. Two older core browser tests wait for **Source & planning notes (optional)**, which the user explicitly had removed before this build.
2. The older 1.2.9 journey expects all three workflow-step list items and an approver control on the original screen. The current stage-by-stage workflow has a different layout.
3. The publication/member journey reports an accessibility violation on the member study page. This integration does not change that page; the saved failure contains its diagnostic detail.

The initial broad-suite launch also found a stale MyChurch test preview holding the Next development lock on port 3001. Its verified local Node processes were stopped, and the suite was rerun with an isolated test database. The existing local development stack was restarted on port 3000 with co-writer-only Azure enabled.

## Live usage and privacy

Successful chat requests used **335 input / 73 output tokens** and **429 input / 43 output tokens**. The invalid draft's actual usage was not retained by the original failing validation path; its full 13,500-token reservation was conservatively charged against the application allowance. This is not a claim that Azure billed 13,500 tokens for that response.

The verification creates a separate synthetic study on November 2, 2026, with fictional notes and no member data. Existing studies were not edited by the verification. The study ID and request IDs are recorded in the live JSON; neither resource credentials nor private real church text appear in evidence.

Conversations have seven-day access and lazy content cleanup on the contributor's next conversation creation; there is no timed retention worker. Clear deletes conversation content and source versions while preserving numeric accounting/audit metadata. This remains a local demo, not a completed production-readiness or theological-quality audit.
