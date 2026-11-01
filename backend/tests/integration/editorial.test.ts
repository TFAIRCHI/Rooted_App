import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { buildApp } from '../../src/app.js';
import { Database } from '../../src/infrastructure/database.js';
import { config } from '../../src/infrastructure/config.js';
import { migrate } from '../../src/infrastructure/migrate.js';
import { seed, graceId, riversideId } from '../../src/infrastructure/seed.js';
import { startLocalIssuer } from '../../src/auth/local-issuer.js';
import { runLocalWork, publishOccurrence } from '../../src/workers/publication.js';

const privilegedUrl=process.env.TEST_MIGRATION_DATABASE_URL??'postgres://postgres@127.0.0.1:54329/gather_test';
const runtimeUrl=process.env.TEST_DATABASE_URL??'postgres://gather_runtime:gather_local_development@127.0.0.1:54329/gather_test';
const administrative=new pg.Pool({connectionString:privilegedUrl});
const isolatedName=`gather_editorial_${randomUUID().replaceAll('-','')}`;
let privileged:pg.Pool;
let database:Database;
let app:FastifyInstance;
let issuer:Awaited<ReturnType<typeof startLocalIssuer>>;
let clockNow=new Date();
let fixtureDay=10;
const apiOrigin='http://127.0.0.1:4013';
const cookies=new Map<string,Map<string,string>>();
const sessions=new Map<string,{cookie:string;csrf:string}>();
type Aggregate = {id:string;etag:string;headRevisionId:string;status:string;approvalId:string;livePublicationId:string|null;head:{id:string;hash:string;payload:Record<string,unknown>;planApprovalId:string}};

before(async()=>{
  await administrative.query(`CREATE DATABASE "${isolatedName}"`);
  const isolatedMigration=new URL(privilegedUrl);isolatedMigration.pathname=`/${isolatedName}`;
  const isolatedRuntime=new URL(runtimeUrl);isolatedRuntime.pathname=`/${isolatedName}`;
  privileged=new pg.Pool({connectionString:isolatedMigration.href});database=new Database(isolatedRuntime.href);
  await migrate(isolatedMigration.href);await seed(isolatedMigration.href);
  await privileged.query("INSERT INTO memberships(church_id,user_id,display_name,capabilities) VALUES($1,'james.contributor','James Ellis',ARRAY['workspace:read','plans:edit','content:edit','content:approve','plans:approve','publication:schedule','comments:write','engagement:read']) ON CONFLICT(church_id,user_id) DO UPDATE SET active=true,capabilities=excluded.capabilities",[graceId]);
  const priorCallback=process.env.OIDC_CALLBACK_URL;
  process.env.OIDC_CALLBACK_URL=`${apiOrigin}/v1/auth/callback`;
  issuer=await startLocalIssuer(4012);
  if(priorCallback===undefined) delete process.env.OIDC_CALLBACK_URL;else process.env.OIDC_CALLBACK_URL=priorCallback;
  app=await buildApp({database,settings:{...config(),databaseUrl:isolatedRuntime.href,issuer:'http://127.0.0.1:4012',callbackUrl:`${apiOrigin}/v1/auth/callback`,appOrigin:apiOrigin},clock:()=>clockNow});
  await app.listen({port:4013,host:'127.0.0.1'});
  for(const persona of ['contributor','pastor','james.contributor','admin','member']) await login(persona);
});
after(async()=>{await app?.close();await database?.close();await privileged?.end();if(issuer)await new Promise<void>((resolve,reject)=>issuer.close(error=>error?reject(error):resolve()));await administrative.query(`DROP DATABASE IF EXISTS "${isolatedName}"`);await administrative.end();});

