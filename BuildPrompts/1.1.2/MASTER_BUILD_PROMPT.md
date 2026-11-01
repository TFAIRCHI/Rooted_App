# Rooted — Master Build Prompt 1.1.2

Implement this scoped change against the existing 1.1.1 implementation. Read `research/`, `BuildPrompts/1.1.1/`, `docs/`, `frontend/`, and `backend/` before editing. Do not deploy or send live messages.

## Required execution rule

Do not execute until the user explicitly approves build request **1.1.2**. On approval, record the exact authorization in a new phase tracker and preserve 1.1.1 evidence.

## Required work

1. Implement [CHANGE_REQUEST.md](CHANGE_REQUEST.md).
2. Keep `./frontend` and `./backend` as the two source workspaces.
3. Add additive migrations only; never rewrite historical migrations.
4. Preserve tenant isolation, immutable revisions, explicit AI adoption, moderation, consent, audit, and no-unapproved-publication invariants.
5. Add/update unit, integration, browser, accessibility-automation, migration, and authorization tests.
6. Update API contracts, data model, UX documentation, README, acceptance matrix, and architecture decisions.

## Required outcomes

- No normal journey presents separate plan approval and full-study approval buttons.
- A single pastor review decision targets the complete dated study package and immutable revision hash.
- Changes requested return the whole package to draft; editing an approved package invalidates scheduling and requires renewed review.
- Unapproved, stale, or changed packages cannot schedule, publish, or send.
- Rooted and “Growing Deeper Together” appear consistently in staff/member surfaces and metadata.
- Theme edits are tenant-scoped, permission-checked for pastor/contributor/admin, validated, audited, persisted, and rendered on staff/member surfaces.
- Foreign-tenant theme reads/writes and unauthorized theme changes are denied.

Stop after the testing gates pass or report every unmet gate honestly. Do not claim production readiness from local fixtures or provider stubs.
