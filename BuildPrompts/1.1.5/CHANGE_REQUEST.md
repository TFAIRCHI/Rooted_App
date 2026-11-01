# Change Request 1.1.5

## Problem

Users can become stranded on standalone pages such as theme settings. Mobile users can also lose access to the workspace sidebar. The account/user surface should not expose editing controls and should provide logout only, plus a safe route back to the workspace.

## Required behavior

- Theme settings provides `Return to workspace` and `Sign out` controls.
- Account page `/user` provides identity context, `Return to workspace`, and `Sign out`; it exposes no profile-editing fields.
- Workspace account identity links to `/user`.
- Existing role restrictions, CSRF, and logout behavior remain unchanged.
- Add browser coverage for both escape paths.
