import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import type { config } from '../infrastructure/config.js';
import { Database, requireCapability, type Membership } from '../infrastructure/database.js';
import { authenticate, csrf } from '../auth/routes.js';
import { demand } from './errors.js';
import { idempotentCommand, type CommandResult } from './commands.js';
import { aggregateDto, audit, createContent, etagFor, loadAggregate, lockAggregate, matchVersion, notify, requireEditor, revisionDto, verifyCanonical, type AggregateRow } from '../modules/editorial.js';
import { blankPlan, insertRevision } from '../modules/revisions.js';
import { saveRevision } from '../modules/save-revision.js';
import { resolveCivilTime } from '../integrations/time.js';
import { IANAZone } from 'luxon';
import { publishOccurrence } from '../workers/publication.js';
import { activeTheme, fallbackTokens } from '../modules/theme.js';
import { everPublished, lockStudy, matchSlotVersion, moveStudy, requireLifecycleAuthority, slotDto, slotEtag, terminateStudy, type SlotRow } from '../modules/study-lifecycle.js';

const uuid = z.string().uuid();
const paramsSchema = z.object({churchId:uuid,id:uuid.optional()});
const sermonSchema = z.object({title:z.string().min(1).max(500),preachedDate:z.iso.date(),speaker:z.string().max(500),passages:z.array(z.string().max(500)).max(100),notes:z.string().max(100000)}).strict();
const calendarSchema = z.object({localDate:z.iso.date(),localTime:z.string().regex(/^\d\d:\d\d$/),timeZone:z.string().max(100),assigneeIds:z.array(z.string().max(200)).max(100)});
const payloadRecord = (input: unknown) => input as Record<string,unknown>;

async function listMembers(client: PoolClient, churchId: string) {
  const result = await client.query('SELECT user_id,display_name,capabilities FROM memberships WHERE church_id=$1 AND active ORDER BY user_id',[churchId]);
  return result.rows.map(row=>({userId:row.user_id,displayName:row.display_name,capabilities:row.capabilities}));
}
async function listSermons(client: PoolClient, churchId: string) {
  const result = await client.query('SELECT * FROM sermons WHERE church_id=$1 ORDER BY preached_date DESC,created_at DESC',[churchId]);
  return result.rows.map(row=>({id:row.id,title:row.title,preachedDate:row.preached_date.toISOString().slice(0,10),speaker:row.speaker,passages:row.passages,notes:row.notes,createdAt:row.created_at}));
}
async function listSeries(client: PoolClient, churchId: string) {
  const result = await client.query(`SELECT series.*,ARRAY(SELECT sermon_id FROM series_sermons WHERE church_id=series.church_id AND series_id=series.id) AS sermon_ids FROM series WHERE church_id=$1 ORDER BY week_anchor DESC`,[churchId]);
  return result.rows.map(row=>({id:row.id,title:row.title,weekAnchor:row.week_anchor.toISOString().slice(0,10),timeZone:row.time_zone,sermonIds:row.sermon_ids}));
}
async function listSlots(client: PoolClient, churchId: string, seriesId?: string) {
  const result = await client.query(`SELECT slots.*,aggregates.id AS plan_id,EXISTS(SELECT 1 FROM publications JOIN aggregates content ON content.church_id=publications.church_id AND content.id=publications.content_id WHERE publications.church_id=slots.church_id AND content.slot_id=slots.id) AS ever_published FROM slots JOIN aggregates ON aggregates.church_id=slots.church_id AND aggregates.slot_id=slots.id AND aggregates.kind='plan' WHERE slots.church_id=$1 AND slots.deleted_at IS NULL AND slots.withdrawn_at IS NULL ${seriesId?'AND series_id=$2':''} ORDER BY local_date,slots.id`,[churchId,...(seriesId?[seriesId]:[])]);
  return result.rows.map(row=>slotDto(row,row.plan_id));
}
async function churchDto(client: PoolClient, churchId: string) {
  const row = (await client.query('SELECT * FROM churches WHERE id=$1',[churchId])).rows[0];
  const current = await activeTheme(client, churchId); const tokens = { ...fallbackTokens, ...current.tokens };
  return {id:row.id,slug:row.slug,name:row.name,timeZone:row.time_zone,readingPolicy:row.reading_policy,discussionsEnabled:row.discussions_enabled,appealContact:row.appeal_contact??null,theme:{mode:current.mode,primary:tokens.brand,accent:tokens.accent,surface:tokens.pageSurface,tokens,assetId:current.assetId,logoUrl:current.assetId?`/api/v1/churches/${churchId}/theme/logo/${current.assetId}/lockup`:null}};
}
async function listNotifications(client: PoolClient, churchId: string, userId: string) {
  const result = await client.query('SELECT * FROM notifications WHERE church_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 100',[churchId,userId]);
  return result.rows.map(row=>({id:row.id,type:row.type,resourceId:row.resource_id,readAt:row.read_at,createdAt:row.created_at}));
}
async function requireReadable(client: PoolClient, aggregate: AggregateRow, member: Membership) {
  requireCapability(member,'workspace:read');
  if (assignedReadOnly(member)) {
    const slot=(await client.query('SELECT assignee_ids FROM slots WHERE church_id=$1 AND id=$2',[aggregate.church_id,aggregate.slot_id])).rows[0];
    demand(slot?.assignee_ids.includes(member.userId),403,'not_assigned','Only assigned drafts are available to this contributor');
  }
}
function assignedReadOnly(member:Membership) {
  return member.capabilities.some(capability=>['plans:edit','content:edit'].includes(capability))&&!member.capabilities.some(capability=>['series:manage','settings:manage','admin:manage'].includes(capability));
}