async function login(persona:string) {
  const jar=new Map<string,string>();cookies.set(persona,jar);
  let target=`${apiOrigin}/v1/auth/login?persona=${persona}`;
  let callbackReached=false;
  for(let redirects=0;redirects<20;redirects++) {
    const response=await fetch(target,{redirect:'manual',headers:{cookie:[...jar].map(([name,value])=>`${name}=${value}`).join('; ')}});
    for(const cookie of response.headers.getSetCookie()){const [pair]=cookie.split(';');const index=pair!.indexOf('=');jar.set(pair!.slice(0,index),pair!.slice(index+1));}
    assert.ok(response.status<400,`OIDC failed ${response.status}: ${await response.text()}`);
    const location=response.headers.get('location');
    if(!location) throw new Error('OIDC redirect missing');
    target=new URL(location,target).href;
    if(target===`${apiOrigin}/dashboard`||target===`${apiOrigin}/c/grace`){callbackReached=true;break;}
  }
  assert.ok(callbackReached,'Actual OIDC code+PKCE flow must reach application callback');
  const cookie=[...jar].map(([name,value])=>`${name}=${value}`).join('; ');
  const session=await app.inject({method:'GET',url:'/v1/auth/session',headers:{cookie}});
  assert.equal(session.statusCode,200,session.body);assert.equal(session.json().user.id,persona);
  sessions.set(persona,{cookie,csrf:session.json().csrfToken});
}
async function request(persona:string,method:'GET'|'POST'|'PUT',path:string,body?:unknown,etag?:string,key=randomUUID()) {
  const session=sessions.get(persona)!;
  return app.inject({method,url:`/v1/churches/${graceId}${path}`,headers:{cookie:session.cookie,'x-csrf-token':session.csrf,'idempotency-key':key,...(etag?{'if-match':etag}:{})},...(body?{payload:body}:{})});
}
async function command(persona:string,path:string,body:unknown,etag?:string,status=200) {
  const response=await request(persona,'POST',path,body,etag);assert.equal(response.statusCode,status,response.body);return response.json();
}
async function newPlan() {
  const series=await command('contributor','/series',{title:`Integration ${randomUUID()}`,weekAnchor:'2026-10-19',timeZone:'UTC',sermonIds:[]},undefined,201);
  fixtureDay+=1;
  const intended=new Date(Math.ceil((Date.now()+120000)/60000)*60000+fixtureDay*86400000);
  const slot=await command('contributor',`/series/${series.id}/slots`,{localDate:intended.toISOString().slice(0,10),localTime:intended.toISOString().slice(11,16),timeZone:'UTC',assigneeIds:['contributor']},undefined,201);
  const result=await request('contributor','GET',`/plans/${slot.planId}`);assert.equal(result.statusCode,200,result.body);
  return {plan:result.json() as Aggregate,slot,intended};
}
const planPayload={schemaVersion:1,title:'Words of eternal life',primaryScripture:{reference:'John 6:68',translation:null},learningObjective:'Understand Peter’s reply',outline:['Read John 6:60–69','Discuss context'],discussionQuestion:'What does Peter say?',notes:'Church-authored notes',extensions:[]};
const contentPayload={schemaVersion:1,title:'Where shall we go?',body:'Read John 6:60–69 and consider Peter’s response.',reflection:'Consider the narrative context.',discussionQuestion:'How does Peter respond?',application:'Read the surrounding passage together.',references:['John 6:68'],outboundPreview:'Read today’s study.'};
async function approve(kind:'plans'|'content',aggregate:Aggregate) {
  const submitted=await command('contributor',`/${kind}/${aggregate.id}/submit`,kind==='content'?{revisionId:aggregate.headRevisionId,approverId:'james.contributor',note:'Review the exact member-facing revision.'}:{revisionId:aggregate.headRevisionId},aggregate.etag) as Aggregate;
  const reviewer=kind==='content'?'james.contributor':'pastor';
  return command(reviewer,`/${kind}/${aggregate.id}/decisions`,{revisionId:submitted.headRevisionId,expectedHash:submitted.head.hash,decision:'approve',reason:'Reviewed exact revision in context'},submitted.etag,201) as Promise<Aggregate>;
}
async function approvedPair() {
  const fixture=await newPlan();
  let plan=await command('contributor',`/plans/${fixture.plan.id}/revisions`,{baseRevisionId:fixture.plan.headRevisionId,payload:planPayload},fixture.plan.etag,201) as Aggregate;
  plan=await approve('plans',plan);
  let content=await command('contributor',`/plans/${plan.id}/content`,{planApprovalId:plan.approvalId,mode:'manual'},plan.etag,201) as Aggregate;
  assert.equal(content.status,'draft');assert.equal(content.head.payload.title,'');
  content=await command('contributor',`/content/${content.id}/revisions`,{baseRevisionId:content.headRevisionId,planApprovalId:plan.approvalId,payload:contentPayload},content.etag,201) as Aggregate;
  content=await approve('content',content);
  return {...fixture,plan,content};
}

