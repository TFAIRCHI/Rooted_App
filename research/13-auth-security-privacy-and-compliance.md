# Authentication, security, privacy and compliance

Status: design recommendations requiring jurisdiction-specific review; this document does not establish legal compliance.

## What, why and recommendation

Use managed OIDC authentication, short-lived application sessions, server-verified tenant membership and capability-based authorization on every command and object lookup. Require MFA for church administration, doctrinal approval, publishing and platform operations. Membership removal revokes active access promptly; queued publication checks current authorization policy rather than relying only on an old browser session. Prevent CSRF for cookie sessions, use secure HttpOnly cookies, validate upload types and sizes, and keep source objects private behind short-lived authorized download links.

| Capability | Platform admin | Church admin | Author | Doctrinal approver | Publisher | Analyst / member |
| --- | --- | --- | --- | --- | --- | --- |
| Tenant billing / platform operations | Explicit operational scope | Own church billing | No | No | No | No |
| Manage church memberships | No routine access | Yes, own church | No | No | No | No |
| Read private sermons/plans/drafts | No automatic access | Explicit content-reader grant | Assigned church scope | Assigned review scope | Assigned publish scope | Analyst: aggregates only; member: published only |
| Create/edit draft revisions | No | Explicit author grant | Yes | Explicit author grant | Explicit author grant | No |
| Approve doctrine | No | Explicit approver grant | Only explicit approver grant and self-review policy | Yes, subject to separation policy | Explicit approver grant | No |
| Schedule / publish / withdraw | No | Explicit publisher grant | Explicit publisher grant | Explicit publisher grant | Yes, approved revisions only | No |
| Read identifiable engagement | No automatic access | Explicit privacy grant | No | No | No | Analyst: explicit privacy grant only |
| Export / erase personal data | Audited service workflow | Explicit privacy grant | No | No | No | Member: own request only |

Roles are bundles of explicit grants; membership administration must not permit silent self-elevation into approval. Sensitive grant changes require an authorized church policy owner and audit; bootstrap approver assignment is a separately reviewed onboarding step. Church admin is not a default doctrinal approver. Service accounts have narrow commands and cannot approve.

Platform support uses metadata by default. Break-glass content access requires an incident/ticket reason, named tenant scope, second authorized approval, MFA, a short expiry (proposed 30 minutes), immutable access logs and tenant notification unless a documented incident exception applies. Access uses a scoped identity subject to tenant boundaries, not shared BYPASSRLS credentials. Emergency availability needs an on-call approver, not a permanent bypass.

## Threats and controls

Tenant disclosure: FORCE RLS plus nonowner runtime, composite tenant FKs, transaction-local context, tenant-bound storage/cache/search and negative authorization tests. A database superuser still bypasses RLS; separate operational access and alert on privileged sessions. [S20](sources.md#s20)

AI injection and exfiltration: treat sermon transcripts, links and retrieved passages as data; never let them override system authorization or select arbitrary tenant resources. Restrict tools and egress, disallow model-initiated publish/approval, validate structured output, screen attachments and maintain provenance. Test indirect prompt injection in documents and retrieval. Filters are supplementary; isolate privileges even when the model follows malicious text. [S22](sources.md#s22)

Account/session attacks: rate-limit by identity and tenant, rotate credentials, verify webhook signatures and replay windows, restrict redirect URIs, and audit permission changes. Use a secrets manager; encrypt network traffic, databases, backups and private objects. Redact tokens, recipient addresses, prayer requests and draft bodies from logs. Store only opaque delivery recipient references in the representative schema; addresses belong in a separately protected consent/contact store.

Accessibility is part of safe review: target WCAG 2.2 AA with manual keyboard and screen-reader checks for authentication, timeout extension, revision diff and approval confirmation. Passing an automated scanner alone does not establish conformance. [S21](sources.md#s21)

## Privacy and staged retention

Treat religious affiliation and pastoral/private sermon material as highly sensitive product data. Do not ingest counseling notes, children's personal details or prayer requests into AI by default. Document purposes, processors/subprocessors, access, residency, deletion and export flows. Require separate channel consent and unsubscribe handling for outreach; select applicable legal requirements with counsel before launch. Analytics consent and communication consent are separate decisions.

The following periods are proposed defaults, not legal mandates. Start retention clocks at the named event, support approved holds with named owners and review dates, and publish tenant-facing configuration limits.

| Stage / class | Proposed retention and action |
| --- | --- |
| Pilot raw uploads/transcripts | 30 days after verified extraction or cancellation; retain a necessary source snapshot only with disclosed purpose |
| Pilot drafts/local recovery | Abandoned server drafts: 90 days after last edit; browser recovery: 24 hours and clear on sign-out |
| Approved/published revisions | Active church lifetime plus proposed 90-day export window after closure; personal data minimization still applies |
| Delivery operational metadata | 30 days after final outcome; retain suppression/consent evidence separately according to reviewed purpose |
| Identifiable engagement | Avoid at pilot; if enabled with consent, 30 days then aggregate/deidentify with small-cell suppression |
| Aggregated engagement | Proposed 13 months after event for seasonal comparison; test reidentification risk |
| Security/audit records | Proposed 12 months after event; pseudonymous actors where possible, restricted readers |
| Backups | Proposed 35-day rolling encrypted recovery window; deletion propagates as backups age out |

Before broader launch, review actual pilot usage and jurisdiction requirements; establish a data inventory, processor agreements, incident contacts and deletion evidence. Before enterprise/residency commitments, validate regional subprocessors and contractual retention. Do not imply a certification from this design.

Erasure workflow: verify requester and tenant authority, locate subject references, remove live/search/cache/contact data, purge or redact affected retained payloads through an audited privileged workflow, record a minimal suppression tombstone and propagate to providers. Immutable approval records cannot justify keeping unnecessary personal payloads forever. On restore, replay deletion/suppression records before reopening traffic. Backup erasure latency and lawful holds must be disclosed. Export must include revision/publication context without exposing other subjects or tenants.

## Alternatives, dependencies, risks and open questions

Alternatives: local password storage increases security burden; managed OIDC is recommended. Universal administrator access simplifies support but creates an unacceptable standing content privilege; use scoped break-glass. Fully anonymous analytics reduces privacy risk but cannot support individual follow-up; prefer aggregate measures first.

Dependencies: identity/MFA provider, church approval policy owner, consent service, KMS/secrets, deletion inventory, processor contracts and jurisdiction review. Risks: logs and exports becoming hidden copies, small-church aggregate reidentification, recovery reintroducing erased records and excessive approver grants.

Open questions: operating countries, minors policy, controller/processor allocation, consent basis for channels, retention exceptions, breach reporting timelines and who can approve church role escalation. Block identifiable engagement and production outreach until these are resolved.
