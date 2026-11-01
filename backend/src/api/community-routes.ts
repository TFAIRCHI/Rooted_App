import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import type { Database } from '../infrastructure/database.js';
import { requireCapability } from '../infrastructure/database.js';
import type { config } from '../infrastructure/config.js';
import { demand } from './errors.js';
import { tenantRoutes } from './tenant-boundary.js';
import { publishedStudies } from './core-routes.js';
import { audit } from '../modules/editorial.js';
import { screenComment } from '../modules/community-policy.js';
import { publicationEngagement } from '../modules/engagement.js';

type DiscussionRow={id:string;publication_id:string;user_id:string;author_name?:string;body:string;status:string;version:number;content_version:number;kind:string;parent_id:string|null;resolved_at:Date|null;resolution_kind:string|null;created_at:Date;updated_at:Date};
function commentDto(row:DiscussionRow,moderator=false) {
  return {id:row.id,publicationId:row.publication_id,authorId:row.user_id,authorName:row.author_name??row.user_id,body:row.status==='hidden'&&!moderator?'[Removed by church moderation]':row.body,status:row.status,kind:row.kind,parentId:row.parent_id,contentVersion:row.content_version,resolvedAt:row.resolved_at,version:row.version,etag:`"discussion:${row.id}:${row.version}"`,createdAt:row.created_at,updatedAt:row.updated_at};
}
async function readableStudy(client:PoolClient,churchId:string,id:string) {
  await client.query('SELECT a.id FROM publications p JOIN aggregates a ON a.church_id=p.church_id AND a.id=p.content_id WHERE p.church_id=$1 AND p.id=$2 FOR SHARE OF a',[churchId,id]);
  demand((await publishedStudies(client,churchId,id)).length,404,'not_found','Published study not found');
}
async function discussionsEnabled(client:PoolClient,churchId:string) {
  const result=await client.query('SELECT discussions_enabled FROM churches WHERE id=$1',[churchId]);
  demand(result.rows[0].discussions_enabled,409,'discussions_disabled','Discussion is disabled for this church');
}
async function limitParticipation(client:PoolClient,churchId:string,userId:string) {
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`discussion-rate:${churchId}:${userId}`]);
  const restriction=await client.query('SELECT 1 FROM participation_restrictions WHERE church_id=$1 AND user_id=$2 AND restricted_until>now()',[churchId,userId]);
  demand(!restriction.rowCount,403,'participation_restricted','Your participation is restricted; contact the church using its appeal contact');
  const recent=await client.query("SELECT count(*) FROM discussions WHERE church_id=$1 AND user_id=$2 AND created_at>now()-interval '10 minutes'",[churchId,userId]);
  demand(Number(recent.rows[0].count)<10,429,'participation_rate_limit','Please wait before posting another comment');
}
function requireEngagement(member:{userId:string;capabilities:string[]}) {
  requireCapability(member,'engagement:read');
}
async function engagementSummary(client:PoolClient,churchId:string,publicationId:string,includeComments:boolean) {
  const delivery=(await client.query('SELECT status,count(*)::integer AS count FROM provider_send_intents WHERE church_id=$1 AND publication_id=$2 GROUP BY status',[churchId,publicationId])).rows;
  const comments=includeComments?(await client.query("SELECT d.*,m.display_name AS author_name FROM discussions d JOIN memberships m ON m.church_id=d.church_id AND m.user_id=d.user_id WHERE d.church_id=$1 AND d.publication_id=$2 ORDER BY d.created_at DESC,d.id DESC LIMIT 200",[churchId,publicationId])).rows.map(row=>commentDto(row,true)):[];
  return {delivery:delivery.map(row=>({status:row.status,count:row.count})),comments,...await publicationEngagement(client,churchId,publicationId)};
}

function cursorValue(value:string|undefined) {
  if(!value)return null;
  try{return z.object({at:z.iso.datetime({offset:true}),id:z.string().uuid()}).parse(JSON.parse(Buffer.from(value,'base64url').toString('utf8')));}
  catch{demand(false,422,'invalid_cursor','Choose a valid page of results');}
}
const nextCursor=(row:{id:string;created_at?:Date;published_at?:Date})=>Buffer.from(JSON.stringify({at:(row.created_at??row.published_at)!.toISOString(),id:row.id})).toString('base64url');

