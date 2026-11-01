# Mental model 2 — contributor experience

Contributors enter the church workspace through a privileged sign-in flow. The identity provider must satisfy MFA for a fresh contributor session, and the application then checks the person's active church membership and specific capabilities. MFA alone does not grant a role.

From the workspace, a contributor can manage sources and series, prepare a study plan, edit content, request review, approve a revision, and schedule an approved publication. The guided co-writer is an optional assistive workflow: it works from a reviewed source or explicitly reviewed conversation notes, asks for confirmation, and saves proposals as drafts. Human review, approval, and scheduling remain distinct steps. A changed source, plan, or content revision can invalidate dependent review or scheduling state.

## Journey

```mermaid
flowchart TD
    A[Open contributor workspace] --> B[Contributor sign-in with MFA]
    B --> C{Active church membership and capabilities?}
    C -- No --> D[Access denied or request the correct church role]
    C -- Yes --> E[Workspace: sources, series, calendar, drafts]
    E --> F[Choose source and create plan or guided workflow]
    F --> G{Use AI assistance?}
    G -- Optional --> H[Review source rights and teaching profile]
    H --> I[Confirm intended plan; AI proposes drafts]
    G -- Manual --> J[Write or edit plan and content]
    I --> K[Edit draft]
    J --> K
    K --> L[Submit revision for review]
    L --> M{Authorized human approves this revision?}
    M -- No --> N[Return for edits; prior approval does not transfer]
    N --> K
    M -- Yes --> O[Schedule approved revision]
    O --> P[Worker publishes at approved time]
    P --> Q[Published study becomes available under church access policy]
```

![Contributor experience flow](02-contributor-experience.svg)

## Review and publication rules

- Capabilities are checked per church and per operation; contributor access is not a global administrator grant.
- AI output is a draft or proposal. It does not approve, schedule, or publish itself.
- Plan review and content approval are separate; scheduling binds to the approved content revision.
- Edits after approval can invalidate the dependent approval/schedule. A timezone update does not silently move an already approved publication date.
- The continuous worker handles due publication/provider work and guided study workflow jobs. A one-off database migration job is operational setup, not a replacement for this worker.
- SMS, transcription, Planning Center, and other external providers are inactive unless separately configured and enabled.

## Implementation references

- [Workspace route](../../frontend/app/%5Broute%5D/page.tsx)
- [Workspace components](../../frontend/components/workspace.tsx)
- [Guided study co-writer](../../frontend/components/guided-study-cowriter.tsx)
- [Study workflow API](../../backend/src/api/study-workflow-routes.ts)
- [Study workflow module](../../backend/src/modules/study-workflows.ts)
- [Publication worker](../../backend/src/workers/worker.ts)