test('existing administrators gain audited review grants; contributor authors and admin approves/publishes without authoring grants',async t=>{
  const original=(await privileged.query("SELECT capabilities FROM memberships WHERE church_id=$1 AND user_id='admin'",[graceId])).rows[0].capabilities;
  t.after(async()=>{await privileged.query("UPDATE memberships SET capabilities=$2 WHERE church_id=$1 AND user_id='admin'",[graceId,original]);});
  await privileged.query("UPDATE memberships SET capabilities=ARRAY['workspace:read','admin:manage','memberships:manage','settings:manage','policy:manage']::text[] WHERE church_id=$1 AND user_id='admin'",[graceId]);
  const memberBefore=(await privileged.query("SELECT capabilities FROM memberships WHERE church_id=$1 AND user_id='member'",[graceId])).rows[0].capabilities;
  const sql=await readFile(new URL('../../migrations/028_admin_review_authority.sql',import.meta.url),'utf8');
  await privileged.query(sql);await privileged.query(sql);
  const isolation=await privileged.query("SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid IN ('memberships'::regclass,'audit'::regclass)");
  assert.ok(isolation.rows.every(row=>row.relrowsecurity&&row.relforcerowsecurity));
  const grants=(await privileged.query("SELECT capabilities FROM memberships WHERE church_id=$1 AND user_id='admin'",[graceId])).rows[0].capabilities;
  for(const grant of ['policy:manage','content:approve','plans:approve','publication:schedule'])assert.ok(grants.includes(grant));
  assert.ok(!grants.includes('content:edit'));assert.ok(!grants.includes('plans:edit'));
  assert.deepEqual((await privileged.query("SELECT capabilities FROM memberships WHERE church_id=$1 AND user_id='member'",[graceId])).rows[0].capabilities,memberBefore);
  assert.equal((await privileged.query("SELECT count(*) FROM audit WHERE church_id=$1 AND action='membership.admin_review_enabled' AND metadata->>'targetSubject'='admin'",[graceId])).rows[0].count,'1');
  const fixture=await newPlan();
  let plan=await command('contributor',`/plans/${fixture.plan.id}/revisions`,{baseRevisionId:fixture.plan.headRevisionId,payload:planPayload},fixture.plan.etag,201) as Aggregate;
  plan=await command('contributor',`/plans/${plan.id}/submit`,{revisionId:plan.headRevisionId},plan.etag) as Aggregate;
  plan=await command('admin',`/plans/${plan.id}/decisions`,{revisionId:plan.headRevisionId,expectedHash:plan.head.hash,decision:'approve',reason:'Administrator reviews contributor plan'},plan.etag,201) as Aggregate;
  let content=await command('contributor',`/plans/${plan.id}/content`,{mode:'manual',planApprovalId:plan.approvalId},plan.etag,201) as Aggregate;
  content=await command('contributor',`/content/${content.id}/revisions`,{baseRevisionId:content.headRevisionId,planApprovalId:plan.approvalId,payload:contentPayload},content.etag,201) as Aggregate;
  const reviewers=(await request('contributor','GET',`/content/${content.id}/review-request`)).json().approvers;
  assert.ok(reviewers.some((reviewer:{userId:string})=>reviewer.userId==='admin'));
  assert.ok(!reviewers.some((reviewer:{userId:string})=>reviewer.userId==='contributor'));
  await command('contributor',`/content/${content.id}/submit`,{revisionId:content.headRevisionId,approverId:'contributor'},content.etag,422);
  content=await command('contributor',`/content/${content.id}/submit`,{revisionId:content.headRevisionId,approverId:'admin'},content.etag) as Aggregate;
  const decision={revisionId:content.headRevisionId,expectedHash:content.head.hash,decision:'approve',reason:'Independent administrator review'};
  await command('member',`/content/${content.id}/decisions`,decision,content.etag,403);
  await command('contributor',`/content/${content.id}/decisions`,decision,content.etag,403);
  content=await command('admin',`/content/${content.id}/decisions`,decision,content.etag,201) as Aggregate;
  await command('admin',`/content/${content.id}/publish`,{revisionId:content.headRevisionId,approvalId:content.approvalId},content.etag,201);
  assert.equal((await request('admin','GET',`/content/${content.id}`)).json().status,'published');
});

