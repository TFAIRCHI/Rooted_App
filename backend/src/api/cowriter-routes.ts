import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { authenticate, csrf } from '../auth/routes.js';
import { Database, requireCapability, type Membership } from '../infrastructure/database.js';
import type { config } from '../infrastructure/config.js';
import { demand } from './errors.js';
import { audit, loadAggregate, lockAggregate, matchVersion, requireEditor } from '../modules/editorial.js';
import { saveRevision } from '../modules/save-revision.js';
import { canonical, hash } from '../modules/revisions.js';
import { CowriterAdapter, cowriterConfig, demoProfile, transcriptText, type ChatInput } from '../integrations/cowriter.js';
import { IntegrationError } from '../integrations/errors.js';
import { studyFields, type AIProposal, type AIRequest, type OpenAIConfig } from '../integrations/ai.js';
import { actionInput, applyCowriterAction, previewCowriterAction } from './cowriter-actions.js';

const uuid = z.string().uuid();
const messageSchema = z.object({ conversationId: uuid, kind: z.enum(['chat', 'weekly', 'draft']), task: z.string().trim().min(1).max(2000), baseRevisionId: uuid }).strict();
interface Conversation { id: string; aggregate_id: string; source_id: string | null; source_hash: string | null; messages: ChatInput['history']; expires_at: Date }
interface StoredRequest { id: string; status: string; result: unknown; error_message: string | null; reservation: number; budget_period: string; base_revision_id: string; source_id: string | null; source_hash: string | null; profile_version: string; request_hash: string }
export type CowriterRuntime = () => OpenAIConfig;

async function authorized(client: PoolClient, member: Membership, churchId: string, studyId: string, editable = false) {
  requireCapability(member, 'ai:use');
  const aggregate = await loadAggregate(client, churchId, studyId, 'content');
  await requireEditor(client, aggregate, member);
  if (editable) demand(['draft', 'changes_requested'].includes(aggregate.status) && !aggregate.live_publication_id, 409, 'study_not_editable', 'Use an unpublished editable draft for AI suggestions');
  return aggregate;
}
async function conversation(client: PoolClient, churchId: string, id: string, studyId: string): Promise<Conversation> {
  const row = (await client.query('SELECT * FROM cowriter_conversations WHERE church_id=$1 AND id=$2 AND aggregate_id=$3 AND NOT cleared AND expires_at>now() AND selected_date=(SELECT s.local_date FROM aggregates a JOIN slots s ON s.church_id=a.church_id AND s.id=a.slot_id WHERE a.church_id=$1 AND a.id=$3) FOR UPDATE', [churchId, id, studyId])).rows[0];
  demand(row, 404, 'conversation_not_found', 'Conversation expired or unavailable. Start a new conversation.');
  return row;
}
async function source(client: PoolClient, churchId: string, conv: Conversation) {
  if (!conv.source_id) return null;
  const row = (await client.query('SELECT * FROM cowriter_sources WHERE church_id=$1 AND id=$2 AND conversation_id=$3', [churchId, conv.source_id, conv.id])).rows[0];
  demand(row && row.sha256 === conv.source_hash && hash(row.text) === row.sha256, 409, 'source_changed', 'Reviewed source changed; confirm it again');
  return row as { id: string; text: string; sha256: string };
}
function view(row: StoredRequest) { return { id: row.id, status: row.status, result: row.result, error: row.error_message }; }
function existingStudySource(payload: Record<string, unknown>): string {
  return ['Title', String(payload.title ?? ''), 'References', Array.isArray(payload.references) ? payload.references.join(', ') : '', 'Body', String(payload.body ?? ''), 'Reflection', String(payload.reflection ?? ''), 'Discussion', String(payload.discussionQuestion ?? ''), 'Application', String(payload.application ?? '')].join('\n').slice(0, 4000);
}

