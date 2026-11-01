# Delivery Test Matrix

This matrix is the release-blocking test plan. It is derived from the observed findings in `research/22-delivery-e2e-test-report.md` and the specialist reviews used to prepare this prompt.

| ID | Scenario | Required result |
|---|---|---|
| F-01 | Seed canonical identities | Anna, James, Riley, and Morgan exist in Grace; no legacy selector identity leaks |
| F-02 | Approver list | Only active contributors with `content:approve` appear |
| F-03 | Reset 10/20 fixture | One deterministic current revision; no live plan approval dependency |
| C-01 | Create complete study | Required fields save and reload |
| C-02 | Submit with approver | One action creates review request and enters `in_review` |
| C-03 | Submit without approver | UI blocks with actionable `approver_required`; no partial request |
| C-04 | Double submit/retry | One pending request and one notification |
| C-05 | Stale revision | `revision_not_current`; no review request |
| A-01 | Approve exact revision | Approval stores revision ID/hash and succeeds |
| A-02 | Request changes | Comment is visible; study returns to draft path |
| A-03 | Edit approved study | New draft revision requires new approval |
| P-01 | Future approval | Approved and scheduled; no early publication |
| P-02 | Past approval | Approved and immediately published; no due-window error |
| P-03 | Explicit publish before due | Immediate publication succeeds |
| P-04 | Explicit publish after due | Immediate publication succeeds and preserves original planned time |
| P-05 | Duplicate publish | Same publication and delivery records are reused |
| P-06 | Worker retry/race | One publication, one outbox event, retry-safe delivery |
| P-07 | Stale plan head | Approved study still publishes from immutable snapshot |
| P-08 | Revoked authority | Structured `publisher_permission_revoked`; no publication |
| M-01 | Member before publication | Study is hidden |
| M-02 | Member after publication | Study appears at `/c/grace` and detail route |
| M-03 | Member interactions | Reaction persists; discussion follows moderation policy |
| E-01 | Engagement list/detail | Same publication ID, revision ID, snapshot, and delivery status appear |
| E-02 | Engagement access | Members cannot access contributor engagement; cross-tenant IDs fail |
| R-01 | Full regression | Unit, integration, E2E, research, typecheck, lint, and build all pass |

## Canonical E2E

Use the real local identities: `anna.contributor` creates, `james.contributor` approves, `riley.member` reads, and `morgan.admin` verifies administration boundaries. Run against a clean database and a past-due study. Assert the complete chain:

```text
create → select approver → submit once → approve exact revision
→ immediate publication → member reads → member reacts
→ Study Engagement shows same publication → duplicate publish is harmless
```

External SMS/email/push providers are out of scope for local proof. Web publication must succeed and external delivery must be reported as disabled, not falsely reported as delivered.
