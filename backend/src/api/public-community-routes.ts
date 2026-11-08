import { createHmac, randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import type { Database } from '../infrastructure/database.js';
import { requireCapability } from '../infrastructure/database.js';
import type { config } from '../infrastructure/config.js';
import { tenantRoutes } from './tenant-boundary.js';
import { demand } from './errors.js';
import { publishedStudies } from './core-routes.js';

const uuid=z.string().uuid();
const reactionType=z.enum(['thankful','encouraged','praying','like','fire']);
const visitorCookie='rooted_visitor';
const prefix='/v1/public/churches/:slug/studies/:id';
type Settings=ReturnType<typeof config>;

function secret() {
  const value=process.env.PUBLIC_VISITOR_SECRET;
  demand(value && value.length>=32,503,'visitor_secret_missing','Public participation is unavailable');
  return value;
}
function digest(value:string) {return createHmac('sha256',secret()).update(value).digest('hex');}
function identity(request:FastifyRequest,reply:FastifyReply,settings:Settings) {
  let id=request.cookies[visitorCookie];
  if(!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    id=randomUUID();
    reply.setCookie(visitorCookie,id,{path:'/',httpOnly:true,secure:settings.appOrigin.startsWith('https:'),sameSite:'lax',maxAge:90*86400});
  }
  return digest(id);
}
function existingIdentity(request:FastifyRequest) {
  const id=request.cookies[visitorCookie];
  return id && /^[0-9a-f-]{36}$/i.test(id) && process.env.PUBLIC_VISITOR_SECRET ? digest(id) : null;
}
function writeOrigin(request:FastifyRequest,settings:Settings) {
  demand(request.headers.origin===settings.appOrigin,403,'invalid_origin','Use the church study page to participate');
  demand(request.headers['content-type']?.startsWith('application/json'),415,'invalid_content_type','Use JSON to submit this request');
}
async function publicTransaction<T>(database:Database,request:FastifyRequest,action:(client:PoolClient,churchId:string,id:string)=>Promise<T>):Promise<T> {
  const {slug,id}=z.object({slug:z.string().min(1).max(100),id:uuid}).parse(request.params);
  const lookup=await database.pool.query('SELECT id FROM public_church($1)',[slug]);
  demand(lookup.rowCount,404,'not_found','Study not found');
  const churchId=lookup.rows[0].id as string;
  const client=await database.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.church_id',$1,true),set_config('app.user_id','public_visitor',true)",[churchId]);
    const church=(await client.query('SELECT public_read_enabled,public_engagement_enabled FROM churches WHERE id=$1',[churchId])).rows[0];
    demand(church?.public_read_enabled && church.public_engagement_enabled,404,'not_found','Community is unavailable');
    demand((await publishedStudies(client,churchId,id)).length,404,'not_found','Study not found');
    const result=await action(client,churchId,id);
    await client.query('COMMIT');
    return result;
  } catch(error) {await client.query('ROLLBACK');throw error;} finally {client.release();}
}
async function limit(client:PoolClient,churchId:string,visitor:string,request:FastifyRequest,kind:'reaction'|'comment'|'report',maximum:number) {
  const network=digest(request.ip);
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`public:${churchId}:${visitor}:${kind}`]);
  const count=await client.query("SELECT count(*)::integer AS n FROM public_activity_limits WHERE church_id=$1 AND action=$2 AND visitor_digest=$3 AND created_at>now()-interval '10 minutes'",[churchId,kind,visitor]);
  demand(count.rows[0].n<maximum,429,'participation_rate_limit','Please wait before trying again');
  const networkCount=await client.query("SELECT count(*)::integer AS n FROM public_activity_limits WHERE church_id=$1 AND action=$2 AND network_digest=$3 AND created_at>now()-interval '10 minutes'",[churchId,kind,network]);
  demand(networkCount.rows[0].n<500,429,'participation_rate_limit','Please wait before trying again');
  await client.query('INSERT INTO public_activity_limits(church_id,id,visitor_digest,network_digest,action) VALUES($1,$2,$3,$4,$5)',[churchId,randomUUID(),visitor,network,kind]);
}
function comment(row:Record<string,unknown>,visitor?:string|null) {
  return {id:row.id,publicationId:row.publication_id,authorName:row.display_name,nameVerified:false,body:row.body,kind:row.kind,parentId:row.parent_id,status:row.status,version:row.version,createdAt:row.created_at,...(visitor?{mine:row.visitor_digest===visitor}:{})};
}