export async function cowriterRoutes(app: FastifyInstance, database: Database, settings: ReturnType<typeof config>, runtime: CowriterRuntime = cowriterConfig) {
  const prefix = '/v1/churches/:churchId/content/:studyId/cowriter';
  async function identity(request: FastifyRequest, write = false) {
    const session = await authenticate(database, request);
    if (write) csrf(request, session, settings.appOrigin);
    const params = z.object({ churchId: uuid, studyId: uuid }).parse(request.params);
    return { ...params, userId: session.userId };
  }
  app.get(`${prefix}/status`, async request => {
    const ctx = await identity(request);
    return database.transaction(ctx.churchId, ctx.userId, async (client, member) => {
      await authorized(client, member, ctx.churchId, ctx.studyId);
      try { runtime(); return { configured: true, verified: false, deployment: 'gpt-5.6-luna' }; }
      catch (error) { return { configured: false, verified: false, message: error instanceof IntegrationError ? error.message : 'Azure configuration unavailable' }; }
    });
  });
  app.post(`${prefix}/actions/preview`, async request => {
    const ctx = await identity(request, true);
    const action = actionInput.parse(request.body);
    return database.transaction(ctx.churchId, ctx.userId, async (client, member) => {
      demand(action.kind !== 'full_kjv' || action.contentId === ctx.studyId, 404, 'study_not_found', 'This action belongs to a different study.');
      if (action.kind === 'move') {
        const selected = await loadAggregate(client, ctx.churchId, ctx.studyId, 'content');
        demand(selected.slot_id === action.slotId, 404, 'study_not_found', 'This action belongs to a different study.');
      }
      return previewCowriterAction(client, member, ctx.churchId, action);
    });
  });
  app.post(`${prefix}/actions/apply`, async request => {
    const ctx = await identity(request, true);
    const action = actionInput.parse(request.body);
    return database.transaction(ctx.churchId, ctx.userId, async (client, member) => {
      demand(action.kind !== 'full_kjv' || action.contentId === ctx.studyId, 404, 'study_not_found', 'This action belongs to a different study.');
      if (action.kind === 'move') {
        const selected = await loadAggregate(client, ctx.churchId, ctx.studyId, 'content');
        demand(selected.slot_id === action.slotId, 404, 'study_not_found', 'This action belongs to a different study.');
      }
      return applyCowriterAction(client, member, ctx.churchId, action);
    });
  });
  app.post(`${prefix}/conversations`, async (request, reply) => {
    const ctx = await identity(request, true);
    z.object({}).strict().parse(request.body);
    return database.transaction(ctx.churchId, ctx.userId, async (client, member) => {
      await authorized(client, member, ctx.churchId, ctx.studyId);
      // Expired private content is scrubbed lazily on the next conversation creation.
      await client.query("UPDATE cowriter_conversations SET messages='[]',source_id=NULL,source_hash=NULL,cleared=true WHERE church_id=$1 AND actor_id=$2 AND expires_at<=now()", [ctx.churchId, ctx.userId]);
      await client.query("UPDATE cowriter_requests SET result=NULL,source_id=NULL WHERE church_id=$1 AND conversation_id IN (SELECT id FROM cowriter_conversations WHERE church_id=$1 AND cleared)", [ctx.churchId]);
      await client.query('DELETE FROM cowriter_sources WHERE church_id=$1 AND conversation_id IN (SELECT id FROM cowriter_conversations WHERE church_id=$1 AND cleared)', [ctx.churchId]);
      const id = randomUUID();
      await client.query('INSERT INTO cowriter_conversations(church_id,id,actor_id,aggregate_id,selected_date) SELECT $1,$2,$3,a.id,s.local_date FROM aggregates a JOIN slots s ON s.church_id=a.church_id AND s.id=a.slot_id WHERE a.church_id=$1 AND a.id=$4', [ctx.churchId, id, ctx.userId, ctx.studyId]);
      return reply.code(201).send({ id, profile: 'Church profile if configured; otherwise demo teaching profile', retentionDays: 7 });
    });
  });
  app.get(`${prefix}/conversations`, async request => {
    const ctx=await identity(request);
    return database.transaction(ctx.churchId,ctx.userId,async(client,member)=>{
      await authorized(client,member,ctx.churchId,ctx.studyId);
      const rows=await client.query("SELECT c.id,c.created_at,c.expires_at,coalesce(c.messages->0->>'content','New conversation') AS title FROM cowriter_conversations c JOIN aggregates a ON a.church_id=c.church_id AND a.id=c.aggregate_id JOIN slots s ON s.church_id=a.church_id AND s.id=a.slot_id WHERE c.church_id=$1 AND c.aggregate_id=$2 AND NOT c.cleared AND c.expires_at>now() AND c.selected_date=s.local_date ORDER BY c.created_at DESC",[ctx.churchId,ctx.studyId]);
      return {items:rows.rows};
    });
  });
  app.get(`${prefix}/conversations/:conversationId`, async request => {
    const ctx=await identity(request);const id=uuid.parse((request.params as {conversationId:string}).conversationId);
    return database.transaction(ctx.churchId,ctx.userId,async(client,member)=>{
      await authorized(client,member,ctx.churchId,ctx.studyId);const conv=await conversation(client,ctx.churchId,id,ctx.studyId);const reviewed=await source(client,ctx.churchId,conv);
      return {id:conv.id,messages:conv.messages,sourceText:reviewed?.text??'',sourceConfirmed:!!reviewed,expiresAt:conv.expires_at};
    });
  });
  app.delete(`${prefix}/conversations/:conversationId`, async request => {
    const ctx = await identity(request, true);
    const id = uuid.parse((request.params as { conversationId: string }).conversationId);
    return database.transaction(ctx.churchId, ctx.userId, async (client, member) => {
      await authorized(client, member, ctx.churchId, ctx.studyId);
      await conversation(client, ctx.churchId, id, ctx.studyId);
      demand(!(await client.query("SELECT 1 FROM cowriter_requests WHERE church_id=$1 AND conversation_id=$2 AND status='running'", [ctx.churchId, id])).rowCount, 409, 'request_running', 'Wait for the current request before clearing');
      await client.query("UPDATE cowriter_conversations SET cleared=true,messages='[]',source_id=NULL,source_hash=NULL WHERE church_id=$1 AND id=$2", [ctx.churchId, id]);
      await client.query('UPDATE cowriter_requests SET result=NULL,source_id=NULL WHERE church_id=$1 AND conversation_id=$2', [ctx.churchId, id]);
      await client.query('DELETE FROM cowriter_sources WHERE church_id=$1 AND conversation_id=$2', [ctx.churchId, id]);
      return { cleared: true };
    });
  });
  app.post(`${prefix}/sources`, { bodyLimit: 7_000_000 }, async request => {
    const ctx = await identity(request, true);
    const input = z.object({ conversationId: uuid, text: z.string().min(1).max(6*1024*1024), confirmed: z.literal(true), rightsConfirmed: z.literal(true), filename: z.string().max(200).optional() }).strict().parse(request.body);
    demand(!input.filename || /\.(?:txt|docx|pdf)$/i.test(input.filename), 422, 'unsupported_file', 'Attach a Word document or PDF');
    const text = transcriptText(input.text);
    return database.transaction(ctx.churchId, ctx.userId, async (client, member) => {
      await authorized(client, member, ctx.churchId, ctx.studyId);
      const conv = await conversation(client, ctx.churchId, input.conversationId, ctx.studyId);
      demand(!(await client.query("SELECT 1 FROM cowriter_requests WHERE church_id=$1 AND conversation_id=$2 AND status='running'", [ctx.churchId, conv.id])).rowCount, 409, 'request_running', 'Wait before changing sources');
      const id = randomUUID(); const digest = hash(text);
      await client.query('INSERT INTO cowriter_sources(church_id,id,conversation_id,actor_id,text,sha256) VALUES($1,$2,$3,$4,$5,$6)', [ctx.churchId, id, conv.id, ctx.userId, text, digest]);
      await client.query("UPDATE cowriter_conversations SET source_id=$3,source_hash=$4,messages='[]' WHERE church_id=$1 AND id=$2", [ctx.churchId, conv.id, id, digest]);
      return { id, reviewed: true, sha256: digest };
    });
  });
  app.post(`${prefix}/messages`, async (request, reply) => {
    const ctx = await identity(request, true); const input = messageSchema.parse(request.body);
    const requestKey = z.string().min(8).max(200).parse(request.headers['idempotency-key']);
    const requestHash = hash(canonical(input));
    const config = runtime();
    const reserved = await database.transaction(ctx.churchId, ctx.userId, async (client, member) => {
      const study = await authorized(client, member, ctx.churchId, ctx.studyId, input.kind === 'draft');
      const conv = await conversation(client, ctx.churchId, input.conversationId, ctx.studyId);
      const previous = (await client.query('SELECT * FROM cowriter_requests WHERE church_id=$1 AND actor_id=$2 AND request_key=$3', [ctx.churchId, ctx.userId, requestKey])).rows[0] as StoredRequest | undefined;
      if (previous) { demand(previous.request_hash === requestHash, 409, 'idempotency_conflict', 'That request key was used with different input'); return { previous }; }
      demand(study.head_revision_id === input.baseRevisionId, 409, 'base_revision_changed', 'Save or reload the current draft before requesting assistance');
      let reviewed = await source(client, ctx.churchId, conv);
      const selectedPayload = (await client.query('SELECT payload FROM revisions WHERE church_id=$1 AND id=$2', [ctx.churchId, study.head_revision_id])).rows[0]?.payload as Record<string, unknown> | undefined;
      if (!reviewed && input.kind === 'draft' && selectedPayload) {
        const text = existingStudySource(selectedPayload);
        if (String(selectedPayload.body ?? '').trim()) {
          const id = randomUUID(), sha256 = hash(text);
          await client.query('INSERT INTO cowriter_sources(church_id,id,conversation_id,actor_id,text,sha256) VALUES($1,$2,$3,$4,$5,$6)', [ctx.churchId, id, conv.id, ctx.userId, text, sha256]);
          await client.query('UPDATE cowriter_conversations SET source_id=$3,source_hash=$4 WHERE church_id=$1 AND id=$2', [ctx.churchId, conv.id, id, sha256]);
          reviewed = { id, text, sha256 };
        }
      }
      demand(input.kind === 'chat' || reviewed, 422, 'source_required', 'Add and confirm source text or save existing study content before planning or drafting');
      const dates = (await client.query("SELECT s.local_date::text AS date FROM slots s JOIN slots selected ON selected.church_id=s.church_id AND selected.series_id=s.series_id WHERE s.church_id=$1 AND selected.id=$2 AND s.local_date BETWEEN greatest(date_trunc('month',selected.local_date)::date,selected.local_date-extract(dow FROM selected.local_date)::int) AND least((date_trunc('month',selected.local_date)+interval '1 month - 1 day')::date,selected.local_date+(6-extract(dow FROM selected.local_date)::int)) AND s.deleted_at IS NULL AND s.withdrawn_at IS NULL ORDER BY s.local_date", [ctx.churchId, study.slot_id])).rows.map(row => row.date as string);
      const day = (await client.query('SELECT local_date::text AS date FROM slots WHERE church_id=$1 AND id=$2', [ctx.churchId, study.slot_id])).rows[0].date;
      const currentRevision = selectedPayload;
      await client.query("INSERT INTO provider_budgets(church_id,monthly_limit,period,profile,profile_version) VALUES($1,200000,to_char(now() AT TIME ZONE 'UTC','YYYY-MM'),$2,'demo-collaborator-v1') ON CONFLICT DO NOTHING", [ctx.churchId, demoProfile]);
      const budget = (await client.query('SELECT * FROM provider_budgets WHERE church_id=$1 FOR UPDATE', [ctx.churchId])).rows[0];
      const profile = budget.rights_confirmed ? budget.profile : demoProfile;
      const profileVersion = `${budget.rights_confirmed ? budget.profile_version : 'demo-collaborator-v1'}:${hash(profile)}`;
      const history = conv.messages;
      demand(history.length <= 16, 422, 'conversation_limit', 'Start a new conversation to keep context and cost bounded');
      const reading = currentRevision?.scriptureReading as { reference?: unknown; verses?: unknown } | undefined;
      const bodyText = String(currentRevision?.body ?? '');
      const context = { profile, profileVersion, selectedDate: day, selectedStudy: { id: study.id, revisionId: study.head_revision_id, status: study.status, date: day, title: String(currentRevision?.title ?? '').slice(0,300), references: currentRevision?.references ?? [], bodyExcerpt: bodyText.slice(0,1800), bodyTruncated: bodyText.length > 1800, scriptureReading: reading ? { reference: reading.reference, verseCount: Array.isArray(reading.verses) ? reading.verses.length : 0 } : null }, selectedDates: dates, reviewedTranscript: reviewed?.text.slice(0,4000) ?? null, sourceId: reviewed?.id ?? null };
      demand(Buffer.byteLength(JSON.stringify({ context, history, task: input.task })) + 1800 <= (input.kind === 'draft' ? 10_000 : 12_000), 422, 'input_limit', 'Shorten the transcript or start a new conversation; this request exceeds the demo context limit');
      demand((await client.query('SELECT reserve_cowriter_allowance() AS allowed')).rows[0].allowed, 429, 'daily_limit', 'Demo request allowance reached (30 per church / 100 total per UTC day)');
      // The allowance function may reconcile an interrupted prior request.
      Object.assign(budget, (await client.query('SELECT * FROM provider_budgets WHERE church_id=$1 FOR UPDATE', [ctx.churchId])).rows[0]);
      const period = (await client.query("SELECT to_char(now() AT TIME ZONE 'UTC','YYYY-MM') AS period")).rows[0].period;
      demand(budget.period === period || budget.reserved_tokens === 0, 409, 'budget_rollover', 'Prior reservations must be reconciled before budget rollover');
      if (budget.period !== period) budget.charged_tokens = 0;
      demand(budget.charged_tokens + budget.reserved_tokens + 13500 <= Math.min(budget.monthly_limit, 200000), 422, 'budget_exceeded', 'Monthly co-writer token allowance exhausted');
      await client.query('UPDATE provider_budgets SET period=$2,charged_tokens=$3,reserved_tokens=reserved_tokens+13500 WHERE church_id=$1', [ctx.churchId, period, budget.charged_tokens]);
      const id = randomUUID();
      await client.query("INSERT INTO cowriter_requests(church_id,id,conversation_id,actor_id,request_key,request_hash,kind,status,base_revision_id,source_id,source_hash,profile_version,budget_period) VALUES($1,$2,$3,$4,$5,$6,$7,'running',$8,$9,$10,$11,$12)", [ctx.churchId, id, conv.id, ctx.userId, requestKey, requestHash, input.kind, input.baseRevisionId, reviewed?.id ?? null, reviewed?.sha256 ?? null, profileVersion, period]);
      return { id, period, context, history, reviewed, profile, profileVersion };
    });
    if (reserved.previous) return reply.send(view(reserved.previous));
    const adapter = new CowriterAdapter(config);
    let result: unknown; let charged = 13500; let error: string | null = null;
    try {
      if (input.kind === 'draft') {
        const aiInput: AIRequest = { workflow: 'study_draft', explicitAction: true, task: `${input.task}\nRevise the selected existing study for ${reserved.context!.selectedDate}. Return a proposal for review, not a new study or series. Keep the body concise and all fields within 1500 output tokens.`, baseRevisionId: input.baseRevisionId, profile: reserved.profile!, profileVersion: reserved.profileVersion!, sources: [{ revisionId: reserved.reviewed!.id, spans: [{ id: 'transcript', text: reserved.reviewed!.text.slice(0,4000) }] }], budget: { reservedInputTokens: 12000, reservedOutputTokens: 1500 } };
        const proposal = await adapter.propose(aiInput); result = { proposal, text: 'Draft proposal ready for review. Your study has not changed.', usage: proposal.provenance.usage };
        charged = proposal.provenance.usage.inputTokens + proposal.provenance.usage.outputTokens;
      } else {
        const response = await adapter.chat({ task: input.kind === 'weekly' ? `${input.task}\nCreate a read-only outline for exactly these dates: ${reserved.context!.selectedDates.join(', ')}. Do not claim any draft was saved.` : input.task, context: reserved.context, history: reserved.history! });
        result = response; charged = response.usage.inputTokens + response.usage.outputTokens;
      }
      await database.transaction(ctx.churchId, ctx.userId, async (client, member) => {
        await authorized(client, member, ctx.churchId, ctx.studyId, input.kind === 'draft');
        const conv = await conversation(client, ctx.churchId, input.conversationId, ctx.studyId);
        demand(conv.source_id === (reserved.reviewed?.id ?? null), 409, 'source_changed', 'Source changed during generation');
        await source(client, ctx.churchId, conv);
        if (input.kind === 'draft') demand((await loadAggregate(client, ctx.churchId, ctx.studyId)).head_revision_id === input.baseRevisionId, 409, 'base_revision_changed', 'Draft changed during generation. Request a fresh proposal.');
        const message = result as { text: string };
        await client.query('UPDATE cowriter_conversations SET messages=$3 WHERE church_id=$1 AND id=$2', [ctx.churchId, conv.id, JSON.stringify([...conv.messages, { role: 'user', content: input.task }, { role: 'assistant', content: message.text }])]);
      });
    } catch (failure) { result = null; error = failure instanceof IntegrationError || (failure instanceof Error && 'statusCode' in failure) ? (failure as Error).message : 'Co-writer request failed. No automatic retry was performed.'; }
    // Cleanup still reconciles reservations if membership was revoked during inference.
    const client = await database.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.church_id',$1,true),set_config('app.user_id',$2,true)", [ctx.churchId, ctx.userId]);
      const finished = await client.query("UPDATE cowriter_requests SET status=$3,result=$4,error_message=$5,charged_tokens=$6,finished_at=now() WHERE church_id=$1 AND id=$2 AND status='running' RETURNING *", [ctx.churchId, reserved.id, error ? (charged === 13500 ? 'submission_unknown' : 'failed') : 'completed', JSON.stringify(result), error, charged]);
      if (finished.rowCount) await client.query('UPDATE provider_budgets SET reserved_tokens=reserved_tokens-13500,charged_tokens=charged_tokens+$3 WHERE church_id=$1 AND period=$2 AND reserved_tokens>=13500', [ctx.churchId, reserved.period, charged]);
      await client.query('COMMIT');
      demand(finished.rowCount, 409, 'request_expired', 'Request expired; inspect its status before retrying');
      // Do not return private output after membership loss.
      await database.transaction(ctx.churchId, ctx.userId, async (db, member) => { await authorized(db, member, ctx.churchId, ctx.studyId); });
      return reply.send(view(finished.rows[0]));
    } catch (failure) { await client.query('ROLLBACK'); throw failure; } finally { client.release(); }
  });
  app.get(`${prefix}/requests/:requestId`, async request => {
    const ctx = await identity(request); const id = uuid.parse((request.params as { requestId: string }).requestId);
    return database.transaction(ctx.churchId, ctx.userId, async (client, member) => {
      await authorized(client, member, ctx.churchId, ctx.studyId);
      const row = (await client.query('SELECT r.* FROM cowriter_requests r JOIN cowriter_conversations c ON c.church_id=r.church_id AND c.id=r.conversation_id WHERE r.church_id=$1 AND r.id=$2 AND c.aggregate_id=$3 AND NOT c.cleared AND c.expires_at>now()', [ctx.churchId, id, ctx.studyId])).rows[0];
      demand(row, 404, 'not_found', 'Request unavailable'); return view(row);
    });
  });
  app.post(`${prefix}/requests/:requestId/adopt`, async (request, reply) => {
    const ctx = await identity(request, true); const id = uuid.parse((request.params as { requestId: string }).requestId);
    const selection = z.object({ confirmedReplacement: z.literal(true), fields: z.array(z.enum(studyFields)).min(1).optional() }).strict().parse(request.body);
    return database.transaction(ctx.churchId, ctx.userId, async (client, member) => {
      await authorized(client, member, ctx.churchId, ctx.studyId, true);
      const row = (await client.query('SELECT * FROM cowriter_requests WHERE church_id=$1 AND id=$2 FOR UPDATE', [ctx.churchId, id])).rows[0] as StoredRequest;
      demand(row?.status === 'completed', 409, 'proposal_unavailable', 'A completed, unadopted proposal is required');
      const conv = await conversation(client, ctx.churchId, (await client.query('SELECT conversation_id FROM cowriter_requests WHERE church_id=$1 AND id=$2', [ctx.churchId, id])).rows[0].conversation_id, ctx.studyId);
      const reviewed = await source(client, ctx.churchId, conv);
      demand(reviewed && reviewed.id === row.source_id && reviewed.sha256 === row.source_hash, 409, 'source_changed', 'Reviewed source or saved study changed; generate a fresh proposal');
      const result = row.result as { proposal?: AIProposal };
      demand(result?.proposal?.workflow === 'study_draft', 422, 'proposal_required', 'Only a structured study proposal can be adopted');
      const budget = (await client.query('SELECT * FROM provider_budgets WHERE church_id=$1 FOR SHARE', [ctx.churchId])).rows[0];
      demand(`${budget.rights_confirmed ? budget.profile_version : 'demo-collaborator-v1'}:${hash(budget.rights_confirmed ? budget.profile : demoProfile)}` === row.profile_version, 409, 'profile_changed', 'Teaching profile changed; request a fresh proposal');
      const aggregate = await lockAggregate(client, ctx.churchId, ctx.studyId, 'content'); matchVersion(aggregate, request.headers['if-match']);
      demand(aggregate.head_revision_id === row.base_revision_id, 409, 'base_revision_changed', 'Draft changed; request a fresh proposal');
      const payload = structuredClone((await client.query('SELECT payload FROM revisions WHERE church_id=$1 AND id=$2', [ctx.churchId, aggregate.head_revision_id])).rows[0].payload);
      if (selection.fields) demand(selection.fields.every(path => result.proposal!.fields.some(field => field.path === path)), 422, 'field_unavailable', 'Select only fields included in this proposal');
      for (const field of result.proposal.fields) if (!selection.fields || selection.fields.includes(field.path as typeof studyFields[number])) payload[field.path === 'smsPreview' ? 'outboundPreview' : field.path] = field.suggestion;
      const updated = await saveRevision(client, aggregate, member, { baseRevisionId: row.base_revision_id, payload });
      await client.query("UPDATE cowriter_requests SET status='adopted' WHERE church_id=$1 AND id=$2", [ctx.churchId, id]);
      await audit(client, ctx.churchId, ctx.userId, 'cowriter.proposal_adopted', ctx.studyId, { requestId: id, revisionId: updated.headRevisionId, sourceId: row.source_id, sourceHash: row.source_hash });
      reply.header('ETag', updated.etag); return updated;
    });
  });
}
