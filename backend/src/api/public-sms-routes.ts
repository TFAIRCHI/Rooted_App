import { createHash, randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import type { Database } from '../infrastructure/database.js';
import { requireCapability } from '../infrastructure/database.js';
import type { config } from '../infrastructure/config.js';
import { smsSegments } from '../integrations/index.js';
import { tenantRoutes } from './tenant-boundary.js';
import { demand } from './errors.js';
import type { ProviderRuntime } from './provider-routes.js';

const hash=(body:string)=>createHash('sha256').update(body).digest('hex');
type Settings=ReturnType<typeof config>;
function planningOpen(row:Record<string,unknown>) {
  if(row.status==='pending')return true;
  const due=new Date(String(row.due_at)).getTime();
  return row.status==='published' && Date.now()>=due && Date.now()<due+86400_000;
}

async function scheduleRow(client:PoolClient,churchId:string,id:string) {
  const row=(await client.query(`SELECT s.*,c.name AS church_name,c.slug AS church_slug,c.study_sms_enabled,
    r.payload,a.head_revision_id,a.approval_id AS current_approval_id
    FROM schedules s JOIN churches c ON c.id=s.church_id
    JOIN revisions r ON r.church_id=s.church_id AND r.id=s.revision_id
    JOIN aggregates a ON a.church_id=s.church_id AND a.id=s.content_id
    WHERE s.church_id=$1 AND s.id=$2 FOR SHARE OF s`,[churchId,id])).rows[0];
  demand(row,404,'not_found','Schedule not found');
  return row;
}
function composed(row:Record<string,unknown>,note:string,origin:string) {
  const senderName=process.env.TWILIO_SENDER_NAME?.trim();
  demand(senderName && senderName.length<=100,409,'sender_name_required','Configure the registered church sender name before previewing SMS');
  const title=String((row.payload as {title?:string})?.title??'Study');
  const url=`${origin}/c/${encodeURIComponent(String(row.church_slug))}/studies/${row.reserved_publication_id}`;
  const body=`${senderName}: ${note} — ${title}. Read: ${url} Reply STOP to unsubscribe.`;
  demand(body.length<=1600,422,'sms_too_long','Shorten the delivery note or title');
  return {body,url,segments:smsSegments(body).segments};
}
export async function publicSmsRoutes(app:FastifyInstance,database:Database,settings:Settings) {
  const staff=tenantRoutes(app,database,settings);
  staff.get('/sms/public-plans',async({client,member,churchId})=>{
    requireCapability(member,'publication:schedule');
    const rows=(await client.query(`SELECT s.id,s.status,s.due_at,s.reserved_publication_id,s.sms_delivery_note,
      s.sms_note_creator_id,s.sms_note_updated_at,r.payload->>'title' AS title,
      x.id AS snapshot_id,x.body AS approved_body,x.segment_count,x.approved_at
      FROM schedules s JOIN revisions r ON r.church_id=s.church_id AND r.id=s.revision_id
      LEFT JOIN sms_delivery_snapshots x ON x.church_id=s.church_id AND x.schedule_id=s.id AND x.superseded_at IS NULL
      WHERE s.church_id=$1 AND (s.status='pending' OR (s.status='published' AND s.due_at>now()-interval '24 hours'))
      ORDER BY s.due_at DESC LIMIT 100`,[churchId])).rows;
    return {items:rows};
  });
  staff.command('/sms/public-plans/:id/note',async({client,member,churchId,id,request})=>{
    requireCapability(member,'publication:schedule');
    const input=z.object({note:z.string().trim().min(1).max(240)}).strict().parse(request.body);
    const row=await scheduleRow(client,churchId,id!);
    demand(planningOpen(row),409,'schedule_closed','The SMS window has closed');
    const preview=composed(row,input.note,settings.appOrigin);
    await client.query('UPDATE schedules SET sms_delivery_note=$3,sms_note_creator_id=$4,sms_note_revision_id=revision_id,sms_note_updated_at=now() WHERE church_id=$1 AND id=$2',[churchId,id,input.note,member.userId]);
    await client.query('UPDATE sms_delivery_snapshots SET superseded_at=now() WHERE church_id=$1 AND schedule_id=$2 AND superseded_at IS NULL',[churchId,id]);
    await client.query("UPDATE provider_send_intents SET status='approval_changed' WHERE church_id=$1 AND sms_snapshot_id IN (SELECT id FROM sms_delivery_snapshots WHERE church_id=$1 AND schedule_id=$2) AND status IN ('pending','deferred','hold_unknown_zone')",[churchId,id]);
    return {status:200,body:{...preview,approved:false}};
  });
  staff.command('/sms/public-plans/:id/approve',async({client,member,churchId,id})=>{
    requireCapability(member,'content:approve');
    const row=await scheduleRow(client,churchId,id!);
    demand(row.sms_delivery_note && row.sms_note_creator_id && row.sms_note_creator_id!==member.userId,409,'separate_reviewer_required','A different reviewer must approve this message');
    demand(row.head_revision_id===row.revision_id && row.current_approval_id===row.approval_id && row.sms_note_revision_id===row.revision_id,409,'approval_changed','Study or note changed; prepare the SMS again');
    demand(planningOpen(row),409,'schedule_closed','The SMS window has closed');
    const preview=composed(row,row.sms_delivery_note,settings.appOrigin);
    const sender=process.env.TWILIO_SENDER_SCOPE;
    demand(sender && process.env.TWILIO_CHURCH_ID===churchId,409,'sender_not_ready','Configure this church sender first');
    const current=(await client.query('SELECT coalesce(max(version),0)::integer AS version FROM sms_delivery_snapshots WHERE church_id=$1 AND schedule_id=$2',[churchId,id])).rows[0].version as number;
    await client.query('UPDATE sms_delivery_snapshots SET superseded_at=now() WHERE church_id=$1 AND schedule_id=$2 AND superseded_at IS NULL',[churchId,id]);
    const snapshotId=randomUUID();
    await client.query('INSERT INTO sms_delivery_snapshots(church_id,id,schedule_id,version,publication_id,revision_id,approval_id,sender_scope,sender_name,delivery_note,body,body_hash,segment_count,creator_id,reviewer_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)',[churchId,snapshotId,id,current+1,row.reserved_publication_id,row.revision_id,row.approval_id,sender,process.env.TWILIO_SENDER_NAME?.trim(),row.sms_delivery_note,preview.body,hash(preview.body),preview.segments,row.sms_note_creator_id,member.userId]);
    return {status:200,body:{snapshotId,...preview,approved:true}};
  });
}

export async function schedulePublicSms(database:Database,churchId:string,runtime:ProviderRuntime) {
  if(!runtime.enabled||!runtime.twilio?.activationApproved||runtime.twilio.churchId!==churchId)return 0;
  const client=await database.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.church_id',$1,true),set_config('app.user_id','worker',true)",[churchId]);
    const church=(await client.query("SELECT study_sms_enabled,reading_policy FROM churches WHERE id=$1",[churchId])).rows[0];
    if(!church?.study_sms_enabled||church.reading_policy!=='public'){await client.query('COMMIT');return 0;}
    const connection=(await client.query("SELECT id FROM provider_connections WHERE church_id=$1 AND provider='twilio' AND status='configured' AND config->>'senderScope'=$2 AND config->>'accountSid'=$3 LIMIT 1",[churchId,runtime.twilio.senderScope,runtime.twilio.accountSid])).rows[0];
    if(!connection){await client.query('COMMIT');return 0;}
    const budget=(await client.query("SELECT * FROM provider_budgets WHERE church_id=$1 AND period=to_char(now(),'YYYY-MM') FOR UPDATE",[churchId])).rows[0];
    if(!budget){await client.query('COMMIT');return 0;}
    const plans=(await client.query(`SELECT x.*,p.published_at,s.created_by AS publisher_id,a.live_publication_id,a.head_revision_id,a.approval_id AS current_approval_id
      FROM sms_delivery_snapshots x JOIN schedules s ON s.church_id=x.church_id AND s.id=x.schedule_id
      JOIN publications p ON p.church_id=s.church_id AND p.schedule_id=s.id AND p.id=x.publication_id
      JOIN aggregates a ON a.church_id=p.church_id AND a.id=p.content_id
      JOIN slots sl ON sl.church_id=a.church_id AND sl.id=a.slot_id
      WHERE x.church_id=$1 AND x.superseded_at IS NULL AND p.published_at>now()-interval '24 hours'
      AND sl.deleted_at IS NULL AND sl.withdrawn_at IS NULL AND a.live_publication_id=p.id
      AND a.head_revision_id=x.revision_id AND a.approval_id=x.approval_id AND x.sender_scope=$2 AND x.sender_name=$3
      ORDER BY p.published_at LIMIT 20`,[churchId,runtime.twilio.senderScope,process.env.TWILIO_SENDER_NAME?.trim()??''])).rows;
    let count=0;
    for(const plan of plans){
      const contacts=(await client.query("SELECT id,consent_version FROM provider_contacts WHERE church_id=$1 AND sender_scope=$2 AND consent_audited AND NOT suppressed ORDER BY id LIMIT 1000",[churchId,runtime.twilio.senderScope])).rows;
      for(const contact of contacts){
        if(Number(budget.charged_sms_segments)+plan.segment_count>Number(budget.sms_segment_limit))break;
        const result=await client.query(`INSERT INTO provider_send_intents(church_id,id,connection_id,publication_id,contact_id,actor_id,approval_id,preview_hash,body,consent_version,not_before,expires_at,status,sms_snapshot_id)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending',$13)
          ON CONFLICT(church_id,publication_id,contact_id) DO NOTHING RETURNING id`,[churchId,randomUUID(),connection.id,plan.publication_id,contact.id,plan.publisher_id,plan.approval_id,plan.body_hash,plan.body,contact.consent_version,plan.published_at,new Date(new Date(plan.published_at).getTime()+86400_000),plan.id]);
        if(result.rowCount){count++;budget.charged_sms_segments=Number(budget.charged_sms_segments)+plan.segment_count;}
      }
    }
    if(count)await client.query('UPDATE provider_budgets SET charged_sms_segments=$2 WHERE church_id=$1',[churchId,budget.charged_sms_segments]);
    await client.query('COMMIT');
    return count;
  } catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
