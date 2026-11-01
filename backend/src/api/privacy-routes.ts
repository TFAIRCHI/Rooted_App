import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import type { config } from '../infrastructure/config.js';
import { requireCapability, type Database } from '../infrastructure/database.js';
import { audit } from '../modules/editorial.js';
import { hash } from '../modules/revisions.js';
import { demand } from './errors.js';
import { tenantRoutes } from './tenant-boundary.js';

export async function subjectExport(client:PoolClient,churchId:string,userId:string) {
  const membership=(await client.query('SELECT user_id,display_name,capabilities,active FROM memberships WHERE church_id=$1 AND user_id=$2',[churchId,userId])).rows[0];
  demand(membership,404,'not_found','Member data not found');
  const reactions=(await client.query('SELECT publication_id,type FROM reactions WHERE church_id=$1 AND user_id=$2',[churchId,userId])).rows.map(row=>({publicationId:row.publication_id,type:row.type}));
  const discussions=(await client.query('SELECT id,publication_id,body,status,created_at FROM discussions WHERE church_id=$1 AND user_id=$2',[churchId,userId])).rows.map(row=>({id:row.id,publicationId:row.publication_id,body:row.body,status:row.status,createdAt:row.created_at}));
  const reports=(await client.query('SELECT id,discussion_id,reason,status,created_at FROM reports WHERE church_id=$1 AND reporter_id=$2',[churchId,userId])).rows.map(row=>({id:row.id,commentId:row.discussion_id,reason:row.reason,status:row.status,createdAt:row.created_at}));
  const comments=(await client.query('SELECT id,revision_id,body,field_path,created_at FROM comments WHERE church_id=$1 AND author_id=$2',[churchId,userId])).rows.map(row=>({id:row.id,revisionId:row.revision_id,body:row.body,fieldPath:row.field_path,createdAt:row.created_at}));
  const revisions=(await client.query('SELECT id,aggregate_id,number,hash,created_at FROM revisions WHERE church_id=$1 AND author_id=$2',[churchId,userId])).rows.map(row=>({id:row.id,aggregateId:row.aggregate_id,number:row.number,hash:row.hash,createdAt:row.created_at}));
  const decisions=(await client.query('SELECT id,aggregate_id,revision_id,decision,reason,created_at FROM reviews WHERE church_id=$1 AND actor_id=$2',[churchId,userId])).rows.map(row=>({id:row.id,aggregateId:row.aggregate_id,revisionId:row.revision_id,decision:row.decision,reason:row.reason,createdAt:row.created_at}));
  const notifications=(await client.query('SELECT id,type,resource_id,read_at,created_at FROM notifications WHERE church_id=$1 AND user_id=$2',[churchId,userId])).rows.map(row=>({id:row.id,type:row.type,resourceId:row.resource_id,readAt:row.read_at,createdAt:row.created_at}));
  const contacts=(await client.query('SELECT id,zone,zone_source,sender_scope,consent_version,suppressed FROM provider_contacts WHERE church_id=$1 AND user_id=$2',[churchId,userId])).rows.map(row=>({id:row.id,zone:row.zone,zoneSource:row.zone_source,senderScope:row.sender_scope,consentVersion:row.consent_version,suppressed:row.suppressed}));
  const consent=(await client.query('SELECT provider_consent_events.id,provider_consent_events.contact_id,version,status,evidence,created_at FROM provider_consent_events JOIN provider_contacts ON provider_contacts.church_id=provider_consent_events.church_id AND provider_contacts.id=provider_consent_events.contact_id WHERE provider_consent_events.church_id=$1 AND provider_contacts.user_id=$2',[churchId,userId])).rows.map(row=>({id:row.id,contactId:row.contact_id,version:row.version,status:row.status,evidence:row.evidence,createdAt:row.created_at}));
  const studyOpens=(await client.query('SELECT publication_id,first_opened_at FROM study_opens WHERE church_id=$1 AND user_id=$2',[churchId,userId])).rows;
  const publicationAudiences=(await client.query('SELECT publication_id FROM publication_audience_members WHERE church_id=$1 AND user_id=$2',[churchId,userId])).rows;
  const studyWorkflows=(await client.query('SELECT study_workflow_private_data($1,$2,false) AS data',[churchId,userId])).rows[0].data;
  return {schemaVersion:1,churchId,generatedAt:new Date().toISOString(),subject:{id:membership.user_id,displayName:membership.display_name,capabilities:membership.capabilities,active:membership.active},reactions,discussions,reports,reviewComments:comments,authoredRevisionReferences:revisions,reviewDecisions:decisions,notifications,contacts,consent,studyOpens,publicationAudiences,studyWorkflows,scope:'This church and this subject only. Church-owned teaching payloads, other members, credentials, external IdP records and backup copies are excluded.'};
}

