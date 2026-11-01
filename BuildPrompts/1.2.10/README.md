# Rooted 1.2.10 — Church member home

**Status: Prepared for user review. Not approved for execution.** This version proposes a focused redesign of the church-member home after sign-in, using the supplied Figma Make design as its visual source of truth.

## Critical design-reference gate

The Figma link currently displays a sign-in prompt to this session rather than the design. Its actual frames and visual details have **not** been inspected. Nothing in this package claims the proposed screen layout matches Figma. Before coding, Phase 0 must obtain a publicly viewable preview or user-provided screenshots/export for desktop and mobile. If unavailable, stop before implementation and request access; do not guess the reference design.

## Review order

1. [Research and evidence](../../research/24-church-member-home-and-figma-reference.md).
2. [Member home UX specification](MEMBER_HOME_UX_SPEC.md).
3. [Master build prompt](MASTER_BUILD_PROMPT.md).
4. [Testing and acceptance gates](TESTING_GATES.md).
5. [Traceability](TRACEABILITY.md) and [phase tracker](PHASE_TRACKER.md).

## Proposed scope

- Adapt the authenticated church member's post-login landing page to the accessible Figma design.
- Keep the existing Rooted brand and the selected church's branding/theme.
- Show only current live studies the member is authorized to read.
- Preserve sign-in return behavior, member navigation, study reading, reactions, and allowed discussion.
- Add no reading-progress, saved-study, notification, or personal-analytics capability unless the accessible design explicitly requires it and the data/privacy contract is approved.

## Version and approval

Version **1.2.10** increments the build-request version. It is a proposal only; it does not authorize source changes, schema changes, migration, deployment, or sending notifications. No production application code was changed for this request.

**Approval requested:** approve this scoped prompt after reviewing the Figma-access blocker. If the design is not shareable, attach screenshots or export frames before implementation so execution can meet the requested fidelity.
