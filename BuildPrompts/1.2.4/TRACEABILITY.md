# Build Request 1.2.4 Traceability

| Requirement | Research section | Planned implementation area | Verification |
|---|---|---|---|
| Remove Gather from member experience | Role research §2, §8 | Member pages, shared branding, visible-text scan | Member and contributor E2E scan |
| Two product roles | Role research §3 | Membership/invitation UI, route authorization, capability migration | Role matrix/API/E2E |
| Member published studies only | Role research §3, §5 | Member route and staff route guards | Unauthorized-route E2E |
| Contributor selects approver | Role research §3, §6 | Approval request API and Create a Study UI | Unit/API/E2E |
| Comments and change requests | Role research §6 | Revision comments and approval request state | Revision-bound E2E |
| Four-item contributor nav | Role research §2, §5 | Workspace navigation and redirects | Navigation E2E |
| Three-step lifecycle | Role research §4 | Dashboard, Calendar, Create a Study, settings copy | UI assertions and usability checklist |
| Publish then notify later | Role research §7 | Publication and notification queue status | Worker/API tests |
| Preserve safeguards | Role research §8, §9 | Backend permissions, audit, revisions | Existing regression suite |
