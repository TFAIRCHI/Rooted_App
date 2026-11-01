# Research artifact validation

Snapshot: **2026-10-18**. This report separates local artifact checks from future production, stakeholder, security and integration acceptance. No real accounts were connected, no messages were sent, and no production application was scaffolded or deployed.

## Checks and evidence

| Check | Status / evidence |
|---|---|
| Required research chapters 00–21, index and source register | **Passed:** required files exist; package validator checked34 Markdown files and their relative links/anchors |
| Evidence register | **Passed:**48 source definitions and119 inline references checked; titles, URLs, access dates, confidence and caveats recorded; three parallel evidence tracks reconciled |
| Mermaid sources | **Passed:** all eight exact required sources parsed and rendered in headless Chrome; reproducible SVG outputs in [rendered diagrams](diagrams/rendered/) |
| Representative SQL | **Passed:** 22 checks using PostgreSQL18.6/PGlite0.5.10, including24/24 tables with forced RLS, two tenant chains, transaction-local context reset, hashes, immutable revisions/approvals and duplicate-publication rejection; reproducible runner/report listed below |
| Mockup source and screenshots | **Passed:** all14 exact PNG filenames at `mockups/` root, checked PNG signatures/dimensions;81 capture/workflow checks and18 independent bounded UI audits passed with zero reported errors. Member views are390×844; SMS is1440×1200 to show the scheduling gate; other desktop captures are1440×1050 |
| Production behavior | **Unknown / not implemented**; future acceptance criteria are [21](21-acceptance-criteria-and-test-scenarios.md) |

The authoritative machine-readable results are [package results](tools/validation-results.json), [schema results](tools/schema-validation.json), and [mockup checks](mockups/validation.json). The full package run passed with zero errors. A result with `passed:false` indicates an incomplete/failed check and is never a pass. Intermediate findings were corrected and the document-only/diagram-only reports refreshed. The mockup report lists each actual screenshot and named check; schema evidence includes engine versions and source/script hashes.

Representative initial/selected-day, blank/manual, proposed-plan, mobile-reading, discussion, SMS and settings PNGs were visually inspected. Screenshot pixels and DOM checks do not prove complete usability/accessibility or production behavior.

## Reproduce

From repository root, using installed Node and Chrome:

```powershell
npm ci --prefix research/tools --registry=https://registry.npmjs.org
node research/mockups/source/capture.mjs
node research/tools/schema-check.mjs
npm run validate --prefix research/tools
```

The screenshot script uses installed Chrome rather than downloading a browser. The validator uses locked local Mermaid/browser packages, verifies relative links/anchors and source references, checks PNG signatures/dimensions, renders diagrams to SVG and audits bounded prototype interactions. See [tool instructions](tools/README.md) and [mockup instructions](mockups/README.md). Dependency installation requires network; later local rendering does not require external service credentials. Tool dependencies are research-only.

## Design consistency review

- Dates are October19/21/23,2026, M/W/F08:00 America/New_York (12:00UTC); the cadence and per-day times are configurable.
- Plan and content approval remain independent. Cancel-on-edit invalidates pending schedules and preserves historical approval/live published snapshots.
- Editorial calendar date/time/zone is bound in the plan revision; changing it requires renewed plan/dependent-content approval. Operational SMS deferral within an approved window is separate.
- Due-but-pending approval blocks permanently until explicit future reschedule. Only previously approved unchanged schedules qualify for the proposed15-minute outage catch-up.
- Publication and SMS outcomes are independent. Consent/quiet hours may delay or suppress08:00 notifications while the study publishes; no recipient timezone is inferred from church location.
- The common pilot envelope is20 churches/500 opted-in recipients each with a2,000-concurrent-reader burst; SLOs, RPO/RTO and costs remain stated assumptions/targets.
- [07](07-system-architecture.md) is canonical for aggregate API contracts. Member-facing “study” routes map to content/publication identities.

## Unexecuted external gates and limitations

**Blocked for live proof:** Planning Center entitlement/scopes/identity/event/transcript tests require a consenting church and registered OAuth app. SMS tests require a registered provider account, approved sender, consented test recipients and country/policy decisions. Translation corpus licensing needs a rights-holder determination. These are Phase0 prerequisites rather than fabricated successes.

**Unknown:** User usability/accessibility outcomes, doctrinal acceptance, provider delivery/reconciliation, deployed pool/role behavior, actual cloud pricing, load performance and disaster recovery. Browser automation does not establish WCAG conformance. PGlite structural tests do not establish production PostgreSQL provisioning or application workflow enforcement. Screenshots/fixtures are review artifacts with local demo state; they provide no secure authentication, real AI, server persistence or messaging.
