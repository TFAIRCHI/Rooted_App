# UX and Project Planning Notes

## UX recommendation

Use Calendar view as the default on the Calendar route because it answers “when are we publishing?” at a glance. Keep List view for operational scanning, assignee review, and dense status reading. Both views share the same selected-slot URL state, so changing views never loses the selected study.

Each forecasted date is a button, not a decorative cell. The selected date opens the existing plan/content detail workflow below the calendar. Color is paired with text and a legend so status is not communicated by color alone:

- Green: approved, scheduled, or published.
- Orange: started or awaiting approval.
- Red: no meaningful plan work started.

The month is derived from the first forecasted study date for the selected series. Empty dates remain visible to preserve a real calendar rhythm. The next iteration should add month navigation when series span multiple months.

## Project planning recommendation

Deliver this as a presentation-layer slice first: no schema or API changes are required because slots, plan aggregates, content aggregates, and approval statuses already exist. The implementation reuses `selectSlot`, existing URL parameters, `PlanEditor`, and `SlotSettings`.

Follow-up backlog:

1. Add previous/next month navigation and a “Today” control.
2. Add a multi-series filter when a church has overlapping series.
3. Add automated accessibility checks for keyboard calendar navigation and non-color status labels.
4. Add visual regression coverage at desktop and mobile widths.

## Acceptance criteria

- Calendar route exposes exactly List view and Calendar view controls.
- List view preserves the existing forecasted-study list.
- Calendar view displays a true seven-column month grid.
- Forecasted dates are clickable and open the existing study details.
- Approved, pending, and not-started states are visually distinct and text-labelled.
- No visible application surface says Gather.
