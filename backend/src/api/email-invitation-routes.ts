import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, csrf } from '../auth/routes.js';
import { requireMfa } from '../auth/session.js';
import type { config } from '../infrastructure/config.js';
import { Database, requireCapability } from '../infrastructure/database.js';
import { sendInvitationChallenge, sendInvitationEmail } from '../integrations/invitation-email.js';
import { audit } from '../modules/editorial.js';
import { hash } from '../modules/revisions.js';
import { demand, ApiError } from './errors.js';
import { roleCapabilities } from './onboarding-routes.js';
import { tenantRoutes } from './tenant-boundary.js';

const role = z.enum(['contributor','approver','publisher','moderator','admin']);
const email = z.string().trim().toLowerCase().pipe(z.email().max(320));
const inviteInput = z.object({firstName:z.string().trim().min(1).max(100),lastName:z.string().trim().min(1).max(100),email,role}).strict();
const tokenInput = z.object({token:z.string().min(32).max(200)}).strict();
const newToken = () => randomBytes(32).toString('base64url');
const inviteCapabilities = {
  ...roleCapabilities,
  contributor: ['workspace:read','sermons:create','series:manage','plans:edit','content:edit','comments:write','ai:use'],
};

function demandInviterAuthority(capabilities: string[], requestedRole: z.infer<typeof role>) {
  demand(capabilities.includes('memberships:manage'),403,'forbidden','This action requires church access management');
  if (requestedRole === 'admin') demand(capabilities.includes('admin:manage') && capabilities.includes('policy:manage'),403,'forbidden','An authorized policy owner must invite an administrator');
  if (['approver','publisher'].includes(requestedRole)) demand(capabilities.includes('policy:manage'),403,'forbidden','A policy owner must invite this role');
}

