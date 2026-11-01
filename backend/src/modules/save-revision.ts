import type { PoolClient } from 'pg';
import { demand } from '../api/errors.js';
import type { Membership } from '../infrastructure/database.js';
import { aggregateDto, audit, cancelPending, loadAggregate, requireEditor, type AggregateRow } from './editorial.js';
import { contentPayloadSchema, insertRevision, planPayloadSchema } from './revisions.js';

export async function saveRevision(client: PoolClient, aggregate: AggregateRow, member: Membership, input: {baseRevisionId:string;payload:unknown;planApprovalId?:string|null;calendar?:unknown;sourceSnapshot?:unknown[]}) {
  await requireEditor(client,aggregate,member);
  demand(aggregate.head_revision_id===input.baseRevisionId,409,'base_revision_changed','The base revision is no longer current');
  demand(aggregate.status!=='cancelled',409,'cancelled','Cancelled aggregate cannot be edited');
  const previous = await client.query('SELECT * FROM revisions WHERE church_id=$1 AND id=$2',[aggregate.church_id,aggregate.head_revision_id]);
  const old = previous.rows[0];
  const payload = (aggregate.kind==='plan'?planPayloadSchema:contentPayloadSchema).parse(input.payload);
  const approvalId = aggregate.kind==='content' ? input.planApprovalId ?? old.plan_approval_id : null;
  const calendar = input.calendar ?? old.calendar;
  const revisionId = await insertRevision(client,{churchId:aggregate.church_id,aggregateId:aggregate.id,kind:aggregate.kind,number:old.number+1,authorId:member.userId,payload,calendar,planApprovalId:approvalId,planHash:old.plan_hash,sourceSnapshot:input.sourceSnapshot});
  await cancelPending(client,aggregate);
  await client.query("UPDATE aggregates SET head_revision_id=$3,approval_id=NULL,status='draft',version=version+1 WHERE church_id=$1 AND id=$2",[aggregate.church_id,aggregate.id,revisionId]);
  await audit(client,aggregate.church_id,member.userId,`${aggregate.kind}.revision_created`,aggregate.id,{revisionId});
  return aggregateDto(client,await loadAggregate(client,aggregate.church_id,aggregate.id));
}
