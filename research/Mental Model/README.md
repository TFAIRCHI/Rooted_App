# Rooted application mental models

These diagrams describe the application as implemented locally and the Azure deployment it is intended to use. They are a guide to how the pieces fit together, not proof that the full production deployment is live. Azure PostgreSQL is now Ready in Central US while support request [2610260040009884](../Azure%20Deployment%20Research/path-b-resume-plan.md) is open. The latest [controlled-attempt research](../Azure%20Deployment%20Research/postgresql-before-support-20261027.md) records the route used for the successful deployment; private connectivity and application acceptance remain pending.

The older research package contains proposals and assumptions from before implementation. For current behavior, use the linked code and the deployment handoff. Read the three models in order:

1. [Member experience](01-member-experience.md) — how a church member finds, reads, and responds to a published study.
2. [Contributor experience](02-contributor-experience.md) — how church staff create, review, approve, schedule, and publish study material.
3. [Infrastructure design](03-infrastructure-design.md) — how the browser, web app, API, worker, identity, AI, and database fit together.

Each page includes editable Mermaid source and a standalone SVG version of the same model. Mermaid is the source to edit; update its SVG alongside it when the diagram changes.

## What these diagrams mean

- **Member** and **contributor** are separate access journeys. A member reading session does not become a privileged session; contributor capabilities also require church membership authorization.
- **Human review controls publication.** AI can help prepare a proposal or draft; it cannot approve or publish it.
- **Azure is the deployment target.** The PostgreSQL server is confirmed Ready in Central US. The existing frontend remains in East US; the replacement application environment and private database connectivity still need completion.
- **Optional integrations are not assumed active.** SMS, transcription, Planning Center, and other providers appear only as possible future capabilities, not required live components.