test('real local OIDC code+PKCE establishes separate fixture sessions; auth and CSRF boundaries hold',async()=>{
  assert.equal((await app.inject('/v1/auth/session')).statusCode,401);
  const member=sessions.get('member')!;
  const response=await app.inject({method:'POST',url:`/v1/churches/${graceId}/series`,headers:{cookie:member.cookie,'idempotency-key':randomUUID()},payload:{}});
  assert.equal(response.statusCode,403);assert.equal(response.json().code,'csrf_invalid');
  const cross=await app.inject({url:`/v1/churches/${riversideId}/workspace`,headers:{cookie:sessions.get('contributor')!.cookie}});assert.equal(cross.statusCode,404);
  assert.equal((await request('member','GET','/workspace')).statusCode,403);
  const forged=await app.inject('/v1/auth/callback?state=forged&code=forged');assert.equal(forged.statusCode,401);
});
test('atomic idempotency replays committed draft; conflicting body and stale/missing ETags reject',async()=>{
  const {plan}=await newPlan();const body={baseRevisionId:plan.headRevisionId,payload:planPayload};const key=randomUUID();
  const [first,second]=await Promise.all([request('contributor','POST',`/plans/${plan.id}/revisions`,body,plan.etag,key),request('contributor','POST',`/plans/${plan.id}/revisions`,body,plan.etag,key)]);
  assert.equal(first.statusCode,201,first.body);assert.equal(second.statusCode,201,second.body);assert.deepEqual(first.json(),second.json());
  const changed=await request('contributor','POST',`/plans/${plan.id}/revisions`,{...body,payload:{...planPayload,title:'Different'}},plan.etag,key);assert.equal(changed.statusCode,409);
  assert.equal((await request('contributor','POST',`/plans/${plan.id}/revisions`,body)).statusCode,428);
  assert.equal((await request('contributor','POST',`/plans/${plan.id}/revisions`,body,plan.etag)).statusCode,412);
  const count=await database.transaction(graceId,'contributor',async(client)=>(await client.query('SELECT count(*) FROM revisions WHERE church_id=$1 AND aggregate_id=$2',[graceId,plan.id])).rows[0].count);assert.equal(count,'2');
});
test('self approval is denied and incomplete drafts cannot submit',async()=>{
  const {plan}=await newPlan();assert.equal((await request('contributor','POST',`/plans/${plan.id}/submit`,{revisionId:plan.headRevisionId},plan.etag)).statusCode,422);
  let head=await command('contributor',`/plans/${plan.id}/revisions`,{baseRevisionId:plan.headRevisionId,payload:planPayload},plan.etag,201) as Aggregate;
  head=await command('contributor',`/plans/${head.id}/submit`,{revisionId:head.headRevisionId},head.etag) as Aggregate;
  const decision={revisionId:head.headRevisionId,expectedHash:head.head.hash,decision:'approve',reason:'Review'};
  await privileged.query("UPDATE memberships SET capabilities=array_append(capabilities,'plans:approve') WHERE church_id=$1 AND user_id='contributor'",[graceId]);
  try {const denied=await request('contributor','POST',`/plans/${head.id}/decisions`,decision,head.etag);assert.equal(denied.statusCode,403,denied.body);assert.equal(denied.json().code,'self_approval_forbidden');}
  finally {await privileged.query("UPDATE memberships SET capabilities=array_remove(capabilities,'plans:approve') WHERE church_id=$1 AND user_id='contributor'",[graceId]);}
});
test('content creation checks content capability independently of plan editing',async()=>{
  const fixture=await newPlan();let plan=await command('contributor',`/plans/${fixture.plan.id}/revisions`,{baseRevisionId:fixture.plan.headRevisionId,payload:planPayload},fixture.plan.etag,201) as Aggregate;plan=await approve('plans',plan);
  await privileged.query("UPDATE memberships SET capabilities=array_remove(capabilities,'content:edit') WHERE church_id=$1 AND user_id='contributor'",[graceId]);
  try{assert.equal((await request('contributor','POST',`/plans/${plan.id}/content`,{planApprovalId:plan.approvalId,mode:'manual'},plan.etag)).statusCode,403);}
  finally{await privileged.query("UPDATE memberships SET capabilities=array_append(array_remove(capabilities,'plans:edit'),'content:edit') WHERE church_id=$1 AND user_id='contributor'",[graceId]);}
  try{await command('contributor',`/plans/${plan.id}/content`,{planApprovalId:plan.approvalId,mode:'manual'},plan.etag,201);}
  finally{await privileged.query("UPDATE memberships SET capabilities=array_append(capabilities,'plans:edit') WHERE church_id=$1 AND user_id='contributor'",[graceId]);}
});
test('explicit publish overrides the planned delivery time, pins old live bytes after edits, and deduplicates outbox effects',async()=>{
  const {content,intended,plan}=await approvedPair();
  clockNow=new Date(intended.getTime()-1000);
  const published=await command('pastor',`/content/${content.id}/publish`,{revisionId:content.headRevisionId,approvalId:content.approvalId},content.etag,201) as Aggregate;
  assert.equal(published.status,'published');assert.ok(published.livePublicationId);
  const memberRead=await request('member','GET',`/studies/${published.livePublicationId}`);assert.equal(memberRead.statusCode,200);assert.equal(memberRead.json().payload.title,contentPayload.title);
  const edited=await command('contributor',`/content/${content.id}/revisions`,{baseRevisionId:content.headRevisionId,planApprovalId:plan.approvalId,payload:{...contentPayload,title:'Private replacement draft'}},published.etag,201) as Aggregate;
  assert.equal(edited.status,'draft');assert.equal(edited.livePublicationId,published.livePublicationId);
  assert.equal((await request('member','GET',`/studies/${published.livePublicationId}`)).json().payload.title,contentPayload.title);
  await runLocalWork(database,clockNow);await runLocalWork(database,clockNow);
  const effects=await database.transaction(graceId,'pastor',async client=>({publications:(await client.query('SELECT count(*) FROM publications WHERE church_id=$1 AND content_id=$2',[graceId,content.id])).rows[0].count,outbox:(await client.query("SELECT count(*) FROM outbox WHERE church_id=$1 AND resource_id=$2 AND type='study.published'",[graceId,published.livePublicationId])).rows[0].count}));
  assert.deepEqual(effects,{publications:'1',outbox:'1'});clockNow=new Date();
});
test('optional plan edit retains independent final content approval and schedule',async()=>{
  const {plan,content,intended}=await approvedPair();clockNow=new Date(intended.getTime()-10000);
  const schedule=await command('pastor',`/content/${content.id}/schedules`,{revisionId:content.headRevisionId,approvalId:content.approvalId,localDate:intended.toISOString().slice(0,10),localTime:intended.toISOString().slice(11,16),timeZone:'UTC',destinationId:'web'},content.etag,201);
  const current=(await request('contributor','GET',`/plans/${plan.id}`)).json() as Aggregate;
  await command('contributor',`/plans/${plan.id}/revisions`,{baseRevisionId:current.headRevisionId,payload:{...planPayload,title:'New plan dependency'}},current.etag,201);
  const child=(await request('contributor','GET',`/content/${content.id}`)).json() as Aggregate;assert.equal(child.approvalId,content.approvalId);assert.equal(child.status,'scheduled');
  const state=await database.transaction(graceId,'pastor',async client=>(await client.query('SELECT status FROM schedules WHERE church_id=$1 AND id=$2',[graceId,schedule.id])).rows[0].status);assert.equal(state,'pending');
  clockNow=new Date(intended.getTime()+1000);await runLocalWork(database,clockNow);assert.equal((await request('member','GET','/studies')).json().items.some((item:{contentId:string})=>item.contentId===content.id),true);clockNow=new Date();
});
test('expired session and removed membership cannot authorize later requests',async()=>{
  const session=sessions.get('member')!;const token=cookies.get('member')!.get('gather_session')!;
  await privileged.query('UPDATE auth_sessions SET expires_at=now()-interval \'1 second\' WHERE token_hash=$1',[createHash('sha256').update(token).digest('hex')]);
  assert.equal((await app.inject({url:'/v1/auth/session',headers:{cookie:session.cookie}})).statusCode,401);
  await login('member');await privileged.query("UPDATE memberships SET active=false WHERE church_id=$1 AND user_id='member'",[graceId]);
  try{assert.equal((await request('member','GET','/studies')).statusCode,404);}finally{await privileged.query("UPDATE memberships SET active=true WHERE church_id=$1 AND user_id='member'",[graceId]);}
});

