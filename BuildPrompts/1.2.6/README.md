# Rooted Build Request 1.2.6 — Deliver Once Published

**Status:** Implemented and validated on 2026-10-20.

This request adds an explicit recovery path for an approved study whose timed publication window has passed. Contributors can choose **Deliver once published** to reuse the current approved revision, convert the pending recovery schedule to `manual_once`, and publish immediately through the existing publication worker.

- [Master build prompt](MASTER_BUILD_PROMPT.md)
- [Phase tracker](PHASE_TRACKER.md)

The action is auditable, requires publication permission, preserves revision and approval matching, and never automatically bypasses approval.
