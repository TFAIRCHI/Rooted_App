# Local API contract v1

All paths below are canonical `/v1`; frontend proxies `/api/v1` to `/v1`. JSON dates are ISO strings, IDs UUIDs. Errors `{code,message,requestId,details?}`. All POST requests need `Idempotency-Key` (except auth); authenticated mutations also need `X-CSRF-Token` from session. Aggregate commands need `If-Match` (428 absent, 412 stale). GET/command aggregate responses include `ETag` header and `etag` field. Lists use `{items:[]}`. Workflow states are `draft`, `in_review`, `changes_requested`, `approved`, `scheduled`, `published`, `cancelled`; plans never scheduled/published.

## Authentication

`GET /auth/login?persona=contributor|pastor|admin|member` redirects through real local OIDC code+PKCE. Persona selection only works against local issuer in development. `GET /auth/callback`; `GET /auth/session` returns `{user:{id,displayName},churches:[{id,slug,name,timeZone,capabilities:string[]}],csrfToken}` or 401. `POST /auth/logout` destroys server session. Cookie HttpOnly SameSite=Lax path `/`. Backend origin 127.0.0.1:4000; issuer 127.0.0.1:4010; frontend callback defaults `http://127.0.0.1:3000/api/v1/auth/callback`. Staff return to `/dashboard`; ordinary members return to `/c/:slug`.

Church fixtures: Grace `10000000-0000-4000-8000-000000000001`, Riverside `10000000-0000-4000-8000-000000000002`. Users are stable subject strings `contributor`, `pastor`, `admin`, `member`. Contributor edits assigned slots; pastor reviews and has explicit publication grant; admin has membership/settings grants but no approval. All have Grace published reading membership. Only admin belongs to Riverside; contributor/pastor/member requests to Riverside return404. Grace series fixture `20000000-0000-4000-8000-000000000001`.

## Tenant endpoints

Prefix `/churches/:churchId`.

- `GET /workspace` → `{church,members,sermons,series,slots,plans,content,notifications,integrations}`. Arrays are normalized DTOs below, not nested database rows.
- `GET /members` → `{items:[{userId,displayName,capabilities}]}`.
- `GET /sermons`, `POST /sermons` body `{title,preachedDate,speaker,passages:string[],notes}` → sermon `{id,title,preachedDate,speaker,passages,notes,createdAt}`.
- `GET /series`, `POST /series` `{title,weekAnchor,timeZone,sermonIds:string[]}` → `{id,title,weekAnchor,timeZone,sermonIds}`.
- `GET /series/:id/slots`, `POST /series/:id/slots` `{localDate,localTime,timeZone,assigneeIds:string[]}` → slot `{id,seriesId,localDate,localTime,timeZone,assigneeIds,planId}`. Blank plan allocated immediately.
- `PUT /slots/:id` `{localDate,localTime,timeZone,assigneeIds}` uses the owning plan's `If-Match` and `series:manage` capability. Returns the new Draft plan aggregate and ETag. Calendar and assignment changes create an immutable calendar snapshot and invalidate dependent future readiness atomically.
- `GET /plans/:id`, `GET /content/:id` → aggregate `{id,kind,slotId,planId,status,version,etag,headRevisionId,head:{id,number,hash,authorId,payload,planApprovalId,createdAt},approvalId,livePublicationId,createdAt}`. `planId` null on plans; `slotId` exists on both.
- `GET /plans/:id/revisions`, `GET /content/:id/revisions` → `{items:[revisionDTO]}`.
- `POST /plans/:id/revisions` `{baseRevisionId,payload}` and content equivalent `{baseRevisionId,planApprovalId,payload}` → updated aggregate, 201. New revision resets draft and cancels future schedules.
- `POST /plans/:id/submit`, content equivalent `{revisionId}` → aggregate.
- `POST /plans/:id/decisions`, content equivalent `{revisionId,expectedHash,decision:"approve"|"request_changes",reason}` → aggregate, 201. `approvalId` identifies current approval. No self-approval.
- `POST /plans/:id/content` `{planApprovalId,mode:"manual"}` → content aggregate, 201. AI returns honest provider-unavailable.
- `GET /plans/:id/comments`, content equivalent → `{items:[{id,revisionId,authorId,body,fieldPath,mentionIds,createdAt}]}`.
- `POST /plans/:id/comments`, content equivalent `{revisionId,body,fieldPath?,mentionIds?:string[]}` → comment, 201.
- `POST /content/:id/schedules` `{revisionId,approvalId,localDate,localTime,timeZone,destinationId:"web",offsetChoice?}` → `{id,contentId,status,dueAt,localDate,localTime,timeZone,etag}`. Calendar must match the approved calendar and be in the future. `POST /content/:id/publish` `{revisionId,approvalId}` explicitly publishes the approved snapshot immediately, regardless of whether the planned calendar instant is future or past; it records the original calendar separately from the actual delivery time. Explicit publisher capability required.
- `GET /schedules`, `POST /schedules/:id/cancel` → schedule (If-Match owning content).
- `POST /content/:id/withdraw` `{reason}` → aggregate, removes live pointer only.
- `GET /notifications` → list; `POST /notifications/:id/read` marks own notification.
- `GET /settings`, `POST /settings` `{readingPolicy:"public"|"members",discussionsEnabled:boolean,timeZone?:string,appealContact?:string|null}`. Optional default-zone changes leave existing calendar snapshots unchanged.
- `GET /delivery` → `{items:[],providerStatus:"disabled",reason}` until authorized provider configured.
- `GET /audit` → list, restricted staff.
- `GET /studies` → only published snapshots; `GET /studies/:publicationId` → `{id,contentId,payload,publishedAt,churchId}`. `GET /public/churches/:slug/studies` and `/studies/:publicationId` only work for public policy.
- `PUT /studies/:publicationId/my-reaction` `{type:"thankful"|"encouraged"|"praying"|null}`.

Plan payload exact shape `{schemaVersion:1,title:"",primaryScripture:{reference:"",translation:null},learningObjective:"",outline:[],discussionQuestion:"",notes:"",extensions:[]}`. Calendar is server-bound in canonical revision envelope from slot; change via slot command requires new plan revision. Content payload `{schemaVersion:1,title:"",body:"",reflection:"",discussionQuestion:"",application:"",references:[],outboundPreview:""}`. Strings required for submission: plan title/scripture/objective/outline/question; content title/body/reflection/question/application. Draft can remain empty.

Approval and revision IDs are immutable. Head and live publication are independent. Canonical v2 revisions include `sourceSnapshot` with immutable source identities, source payload hashes and rights; content inherits the exact approved plan snapshot. Legacy v1 history is preserved without retroactive provenance claims. `contracts/payloads.ts` owns the payload Zod schemas and generated JSON Schema; the frontend consumes generated types.

Additional implemented contracts: [onboarding and explicit grants](ONBOARDING.md), [community and moderation](COMMUNITY.md), [privacy exports and reviewed cleanup](PRIVACY.md), [provider routes and gated activation](PROVIDERS.md). Provider state never claims credentials or review gates passed.
