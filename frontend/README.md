# Rooted frontend

Next.js App Router, React, and TypeScript workspace `@gather/frontend`. The navy, cream, and teal editorial interface follows the research date-first flow. Application code lives in `app/`, `components/`, and `lib/`; this is the framework-native equivalent of the proposed `src/` layout.

## Run and verify

Use the root workspace install with Node 24. Run `npm run dev -w @gather/frontend` for `http://127.0.0.1:3000`, or use the root development command to start the complete local stack. The API must be available at `http://127.0.0.1:4000`, with the development OIDC issuer on port 4010. Use `127.0.0.1` consistently for session cookies.

Frontend commands: `dev`, `build`, `start`, `typecheck`, `lint`, and `test:unit`. All package versions are exact pins. The root owns dependency installation, lockfile, Playwright configuration, and `e2e/core.spec.ts`.

`BACKEND_URL` changes the server API origin for both Next rewrites and member server rendering. Browser requests use `/api/v1`, rewritten to the backend `/v1`. `GATHER_E2E=true` selects `.next-e2e` so the isolated browser stack can coexist with the ordinary development build. These settings do not bypass authentication or authorization.

## Routes and behavior

- `/dashboard`, `/sermons`, `/studies`, `/calendar`, `/reviews`, `/moderation`, `/delivery`, `/settings`, and `/onboarding` use actual backend endpoints. `/` opens the dashboard.
- `/studies?church={churchId}&series={seriesId}&slot={slotId}` restores the selected tenant, series, and date. Date selection precedes the editor. Creation offers exactly the two research-specified workflows.
- Plan and content autosave independently against aggregate ETags. Device copies are user/church/date scoped, expire after 24 hours, and are cleared on successful sign-out. Restoring an older base opens explicit base/mine/server comparison. Workflow commands drain pending saves and stop when their date unmounts. Ambiguous save retries retain their idempotency key.
- Plans remain optional supporting context. Contributors create and submit the member-facing study once; pastoral review, scheduling, publication, and member reading remain distinct backend operations. The backend decides permissions and valid transitions.
- `/c/{slug}` and `/c/{slug}/studies/{publicationId}` render published snapshots on the server, forwarding incoming cookies directly to the API. They use no database connection, no-store requests, generic metadata, and noindex headers. Authenticated reactions, moderated discussion, and private reports use the same API.
- Optional AI supports weekly outlines for the selected calendar, selected-day plans, field assistance, and explicitly requested full-study drafts after plan approval. It displays actual configuration, reviewed source evidence, provenance, stale-base warnings, and field comparisons. Generation never changes the editor. Explicit adoption creates a backend draft revision; undo creates another draft revision. Manual work remains available when providers are disabled.
- Delivery reads approved published preview bytes and real sender/contact/consent state. Scheduling confirms the exact preview hash and explicit recipients/expiry. Unknown zones remain held, suppression is visible, and recorded intents are never presented as carrier delivery.
- Settings support reading/discussion policy, default timezone, date-specific calendar changes, explicit membership roles and invitations, optional provider setup, and privacy review requests. Provider configuration and requested privacy actions are not claimed as live verification or completed deletion.

## Validation boundaries

Component tests cover blank manual fields, exactly two choices, save races, unmount protection, source-metadata preservation, stale recovery, expiration, tenant/user isolation, and eligible date assignment. Root browser tests own end-to-end authentication, author/reviewer separation, publishing, member rendering, and accessibility checks. Automated accessibility checks supplement, rather than replace, keyboard and assistive-technology review.

External OAuth, AI, transcription, and SMS require operator configuration and authorized live evidence. A disabled or unconfigured service is shown honestly. No external credentials are collected by the browser. Audio processing additionally depends on a trusted server media inspector. Church privacy administrators must review export and erasure requests; the UI only records and displays their actual request status.
