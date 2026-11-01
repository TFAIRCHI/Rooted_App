# Rooted — Master Build Prompt 1.1.4

Implement `CHANGE_REQUEST.md` against the completed 1.1.3 implementation. Preserve prior migrations and evidence. Use additive migrations only. Do not deploy or send live provider messages.

Required work:

1. Add a Settings-only church-name update contract requiring `settings:manage`, with validation, audit metadata, tenant isolation, and immediate workspace refresh.
2. Keep Rooted and “Growing Deeper Together” as product-level identity while displaying the editable church name as tenant identity.
3. Keep admin access to the existing logo/theme editor and render the active normalized logo in staff navigation and member brand surfaces.
4. Preserve fallback behavior for churches without a logo.
5. Add authorization, validation, browser, accessibility, and regression tests.

Stop only after the phase tracker and all relevant quality gates are updated with real evidence.