export async function coreRoutes(app: FastifyInstance, database: Database, settings: ReturnType<typeof config>, clock: () => Date) {
  const prefix = '/v1/churches/:churchId';
  function get(path: string, action: (client:PoolClient,member:Membership,churchId:string,request:FastifyRequest,id?:string)=>Promise<unknown>, workspace = true) {
    app.get(prefix+path,async (request,reply)=>{
      const session = await authenticate(database,request,workspace?'contributor':'member');
      const {churchId,id} = paramsSchema.parse(request.params);
      return database.transaction(churchId,session.userId,async(client,member)=>{
        if(workspace) requireCapability(member,'workspace:read');
        const result = await action(client,member,churchId,request,id);
        if(result && typeof result==='object' && 'etag' in result) reply.header('ETag',String(result.etag));
        return result;
      },session);
    });
  }
  function post(path: string, action:(client:PoolClient,member:Membership,churchId:string,request:FastifyRequest,id?:string)=>Promise<CommandResult>, method:'POST'|'PUT'='POST',access:'member'|'contributor'='contributor') {
    app.route({method,url:prefix+path,handler:async(request,reply)=>{
      const session = await authenticate(database,request,access);csrf(request,session,settings.appOrigin);
      const {churchId,id} = paramsSchema.parse(request.params);
      const result = await database.transaction(churchId,session.userId,(client,member)=>idempotentCommand(client,request,churchId,session.userId,()=>action(client,member,churchId,request,id)),session);
      if(result.etag) reply.header('ETag',result.etag);
      return reply.code(result.status).send(result.body);
    }});
  }
  const aggregateResponse = async (client:PoolClient,aggregate:AggregateRow,status=200):Promise<CommandResult> => ({status,body:await aggregateDto(client,aggregate),etag:etagFor(aggregate)});

  get('/workspace',async(client,member,churchId)=>{
    const aggregates = (await client.query('SELECT aggregates.* FROM aggregates JOIN slots ON slots.church_id=aggregates.church_id AND slots.id=aggregates.slot_id WHERE aggregates.church_id=$1 AND slots.deleted_at IS NULL AND slots.withdrawn_at IS NULL ORDER BY aggregates.created_at',[churchId])).rows as AggregateRow[];
    const slots=await listSlots(client,churchId);
    const visibleSlots=assignedReadOnly(member)?slots.filter(slot=>slot.assigneeIds.includes(member.userId)):slots;
    const visibleSlotIds=new Set(visibleSlots.map(slot=>slot.id));
    const normalized=[];
    for(const aggregate of aggregates)if(visibleSlotIds.has(aggregate.slot_id))normalized.push(await aggregateDto(client,aggregate));
    return {church:await churchDto(client,churchId),members:await listMembers(client,churchId),sermons:await listSermons(client,churchId),series:await listSeries(client,churchId),slots:visibleSlots,plans:normalized.filter(item=>item.kind==='plan'),content:normalized.filter(item=>item.kind==='content'),notifications:await listNotifications(client,churchId,member.userId),integrations:[{provider:'ai',status:'disabled'},{provider:'planning_center',status:'disabled'},{provider:'sms',status:'disabled'}]};
  });
  get('/members',async(client,_member,churchId)=>({items:await listMembers(client,churchId)}));
  get('/sermons',async(client,_member,churchId)=>({items:await listSermons(client,churchId)}));
  get('/series',async(client,_member,churchId)=>({items:await listSeries(client,churchId)}));
  get('/series/:id/slots',async(client,_member,churchId,_request,id)=>{demand((await client.query('SELECT 1 FROM series WHERE church_id=$1 AND id=$2',[churchId,id])).rowCount,404,'not_found','Series not found');return {items:await listSlots(client,churchId,id)};});
  post('/sermons',async(client,member,churchId,request)=>{
    requireCapability(member,'sermons:create');const body = sermonSchema.parse(request.body);const id=randomUUID();
    await client.query('INSERT INTO sermons(church_id,id,title,preached_date,speaker,passages,notes) VALUES($1,$2,$3,$4,$5,$6,$7)',[churchId,id,body.title,body.preachedDate,body.speaker,JSON.stringify(body.passages),body.notes]);
    await client.query('INSERT INTO sources(church_id,id,sermon_id,kind,rights,provenance,payload) VALUES($1,$2,$3,$4,$5,$6,$7)',[churchId,randomUUID(),id,'manual_notes',{status:'church_authored'},{actorId:member.userId},{notes:body.notes,passages:body.passages}]);
    await audit(client,churchId,member.userId,'sermon.created',id);
    return {status:201,body:(await listSermons(client,churchId)).find(item=>item.id===id)};
  });
  post('/series',async(client,member,churchId,request)=>{
    requireCapability(member,'series:manage');const body=z.object({title:z.string().min(1).max(500),weekAnchor:z.iso.date(),timeZone:z.string(),sermonIds:z.array(uuid)}).strict().parse(request.body);const id=randomUUID();
    resolveCivilTime({localDate:body.weekAnchor,localTime:'12:00',zone:body.timeZone});
    for(const sermonId of body.sermonIds) demand((await client.query('SELECT 1 FROM sermons WHERE church_id=$1 AND id=$2',[churchId,sermonId])).rowCount,404,'not_found','Sermon not found');
    await client.query('INSERT INTO series(church_id,id,title,week_anchor,time_zone) VALUES($1,$2,$3,$4,$5)',[churchId,id,body.title,body.weekAnchor,body.timeZone]);
    for(const sermonId of body.sermonIds) await client.query('INSERT INTO series_sermons VALUES($1,$2,$3)',[churchId,id,sermonId]);
    await audit(client,churchId,member.userId,'series.created',id);
    return {status:201,body:{id,...body}};
  });
  post('/series/:id/slots',async(client,member,churchId,request,seriesId)=>{
    requireCapability(member,'series:manage');const body=calendarSchema.strict().parse(request.body);
    resolveCivilTime({localDate:body.localDate,localTime:body.localTime,zone:body.timeZone});
    demand((await client.query('SELECT 1 FROM series WHERE church_id=$1 AND id=$2',[churchId,seriesId])).rowCount,404,'not_found','Series not found');
    for(const userId of body.assigneeIds) demand((await client.query("SELECT 1 FROM memberships WHERE church_id=$1 AND user_id=$2 AND active AND 'plans:edit'=ANY(capabilities)",[churchId,userId])).rowCount,422,'invalid_assignee','Assignees must be active church contributors');
    demand(new Set(body.assigneeIds).size===body.assigneeIds.length,422,'invalid_assignee','Assignees must be unique');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`study-date:${churchId}:${body.localDate}`]);
    demand(!(await client.query('SELECT 1 FROM slots WHERE church_id=$1 AND local_date=$2 AND deleted_at IS NULL AND withdrawn_at IS NULL',[churchId,body.localDate])).rowCount,409,'date_conflict','A study already reserves this church date. Choose another date.');
    const slotId=randomUUID();const planId=randomUUID();
    await client.query('INSERT INTO slots(church_id,id,series_id,local_date,local_time,time_zone,assignee_ids) VALUES($1,$2,$3,$4,$5,$6,$7)',[churchId,slotId,seriesId,body.localDate,body.localTime,body.timeZone,body.assigneeIds]);
    await client.query("INSERT INTO aggregates(church_id,id,kind,slot_id) VALUES($1,$2,'plan',$3)",[churchId,planId,slotId]);
    const revisionId=await insertRevision(client,{churchId,aggregateId:planId,kind:'plan',number:1,authorId:member.userId,payload:blankPlan(),calendar:{localDate:body.localDate,localTime:body.localTime,timeZone:body.timeZone}});
    await client.query('UPDATE aggregates SET head_revision_id=$3 WHERE church_id=$1 AND id=$2',[churchId,planId,revisionId]);
    for(const userId of body.assigneeIds) await notify(client,churchId,userId,'assignment',planId);
    await audit(client,churchId,member.userId,'slot.created',slotId);
    const slot=(await client.query('SELECT * FROM slots WHERE church_id=$1 AND id=$2',[churchId,slotId])).rows[0] as SlotRow;
    return {status:201,body:slotDto(slot,planId),etag:slotEtag(slot)};
  });
  post('/slots/:id',async(client,member,churchId,request,id)=>{
    requireCapability(member,'series:manage');const body=calendarSchema.extend({assigneeIds:calendarSchema.shape.assigneeIds.optional()}).strict().parse(request.body);
    resolveCivilTime({localDate:body.localDate,localTime:body.localTime,zone:body.timeZone});
    const bodyResult=await moveStudy(client,member,churchId,id!,request.headers['if-match'],body);
    return {status:200,body:bodyResult,etag:bodyResult.slot.etag};
  },'PUT');
  for(const action of ['delete','withdraw'] as const) post(`/slots/:id/${action}`,async(client,member,churchId,request,id)=>{
    const body=z.object({reason:action==='withdraw'?z.string().trim().min(1).max(1000):z.string().trim().max(500).default('')}).strict().parse(request.body);
    const result=await terminateStudy(client,member,churchId,id!,request.headers['if-match'],body.reason,action);
    return {status:200,body:result,etag:result.etag};
  });
  get('/slots/:id/lifecycle',async(client,member,churchId,_request,id)=>{
    requireCapability(member,'studies:delete');
    const slot=(await client.query('SELECT * FROM slots WHERE church_id=$1 AND id=$2',[churchId,id])).rows[0] as SlotRow|undefined;
    demand(slot,404,'not_found','Study not found');
    requireLifecycleAuthority(slot,member);
    slot.ever_published=await everPublished(client,churchId,id!);
    const plan=(await client.query("SELECT id FROM aggregates WHERE church_id=$1 AND slot_id=$2 AND kind='plan'",[churchId,id])).rows[0];
    return slotDto(slot,plan?.id);
  });
  post('/slots/:id/hard-delete',async(client,member,churchId,request,id)=>{
    requireCapability(member,'admin:manage');
    const body=z.object({confirmation:z.literal(`PERMANENTLY DELETE ${id}`),reason:z.string().trim().min(1).max(1000)}).strict().parse(request.body);
    const receipt=(await client.query('SELECT id FROM study_purge_audit WHERE church_id=$1 AND study_id=$2',[churchId,id])).rows[0];
    if(receipt) return {status:200,body:{studyId:id,purged:true,irreversible:true,purgeAuditId:receipt.id,retainedHistory:false}};
    const {slot}=await lockStudy(client,churchId,id!);
    demand(slot.withdrawn_at,409,'withdrawal_required','Withdraw the published study before permanently deleting it');
    matchSlotVersion(slot,request.headers['if-match']);
    const running=await client.query("SELECT 1 FROM provider_jobs WHERE church_id=$1 AND kind='ai' AND status='running' AND payload->>'aggregateId' IN (SELECT id::text FROM aggregates WHERE church_id=$1 AND slot_id=$2) UNION ALL SELECT 1 FROM provider_send_intents WHERE church_id=$1 AND status IN ('submitting','submission_unknown') AND publication_id IN (SELECT publications.id FROM publications JOIN aggregates ON aggregates.church_id=publications.church_id AND aggregates.id=publications.content_id WHERE publications.church_id=$1 AND aggregates.slot_id=$2)",[churchId,id]);
    demand(!running.rowCount,409,'provider_work_in_flight','Reconcile in-flight provider work before permanently deleting this study');
    const purged=await client.query('SELECT purge_withdrawn_study($1,$2,$3,$4,$5) AS audit_id',[churchId,id,body.confirmation,body.reason,slot.lifecycle_version]);
    return {status:200,body:{studyId:id,purged:true,irreversible:true,purgeAuditId:purged.rows[0].audit_id,retainedHistory:false}};
  });

  for(const collection of ['plans','content']) {
    const kind=collection==='plans'?'plan':'content';
    get(`/${collection}/:id`,async(client,member,churchId,_request,id)=>{const aggregate=await loadAggregate(client,churchId,id!,kind);await requireReadable(client,aggregate,member);return aggregateDto(client,aggregate);});
    get(`/${collection}/:id/revisions`,async(client,member,churchId,_request,id)=>{const aggregate=await loadAggregate(client,churchId,id!,kind);await requireReadable(client,aggregate,member);return {items:(await client.query('SELECT * FROM revisions WHERE church_id=$1 AND aggregate_id=$2 ORDER BY number DESC',[churchId,id])).rows.map(revisionDto)};});
    get(`/${collection}/:id/revision-diff`,async(client,member,churchId,request,id)=>{
      const aggregate=await loadAggregate(client,churchId,id!,kind);await requireReadable(client,aggregate,member);const query=z.object({base:uuid,target:uuid}).parse(request.query);
      const revisions=await client.query('SELECT * FROM revisions WHERE church_id=$1 AND aggregate_id=$2 AND id=ANY($3::uuid[])',[churchId,id,[query.base,query.target]]);demand(revisions.rowCount===2||query.base===query.target&&revisions.rowCount===1,404,'not_found','Revision not found');
      return {base:revisionDto(revisions.rows.find(row=>row.id===query.base)),target:revisionDto(revisions.rows.find(row=>row.id===query.target))};
    });
    post(`/${collection}/:id/revisions`,async(client,member,churchId,request,id)=>{
      const aggregate=await lockAggregate(client,churchId,id!,kind);matchVersion(aggregate,request.headers['if-match']);
      const input=z.object({baseRevisionId:uuid,payload:z.unknown(),planApprovalId:uuid.nullable().optional()}).strict().parse(request.body);
      const body=await saveRevision(client,aggregate,member,input);return {status:201,body,etag:body.etag};
    });
    if(kind==='content') {
      get('/content/:id/review-request',async(client,member,churchId,_request,id)=>{
        const aggregate=await loadAggregate(client,churchId,id!,'content');
        await requireReadable(client,aggregate,member);
        const requestResult=await client.query(`SELECT r.*,m.display_name AS approver_name FROM study_review_requests r JOIN memberships m ON m.church_id=r.church_id AND m.user_id=r.approver_id WHERE r.church_id=$1 AND r.content_id=$2 ORDER BY r.created_at DESC LIMIT 1`,[churchId,id]);
        const approvers=(await listMembers(client,churchId)).filter(item=>item.userId!==member.userId&&item.capabilities.includes('workspace:read')&&item.capabilities.includes('content:approve'));
        const row=requestResult.rows[0];
        return {request:row?{id:row.id,contentId:row.content_id,revisionId:row.revision_id,revisionHash:row.revision_hash,requestedBy:row.requested_by,approverId:row.approver_id,approverName:row.approver_name,note:row.note,status:row.status,createdAt:row.created_at,resolvedAt:row.resolved_at}:null,approvers};
      });
      post('/content/:id/review-request',async(client,member,churchId,request,id)=>{
        const aggregate=await lockAggregate(client,churchId,id!,'content');
        matchVersion(aggregate,request.headers['if-match']);
        await requireEditor(client,aggregate,member);
        const body=z.object({revisionId:uuid,approverId:z.string().min(1).max(200),note:z.string().max(10000).default('')}).strict().parse(request.body);
        demand(['draft','changes_requested'].includes(aggregate.status),409,'invalid_transition','Approvers can only be assigned while the study is a draft or has requested changes');
        demand(body.revisionId===aggregate.head_revision_id,409,'revision_changed','Choose an approver for the current revision');
        const revision=(await client.query('SELECT * FROM revisions WHERE church_id=$1 AND id=$2',[churchId,body.revisionId])).rows[0];
        verifyCanonical(revision,aggregate);
        demand(body.approverId!==member.userId,422,'self_approval_forbidden','Choose another contributor as approver');
        demand((await client.query("SELECT 1 FROM memberships WHERE church_id=$1 AND user_id=$2 AND active AND 'workspace:read'=ANY(capabilities) AND 'content:approve'=ANY(capabilities)",[churchId,body.approverId])).rowCount,422,'invalid_approver','Reviewer must be an active church team member with approval permission');
        await client.query("UPDATE study_review_requests SET status='withdrawn',resolved_at=now() WHERE church_id=$1 AND content_id=$2 AND status='pending'",[churchId,id]);
        const requestId=randomUUID();
        await client.query('INSERT INTO study_review_requests(church_id,id,content_id,revision_id,revision_hash,requested_by,approver_id,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[churchId,requestId,id,revision.id,revision.hash,member.userId,body.approverId,body.note]);
        await notify(client,churchId,body.approverId,'review_requested',id!);
        await audit(client,churchId,member.userId,'content.approver_assigned',id!,{revisionId:revision.id,approverId:body.approverId});
        return {status:201,body:{id:requestId,contentId:id,revisionId:revision.id,revisionHash:revision.hash,requestedBy:member.userId,approverId:body.approverId,status:'pending',note:body.note}};
      });
    }
    post(`/${collection}/:id/submit`,async(client,member,churchId,request,id)=>{
      const aggregate=await lockAggregate(client,churchId,id!,kind);matchVersion(aggregate,request.headers['if-match']);await requireEditor(client,aggregate,member);
      const body=z.object({revisionId:uuid,approverId:z.string().min(1).max(200).optional(),note:z.string().max(10000).default('')}).strict().parse(request.body);demand(body.revisionId===aggregate.head_revision_id,409,'revision_changed','Submit the current revision');
      demand(['draft','changes_requested'].includes(aggregate.status),409,'invalid_transition','Only a draft can be submitted');
      const row=(await client.query('SELECT * FROM revisions WHERE church_id=$1 AND id=$2',[churchId,body.revisionId])).rows[0];verifyCanonical(row,aggregate);const payload=payloadRecord(row.payload);
      const fields=kind==='plan'?['title','learningObjective','discussionQuestion']:['title','body','reflection','discussionQuestion','application'];
      demand(fields.every(field=>typeof payload[field]==='string'&&String(payload[field]).trim()),422,'incomplete_draft','Complete all required fields before review');
      if(kind==='plan') demand(String((payload.primaryScripture as {reference:string}).reference).trim() && (payload.outline as string[]).some(point=>point.trim()),422,'incomplete_draft','Add primary Scripture and an outline');
      if(kind==='plan') await client.query("UPDATE aggregates SET status='approved',version=version+1 WHERE church_id=$1 AND id=$2",[churchId,id]);
      else {
        let reviewRequest=(await client.query("SELECT id,approver_id FROM study_review_requests WHERE church_id=$1 AND content_id=$2 AND revision_id=$3 AND status='pending'",[churchId,id,body.revisionId])).rows[0];
        if(body.approverId) {
          demand(body.approverId!==member.userId,422,'self_approval_forbidden','Choose another contributor as approver');
          demand((await client.query("SELECT 1 FROM memberships WHERE church_id=$1 AND user_id=$2 AND active AND 'workspace:read'=ANY(capabilities) AND 'content:approve'=ANY(capabilities)",[churchId,body.approverId])).rowCount,422,'invalid_approver','Reviewer must be an active church team member with approval permission');
          await client.query("UPDATE study_review_requests SET status='withdrawn',resolved_at=now() WHERE church_id=$1 AND content_id=$2 AND status='pending'",[churchId,id]);
          const requestId=randomUUID();
          await client.query('INSERT INTO study_review_requests(church_id,id,content_id,revision_id,revision_hash,requested_by,approver_id,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[churchId,requestId,id,row.id,row.hash,member.userId,body.approverId,body.note]);
          reviewRequest={id:requestId,approver_id:body.approverId};
          await audit(client,churchId,member.userId,'content.approver_assigned',id!,{revisionId:row.id,approverId:body.approverId});
        }
        demand(reviewRequest,422,'approver_required','Choose an approver before submitting this study for review');
        await client.query("UPDATE aggregates SET status='in_review',version=version+1 WHERE church_id=$1 AND id=$2",[churchId,id]);
        if(body.approverId) await notify(client,churchId,reviewRequest.approver_id,'review_requested',id!);
      }
      await audit(client,churchId,member.userId,`${kind}.submitted`,id!);
      return aggregateResponse(client,await loadAggregate(client,churchId,id!));
    });
    post(`/${collection}/:id/decisions`,async(client,member,churchId,request,id)=>{
      const aggregate=await lockAggregate(client,churchId,id!,kind);matchVersion(aggregate,request.headers['if-match']);requireCapability(member,kind==='plan'?'plans:approve':'content:approve');
      const body=z.object({revisionId:uuid,expectedHash:z.string().length(64),decision:z.enum(['approve','request_changes']),reason:z.string().max(10000)}).strict().parse(request.body);
      demand((aggregate.status==='in_review' || (kind==='plan' && aggregate.status==='approved')) && aggregate.head_revision_id===body.revisionId,409,'invalid_transition','Review must target the current submitted revision');
      const row=(await client.query('SELECT * FROM revisions WHERE church_id=$1 AND id=$2',[churchId,body.revisionId])).rows[0];verifyCanonical(row,aggregate);demand(body.expectedHash===row.hash,409,'hash_changed','The reviewed hash does not match');
      if(kind==='content') { const reviewRequest=(await client.query("SELECT * FROM study_review_requests WHERE church_id=$1 AND content_id=$2 AND revision_id=$3 AND approver_id=$4 AND status='pending'",[churchId,id,body.revisionId,member.userId])).rows[0]; demand(reviewRequest,403,'review_not_assigned','This study was not assigned to you for approval'); }
      const policy=(await client.query('SELECT self_approval FROM churches WHERE id=$1',[churchId])).rows[0];
      demand(row.author_id!==member.userId || policy.self_approval,403,'self_approval_forbidden','A different person must review this revision');
      let approvalId=null;
      if(body.decision==='approve') {approvalId=randomUUID();await client.query('INSERT INTO approvals(church_id,id,aggregate_id,revision_id,hash,approver_id,plan_approval_id,plan_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[churchId,approvalId,id,row.id,row.hash,member.userId,row.plan_approval_id,row.plan_hash]);}
      else demand(body.reason.trim(),422,'reason_required','Explain the requested changes');
      await client.query('INSERT INTO reviews(church_id,id,aggregate_id,revision_id,actor_id,decision,reason) VALUES($1,$2,$3,$4,$5,$6,$7)',[churchId,randomUUID(),id,row.id,member.userId,body.decision,body.reason]);
      if(kind==='content') await client.query("UPDATE study_review_requests SET status=$5,resolved_at=now() WHERE church_id=$1 AND content_id=$2 AND revision_id=$3 AND approver_id=$4 AND status='pending'",[churchId,id,body.revisionId,member.userId,body.decision==='approve'?'approved':'changes_requested']);
      await client.query('UPDATE aggregates SET status=$3,approval_id=$4,version=version+1 WHERE church_id=$1 AND id=$2',[churchId,id,body.decision==='approve'?'approved':'changes_requested',approvalId]);
      if(kind==='content'&&body.decision==='approve') {
        const calendar=row.calendar as {localDate:string;localTime:string;timeZone:string};
        const plannedAt=resolveCivilTime({localDate:calendar.localDate,localTime:calendar.localTime,zone:calendar.timeZone}).utc;
        if(new Date(plannedAt).getTime()<=clock().getTime()) {
          const scheduleId=randomUUID(); const deliveryAt=clock();
          await client.query('INSERT INTO schedules(church_id,id,content_id,revision_id,approval_id,local_date,local_time,time_zone,due_at,created_by,publication_mode) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[churchId,scheduleId,id,row.id,approvalId,calendar.localDate,calendar.localTime,calendar.timeZone,deliveryAt,member.userId,'manual_once']);
          await client.query("UPDATE aggregates SET status='scheduled',version=version+1 WHERE church_id=$1 AND id=$2",[churchId,id]);
          await audit(client,churchId,member.userId,'publication.approval_overrode_delivery_time',id!,{scheduleId,scheduledAt:plannedAt,deliveredAt:deliveryAt.toISOString()});
          await publishOccurrence(client,churchId,scheduleId,deliveryAt);
        }
      }
      await notify(client,churchId,row.author_id,body.decision,id!);await audit(client,churchId,member.userId,`${kind}.${body.decision}`,id!,{revisionId:row.id,hash:row.hash});
      return aggregateResponse(client,await loadAggregate(client,churchId,id!),201);
    });
    get(`/${collection}/:id/comments`,async(client,member,churchId,_request,id)=>{const aggregate=await loadAggregate(client,churchId,id!,kind);await requireReadable(client,aggregate,member);return {items:(await client.query('SELECT * FROM comments WHERE church_id=$1 AND aggregate_id=$2 ORDER BY created_at',[churchId,id])).rows.map(comment=>({id:comment.id,revisionId:comment.revision_id,authorId:comment.author_id,body:comment.body,fieldPath:comment.field_path,mentionIds:comment.mention_ids,createdAt:comment.created_at}))};});
    post(`/${collection}/:id/comments`,async(client,member,churchId,request,id)=>{
      requireCapability(member,'comments:write');const aggregate=await lockAggregate(client,churchId,id!,kind);await requireReadable(client,aggregate,member);
      const body=z.object({revisionId:uuid,body:z.string().trim().min(1).max(20000),fieldPath:z.string().max(200).optional(),mentionIds:z.array(z.string()).max(100).default([])}).strict().parse(request.body);
      demand((await client.query('SELECT 1 FROM revisions WHERE church_id=$1 AND id=$2 AND aggregate_id=$3',[churchId,body.revisionId,id])).rowCount,404,'not_found','Revision not found');
      for(const mentionId of body.mentionIds) demand((await client.query('SELECT 1 FROM memberships WHERE church_id=$1 AND user_id=$2 AND active',[churchId,mentionId])).rowCount,422,'invalid_mention','Mention an active church member');
      const commentId=randomUUID();const result=await client.query('INSERT INTO comments(church_id,id,aggregate_id,revision_id,author_id,body,field_path,mention_ids) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING created_at',[churchId,commentId,id,body.revisionId,member.userId,body.body,body.fieldPath ?? null,body.mentionIds]);
      for(const userId of body.mentionIds){await client.query('INSERT INTO mentions VALUES($1,$2,$3,$4)',[churchId,randomUUID(),commentId,userId]);await notify(client,churchId,userId,'mention',id!);}
      return {status:201,body:{id:commentId,...body,authorId:member.userId,createdAt:result.rows[0].created_at}};
    });
  }
  post('/plans/:id/content',async(client,member,churchId,request,id)=>{
    const aggregate=await lockAggregate(client,churchId,id!,'plan');matchVersion(aggregate,request.headers['if-match']);
    const body=z.object({planApprovalId:uuid.optional(),mode:z.enum(['manual','ai'])}).strict().parse(request.body);
    demand(body.mode==='manual',503,'provider_unavailable','Use the configured AI proposal workflow or create a manual draft');
    const content=await createContent(client,aggregate,member,body.planApprovalId);return {status:201,body:content,etag:content.etag};
  });
  for(const action of ['schedules','publish']) post(`/content/:id/${action}`,async(client,member,churchId,request,id)=>{
    requireCapability(member,'publication:schedule');const aggregate=await lockAggregate(client,churchId,id!,'content');matchVersion(aggregate,request.headers['if-match']);
    const base=z.object({revisionId:uuid,approvalId:uuid,localDate:z.iso.date().optional(),localTime:z.string().optional(),timeZone:z.string().optional(),destinationId:z.literal('web').optional(),offsetChoice:z.number().optional()}).strict().parse(request.body);
    if(action==='publish' && aggregate.status==='published' && aggregate.live_publication_id) return aggregateResponse(client,aggregate,201);
    demand(aggregate.status==='approved' && aggregate.head_revision_id===base.revisionId && aggregate.approval_id===base.approvalId,409,'approval_required','Schedule the current approved content revision');
    const row=(await client.query('SELECT * FROM revisions WHERE church_id=$1 AND id=$2',[churchId,base.revisionId])).rows[0];
    const calendar=row.calendar as {localDate:string;localTime:string;timeZone:string};
    if(action==='schedules') demand(base.localDate===calendar.localDate&&base.localTime===calendar.localTime&&base.timeZone===calendar.timeZone,409,'calendar_changed','Schedule must match the approved calendar intent');
    const due=resolveCivilTime({localDate:calendar.localDate,localTime:calendar.localTime,zone:calendar.timeZone,offsetMinutes:base.offsetChoice}).utc;
    const deliveryDue=action==='publish'?clock().toISOString():due;
    if(action==='schedules') demand(new Date(due).getTime()>clock().getTime(),409,'future_schedule_required','Choose an explicit future schedule after updating and approving the calendar');
    const existing=action==='publish' ? (await client.query("SELECT * FROM schedules WHERE church_id=$1 AND content_id=$2 AND revision_id=$3 AND approval_id=$4 ORDER BY created_at DESC LIMIT 1 FOR UPDATE",[churchId,id,base.revisionId,base.approvalId])).rows[0] : null;
    const scheduleId=existing?.id ?? randomUUID();
    if(!existing) await client.query('INSERT INTO schedules(church_id,id,content_id,revision_id,approval_id,local_date,local_time,time_zone,due_at,created_by,publication_mode) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[churchId,scheduleId,id,base.revisionId,base.approvalId,calendar.localDate,calendar.localTime,calendar.timeZone,deliveryDue,member.userId,action==='publish'?'manual_once':'timed']);
    else if(action==='publish' && existing.status!=='published') await client.query("UPDATE schedules SET publication_mode='manual_once',due_at=$3,status='pending' WHERE church_id=$1 AND id=$2",[churchId,scheduleId,deliveryDue]);
    await client.query("UPDATE aggregates SET status='scheduled',version=version+1 WHERE church_id=$1 AND id=$2",[churchId,id]);
    await audit(client,churchId,member.userId,action==='publish'?'publication.manual_due_now':'content.scheduled',id!,{scheduleId,scheduledAt:due,deliveryAt:deliveryDue,overrodeScheduledWindow:action==='publish'});
    if(action==='publish') {await publishOccurrence(client,churchId,scheduleId,clock());const published=await loadAggregate(client,churchId,id!);demand(published.status==='published',409,'delivery_worker_failed','The study was approved but could not be published. Try publishing again or contact an administrator.');return aggregateResponse(client,published,201);}
    const updated=await loadAggregate(client,churchId,id!);return {status:201,etag:etagFor(updated),body:{id:scheduleId,contentId:id,status:'pending',dueAt:due,...calendar,etag:etagFor(updated)}};
  });
  post('/content/:id/publish-once',async(client,member,churchId,request,id)=>{
    requireCapability(member,'publication:schedule');
    const aggregate=await lockAggregate(client,churchId,id!,'content');matchVersion(aggregate,request.headers['if-match']);
    const body=z.object({revisionId:uuid,approvalId:uuid}).strict().parse(request.body);
    if(aggregate.status==='published' && aggregate.live_publication_id) return aggregateResponse(client,aggregate,201);
    demand(['approved','scheduled'].includes(aggregate.status),409,'approval_required','Only approved content can be delivered once published');
    demand(aggregate.head_revision_id===body.revisionId&&aggregate.approval_id===body.approvalId,409,'revision_changed','Deliver the current approved revision');
    let schedule=(await client.query("SELECT * FROM schedules WHERE church_id=$1 AND content_id=$2 AND revision_id=$3 AND approval_id=$4 AND status IN ('pending','needs_staff_review','blocked_approval') ORDER BY created_at DESC LIMIT 1 FOR UPDATE",[churchId,id,body.revisionId,body.approvalId])).rows[0];
    const now=clock();
    if (!schedule) {
      const revision=(await client.query('SELECT calendar FROM revisions WHERE church_id=$1 AND id=$2',[churchId,body.revisionId])).rows[0];
      demand(revision,404,'not_found','Approved study revision not found');
      const calendar=revision.calendar as {localDate:string;localTime:string;timeZone:string};
      const scheduleId=randomUUID();
      await client.query('INSERT INTO schedules(church_id,id,content_id,revision_id,approval_id,local_date,local_time,time_zone,due_at,created_by,publication_mode) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[churchId,scheduleId,id,body.revisionId,body.approvalId,calendar.localDate,calendar.localTime,calendar.timeZone,now,member.userId,'manual_once']);
      schedule=(await client.query('SELECT * FROM schedules WHERE church_id=$1 AND id=$2 FOR UPDATE',[churchId,scheduleId])).rows[0];
    }
    await client.query("UPDATE schedules SET publication_mode='manual_once',due_at=$3,status='pending' WHERE church_id=$1 AND id=$2",[churchId,schedule.id,now]);
    await client.query("UPDATE aggregates SET status='scheduled',version=version+1 WHERE church_id=$1 AND id=$2",[churchId,id]);
    await audit(client,churchId,member.userId,'publication.manual_once_requested',id!,{scheduleId:schedule.id,revisionId:body.revisionId});
    await publishOccurrence(client,churchId,schedule.id,now);
    const published=await loadAggregate(client,churchId,id!);demand(published.status==='published',409,'delivery_worker_failed','The study was approved but could not be published. Try publishing again or contact an administrator.');
    return aggregateResponse(client,published,201);
  });
  get('/schedules',async(client,_member,churchId)=>({items:(await client.query('SELECT * FROM schedules WHERE church_id=$1 ORDER BY due_at',[churchId])).rows.map(row=>({id:row.id,contentId:row.content_id,status:row.status,dueAt:row.due_at,localDate:row.local_date.toISOString().slice(0,10),localTime:row.local_time,timeZone:row.time_zone}))}));
  post('/schedules/:id/cancel',async(client,member,churchId,request,id)=>{
    requireCapability(member,'publication:schedule');const result=await client.query('SELECT content_id FROM schedules WHERE church_id=$1 AND id=$2',[churchId,id]);demand(result.rowCount,404,'not_found','Schedule not found');
    const aggregate=await lockAggregate(client,churchId,result.rows[0].content_id,'content');matchVersion(aggregate,request.headers['if-match']);
    const schedule=(await client.query('SELECT * FROM schedules WHERE church_id=$1 AND id=$2 FOR UPDATE',[churchId,id])).rows[0];demand(schedule.status==='pending',409,'dispatch_started','The occurrence is no longer pending');
    await client.query("UPDATE schedules SET status='cancelled' WHERE church_id=$1 AND id=$2",[churchId,id]);await client.query("UPDATE aggregates SET status='approved',version=version+1 WHERE church_id=$1 AND id=$2",[churchId,aggregate.id]);
    await audit(client,churchId,member.userId,'schedule.cancelled',id!);return aggregateResponse(client,await loadAggregate(client,churchId,aggregate.id));
  });
  post('/content/:id/withdraw',async(client,member,churchId,request,id)=>{
    requireCapability(member,'studies:delete');
    const aggregate=(await client.query("SELECT * FROM aggregates WHERE church_id=$1 AND id=$2 AND kind='content'",[churchId,id])).rows[0] as AggregateRow|undefined;
    demand(aggregate,404,'not_found','Study not found');
    const body=z.object({reason:z.string().trim().min(1).max(1000)}).strict().parse(request.body);
    const {slot,content}=await lockStudy(client,churchId,aggregate.slot_id);
    if(!slot.withdrawn_at) matchVersion(content.find(item=>item.id===id)!,request.headers['if-match']);
    const result=await terminateStudy(client,member,churchId,aggregate.slot_id,slotEtag(slot),body.reason,'withdraw');
    return {status:200,body:result,etag:result.etag};
  });
  get('/notifications',async(client,member,churchId)=>({items:await listNotifications(client,churchId,member.userId)}),false);
  post('/notifications/:id/read',async(client,member,churchId,_request,id)=>{const result=await client.query('UPDATE notifications SET read_at=now() WHERE church_id=$1 AND id=$2 AND user_id=$3 RETURNING id',[churchId,id,member.userId]);demand(result.rowCount,404,'not_found','Notification not found');return {status:200,body:{id,read:true}};});
  get('/settings',async(client,member,churchId)=>{demand(member.capabilities.includes('settings:manage')||member.capabilities.includes('theme:manage'),403,'forbidden','Church settings access is required');return churchDto(client,churchId);});
  post('/settings',async(client,member,churchId,request)=>{demand(member.capabilities.includes('settings:manage')||member.capabilities.includes('theme:manage'),403,'forbidden','Church settings access is required');const body=z.object({name:z.string().trim().min(1).max(200).optional(),readingPolicy:z.enum(['public','members']).optional(),discussionsEnabled:z.boolean().optional(),timeZone:z.string().max(100).optional(),appealContact:z.string().trim().max(500).nullable().optional(),theme:z.object({mode:z.enum(['light','dark','system']),primary:z.string().regex(/^#[0-9a-fA-F]{6}$/),accent:z.string().regex(/^#[0-9a-fA-F]{6}$/),surface:z.string().regex(/^#[0-9a-fA-F]{6}$/)}).strict().optional()}).strict().parse(request.body);if(body.timeZone)demand(IANAZone.isValidZone(body.timeZone),422,'invalid_time_zone','Use a valid IANA timezone');if(body.name!==undefined||body.readingPolicy!==undefined||body.discussionsEnabled!==undefined||body.timeZone!==undefined||body.appealContact!==undefined)requireCapability(member,'settings:manage');const current=(await client.query('SELECT name,reading_policy,discussions_enabled,time_zone,appeal_contact,theme FROM churches WHERE id=$1',[churchId])).rows[0];demand(body.readingPolicy===undefined||body.readingPolicy===current.reading_policy,409,'public_review_required','Use Public study access to review and enable public reading');await client.query('UPDATE churches SET name=$2,reading_policy=$3,discussions_enabled=$4,time_zone=$5,appeal_contact=$6,theme=$7 WHERE id=$1',[churchId,body.name??current.name,current.reading_policy,body.discussionsEnabled??current.discussions_enabled,body.timeZone??current.time_zone,body.appealContact!==undefined?body.appealContact:current.appeal_contact,body.theme??current.theme]);await audit(client,churchId,member.userId,'church.settings_changed',churchId,{nameChanged:body.name!==undefined,defaultTimeZone:body.timeZone??null,themeChanged:body.theme!==undefined,existingApprovedCalendarsChanged:false});return {status:200,body:await churchDto(client,churchId)};});
  get('/delivery',async(client,member,churchId)=>{requireCapability(member,'publication:schedule');return {items:(await client.query('SELECT id,status,channel,publication_id,not_before FROM delivery WHERE church_id=$1',[churchId])).rows,providerStatus:'disabled',reason:'External outreach requires explicit provider activation, registration and consent review'};});
  get('/audit',async(client,member,churchId)=>{requireCapability(member,'audit:read');return {items:(await client.query('SELECT * FROM audit WHERE church_id=$1 ORDER BY created_at DESC LIMIT 200',[churchId])).rows.map(row=>({id:row.id,actorId:row.actor_id,action:row.action,resourceId:row.resource_id,metadata:row.metadata,createdAt:row.created_at}))};});
  get('/studies',async(client,_member,churchId)=>({items:await publishedStudies(client,churchId)}),false);
  get('/studies/:id',async(client,_member,churchId,_request,id)=>{const item=(await publishedStudies(client,churchId,id))[0];demand(item,404,'not_found','Study not found');return item;},false);
  post('/studies/:id/my-reaction',async(client,member,churchId,request,id)=>{
    await client.query('SELECT aggregates.id FROM publications JOIN aggregates ON aggregates.church_id=publications.church_id AND aggregates.id=publications.content_id WHERE publications.church_id=$1 AND publications.id=$2 FOR SHARE OF aggregates',[churchId,id]);
    demand((await publishedStudies(client,churchId,id)).length,404,'not_found','Study not found');const body=z.object({type:z.enum(['thankful','encouraged','praying','like','fire']).nullable()}).strict().parse(request.body);
    if(body.type)demand(!(await client.query('SELECT 1 FROM participation_restrictions WHERE church_id=$1 AND user_id=$2 AND restricted_until>now()',[churchId,member.userId])).rowCount,403,'participation_restricted','Your participation is restricted; contact the church using its appeal contact');
    if(body.type) await client.query('INSERT INTO reactions(church_id,id,publication_id,user_id,type) VALUES($1,$2,$3,$4,$5) ON CONFLICT(church_id,publication_id,user_id) DO UPDATE SET type=excluded.type',[churchId,randomUUID(),id,member.userId,body.type]);
    else await client.query('DELETE FROM reactions WHERE church_id=$1 AND publication_id=$2 AND user_id=$3',[churchId,id,member.userId]);return {status:200,body:{type:body.type}};
  },'PUT','member');
  app.get('/v1/public/churches/:slug/studies',async(request)=>publicRead(request));
  app.get('/v1/public/churches/:slug/studies/:id',async(request)=>publicRead(request));
  async function publicRead(request:FastifyRequest) {
    const params=z.object({slug:z.string().max(100),id:uuid.optional()}).parse(request.params);const lookup=await database.pool.query('SELECT * FROM public_church($1)',[params.slug]);demand(lookup.rowCount,404,'not_found','Church not found');
    const client=await database.pool.connect();try{await client.query('BEGIN');await client.query("SELECT set_config('app.church_id',$1,true)",[lookup.rows[0].id]);const items=await publishedStudies(client,lookup.rows[0].id,params.id);await client.query('COMMIT');if(params.id){demand(items[0],404,'not_found','Study not found');return items[0];}return {items};}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }
}

export async function publishedStudies(client:PoolClient,churchId:string,id?:string) {
  const result=await client.query(`SELECT publications.id,publications.content_id,publications.published_at,revisions.payload FROM publications JOIN aggregates ON aggregates.church_id=publications.church_id AND aggregates.id=publications.content_id AND aggregates.live_publication_id=publications.id JOIN slots ON slots.church_id=aggregates.church_id AND slots.id=aggregates.slot_id JOIN revisions ON revisions.church_id=publications.church_id AND revisions.id=publications.revision_id WHERE publications.church_id=$1 AND slots.deleted_at IS NULL AND slots.withdrawn_at IS NULL ${id?'AND publications.id=$2':''} ORDER BY published_at DESC,publications.id DESC`,[churchId,...(id?[id]:[])]);
  return result.rows.map(row=>({id:row.id,contentId:row.content_id,payload:row.payload,publishedAt:row.published_at,churchId}));
}
