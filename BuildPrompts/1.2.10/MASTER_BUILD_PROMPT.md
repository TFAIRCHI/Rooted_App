# Master Build Prompt — Rooted 1.2.10 Church Member Home

**Execution status: Awaiting user approval. Do not implement until the user explicitly approves this version.** When approved, execute only the scope and gates below. Preserve earlier version snapshots and source conventions.

## Objective

Recreate the **church member's post-login home experience** represented by the supplied [Figma Make design](https://www.figma.com/make/JLNGMpwbBeSv2XeIqPa9Zl/Login-screen-design?t=Aft13bJG0GPyTzaT-0), while preserving Rooted's church-scoped member authorization, published-study lifecycle, church-specific brand/theme, and study engagement behavior.

## Mandatory first action: resolve the design reference

1. Open the supplied Figma URL in a signed-in/authorized design-review environment and confirm the actual project/frame(s), including desktop and mobile variants and prototype interactions.
2. If the file still presents a sign-in wall, stop before editing application code. Ask the user to enable link viewing or provide desktop/mobile screenshots/export. Do not derive design from the name “Login screen design,” generic Figma templates, or the current Rooted styles.
3. Record the exact observed design evidence and map it in [MEMBER_HOME_UX_SPEC.md](MEMBER_HOME_UX_SPEC.md). Ask for clarification only if the file itself leaves a decision that materially changes scope.

## Required reading

Read [member-home research](../../research/24-church-member-home-and-figma-reference.md), [UX specification](MEMBER_HOME_UX_SPEC.md), [testing gates](TESTING_GATES.md), [traceability](TRACEABILITY.md), and scoped `AGENTS.md` instructions. Review current `./frontend` member route/layout/navigation, `publishedResource`, theme and publication APIs before changing code. Backend work is prohibited unless a demonstrated, approved contract gap requires it.

## Scope constraints

- Change the post-login member home, not contributor workflows or the church administration dashboard.
- Preserve the existing Rooted identity, church identity/theme, sign-in return path, navigation, sign-out, and study-detail route.
- Show only currently live publications the selected church and member are authorized to read.
- Reuse existing member/public read APIs and no-store session-aware server rendering. Do not introduce user-specific shared caching.
- Keep reactions and discussion subject to existing church policy and moderation. Never surface private moderation records or unpublished study material.
- Do not invent reading-progress, saved studies, announcement feeds, member analytics, push/email/SMS controls, or AI suggestions unless visible in the inspected Figma and separately supported by the existing contract. Document any scope change before implementation.
- Use one coherent church-logo/identity placement; reconcile existing header/banner duplication against the actual reference.
- Format study dates with a verified church IANA zone or canonical church-local date. Remove no existing security checks to make the design appear populated.
- No migration, provider integration, live notification, production deployment, or data mutation without explicit need and authorization.

## Work phases and gates

| Phase | Work | Exit/testing gate | Status |
|---|---|---|---|
| 0 — Reference and baseline | Resolve Figma access; capture desktop/mobile states; inspect routes, authorization, themes and study data; agree screen inventory and scope | Approved reference map exists; Figma blocker is cleared; baseline behavior and commands recorded. If blocked, stop without source changes. | Not started |
| 1 — Member home composition | Implement reference-matched member home using current published-study data; preserve church context and member-only boundaries | Signed-in member sees only authorized live studies; public policy still respected; sign-in return, study links, logout, empty/error states pass | Not started |
| 2 — Responsive and visual fidelity | Apply observed assets/tokens/type/layout; reconcile brand/logo; responsive keyboard/screen-reader behavior | Screenshot comparison against approved frames at mobile/tablet/desktop; no horizontal overflow or clipped primary actions; accessibility checks and human review recorded | Not started |
| 3 — End-to-end and handoff | Run focused and full regression suites; verify publication lifecycle and tenant isolation; document evidence | Every required test gate passes; phase tracker/evidence updated; no unresolved critical/high access, data-leak or navigation defects | Not started |

Each phase is complete only when all its criteria and evidence are recorded. A source-code change alone does not satisfy the gate. Do not mark Phase 0 complete without accessible design evidence.

## Implementation guidance

- Keep the existing Next.js App Router and current component/layout architecture; avoid a new frontend framework or new backend service.
- Keep server reads session-aware and uncached (`no-store`) for member-specific content; verify cache behavior in the actual route. [S75]
- Preserve the `public_church` boundary for public reading and church-membership authorization for member-only reading; withdrawn/deleted content remains absent from the live member feed.
- Treat the church slug and query/return parameters as untrusted. Resolve tenant membership on the server; never trust a client-selected church ID as authorization.
- Avoid layout shift, hydration-dependent identity flashes, and double logo rendering. Use accessible semantic HTML and image alternatives.
- Test both missing and very long church names, missing/replaced logo, empty feed, one publication, many publications, and temporary API failure.

## Final deliverables

- Implemented member-home changes in `./frontend`; backend changes only with approved contract evidence.
- Reference-to-implementation comparison screenshots for desktop/mobile.
- Updated tests, `PHASE_TRACKER.md`, and append-only `evidence/execution.md` with exact commands/results.
- Concise handoff distinguishing verified Figma matches, application behavior, open risks, and any intentionally deferred design features.

## Stop conditions

Stop and request user input if Figma is not accessible, design requires personal data the current app does not store, a reference interaction conflicts with church reading/privacy policy, or implementing it would broaden roles/authorization. Do not silently substitute a guessed design or build a new member data platform.
