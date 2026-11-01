import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { demand } from '../api/errors.js';
import { requireCapability, type Membership } from '../infrastructure/database.js';
import { blankContent, canonical, hash, insertRevision } from './revisions.js';

export interface AggregateRow {
  church_id: string; id: string; kind: 'plan'|'content'; slot_id: string; plan_id: string|null;
  head_revision_id: string; approval_id: string|null; live_publication_id: string|null; status: string;
  version: number; created_at: Date;
}
export const etagFor = (aggregate: AggregateRow) => `"${aggregate.id}:${aggregate.version}"`;
export async function loadAggregate(client: PoolClient, churchId: string, id: string, kind?: string, lock = false): Promise<AggregateRow> {
  const result = await client.query(`SELECT * FROM aggregates WHERE church_id=$1 AND id=$2 ${kind ? 'AND kind=$3' : ''} ${lock ? 'FOR UPDATE' : ''}`,[churchId,id,...(kind?[kind]:[])]);
  demand(result.rowCount,404,'not_found','Resource not found');
  const slot=await client.query('SELECT 1 FROM slots WHERE church_id=$1 AND id=$2 AND deleted_at IS NULL AND withdrawn_at IS NULL',[churchId,result.rows[0].slot_id]);
  demand(slot.rowCount,404,'not_found','Resource not found');
  return result.rows[0];
}
export async function lockAggregate(client: PoolClient, churchId: string, id: string, kind: string) {
  const current = await loadAggregate(client,churchId,id,kind);
  if (current.plan_id) await loadAggregate(client,churchId,current.plan_id,'plan',true);
  return loadAggregate(client,churchId,id,kind,true);
}
export async function aggregateDto(client: PoolClient, aggregate: AggregateRow) {
  const revision = await client.query('SELECT * FROM revisions WHERE church_id=$1 AND id=$2',[aggregate.church_id,aggregate.head_revision_id]);
  return {id:aggregate.id,kind:aggregate.kind,slotId:aggregate.slot_id,planId:aggregate.plan_id,status:aggregate.status,version:aggregate.version,etag:etagFor(aggregate),headRevisionId:aggregate.head_revision_id,head:revisionDto(revision.rows[0]),approvalId:aggregate.approval_id,livePublicationId:aggregate.live_publication_id,createdAt:aggregate.created_at};
}
export function revisionDto(row: {id:string;number:number;hash:string;author_id:string;payload:unknown;calendar:unknown;plan_approval_id:string|null;created_at:Date;source_snapshot?:unknown}) {
  return {id:row.id,number:row.number,hash:row.hash,authorId:row.author_id,payload:row.payload,calendar:row.calendar,planApprovalId:row.plan_approval_id,sourceSnapshot:row.source_snapshot??null,createdAt:row.created_at};
}
export function matchVersion(aggregate: AggregateRow, expected?: string) {
  demand(expected,428,'precondition_required','If-Match is required');
  if (expected!==etagFor(aggregate)) {
    const details = {etag:etagFor(aggregate),currentRevisionId:aggregate.head_revision_id,diffUrl:`/v1/churches/${aggregate.church_id}/${aggregate.kind==='plan'?'plans':'content'}/${aggregate.id}/revisions`};
    throw Object.assign(new Error('A newer version exists'),{statusCode:412,code:'revision_conflict',details});
  }
}
export async function requireEditor(client: PoolClient, aggregate: AggregateRow, member: Membership) {
  requireCapability(member,aggregate.kind==='plan'?'plans:edit':'content:edit');
  const slot = await client.query('SELECT assignee_ids FROM slots WHERE church_id=$1 AND id=$2',[aggregate.church_id,aggregate.slot_id]);
  demand(slot.rows[0].assignee_ids.includes(member.userId),403,'not_assigned','Only assigned contributors can edit this day');
}
export async function audit(client: PoolClient, churchId: string, actorId: string, action: string, resourceId: string, metadata: unknown = {}) {
  await client.query('INSERT INTO audit(church_id,id,actor_id,action,resource_id,metadata) VALUES($1,$2,$3,$4,$5,$6)',[churchId,randomUUID(),actorId,action,resourceId,metadata]);
}
export async function notify(client: PoolClient, churchId: string, userId: string, type: string, resourceId: string) {
  await client.query('INSERT INTO notifications(church_id,id,user_id,type,resource_id) VALUES($1,$2,$3,$4,$5)',[churchId,randomUUID(),userId,type,resourceId]);
}
export async function cancelPending(client: PoolClient, aggregate: AggregateRow) {
  if (aggregate.kind==='plan') {
    return;
  } else {
    await client.query("UPDATE schedules SET status='cancelled' WHERE church_id=$1 AND content_id=$2 AND status='pending'",[aggregate.church_id,aggregate.id]);
    await cancelDelivery(client,aggregate.church_id,aggregate.id);
  }
}
async function cancelDelivery(client: PoolClient,churchId:string,contentId:string) {
  await client.query("UPDATE delivery SET status='cancelled' WHERE church_id=$1 AND publication_id IN (SELECT id FROM publications WHERE church_id=$1 AND content_id=$2) AND status IN ('pending','queued','deferred','provider_disabled')",[churchId,contentId]);
  const exists=await client.query("SELECT to_regclass('public.provider_send_intents') AS relation");
  if(exists.rows[0].relation) await client.query("UPDATE provider_send_intents SET status='cancelled' WHERE church_id=$1 AND publication_id IN (SELECT id FROM publications WHERE church_id=$1 AND content_id=$2) AND status IN ('pending','deferred','hold_unknown_zone','provider_disabled')",[churchId,contentId]);
}
export async function currentPlanApproval(client: PoolClient, churchId: string, planId: string, approvalId: string) {
  const result = await client.query(`SELECT approvals.* FROM approvals JOIN aggregates ON aggregates.church_id=approvals.church_id AND aggregates.id=approvals.aggregate_id
    WHERE approvals.church_id=$1 AND aggregates.id=$2 AND approvals.id=$3 AND aggregates.approval_id=approvals.id
    AND aggregates.head_revision_id=approvals.revision_id AND aggregates.status='approved'
    AND EXISTS(SELECT 1 FROM memberships WHERE memberships.church_id=approvals.church_id AND memberships.user_id=approvals.approver_id AND memberships.active AND 'plans:approve'=ANY(memberships.capabilities))`,[churchId,planId,approvalId]);
  demand(result.rowCount,409,'stale_plan_dependency','A current approved plan is required');
  return result.rows[0] as {id:string;hash:string;revision_id:string;created_at:Date};
}
export async function createContent(client: PoolClient, aggregate: AggregateRow, member: Membership, approvalId?: string) {
  requireCapability(member,'content:edit');
  const slot = await client.query('SELECT assignee_ids FROM slots WHERE church_id=$1 AND id=$2',[aggregate.church_id,aggregate.slot_id]);
  demand(slot.rows[0].assignee_ids.includes(member.userId),403,'not_assigned','Only assigned contributors can draft this study');
  const plan = await loadAggregate(client, aggregate.church_id, aggregate.id, 'plan', true);
  const approval = approvalId ? (await client.query('SELECT id,hash,revision_id FROM approvals WHERE church_id=$1 AND aggregate_id=$2 AND id=$3',[aggregate.church_id,aggregate.id,approvalId])).rows[0] : null;
  demand(!approvalId||approval,409,'invalid_plan_provenance','Optional plan provenance must belong to this study');
  const id = randomUUID();
  await client.query("INSERT INTO aggregates(church_id,id,kind,slot_id,plan_id) VALUES($1,$2,'content',$3,$4)",[aggregate.church_id,id,aggregate.slot_id,aggregate.id]);
  const previous = await client.query('SELECT calendar FROM revisions WHERE church_id=$1 AND id=$2',[aggregate.church_id,approval?.revision_id ?? plan.head_revision_id]);
  const revisionId = await insertRevision(client,{churchId:aggregate.church_id,aggregateId:id,kind:'content',number:1,authorId:member.userId,payload:blankContent(),calendar:previous.rows[0].calendar,planApprovalId:approval?.id ?? null,planHash:approval?.hash ?? null});
  await client.query('UPDATE aggregates SET head_revision_id=$3 WHERE church_id=$1 AND id=$2',[aggregate.church_id,id,revisionId]);
  await client.query('UPDATE aggregates SET version=version+1 WHERE church_id=$1 AND id=$2',[aggregate.church_id,aggregate.id]);
  await audit(client,aggregate.church_id,member.userId,'content.created',id);
  return aggregateDto(client,await loadAggregate(client,aggregate.church_id,id,'content'));
}
export function verifyCanonical(row: {canonical_bytes:string;hash:string;payload:unknown;calendar:unknown;plan_approval_id:string|null;plan_hash:string|null;author_id:string;number:number;source_snapshot?:unknown}, aggregate: AggregateRow) {
  const envelope = JSON.parse(row.canonical_bytes);
  if(envelope.schemaVersion===2)demand(canonical(envelope.sourceSnapshot)===canonical(row.source_snapshot),409,'revision_integrity','Revision source snapshot binding failed');
  demand(canonical(envelope)===row.canonical_bytes && hash(row.canonical_bytes)===row.hash && envelope.churchId===aggregate.church_id && envelope.aggregateId===aggregate.id && envelope.kind===aggregate.kind && envelope.authorId===row.author_id && envelope.number===row.number && canonical(envelope.payload)===canonical(row.payload) && canonical(envelope.calendar)===canonical(row.calendar) && envelope.planApprovalId===row.plan_approval_id && envelope.planHash===row.plan_hash,409,'revision_integrity','Revision canonical binding failed');
}
