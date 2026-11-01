# Traceability Matrix

| Finding | Required solution | Build phase | Evidence |
|---|---|---|---|
| D1 hidden `approver_required` prerequisite | Atomic choose-approver-and-submit command and visible state | 2 | API + browser submit test |
| D2 no publication or engagement evidence | Canonical late delivery journey with member and engagement assertions | 3–4 | E2E publication/member/engagement test |
| D3 stale plan approval dependency | Immutable plan snapshot; remove publication-time plan gate; safe repair | 1 | migration, approval, and publication tests |
| D4 generic publication error | Structured failure codes and actionable recovery UI | 3–4 | API error contract and UI tests |
| D5 integration contract drift | Rewrite fixtures around one final approval and canonical identities | 5 | full integration suite |
| D6 worker/manual delivery ambiguity | Separate worker, late approval, explicit publish, and idempotency tests | 3 | delivery test matrix |
| Unapproved content visibility risk | Member/public queries require published snapshot | 1 and 4 | authorization and browser tests |
| Revision integrity risk | Approval and publication bind immutable revision IDs | 1–3 | stale-edit and concurrent mutation tests |
| Tenant isolation risk | Revalidate tenant on every command and engagement query | 1–5 | cross-tenant security tests |

## Source links

- Test evidence: `../../research/22-delivery-e2e-test-report.md`
- Scheduling policy: `../../research/12-scheduling-sms-and-notifications.md`
- Versioned approval context: `../../BuildPrompts/1.2.7/MASTER_BUILD_PROMPT.md`
