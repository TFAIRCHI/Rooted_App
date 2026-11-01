# Testing gates — public site and onboarding

These gates apply during implementation. **None are claimed passed by preparing this build package.** Prototype checks and prior co-writer evidence are reference material only.

## Gate 1 — Functional public experience

- Anonymous visits to `/`, `/get-started`, `/sign-in`, `/find-church` and `/sample-study` render usable pages without requiring private data or a session first. Existing authenticated dashboard and church deep links still work.
- Check navigation, every CTA/footer destination, both AI example tabs, Before/After Sunday tabs, FAQ controls and sample reflection. No placeholder `#` links pretending to complete signup or contact actions.
- Verify AI examples have no billable model calls, record writes or live-provider dependency. Public pages must not display private conversation/study content.
- Match the approved narrative, AI benefits and four safeguards. Check CBE attribution and qualifications against the research; no pricing, guaranteed outcomes or unimplemented integration claims.

## Gate 2 — Real identity and church setup

- Use the existing isolated local identity fixture for end-to-end verification without sending email. Test leader sign-in → correct onboarding intent → church creation → refreshed persisted membership → role-aware first steps. Test refresh/back and returning-user paths.
- Verify nonce/state/PKCE/session checks stay enforced. Failed, expired or replayed callback and sign-out have honest recovery paths. Arbitrary six-digit values and browser storage cannot authenticate.
- Verify safe continuation rejects external/protocol-relative destinations and cannot select an unauthorized tenant. If real provider email-code support is unavailable, prove the supported provider flow and document the exact deviation; do not mark production email verification passed.
- Test invalid/occupied slug, invalid timezone, missing session/CSRF and create-request uncertainty. The same idempotency key/payload returns one church; changed payload with the same key is rejected. Retrying after an uncertain response does not duplicate creation.
- First steps require membership and reflect actual capabilities. New administrators do not receive implicit AI/author/approver/publisher grants. Preserve tenant isolation and role separation.

## Gate 3 — Member and privacy boundaries

- Church-link input accepts only the supported safe forms and does not fetch arbitrary URLs. Existing church public-reading policy is honored; protected study routes remain protected.
- Invitation tests cover named recipient success and wrong identity, expired, revoked, already-used and changed inviter authority rejection. Member navigation does not create a church or grant extra rights.
- Cross-church first-step links cannot disclose data. Public metadata, logs, static HTML, sitemaps and assets contain no secrets, invitation tokens, real private records or conversation text.
- Preserve private/no-store and noindex headers on church pages. Public indexing metadata is environment-aware; development/test remains noindex and no absolute domain is invented.

## Gate 4 — Visual and accessibility review

Capture implemented pages at 1440px and 390px, with overflow checks at 320px. Include full homepage, both AI example states with safeguards, weekly rhythm, get started, actual sign-in flow, setup, first steps, member entry and sample devotional. Compare with [TRACEABILITY.md](TRACEABILITY.md). Explain intentional authentication differences.

Check keyboard navigation, visible focus, accessible tab state/arrow behavior, FAQ semantics, heading order, labels/error association, contrast, zoom, reduced motion and touch controls. Test the full page for horizontal overflow and clipped form errors. Use existing accessibility tooling plus manual review; a clean automated scan is not a complete accessibility audit.

Confirm the editorial illustrations remain readable on mobile and artwork has appropriate decorative/meaningful alternative-text treatment. Confirm research prototype CSS has not changed existing member/editor layouts.

## Gate 5 — Product regression and project checks

Use the existing project scripts, starting with focused tests and then required project checks:

```powershell
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
npm run build
npm run validate --prefix research/tools -- --documents-only
```

Inspect test-runner configuration before execution and use isolated test data. Never reset the user's development database or invoke live AI as a side effect of a test. Existing root-login tests may need their entry route updated to `/sign-in`; preserve the actual authentication assertions. Record exact commands, results and any inherited failures separately from regressions. Relevant new failures must be fixed before marking complete; do not erase assertions or restore user-removed features to make tests green.

Smoke-test the existing contributor editor, unchanged Live Preview, three-stage editorial navigation, church logo/banner and member Begin this study routes. Verify the co-writer's floating/expanded views, blank initial canvas, categorized menu, previous conversations, pinned chat composer and confirmation controls remain intact. Use deterministic fixtures/mocks for planning and per-day creation regressions; no paid replay of the user's saved conversation is needed.

## Gate 6 — Handoff

Create `evidence/execution.md` during execution with local URLs, changed files, test output summaries, screenshots, identity behavior, preserved boundaries and unresolved production launch prerequisites. Update every phase with real evidence and precise status. Do not treat unavailable commercial decisions or production credentials as completed work. Distinguish locally working onboarding from public deployment readiness.