async function resolveQuestion(client:PoolClient,churchId:string,row:DiscussionRow,actorId:string,decision:'resolve'|'reopen',reason:string,origin:'reply'|'manual'='manual') {
  await client.query('UPDATE discussions SET resolved_at=CASE WHEN $3 THEN now() ELSE NULL END,resolved_by=CASE WHEN $3 THEN $4 ELSE NULL END,resolution_kind=CASE WHEN $3 THEN $5 ELSE NULL END,version=version+1,updated_at=now() WHERE church_id=$1 AND id=$2',[churchId,row.id,decision==='resolve',actorId,origin]);
  await client.query('INSERT INTO discussion_resolutions(church_id,id,discussion_id,content_version,actor_id,decision,reason) VALUES($1,$2,$3,$4,$5,$6,$7)',[churchId,randomUUID(),row.id,row.content_version,actorId,decision,reason]);
}

async function lockDiscussion(client:PoolClient,churchId:string,id:string,live=true) {
  const locator=(await client.query('SELECT publication_id,parent_id FROM discussions WHERE church_id=$1 AND id=$2',[churchId,id])).rows[0];
  demand(locator,404,'not_found','Comment not found');
  if(live)await readableStudy(client,churchId,locator.publication_id);
  else {
    const found=await client.query('SELECT a.id FROM publications p JOIN aggregates a ON a.church_id=p.church_id AND a.id=p.content_id JOIN slots s ON s.church_id=a.church_id AND s.id=a.slot_id WHERE p.church_id=$1 AND p.id=$2 AND s.deleted_at IS NULL FOR SHARE OF a',[churchId,locator.publication_id]);
    demand(found.rowCount,404,'not_found','Comment not found');
  }
  if(locator.parent_id)await client.query('SELECT id FROM discussions WHERE church_id=$1 AND id=$2 FOR UPDATE',[churchId,locator.parent_id]);
  const row=(await client.query('SELECT * FROM discussions WHERE church_id=$1 AND id=$2 FOR UPDATE',[churchId,id])).rows[0] as DiscussionRow|undefined;
  demand(row,404,'not_found','Comment not found');return row;
}

function matchComment(row:DiscussionRow,header:unknown) {
  demand(header,428,'precondition_required','If-Match is required to review the exact comment');
  demand(header===commentDto(row,true).etag,412,'revision_conflict','The comment changed; reload its latest version');
}

