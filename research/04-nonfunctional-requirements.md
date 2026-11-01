# Nonfunctional requirements

**Recommendation:** Adopt measurable quality targets before choosing hosting. These are initial design targets under the assumptions below, not observed service levels or contractual commitments.

**Assumption load envelope:** 20 pilot churches, 500 opted-in members each, three studies/church/week, 2–5 editors/church, and 2,000 concurrent readers during a publication burst. Load tests must revise these numbers with actual pilot telemetry. AI tasks and SMS are asynchronous and do not block reads or saves.

| Attribute | Initial target / verification | Why / alternative |
|---|---|---|
| Isolation | Zero cross-tenant read/write or asset retrieval in automated adversarial tests | Security invariant; separate databases provide stronger operational separation at higher cost |
| Approval integrity | Zero publication without active approval of exact revision and dependencies | Safety invariant, not a percentage SLO |
| Availability | 99.9% monthly published reading availability after pilot stabilization; planned maintenance counts and is also reported separately | Candidate target; lower-cost single-zone pilot must disclose weaker resilience |
| Read latency | p95 API <500ms; mobile LCP target <2.5s on defined midrange device/network profile | Cache only approved public snapshots; never use private shared caches |
| Editing | p95 save acknowledgment <1s under pilot load; debounced save ≤2s after idle; clear pending/error states | User perceives save certainty; explicitly manual saves remain available |
| Publication | p95 approved occurrences visible within 60s of due instant under healthy service | Queue lag monitored; provider/carrier delivery is measured separately |
| Durability | Managed database PITR with candidate RPO ≤15min, RTO ≤4h; restore drill proves it | Do not promise until backup/restore evidence exists |
| Accessibility | Complete core workflows target WCAG 2.2 AA; automated plus keyboard/screen-reader audit | Standard source [S21](sources.md#s21); tools alone cannot establish conformance [S26](sources.md#s26) |
| Mobile | 320px reflow through tablet and desktop; no horizontal scroll for member text; touch controls target 44px | Tablets retain context; calendar offers list alternative |
| Auditability | Every approval, role change, publication, moderation action and integration change attributable | Append-only application events with restricted retention/export |
| Maintainability | One codebase, typed contracts, migrations reviewed, independently restartable worker | Microservices defer until ownership or scaling requires them |
| Privacy | No sermons/discussion/phone numbers in normal logs; scoped deletion/export and retention | Store diagnostic IDs; restricted incident access only |
| Cost | Per-tenant AI/SMS caps and visible estimated segments; alerts at 70/90/100% budget | Disable optional generation/sending before runaway cost |

## Failure and degradation rules

AI unavailable: manual drafting continues; failed suggestions do not replace fields. Transcription unavailable: notes/manual transcript remain usable. Provider callback delayed: report “status pending,” not “delivered.” Planning Center disconnected: preserve previously imported source revisions, show stale sync and reconnection action. Offline editing: locally retain recoverable working copy with timestamp and tenant/user context, never display “server saved.” Database unavailable: public approved snapshots may serve from a deliberately permitted cache; private pages fail closed. SMS outage does not roll back published content or trigger repeated publication.

## Dependencies, risks, open questions

Dependencies: provider region/availability, verified deployment envelope, consented test data, restore permissions, licensed Scripture source, and real device tests. Risks: SLOs chosen before traffic data, indiscriminate CDN caching, accessibility blocked by rich-text controls. Alternative: managed BaaS speeds setup but still requires explicit isolation and permission tests. **Unknown:** required geography, data residency, church service-level expectations, support coverage, and allowable downtime on Sunday/Monday. [Operations](17-testing-observability-and-operations.md) defines measurement and incident ownership.
