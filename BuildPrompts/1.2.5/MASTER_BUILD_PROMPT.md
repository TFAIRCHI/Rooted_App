# Master Build Prompt — Rooted 1.2.5

Implement the Study Engagement workspace only after this prompt is approved.

## Product behavior

1. Add **Study Engagement** to the Contributor left navigation.
2. Keep Church Member navigation and routes unchanged; members must not see the new destination.
3. Show previously published studies for the active church, newest first, with pagination-ready structure.
4. Selecting a study opens an admin reading view that mirrors the member-facing published snapshot.
5. Show aggregate appreciation reactions for Thankful, Encouraged, and Praying.
6. Show discussion counts and moderation status. Only authorized moderators may read comment text and private report details.
7. Show publication, schedule, church-local time, and delivery/provider status without exposing recipient data.
8. Preserve tenant isolation, immutable publication snapshots, and existing moderation/editorial boundaries.

## Implementation guidance

- Reuse `publishedStudies`, `reactions`, `discussions`, `reports`, and `delivery` data.
- Add `engagement:read` capability and grant it to Contributors through the existing capability mapping.
- Add backend read routes under `/engagement/studies` with explicit church predicates and pagination validation.
- Add a focused frontend page/component; do not make the existing member page depend on contributor APIs.
- Add loading, empty, no-discussion, provider-unavailable, unauthorized, and server-error states.
- Use accessible headings, table/list semantics, keyboard navigation, visible focus, and color-independent status labels.

## Testing gate

Do not mark this request complete until all are true:

- Church Member cannot navigate to or fetch the engagement workspace.
- Contributor sees Study Engagement in the left navigation and can browse only their church’s published studies.
- Detail view matches the immutable published payload and does not expose draft or unapproved content.
- Reaction totals reconcile with persisted reactions, including zero and deleted-reaction cases.
- Discussion visibility follows `moderation:manage` and church discussion policy.
- Delivery/provider outage does not hide the study or engagement counts.
- Cross-tenant identifiers return 404/forbidden without data leakage.
- Typecheck, lint, frontend/backend unit tests, build, accessibility checks, and targeted browser tests pass.
- Update `PHASE_TRACKER.md` with command output and unresolved risks before declaring completion.

Do not implement analytics exports, sentiment analysis, new messaging providers, or member ranking in this phase.