test('workspace applies the same assigned-draft read boundary as individual aggregate routes',async()=>{
  const fixture=await newPlan();
  const updated=await request('admin','PUT',`/slots/${fixture.slot.id}`,{localDate:fixture.slot.localDate,localTime:fixture.slot.localTime,timeZone:'UTC',assigneeIds:[]},fixture.plan.etag);
  assert.equal(updated.statusCode,200,updated.body);
    await privileged.query("UPDATE memberships SET capabilities=array_remove(array_remove(array_remove(capabilities,'series:manage'),'publication:schedule'),'settings:manage') WHERE church_id=$1 AND user_id='contributor'",[graceId]);
  try {
    assert.equal((await request('contributor','GET',`/plans/${fixture.plan.id}`)).statusCode,403);
    const workspace=await request('contributor','GET','/workspace');assert.equal(workspace.statusCode,200,workspace.body);
    assert.equal(workspace.json().plans.some((plan:{id:string})=>plan.id===fixture.plan.id),false);
    assert.equal(workspace.json().slots.some((slot:{id:string})=>slot.id===fixture.slot.id),false);
  }finally{await privileged.query("UPDATE memberships SET capabilities=array_append(array_append(array_append(capabilities,'series:manage'),'publication:schedule'),'settings:manage') WHERE church_id=$1 AND user_id='contributor'",[graceId]);}
});

