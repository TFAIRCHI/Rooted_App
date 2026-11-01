# Study Co-writer local demo

## Start and open

From the project root:

```powershell
npm run dev
```

The launcher starts the local PostgreSQL, identity service, backend, worker, and frontend, applying additive development migrations. The application is at **http://127.0.0.1:3000**. PostgreSQL can be stopped separately with `npm run db:stop`.

Use the existing fictional contributor login **anna.contributor** / **RootedDemo!2026A**. These are local demo credentials, not Azure credentials. Open Studies, select a date assigned to this contributor, and create or open an unpublished draft. Save any editor changes before requesting or adopting a suggestion.

The deployment is `gpt-5.6-luna`. Keep the real key in the ignored root `.env`, with valid `NAME=value` assignments:

```dotenv
AZURE_OPENAI_ENDPOINT=https://YOUR-RESOURCE.services.ai.azure.com
AZURE_OPENAI_API_KEY=YOUR_EXISTING_KEY
AZURE_OPENAI_DEPLOYMENT=gpt-5.6-luna
EXTERNAL_SERVICES_ENABLED=true
STUDY_COWRITER_ENABLED=true
STUDY_COWRITER_ONLY=true
```

Use your own Azure resource hostname. The endpoint must be the resource root or `/openai/v1` base, not a Foundry `/api/projects/...` URL. The actual request path is `/openai/v1/responses`. Restart the backend after configuration changes. Missing configuration disables co-writer inference without disabling normal editing.

The development launcher enforces co-writer-only mode: existing SMS, Planning Center, and transcription integrations remain disabled. The worker is still used for ordinary local application work; co-writer calls use the authenticated HTTP request path and do not require an additional hosted agent runtime.

## Try the assistant

1. Click the floating sparkle launcher. **Configured** means settings are present; **Connected · Azure** appears after a successful model reply.
   Use **Expand study co-writer** in the panel header for a wider, taller reading view, and **Restore co-writer size** to return to the original popup. Resizing preserves your messages and unfinished text.
2. Ask: “Explain the difference between trust and certainty in simple language.” Then ask: “Make your last explanation even simpler.”
3. Expand **Sermon transcript**, paste notes or attach one UTF-8 `.txt` file, review the text, confirm permission to use it, and click **Confirm transcript**. This saves reviewed text privately; it does not send a model request yet.
4. Select **Weekly outline** to produce a read-only outline using the study's scheduled week dates. It does not write into other days.
5. Select **Selected-day draft proposal** or the matching quick action. Review the proposed fields and warnings. The saved study and Live Preview remain unchanged until **Adopt proposal into saved draft** is clicked.
6. Adopt only after saving/resolving local edits. Adoption creates a new draft revision. Approval and publication still require the existing human workflow.

Use synthetic notes for the demo, for example:

> Fictional sermon notes: John 6:68. Trust can coexist with honest questions. Encourage members to name one question and take one small faithful action this week. This is not a Scripture quotation.

Audio, video, PDF, DOCX, and image analysis are not connected in this demo. Clip analysis requests should use a transcript. Scripture references remain suggestions for verification; there is no Bible lookup or browsing tool.

## Limits and privacy

- One active request per church; 30 requests per church and 100 total per UTC day. Limits are stored in PostgreSQL and survive application restarts.
- At most 12,000 conservatively estimated input tokens / 1,500 billable output tokens per call, with stricter draft limits. No automatic inference retries or paid tools.
- Initial per-church token allowance: 200,000/month, capped by any lower existing provider budget. Requests reserve 13,500 tokens and reconcile actual usage when available. Failed/ambiguous calls are charged conservatively against the allowance. These are application token limits, not a guaranteed Azure dollar cap.
- Conversations and confirmed transcript versions are private to the contributor, church, and study/day. Changing churches or studies mounts a separate panel. A newly confirmed transcript resets server conversation history so old source context is not carried forward.
- Closing the popup hides it and preserves the current in-memory panel. Reloading starts a new panel; this demo has no conversation-history browser. The server retains existing conversations for follow-up requests within seven days of creation, then denies access. Expired private content is scrubbed lazily when that contributor next creates a conversation. This is not a guaranteed timed deletion job.
- The clear-conversation control removes that conversation's text, transcript versions, and generated results. Numeric usage and audit metadata remain. Copies already adopted into a saved study are governed by the study's existing revision retention. Database backups can retain prior copies until their retention expires.
- `store: false` avoids optional provider response history; it does not promise zero retention across Azure monitoring or application backups. No raw private prompts or keys are written to general logs.

For a safe reset, clear the panel and start another conversation. Do not delete usage rows to bypass daily limits. The monthly allowance rolls over only after outstanding reservations are reconciled; interrupted calls are conservatively reconciled on the next attempted request after two minutes.

## Verification commands

Normal automated checks use mocked providers and isolated test databases:

```powershell
npm run typecheck
npm run lint
npm run test:unit --workspaces
npm run test:integration
npm run build
npx playwright test frontend/e2e/cowriter.spec.ts
```

The browser test intercepts model replies as fixtures and explicitly does not prove Azure connectivity. The integration test exercises real PostgreSQL permissions, accounting, source ownership, and revision adoption with a mocked model transport.

Explicit live verification, using the running local app and only synthetic text:

```powershell
node backend/scripts/cowriter-demo.mjs --run-live
```

This command enforces a persisted three-request verification allowance. It creates a separate local synthetic study, checks chat/follow-up/proposal, verifies no edit before adoption, adopts explicitly, checks church isolation, and captures desktop/mobile screenshots under `evidence/`. It never reads Azure keys into the browser. Once the allowance is consumed, inspect the saved report rather than rerunning it. The optional `--repair-draft-once` flag permits one additional draft call only when the user explicitly authorizes extending that allowance; it does not replay the chats.

Use [execution evidence](evidence/execution.md) and [live verification JSON](evidence/live-demo.json) for actual results and limitations. A configured key or passing fixture is not a live demo pass.