export async function privacyRoutes(app:FastifyInstance,database:Database,settings:ReturnType<typeof config>) {
  const routes=tenantRoutes(app,database,settings);
  const memberRoutes=tenantRoutes(app,database,settings,'member');
  memberRoutes.get('/privacy/export',async({client,member,churchId})=>subjectExport(client,churchId,member.userId));
  memberRoutes.get('/privacy/requests/:id/export',async({client,member,churchId,id})=>{
    const request=(await client.query("SELECT * FROM privacy_requests WHERE church_id=$1 AND id=$2 AND kind='export'",[churchId,id])).rows[0];demand(request,404,'not_found','Export request not found');
    demand(request.user_id===member.userId||member.capabilities.includes('privacy:manage'),404,'not_found','Export request not found');
    demand(request.status==='completed',409,'export_not_reviewed','A privacy administrator must verify and fulfill this request first');
    return subjectExport(client,churchId,request.user_id);
  });
  routes.command('/privacy/requests/:id/fulfill',async({client,member,churchId,id,request})=>{
    requireCapability(member,'privacy:manage');
    const input=z.object({identityVerified:z.literal(true),reason:z.string().trim().min(10).max(5000),retentionBasis:z.string().trim().min(20).max(5000).optional(),retentionReviewAt:z.iso.datetime({offset:true}).optional()}).strict().parse(request.body);
    const target=(await client.query('SELECT * FROM privacy_requests WHERE church_id=$1 AND id=$2 FOR UPDATE',[churchId,id])).rows[0];demand(target,404,'not_found','Privacy request not found');demand(target.status==='requested',409,'already_fulfilled','This request has already been processed');
    if(target.kind==='export') {
      const exported=await subjectExport(client,churchId,target.user_id);
      await client.query("UPDATE privacy_requests SET status='completed',completed_by=$3,completed_at=now(),fulfillment=$4 WHERE church_id=$1 AND id=$2",[churchId,id,member.userId,{scope:'subject_only_church_export',identityVerified:true,reason:input.reason}]);
      await audit(client,churchId,member.userId,'privacy.export_fulfilled',id!,{subjectHash:hash(`${churchId}:${target.user_id}`)});
      return {status:200,body:{id,status:'completed',export:exported,downloadPath:`/v1/churches/${churchId}/privacy/requests/${id}/export`}};
    }
    demand(input.retentionBasis&&input.retentionReviewAt,422,'retention_review_required','Erasure requires a documented retention basis and a named review deadline for immutable history and backups');
    const reviewAt=new Date(input.retentionReviewAt).getTime();demand(reviewAt>Date.now()&&reviewAt<=Date.now()+366*24*60*60*1000,422,'invalid_review_deadline','Set a retention review within the next year');
    const subject=(await client.query('SELECT capabilities FROM memberships WHERE church_id=$1 AND user_id=$2 FOR UPDATE',[churchId,target.user_id])).rows[0];
    demand(subject&&!subject.capabilities.includes('policy:manage'),409,'policy_owner_protected','Transfer church ownership before fulfilling this subject’s erasure');
    const authoredReplies=(await client.query("SELECT d.id,d.parent_id,p.content_id FROM discussions d JOIN publications p ON p.church_id=d.church_id AND p.id=d.publication_id WHERE d.church_id=$1 AND d.user_id=$2 AND d.parent_id IS NOT NULL AND d.status='approved' ORDER BY p.content_id,d.parent_id,d.id",[churchId,target.user_id])).rows as {id:string;parent_id:string;content_id:string}[];
    for(const contentId of [...new Set(authoredReplies.map(row=>row.content_id))].sort())await client.query('SELECT id FROM aggregates WHERE church_id=$1 AND id=$2 FOR SHARE',[churchId,contentId]);
    for(const parentId of [...new Set(authoredReplies.map(row=>row.parent_id))].sort())await client.query('SELECT id FROM discussions WHERE church_id=$1 AND id=$2 FOR UPDATE',[churchId,parentId]);
    for(const reply of authoredReplies)await client.query('SELECT id FROM discussions WHERE church_id=$1 AND id=$2 FOR UPDATE',[churchId,reply.id]);
    await client.query('DELETE FROM reactions WHERE church_id=$1 AND user_id=$2',[churchId,target.user_id]);
    await client.query('DELETE FROM study_opens WHERE church_id=$1 AND user_id=$2',[churchId,target.user_id]);
    await client.query('DELETE FROM publication_audience_members WHERE church_id=$1 AND user_id=$2',[churchId,target.user_id]);
    await client.query("UPDATE discussions SET body='[Removed following privacy request]',status='erased',version=version+1,updated_at=now() WHERE church_id=$1 AND user_id=$2",[churchId,target.user_id]);
    for(const parentId of [...new Set(authoredReplies.map(row=>row.parent_id))].sort()) {
      const root=(await client.query("SELECT * FROM discussions WHERE church_id=$1 AND id=$2 AND kind='question' AND status='approved' AND resolution_kind='reply' AND resolved_at IS NOT NULL FOR UPDATE",[churchId,parentId])).rows[0];
      if(!root)continue;
      const remaining=(await client.query("SELECT 1 FROM discussions WHERE church_id=$1 AND parent_id=$2 AND kind='reply' AND status='approved' AND parent_content_version=$3 LIMIT 1",[churchId,parentId,root.content_version])).rowCount;
      if(remaining)continue;
      await client.query('UPDATE discussions SET resolved_at=NULL,resolved_by=NULL,resolution_kind=NULL,version=version+1,updated_at=now() WHERE church_id=$1 AND id=$2',[churchId,parentId]);
      await client.query("INSERT INTO discussion_resolutions(church_id,id,discussion_id,content_version,actor_id,decision,reason) VALUES($1,$2,$3,$4,$5,'reopen','The published answer was removed following subject privacy erasure')",[churchId,randomUUID(),parentId,root.content_version,member.userId]);
      await audit(client,churchId,member.userId,'discussion.answer_removed_privacy',parentId,{requestId:id,reviewedVersion:root.version});
    }
    await client.query("UPDATE reports SET reason='[Removed following privacy request]',status='closed_privacy' WHERE church_id=$1 AND reporter_id=$2",[churchId,target.user_id]);
    await client.query('DELETE FROM mentions WHERE church_id=$1 AND (user_id=$2 OR comment_id IN (SELECT id FROM comments WHERE church_id=$1 AND author_id=$2))',[churchId,target.user_id]);
    await client.query('DELETE FROM comments WHERE church_id=$1 AND author_id=$2',[churchId,target.user_id]);
    await client.query('DELETE FROM notifications WHERE church_id=$1 AND user_id=$2',[churchId,target.user_id]);
    await client.query("UPDATE provider_send_intents SET status='cancelled_privacy',body='',error_code='privacy_erasure' WHERE church_id=$1 AND contact_id IN(SELECT id FROM provider_contacts WHERE church_id=$1 AND user_id=$2) AND status IN('pending','deferred','hold_unknown_zone','provider_disabled')",[churchId,target.user_id]);
    const suppressedContacts=(await client.query('SELECT id,consent_version FROM provider_contacts WHERE church_id=$1 AND user_id=$2 ORDER BY id FOR UPDATE',[churchId,target.user_id])).rows;
    for(const contact of suppressedContacts)await client.query("INSERT INTO provider_consent_events(church_id,id,contact_id,version,status,evidence,actor_id) VALUES($1,$2,$3,$4,'revoked',$5,$6)",[churchId,randomUUID(),contact.id,contact.consent_version+1,{source:'reviewed_privacy_erasure',requestId:id,purpose:'preserve_suppression'},member.userId]);
    await client.query("UPDATE provider_contacts SET suppressed=true,phone_ciphertext='',zone=NULL,zone_source=NULL,consent_version=consent_version+1 WHERE church_id=$1 AND user_id=$2",[churchId,target.user_id]);
    await client.query("UPDATE delivery SET status='cancelled_privacy',payload='{}' WHERE church_id=$1 AND recipient_token=$2 AND status IN('pending','queued','deferred','provider_disabled')",[churchId,target.user_id]);
    const reservations=(await client.query("SELECT COALESCE(sum(reservation),0)::integer AS total,budget_period FROM provider_jobs WHERE church_id=$1 AND actor_id=$2 AND status='pending' GROUP BY budget_period",[churchId,target.user_id])).rows;
    for(const reservation of reservations)await client.query('UPDATE provider_budgets SET reserved_tokens=greatest(0,reserved_tokens-$2) WHERE church_id=$1 AND period=$3',[churchId,reservation.total,reservation.budget_period]);
    await client.query("UPDATE provider_jobs SET status='cancelled',payload='{}',result=NULL,error_code='privacy_erasure',finished_at=now() WHERE church_id=$1 AND actor_id=$2 AND status='pending'",[churchId,target.user_id]);
    await client.query('SELECT study_workflow_private_data($1,$2,true)',[churchId,target.user_id]);
    await client.query("UPDATE memberships SET display_name='Former member',capabilities='{}',active=false WHERE church_id=$1 AND user_id=$2",[churchId,target.user_id]);
    await client.query("INSERT INTO privacy_tombstones(church_id,id,subject_hash,request_id,purpose) VALUES($1,$2,$3,$4,'prevent_unauthorized_reactivation_and_restore') ON CONFLICT(church_id,subject_hash) DO NOTHING",[churchId,randomUUID(),hash(`${churchId}:${target.user_id}`),id]);
    const retained=['immutable teaching revisions, approvals, decisions and audit records with opaque subject references','immutable discussion revision history, provider consent evidence, adoption and webhook evidence','hashed sender-scoped suppression records and subject reactivation tombstone','already-submitting, submission-unknown and provider-accepted delivery evidence','external identity/provider records and backup copies pending separately authorized cleanup'];
    const fulfillment={liveDataRemoved:true,fullErasureVerified:false,externalDeletionVerified:false,backupDeletionVerified:false,retained,retentionBasis:input.retentionBasis,retentionReviewAt:input.retentionReviewAt,reviewOwner:member.userId,reason:input.reason};
    await client.query("UPDATE privacy_requests SET status='completed_with_retention_review',completed_by=$3,completed_at=now(),retention_review_at=$4,fulfillment=$5 WHERE church_id=$1 AND id=$2",[churchId,id,member.userId,input.retentionReviewAt,fulfillment]);
    await audit(client,churchId,member.userId,'privacy.live_data_erased',id!,{subjectHash:hash(`${churchId}:${target.user_id}`),retentionReviewAt:input.retentionReviewAt,fullErasureVerified:false});
    return {status:200,body:{id,status:'completed_with_retention_review',...fulfillment}};
  });
}