export async function publicCommunityRoutes(app:FastifyInstance,database:Database,settings:Settings) {
  app.get(`${prefix}/community`,async(request)=>publicTransaction(database,request,async(client,churchId,id)=>{
    const query=z.object({limit:z.coerce.number().int().min(1).max(100).default(50)}).parse(request.query);
    const reactions=(await client.query('SELECT type,count(*)::integer AS count FROM public_reactions WHERE church_id=$1 AND publication_id=$2 GROUP BY type',[churchId,id])).rows;
    const visitor=existingIdentity(request);
    const mine=visitor?(await client.query('SELECT type FROM public_reactions WHERE church_id=$1 AND publication_id=$2 AND visitor_digest=$3',[churchId,id,visitor])).rows[0]?.type:null;
    const comments=(await client.query("SELECT id,publication_id,display_name,body,kind,parent_id,status,version,created_at,visitor_digest FROM public_discussions WHERE church_id=$1 AND publication_id=$2 AND status='approved' ORDER BY created_at,id LIMIT $3",[churchId,id,query.limit])).rows;
    const church=(await client.query('SELECT discussions_enabled FROM churches WHERE id=$1',[churchId])).rows[0];
    return {discussionsEnabled:church.discussions_enabled,reactions:{thankful:0,encouraged:0,praying:0,like:0,fire:0,...Object.fromEntries(reactions.map(row=>[row.type,row.count]))},myReaction:mine??null,comments:comments.map(row=>comment(row,visitor))};
  }));
  app.put(`${prefix}/reaction`,async(request,reply)=>{
    writeOrigin(request,settings);
    const body=z.object({type:reactionType.nullable()}).strict().parse(request.body);
    const visitor=identity(request,reply,settings);
    return publicTransaction(database,request,async(client,churchId,id)=>{
      await limit(client,churchId,visitor,request,'reaction',30);
      if(body.type) await client.query('INSERT INTO public_reactions(church_id,id,publication_id,visitor_digest,type) VALUES($1,$2,$3,$4,$5) ON CONFLICT(church_id,publication_id,visitor_digest) DO UPDATE SET type=excluded.type,updated_at=now()',[churchId,randomUUID(),id,visitor,body.type]);
      else await client.query('DELETE FROM public_reactions WHERE church_id=$1 AND publication_id=$2 AND visitor_digest=$3',[churchId,id,visitor]);
      return {type:body.type};
    });
  });
  app.post(`${prefix}/comments`,async(request,reply)=>{
    writeOrigin(request,settings);
    const body=z.object({displayName:z.string().trim().min(1).max(120),body:z.string().trim().min(1).max(5000),kind:z.enum(['response','question']).default('response')}).strict().parse(request.body);
    const visitor=identity(request,reply,settings);
    const result=await publicTransaction(database,request,async(client,churchId,id)=>{
      const church=(await client.query('SELECT discussions_enabled FROM churches WHERE id=$1',[churchId])).rows[0];
      demand(church.discussions_enabled,409,'discussions_disabled','Comments are unavailable for this church');
      await limit(client,churchId,visitor,request,'comment',3);
      const commentId=randomUUID();
      await client.query('INSERT INTO public_discussions(church_id,id,publication_id,display_name,body,kind,visitor_digest) VALUES($1,$2,$3,$4,$5,$6,$7)',[churchId,commentId,id,body.displayName,body.body,body.kind,visitor]);
      return {id:commentId,status:'pending',nameVerified:false};
    });
    return reply.code(201).send(result);
  });
  app.post(`${prefix}/comments/:commentId/remove`,async(request,reply)=>{
    writeOrigin(request,settings);
    const commentId=uuid.parse((request.params as {commentId:string}).commentId);
    const visitor=existingIdentity(request);
    demand(visitor,403,'visitor_cookie_required','Open this page in the browser that submitted the comment');
    const result=await publicTransaction(database,request,async(client,churchId,id)=>{
      const removed=await client.query("UPDATE public_discussions SET status='hidden',display_name='Removed',body='Removed by commenter',version=version+1,updated_at=now() WHERE church_id=$1 AND publication_id=$2 AND id=$3 AND visitor_digest=$4 AND author_kind='visitor' RETURNING id",[churchId,id,commentId,visitor]);
      demand(removed.rowCount,404,'not_found','Your comment was not found');
      return {id:commentId,status:'removed'};
    });
    return reply.send(result);
  });
  app.post(`${prefix}/reports`,async(request,reply)=>{
    writeOrigin(request,settings);
    const body=z.object({commentId:uuid,reason:z.string().trim().min(1).max(1000)}).strict().parse(request.body);
    const visitor=identity(request,reply,settings);
    const result=await publicTransaction(database,request,async(client,churchId,id)=>{
      const found=await client.query("SELECT 1 FROM public_discussions WHERE church_id=$1 AND publication_id=$2 AND id=$3 AND status='approved'",[churchId,id,body.commentId]);
      demand(found.rowCount,404,'not_found','Comment not found');
      await limit(client,churchId,visitor,request,'report',5);
      const reportId=randomUUID();
      await client.query('INSERT INTO public_discussion_reports(church_id,id,discussion_id,reason) VALUES($1,$2,$3,$4)',[churchId,reportId,body.commentId,body.reason]);
      return {id:reportId,status:'pending'};
    });
    return reply.code(201).send(result);
  });
  const staff=tenantRoutes(app,database,settings);
  staff.get('/public-access',async({client,member,churchId})=>{
    requireCapability(member,'settings:manage');
    return (await client.query('SELECT reading_policy,public_read_enabled,public_engagement_enabled,study_sms_enabled,public_reviewed_at,public_review_evidence,sms_activated_at,sms_activation_evidence FROM churches WHERE id=$1',[churchId])).rows[0];
  });
  staff.command('/public-access',async({client,member,churchId,request})=>{
    requireCapability(member,'settings:manage');
    const body=z.discriminatedUnion('action',[
      z.object({action:z.literal('enable_read'),evidence:z.string().trim().min(10).max(1000)}).strict(),
      z.object({action:z.literal('enable_engagement')}).strict(),
      z.object({action:z.literal('enable_sms'),evidence:z.string().trim().min(10).max(1000)}).strict(),
      z.object({action:z.enum(['disable_read','disable_engagement','disable_sms'])}).strict(),
    ]).parse(request.body);
    const church=(await client.query('SELECT * FROM churches WHERE id=$1 FOR UPDATE',[churchId])).rows[0];
    if(body.action==='enable_read') await client.query("UPDATE churches SET reading_policy='public',public_read_enabled=true,public_reviewed_by=$2,public_reviewed_at=now(),public_review_evidence=$3 WHERE id=$1",[churchId,member.userId,body.evidence]);
    else if(body.action==='enable_engagement') {
      demand(church.public_read_enabled && church.reading_policy==='public',409,'review_required','Review and enable public reading first');
      await client.query('UPDATE churches SET public_engagement_enabled=true WHERE id=$1',[churchId]);
    } else if(body.action==='enable_sms') {
      demand(church.public_read_enabled && church.reading_policy==='public',409,'review_required','Review and enable public reading first');
      demand(process.env.TWILIO_ACTIVATION_APPROVED==='true' && process.env.TWILIO_CHURCH_ID===churchId && Boolean(process.env.TWILIO_SENDER_NAME?.trim()),409,'sender_not_ready','A registered sender name and program must be configured for this church');
      const connected=(await client.query("SELECT 1 FROM provider_connections WHERE church_id=$1 AND provider='twilio' AND status='configured'",[churchId])).rowCount;
      demand(connected,409,'sender_not_ready','Connect the registered Twilio sender first');
      await client.query('UPDATE churches SET study_sms_enabled=true,sms_activated_by=$2,sms_activated_at=now(),sms_activation_evidence=$3 WHERE id=$1',[churchId,member.userId,body.evidence]);
    } else if(body.action==='disable_read') {
      await client.query("UPDATE churches SET reading_policy='members',public_read_enabled=false,public_engagement_enabled=false,study_sms_enabled=false WHERE id=$1",[churchId]);
      await client.query("UPDATE provider_send_intents SET status='suppressed' WHERE church_id=$1 AND sms_snapshot_id IS NOT NULL AND status IN ('pending','deferred','hold_unknown_zone')",[churchId]);
    } else if(body.action==='disable_engagement') await client.query('UPDATE churches SET public_engagement_enabled=false WHERE id=$1',[churchId]);
    else {
      await client.query('UPDATE churches SET study_sms_enabled=false WHERE id=$1',[churchId]);
      await client.query("UPDATE provider_send_intents SET status='suppressed' WHERE church_id=$1 AND sms_snapshot_id IS NOT NULL AND status IN ('pending','deferred','hold_unknown_zone')",[churchId]);
    }
    return {status:200,body:{action:body.action}};
  });
  staff.get('/public-moderation',async({client,member,churchId})=>{
    requireCapability(member,'moderation:manage');
    const items=(await client.query("SELECT * FROM public_discussions WHERE church_id=$1 AND (status='pending' OR (status='approved' AND kind='question') OR id IN (SELECT discussion_id FROM public_discussion_reports WHERE church_id=$1 AND status='pending')) ORDER BY created_at DESC LIMIT 200",[churchId])).rows;
    const reports=(await client.query("SELECT * FROM public_discussion_reports WHERE church_id=$1 AND status='pending' ORDER BY created_at LIMIT 200",[churchId])).rows;
    return {items:items.map(row=>comment(row)),reports};
  });
  staff.command('/public-moderation/:id/decision',async({client,member,churchId,id,request})=>{
    requireCapability(member,'moderation:manage');
    const body=z.object({decision:z.enum(['approve','hide','decline']),reason:z.string().trim().min(1).max(1000)}).strict().parse(request.body);
    const row=(await client.query('UPDATE public_discussions SET status=$3,version=version+1,updated_at=now() WHERE church_id=$1 AND id=$2 RETURNING *',[churchId,id,body.decision==='approve'?'approved':body.decision==='hide'?'hidden':'declined'])).rows[0];
    demand(row,404,'not_found','Comment not found');
    await client.query('INSERT INTO public_moderation_actions(church_id,id,discussion_id,actor_id,action,reason) VALUES($1,$2,$3,$4,$5,$6)',[churchId,randomUUID(),id,member.userId,body.decision,body.reason]);
    await client.query("UPDATE public_discussion_reports SET status='resolved' WHERE church_id=$1 AND discussion_id=$2",[churchId,id]);
    return {status:200,body:comment(row)};
  });
  staff.command('/public-moderation/:id/reply',async({client,member,churchId,id,request})=>{
    requireCapability(member,'moderation:manage');
    const body=z.object({body:z.string().trim().min(1).max(5000)}).strict().parse(request.body);
    const parent=(await client.query("SELECT publication_id FROM public_discussions WHERE church_id=$1 AND id=$2 AND status='approved' AND kind='question'",[churchId,id])).rows[0];
    demand(parent,404,'not_found','Approved question not found');
    demand((await publishedStudies(client,churchId,parent.publication_id)).length,404,'not_found','Study not found');
    const author=(await client.query('SELECT display_name FROM memberships WHERE church_id=$1 AND user_id=$2',[churchId,member.userId])).rows[0];
    const replyId=randomUUID();
    const row=(await client.query("INSERT INTO public_discussions(church_id,id,publication_id,display_name,body,kind,author_kind,staff_user_id,parent_id,status) VALUES($1,$2,$3,$4,$5,'reply','staff',$6,$7,'approved') RETURNING *",[churchId,replyId,parent.publication_id,author?.display_name??'Church contributor',body.body,member.userId,id])).rows[0];
    await client.query('INSERT INTO public_moderation_actions(church_id,id,discussion_id,actor_id,action,reason) VALUES($1,$2,$3,$4,$5,$6)',[churchId,randomUUID(),id,member.userId,'reply','Staff response posted']);
    return {status:201,body:comment(row)};
  });
}
