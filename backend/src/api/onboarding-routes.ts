import { randomBytes, randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { IANAZone } from 'luxon';
import { authenticate, csrf, type Session } from '../auth/routes.js';
import type { config } from '../infrastructure/config.js';
import { Database, requireCapability } from '../infrastructure/database.js';
import { audit } from '../modules/editorial.js';
import { canonical, hash } from '../modules/revisions.js';
import { demand } from './errors.js';
import { requireMfa } from '../auth/session.js';
import { tenantRoutes } from './tenant-boundary.js';
import type { CommandResult } from './commands.js';

export const roleCapabilities = {
  member: [],
  contributor: ['workspace:read','sermons:create','series:manage','plans:edit','content:edit','comments:write','ai:use','theme:manage','settings:manage','privacy:manage','audit:read','plans:approve','content:approve','publication:schedule','moderation:manage','engagement:read','studies:delete'],
  approver: ['workspace:read','plans:approve','content:approve','comments:write'],
  publisher: ['workspace:read','publication:schedule','comments:write'],
  moderator: ['workspace:read','moderation:manage','comments:write'],
  admin: ['workspace:read','memberships:manage','admin:manage','settings:manage','privacy:manage','audit:read','series:manage','sermons:create','studies:delete','engagement:read','plans:approve','content:approve','publication:schedule','comments:write'],
};
const roleSchema=z.enum(['member','contributor','approver','publisher','moderator','admin']);
const subjectSchema=z.string().trim().min(1).max(500);
const sensitiveRoles=new Set(['approver','publisher','admin']);

async function globalCommand(database:Database,request:FastifyRequest,session:Session,action:(client:PoolClient)=>Promise<CommandResult>):Promise<CommandResult> {
  const key=request.headers['idempotency-key'];demand(typeof key==='string'&&key.length>=8&&key.length<=200,422,'idempotency_required','Provide a unique Idempotency-Key');
  const scopedKey=`${request.method}:${request.url.split('?')[0]}:${key}`;
  const requestHash=hash(canonical(request.body??null));
  const client=await database.pool.connect();
  try {
    await client.query('BEGIN');await client.query("SELECT set_config('app.user_id',$1,true)",[session.userId]);
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${session.userId}:${scopedKey}`]);
    const prior=(await client.query('SELECT * FROM onboarding_commands WHERE user_id=$1 AND key=$2',[session.userId,scopedKey])).rows[0];
    let result:CommandResult;
    if(prior){demand(prior.request_hash===requestHash,409,'idempotency_conflict','This key was already used for different input');result=prior.response;}
    else{result=await action(client);await client.query('INSERT INTO onboarding_commands(user_id,key,request_hash,response) VALUES($1,$2,$3,$4)',[session.userId,scopedKey,requestHash,result]);}
    await client.query('COMMIT');return result;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

export async function onboardingRoutes(app:FastifyInstance,database:Database,settings:ReturnType<typeof config>) {
  app.post('/v1/churches',async(request,reply)=>{
    const session=await authenticate(database,request);csrf(request,session,settings.appOrigin);
    const input=z.object({name:z.string().trim().min(1).max(300),slug:z.string().regex(/^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/),timeZone:z.string().max(100)}).strict().parse(request.body);
    demand(IANAZone.isValidZone(input.timeZone),422,'invalid_time_zone','Use a valid IANA timezone');
    const result=await globalCommand(database,request,session,async client=>{
      const churchId=randomUUID();await client.query("SELECT set_config('app.church_id',$1,true)",[churchId]);
      await client.query('INSERT INTO churches(id,slug,name,time_zone) VALUES($1,$2,$3,$4)',[churchId,input.slug,input.name,input.timeZone]);
      const grants=[...roleCapabilities.admin,'policy:manage'];
      await client.query('INSERT INTO memberships(church_id,user_id,display_name,capabilities) VALUES($1,$2,$3,$4)',[churchId,session.userId,session.displayName,grants]);
      await audit(client,churchId,session.userId,'church.created',churchId,{approvalPolicy:'separate-author-v1',ownerHasImplicitApproval:false});
      return {status:201,body:{id:churchId,...input,capabilities:grants,readingPolicy:'members',discussionsEnabled:false}};
    });
    return reply.code(result.status).send(result.body);
  });
  const routes=tenantRoutes(app,database,settings);
  const memberRoutes=tenantRoutes(app,database,settings,'member');
  routes.get('/invitations',async({client,member,churchId})=>{
    requireCapability(member,'memberships:manage');
    const result=await client.query('SELECT id,target_subject,role,invited_by,expires_at,accepted_at,revoked_at,created_at FROM invitations WHERE church_id=$1 ORDER BY created_at DESC LIMIT 100',[churchId]);
    return {items:result.rows.map(row=>({id:row.id,targetSubject:row.target_subject,role:row.role,invitedBy:row.invited_by,expiresAt:row.expires_at,acceptedAt:row.accepted_at,revokedAt:row.revoked_at,createdAt:row.created_at}))};
  });
  routes.command('/invitations',async({client,member,churchId,request})=>{
    requireCapability(member,'memberships:manage');
    const body=z.object({targetSubject:subjectSchema,role:roleSchema,reason:z.string().trim().min(1).max(2000)}).strict().parse(request.body);
    demand(body.targetSubject!==member.userId,403,'self_elevation_forbidden','Another named identity must accept this invitation');
    if(body.role==='admin')requireCapability(member,'admin:manage'); else if(sensitiveRoles.has(body.role))requireCapability(member,'policy:manage');
    const token=randomBytes(32).toString('base64url');const id=randomUUID();
    const result=await client.query("INSERT INTO invitations(church_id,id,target_subject,role,capabilities,invited_by,reason,token_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now()+interval '7 days') RETURNING expires_at",[churchId,id,body.targetSubject,body.role,roleCapabilities[body.role],member.userId,body.reason,hash(token)]);
    await audit(client,churchId,member.userId,'membership.invited',id,{targetSubject:body.targetSubject,role:body.role,reason:body.reason});
    return {status:201,body:{id,targetSubject:body.targetSubject,role:body.role,expiresAt:result.rows[0].expires_at,token,acceptPath:'/v1/invitations/accept',delivery:'share_securely_with_named_recipient'}};
  });
  routes.command('/invitations/:id/revoke',async({client,member,churchId,id})=>{
    requireCapability(member,'memberships:manage');const result=await client.query('UPDATE invitations SET revoked_at=now() WHERE church_id=$1 AND id=$2 AND accepted_at IS NULL RETURNING id',[churchId,id]);demand(result.rowCount,404,'not_found','Pending invitation not found');
    await audit(client,churchId,member.userId,'membership.invitation_revoked',id!);return {status:200,body:{id,status:'revoked'}};
  });
  app.post('/v1/invitations/accept',async(request,reply)=>{
    const session=await authenticate(database,request,'member');csrf(request,session,settings.appOrigin);const body=z.object({token:z.string().min(32).max(200)}).strict().parse(request.body);
    const result=await globalCommand(database,request,session,async client=>{
      const locator=(await client.query('SELECT * FROM lookup_invitation($1,$2)',[hash(body.token),session.userId])).rows[0];demand(locator,404,'not_found','Valid invitation for this identity not found');
      await client.query("SELECT set_config('app.church_id',$1,true)",[locator.church_id]);
      const invitation=(await client.query('SELECT * FROM invitations WHERE church_id=$1 AND id=$2 FOR UPDATE',[locator.church_id,locator.id])).rows[0];
      demand(invitation&&!invitation.accepted_at&&!invitation.revoked_at&&new Date(invitation.expires_at).getTime()>Date.now(),409,'invitation_unavailable','This invitation is no longer available');
      if (invitation.capabilities.length) requireMfa(session);
      const inviter=(await client.query('SELECT capabilities FROM memberships WHERE church_id=$1 AND user_id=$2 AND active',[locator.church_id,invitation.invited_by])).rows[0];
      demand(inviter?.capabilities.includes('memberships:manage')&&(!sensitiveRoles.has(invitation.role)||inviter.capabilities.includes('policy:manage')),409,'inviter_authority_changed','Invitation authority is no longer active');
      const existing=(await client.query('SELECT capabilities FROM memberships WHERE church_id=$1 AND user_id=$2',[locator.church_id,session.userId])).rows[0];
      demand(!existing,409,'already_member','Use an audited membership-role change for an existing member');
      await client.query('INSERT INTO memberships(church_id,user_id,display_name,capabilities) VALUES($1,$2,$3,$4)',[locator.church_id,session.userId,session.displayName,invitation.capabilities]);
      await client.query('UPDATE invitations SET accepted_at=now() WHERE church_id=$1 AND id=$2',[locator.church_id,locator.id]);
      await audit(client,locator.church_id,session.userId,'membership.invitation_accepted',locator.id,{role:invitation.role,invitedBy:invitation.invited_by});
      return {status:201,body:{churchId:locator.church_id,role:invitation.role,capabilities:invitation.capabilities}};
    });return reply.code(result.status).send(result.body);
  });
  routes.command('/members/roles',async({client,member,churchId,request})=>{
    requireCapability(member,'memberships:manage');
    const body=z.object({userId:subjectSchema,role:roleSchema,reason:z.string().trim().min(1).max(2000)}).strict().parse(request.body);
    demand(body.userId!==member.userId,403,'self_elevation_forbidden','A different policy owner must change your own grants');
    const target=(await client.query('SELECT capabilities FROM memberships WHERE church_id=$1 AND user_id=$2 AND active FOR UPDATE',[churchId,body.userId])).rows[0];demand(target,404,'not_found','Active member not found');
    const sensitiveExisting=target.capabilities.some((capability:string)=>['plans:approve','content:approve','publication:schedule','policy:manage','memberships:manage'].includes(capability));
    if(body.role==='admin')requireCapability(member,'admin:manage'); else if(sensitiveExisting||sensitiveRoles.has(body.role))requireCapability(member,'policy:manage');
    if(target.capabilities.includes('admin:manage')) demand(Number((await client.query("SELECT count(*) FROM memberships WHERE church_id=$1 AND active AND 'admin:manage'=ANY(capabilities)",[churchId])).rows[0].count)>1,409,'final_admin_protected','The final administrator cannot be downgraded');
    demand(!target.capabilities.includes('policy:manage'),409,'policy_owner_protected','Changing the policy owner requires a separately reviewed ownership transfer');
    await client.query('UPDATE memberships SET capabilities=$3 WHERE church_id=$1 AND user_id=$2',[churchId,body.userId,roleCapabilities[body.role]]);
    await audit(client,churchId,member.userId,'membership.role_changed',churchId,{targetSubject:body.userId,role:body.role,previousCapabilities:target.capabilities,reason:body.reason});
    return {status:200,body:{userId:body.userId,role:body.role,capabilities:roleCapabilities[body.role]}};
  });
  routes.command('/members/status',async({client,member,churchId,request})=>{
    requireCapability(member,'memberships:manage');const body=z.object({userId:subjectSchema,active:z.boolean(),reason:z.string().trim().min(1).max(2000)}).strict().parse(request.body);
    demand(body.userId!==member.userId,403,'self_change_forbidden','Another policy owner must change your membership');
    const target=(await client.query('SELECT capabilities FROM memberships WHERE church_id=$1 AND user_id=$2 FOR UPDATE',[churchId,body.userId])).rows[0];demand(target,404,'not_found','Member not found');
    if(target.capabilities.includes('admin:manage')) { requireCapability(member,'admin:manage'); demand(Number((await client.query("SELECT count(*) FROM memberships WHERE church_id=$1 AND active AND 'admin:manage'=ANY(capabilities)",[churchId])).rows[0].count)>1,409,'final_admin_protected','The final administrator cannot be deactivated'); }
    else if(target.capabilities.some((capability:string)=>['plans:approve','content:approve','publication:schedule','policy:manage','memberships:manage'].includes(capability)))requireCapability(member,'policy:manage');
    demand(!target.capabilities.includes('policy:manage'),409,'policy_owner_protected','The policy owner cannot be removed through routine membership management');
    if(body.active)demand(!(await client.query('SELECT 1 FROM privacy_tombstones WHERE church_id=$1 AND subject_hash=$2',[churchId,hash(`${churchId}:${body.userId}`)])).rowCount,409,'privacy_reactivation_blocked','This identity has an erasure tombstone; reactivation requires a separate reviewed recovery workflow');
    await client.query('UPDATE memberships SET active=$3 WHERE church_id=$1 AND user_id=$2',[churchId,body.userId,body.active]);
    await audit(client,churchId,member.userId,'membership.status_changed',churchId,{targetSubject:body.userId,active:body.active,reason:body.reason});return {status:200,body:{userId:body.userId,active:body.active}};
  });
  memberRoutes.command('/privacy/requests',async({client,member,churchId,request})=>{
    const body=z.object({kind:z.enum(['export','erasure'])}).strict().parse(request.body);const id=randomUUID();
    await client.query('INSERT INTO privacy_requests(church_id,id,user_id,kind) VALUES($1,$2,$3,$4)',[churchId,id,member.userId,body.kind]);
    await audit(client,churchId,member.userId,`privacy.${body.kind}_requested`,id);return {status:202,body:{id,kind:body.kind,status:'requested',message:'A church privacy administrator must review this request; no erasure or provider deletion has been claimed'}};
  });
  memberRoutes.get('/privacy/requests',async({client,member,churchId})=>{
    const administrator=member.capabilities.includes('privacy:manage');const result=await client.query(`SELECT * FROM privacy_requests WHERE church_id=$1 ${administrator?'':'AND user_id=$2'} ORDER BY created_at DESC`,[churchId,...(administrator?[]:[member.userId])]);
    return {items:result.rows.map(row=>({id:row.id,userId:row.user_id,kind:row.kind,status:row.status,createdAt:row.created_at,completedAt:row.completed_at??null,retentionReviewAt:row.retention_review_at??null,fulfillment:row.fulfillment??null}))};
  });
}