export async function communityRoutes(app:FastifyInstance,database:Database,settings:ReturnType<typeof config>) {
  const routes=tenantRoutes(app,database,settings);
  const memberRoutes=tenantRoutes(app,database,settings,'member');
  memberRoutes.get('/studies/:id/community',async({client,member,churchId,id})=>{
    await readableStudy(client,churchId,id!);
    const church=(await client.query('SELECT discussions_enabled,appeal_contact FROM churches WHERE id=$1',[churchId])).rows[0];
    const reactions=(await client.query('SELECT type,count(*)::integer AS count FROM reactions WHERE church_id=$1 AND publication_id=$2 GROUP BY type',[churchId,id])).rows;
    const mine=(await client.query('SELECT type FROM reactions WHERE church_id=$1 AND publication_id=$2 AND user_id=$3',[churchId,id,member.userId])).rows[0];
    const comments=church.discussions_enabled?(await client.query("SELECT d.*,m.display_name AS author_name FROM discussions d JOIN memberships m ON m.church_id=d.church_id AND m.user_id=d.user_id WHERE d.church_id=$1 AND d.publication_id=$2 AND (d.status IN ('approved','hidden','erased') OR d.user_id=$3) ORDER BY d.created_at,d.id LIMIT 200",[churchId,id,member.userId])).rows:[];
    return {discussionsEnabled:church.discussions_enabled,appealContact:church.appeal_contact,screeningMode:'automatic_policy_rules_with_human_review',reactions:{thankful:0,encouraged:0,praying:0,like:0,fire:0,...Object.fromEntries(reactions.map(row=>[row.type,row.count]))},myReaction:mine?.type??null,comments:comments.map(row=>commentDto(row))};
  });
  memberRoutes.command('/studies/:id/open',async({client,member,churchId,id})=>{
    await readableStudy(client,churchId,id!);
    if(member.capabilities.includes('workspace:read'))return {status:200,body:{recorded:false,reason:'workspace_preview'}};
    const audience=(await client.query('SELECT retired_at FROM publication_audiences WHERE church_id=$1 AND publication_id=$2 FOR SHARE',[churchId,id])).rows[0];
    if(audience?.retired_at)return {status:200,body:{recorded:false,reason:'tracking_retired'}};
    await client.query('INSERT INTO study_opens(church_id,publication_id,user_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[churchId,id,member.userId]);
    return {status:200,body:{recorded:true}};
  });
  routes.get('/engagement/studies',async({client,member,churchId,request})=>{
    requireEngagement(member);
    const query=z.object({cursor:z.string().max(500).optional(),limit:z.coerce.number().int().min(1).max(50).default(20),includeWithdrawn:z.enum(['true','false']).default('false')}).parse(request.query);
    const cursor=cursorValue(query.cursor);
    const result=await client.query(`SELECT p.id,p.content_id,p.published_at,r.payload,to_char(s.local_date,'YYYY-MM-DD') AS local_date,s.local_time,s.time_zone,sl.id AS slot_id,sl.lifecycle_version,sl.withdrawn_at,a.live_publication_id,
      (SELECT count(*)::integer FROM reactions x WHERE x.church_id=p.church_id AND x.publication_id=p.id) AS reaction_count,
      (SELECT count(*)::integer FROM discussions x WHERE x.church_id=p.church_id AND x.publication_id=p.id) AS discussion_count
      FROM publications p JOIN revisions r ON r.church_id=p.church_id AND r.id=p.revision_id JOIN schedules s ON s.church_id=p.church_id AND s.id=p.schedule_id JOIN aggregates a ON a.church_id=p.church_id AND a.id=p.content_id JOIN slots sl ON sl.church_id=a.church_id AND sl.id=a.slot_id
      WHERE p.church_id=$1 AND sl.deleted_at IS NULL ${query.includeWithdrawn==='false'?'AND sl.withdrawn_at IS NULL AND a.live_publication_id=p.id':''} ${cursor?'AND (p.published_at,p.id)<($2::timestamptz,$3::uuid)':''} ORDER BY p.published_at DESC,p.id DESC LIMIT ${query.limit+1}`,[churchId,...(cursor?[cursor.at,cursor.id]:[])]);
    const hasMore=result.rows.length>query.limit;const rows=result.rows.slice(0,query.limit);return {items:rows.map(row=>({publicationId:row.id,contentId:row.content_id,studyId:row.slot_id,slotEtag:`"slot:${row.slot_id}:${row.lifecycle_version}"`,withdrawn:!!row.withdrawn_at,historical:row.live_publication_id!==row.id,title:(row.payload as {title?:string}).title??'Untitled study',publishedAt:row.published_at,scheduledAt:{localDate:row.local_date,localTime:row.local_time,timeZone:row.time_zone},reactionCount:row.reaction_count,discussionCount:row.discussion_count})),nextCursor:hasMore?nextCursor(rows.at(-1)!):null};
  });
  routes.get('/engagement/studies/:id',async({client,member,churchId,id})=>{
    requireEngagement(member);
    const row=(await client.query("SELECT p.id,p.content_id,p.revision_id,p.published_at,r.payload,to_char(s.local_date,'YYYY-MM-DD') AS local_date,s.local_time,s.time_zone,sl.id AS slot_id,sl.lifecycle_version,sl.withdrawn_at,a.live_publication_id FROM publications p JOIN revisions r ON r.church_id=p.church_id AND r.id=p.revision_id JOIN schedules s ON s.church_id=p.church_id AND s.id=p.schedule_id JOIN aggregates a ON a.church_id=p.church_id AND a.id=p.content_id JOIN slots sl ON sl.church_id=a.church_id AND sl.id=a.slot_id WHERE p.church_id=$1 AND p.id=$2 AND sl.deleted_at IS NULL",[churchId,id])).rows[0];
    demand(row,404,'not_found','Published study not found');
    const summary=await engagementSummary(client,churchId,id!,member.capabilities.includes('moderation:manage'));
    return {publication:{id:row.id,contentId:row.content_id,revisionId:row.revision_id,payload:row.payload,publishedAt:row.published_at,studyId:row.slot_id,slotEtag:`"slot:${row.slot_id}:${row.lifecycle_version}"`,withdrawn:!!row.withdrawn_at,historical:row.live_publication_id!==row.id,scheduledAt:{localDate:row.local_date,localTime:row.local_time,timeZone:row.time_zone}},...summary,canReadComments:member.capabilities.includes('moderation:manage')};
  });
  routes.get('/engagement/studies/:id/comments',async({client,member,churchId,id,request})=>{
    requireEngagement(member);requireCapability(member,'moderation:manage');
    const exists=await client.query('SELECT p.id FROM publications p JOIN aggregates a ON a.church_id=p.church_id AND a.id=p.content_id JOIN slots s ON s.church_id=a.church_id AND s.id=a.slot_id WHERE p.church_id=$1 AND p.id=$2 AND s.deleted_at IS NULL',[churchId,id]);demand(exists.rowCount,404,'not_found','Published study not found');
    const query=z.object({filter:z.enum(['all','unanswered','approved','pending','declined']).default('all'),limit:z.coerce.number().int().min(1).max(100).default(50),cursor:z.string().max(500).optional()}).parse(request.query);
    const cursor=cursorValue(query.cursor);
    const condition=query.filter==='unanswered'?"AND d.kind='question' AND d.status='approved' AND d.resolved_at IS NULL":query.filter==='all'?'':`AND d.status='${query.filter}'`;
    const rows=(await client.query(`SELECT d.*,m.display_name AS author_name FROM discussions d JOIN memberships m ON m.church_id=d.church_id AND m.user_id=d.user_id WHERE d.church_id=$1 AND d.publication_id=$2 ${condition} ${cursor?'AND (d.created_at,d.id)<($3::timestamptz,$4::uuid)':''} ORDER BY d.created_at DESC,d.id DESC LIMIT ${query.limit+1}`,[churchId,id,...(cursor?[cursor.at,cursor.id]:[])])).rows;
    const items=rows.slice(0,query.limit);return {items:items.map(row=>commentDto(row,true)),nextCursor:rows.length>query.limit?nextCursor(items.at(-1)!):null};
  });
  memberRoutes.command('/studies/:id/discussion',async({client,member,churchId,request,id})=>{
    await readableStudy(client,churchId,id!);await discussionsEnabled(client,churchId);await limitParticipation(client,churchId,member.userId);
    const body=z.object({body:z.string().trim().min(1).max(10000),kind:z.enum(['response','question']).default('response')}).strict().parse(request.body);
    const commentId=randomUUID();const result=await client.query("INSERT INTO discussions(church_id,id,publication_id,user_id,body,kind) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",[churchId,commentId,id,member.userId,body.body,body.kind]);
    await client.query('INSERT INTO discussion_revisions(church_id,id,discussion_id,version,body) VALUES($1,$2,$3,1,$4)',[churchId,randomUUID(),commentId,body.body]);
    await audit(client,churchId,member.userId,'discussion.submitted',commentId);
    await screenComment(client,churchId,result.rows[0]);
    return {status:201,body:commentDto((await client.query('SELECT * FROM discussions WHERE church_id=$1 AND id=$2',[churchId,commentId])).rows[0])};
  });
  memberRoutes.command('/discussion/:id/revisions',async({client,member,churchId,request,id})=>{
    const row=await lockDiscussion(client,churchId,id!);
    demand(row.user_id===member.userId,403,'forbidden','Only the author can edit this comment');
    await discussionsEnabled(client,churchId);
    await limitParticipation(client,churchId,member.userId);
    demand(request.headers['if-match'],428,'precondition_required','If-Match is required');demand(request.headers['if-match']===`"discussion:${row.id}:${row.version}"`,412,'revision_conflict','A newer comment version exists');
    demand(row.kind!=='reply',403,'forbidden','Ask a church contributor to revise their reply');
    const body=z.object({body:z.string().trim().min(1).max(10000),kind:z.enum(['response','question']).optional()}).strict().parse(request.body);
    const result=await client.query("UPDATE discussions SET body=$3,kind=$4,status='pending',content_version=content_version+1,resolved_at=NULL,resolved_by=NULL,resolution_kind=NULL,version=version+1,updated_at=now() WHERE church_id=$1 AND id=$2 RETURNING *",[churchId,id,body.body,body.kind??row.kind]);
    await client.query('INSERT INTO discussion_revisions(church_id,id,discussion_id,version,body) VALUES($1,$2,$3,$4,$5)',[churchId,randomUUID(),id,row.version+1,body.body]);
    await audit(client,churchId,member.userId,'discussion.edited',id!);
    await screenComment(client,churchId,result.rows[0]);
    const current=commentDto((await client.query('SELECT * FROM discussions WHERE church_id=$1 AND id=$2',[churchId,id])).rows[0]);return {status:201,body:current,etag:current.etag};
  });
  routes.command('/discussion/:id/replies',async({client,member,churchId,request,id})=>{
    requireCapability(member,'moderation:manage');
    const question=await lockDiscussion(client,churchId,id!);matchComment(question,request.headers['if-match']);await discussionsEnabled(client,churchId);await limitParticipation(client,churchId,member.userId);
    demand(question.kind==='question'&&question.status==='approved'&&!question.parent_id,409,'question_not_posted','Reply to an approved member question');
    const body=z.object({body:z.string().trim().min(1).max(10000)}).strict().parse(request.body);
    const replyId=randomUUID();const reply=(await client.query("INSERT INTO discussions(church_id,id,publication_id,user_id,body,kind,parent_id,parent_content_version,status) VALUES($1,$2,$3,$4,$5,'reply',$6,$7,'approved') RETURNING *",[churchId,replyId,question.publication_id,member.userId,body.body,id,question.content_version])).rows[0];
    await client.query('INSERT INTO discussion_revisions(church_id,id,discussion_id,version,body) VALUES($1,$2,$3,1,$4)',[churchId,randomUUID(),replyId,body.body]);
    await resolveQuestion(client,churchId,question,member.userId,'resolve','Contributor replied to the posted question','reply');
    await audit(client,churchId,member.userId,'discussion.replied',replyId,{questionId:id});
    return {status:201,body:commentDto(reply),etag:commentDto(reply).etag};
  });
  routes.command('/discussion/:id/resolution',async({client,member,churchId,request,id})=>{
    requireCapability(member,'moderation:manage');const row=await lockDiscussion(client,churchId,id!);matchComment(row,request.headers['if-match']);
    demand(row.kind==='question'&&row.status==='approved',409,'question_not_posted','Only a posted question can be resolved');
    const body=z.object({decision:z.enum(['resolve','reopen']),reason:z.string().trim().min(1).max(1000)}).strict().parse(request.body);
    await resolveQuestion(client,churchId,row,member.userId,body.decision,body.reason);
    const current=commentDto((await client.query('SELECT * FROM discussions WHERE church_id=$1 AND id=$2',[churchId,id])).rows[0],true);
    return {status:200,body:current,etag:current.etag};
  });
  memberRoutes.command('/studies/:id/reports',async({client,member,churchId,request,id})=>{
    await readableStudy(client,churchId,id!);
    const body=z.object({commentId:z.string().uuid(),reason:z.string().trim().min(1).max(5000)}).strict().parse(request.body);
    const target=await client.query("SELECT 1 FROM discussions WHERE church_id=$1 AND id=$2 AND publication_id=$3 AND (status IN ('approved','hidden') OR user_id=$4)",[churchId,body.commentId,id,member.userId]);demand(target.rowCount,404,'not_found','Comment not found');
    const recent=await client.query("SELECT count(*) FROM reports WHERE church_id=$1 AND reporter_id=$2 AND created_at>now()-interval '10 minutes'",[churchId,member.userId]);demand(Number(recent.rows[0].count)<20,429,'report_rate_limit','Please wait before submitting another report');
    const reportId=randomUUID();await client.query('INSERT INTO reports(church_id,id,discussion_id,reporter_id,reason) VALUES($1,$2,$3,$4,$5)',[churchId,reportId,body.commentId,member.userId,body.reason]);
    await audit(client,churchId,member.userId,'discussion.reported',body.commentId,{reportId});return {status:201,body:{id:reportId,status:'pending'}};
  });
  memberRoutes.get('/my-reports',async({client,member,churchId})=>({items:(await client.query('SELECT id,discussion_id,reason,status,created_at FROM reports WHERE church_id=$1 AND reporter_id=$2 ORDER BY created_at DESC',[churchId,member.userId])).rows.map(row=>({id:row.id,commentId:row.discussion_id,reason:row.reason,status:row.status,createdAt:row.created_at}))}));
  routes.get('/moderation',async({client,member,churchId})=>{
    requireCapability(member,'moderation:manage');
    const comments=(await client.query("SELECT d.*,m.display_name AS author_name FROM discussions d JOIN memberships m ON m.church_id=d.church_id AND m.user_id=d.user_id WHERE d.church_id=$1 AND (d.status IN ('pending','declined') OR d.id IN (SELECT discussion_id FROM reports WHERE church_id=$1 AND status='pending')) ORDER BY d.created_at,d.id LIMIT 200",[churchId])).rows;
    const reports=(await client.query('SELECT * FROM reports WHERE church_id=$1 ORDER BY created_at DESC LIMIT 200',[churchId])).rows;
    const reactions=(await client.query('SELECT id,publication_id,user_id,type FROM reactions WHERE church_id=$1 LIMIT 200',[churchId])).rows.map(row=>({id:row.id,publicationId:row.publication_id,userId:row.user_id,type:row.type}));
    const restrictions=(await client.query('SELECT user_id,restricted_until,reason FROM participation_restrictions WHERE church_id=$1 AND restricted_until>now()',[churchId])).rows.map(row=>({userId:row.user_id,until:row.restricted_until,reason:row.reason}));
    return {items:comments.map(row=>commentDto(row,true)),reports:reports.map(row=>({id:row.id,commentId:row.discussion_id,reporterId:row.reporter_id,reason:row.reason,status:row.status,createdAt:row.created_at})),reactions,restrictions};
  });
  routes.command('/moderation/:id/decisions',async({client,member,churchId,request,id})=>{
    requireCapability(member,'moderation:manage');
    const body=z.object({decision:z.enum(['approve','hide','decline']),reason:z.string().trim().min(1).max(5000)}).strict().parse(request.body);
    const target=await lockDiscussion(client,churchId,id!,false);matchComment(target,request.headers['if-match']);
    demand(target.status!=='erased',409,'comment_erased','An erased comment cannot be restored');
    await client.query('INSERT INTO moderation_actions(church_id,id,discussion_id,actor_id,decision,reason) VALUES($1,$2,$3,$4,$5,$6)',[churchId,randomUUID(),id,member.userId,body.decision,body.reason]);
    const result=await client.query('UPDATE discussions SET status=$3,version=version+1,updated_at=now() WHERE church_id=$1 AND id=$2 RETURNING *',[churchId,id,body.decision==='approve'?'approved':body.decision==='decline'?'declined':'hidden']);
    if(target.parent_id&&body.decision!=='approve') {
      const root=(await client.query('SELECT * FROM discussions WHERE church_id=$1 AND id=$2',[churchId,target.parent_id])).rows[0] as DiscussionRow;
      const answers=(await client.query("SELECT 1 FROM discussions WHERE church_id=$1 AND parent_id=$2 AND status='approved' AND parent_content_version=$3 LIMIT 1",[churchId,target.parent_id,root.content_version])).rowCount;
      if(!answers&&root.resolution_kind==='reply')await resolveQuestion(client,churchId,root,member.userId,'reopen','The published answer was removed');
    }
    await client.query("UPDATE reports SET status='resolved' WHERE church_id=$1 AND discussion_id=$2 AND status='pending'",[churchId,id]);
    await audit(client,churchId,member.userId,`discussion.${body.decision}`,id!,{reason:body.reason,reviewedVersion:target.version});return {status:201,body:commentDto(result.rows[0],true),etag:commentDto(result.rows[0],true).etag};
  });
  routes.command('/moderation/reactions/:id/hide',async({client,member,churchId,id,request})=>{
    requireCapability(member,'moderation:manage');const body=z.object({reason:z.string().trim().min(1).max(5000)}).strict().parse(request.body);
    const result=await client.query('DELETE FROM reactions WHERE church_id=$1 AND id=$2 RETURNING publication_id',[churchId,id]);demand(result.rowCount,404,'not_found','Reaction not found');
    await audit(client,churchId,member.userId,'reaction.removed',id!,{reason:body.reason,publicationId:result.rows[0].publication_id});return {status:200,body:{id,status:'removed'}};
  });
  routes.command('/moderation/restrictions',async({client,member,churchId,request})=>{
    requireCapability(member,'moderation:manage');const body=z.object({userId:z.string().min(1).max(500),until:z.iso.datetime({offset:true}),reason:z.string().trim().min(1).max(5000)}).strict().parse(request.body);
    demand(body.userId!==member.userId,403,'self_change_forbidden','A different moderator must change your restriction');
    demand((await client.query('SELECT 1 FROM memberships WHERE church_id=$1 AND user_id=$2 AND active',[churchId,body.userId])).rowCount,404,'not_found','Member not found');
    demand(new Date(body.until).getTime()<=Date.now()+365*24*60*60*1000,422,'invalid_restriction','Restrictions require review within one year');
    await client.query('INSERT INTO participation_restrictions(church_id,user_id,restricted_until,reason,restricted_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(church_id,user_id) DO UPDATE SET restricted_until=excluded.restricted_until,reason=excluded.reason,restricted_by=excluded.restricted_by,updated_at=now()',[churchId,body.userId,body.until,body.reason,member.userId]);
    await audit(client,churchId,member.userId,'participation.restriction_changed',churchId,{subject:body.userId,until:body.until,reason:body.reason});return {status:200,body:{userId:body.userId,until:body.until}};
  });
}
