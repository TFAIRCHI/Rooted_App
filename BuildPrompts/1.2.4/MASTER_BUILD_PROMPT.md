# Rooted Build Prompt 1.2.4

Execute the approved role, navigation, approval-assignment, and branding simplification described in [`ROLE_NAVIGATION_RESEARCH.md`](ROLE_NAVIGATION_RESEARCH.md).

## Non-negotiable product behavior

1. The only product roles exposed to church users are **Church Member** and **Contributor**.
2. Church Members can access published studies only.
3. Contributors use four primary destinations: Dashboard, Calendar, Create a Study, and Settings.
4. A Contributor selects one eligible Contributor as approver for each study submission.
5. The approver reviews the exact immutable revision, comments on it, approves it, or requests changes.
6. The visible flow is Create Study → Gain Approval → Publish Study.
7. Published studies become available to members immediately after publication; notification channels deliver asynchronously at the scheduled time.
8. No user-facing member or contributor page may display Gather.

## Implementation requirements

- Replace source Gather labels; do not rely only on CSS or runtime replacement.
- Preserve tenant isolation, authorization, audit events, immutable revisions, optimistic locking, and publication safeguards.
- Introduce an approval-request model or equivalent revision-bound assignment that supports approver selection, comments, reassignment, withdrawal, and change requests.
- Preserve internal capability checks during migration; product-role simplification must not silently grant privacy, provider, ownership, or destructive permissions.
- Consolidate staff routes while retaining safe redirects/deep-link compatibility for existing URLs.
- Move sermons/source capture into Create a Study, delivery and provider controls into Settings, and review into the selected study detail.
- Keep Calendar List and Calendar views, including date reassignment and collision protection.
- Provide a clear three-step progress indicator and one next action on Dashboard, Calendar, and Create a Study.
- Add browser coverage asserting no visible Gather text on member and contributor routes.

## Testing gate

Every phase must pass its own gate before the next phase begins. Final completion requires:

- `npm run typecheck`
- `npm run lint`
- `npm run test:unit`
- `npm run build`
- Targeted E2E coverage for member route isolation, contributor navigation, approver selection, comment/change-request flow, approval-bound revision integrity, publication availability, notification queue separation, and visible-brand scanning.

Do not mark the build complete if a Church Member can access a staff route, a study can be submitted without an approver, a revision can be approved after it changes, or Gather appears in visible UI text.
