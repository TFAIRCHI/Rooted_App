# Rooted 1.2.11 — Demo testing gates

These are requirements for execution, not results. The live Azure gate is separate from fixture-based automated checks.

## Configuration and transport

- Source and compiled backend load root environment settings while preserving explicit environment overrides. Missing Azure settings disable the co-writer without breaking ordinary editing. Existing database/authentication settings remain intact.
- Root endpoint and `/openai/v1` base normalize to one `/openai/v1/responses` route. Malformed/unsupported paths fail safely; requests cannot redirect credentials to another host.
- Mocked Azure requests use `api-key`, `model: gpt-5.6-luna`, `store: false`, bounded output, supported reasoning, and no tools. Public OpenAI adapter tests continue to pass.
- Test completed text, structured proposals, refusal, incomplete output, malformed JSON, schema failure, timeout, 401/403, deployment 404, unsupported settings, and 429. Errors reveal no keys, headers, raw private prompts, or provider response bodies.

## Permissions, state, and billing

- Anonymous, member-only, CSRF-invalid, and non-`ai:use` requests are denied before inference. Contributors require the relevant study editing permission.
- With real restricted-role database access, Church A cannot read or submit Church B's conversation, study, source, file, job, proposal, or usage IDs. Repeat with a user belonging to both churches while one is selected.
- Switch churches/studies/days during an in-flight response. The result stays in its original scope and does not appear in the new panel. Revoke membership/source access during queued work and verify rejection.
- Concurrent duplicate sends create one accepted inference/reservation. Reusing an idempotency key with different input fails. Concurrency, daily caps, token budgets, and restarts do not allow bypass. An ambiguous timeout does not automatically retry or release all reserved usage as if inference never occurred.
- New/clear conversation excludes prior messages from subsequent prompts. Logout clears private browser state. Server conversation deletion/retention behavior is documented and tested.

## Sources, behavior, and study adoption

- Paste text or upload one valid `.txt`, inspect/confirm extracted text, then request themes and a follow-up question. No source content is transmitted merely because a filename was selected.
- Reject oversized, binary, unsupported, cross-church, and unreviewed drafting sources. Oversized model context is rejected before inference. An uploaded instruction to access another church cannot change scope.
- Weekly outlines use the actual chosen dates and source. Missing sources produce a helpful next step. Unsupported clip analysis explicitly requests a transcript.
- Selected-day proposals satisfy existing field/evidence validation. Saved and unsaved editor fields remain unchanged until explicit adoption. Draft or source revision changes invalidate stale proposals. Approved/published content cannot be silently rewritten.
- Review a small behavior sample: expand notes, ask a focused missing-context question, explain simply then moderately, and distinguish suggested Scripture from verified text. No fabricated tool use, credentials, pastoral identity, or automatic approval/publication.

## UI, regression, and live proof

- Test open/close/keyboard focus, working/error/retry states, duplicate-send prevention, narrow/mobile viewport, and the placement beside Live Preview. Compare the Live Preview before/after to confirm its rendering is preserved.
- Run backend/frontend typecheck, lint, build, focused unit/integration tests, and relevant study/approval/browser regressions using actual repository scripts. Use isolated test databases and mocked providers by default; do not overwrite development data.
- Run research document validation if research links/docs change. Check this package's links and record command results rather than claiming checks were run.
- With the local stack and Azure deployment, complete the at-most-three-request live sequence in the master prompt. Record date, model/deployment, request count, usage, sanitized request IDs/status, and UI evidence. Confirm a human can obtain a real answer, ask a contextual follow-up, review a draft proposal, and explicitly adopt it.
- Confirm no credentials in browser/network payloads, screenshots, tracked files, or evidence. Record genuine Azure/network/quota blockers with the live gate still open.

The final handoff must distinguish automated fixture results, live Azure results, and any remaining human behavior review. Do not claim complete production readiness from a local demo.
