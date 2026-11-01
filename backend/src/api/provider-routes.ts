import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { authenticate, csrf } from '../auth/routes.js';
import { Database, requireCapability, type Membership } from '../infrastructure/database.js';
import type { config } from '../infrastructure/config.js';
import { ApiError, demand } from './errors.js';
import { idempotentCommand, type CommandResult } from './commands.js';
import { audit, loadAggregate, lockAggregate, matchVersion, requireEditor, type AggregateRow } from '../modules/editorial.js';
import { saveRevision } from '../modules/save-revision.js';
import { canonical } from '../modules/revisions.js';
import { decryptToken, encryptToken, fetchSource, IntegrationError, OpenAIResponsesAdapter, OpenAITranscriptionAdapter, parseTranscript, PlanningCenterAdapter, recipientSendWindow, smsSegments, TwilioAdapter, verifyPlanningCenterWebhook, verifyTwilioSignature, type AIProposal, type AIRequest, type OpenAIConfig, type PlanningCenterConfig, type TwilioConfig } from '../integrations/index.js';

type Settings = ReturnType<typeof config>;
interface ProviderJob {
  id: string;
  actor_id: string;
  kind: 'ai' | 'pco_sync' | 'pco_disconnect' | 'transcription';
  payload: unknown;
  reservation: number;
  budget_period: string;
}
interface AIJobInput extends Omit<AIRequest, 'sources' | 'budget'> {
  aggregateId: string;
  baseRevisionId: string;
  sourceIds: string[];
  reservedInputTokens: number;
  reservedOutputTokens: number;
  planContextRevisionId?: string;
}
interface TranscriptionJobInput {
  sermonId: string;
  filename: string;
  language?: string;
  rights: { confirmed: true; evidence: string };
  audioId: string;
  audioCiphertext: string;
  durationSeconds: number;
  reservedSeconds: number;
}
interface PCOEpisode {
  id?: string;
  attributes?: { title?: string; published_at?: string };
  relationships?: { channel?: { data?: { id: string } }; episode_channel?: { data?: { id: string } } };
}
export interface ProviderRuntime {
  enabled: boolean;
  encryptionKey?: string;
  openai?: OpenAIConfig;
  transcription?: OpenAIConfig;
  pco?: PlanningCenterConfig & { redirectUri: string; webhookSecret?: string };
  twilio?: TwilioConfig & { churchId: string; senderScope: string; activationApproved: boolean };
  allowedSourceHosts?: string[];
  inspectAudio?: (bytes: Uint8Array, filename: string) => Promise<{ scanPassed: boolean; durationSeconds: number }>;
}

export function providerRuntime(): ProviderRuntime {
  return {
    enabled: process.env.EXTERNAL_SERVICES_ENABLED === 'true' && process.env.STUDY_COWRITER_ONLY !== 'true', encryptionKey: process.env.PCO_TOKEN_ENCRYPTION_KEY,
    openai: { apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL },
    transcription: { apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_TRANSCRIPTION_MODEL },
    pco: { clientId: process.env.PCO_CLIENT_ID, clientSecret: process.env.PCO_CLIENT_SECRET, redirectUri: process.env.PCO_REDIRECT_URI ?? '', webhookSecret: process.env.PCO_WEBHOOK_SECRET },
    twilio: { accountSid: process.env.TWILIO_ACCOUNT_SID, authToken: process.env.TWILIO_AUTH_TOKEN, from: process.env.TWILIO_FROM, messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID, churchId: process.env.TWILIO_CHURCH_ID ?? '', senderScope: process.env.TWILIO_SENDER_SCOPE ?? '', activationApproved: process.env.TWILIO_ACTIVATION_APPROVED === 'true' },
    allowedSourceHosts: (process.env.SOURCE_ALLOWED_HOSTS ?? '').split(',').map(host => host.trim()).filter(Boolean),
  };
}

const uuid = z.string().uuid();
const rights = z.object({ confirmed: z.literal(true), evidence: z.string().min(8).max(2000) }).strict();
const digest = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const binding = (churchId: string, resource: string) => JSON.stringify([churchId, resource]);
function enabled(runtime: ProviderRuntime) { demand(runtime.enabled, 503, 'provider_disabled', 'External services are disabled'); }
function key(runtime: ProviderRuntime): string { demand(runtime.encryptionKey, 503, 'encryption_unavailable', 'Provider encryption is not configured'); return runtime.encryptionKey; }
function aiConfigured(runtime: ProviderRuntime) { enabled(runtime); demand(runtime.openai?.apiKey && runtime.openai.model, 503, 'provider_disabled', 'OpenAI is not configured'); }
function pcoConfigured(runtime: ProviderRuntime) { enabled(runtime); demand(runtime.pco?.clientId && runtime.pco.clientSecret && runtime.pco.redirectUri, 503, 'provider_disabled', 'Planning Center OAuth is not configured'); key(runtime); }
function smsConfigured(runtime: ProviderRuntime, churchId: string) { enabled(runtime); demand(runtime.twilio?.churchId === churchId && runtime.twilio.accountSid && runtime.twilio.authToken && runtime.twilio.senderScope && runtime.twilio.activationApproved, 503, 'provider_disabled', 'Twilio activation and tenant sender registry are not configured'); key(runtime); }
function decodeBase64(value: string, limit: number): Buffer {
  demand(value.length <= Math.ceil(limit / 3) * 4 && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value), 422, 'invalid_upload', 'Upload must use canonical bounded base64');
  const bytes = Buffer.from(value, 'base64');
  demand(bytes.length > 0 && bytes.length <= limit && bytes.toString('base64') === value, 422, 'invalid_upload', 'Upload is empty, invalid or too large');
  return bytes;
}

