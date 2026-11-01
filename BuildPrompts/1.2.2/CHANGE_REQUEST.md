# Change Request 1.2.2

## Approved scope

- Let authorized pastors and contributors move a study from its current date.
- Provide a study-level date selector.
- Provide drag-and-drop from a calendar study card to an empty calendar date.
- Reject moves into dates that already contain a study in the same series.
- Explain that moving a study creates a new draft revision, renews approval, and cancels pending schedules.
- Preserve published snapshots when their source study is moved.

## Safety rule

Date uniqueness is enforced by the backend, not only by the browser. A collision returns a conflict and instructs the user to move the existing study first.

## Non-goals

- No automatic swapping of two studies.
- No silent reassignment of another contributor’s study.
- No changes to published snapshots.
