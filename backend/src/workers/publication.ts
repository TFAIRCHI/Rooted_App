import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { Database } from '../infrastructure/database.js';
import { lockAggregate } from '../modules/editorial.js';
import { evaluateCatchup } from '../integrations/time.js';
import { retireEngagementIdentifiers, snapshotPublicationAudience } from '../modules/engagement.js';
import { ApiError } from '../api/errors.js';

export async function publishOccurrence(client:PoolClient,churchId:string,scheduleId:string,now:Date) {
  const locator=(await client.query('SELECT content_id FROM schedules WHERE church_id=$1 AND id=$2',[churchId,scheduleId])).rows[0];
  if(!locator) return;
  const active=await client.query('SELECT 1 FROM aggregates JOIN slots ON slots.church_id=aggregates.church_id AND slots.id=aggregates.slot_id WHERE aggregates.church_id=$1 AND aggregates.id=$2 AND slots.deleted_at IS NULL AND slots.withdrawn_at IS NULL',[churchId,locator.content_id]);
  if(!active.rowCount) return;
  let aggregate;
  try {aggregate=await lockAggregate(client,churchId,locator.content_id,'content');}
  catch(error) {if(error instanceof ApiError&&error.statusCode===404)return;throw error;}
  const schedule=(await client.query('SELECT * FROM schedules WHERE church_id=$1 AND id=$2 FOR UPDATE',[churchId,scheduleId])).rows[0];
  if(schedule.status!=='pending') return;
  const approval=(await client.query('SELECT * FROM approvals WHERE church_id=$1 AND id=$2',[churchId,schedule.approval_id])).rows[0];
  let unchanged=aggregate.head_revision_id===schedule.revision_id&&aggregate.approval_id===schedule.approval_id&&['approved','scheduled'].includes(aggregate.status);
  const requiredSubjects=[approval?.approver_id,schedule.created_by].filter((subject):subject is string=>typeof subject==='string');
  const authorities=(await client.query('SELECT user_id,capabilities,active FROM memberships WHERE church_id=$1 AND user_id=ANY($2::text[]) ORDER BY user_id FOR SHARE',[churchId,requiredSubjects])).rows as {user_id:string;capabilities:string[];active:boolean}[];
  const permitted=(subject:string|undefined,capability:string)=>authorities.some(authority=>authority.user_id===subject&&authority.active&&authority.capabilities.includes(capability));
  const approver=permitted(approval?.approver_id,'content:approve');
  const publisher=permitted(schedule.created_by,'publication:schedule');
  unchanged=Boolean(unchanged&&approver&&publisher);
  const eligibility=schedule.publication_mode==='manual_once' ? (unchanged ? 'eligible' : 'blocked_approval') : evaluateCatchup({scheduledAt:schedule.due_at.toISOString(),now:now.toISOString(),approvedAt:approval?.created_at.toISOString()??null,unchanged});
  if(eligibility==='not_due') return;
  if(!unchanged || eligibility!=='eligible') {
    const state=eligibility==='staff_review'?'needs_staff_review':'blocked_approval';
    await client.query('UPDATE schedules SET status=$3 WHERE church_id=$1 AND id=$2',[churchId,scheduleId,state]);
    await client.query("INSERT INTO outbox(church_id,id,type,resource_id,payload) VALUES($1,$2,'schedule.blocked',$3,$4) ON CONFLICT DO NOTHING",[churchId,randomUUID(),scheduleId,{reason:state}]);
    await client.query("UPDATE aggregates SET status='approved',version=version+1 WHERE church_id=$1 AND id=$2 AND status='scheduled'",[churchId,aggregate.id]);
    return;
  }
  const publicationId=randomUUID();
  await client.query('INSERT INTO publications(church_id,id,content_id,revision_id,approval_id,schedule_id,published_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(church_id,schedule_id) DO NOTHING',[churchId,publicationId,aggregate.id,schedule.revision_id,schedule.approval_id,scheduleId,now]);
  const publication=(await client.query('SELECT id FROM publications WHERE church_id=$1 AND schedule_id=$2',[churchId,scheduleId])).rows[0];
  await snapshotPublicationAudience(client,churchId,publication.id);
  await client.query("UPDATE aggregates SET live_publication_id=$3,status='published',version=version+1 WHERE church_id=$1 AND id=$2",[churchId,aggregate.id,publication.id]);
  await client.query("UPDATE schedules SET status='published' WHERE church_id=$1 AND id=$2",[churchId,scheduleId]);
  await client.query("INSERT INTO outbox(church_id,id,type,resource_id,payload) VALUES($1,$2,'study.published',$3,$4) ON CONFLICT DO NOTHING",[churchId,randomUUID(),publication.id,{contentId:aggregate.id}]);
}

export async function runLocalWork(database:Database,now=new Date()) {
  const churches=await database.pool.query('SELECT * FROM worker_churches()');
  for(const church of churches.rows) {
    const client=await database.pool.connect();
    try {
      await client.query('BEGIN');await client.query("SELECT set_config('app.church_id',$1,true),set_config('app.user_id','worker',true)",[church.id]);
      const due=await client.query("SELECT id FROM schedules WHERE church_id=$1 AND status='pending' AND due_at<=$2 ORDER BY due_at LIMIT 50",[church.id,now]);
      for(const schedule of due.rows) await publishOccurrence(client,church.id,schedule.id,now);
      const events=await client.query("SELECT * FROM outbox WHERE church_id=$1 AND status='pending' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 100",[church.id]);
      for(const event of events.rows) {
        if(event.type==='schedule.blocked') {
          const reviewers=await client.query("SELECT user_id FROM memberships WHERE church_id=$1 AND active AND 'publication:schedule'=ANY(capabilities)",[church.id]);
          for(const reviewer of reviewers.rows) await client.query("INSERT INTO notifications(church_id,id,user_id,type,resource_id) VALUES($1,$2,$3,'schedule_blocked',$4)",[church.id,randomUUID(),reviewer.user_id,event.resource_id]);
        }
        await client.query("UPDATE outbox SET status=$3 WHERE church_id=$1 AND id=$2",[church.id,event.id,event.type==='study.published'?'provider_disabled':'processed']);
      }
      await retireEngagementIdentifiers(client,church.id,now);
      await client.query('COMMIT');
    }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }
}
