import type { PoolClient } from 'pg';
import { ApiError, demand } from '../api/errors.js';
import { requireCapability, type Membership } from '../infrastructure/database.js';
import { aggregateDto, audit, loadAggregate, type AggregateRow } from './editorial.js';
import { canonical, insertRevision } from './revisions.js';

export interface SlotRow {
  church_id:string; id:string; series_id:string; local_date:Date; local_time:string; time_zone:string;
  assignee_ids:string[]; lifecycle_version:number; deleted_at:Date|null; deleted_by:string|null;
  deletion_reason:string|null; withdrawn_at:Date|null; withdrawn_by:string|null; ever_published?:boolean;
}
export const slotEtag = (slot:SlotRow) => `"slot:${slot.id}:${slot.lifecycle_version}"`;
export function requireLifecycleAuthority(slot:SlotRow,member:Membership) {
  requireCapability(member,'studies:delete');
  if(!member.capabilities.some(capability=>['series:manage','settings:manage','admin:manage'].includes(capability))) demand(slot.assignee_ids.includes(member.userId),403,'not_assigned','Only assigned studies are available to this contributor');
}
export function slotDto(slot:SlotRow,planId?:string) {
  return {id:slot.id,seriesId:slot.series_id,localDate:slot.local_date.toISOString().slice(0,10),localTime:slot.local_time,timeZone:slot.time_zone,assigneeIds:slot.assignee_ids,planId,etag:slotEtag(slot),lifecycleVersion:slot.lifecycle_version,everPublished:slot.ever_published??false,deleted:Boolean(slot.deleted_at),deletedAt:slot.deleted_at,deletedBy:slot.deleted_by,deletionReason:slot.deletion_reason,withdrawn:Boolean(slot.withdrawn_at),withdrawnAt:slot.withdrawn_at,withdrawnBy:slot.withdrawn_by};
}
export function matchSlotVersion(slot:SlotRow,expected?:string,plan?:AggregateRow) {
  demand(expected,428,'precondition_required','If-Match is required');
  if(expected===slotEtag(slot)) return;
  if(plan && expected===`"${plan.id}:${plan.version}"`) return;
  throw new ApiError(412,'revision_conflict','The study changed; refresh before trying again',{etag:slotEtag(slot)});
}
export async function lockStudy(client:PoolClient,churchId:string,studyId:string) {
  const locator=(await client.query("SELECT id FROM aggregates WHERE church_id=$1 AND slot_id=$2 AND kind='plan'",[churchId,studyId])).rows[0];
  demand(locator,404,'not_found','Study not found');
  const plan=(await client.query("SELECT * FROM aggregates WHERE church_id=$1 AND id=$2 AND kind='plan' FOR UPDATE",[churchId,locator.id])).rows[0] as AggregateRow|undefined;
  demand(plan,404,'not_found','Study not found');
  const content=(await client.query("SELECT * FROM aggregates WHERE church_id=$1 AND slot_id=$2 AND kind='content' ORDER BY id FOR UPDATE",[churchId,studyId])).rows as AggregateRow[];
  const slot=(await client.query('SELECT * FROM slots WHERE church_id=$1 AND id=$2 FOR UPDATE',[churchId,studyId])).rows[0] as SlotRow|undefined;
  demand(slot,404,'not_found','Study not found');
  slot.ever_published=await everPublished(client,churchId,studyId);
  return {plan,content,slot};
}
export async function everPublished(client:PoolClient,churchId:string,studyId:string) {
  return Boolean((await client.query('SELECT 1 FROM publications JOIN aggregates ON aggregates.church_id=publications.church_id AND aggregates.id=publications.content_id WHERE publications.church_id=$1 AND aggregates.slot_id=$2 LIMIT 1',[churchId,studyId])).rowCount);
}
export async function cancelStudyWork(client:PoolClient,churchId:string,aggregateIds:string[]) {
  let cancelledPendingWork=0;
  const schedules=await client.query("UPDATE schedules SET status='cancelled' WHERE church_id=$1 AND content_id=ANY($2::uuid[]) AND status NOT IN ('published','cancelled') RETURNING id",[churchId,aggregateIds]);
  cancelledPendingWork+=schedules.rowCount??0;
  const publications='SELECT id FROM publications WHERE church_id=$1 AND content_id=ANY($2::uuid[])';
  const delivery=await client.query(`UPDATE delivery SET status='cancelled' WHERE church_id=$1 AND publication_id IN (${publications}) AND status IN ('pending','queued','deferred','provider_disabled') RETURNING id`,[churchId,aggregateIds]);
  cancelledPendingWork+=delivery.rowCount??0;
  const intents=await client.query(`UPDATE provider_send_intents SET status='cancelled' WHERE church_id=$1 AND publication_id IN (${publications}) AND status IN ('pending','deferred','hold_unknown_zone','provider_disabled') RETURNING id`,[churchId,aggregateIds]);
  cancelledPendingWork+=intents.rowCount??0;
  const dispatched=(await client.query(`SELECT count(*)::integer AS count FROM provider_send_intents WHERE church_id=$1 AND publication_id IN (${publications}) AND (provider_sid IS NOT NULL OR status IN ('submitting','submission_unknown','accepted','queued','sending','sent','delivered','undelivered','reconciliation_required'))`,[churchId,aggregateIds])).rows[0].count as number;
  await client.query("UPDATE study_review_requests SET status='withdrawn',resolved_at=now() WHERE church_id=$1 AND content_id=ANY($2::uuid[]) AND status='pending'",[churchId,aggregateIds]);
  const jobs=await client.query("UPDATE provider_jobs SET status='cancelled',finished_at=now() WHERE church_id=$1 AND kind='ai' AND payload->>'aggregateId'=ANY($2::text[]) AND status='pending' RETURNING reservation,budget_period",[churchId,aggregateIds]);
  for(const job of jobs.rows) if(job.reservation) await client.query('UPDATE provider_budgets SET reserved_tokens=reserved_tokens-$2 WHERE church_id=$1 AND period=$3 AND reserved_tokens>=$2',[churchId,job.reservation,job.budget_period]);
  cancelledPendingWork+=jobs.rowCount??0;
  await client.query("UPDATE outbox SET status='cancelled' WHERE church_id=$1 AND status IN ('pending','provider_disabled') AND (resource_id=ANY($2::uuid[]) OR resource_id IN (SELECT id FROM publications WHERE church_id=$1 AND content_id=ANY($2::uuid[])) OR resource_id IN (SELECT id FROM schedules WHERE church_id=$1 AND content_id=ANY($2::uuid[])))",[churchId,aggregateIds]);
  return {cancelledPendingWork,alreadyDispatched:dispatched};
}
export async function terminateStudy(client:PoolClient,member:Membership,churchId:string,studyId:string,expected:string|undefined,reason:string,mode:'delete'|'withdraw') {
  requireCapability(member,'studies:delete');
  const {slot,plan,content}=await lockStudy(client,churchId,studyId);
  requireLifecycleAuthority(slot,member);
  const published=await everPublished(client,churchId,studyId);
  if(mode==='delete') demand(!published,409,'published_study_requires_withdrawal','A study that has ever been published must be withdrawn; ordinary deletion is prohibited');
  else demand(published,409,'publication_required','Only a previously published study can be withdrawn');
  if(mode==='delete'?slot.deleted_at:slot.withdrawn_at) return {studyId,deleted:Boolean(slot.deleted_at),deletedAt:slot.deleted_at,withdrawn:Boolean(slot.withdrawn_at),withdrawnAt:slot.withdrawn_at,etag:slotEtag(slot),cancelledPendingWork:0,alreadyDispatched:0,retainedHistory:true};
  matchSlotVersion(slot,expected);
  const cancellation=await cancelStudyWork(client,churchId,[plan.id,...content.map(aggregate=>aggregate.id)]);
  await client.query('DELETE FROM notifications WHERE church_id=$1 AND (resource_id=$2 OR resource_id IN (SELECT id FROM aggregates WHERE church_id=$1 AND slot_id=$2) OR resource_id IN (SELECT publications.id FROM publications JOIN aggregates ON aggregates.church_id=publications.church_id AND aggregates.id=publications.content_id WHERE publications.church_id=$1 AND aggregates.slot_id=$2) OR resource_id IN (SELECT schedules.id FROM schedules JOIN aggregates ON aggregates.church_id=schedules.church_id AND aggregates.id=schedules.content_id WHERE schedules.church_id=$1 AND aggregates.slot_id=$2))',[churchId,studyId]);
  const updated=(await client.query(`UPDATE slots SET ${mode==='delete'?'deleted_at=now(),deleted_by=$3':'withdrawn_at=now(),withdrawn_by=$3'},deletion_reason=$4,lifecycle_version=lifecycle_version+1 WHERE church_id=$1 AND id=$2 RETURNING *`,[churchId,studyId,member.userId,reason])).rows[0] as SlotRow;
  await client.query("UPDATE aggregates SET live_publication_id=NULL,status='cancelled',version=version+1 WHERE church_id=$1 AND slot_id=$2",[churchId,studyId]);
  await audit(client,churchId,member.userId,mode==='delete'?'study.deleted':'study.withdrawn',studyId,{reason,...cancellation,retainedHistory:true});
  return {studyId,deleted:Boolean(updated.deleted_at),deletedAt:updated.deleted_at,withdrawn:Boolean(updated.withdrawn_at),withdrawnAt:updated.withdrawn_at,etag:slotEtag(updated),...cancellation,retainedHistory:true};
}
export async function moveStudy(client:PoolClient,member:Membership,churchId:string,studyId:string,expected:string|undefined,input:{localDate:string;localTime:string;timeZone:string;assigneeIds?:string[]}) {
  requireCapability(member,'series:manage');
  const {slot,plan,content}=await lockStudy(client,churchId,studyId);
  demand(!slot.deleted_at&&!slot.withdrawn_at,404,'not_found','Study not found');
  matchSlotVersion(slot,expected,plan);
  const assigneeIds=input.assigneeIds??slot.assignee_ids;
  for(const userId of assigneeIds) demand((await client.query("SELECT 1 FROM memberships WHERE church_id=$1 AND user_id=$2 AND active AND ('plans:edit'=ANY(capabilities) OR 'content:edit'=ANY(capabilities))",[churchId,userId])).rowCount,422,'invalid_assignee','Assignees must be active church contributors');
  demand(new Set(assigneeIds).size===assigneeIds.length,422,'invalid_assignee','Assignees must be unique');
  const calendar={localDate:input.localDate,localTime:input.localTime,timeZone:input.timeZone};
  const changed=input.localDate!==slot.local_date.toISOString().slice(0,10)||input.localTime!==slot.local_time||input.timeZone!==slot.time_zone;
  const assignmentChanged=canonical([...assigneeIds].sort())!==canonical([...slot.assignee_ids].sort());
  if(changed) {
    demand(!await everPublished(client,churchId,studyId),409,'published_study_date_immutable','Published study dates cannot be changed; create a new study');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`study-date:${churchId}:${input.localDate}`]);
    demand(!(await client.query('SELECT 1 FROM slots WHERE church_id=$1 AND local_date=$2 AND id<>$3 AND deleted_at IS NULL AND withdrawn_at IS NULL',[churchId,input.localDate,studyId])).rowCount,409,'date_conflict','A study already reserves this church date. Choose another date.');
    await cancelStudyWork(client,churchId,[plan.id,...content.map(aggregate=>aggregate.id)]);
    for(const aggregate of [plan,...content]) {
      const previous=(await client.query('SELECT * FROM revisions WHERE church_id=$1 AND id=$2',[churchId,aggregate.head_revision_id])).rows[0];
      const revisionId=await insertRevision(client,{churchId,aggregateId:aggregate.id,kind:aggregate.kind,number:previous.number+1,authorId:member.userId,payload:previous.payload,calendar,planApprovalId:previous.plan_approval_id,planHash:previous.plan_hash,sourceSnapshot:previous.source_snapshot??[]});
      await client.query("UPDATE aggregates SET head_revision_id=$3,approval_id=NULL,status='draft',version=version+1 WHERE church_id=$1 AND id=$2",[churchId,aggregate.id,revisionId]);
    }
  }
  let updated=slot;
  if(changed||assignmentChanged) {
    updated=(await client.query('UPDATE slots SET local_date=$3,local_time=$4,time_zone=$5,assignee_ids=$6,lifecycle_version=lifecycle_version+1 WHERE church_id=$1 AND id=$2 RETURNING *',[churchId,studyId,input.localDate,input.localTime,input.timeZone,assigneeIds])).rows[0] as SlotRow;
    updated.ever_published=slot.ever_published;
    if(assignmentChanged&&!changed) await client.query('UPDATE aggregates SET version=version+1 WHERE church_id=$1 AND id=$2',[churchId,plan.id]);
    await audit(client,churchId,member.userId,'slot.changed',studyId,{calendarChanged:changed,assignmentChanged});
  }
  return {slot:slotDto(updated,plan.id),plan:await aggregateDto(client,await loadAggregate(client,churchId,plan.id)),content:await Promise.all(content.map(async aggregate=>aggregateDto(client,await loadAggregate(client,churchId,aggregate.id))))};
}