test('community is opt-in, comments require moderation, reports stay private, and edits return to review',async()=>{
  const {content,intended}=await approvedPair();clockNow=new Date(intended.getTime()+1000);
  const published=await command('pastor',`/content/${content.id}/publish`,{revisionId:content.headRevisionId,approvalId:content.approvalId},content.etag,201) as Aggregate;
  const studyId=published.livePublicationId!;
  const original=(await request('admin','GET','/settings')).json();
  try {
    await command('admin','/settings',{readingPolicy:'members',discussionsEnabled:false});
    assert.equal((await request('member','POST',`/studies/${studyId}/discussion`,{body:'Thank you for this passage.'})).statusCode,409);
    assert.equal((await request('member','GET',`/studies/${studyId}/community`)).json().discussionsEnabled,false);
    await command('admin','/settings',{readingPolicy:'members',discussionsEnabled:true});
    const comment=await command('member',`/studies/${studyId}/discussion`,{body:'A thoughtful discussion of John 6.'},undefined,201);
    assert.equal(comment.status,'pending');
    assert.equal((await request('contributor','GET',`/studies/${studyId}/community`)).json().comments.length,0);
    assert.equal((await request('member','GET',`/studies/${studyId}/community`)).json().comments.length,1);
    assert.equal((await request('admin','GET','/moderation')).statusCode,403);
    const approved=await command('pastor',`/moderation/${comment.id}/decisions`,{decision:'approve',reason:'Reviewed under the church participation policy'},comment.etag,201);
    assert.equal((await request('contributor','GET',`/studies/${studyId}/community`)).json().comments[0].status,'approved');
    const report=await command('member',`/studies/${studyId}/reports`,{commentId:comment.id,reason:'Please review this comment again.'},undefined,201);
    assert.ok(report.id);
    const contributorView=await request('contributor','GET',`/studies/${studyId}/community`);assert.equal(contributorView.body.includes('Please review this comment again.'),false);
    assert.equal((await request('contributor','GET','/my-reports')).json().items.some((item:{id:string})=>item.id===report.id),false);
    const moderation=(await request('pastor','GET','/moderation')).json();assert.equal(moderation.reports.some((item:{id:string})=>item.id===report.id),true);
    const edited=await command('member',`/discussion/${comment.id}/revisions`,{body:'A revised thoughtful comment.'},approved.etag,201);assert.equal(edited.status,'pending');
    assert.equal((await request('contributor','GET',`/studies/${studyId}/community`)).json().comments.length,0);
    const staleDecision=await request('pastor','POST',`/moderation/${comment.id}/decisions`,{decision:'approve',reason:'Old moderator view must not approve newly edited bytes'},approved.etag);assert.equal(staleDecision.statusCode,412,staleDecision.body);
    const missingDecision=await request('pastor','POST',`/moderation/${comment.id}/decisions`,{decision:'approve',reason:'An explicit version is required'});assert.equal(missingDecision.statusCode,428,missingDecision.body);
    await command('pastor',`/moderation/${comment.id}/decisions`,{decision:'hide',reason:'Church moderator removed the comment after review'},edited.etag,201);
    const hidden=(await request('contributor','GET',`/studies/${studyId}/community`)).json().comments[0];assert.equal(hidden.body,'[Removed by church moderation]');
    assert.equal((await request('contributor','GET','/moderation')).statusCode,200);
  }finally{await command('admin','/settings',{readingPolicy:original.readingPolicy,discussionsEnabled:original.discussionsEnabled});clockNow=new Date();}
});

test('onboarding and subject-bound invitations preserve separate authority and forbid self-elevation',async()=>{
  async function globalPost(persona:string,path:string,body:unknown,key=randomUUID()) {
    const session=sessions.get(persona)!;return app.inject({method:'POST',url:path,headers:{cookie:session.cookie,'x-csrf-token':session.csrf,'idempotency-key':key,'content-type':'application/json'},payload:JSON.stringify(body)});
  }
  const slug=`test-${randomUUID().slice(0,8)}`;const createBody={name:'Independent church',slug,timeZone:'America/New_York'};const key=randomUUID();
  const created=await globalPost('contributor','/v1/churches',createBody,key);assert.equal(created.statusCode,201,created.body);const church=created.json();
  assert.equal(church.capabilities.includes('policy:manage'),true);assert.equal(church.capabilities.includes('plans:approve'),true);assert.equal(church.capabilities.includes('publication:schedule'),true);assert.equal(church.capabilities.includes('content:edit'),false);
  const replay=await globalPost('contributor','/v1/churches',createBody,key);assert.deepEqual(replay.json(),church);
  const changed=await globalPost('contributor','/v1/churches',{...createBody,name:'Different'},key);assert.equal(changed.statusCode,409);
  const self=await globalPost('contributor',`/v1/churches/${church.id}/invitations`,{targetSubject:'contributor',role:'approver',reason:'Self grant'});assert.equal(self.statusCode,403);
  const invitation=await globalPost('contributor',`/v1/churches/${church.id}/invitations`,{targetSubject:'pastor',role:'approver',reason:'Named doctrinal reviewer accepted by the church policy owner'});assert.equal(invitation.statusCode,201,invitation.body);
  assert.equal((await globalPost('member','/v1/invitations/accept',{token:invitation.json().token})).statusCode,404);
  const accepted=await globalPost('pastor','/v1/invitations/accept',{token:invitation.json().token});assert.equal(accepted.statusCode,201,accepted.body);assert.equal(accepted.json().capabilities.includes('plans:approve'),true);assert.equal(accepted.json().capabilities.includes('publication:schedule'),false);
  assert.equal((await globalPost('pastor','/v1/invitations/accept',{token:invitation.json().token})).statusCode,404);
  const unauthorizedInvite=await globalPost('admin',`/v1/churches/${graceId}/invitations`,{targetSubject:'unrelated-subject',role:'approver',reason:'Admin implicit approval escalation'});assert.equal(unauthorizedInvite.statusCode,403);
  const ownerRole=await globalPost('contributor',`/v1/churches/${church.id}/members/roles`,{userId:'contributor',role:'approver',reason:'Attempt self role mutation'});assert.equal(ownerRole.statusCode,403);
  const revoke=await globalPost('contributor',`/v1/churches/${church.id}/members/status`,{userId:'pastor',active:false,reason:'Reviewer membership ended'});assert.equal(revoke.statusCode,200,revoke.body);
  const denied=await app.inject({url:`/v1/churches/${church.id}/workspace`,headers:{cookie:sessions.get('pastor')!.cookie}});assert.equal(denied.statusCode,404);
  const expired=await globalPost('contributor',`/v1/churches/${church.id}/invitations`,{targetSubject:'member',role:'member',reason:'Expiry boundary test'});assert.equal(expired.statusCode,201);
  await privileged.query("UPDATE invitations SET expires_at=now()-interval '1 minute' WHERE church_id=$1 AND id=$2",[church.id,expired.json().id]);
  assert.equal((await globalPost('member','/v1/invitations/accept',{token:expired.json().token})).statusCode,404);
  const revoked=await globalPost('contributor',`/v1/churches/${church.id}/invitations`,{targetSubject:'member',role:'member',reason:'Revocation boundary test'});assert.equal(revoked.statusCode,201);
  assert.equal((await globalPost('contributor',`/v1/churches/${church.id}/invitations/${revoked.json().id}/revoke`,{})).statusCode,200);
  assert.equal((await globalPost('member','/v1/invitations/accept',{token:revoked.json().token})).statusCode,404);
  const authority=await globalPost('contributor',`/v1/churches/${church.id}/invitations`,{targetSubject:'member',role:'member',reason:'Inviter authority boundary test'});assert.equal(authority.statusCode,201);
  const owner=(await privileged.query('SELECT capabilities FROM memberships WHERE church_id=$1 AND user_id=$2',[church.id,'contributor'])).rows[0];
  try {
    await privileged.query("UPDATE memberships SET capabilities=array_remove(capabilities,'memberships:manage') WHERE church_id=$1 AND user_id=$2",[church.id,'contributor']);
    assert.equal((await globalPost('member','/v1/invitations/accept',{token:authority.json().token})).statusCode,409);
  } finally {await privileged.query('UPDATE memberships SET capabilities=$3 WHERE church_id=$1 AND user_id=$2',[church.id,'contributor',owner.capabilities]);}
});

