# Testing Gates — 1.1.2

## G1 — Unified study approval

- [ ] Existing 1.1.1 regression suite passes.
- [ ] Additive migration applies to empty and upgraded databases without historical checksum changes.
- [ ] Contributor edits plan and devotional fields in one dated workspace.
- [ ] Exactly one pastor review action requests changes or approves the complete immutable package.
- [ ] Approval hash binds plan/devotional fields, calendar, source provenance, and revision identity.
- [ ] Editing any approved field creates a new draft and cancels pending schedule/delivery work.
- [ ] Unapproved, stale, or changed packages cannot schedule, publish, or send.
- [ ] Browser tests cover draft, request changes, single approval, scheduling, member reading, conflict, reload, and offline recovery.

## G2 — Rooted identity and church themes

- [ ] Staff, member, onboarding, loading, metadata, and error surfaces use Rooted and the tagline.
- [ ] Pastor/contributor `theme:manage` and administrator `settings:manage` permissions are tested; members and foreign tenants are denied.
- [ ] Theme values are schema-validated, audited, tenant-isolated, persisted, and rendered.
- [ ] Light/dark/system rendering and contrast are tested at desktop and mobile widths.
- [ ] Accessibility automation passes; manual keyboard/focus/contrast review is recorded.

## Release gate

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test:unit`
- [ ] `npm run test:integration`
- [ ] `npm run test:e2e`
- [ ] `npm run build`
- [ ] `npm run test:research`
- [ ] No live provider, deployment, or real-message authorization is inferred.
