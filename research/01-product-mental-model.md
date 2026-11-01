# Product mental model

**Needed:** A shared vocabulary that separates teaching intent, approved words, and delivery. A single “AI devotional” object obscures who authorized what. **Recommendation:** Use the following domain objects; names are proposed, not vendor schemas.

| Object | Ownership, independence, and versioning |
|---|---|
| Church / tenant | Owns settings, roles, content, source assets, consent, and integrations. A human account may join several churches through separate memberships. |
| Sermon | Tenant-owned source event: title, speaker, preached date, passages, assets. Metadata and transcript corrections are versioned; a replacement does not silently alter studies. |
| Weekly series | Editorial grouping with title, week anchor, timezone default, and one or more sermon links. Can exist without a sermon while staff plan ahead. Not the same as a long-running sermon series in an external system. |
| Dated study slot | Calendar date, publication wall time, IANA zone, assigned contributors, display order. Can be created without content. Calendar intent is snapshotted in plan revisions: a date/time/zone change creates a new plan revision, invalidates future dependencies and requires renewed approval; it never rewrites published study bytes. Assignee-only changes are audited permission updates. |
| Study plan | One per slot initially, with extensible typed fields. Has immutable revisions and an independent review workflow. |
| Approved plan revision | Exact revision/hash, approver, timestamp, policy version. Historical approval remains evidence even when a later revision is unapproved. |
| Study content | Separate aggregate linked to the approved plan revision used to draft it. Contains reflection, discussion, application, Scripture references, and approved presentation fields. |
| Approved study revision | Exact member-facing title/body/passages and any separately approved SMS preview. An approved plan alone does not authorize member publication. |
| Publication occurrence | Slot + approved content revision + schedule version. Tracks UTC due instant, blockers, publication result. Independent of SMS delivery. |
| Engagement | Reactions, comments, reports, and moderation events attached to a stable study/publication identity, with optional content-revision context. |

## Example progression

Grace Community adds fictional sermon notes on John 6:60–69. A contributor creates the October 19–23 weekly series and three slots. Monday's plan objective is “Explain Peter's response in the context of disciples turning away.” The pastor requests a clearer distinction between difficulty and unbelief, then approves plan revision 3. The contributor explicitly chooses to draft the full study, manually or with AI. Content revision 2 is approved separately. Scheduling pins that revision for October 19 at 08:00 local (12:00 UTC under the example offset). Members read the published revision; discussion is enabled only if church policy and moderation staffing permit it.

These teaching statements are **illustrative interpretation**, not verified exegesis. A sermon transcript verifies that a speaker said something; it does not verify that the statement is doctrinally or historically correct.

## Independence and change propagation

Sermon corrections produce a “source updated” warning and an explicit re-ground/review action. New plan revisions do not mutate existing content. If an approved plan is superseded before publication, dependent content must be reviewed against the new plan and pending occurrences are blocked. An already published study retains its approved snapshot until an authorized correction is approved and published; urgent withdrawal can hide it immediately with audit evidence. Withdrawal is visibility control, not deletion of history.

A cancelled slot remains visible to staff with reason; it never deletes engagement records by cascade. Member-facing URLs remain stable across an approved correction and return a suitable withdrawn/unavailable page when hidden. A weekly series can be archived without deleting its sermons. A sermon can inform multiple series; provenance is many-to-many through explicit source references.

## Alternatives, dependencies, and questions

**Alternative:** One mutable document with an approval boolean. Rejected because approving then editing cannot preserve what the pastor reviewed. **Alternative:** Version the entire week atomically; attractive for simple review but blocks independent day assignments. **Recommendation:** Independent day aggregates with an optional week-level readiness view.

Dependencies: [revision integrity](11-collaboration-approval-and-versioning.md), [schema](06-data-model-and-tenant-isolation.md), [UX](05-ux-information-architecture.md). Risk: staff may interpret “plan approved” as “ready to publish”; show separate badges everywhere. **Unknown:** Whether churches require two approvers or forbid self-approval. Default to a separate approver; accommodate exceptional small-team policy only as an explicit, audited configuration.