test('publication locks final authority until commit; a revocation committed first blocks publication',async()=>{
  const {content,intended}=await approvedPair();clockNow=new Date(intended.getTime()-1000);
  const schedule=await command('pastor',`/content/${content.id}/schedules`,{revisionId:content.headRevisionId,approvalId:content.approvalId,localDate:intended.toISOString().slice(0,10),localTime:intended.toISOString().slice(11,16),timeZone:'UTC',destinationId:'web'},content.etag,201);
  const publishing=await database.pool.connect();const revoking=await privileged.connect();
  try {
    await publishing.query('BEGIN');await publishing.query("SELECT set_config('app.church_id',$1,true)",[graceId]);
    await publishOccurrence(publishing,graceId,schedule.id,new Date(intended.getTime()+1000));
    await revoking.query('BEGIN');await revoking.query("SET LOCAL lock_timeout='100ms'");
    await assert.rejects(revoking.query("UPDATE memberships SET capabilities=array_remove(capabilities,'publication:schedule') WHERE church_id=$1 AND user_id='pastor'",[graceId]),{code:'55P03'});
    await revoking.query('ROLLBACK');await publishing.query('ROLLBACK');
    await privileged.query("UPDATE memberships SET capabilities=array_remove(capabilities,'publication:schedule') WHERE church_id=$1 AND user_id='pastor'",[graceId]);
    await runLocalWork(database,new Date(intended.getTime()+1000));
    const blocked=await database.transaction(graceId,'contributor',async client=>({state:(await client.query('SELECT status FROM schedules WHERE church_id=$1 AND id=$2',[graceId,schedule.id])).rows[0].status,count:(await client.query('SELECT count(*) FROM publications WHERE church_id=$1 AND schedule_id=$2',[graceId,schedule.id])).rows[0].count}));
    assert.deepEqual(blocked,{state:'blocked_approval',count:'0'});
  }finally{await publishing.query('ROLLBACK');await revoking.query('ROLLBACK');publishing.release();revoking.release();await privileged.query("UPDATE memberships SET capabilities=array_append(capabilities,'publication:schedule') WHERE church_id=$1 AND user_id='pastor'",[graceId]);clockNow=new Date();}
});

