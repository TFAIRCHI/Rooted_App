# Rooted Build Request 1.2.5 — Study Engagement Workspace

**Status:** Implemented and validated on 2026-10-20.

This version adds a contributor-only **Study Engagement** destination to the left navigation. Contributors can browse previously published studies, open an admin reading view that mirrors the member experience, and inspect aggregate reactions, moderated comments, and delivery context without exposing unnecessary member identity.

- [Change request](CHANGE_REQUEST.md)
- [UX and product research](STUDY_ENGAGEMENT_RESEARCH.md)
- [Master build prompt](MASTER_BUILD_PROMPT.md)
- [Data and API contract](DATA_AND_API.md)
- [Traceability matrix](TRACEABILITY.md)
- [Phase tracker](PHASE_TRACKER.md)

Execution was approved and completed; production deployment remains out of scope.

Implementation includes the contributor Study Engagement route, published-study read projections, aggregate reactions, moderation-aware discussion visibility, delivery context, the `engagement:read` capability, and migration `013_engagement_read.sql`.