export function emailInvitationRoutes(app: FastifyInstance, database: Database, settings: ReturnType<typeof config>) {
  const routes = tenantRoutes(app,database,settings);
  async function recordDelivery(churchId:string,id:string,token:string,status:'accepted_by_provider'|'failed'|'unknown') {
    const client=await database.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.church_id',$1,true)",[churchId]);
      await client.query('UPDATE email_invitations SET delivery_status=$3,last_delivery_at=now() WHERE church_id=$1 AND id=$2 AND token_hash=$4',[churchId,id,status,hash(token)]);
      await client.query('COMMIT');
    } catch(error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  routes.get('/email-invitations',async({client,member,churchId})=>{
    requireCapability(member,'memberships:manage');
    const result=await client.query('SELECT id,first_name,last_name,email,role,expires_at,delivery_status,delivery_attempts,accepted_at,revoked_at,created_at FROM email_invitations WHERE church_id=$1 ORDER BY created_at DESC LIMIT 100',[churchId]);
    return {items:result.rows.map(row=>({id:row.id,firstName:row.first_name,lastName:row.last_name,email:row.email,role:row.role,expiresAt:row.expires_at,deliveryStatus:row.delivery_status,deliveryAttempts:row.delivery_attempts,acceptedAt:row.accepted_at,revokedAt:row.revoked_at,createdAt:row.created_at}))};
  });
  app.post('/v1/churches/:churchId/email-invitations',async(request,reply)=>{
    const session=await authenticate(database,request,'contributor'); csrf(request,session,settings.appOrigin);
    const {churchId}=z.object({churchId:z.string().uuid()}).parse(request.params);
    const input=inviteInput.parse(request.body);
    const token=newToken(), id=randomUUID();
    const created=await database.transaction(churchId,session.userId,async(client,member)=>{
      demandInviterAuthority(member.capabilities,input.role);
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`email-invitation:${churchId}:${input.email}`]);
      await client.query("UPDATE email_invitations SET revoked_at=now() WHERE church_id=$1 AND email=$2 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at<=now()",[churchId,input.email]);
      const pending=await client.query('SELECT id,first_name,last_name,role,delivery_status FROM email_invitations WHERE church_id=$1 AND email=$2 AND accepted_at IS NULL AND revoked_at IS NULL',[churchId,input.email]);
      if (pending.rowCount) {
        const previous=pending.rows[0];
        demand(previous.first_name===input.firstName && previous.last_name===input.lastName && previous.role===input.role,409,'invitation_exists','This church already has a pending invitation for that email');
        return {existingId:previous.id as string,deliveryStatus:previous.delivery_status as string,churchName:''};
      }
      const church=(await client.query('SELECT name FROM churches WHERE id=$1',[churchId])).rows[0];
      await client.query("INSERT INTO email_invitations(church_id,id,first_name,last_name,email,role,capabilities,invited_by,token_hash,expires_at,delivery_status,delivery_attempts,last_delivery_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now()+interval '7 days','sending',1,now())",[churchId,id,input.firstName,input.lastName,input.email,input.role,inviteCapabilities[input.role],session.userId,hash(token)]);
      await audit(client,churchId,session.userId,'membership.email_invited',id,{role:input.role,emailHash:hash(input.email)});
      return {churchName:church.name as string};
    },session);
    if ('existingId' in created) return reply.code(200).send({id:created.existingId,deliveryStatus:created.deliveryStatus});
    const deliveryStatus=await sendInvitationEmail({to:input.email,firstName:input.firstName,churchName:created.churchName,role:input.role,token,origin:settings.appOrigin})
      .catch(error=>error instanceof Error && error.message==='Invitation email delivery is not configured'?'failed' as const:'unknown' as const);
    await recordDelivery(churchId,id,token,deliveryStatus);
    return reply.code(201).send({id,deliveryStatus,...(!settings.production&&process.env.ROOTED_EMAIL_TEST_MODE==='true'?{testToken:token}:{})});
  });
  app.post('/v1/churches/:churchId/email-invitations/:id/resend',async(request,reply)=>{
    const session=await authenticate(database,request,'contributor'); csrf(request,session,settings.appOrigin);
    const {churchId,id}=z.object({churchId:z.string().uuid(),id:z.string().uuid()}).parse(request.params);
    const token=newToken();
    const recipient=await database.transaction(churchId,session.userId,async(client,member)=>{
      requireCapability(member,'memberships:manage');
      const invite=(await client.query('SELECT * FROM email_invitations WHERE church_id=$1 AND id=$2 FOR UPDATE',[churchId,id])).rows[0];
      demand(invite && !invite.accepted_at && !invite.revoked_at,404,'not_found','Pending invitation not found');
      demandInviterAuthority(member.capabilities,invite.role);
      demand(invite.delivery_status!=='sending' || Date.now()-new Date(invite.last_delivery_at).getTime()>2*60_000,409,'delivery_in_progress','This invitation is still being sent');
      demand(invite.delivery_attempts<5,429,'resend_limit','Contact support to review repeated delivery failures');
      await client.query("UPDATE email_invitations SET token_hash=$3,expires_at=now()+interval '7 days',delivery_status='sending',delivery_attempts=delivery_attempts+1,last_delivery_at=now() WHERE church_id=$1 AND id=$2",[churchId,id,hash(token)]);
      const church=(await client.query('SELECT name FROM churches WHERE id=$1',[churchId])).rows[0];
      await audit(client,churchId,member.userId,'membership.email_invitation_resent',id);
      return {email:invite.email as string,firstName:invite.first_name as string,role:invite.role as string,churchName:church.name as string};
    },session);
    const deliveryStatus=await sendInvitationEmail({...recipient,token,origin:settings.appOrigin,to:recipient.email})
      .catch(error=>error instanceof Error && error.message==='Invitation email delivery is not configured'?'failed' as const:'unknown' as const);
    await recordDelivery(churchId,id,token,deliveryStatus);
    return reply.send({id,deliveryStatus,...(!settings.production&&process.env.ROOTED_EMAIL_TEST_MODE==='true'?{testToken:token}:{})});
  });
  routes.command('/email-invitations/:id/revoke',async({client,member,churchId,id})=>{
    requireCapability(member,'memberships:manage');
    const result=await client.query('UPDATE email_invitations SET revoked_at=now() WHERE church_id=$1 AND id=$2 AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id',[churchId,id]);
    demand(result.rowCount,404,'not_found','Pending invitation not found');
    await audit(client,churchId,member.userId,'membership.email_invitation_revoked',id!);
    return {status:200,body:{id,status:'revoked'}};
  });
  app.post('/v1/email-invitations/preview',async request=>{
    const {token}=tokenInput.parse(request.body);
    const result=await database.pool.query('SELECT * FROM lookup_email_invitation($1)',[hash(token)]);
    demand(result.rowCount,404,'not_found','Invitation is unavailable or expired');
    const item=result.rows[0];
    return {churchName:item.church_name,firstName:item.first_name,lastName:item.last_name,role:item.role,expiresAt:item.expires_at};
  });
  app.post('/v1/email-invitations/verify-email',async(request,reply)=>{
    const session=await authenticate(database,request,'contributor');csrf(request,session,settings.appOrigin);
    const {token}=tokenInput.parse(request.body);
    const lookup=await database.pool.query('SELECT * FROM lookup_email_invitation($1)',[hash(token)]);
    demand(lookup.rowCount,404,'not_found','Invitation is unavailable or expired');
    const locator=lookup.rows[0], code=randomInt(0,100_000_000).toString().padStart(8,'0');
    const client=await database.pool.connect();
    let destination:string;
    try {
      await client.query('BEGIN');await client.query("SELECT set_config('app.church_id',$1,true)",[locator.church_id]);
      const invite=(await client.query('SELECT email FROM email_invitations WHERE church_id=$1 AND id=$2 AND token_hash=$3 AND revoked_at IS NULL AND accepted_at IS NULL',[locator.church_id,locator.id,hash(token)])).rows[0];
      demand(invite && (!session.claimedEmail || session.claimedEmail===invite.email) && !session.verifiedEmail,403,'invitation_email_mismatch','Sign in with the invited email address');
      const prior=(await client.query('SELECT requested_at,attempts FROM email_invitation_challenges WHERE church_id=$1 AND invitation_id=$2 AND subject=$3 FOR UPDATE',[locator.church_id,locator.id,session.userId])).rows[0];
      demand(!prior || Date.now()-new Date(prior.requested_at).getTime()>60_000,429,'verification_rate_limited','Wait a minute before requesting another code');
      demand(!prior || prior.attempts<5,429,'verification_limit','Too many verification attempts');
      await client.query("INSERT INTO email_invitation_challenges(church_id,invitation_id,subject,code_hash,expires_at) VALUES($1,$2,$3,$4,now()+interval '10 minutes') ON CONFLICT(church_id,invitation_id,subject) DO UPDATE SET code_hash=EXCLUDED.code_hash,expires_at=EXCLUDED.expires_at,requested_at=now()",[locator.church_id,locator.id,session.userId,hash(`${token}:${session.userId}:${code}`)]);
      destination=invite.email;await client.query('COMMIT');
    } catch(error) {await client.query('ROLLBACK');throw error;} finally {client.release();}
    try {await sendInvitationChallenge(destination,locator.church_name,code);}
    catch {throw new ApiError(503,'verification_delivery_unavailable','Verification email could not be sent. Try again later.');}
    return reply.send({sent:true,...(!settings.production&&process.env.ROOTED_EMAIL_TEST_MODE==='true'?{testCode:code}:{})});
  });
  app.post('/v1/email-invitations/accept',async(request,reply)=>{
    const session=await authenticate(database,request,'contributor'); csrf(request,session,settings.appOrigin);
    const {token,code}=tokenInput.extend({code:z.string().regex(/^\d{8}$/).optional()}).parse(request.body);
    const lookup=await database.pool.query('SELECT * FROM lookup_email_invitation($1)',[hash(token)]);
    demand(lookup.rowCount,404,'not_found','Invitation is unavailable or expired');
    const locator=lookup.rows[0];
    const client=await database.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.church_id',$1,true),set_config('app.user_id',$2,true)",[locator.church_id,session.userId]);
      const invite=(await client.query('SELECT * FROM email_invitations WHERE church_id=$1 AND id=$2 FOR UPDATE',[locator.church_id,locator.id])).rows[0];
      demand(invite && invite.token_hash===hash(token) && !invite.accepted_at && !invite.revoked_at && new Date(invite.expires_at).getTime()>Date.now(),409,'invitation_unavailable','Invitation is no longer available');
      demand(!session.claimedEmail || session.claimedEmail===invite.email,403,'invitation_email_mismatch','Sign in with the invited email address');
      if (session.verifiedEmail!==invite.email) {
        demand(code,403,'email_verification_required','Verify the invited email address to continue');
        const challenge=(await client.query('SELECT code_hash,expires_at,attempts FROM email_invitation_challenges WHERE church_id=$1 AND invitation_id=$2 AND subject=$3 FOR UPDATE',[locator.church_id,locator.id,session.userId])).rows[0];
        demand(challenge && new Date(challenge.expires_at).getTime()>Date.now() && challenge.attempts<5,403,'email_verification_required','Request a new verification code');
        if (challenge.code_hash!==hash(`${token}:${session.userId}:${code}`)) {
          await client.query('UPDATE email_invitation_challenges SET attempts=attempts+1 WHERE church_id=$1 AND invitation_id=$2 AND subject=$3',[locator.church_id,locator.id,session.userId]);
          await client.query('COMMIT');
          return reply.code(403).send({code:'verification_invalid',message:'Verification code is incorrect'});
        }
      }
      requireMfa(session);
      demand(session.userId!==invite.invited_by,403,'self_elevation_forbidden','An administrator cannot accept their own invitation');
      const inviter=(await client.query('SELECT capabilities FROM memberships WHERE church_id=$1 AND user_id=$2 AND active',[locator.church_id,invite.invited_by])).rows[0];
      demand(inviter,409,'inviter_authority_changed','The inviting administrator no longer has access');
      demandInviterAuthority(inviter.capabilities,invite.role);
      const existing=await client.query('SELECT 1 FROM memberships WHERE church_id=$1 AND user_id=$2',[locator.church_id,session.userId]);
      demand(!existing.rowCount,409,'already_member','Your account already belongs to this church');
      await client.query('INSERT INTO memberships(church_id,user_id,display_name,capabilities) VALUES($1,$2,$3,$4)',[locator.church_id,session.userId,`${invite.first_name} ${invite.last_name}`,invite.capabilities]);
      await client.query('UPDATE email_invitations SET accepted_subject=$3,accepted_at=now() WHERE church_id=$1 AND id=$2',[locator.church_id,invite.id,session.userId]);
      await client.query('DELETE FROM email_invitation_challenges WHERE church_id=$1 AND invitation_id=$2',[locator.church_id,invite.id]);
      await audit(client,locator.church_id,session.userId,'membership.email_invitation_accepted',invite.id,{role:invite.role,invitedBy:invite.invited_by});
      await client.query('COMMIT');
      return reply.code(201).send({churchId:locator.church_id,role:invite.role});
    } catch(error) {await client.query('ROLLBACK');throw error;}
    finally {client.release();}
  });
}