test('privacy exports isolate the subject and reviewed erasure removes live data without claiming immutable or external deletion',async()=>{
  const revision=(await privileged.query("SELECT id,aggregate_id FROM revisions WHERE church_id=$1 LIMIT 1",[graceId])).rows[0];
  const ownComment=randomUUID();const otherComment=randomUUID();const contactId=randomUUID();
  await privileged.query('INSERT INTO comments(church_id,id,aggregate_id,revision_id,author_id,body) VALUES($1,$2,$3,$4,$5,$6)',[graceId,ownComment,revision.aggregate_id,revision.id,'member','MY_REVIEW_COMMENT_PERSONAL']);
  await privileged.query('INSERT INTO comments(church_id,id,aggregate_id,revision_id,author_id,body) VALUES($1,$2,$3,$4,$5,$6)',[graceId,otherComment,revision.aggregate_id,revision.id,'contributor','OTHER_SUBJECT_PRIVATE_COMMENT']);
  await privileged.query('INSERT INTO provider_contacts(church_id,id,user_id,phone_ciphertext,phone_hash,zone,zone_source,sender_scope,suppressed) VALUES($1,$2,$3,$4,$5,$6,$7,$8,false)',[graceId,contactId,'member','ENCRYPTED_PHONE_SHOULD_NOT_EXPORT',createHash('sha256').update('fictional-local-contact').digest('hex'),'America/New_York','member_confirmed','fictional-sender']);
  await privileged.query("INSERT INTO provider_consent_events(church_id,id,contact_id,version,status,evidence,actor_id) VALUES($1,$2,$3,0,'granted',$4,'member')",[graceId,randomUUID(),contactId,{source:'member action',wordingVersion:'local-test-v1'}]);
  const exported=await request('member','GET','/privacy/export');assert.equal(exported.statusCode,200,exported.body);assert.equal(exported.json().subject.id,'member');assert.equal(exported.body.includes('MY_REVIEW_COMMENT_PERSONAL'),true);assert.equal(exported.body.includes('OTHER_SUBJECT_PRIVATE_COMMENT'),false);assert.equal(exported.body.includes('ENCRYPTED_PHONE_SHOULD_NOT_EXPORT'),false);
  const exportRequest=await command('member','/privacy/requests',{kind:'export'},undefined,202);
  assert.equal((await request('pastor','POST',`/privacy/requests/${exportRequest.id}/fulfill`,{identityVerified:true,reason:'Identity independently verified for export'})).statusCode,403);
  const fulfilled=await command('admin',`/privacy/requests/${exportRequest.id}/fulfill`,{identityVerified:true,reason:'Verified the requesting church member identity'});assert.equal(fulfilled.export.subject.id,'member');
  const authorizedExport=await request('contributor','GET',`/privacy/requests/${exportRequest.id}/export`);assert.equal(authorizedExport.statusCode,200);assert.equal(authorizedExport.json().subject.id,'member');
  assert.equal((await request('member','GET',`/privacy/requests/${exportRequest.id}/export`)).statusCode,200);
  const erasure=await command('member','/privacy/requests',{kind:'erasure'},undefined,202);
  assert.equal((await request('admin','POST',`/privacy/requests/${erasure.id}/fulfill`,{identityVerified:true,reason:'Identity verified but retention basis not supplied'})).statusCode,422);
  const result=await command('admin',`/privacy/requests/${erasure.id}/fulfill`,{identityVerified:true,reason:'Verified and processed the member request for local church data removal',retentionBasis:'Local test retention policy: retain exact teaching and security evidence pending named church privacy review; not a legal determination.',retentionReviewAt:new Date(Date.now()+7*24*60*60*1000).toISOString()});
  assert.equal(result.status,'completed_with_retention_review');assert.equal(result.liveDataRemoved,true);assert.equal(result.fullErasureVerified,false);assert.equal(result.externalDeletionVerified,false);assert.equal(result.backupDeletionVerified,false);assert.ok(result.retained.length>=4);
  const state=await privileged.query('SELECT active,display_name,capabilities FROM memberships WHERE church_id=$1 AND user_id=$2',[graceId,'member']);assert.deepEqual(state.rows[0],{active:false,display_name:'Former member',capabilities:[]});
  const contact=(await privileged.query('SELECT suppressed,phone_ciphertext,zone FROM provider_contacts WHERE church_id=$1 AND id=$2',[graceId,contactId])).rows[0];assert.deepEqual(contact,{suppressed:true,phone_ciphertext:'',zone:null});
  assert.equal((await privileged.query('SELECT 1 FROM comments WHERE church_id=$1 AND id=$2',[graceId,ownComment])).rowCount,0);assert.equal((await privileged.query('SELECT 1 FROM comments WHERE church_id=$1 AND id=$2',[graceId,otherComment])).rowCount,1);
  const consentHistory=await privileged.query('SELECT status FROM provider_consent_events WHERE church_id=$1 AND contact_id=$2 ORDER BY version',[graceId,contactId]);assert.deepEqual(consentHistory.rows,[{status:'granted'},{status:'revoked'}]);
  assert.equal((await request('member','GET','/studies')).statusCode,404);
  const reactivate=await request('admin','POST','/members/status',{userId:'member',active:true,reason:'An ordinary import must not restore erased membership'});assert.equal(reactivate.statusCode,409,reactivate.body);assert.equal(reactivate.json().code,'privacy_reactivation_blocked');
});
