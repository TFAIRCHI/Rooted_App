# Data and API Contract

## Read models

The first implementation should compose existing tables rather than duplicate engagement data:

- `publications` + `revisions`: published study snapshot and member-facing payload.
- `reactions`: one current reaction per church member and publication.
- `discussions`: member comments and moderation status.
- `reports`: private reports, visible only to moderation-authorized users.
- `delivery`: channel and provider status, without exposing recipient tokens.

## Proposed endpoints

```text
GET /v1/churches/:churchId/engagement/studies?cursor=&limit=20
GET /v1/churches/:churchId/engagement/studies/:publicationId
GET /v1/churches/:churchId/engagement/studies/:publicationId/comments
```

The list response should contain `{ items, nextCursor }`, where each item has `publicationId`, `title`, `publishedAt`, `scheduledAt`, `reactionTotals`, `discussionTotals`, and `deliverySummary`.

The detail response should contain `{ publication, reactions, discussions, delivery }`. `publication.payload` is the immutable published payload. Reaction totals are keyed by the existing reaction types. Discussion text is returned only when the requester has moderation permission; otherwise return counts and moderation status totals.

## Authorization rules

- Contributor with `engagement:read`: publication, aggregate reactions, aggregate discussion statuses, and non-sensitive delivery summary.
- Contributor with `moderation:manage`: approved/pending comment text and moderation state.
- Church Member: no engagement workspace endpoints; member routes continue to expose only their permitted published study experience.
- Platform administrators: access only through an explicitly audited support path, never by bypassing tenant predicates.

## Query and performance recommendations

Use indexed joins on `(church_id, publication_id)` and `(church_id, status, created_at)`. Paginate publications and comments. Cache only aggregate counts for a short period, keyed by church and publication. Do not cache user-specific reactions in a shared cache.

## Failure behavior

If delivery provider data is unavailable, show publication and engagement data with `delivery.status = unavailable`; never block the reading preview. If discussions are disabled, return zero visible comments plus the policy state. If the publication is not live in the requesting church, return 404 rather than revealing whether another church has the identifier.
