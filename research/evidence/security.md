# Security, accessibility, and publication evidence

Accessed: **2026-10-18**. These entries verify narrow statements in official documentation; they do not verify an implementation. Confidence describes source support, not application security or compliance. Design choices in the [review checklist](../review-checklist.md) are Recommendations inferred from this evidence.

## S20

- Title: 5.9. Row Security Policies
- Publisher: PostgreSQL Global Development Group; PostgreSQL 18 documentation.
- Exact URL: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Equivalent versioned URL: https://www.postgresql.org/docs/18/ddl-rowsecurity.html
- Accessed: 2026-10-18.
- Confidence: High; both official URLs accessed directly.
- Verified narrow claim: `/current` identifies PostgreSQL 18 at access time. Both pages document equivalent relevant behavior: superusers and `BYPASSRLS` roles bypass RLS; owners normally bypass it unless forced; `TRUNCATE` and `REFERENCES` are outside RLS. Referential-integrity checks bypass RLS, allowing constraint-based information leaks. Permissive policies combine with `OR`; policy subqueries can introduce concurrency races.
- Caveats: Equivalence is semantic for these rules, not a byte-for-byte comparison. `/current` can change. `FORCE ROW LEVEL SECURITY` does not constrain superusers or `BYPASSRLS`. This source does not establish isolation for storage, caches, search, or application credentials.

## S21

- Title: Web Content Accessibility Guidelines (WCAG) 2.2
- Publisher: W3C.
- Exact URL: https://www.w3.org/TR/WCAG22/
- Accessed: 2026-10-18.
- Confidence: High; official Recommendation accessed directly.
- Verified narrow claim: AA requires all applicable A and AA criteria across full pages and complete processes. Relevant additions include 2.4.11 Focus Not Obscured (Minimum), 2.5.7 Dragging Movements, 2.5.8 Target Size (Minimum), 3.3.7 Redundant Entry, and 3.3.8 Accessible Authentication (Minimum).
- Caveats: Target size is 24 by 24 CSS pixels with specified exceptions. Minimum focus visibility means not entirely obscured by author-created content. This standard does not establish jurisdiction-specific legal obligations or certify a particular UI. The accessed page identifies the 12 December 2024 Recommendation; its dated version is https://www.w3.org/TR/2024/REC-WCAG22-20241212/.

## S22

- Title: LLM Prompt Injection Prevention Cheat Sheet
- Publisher: OWASP Cheat Sheet Series.
- Exact URL: https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html
- Accessed: 2026-10-18.
- Confidence: High; this exact URL loaded the official cheat sheet, without substitution by the LLM Top 10 page.
- Verified narrow claim: External content can carry indirect injection. The guidance places permission checks and tool-argument validation outside the model, requires exact-action approval for consequential actions, and treats model outputs as untrusted at downstream destinations. Its testing guidance measures actual tool actions and disclosures separately from response text.
- Caveats: Filters, structured prompts, and guardrail models are defense layers, not complete prevention. A refusal does not undo an executed action. Illustrative smoke tests do not establish a population attack rate or prove security.

## S23

- Title: Transactional outbox pattern
- Publisher: AWS Prescriptive Guidance.
- Exact URL: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html
- Accessed: 2026-10-18.
- Confidence: High; official architecture guidance accessed directly.
- Verified narrow claim: Writing business data and its outbox entry in one transaction addresses database/message dual-write inconsistency. Relays process committed records. Duplicate events remain possible; consumers should be idempotent and event ordering preserved where required.
- Caveats: The pattern does not guarantee exactly-once external effects, provider acceptance, recipient delivery, or bounded latency. Consumer deduplication, ordering scope, retries, and timeout reconciliation require explicit implementation. Broker publication and user-visible publication are distinct states.

## S24

- Title: Time Zones
- Publisher: IANA.
- Exact URL: https://www.iana.org/time-zones
- Accessed: 2026-10-18.
- Confidence: High; official timezone database overview accessed directly.
- Verified narrow claim: The Time Zone Database records historical local-time rules and is updated for political changes to timezone boundaries, UTC offsets, and daylight-saving rules.
- Caveats: A named zone is not a permanently fixed offset. This overview does not choose recurrence, ambiguous-time, nonexistent-time, or missed-job behavior for an application. Installed runtimes can carry different database versions; verify the deployed version rather than assuming website currency implies runtime currency.

## S25

- Title: B.2. Handling of Invalid or Ambiguous Timestamps
- Publisher: PostgreSQL Global Development Group; PostgreSQL 18 documentation.
- Exact URL: https://www.postgresql.org/docs/18/datetime-invalid-input.html
- Accessed: 2026-10-18.
- Confidence: High; official versioned documentation accessed directly.
- Verified narrow claim: PostgreSQL accepts DST-gap and DST-overlap local timestamps instead of rejecting them. When inferring an offset, a gap uses the pre-transition offset and an overlap uses the post-transition offset; an explicit offset can select an interpretation.
- Caveats: Successful timestamp parsing does not validate the user's intended instant. This page does not define application scheduling or recurrence semantics. Rejecting gaps and requiring an overlap choice are proposed product policies, not PostgreSQL defaults. This entry does not support claims about retention of the original timezone by a timestamp type.

## S26

- Title: Evaluating Web Accessibility Overview
- Publisher: W3C Web Accessibility Initiative (WAI).
- Exact URL: https://www.w3.org/WAI/test-evaluate/
- Accessed: 2026-10-18.
- Confidence: High; official evaluation guidance accessed directly.
- Verified narrow claim: Accessibility should be evaluated during development. Tools help, but no tool alone can determine standards conformance; knowledgeable human evaluation is required.
- Caveats: An automated scan, clickable mockup, or generated report is not a conformance assessment. The overview supplies evaluation guidance, not evidence that this product meets WCAG. Record evaluated workflows, environments, manual findings, and unresolved issues.

## S27

- Title: SET
- Publisher: PostgreSQL Global Development Group; PostgreSQL 18 documentation.
- Exact URL: https://www.postgresql.org/docs/18/sql-set.html
- Accessed: 2026-10-18.
- Confidence: High; official versioned command documentation accessed directly.
- Verified narrow claim: `SET LOCAL` lasts until the current transaction ends; afterward the session-level value applies again. Outside a transaction block it warns and has no effect. Rolling back to an earlier savepoint also cancels the setting.
- Caveats: Transaction-local context is not authentication. The command's lifetime does not establish who may select a tenant. A pre-existing session value can return after commit or rollback, so pooling safety requires a clean session baseline and explicit transaction setup.

## S28

- Title: Locking objects with Object Lock
- Publisher: Amazon Simple Storage Service documentation.
- Exact URL: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- Accessed: 2026-10-18.
- Confidence: High; official service documentation accessed directly.
- Verified narrow claim: Compliance-mode retention prevents protected object versions from being overwritten or deleted by account users, including root, during retention; the retention period cannot be shortened. Governance mode permits specially authorized bypass.
- Caveats: Protection applies to object versions, not an application's mutable latest-version pointer. The documentation notes AWS-account deletion as an exception to early-deletion protection. Object Lock does not make database revision rows immutable, bind approvals, validate content, or select an appropriate retention period. Those controls and retention decisions remain separate design work.