async function tenantTransaction<Result>(database: Database, churchId: string, action: (client: PoolClient) => Promise<Result>): Promise<Result> {
  const client = await database.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.church_id',$1,true)", [churchId]);
    const result = await action(client);
    await client.query('COMMIT');
    return result;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function storeSource(client: PoolClient, churchId: string, actorId: string, input: { sermonId: string; format: 'txt' | 'vtt' | 'srt'; bytes: Uint8Array; rights: { confirmed: true; evidence: string }; provenance: unknown }) {
  demand((await client.query('SELECT 1 FROM sermons WHERE church_id=$1 AND id=$2', [churchId, input.sermonId])).rowCount, 404, 'not_found', 'Sermon not found');
  const parsed = parseTranscript(input.bytes, input.format);
  const sourceId = randomUUID();
  await client.query('INSERT INTO sources(church_id,id,sermon_id,kind,rights,provenance,payload) VALUES($1,$2,$3,$4,$5,$6,$7)', [churchId, sourceId, input.sermonId, 'transcript_needs_review', JSON.stringify({ ...input.rights, attestedBy: actorId }), JSON.stringify(input.provenance), JSON.stringify(parsed)]);
  await audit(client, churchId, actorId, 'source.captured', sourceId, { sha256: parsed.sha256 });
  return { id: sourceId, sermonId: input.sermonId, ...parsed };
}

async function loadAISources(client: PoolClient, churchId: string, ids: string[]) {
  const result = await client.query(`SELECT sources.* FROM sources JOIN provider_source_reviews reviewed ON reviewed.church_id=sources.church_id AND reviewed.source_id=sources.id WHERE sources.church_id=$1 AND sources.id=ANY($2::uuid[])`, [churchId, ids]);
  demand(result.rows.length === ids.length, 422, 'source_not_reviewed', 'Each selected source must be tenant-owned and reviewed');
  return ids.map(id => {
    const source = result.rows.find(row => row.id === id)!;
    demand(source.rights.confirmed === true && Array.isArray(source.payload.spans) && source.payload.spans.length, 422, 'source_rights_required', 'Source rights and extracted spans are required');
    return { revisionId: id, spans: source.payload.spans.map((span: { id: string; text: string }) => ({ id: span.id, text: span.text })) };
  });
}

async function assertSourceDependencies(client: PoolClient, aggregate: AggregateRow, sourceIds: string[]) {
  if(aggregate.kind==='plan') {
    const selected=await client.query<{id:string}>('SELECT sources.id FROM sources JOIN series_sermons ON series_sermons.church_id=sources.church_id AND series_sermons.sermon_id=sources.sermon_id JOIN slots ON slots.church_id=series_sermons.church_id AND slots.series_id=series_sermons.series_id WHERE sources.church_id=$1 AND slots.id=$2 AND sources.id=ANY($3::uuid[])',[aggregate.church_id,aggregate.slot_id,sourceIds]);
    demand(sourceIds.every(id=>selected.rows.some(source=>source.id===id)),422,'source_dependency_mismatch','Sources must belong to this study source context');
    return;
  }
  const revision=(await client.query('SELECT source_snapshot FROM revisions WHERE church_id=$1 AND id=$2',[aggregate.church_id,aggregate.head_revision_id])).rows[0];
  const snapshot=(revision.source_snapshot??[]) as {id:string}[];
  demand(sourceIds.every(id=>snapshot.some(source=>source.id===id)),422,'source_dependency_mismatch','Sources must belong to the exact current draft source snapshot');
}

async function enqueue(client: PoolClient, churchId: string, actorId: string, kind: string, payload: unknown, reservation = 0, period?: string) {
  const id = randomUUID();
  await client.query('INSERT INTO provider_jobs(church_id,id,actor_id,kind,payload,reservation,budget_period) VALUES($1,$2,$3,$4,$5,$6,$7)', [churchId, id, actorId, kind, JSON.stringify(payload), reservation, period ?? null]);
  return { id, status: 'pending', kind };
}

export async function registerProviderRoutes(app: FastifyInstance, database: Database, settings: Settings, runtime: ProviderRuntime = providerRuntime()) {
  const prefix = '/v1/churches/:churchId/providers';
  async function read(request: FastifyRequest, capability: string, action: (client: PoolClient, member: Membership, churchId: string) => Promise<unknown>) {
    const churchId = uuid.parse((request.params as { churchId: string }).churchId);
    const session = await authenticate(database, request);
    return database.transaction(churchId, session.userId, async (client, member) => { requireCapability(member, capability); return action(client, member, churchId); });
  }
  async function command(request: FastifyRequest, reply: FastifyReply, capability: string, action: (client: PoolClient, member: Membership, churchId: string) => Promise<CommandResult>) {
    const session = await authenticate(database, request);
    csrf(request, session, settings.appOrigin);
    const churchId = uuid.parse((request.params as { churchId: string }).churchId);
    const result = await database.transaction(churchId, session.userId, async (client, member) => {
      requireCapability(member, capability);
      return idempotentCommand(client, request, churchId, session.userId, () => action(client, member, churchId));
    });
    if (result.etag) reply.header('ETag', result.etag);
    return reply.code(result.status).send(result.body);
  }

  app.get(`${prefix}/status`, request => read(request, 'workspace:read', async (client, _member, churchId) => ({
    externalServicesEnabled: runtime.enabled,
    openai: { configured: Boolean(runtime.enabled && runtime.openai?.apiKey && runtime.openai.model), liveVerified: false },
    transcription: { configured: Boolean(runtime.enabled && runtime.transcription?.apiKey && runtime.transcription.model && runtime.inspectAudio), liveVerified: false },
    twilio: { configured: Boolean(runtime.enabled && runtime.twilio?.churchId === churchId && runtime.twilio.activationApproved), liveVerified: false },
    connections: (await client.query('SELECT id,provider,status,organization_id,last_sync_at FROM provider_connections WHERE church_id=$1', [churchId])).rows,
    externalProof: 'blocked_until_authorized_evidence',
  })));

  app.post(`${prefix}/settings`, (request, reply) => command(request, reply, 'settings:manage', async (client, member, churchId) => {
    const input = z.object({ monthlyTokenLimit: z.number().int().min(1).max(100_000_000), profile: z.string().min(1).max(8000), profileVersion: z.string().min(1).max(100), rightsConfirmed: z.boolean(), smsSegmentLimit: z.number().int().min(0).max(1_000_000).default(0), transcriptionSecondLimit: z.number().int().min(0).max(1_000_000).default(0) }).strict().parse(request.body);
    await client.query(`INSERT INTO provider_budgets(church_id,monthly_limit,period,profile,profile_version,rights_confirmed,sms_segment_limit,transcription_second_limit) VALUES($1,$2,to_char(now(),'YYYY-MM'),$3,$4,$5,$6,$7) ON CONFLICT(church_id) DO UPDATE SET monthly_limit=$2,profile=$3,profile_version=$4,rights_confirmed=$5,sms_segment_limit=$6,transcription_second_limit=$7`, [churchId, input.monthlyTokenLimit, input.profile, input.profileVersion, input.rightsConfirmed, input.smsSegmentLimit, input.transcriptionSecondLimit]);
    await audit(client, churchId, member.userId, 'providers.settings_changed', churchId, { profileVersion: input.profileVersion });
    return { status: 200, body: { configured: true, liveVerified: false } };
  }));

  app.get(`${prefix}/sources`, request => read(request, 'workspace:read', async (client, _member, churchId) => ({ items: (await client.query(`SELECT sources.id,sources.sermon_id,sources.kind,sources.created_at,sources.payload,reviewed.source_id IS NOT NULL AS reviewed FROM sources LEFT JOIN provider_source_reviews reviewed ON reviewed.church_id=sources.church_id AND reviewed.source_id=sources.id WHERE sources.church_id=$1 ORDER BY sources.created_at DESC LIMIT 200`, [churchId])).rows })));

  app.post(`${prefix}/sources/uploads`, { bodyLimit: 2_800_000 }, (request, reply) => command(request, reply, 'sermons:create', async (client, member, churchId) => {
    const input = z.object({ sermonId: uuid, format: z.enum(['txt', 'vtt', 'srt']), contentBase64: z.string(), rights }).strict().parse(request.body);
    return { status: 201, body: await storeSource(client, churchId, member.userId, { ...input, bytes: decodeBase64(input.contentBase64, 2_000_000), provenance: { provider: 'manual_upload', originalSha256: digest(Buffer.from(input.contentBase64, 'base64')) } }) };
  }));

  app.post(`${prefix}/sources/url`, (request, reply) => command(request, reply, 'sermons:create', async (client, member, churchId) => {
    enabled(runtime);
    const input = z.object({ sermonId: uuid, url: z.string().url().max(2000), format: z.enum(['txt', 'vtt', 'srt']), rights }).strict().parse(request.body);
    const captured = await fetchSource(input.url, { allowedHosts: runtime.allowedSourceHosts ?? [] });
    return { status: 201, body: await storeSource(client, churchId, member.userId, { ...input, bytes: captured.bytes, provenance: { provider: 'authorized_url', host: new URL(input.url).hostname, originalSha256: captured.sha256 } }) };
  }));

  app.post(`${prefix}/sources/:sourceId/review`, (request, reply) => command(request, reply, 'sermons:create', async (client, member, churchId) => {
    const sourceId = uuid.parse((request.params as { sourceId: string }).sourceId);
    demand((await client.query('SELECT 1 FROM sources WHERE church_id=$1 AND id=$2', [churchId, sourceId])).rowCount, 404, 'not_found', 'Source not found');
    demand(z.object({ confirmed: z.literal(true) }).strict().parse(request.body).confirmed, 422, 'review_required', 'Explicit review is required');
    await client.query('INSERT INTO provider_source_reviews(church_id,source_id,actor_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [churchId, sourceId, member.userId]);
    return { status: 200, body: { sourceId, reviewed: true, scriptureVerified: false } };
  }));

  app.post(`${prefix}/ai/jobs`, (request, reply) => command(request, reply, 'ai:use', async (client, member, churchId) => {
    aiConfigured(runtime);
    const input = z.object({ aggregateId: uuid, baseRevisionId: uuid, workflow: z.enum(['week_outline', 'day_plan', 'field_assistance', 'study_draft', 'revision_help']), explicitAction: z.literal(true), task: z.string().min(1).max(2000), sourceIds: z.array(uuid).min(1).max(20), selectedField: z.enum(['title', 'body', 'primaryScripture', 'learningObjective', 'outline', 'discussionQuestion', 'notes', 'reflection', 'application', 'smsPreview']).optional(), dates: z.array(z.string().date()).max(7).optional(), reservedInputTokens: z.number().int().min(1).max(12_000), reservedOutputTokens: z.number().int().min(1).max(2000) }).strict().parse(request.body);
    demand(new Set(input.sourceIds).size === input.sourceIds.length, 422, 'invalid_sources', 'Source IDs must be unique');
    const locator=await loadAggregate(client,churchId,input.aggregateId);
    const aggregate = await lockAggregate(client, churchId, input.aggregateId,locator.kind);
    await requireEditor(client, aggregate, member);
    demand(aggregate.head_revision_id === input.baseRevisionId, 409, 'base_revision_changed', 'Proposal base revision is stale');
    await assertSourceDependencies(client, aggregate, input.sourceIds);
    demand(input.workflow !== 'study_draft' || aggregate.kind === 'content', 422, 'invalid_workflow', 'Full study drafting requires a content draft');
    const planContext = input.workflow === 'study_draft' ? await loadAggregate(client,churchId,aggregate.plan_id!,'plan') : null;
    await loadAISources(client, churchId, input.sourceIds);
    const budget = (await client.query('SELECT * FROM provider_budgets WHERE church_id=$1 FOR UPDATE', [churchId])).rows[0];
    demand(budget?.rights_confirmed, 422, 'rights_required', 'Church provider rights/profile setup is required');
    const period = (await client.query("SELECT to_char(now(),'YYYY-MM') AS period")).rows[0].period as string;
    demand(budget.period === period || budget.reserved_tokens === 0, 409, 'budget_rollover_pending', 'Reconcile prior-period reservations before rollover');
    if (budget.period !== period) { budget.charged_tokens = 0; budget.charged_sms_segments = 0; budget.charged_transcription_seconds = 0; }
    const reservation = input.reservedInputTokens + input.reservedOutputTokens;
    demand(budget.charged_tokens + budget.reserved_tokens + reservation <= budget.monthly_limit, 422, 'budget_exceeded', 'Tenant token budget is exhausted');
    await client.query('UPDATE provider_budgets SET period=$2,charged_tokens=$3,reserved_tokens=reserved_tokens+$4,charged_sms_segments=$5,charged_transcription_seconds=$6 WHERE church_id=$1', [churchId, period, budget.charged_tokens, reservation, budget.charged_sms_segments, budget.charged_transcription_seconds]);
    return { status: 202, body: await enqueue(client, churchId, member.userId, 'ai', { ...input, profileVersion: budget.profile_version, profile: budget.profile, planContextRevisionId: planContext?.head_revision_id }, reservation, period) };
  }));

  app.get(`${prefix}/jobs/:jobId`, request => read(request, 'workspace:read', async (client, member, churchId) => {
    const id = uuid.parse((request.params as { jobId: string }).jobId);
    const result = await client.query("SELECT id,kind,status,result,error_code,created_at,finished_at FROM provider_jobs WHERE church_id=$1 AND id=$2 AND (actor_id=$3 OR $4) AND (kind<>'ai' OR EXISTS(SELECT 1 FROM aggregates JOIN slots ON slots.church_id=aggregates.church_id AND slots.id=aggregates.slot_id WHERE aggregates.church_id=provider_jobs.church_id AND aggregates.id::text=provider_jobs.payload->>'aggregateId' AND slots.deleted_at IS NULL AND slots.withdrawn_at IS NULL))", [churchId, id, member.userId, member.capabilities.includes('settings:manage')]);
    demand(result.rowCount, 404, 'not_found', 'Job not found');
    return result.rows[0];
  }));
  app.get(`${prefix}/ai/proposals`, request => read(request, 'ai:use', async (client, member, churchId) => ({ items: (await client.query('SELECT proposals.* FROM provider_proposals proposals JOIN provider_jobs jobs ON jobs.church_id=proposals.church_id AND jobs.id=proposals.job_id JOIN aggregates ON aggregates.church_id=proposals.church_id AND aggregates.id=proposals.aggregate_id JOIN slots ON slots.church_id=aggregates.church_id AND slots.id=aggregates.slot_id WHERE proposals.church_id=$1 AND jobs.actor_id=$2 AND slots.deleted_at IS NULL AND slots.withdrawn_at IS NULL ORDER BY proposals.created_at DESC LIMIT 100', [churchId, member.userId])).rows })));

  app.post(`${prefix}/ai/proposals/:proposalId/adopt`, (request, reply) => command(request, reply, 'ai:use', async (client, member, churchId) => {
    const id = uuid.parse((request.params as { proposalId: string }).proposalId);
    const input = z.object({ fields: z.array(z.string()).min(1).max(10), confirmedReplacement: z.literal(true), date: z.string().date().optional() }).strict().parse(request.body);
    demand(new Set(input.fields).size === input.fields.length, 422, 'invalid_fields', 'Selected fields must be unique');
    const saved = (await client.query('SELECT * FROM provider_proposals WHERE church_id=$1 AND id=$2', [churchId, id])).rows[0];
    demand(saved, 404, 'not_found', 'Proposal not found');
    const proposal = saved.proposal as AIProposal;
    const selectedSources = await loadAISources(client, churchId, proposal.provenance.sources.map(source => source.revisionId));
    demand(selectedSources.every(source => proposal.provenance.sources.find(provenance => provenance.revisionId === source.revisionId)?.sha256 === digest(JSON.stringify(source.spans))), 409, 'source_revision_changed', 'Source bytes changed after proposal generation');
    const original = (await client.query('SELECT kind FROM aggregates WHERE church_id=$1 AND id=$2', [churchId, saved.aggregate_id])).rows[0];
    demand(original,404,'not_found','Study not found');
    const aggregate = await lockAggregate(client, churchId, saved.aggregate_id, original.kind);
    matchVersion(aggregate, request.headers['if-match']);
    await assertSourceDependencies(client, aggregate, proposal.provenance.sources.map(source => source.revisionId));
    demand(aggregate.head_revision_id === saved.base_revision_id, 409, 'base_revision_changed', 'The proposal is based on an older revision');
    const job=(await client.query('SELECT payload FROM provider_jobs WHERE church_id=$1 AND id=$2',[churchId,saved.job_id])).rows[0];
    if(job.payload.planContextRevisionId) {
      const plan=await loadAggregate(client,churchId,aggregate.plan_id!,'plan');
      demand(plan.head_revision_id===job.payload.planContextRevisionId,409,'plan_context_changed','Optional planning context changed; request a fresh suggestion');
    }
    const revision = (await client.query('SELECT * FROM revisions WHERE church_id=$1 AND id=$2', [churchId, aggregate.head_revision_id])).rows[0];
    const payload = structuredClone(revision.payload);
    const chosen = proposal.fields.filter(field => input.fields.includes(field.path) && field.date === (input.date ?? null));
    demand(chosen.length === input.fields.length, 422, 'invalid_fields', 'Choose fields from this proposal/date');
    if (input.date) demand(revision.calendar.localDate === input.date, 422, 'invalid_date', 'Adoption must match this plan date');
    for (const field of chosen) {
      if (aggregate.kind === 'plan' && field.path === 'primaryScripture') payload.primaryScripture = { ...payload.primaryScripture, reference: field.suggestion };
      else if (aggregate.kind === 'plan' && field.path === 'outline') payload.outline = field.suggestion.split('\n').map(value => value.trim()).filter(Boolean);
      else if (aggregate.kind === 'content' && field.path === 'smsPreview') payload.outboundPreview = field.suggestion;
      else { demand(Object.hasOwn(payload, field.path) && typeof payload[field.path] === 'string', 422, 'invalid_field', 'This proposal field does not map to this editor'); payload[field.path] = field.suggestion; }
    }
    const updated = await saveRevision(client, aggregate, member, { baseRevisionId: saved.base_revision_id, payload });
    await client.query('INSERT INTO provider_adoptions(church_id,id,proposal_id,revision_id,actor_id,fields) VALUES($1,$2,$3,$4,$5,$6)', [churchId, randomUUID(), id, updated.headRevisionId, member.userId, JSON.stringify(input.fields)]);
    await audit(client, churchId, member.userId, 'ai.proposal_adopted', id, { fields: input.fields, revisionId: updated.headRevisionId });
    return { status: 201, body: updated, etag: updated.etag };
  }));

  await registerPCORoutes(app, database, settings, runtime, prefix, command, read);
  await registerSMSRoutes(app, database, settings, runtime, prefix, command, read);
}

type Command = (request: FastifyRequest, reply: FastifyReply, capability: string, action: (client: PoolClient, member: Membership, churchId: string) => Promise<CommandResult>) => Promise<unknown>;
type Read = (request: FastifyRequest, capability: string, action: (client: PoolClient, member: Membership, churchId: string) => Promise<unknown>) => Promise<unknown>;

function pcoRedirect(runtime: ProviderRuntime, churchId: string) { return runtime.pco!.redirectUri.replace('{churchId}', churchId); }
function providerOrganization(value: unknown): string | undefined {
  const data = value as { data?: { relationships?: { organization?: { data?: { id?: string } } } } };
  return data?.data?.relationships?.organization?.data?.id;
}

async function registerPCORoutes(app: FastifyInstance, database: Database, settings: Settings, runtime: ProviderRuntime, prefix: string, command: Command, _read: Read) {
  app.post(`${prefix}/pco/oauth/start`, (request, reply) => command(request, reply, 'settings:manage', async (client, member, churchId) => {
    pcoConfigured(runtime);
    const input = z.object({ organizationId: z.string().min(1).max(100), channelIds: z.array(z.string().min(1).max(100)).min(1).max(30), episodeDates: z.record(z.string().max(100), z.string().date()).default({}), rights }).strict().parse(request.body);
    const connectionId = randomUUID();
    const flowId = randomUUID();
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(48).toString('base64url');
    const configValue = { channelIds: input.channelIds, episodeDates: input.episodeDates, rights: input.rights, attestedBy: member.userId, eventCatalog: [] };
    await client.query('INSERT INTO provider_connections(church_id,id,provider,owner_id,status,organization_id,config,webhook_ciphertext) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [churchId, connectionId, 'pco', member.userId, 'oauth_pending', input.organizationId, JSON.stringify(configValue), runtime.pco?.webhookSecret ? encryptToken(runtime.pco.webhookSecret, binding(churchId, connectionId), key(runtime)) : null]);
    await client.query("INSERT INTO provider_oauth_flows(church_id,id,connection_id,actor_id,state_hash,verifier_ciphertext,expires_at) VALUES($1,$2,$3,$4,$5,$6,now()+interval '10 minutes')", [churchId, flowId, connectionId, member.userId, digest(state), encryptToken(verifier, binding(churchId, flowId), key(runtime))]);
    const authorizationUrl = new PlanningCenterAdapter(runtime.pco).authorizationUrl({ state, codeVerifier: verifier, redirectUri: pcoRedirect(runtime, churchId) });
    return { status: 201, body: { connectionId, authorizationUrl, status: 'oauth_pending' } };
  }));

  app.get(`${prefix}/pco/oauth/callback`, async request => {
    pcoConfigured(runtime);
    const churchId = uuid.parse((request.params as { churchId: string }).churchId);
    const input = z.object({ state: z.string().min(32).max(200), code: z.string().min(1).max(2000) }).parse(request.query);
    const session = await authenticate(database, request);
    const flow = await database.transaction(churchId, session.userId, async (client, member) => {
      requireCapability(member, 'settings:manage');
      const result = await client.query('DELETE FROM provider_oauth_flows WHERE church_id=$1 AND actor_id=$2 AND state_hash=$3 AND expires_at>now() RETURNING *', [churchId, member.userId, digest(input.state)]);
      demand(result.rowCount, 401, 'invalid_oauth_state', 'OAuth flow expired, changed account, or was already used');
      return result.rows[0];
    });
    try {
      const tokens = await new PlanningCenterAdapter(runtime.pco).exchangeCode({ code: input.code, codeVerifier: decryptToken(flow.verifier_ciphertext, binding(churchId, flow.id), key(runtime)), redirectUri: pcoRedirect(runtime, churchId) });
      const adapter = new PlanningCenterAdapter({ ...runtime.pco, accessToken: tokens.accessToken });
      const identity = await adapter.read('/current/v2/me');
      const catalog = await adapter.availableEvents() as { data?: { attributes?: { name?: string } }[] };
      const eventCatalog = (catalog.data ?? []).map(event => event.attributes?.name).filter((name): name is string => typeof name === 'string' && name.startsWith('publishing.'));
      return database.transaction(churchId, session.userId, async (client, member) => {
        requireCapability(member, 'settings:manage');
        const connection = (await client.query('SELECT * FROM provider_connections WHERE church_id=$1 AND id=$2 FOR UPDATE', [churchId, flow.connection_id])).rows[0];
        demand(connection?.status === 'oauth_pending' && providerOrganization(identity) === connection.organization_id, 403, 'organization_mismatch', 'Planning Center identity must match the staff-confirmed organization');
        await client.query("UPDATE provider_connections SET status='authorized',tokens_ciphertext=$3,expires_at=now()+($4*interval '1 second'),config=config||$5::jsonb WHERE church_id=$1 AND id=$2", [churchId, connection.id, encryptToken(JSON.stringify(tokens), binding(churchId, connection.id), key(runtime)), tokens.expiresIn, JSON.stringify({ eventCatalog })]);
        await audit(client, churchId, member.userId, 'pco.oauth_authorized', connection.id);
        return { connectionId: connection.id, status: 'authorized', eventCatalog, nativeMemberSso: false, liveProofRecorded: false };
      });
    } catch (error) {
      await tenantTransaction(database, churchId, client => client.query("UPDATE provider_connections SET status='oauth_failed' WHERE church_id=$1 AND id=$2 AND status='oauth_pending'", [churchId, flow.connection_id]));
      throw error;
    }
  });

  app.post(`${prefix}/pco/connections/:connectionId/sync`, (request, reply) => command(request, reply, 'settings:manage', async (client, member, churchId) => {
    pcoConfigured(runtime);
    const id = uuid.parse((request.params as { connectionId: string }).connectionId);
    demand((await client.query("SELECT 1 FROM provider_connections WHERE church_id=$1 AND id=$2 AND provider='pco' AND status='authorized'", [churchId, id])).rowCount, 409, 'connection_not_ready', 'Authorize this connection first');
    const input = z.object({ episodeDates: z.record(z.string().max(100), z.string().date()).optional() }).strict().parse(request.body ?? {});
    if (input.episodeDates) await client.query("UPDATE provider_connections SET config=jsonb_set(config,'{episodeDates}',coalesce(config->'episodeDates','{}'::jsonb)||$3::jsonb) WHERE church_id=$1 AND id=$2", [churchId, id, JSON.stringify(input.episodeDates)]);
    return { status: 202, body: await enqueue(client, churchId, member.userId, 'pco_sync', { connectionId: id }) };
  }));

  app.post(`${prefix}/pco/connections/:connectionId/disconnect`, (request, reply) => command(request, reply, 'settings:manage', async (client, member, churchId) => {
    pcoConfigured(runtime);
    const id = uuid.parse((request.params as { connectionId: string }).connectionId);
    const result = await client.query("UPDATE provider_connections SET status='disconnect_pending' WHERE church_id=$1 AND id=$2 AND provider='pco' AND status='authorized' RETURNING id", [churchId, id]);
    demand(result.rowCount, 409, 'connection_not_ready', 'Connection is not active');
    await client.query("UPDATE provider_jobs SET status='cancelled' WHERE church_id=$1 AND kind='pco_sync' AND status='pending' AND payload->>'connectionId'=$2", [churchId, id]);
    return { status: 202, body: await enqueue(client, churchId, member.userId, 'pco_disconnect', { connectionId: id }) };
  }));

  app.post(`${prefix}/sources/transcription`, { bodyLimit: 34_000_000 }, (request, reply) => command(request, reply, 'sermons:create', async (client, member, churchId) => {
    enabled(runtime);
    demand(runtime.transcription?.apiKey && runtime.transcription.model && runtime.inspectAudio, 503, 'transcription_disabled', 'Transcription requires an explicitly configured provider and trusted media scanner/duration inspector');
    const input = z.object({ sermonId: uuid, filename: z.string().min(1).max(150), contentBase64: z.string(), explicitAction: z.literal(true), rights, language: z.string().regex(/^[a-z]{2}$/).optional() }).strict().parse(request.body);
    const bytes = decodeBase64(input.contentBase64, 25_000_000);
    const inspected = await runtime.inspectAudio(bytes, input.filename);
    demand(inspected.scanPassed && Number.isFinite(inspected.durationSeconds) && inspected.durationSeconds > 0 && inspected.durationSeconds <= 7200, 422, 'unsafe_audio', 'Audio must pass inspection and fit the two-hour duration cap');
    demand((await client.query('SELECT 1 FROM sermons WHERE church_id=$1 AND id=$2', [churchId, input.sermonId])).rowCount, 404, 'not_found', 'Sermon not found');
    const budget = (await client.query("SELECT * FROM provider_budgets WHERE church_id=$1 AND period=to_char(now(),'YYYY-MM') FOR UPDATE", [churchId])).rows[0];
    const seconds = Math.ceil(inspected.durationSeconds);
    demand(budget?.rights_confirmed && budget.charged_transcription_seconds + seconds <= budget.transcription_second_limit, 422, 'budget_exceeded', 'Transcription budget or rights setup is missing');
    await client.query('UPDATE provider_budgets SET charged_transcription_seconds=charged_transcription_seconds+$2 WHERE church_id=$1', [churchId, seconds]);
    const audioId = randomUUID();
    const payload = { sermonId: input.sermonId, filename: input.filename, language: input.language, rights: input.rights, audioId, audioCiphertext: encryptToken(input.contentBase64, binding(churchId, audioId), key(runtime)), durationSeconds: inspected.durationSeconds, reservedSeconds: seconds };
    return { status: 202, body: await enqueue(client, churchId, member.userId, 'transcription', payload) };
  }));

  await app.register(async callbacks => {
    callbacks.removeContentTypeParser('application/json');
    callbacks.addContentTypeParser('application/json', { parseAs: 'buffer', bodyLimit: 1_000_000 }, (_request, body, done) => done(null, body));
    callbacks.post('/v1/provider-callbacks/pco/:churchId/:connectionId', async request => {
      pcoConfigured(runtime);
      const params = z.object({ churchId: uuid, connectionId: uuid }).parse(request.params);
      const raw = request.body as Buffer;
      const signature = request.headers['x-pco-webhooks-authenticity'];
      demand(Buffer.isBuffer(raw) && typeof signature === 'string', 403, 'invalid_signature', 'Webhook authentication failed');
      return tenantTransaction(database, params.churchId, async client => {
        const connection = (await client.query("SELECT * FROM provider_connections WHERE church_id=$1 AND id=$2 AND provider='pco' AND status='authorized' FOR UPDATE", [params.churchId, params.connectionId])).rows[0];
        demand(connection?.webhook_ciphertext, 403, 'invalid_signature', 'Webhook authentication failed');
        const secret = decryptToken(connection.webhook_ciphertext, binding(params.churchId, connection.id), key(runtime));
        demand(verifyPlanningCenterWebhook(raw, signature, secret), 403, 'invalid_signature', 'Webhook authentication failed');
        const payload = z.object({ data: z.array(z.object({ id: z.string().min(1).max(200), attributes: z.object({ name: z.string() }), relationships: z.object({ organization: z.object({ data: z.object({ id: z.string() }) }) }) })).min(1).max(50) }).parse(JSON.parse(raw.toString('utf8')));
        let inserted = 0;
        for (const event of payload.data) {
          demand(connection.config.eventCatalog.includes(event.attributes.name) && event.relationships.organization.data.id === connection.organization_id, 403, 'webhook_scope_mismatch', 'Webhook event does not match discovered events and confirmed organization');
          const result = await client.query('INSERT INTO provider_webhook_inbox(church_id,id,connection_id,event_key,body_digest,payload) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [params.churchId, randomUUID(), connection.id, event.id, digest(raw), JSON.stringify({ eventName: event.attributes.name })]);
          inserted += result.rowCount ?? 0;
        }
        if (inserted) await enqueue(client, params.churchId, connection.owner_id, 'pco_sync', { connectionId: connection.id });
        return { accepted: true, newEvents: inserted };
      });
    });
  });
}

async function registerSMSRoutes(app: FastifyInstance, database: Database, settings: Settings, runtime: ProviderRuntime, prefix: string, command: Command, read: Read) {
  app.get(`${prefix}/contacts`, request => read(request, 'workspace:read', async (client, member, churchId) => {
    demand(member.capabilities.includes('settings:manage') || member.capabilities.includes('publication:schedule'), 403, 'forbidden', 'Audience access requires settings or publication capability');
    return {
    sender: { configured: Boolean(runtime.enabled && runtime.twilio?.churchId === churchId && runtime.twilio.activationApproved), scope: runtime.twilio?.churchId === churchId ? runtime.twilio.senderScope : null, liveVerified: false },
    items: (await client.query('SELECT id,user_id,zone,zone_source,sender_scope,consent_version,suppressed FROM provider_contacts WHERE church_id=$1 ORDER BY id LIMIT 1000', [churchId])).rows.map(contact => ({ id: contact.id, userId: contact.user_id, zone: contact.zone, zoneSource: contact.zone_source, senderScope: contact.sender_scope, consentVersion: contact.consent_version, suppressed: contact.suppressed, window: recipientSendWindow({ now: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400_000).toISOString(), zone: contact.zone }) })),
    };
  }));
  app.post(`${prefix}/twilio/connect`, (request, reply) => command(request, reply, 'settings:manage', async (client, member, churchId) => {
    smsConfigured(runtime, churchId);
    const existing = (await client.query("SELECT id FROM provider_connections WHERE church_id=$1 AND provider='twilio' AND status='configured'", [churchId])).rows[0];
    if (existing) return { status: 200, body: { connectionId: existing.id, status: 'configured', liveVerified: false } };
    const id = randomUUID();
    await client.query("INSERT INTO provider_connections(church_id,id,provider,owner_id,status,config) VALUES($1,$2,'twilio',$3,'configured',$4)", [churchId, id, member.userId, JSON.stringify({ senderScope: runtime.twilio!.senderScope, accountSid: runtime.twilio!.accountSid })]);
    return { status: 201, body: { connectionId: id, status: 'configured', liveVerified: false } };
  }));

  app.post(`${prefix}/contacts`, (request, reply) => command(request, reply, 'settings:manage', async (client, member, churchId) => {
    smsConfigured(runtime, churchId);
    const input = z.object({ userId: z.string().min(1).max(200), phone: z.string().regex(/^\+[1-9]\d{7,14}$/), zone: z.string().nullable(), zoneSource: z.string().min(3).max(200).nullable() }).strict().parse(request.body);
    if (input.zone) {
      demand(input.zoneSource, 422, 'zone_source_required', 'Known recipient zones need recorded evidence');
      demand(recipientSendWindow({ zone: input.zone, now: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400_000).toISOString() }).decision !== 'hold_unknown_zone', 422, 'invalid_zone', 'Use a valid IANA recipient zone');
    }
    const phoneHash = createHmac('sha256', Buffer.from(key(runtime), 'base64')).update(binding(churchId, `${runtime.twilio!.senderScope}:${input.phone}`)).digest('hex');
    const previous = (await client.query('SELECT id FROM provider_contacts WHERE church_id=$1 AND sender_scope=$2 AND phone_hash=$3', [churchId, runtime.twilio!.senderScope, phoneHash])).rows[0];
    if (previous) return { status: 200, body: { contactId: previous.id, consentChanged: false } };
    const id = randomUUID();
    await client.query('INSERT INTO provider_contacts(church_id,id,user_id,phone_ciphertext,phone_hash,zone,zone_source,sender_scope) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [churchId, id, input.userId, encryptToken(input.phone, binding(churchId, id), key(runtime)), phoneHash, input.zone, input.zoneSource, runtime.twilio!.senderScope]);
    return { status: 201, body: { contactId: id, suppressed: true, consentVersion: 0 } };
  }));

  app.post(`${prefix}/consent`, (request, reply) => command(request, reply, 'settings:manage', async (client, member, churchId) => {
    const input = z.object({ contactId: uuid, status: z.enum(['granted', 'revoked']), evidence: z.object({ source: z.string().min(3).max(300), wordingVersion: z.string().min(1).max(200), evidenceReference: z.string().min(3).max(500), purpose: z.literal('study_notifications'), handsetResubscriptionConfirmed: z.boolean().optional() }).strict() }).strict().parse(request.body);
    const contact = (await client.query('SELECT * FROM provider_contacts WHERE church_id=$1 AND id=$2 FOR UPDATE', [churchId, input.contactId])).rows[0];
    demand(contact, 404, 'not_found', 'Contact not found');
    const revoked = (await client.query("SELECT 1 FROM provider_consent_events WHERE church_id=$1 AND contact_id=$2 AND status='revoked' LIMIT 1", [churchId, input.contactId])).rowCount;
    demand(input.status !== 'granted' || !revoked || input.evidence.handsetResubscriptionConfirmed === true, 409, 'resubscription_evidence_required', 'An administrator cannot clear STOP without fresh handset/provider resubscription evidence');
    const version = contact.consent_version + 1;
    await client.query('INSERT INTO provider_consent_events(church_id,id,contact_id,version,status,evidence,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7)', [churchId, randomUUID(), input.contactId, version, input.status, JSON.stringify(input.evidence), member.userId]);
    await client.query('UPDATE provider_contacts SET consent_version=$3,suppressed=$4 WHERE church_id=$1 AND id=$2', [churchId, input.contactId, version, input.status !== 'granted']);
    if (input.status === 'revoked') await client.query("UPDATE provider_send_intents SET status='suppressed' WHERE church_id=$1 AND contact_id=$2 AND status IN ('pending','deferred','hold_unknown_zone')", [churchId, input.contactId]);
    return { status: 201, body: { contactId: input.contactId, consentVersion: version, suppressed: input.status !== 'granted' } };
  }));

  app.post(`${prefix}/sms/intents`, (request, reply) => command(request, reply, 'publication:schedule', async (client, member, churchId) => {
    smsConfigured(runtime, churchId);
    const input = z.object({ publicationId: uuid, connectionId: uuid, contactIds: z.array(uuid).min(1).max(1000), expiresAt: z.string().datetime({ offset: true }), confirmedPreviewHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(request.body);
    demand(new Set(input.contactIds).size === input.contactIds.length && Date.parse(input.expiresAt) > Date.now() && Date.parse(input.expiresAt) <= Date.now() + 7 * 86400_000, 422, 'invalid_notification', 'Choose unique contacts and an explicit expiry within seven days');
    const publication = (await client.query(`SELECT publications.*,revisions.payload,aggregates.live_publication_id,aggregates.approval_id AS current_approval,aggregates.head_revision_id FROM publications JOIN revisions ON revisions.church_id=publications.church_id AND revisions.id=publications.revision_id JOIN aggregates ON aggregates.church_id=publications.church_id AND aggregates.id=publications.content_id WHERE publications.church_id=$1 AND publications.id=$2`, [churchId, input.publicationId])).rows[0];
    demand(publication,404,'not_found','Study not found');
    const aggregate=await lockAggregate(client,churchId,publication.content_id,'content');
    publication.live_publication_id=aggregate.live_publication_id;
    publication.current_approval=aggregate.approval_id;
    publication.head_revision_id=aggregate.head_revision_id;
    demand(publication && publication.live_publication_id === publication.id && publication.current_approval === publication.approval_id && publication.head_revision_id === publication.revision_id, 409, 'publication_not_current', 'Only current approved published content can notify members');
    const body = publication.payload.outboundPreview;
    demand(typeof body === 'string' && body.length > 0 && body.length <= 1600 && digest(body) === input.confirmedPreviewHash, 422, 'preview_changed', 'Confirm the exact approved SMS preview');
    const connection = (await client.query("SELECT * FROM provider_connections WHERE church_id=$1 AND id=$2 AND provider='twilio' AND status='configured'", [churchId, input.connectionId])).rows[0];
    demand(connection?.config.senderScope === runtime.twilio!.senderScope && connection.config.accountSid === runtime.twilio!.accountSid, 409, 'sender_mismatch', 'Sender connection is not configured for this church');
    const budget = (await client.query("SELECT * FROM provider_budgets WHERE church_id=$1 AND period=to_char(now(),'YYYY-MM') FOR UPDATE", [churchId])).rows[0];
    const segments = smsSegments(body).segments * input.contactIds.length;
    demand(budget && budget.charged_sms_segments + segments <= budget.sms_segment_limit, 422, 'budget_exceeded', 'SMS segment budget is exhausted');
    const items = [];
    for (const contactId of input.contactIds) {
      const contact = (await client.query('SELECT * FROM provider_contacts WHERE church_id=$1 AND id=$2 FOR UPDATE', [churchId, contactId])).rows[0];
      demand(contact?.sender_scope === runtime.twilio!.senderScope, 404, 'not_found', 'Recipient is not part of this sender program');
      const id = randomUUID();
      const result = await client.query('INSERT INTO provider_send_intents(church_id,id,connection_id,publication_id,contact_id,actor_id,approval_id,preview_hash,body,consent_version,expires_at,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(church_id,publication_id,contact_id) DO NOTHING RETURNING id', [churchId, id, input.connectionId, input.publicationId, contactId, member.userId, publication.approval_id, input.confirmedPreviewHash, body, contact.consent_version, input.expiresAt, contact.suppressed ? 'suppressed' : 'pending']);
      if (result.rowCount) items.push({ id, status: contact.suppressed ? 'suppressed' : 'pending' });
    }
    await client.query('UPDATE provider_budgets SET charged_sms_segments=charged_sms_segments+$2 WHERE church_id=$1', [churchId, smsSegments(body).segments * items.length]);
    return { status: 202, body: { items, carrierDeliveryVerified: false } };
  }));
  app.get(`${prefix}/sms/intents`, request => read(request, 'publication:schedule', async (client, _member, churchId) => ({ items: (await client.query('SELECT id,publication_id,contact_id,status,provider_sid,error_code,not_before,expires_at,delivery_events FROM provider_send_intents WHERE church_id=$1 ORDER BY created_at DESC LIMIT 200', [churchId])).rows })));

  app.post(`${prefix}/sms/intents/:intentId/reconcile`, (request, reply) => command(request, reply, 'publication:schedule', async (client, member, churchId) => {
    smsConfigured(runtime, churchId);
    const id = uuid.parse((request.params as { intentId: string }).intentId);
    const intent = (await client.query('SELECT * FROM provider_send_intents WHERE church_id=$1 AND id=$2 FOR UPDATE', [churchId, id])).rows[0];
    demand(intent?.provider_sid, 409, 'manual_reconciliation_required', 'No provider SID is known; review callback/correlation evidence before any separately authorized resend');
    const status = await new TwilioAdapter(runtime.twilio).status(intent.provider_sid);
    await recordDeliveryStatus(client, churchId, intent, status.status, status.sid);
    await audit(client, churchId, member.userId, 'sms.reconciled', id);
    return { status: 200, body: { id, providerStatus: status.status, evidence: status.evidence } };
  }));

  await app.register(async callbacks => {
    callbacks.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'buffer', bodyLimit: 1_000_000 }, (_request, body, done) => done(null, body));
    callbacks.post('/v1/provider-callbacks/twilio/:churchId/:connectionId', async request => {
      const params = z.object({ churchId: uuid, connectionId: uuid }).parse(request.params);
      smsConfigured(runtime, params.churchId);
      const raw = request.body as Buffer;
      const signature = request.headers['x-twilio-signature'];
      const externalUrl = `${settings.appOrigin}/api/v1/provider-callbacks/twilio/${params.churchId}/${params.connectionId}${request.url.includes('?') ? `?${request.url.split('?')[1]}` : ''}`;
      demand(Buffer.isBuffer(raw) && typeof signature === 'string' && verifyTwilioSignature({ externalUrl, rawBody: raw.toString('utf8'), contentType: 'application/x-www-form-urlencoded', signature, authToken: runtime.twilio!.authToken! }), 403, 'invalid_signature', 'Webhook authentication failed');
      const form = new URLSearchParams(raw.toString('utf8'));
      demand(form.get('AccountSid') === runtime.twilio!.accountSid, 403, 'account_mismatch', 'Callback account does not match this church');
      return tenantTransaction(database, params.churchId, async client => {
        const connection = (await client.query("SELECT * FROM provider_connections WHERE church_id=$1 AND id=$2 AND provider='twilio' AND status='configured'", [params.churchId, params.connectionId])).rows[0];
        demand(connection?.config.senderScope === runtime.twilio!.senderScope && connection.config.accountSid === form.get('AccountSid'), 403, 'sender_mismatch', 'Callback sender program mismatch');
        const eventKey = digest(raw);
        const inserted = await client.query('INSERT INTO provider_webhook_inbox(church_id,id,connection_id,event_key,body_digest,payload) VALUES($1,$2,$3,$4,$4,$5) ON CONFLICT DO NOTHING', [params.churchId, randomUUID(), connection.id, eventKey, JSON.stringify({ messageSid: form.get('MessageSid'), status: form.get('MessageStatus'), optOutType: form.get('OptOutType') })]);
        if (!inserted.rowCount) return { accepted: true, duplicate: true };
        const inbound = form.get('Body')?.trim().toUpperCase();
        if (form.get('OptOutType') === 'STOP' || ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'REVOKE', 'OPTOUT'].includes(inbound ?? '')) {
          const phone = form.get('From');
          const senderMatches = runtime.twilio!.messagingServiceSid ? form.get('MessagingServiceSid') === runtime.twilio!.messagingServiceSid : form.get('To') === runtime.twilio!.from;
          demand(phone && senderMatches, 403, 'sender_mismatch', 'STOP must match this sender program');
          const phoneHash = createHmac('sha256', Buffer.from(key(runtime), 'base64')).update(binding(params.churchId, `${runtime.twilio!.senderScope}:${phone}`)).digest('hex');
          const contact = (await client.query('SELECT * FROM provider_contacts WHERE church_id=$1 AND sender_scope=$2 AND phone_hash=$3 FOR UPDATE', [params.churchId, runtime.twilio!.senderScope, phoneHash])).rows[0];
          if (contact) {
            await client.query('INSERT INTO provider_consent_events(church_id,id,contact_id,version,status,evidence,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7)', [params.churchId, randomUUID(), contact.id, contact.consent_version + 1, 'revoked', JSON.stringify({ source: 'authenticated_twilio_stop', messageSid: form.get('MessageSid') }), 'twilio_callback']);
            await client.query('UPDATE provider_contacts SET suppressed=true,consent_version=consent_version+1 WHERE church_id=$1 AND id=$2', [params.churchId, contact.id]);
            await client.query("UPDATE provider_send_intents SET status='suppressed' WHERE church_id=$1 AND contact_id=$2 AND status IN ('pending','deferred','hold_unknown_zone')", [params.churchId, contact.id]);
          }
        } else if (form.get('MessageStatus')) {
          const intentId = (request.query as { intentId?: string }).intentId;
          const sid = form.get('MessageSid');
          demand(sid && /^SM[a-f\d]{32}$/i.test(sid), 422, 'invalid_callback', 'Message SID missing');
          const intent = (await client.query('SELECT * FROM provider_send_intents WHERE church_id=$1 AND connection_id=$2 AND (provider_sid=$3 OR id=$4) FOR UPDATE', [params.churchId, connection.id, sid, intentId ? uuid.parse(intentId) : null])).rows[0];
          demand(intent && (!intent.provider_sid || intent.provider_sid === sid) && ['submitting', 'submission_unknown', 'queued', 'accepted', 'sending', 'sent', 'delivered', 'undelivered', 'failed', 'reconciliation_required'].includes(intent.status), 404, 'not_found', 'Callback message does not belong to a submitted intent');
          await recordDeliveryStatus(client, params.churchId, intent, form.get('MessageStatus')!, sid);
        }
        return { accepted: true, duplicate: false };
      });
    });
  });
}

async function recordDeliveryStatus(client: PoolClient, churchId: string, intent: { id: string; status: string }, status: string, sid: string) {
  const allowed = ['accepted', 'queued', 'sending', 'sent', 'delivered', 'undelivered', 'failed', 'canceled'];
  demand(allowed.includes(status), 422, 'invalid_callback_status', 'Unknown status retained for staff/provider contract review before projection');
  const terminal = ['delivered', 'undelivered', 'failed', 'canceled'];
  let projected = status;
  if (terminal.includes(intent.status)) projected = terminal.includes(status) && status !== intent.status ? 'reconciliation_required' : intent.status;
  else if (intent.status === 'reconciliation_required') projected = intent.status;
  else if (allowed.indexOf(status) < allowed.indexOf(intent.status)) projected = intent.status;
  await client.query('UPDATE provider_send_intents SET provider_sid=$3,status=$4,delivery_events=delivery_events||$5::jsonb WHERE church_id=$1 AND id=$2', [churchId, intent.id, sid, projected, JSON.stringify([{ status, receivedAt: new Date().toISOString(), sid }])]);
}

async function finishJob(database: Database, churchId: string, job: ProviderJob, result: unknown, errorCode: string | null, chargedTokens?: number) {
  await tenantTransaction(database, churchId, async client => {
    const finished = await client.query("UPDATE provider_jobs SET status=$3,result=$4,error_code=$5,finished_at=now(),payload=payload-'audioCiphertext' WHERE church_id=$1 AND id=$2 AND status='running' RETURNING id", [churchId, job.id, errorCode === 'SUBMISSION_UNKNOWN' ? 'submission_unknown' : errorCode ? 'failed' : 'completed', JSON.stringify(result), errorCode]);
    if (finished.rowCount && job.reservation) await client.query('UPDATE provider_budgets SET reserved_tokens=reserved_tokens-$2,charged_tokens=charged_tokens+$3 WHERE church_id=$1 AND period=$4 AND reserved_tokens >= $2', [churchId, job.reservation, chargedTokens ?? job.reservation, job.budget_period]);
  });
}

async function runAIJob(database: Database, churchId: string, job: ProviderJob, runtime: ProviderRuntime) {
  aiConfigured(runtime);
  const input = job.payload as AIJobInput;
  let planContextContent: string | undefined;
  const sources = await database.transaction(churchId, job.actor_id, async (client, member) => {
    requireCapability(member, 'ai:use');
    const aggregate = await loadAggregate(client, churchId, input.aggregateId);
    await requireEditor(client, aggregate, member);
    demand(aggregate.head_revision_id === input.baseRevisionId, 409, 'base_revision_changed', 'Proposal base changed before execution');
    await assertSourceDependencies(client, aggregate, input.sourceIds);
    const budget = (await client.query('SELECT * FROM provider_budgets WHERE church_id=$1', [churchId])).rows[0];
    demand(budget?.rights_confirmed && budget.profile_version === input.profileVersion, 409, 'profile_changed', 'Rights/profile changed before execution');
    if (input.workflow === 'study_draft') {
      const plan=await loadAggregate(client,churchId,aggregate.plan_id!,'plan');
      demand(plan.head_revision_id===input.planContextRevisionId,409,'plan_context_changed','Optional planning context changed');
      const revision=(await client.query('SELECT payload FROM revisions WHERE church_id=$1 AND id=$2',[churchId,plan.head_revision_id])).rows[0];
      planContextContent=canonical(revision.payload);
    }
    return loadAISources(client, churchId, input.sourceIds);
  });
  const proposal = await new OpenAIResponsesAdapter(runtime.openai).propose({ workflow: input.workflow, explicitAction: true, task: input.task, baseRevisionId: input.baseRevisionId, profileVersion: input.profileVersion, profile: input.profile, sources, dates: input.dates, selectedField: input.selectedField, planContextRevisionId:input.planContextRevisionId,planContextContent, budget: { reservedInputTokens: input.reservedInputTokens, reservedOutputTokens: input.reservedOutputTokens } });
  const proposalId = randomUUID();
  await database.transaction(churchId,job.actor_id,async(client,member)=>{
    requireCapability(member,'ai:use');
    const locator=await loadAggregate(client,churchId,input.aggregateId);
    const aggregate=await lockAggregate(client,churchId,input.aggregateId,locator.kind);
    await requireEditor(client,aggregate,member);
    demand(aggregate.head_revision_id===input.baseRevisionId,409,'base_revision_changed','Proposal base changed during execution');
    await assertSourceDependencies(client,aggregate,input.sourceIds);
    const currentSources=await loadAISources(client,churchId,input.sourceIds);
    demand(currentSources.every(source=>proposal.provenance.sources.some(provenance=>provenance.revisionId===source.revisionId&&provenance.sha256===digest(JSON.stringify(source.spans)))),409,'source_revision_changed','Source bytes changed during generation');
    await client.query('INSERT INTO provider_proposals(church_id,id,job_id,aggregate_id,base_revision_id,proposal) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(church_id,job_id) DO NOTHING', [churchId, proposalId, job.id, input.aggregateId, input.baseRevisionId, JSON.stringify(proposal)]);
  });
  await finishJob(database, churchId, job, { proposalId, status: 'proposal_awaiting_review' }, null, proposal.provenance.usage.inputTokens + proposal.provenance.usage.outputTokens);
}

async function runPCOJob(database: Database, churchId: string, job: ProviderJob, runtime: ProviderRuntime) {
  pcoConfigured(runtime);
  const input = job.payload as { connectionId: string };
  if (job.kind === 'pco_sync') await database.transaction(churchId, job.actor_id, async (client, member) => {
    requireCapability(member, 'settings:manage');
    const connection = (await client.query("SELECT * FROM provider_connections WHERE church_id=$1 AND id=$2 AND provider='pco' AND status='authorized' FOR UPDATE", [churchId, input.connectionId])).rows[0];
    demand(connection?.tokens_ciphertext && connection.config.rights?.confirmed, 409, 'connection_not_ready', 'Connection is not authorized for import');
    if (new Date(connection.expires_at).getTime() <= Date.now() + 60_000) {
      const previous = JSON.parse(decryptToken(connection.tokens_ciphertext, binding(churchId, connection.id), key(runtime))) as { refreshToken: string };
      const tokens = await new PlanningCenterAdapter(runtime.pco).refresh(previous.refreshToken);
      await client.query("UPDATE provider_connections SET tokens_ciphertext=$3,expires_at=now()+($4*interval '1 second') WHERE church_id=$1 AND id=$2", [churchId, connection.id, encryptToken(JSON.stringify(tokens), binding(churchId, connection.id), key(runtime)), tokens.expiresIn]);
    }
  });
  const result = await database.transaction(churchId, job.actor_id, async (client, member) => {
    requireCapability(member, 'settings:manage');
    const connection = (await client.query("SELECT * FROM provider_connections WHERE church_id=$1 AND id=$2 AND provider='pco' FOR UPDATE", [churchId, input.connectionId])).rows[0];
    demand(connection?.tokens_ciphertext, 409, 'connection_not_ready', 'Connection has no authorized tokens');
    const tokens = JSON.parse(decryptToken(connection.tokens_ciphertext, binding(churchId, connection.id), key(runtime))) as { accessToken: string; refreshToken: string; expiresIn: number };
    if (job.kind === 'pco_disconnect') {
      demand(connection.status === 'disconnect_pending', 409, 'connection_not_ready', 'Disconnect is not pending');
      await new PlanningCenterAdapter(runtime.pco).revoke(tokens.refreshToken, 'refresh_token');
      await client.query("UPDATE provider_connections SET status='disconnected',tokens_ciphertext=NULL,webhook_ciphertext=NULL,expires_at=NULL WHERE church_id=$1 AND id=$2", [churchId, connection.id]);
      await audit(client, churchId, member.userId, 'pco.disconnected', connection.id, { remoteRevocationAcknowledged: true, ownedSubscriptionCleanup: 'manual_subscription_registry_required' });
      return { disconnected: true, remoteRevocationAcknowledged: true, subscriptionCleanup: 'manual_required' };
    }
    demand(connection.status === 'authorized' && connection.config.rights?.confirmed, 409, 'connection_not_ready', 'Connection is not authorized for import');
    const adapter = new PlanningCenterAdapter({ ...runtime.pco, accessToken: tokens.accessToken });
    demand(providerOrganization(await adapter.read('/current/v2/me')) === connection.organization_id, 403, 'organization_mismatch', 'Connection organization changed');
    let path: string | null = '/publishing/v2/episodes?per_page=100';
    let pages = 0;
    let imported = 0;
    let unchanged = 0;
    let skipped = 0;
    const needsDateConfirmation: { episodeId: string; title: string }[] = [];
    const seenPages = new Set<string>();
    while (path) {
      demand(pages < 20 && !seenPages.has(path), 422, 'pagination_limit', 'Reconciliation exceeded bounded pages or encountered a pagination cycle');
      seenPages.add(path);
      const page = await adapter.read(path) as { data?: PCOEpisode[]; links?: { next?: string | null } };
      demand(Array.isArray(page.data), 502, 'invalid_pco_response', 'Episode page is malformed');
      pages += 1;
      for (const episode of page.data) {
        const channelId = episode.relationships?.channel?.data?.id ?? episode.relationships?.episode_channel?.data?.id;
        if (!connection.config.channelIds.includes(channelId)) { skipped += 1; continue; }
        demand(typeof episode.id === 'string' && /^[A-Za-z0-9_-]+$/.test(episode.id) && typeof episode.attributes?.title === 'string', 502, 'invalid_pco_response', 'Episode identity/title missing');
        const note = await adapter.read(`/publishing/v2/episodes/${episode.id}/note_template`) as { data?: { attributes?: { template?: string } } | null };
        const template = note.data?.attributes?.template;
        if (typeof template !== 'string' || !template.trim()) { skipped += 1; continue; }
        const notes = template.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').trim();
        if (!notes) { skipped += 1; continue; }
        const sourceHash = digest(canonical({ notes, episode: episode.attributes }));
        const mapped = (await client.query('SELECT * FROM provider_source_maps WHERE church_id=$1 AND connection_id=$2 AND provider_id=$3', [churchId, connection.id, episode.id])).rows[0];
        if (mapped?.source_hash === sourceHash) { unchanged += 1; continue; }
        const confirmedDate = connection.config.episodeDates?.[episode.id];
        if (!mapped && !confirmedDate) { needsDateConfirmation.push({ episodeId: episode.id, title: episode.attributes.title }); continue; }
        const sermonId = mapped?.sermon_id ?? randomUUID();
        if (!mapped) await client.query('INSERT INTO sermons(church_id,id,title,preached_date,speaker,passages,notes) VALUES($1,$2,$3,$4,$5,$6,$7)', [churchId, sermonId, episode.attributes.title.slice(0, 500), confirmedDate, 'Unconfirmed imported speaker', '[]', 'Imported notes; speaker and completeness require staff confirmation.']);
        const source = await storeSource(client, churchId, member.userId, { sermonId, bytes: Buffer.from(notes), format: 'txt', rights: connection.config.rights, provenance: { provider: 'pco', connectionId: connection.id, episodeId: episode.id, upstreamAttributes: { title: episode.attributes.title, publishedAt: episode.attributes.published_at ?? null }, grounding: 'church_authored_notes_not_verbatim_transcript', importedAt: new Date().toISOString(), preachedDateConfirmed: true } });
        await client.query('INSERT INTO provider_source_maps(church_id,connection_id,provider_id,sermon_id,source_id,source_hash) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(church_id,connection_id,provider_id) DO UPDATE SET source_id=$5,source_hash=$6,updated_at=now()', [churchId, connection.id, episode.id, sermonId, source.id, sourceHash]);
        imported += 1;
      }
      if (page.links?.next) {
        const next = new URL(page.links.next, runtime.pco?.baseUrl ?? 'https://api.planningcenteronline.com');
        demand(next.origin === new URL(runtime.pco?.baseUrl ?? 'https://api.planningcenteronline.com').origin && next.pathname === '/publishing/v2/episodes', 502, 'invalid_pagination', 'Provider pagination escaped the episode read boundary');
        path = next.pathname + next.search;
      } else path = null;
    }
    await client.query('UPDATE provider_connections SET last_sync_at=now() WHERE church_id=$1 AND id=$2', [churchId, connection.id]);
    return { imported, unchanged, skippedUnselectedOrMissingNotes: skipped, needsDateConfirmation, pages, automaticDeletionInference: false };
  });
  await finishJob(database, churchId, job, result, null);
}

async function runTranscriptionJob(database: Database, churchId: string, job: ProviderJob, runtime: ProviderRuntime) {
  enabled(runtime);
  demand(runtime.inspectAudio && runtime.transcription?.apiKey && runtime.transcription.model, 503, 'transcription_disabled', 'Transcription provider/inspector is disabled');
  await database.transaction(churchId, job.actor_id, async (_client, member) => { requireCapability(member, 'sermons:create'); });
  const input = job.payload as TranscriptionJobInput;
  const bytes = decodeBase64(decryptToken(input.audioCiphertext, binding(churchId, input.audioId), key(runtime)), 25_000_000);
  const inspected = await runtime.inspectAudio(bytes, input.filename);
  demand(inspected.scanPassed && inspected.durationSeconds <= input.reservedSeconds, 422, 'unsafe_audio', 'Audio inspection/budget changed');
  const transcript = await new OpenAITranscriptionAdapter(runtime.transcription).transcribe({ bytes, filename: input.filename, sourceRevisionId: input.audioId, explicitAction: true, rightsConfirmed: input.rights.confirmed, scanPassed: true, durationSeconds: inspected.durationSeconds, reservedSeconds: input.reservedSeconds, language: input.language });
  const source = await database.transaction(churchId, job.actor_id, async (client, member) => {
    requireCapability(member, 'sermons:create');
    return storeSource(client, churchId, member.userId, { sermonId: input.sermonId, bytes: Buffer.from(transcript.normalizedText), format: 'txt', rights: input.rights, provenance: { ...transcript.provenance, audioId: input.audioId, usage: transcript.usage, audioRetention: 'purged_from_job_on_finalization' } });
  });
  await finishJob(database, churchId, job, { sourceId: source.id, reviewStatus: 'needs_review' }, null);
}

async function runSMS(database: Database, churchId: string, settings: Settings, runtime: ProviderRuntime): Promise<number> {
  if (!runtime.enabled || runtime.twilio?.churchId !== churchId || !runtime.twilio.activationApproved) return 0;
  smsConfigured(runtime, churchId);
  const intent = await tenantTransaction(database, churchId, async client => {
    const candidate = (await client.query("SELECT intents.id,intents.contact_id,publications.content_id FROM provider_send_intents intents JOIN publications ON publications.church_id=intents.church_id AND publications.id=intents.publication_id WHERE intents.church_id=$1 AND intents.status IN ('pending','deferred') AND intents.not_before<=now() ORDER BY intents.created_at,intents.id LIMIT 1", [churchId])).rows[0];
    if (!candidate) return null;
    try {await lockAggregate(client,churchId,candidate.content_id,'content');}
    catch(error) {if(error instanceof ApiError&&error.statusCode===404)return null;throw error;}
    const contact = (await client.query('SELECT * FROM provider_contacts WHERE church_id=$1 AND id=$2 FOR UPDATE', [churchId, candidate.contact_id])).rows[0];
    const claimed = (await client.query("SELECT * FROM provider_send_intents WHERE church_id=$1 AND id=$2 AND status IN ('pending','deferred') FOR UPDATE SKIP LOCKED", [churchId, candidate.id])).rows[0];
    if (!claimed) return null;
    let status: string | null = null;
    if (contact.suppressed || contact.consent_version !== claimed.consent_version || contact.sender_scope !== runtime.twilio!.senderScope) status = 'suppressed';
    const membership = (await client.query('SELECT capabilities FROM memberships WHERE church_id=$1 AND user_id=$2 AND active', [churchId, claimed.actor_id])).rows[0];
    if (!membership?.capabilities.includes('publication:schedule')) status = 'authorization_revoked';
    const valid = (await client.query(`SELECT revisions.payload,connections.config,content_approval.approver_id AS content_approver_id FROM publications JOIN aggregates ON aggregates.church_id=publications.church_id AND aggregates.id=publications.content_id JOIN slots ON slots.church_id=aggregates.church_id AND slots.id=aggregates.slot_id JOIN revisions ON revisions.church_id=publications.church_id AND revisions.id=publications.revision_id JOIN approvals content_approval ON content_approval.church_id=publications.church_id AND content_approval.id=publications.approval_id JOIN provider_connections connections ON connections.church_id=publications.church_id AND connections.id=$3 WHERE publications.church_id=$1 AND publications.id=$2 AND slots.deleted_at IS NULL AND slots.withdrawn_at IS NULL AND aggregates.live_publication_id=publications.id AND aggregates.head_revision_id=publications.revision_id AND aggregates.approval_id=publications.approval_id AND connections.status='configured'`, [churchId, claimed.publication_id, claimed.connection_id])).rows[0];
    if (!valid || digest(valid.payload.outboundPreview) !== claimed.preview_hash || valid.config.accountSid !== runtime.twilio!.accountSid || valid.config.senderScope !== runtime.twilio!.senderScope) status = 'approval_changed';
    if (valid) {
      const authorities = await client.query<{ user_id: string; capabilities: string[]; active: boolean }>('SELECT user_id,capabilities,active FROM memberships WHERE church_id=$1 AND user_id=ANY($2::text[]) ORDER BY user_id FOR SHARE', [churchId, [contact.user_id, valid.content_approver_id, claimed.actor_id]]);
      const recipient = authorities.rows.find(member => member.user_id === contact.user_id);
      const contentApprover = authorities.rows.find(member => member.user_id === valid.content_approver_id);
      const publisher = authorities.rows.find(member => member.user_id === claimed.actor_id);
      if (!recipient?.active || !contentApprover?.active || !contentApprover.capabilities.includes('content:approve') || !publisher?.active || !publisher.capabilities.includes('publication:schedule')) status = 'authorization_revoked';
    }
    const window = recipientSendWindow({ now: new Date().toISOString(), expiresAt: new Date(claimed.expires_at).toISOString(), zone: contact.zone });
    if (status) { await client.query('UPDATE provider_send_intents SET status=$3 WHERE church_id=$1 AND id=$2', [churchId, claimed.id, status]); return null; }
    if (window.decision !== 'send') {
      await client.query('UPDATE provider_send_intents SET status=$3,not_before=coalesce($4,not_before) WHERE church_id=$1 AND id=$2', [churchId, claimed.id, window.decision === 'defer' ? 'deferred' : window.decision, window.decision === 'defer' ? window.nextEligibleAt : null]);
      return null;
    }
    const phone = decryptToken(contact.phone_ciphertext, binding(churchId, contact.id), key(runtime));
    await client.query("UPDATE provider_send_intents SET status='submitting',delivery_events=delivery_events||$3::jsonb WHERE church_id=$1 AND id=$2", [churchId, claimed.id, JSON.stringify([{ status: 'submitting', receivedAt: new Date().toISOString() }])]);
    return { ...claimed, phone };
  });
  if (!intent) return 0;
  let acceptedSid: string | undefined;
  try {
    const statusCallback = `${settings.appOrigin}/api/v1/provider-callbacks/twilio/${churchId}/${intent.connection_id}?intentId=${intent.id}`;
    const sent = await new TwilioAdapter(runtime.twilio).send({ to: intent.phone, body: intent.body, statusCallback });
    acceptedSid = sent.sid;
    await tenantTransaction(database, churchId, async client => {
      const current = (await client.query('SELECT * FROM provider_send_intents WHERE church_id=$1 AND id=$2 FOR UPDATE', [churchId, intent.id])).rows[0];
      await recordDeliveryStatus(client, churchId, current, sent.status, sent.sid);
    });
  } catch (error) {
    await tenantTransaction(database, churchId, client => client.query("UPDATE provider_send_intents SET status=$3,error_code=$4,provider_sid=coalesce(provider_sid,$5) WHERE church_id=$1 AND id=$2 AND status='submitting'", [churchId, intent.id, !acceptedSid && error instanceof IntegrationError && error.code !== 'SUBMISSION_UNKNOWN' ? 'failed' : 'submission_unknown', error instanceof IntegrationError ? error.code : 'submission_unknown', acceptedSid ?? null]));
  }
  return 1;
}

export async function runProviderWork(database: Database, settings: Settings, runtime: ProviderRuntime = providerRuntime()): Promise<{ jobs: number; submissions: number }> {
  if (!runtime.enabled) return { jobs: 0, submissions: 0 };
  const churches = await database.pool.query('SELECT id FROM worker_churches()');
  let jobs = 0;
  let submissions = 0;
  for (const church of churches.rows) {
    const churchId = church.id as string;
    await tenantTransaction(database, churchId, async client => {
      const abandoned = await client.query("UPDATE provider_jobs SET status='submission_unknown',error_code='worker_interrupted',payload=payload-'audioCiphertext',finished_at=now() WHERE church_id=$1 AND status='running' AND started_at<now()-interval '10 minutes' RETURNING reservation,budget_period", [churchId]);
      for (const job of abandoned.rows) if (job.reservation) await client.query('UPDATE provider_budgets SET reserved_tokens=reserved_tokens-$2,charged_tokens=charged_tokens+$2 WHERE church_id=$1 AND period=$3 AND reserved_tokens >= $2', [churchId, job.reservation, job.budget_period]);
      await client.query("UPDATE provider_send_intents SET status='submission_unknown',error_code='worker_interrupted' WHERE church_id=$1 AND status='submitting' AND coalesce((delivery_events->-1->>'receivedAt')::timestamptz,created_at)<now()-interval '10 minutes'", [churchId]);
    });
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const job = await tenantTransaction(database, churchId, async client => {
        const result = await client.query("SELECT * FROM provider_jobs WHERE church_id=$1 AND status='pending' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1", [churchId]);
        if (!result.rowCount) return null;
        await client.query("UPDATE provider_jobs SET status='running',started_at=now() WHERE church_id=$1 AND id=$2", [churchId, result.rows[0].id]);
        return result.rows[0];
      });
      if (!job) break;
      jobs += 1;
      try {
        if (job.kind === 'ai') await runAIJob(database, churchId, job, runtime);
        else if (job.kind === 'transcription') await runTranscriptionJob(database, churchId, job, runtime);
        else await runPCOJob(database, churchId, job, runtime);
      } catch (error) {
        const code = error instanceof IntegrationError || error instanceof ApiError ? error.code : 'provider_job_failed';
        await finishJob(database, churchId, job, { manualReviewRequired: code === 'SUBMISSION_UNKNOWN' }, code);
      }
    }
    for (let attempt = 0; attempt < 10; attempt += 1) submissions += await runSMS(database, churchId, settings, runtime);
  }
  return { jobs, submissions };
}
