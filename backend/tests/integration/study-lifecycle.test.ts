import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import pg from 'pg';
import { buildApp } from '../../src/app.js';
import { config } from '../../src/infrastructure/config.js';
import { Database } from '../../src/infrastructure/database.js';
import { migrate } from '../../src/infrastructure/migrate.js';
import { capabilities } from '../../src/infrastructure/seed.js';
import { publishOccurrence } from '../../src/workers/publication.js';
import { terminateStudy } from '../../src/modules/study-lifecycle.js';
import { registerProviderRoutes, runProviderWork } from '../../src/api/provider-routes.js';
import { encryptToken } from '../../src/integrations/planning-center.js';

const churchId=randomUUID();
const foreignChurchId=randomUUID();
const databaseName=`gather_lifecycle_${randomUUID().replaceAll('-','')}`;
const rootConnection=new URL(process.env.TEST_MIGRATION_DATABASE_URL??'postgres://postgres@127.0.0.1:54329/gather_test');
assert.ok(['localhost','127.0.0.1'].includes(rootConnection.hostname));
assert.match(databaseName,/^gather_lifecycle_[a-f0-9]{32}$/);
rootConnection.pathname='/postgres';
const administrative=new pg.Pool({connectionString:rootConnection.href});
let privileged:pg.Pool;
let database:Database;
let app:FastifyInstance;
let seriesId:string;
let fixtureDay=0;
let now=new Date('2030-01-01T12:00:00Z');
const origin='http://127.0.0.1:4099';
const sessions=new Map<string,{cookie:string;csrf:string}>();
const sourceId=randomUUID();
type Aggregate={id:string;etag:string;headRevisionId:string;approvalId:string|null;livePublicationId:string|null;status:string;version:number;head:{hash:string;calendar:unknown;sourceSnapshot:unknown;payload:Record<string,unknown>}};
type Slot={id:string;etag:string;planId:string;localDate:string;localTime:string;timeZone:string;assigneeIds:string[];lifecycleVersion:number};
const payload={schemaVersion:1,title:'Isolated lifecycle fixture',body:'Read the surrounding passage in context.',reflection:'Reflect together.',discussionQuestion:'What does the passage teach?',application:'Read and discuss together.',references:['John 6:68'],outboundPreview:'Isolated study preview.'};

test('members can read their church brand without workspace access; foreign tenants and theme writes remain protected', async () => {
  const memberCookie = sessions.get('member')!.cookie;
  const own = await app.inject({ method: 'GET', url: `/v1/churches/${churchId}/theme`, headers: { cookie: memberCookie } });
  assert.equal(own.statusCode, 200, own.body);
  assert.ok(own.json().tokens.brand);
  const foreign = await app.inject({ method: 'GET', url: `/v1/churches/${foreignChurchId}/theme`, headers: { cookie: memberCookie } });
  assert.equal(foreign.statusCode, 404, foreign.body);
  const anonymous = await app.inject({ method: 'GET', url: `/v1/churches/${churchId}/theme` });
  assert.equal(anonymous.statusCode, 401, anonymous.body);
  const write = await send('member', 'POST', '/theme', { mode: 'light', tokens: own.json().tokens });
  assert.equal(write.statusCode, 403, write.body);
});

before(async()=>{
  await administrative.query(`CREATE DATABASE "${databaseName}"`);
  const migrationConnection=new URL(rootConnection);migrationConnection.pathname=`/${databaseName}`;
  await migrate(migrationConnection.href);
  privileged=new pg.Pool({connectionString:migrationConnection.href});
  const runtimeConnection=new URL(migrationConnection);runtimeConnection.username='gather_runtime';runtimeConnection.password=process.env.RUNTIME_DATABASE_PASSWORD!;
  database=new Database(runtimeConnection.href);
  for(const [tenant,slug] of [[churchId,'lifecycle'],[foreignChurchId,'foreign-lifecycle']]) await privileged.query("INSERT INTO churches(id,slug,name,time_zone,reading_policy,discussions_enabled) VALUES($1,$2,'Isolated lifecycle church','UTC','public',true)",[tenant,slug]);
  const actors={writer:capabilities.contributor,reviewer:capabilities.contributor,admin:capabilities.admin,member:[],assigned:['workspace:read','plans:edit','content:edit','studies:delete'],outsider:capabilities.contributor};
  for(const [actor,grants] of Object.entries(actors)) {
    await privileged.query('INSERT INTO memberships(church_id,user_id,display_name,capabilities) VALUES($1,$2,$2,$3)',[actor==='outsider'?foreignChurchId:churchId,actor,grants]);
    const token=randomUUID();const csrf=randomUUID();
    await privileged.query("INSERT INTO auth_sessions(token_hash,user_id,display_name,csrf_token,expires_at) VALUES($1,$2,$2,$3,now()+interval '1 hour')",[createHash('sha256').update(token).digest('hex'),actor,csrf]);
    sessions.set(actor,{cookie:`gather_session=${token}`,csrf});
  }
  app=await buildApp({database,settings:{...config(),appOrigin:origin},clock:()=>now});
  const series=await send('writer','POST','/series',{title:'Isolated dates',weekAnchor:'2030-01-06',timeZone:'UTC',sermonIds:[]});
  assert.equal(series.statusCode,201,series.body);seriesId=series.json().id;
  const sermonId=randomUUID();
  await privileged.query("INSERT INTO sermons(church_id,id,title,preached_date,speaker,passages,notes) VALUES($1,$2,'Isolated source','2029-12-01','Fixture','[]','Isolated source notes')",[churchId,sermonId]);
  await privileged.query('INSERT INTO series_sermons(church_id,series_id,sermon_id) VALUES($1,$2,$3)',[churchId,seriesId,sermonId]);
  await privileged.query("INSERT INTO sources(church_id,id,sermon_id,kind,rights,provenance,payload) VALUES($1,$2,$3,'manual_notes',$4,'{}',$5)",[churchId,sourceId,sermonId,{confirmed:true,evidence:'Disposable test source rights'},{spans:[{id:'span-1',text:'Read John 6 in its surrounding context.'}]}]);
  await privileged.query("INSERT INTO provider_source_reviews(church_id,source_id,actor_id) VALUES($1,$2,'writer')",[churchId,sourceId]);
});
after(async()=>{
  await app?.close();await database?.close();await privileged?.end();
  await administrative.query(`DROP DATABASE IF EXISTS "${databaseName}"`);await administrative.end();
});
async function send(actor:string,method:'GET'|'POST'|'PUT',path:string,body?:unknown,etag?:string,key=randomUUID()) {
  const session=sessions.get(actor)!;
  return app.inject({method,url:`/v1/churches/${churchId}${path}`,headers:{cookie:session.cookie,origin,'x-csrf-token':session.csrf,'idempotency-key':key,...(etag?{'if-match':etag}:{})},...(body?{payload:body}:{})});
}
async function study(date?:string,container=seriesId) {
  fixtureDay+=1;
  const localDate=date??new Date(Date.UTC(2034,0,fixtureDay)).toISOString().slice(0,10);
  const response=await send('writer','POST',`/series/${container}/slots`,{localDate,localTime:'08:00',timeZone:'UTC',assigneeIds:['writer']});
  assert.equal(response.statusCode,201,response.body);
  const slot=response.json() as Slot;
  const plan=(await send('writer','GET',`/plans/${slot.planId}`)).json() as Aggregate;
  return {slot,plan};
}
async function approvedStudy(date?:string) {
  const fixture=await study(date);
  const created=await send('writer','POST',`/plans/${fixture.plan.id}/content`,{mode:'manual'},fixture.plan.etag);
  assert.equal(created.statusCode,201,created.body);let content=created.json() as Aggregate;
  const saved=await send('writer','POST',`/content/${content.id}/revisions`,{baseRevisionId:content.headRevisionId,payload},content.etag);
  assert.equal(saved.statusCode,201,saved.body);content=saved.json();
  const submitted=await send('writer','POST',`/content/${content.id}/submit`,{revisionId:content.headRevisionId,approverId:'reviewer'},content.etag);
  assert.equal(submitted.statusCode,200,submitted.body);content=submitted.json();
  const approved=await send('reviewer','POST',`/content/${content.id}/decisions`,{revisionId:content.headRevisionId,expectedHash:content.head.hash,decision:'approve',reason:'Reviewed isolated fixture'},content.etag);
  assert.equal(approved.statusCode,201,approved.body);content=approved.json();
  return {...fixture,content};
}
async function publish(content:Aggregate) {
  const response=await send('writer','POST',`/content/${content.id}/publish`,{revisionId:content.headRevisionId,approvalId:content.approvalId},content.etag);
  assert.equal(response.statusCode,201,response.body);return response.json() as Aggregate;
}

test('plan-only deletion is tenant authorized, idempotent, hides drafts, and frees the same-container date',async()=>{
  const {slot,plan}=await study();
  assert.match(slot.etag,new RegExp(`^"slot:${slot.id}:1"$`));
  assert.equal((await send('member','POST',`/slots/${slot.id}/delete`,{},slot.etag)).statusCode,403);
  assert.equal((await send('outsider','POST',`/slots/${slot.id}/delete`,{},slot.etag)).statusCode,404);
  assert.equal((await send('assigned','POST',`/slots/${slot.id}/delete`,{},slot.etag)).statusCode,403);
  assert.equal((await send('writer','POST',`/slots/${slot.id}/delete`,{})).statusCode,428);
  assert.equal((await send('writer','POST',`/slots/${slot.id}/delete`,{},'"unsupported"')).statusCode,412);
  const key=randomUUID();const deleted=await send('writer','POST',`/slots/${slot.id}/delete`,{reason:'Disposable draft'},slot.etag,key);
  assert.equal(deleted.statusCode,200,deleted.body);assert.equal(deleted.json().deleted,true);
  assert.deepEqual((await send('writer','POST',`/slots/${slot.id}/delete`,{reason:'Disposable draft'},slot.etag,key)).json(),deleted.json());
  assert.equal((await send('writer','POST',`/slots/${slot.id}/delete`,{},slot.etag)).statusCode,200);
  assert.equal((await send('writer','GET',`/plans/${plan.id}`)).statusCode,404);
  assert.equal((await send('writer','GET','/workspace')).json().slots.some((item:Slot)=>item.id===slot.id),false);
  assert.equal((await send('admin','GET',`/slots/${slot.id}/lifecycle`)).json().deleted,true);
  const replacement=await study(slot.localDate);assert.notEqual(replacement.slot.id,slot.id);
  assert.equal((await privileged.query('SELECT 1 FROM revisions WHERE church_id=$1 AND aggregate_id=$2',[churchId,plan.id])).rowCount,1);
});

test('no-op and assignment-only PUT retain approval; moving revises both calendars and cancels old schedules',async()=>{
  const {slot,plan,content}=await approvedStudy();
  const schedule=await send('writer','POST',`/content/${content.id}/schedules`,{revisionId:content.headRevisionId,approvalId:content.approvalId,localDate:slot.localDate,localTime:slot.localTime,timeZone:slot.timeZone},content.etag);
  assert.equal(schedule.statusCode,201,schedule.body);
  const noOp=await send('admin','PUT',`/slots/${slot.id}`,{localDate:slot.localDate,localTime:slot.localTime,timeZone:slot.timeZone},slot.etag);
  assert.equal(noOp.statusCode,200,noOp.body);assert.equal(noOp.json().slot.etag,slot.etag);assert.equal(noOp.json().content[0].approvalId,content.approvalId);
  const assigned=await send('admin','PUT',`/slots/${slot.id}`,{localDate:slot.localDate,localTime:slot.localTime,timeZone:slot.timeZone,assigneeIds:['writer','assigned']},slot.etag);
  assert.equal(assigned.statusCode,200,assigned.body);assert.notEqual(assigned.json().slot.etag,slot.etag);assert.equal(assigned.json().content[0].headRevisionId,content.headRevisionId);assert.equal(assigned.json().content[0].approvalId,content.approvalId);
  const calendar={localDate:'2035-02-20',localTime:'10:30',timeZone:'America/New_York'};
  assert.equal((await send('admin','PUT',`/slots/${slot.id}`,calendar,slot.etag)).statusCode,412);
  const moved=await send('admin','PUT',`/slots/${slot.id}`,calendar,assigned.json().slot.etag);
  assert.equal(moved.statusCode,200,moved.body);assert.equal(moved.json().plan.id,plan.id);assert.equal(moved.json().content[0].id,content.id);
  assert.deepEqual(moved.json().slot.assigneeIds,['writer','assigned']);assert.deepEqual(moved.json().plan.head.calendar,calendar);assert.deepEqual(moved.json().content[0].head.calendar,calendar);
  assert.deepEqual(moved.json().content[0].head.payload,content.head.payload);assert.deepEqual(moved.json().content[0].head.sourceSnapshot,content.head.sourceSnapshot);assert.equal(moved.json().content[0].approvalId,null);
  assert.equal((await privileged.query('SELECT status FROM schedules WHERE church_id=$1 AND id=$2',[churchId,schedule.json().id])).rows[0].status,'cancelled');
  const original=(await privileged.query('SELECT calendar,hash FROM revisions WHERE church_id=$1 AND id=$2',[churchId,content.headRevisionId])).rows[0];
  assert.equal(original.calendar.localDate,slot.localDate);assert.equal(original.hash,content.head.hash);
  const conflict=await study();
  const rejected=await send('admin','PUT',`/slots/${conflict.slot.id}`,calendar,conflict.slot.etag);assert.equal(rejected.statusCode,409);assert.equal(rejected.json().code,'date_conflict');
});

test('ever-published studies require withdrawal, retain one immutable history, and admin purge removes the exact root graph',async()=>{
  const fixture=await approvedStudy();let live=await publish(fixture.content);const publicationId=live.livePublicationId!;
  const replacement=await send('writer','POST',`/content/${live.id}/revisions`,{baseRevisionId:live.headRevisionId,payload:{...payload,title:'Private replacement draft'}},live.etag);
  assert.equal(replacement.statusCode,201,replacement.body);live=replacement.json();assert.equal(live.status,'draft');
  assert.equal((await send('writer','GET','/workspace')).json().slots.find((item:Slot)=>item.id===fixture.slot.id).everPublished,true);
  assert.equal((await send('admin','GET',`/slots/${fixture.slot.id}/lifecycle`)).json().everPublished,true);
  assert.equal((await send('member','GET',`/studies/${publicationId}`)).json().payload.title,payload.title);
  const independent=await approvedStudy();
  const discussionId=randomUUID();const replyId=randomUUID();
  await privileged.query("INSERT INTO discussions(church_id,id,publication_id,user_id,body,status,kind) VALUES($1,$2,$3,'member','Isolated question','approved','question')",[churchId,discussionId,publicationId]);
  await privileged.query("INSERT INTO discussions(church_id,id,publication_id,user_id,body,status,kind,parent_id) VALUES($1,$2,$3,'writer','Isolated reply','approved','reply',$4)",[churchId,replyId,publicationId,discussionId]);
  await privileged.query("INSERT INTO discussion_evaluations(church_id,id,discussion_id,content_version,policy_version,input_hash,verdict,reason_codes) VALUES($1,$2,$3,1,'fixture','fixture','needs_review','[]')",[churchId,randomUUID(),discussionId]);
  await privileged.query("INSERT INTO discussion_resolutions(church_id,id,discussion_id,content_version,actor_id,decision,reason) VALUES($1,$2,$3,1,'writer','resolve','Isolated answer')",[churchId,randomUUID(),discussionId]);
  await privileged.query("INSERT INTO reactions(church_id,id,publication_id,user_id,type) VALUES($1,$2,$3,'member','thankful')",[churchId,randomUUID(),publicationId]);
  await privileged.query("INSERT INTO study_opens(church_id,publication_id,user_id) VALUES($1,$2,'member')",[churchId,publicationId]);
  const calendar={localDate:'2036-02-20',localTime:'10:30',timeZone:'UTC'};
  const move=await send('admin','PUT',`/slots/${fixture.slot.id}`,calendar,fixture.slot.etag);assert.equal(move.statusCode,409);assert.equal(move.json().code,'published_study_date_immutable');
  const deletion=await send('writer','POST',`/slots/${fixture.slot.id}/delete`,{},fixture.slot.etag);assert.equal(deletion.statusCode,409);assert.equal(deletion.json().code,'published_study_requires_withdrawal');
  const confirmation=`PERMANENTLY DELETE ${fixture.slot.id}`;
  assert.equal((await send('admin','POST',`/slots/${fixture.slot.id}/hard-delete`,{confirmation,reason:'Isolated purge test'},fixture.slot.etag)).json().code,'withdrawal_required');
  const withdrawn=await send('writer','POST',`/slots/${fixture.slot.id}/withdraw`,{reason:'Withdraw isolated published study'},fixture.slot.etag);
  assert.equal(withdrawn.statusCode,200,withdrawn.body);assert.equal(withdrawn.json().withdrawn,true);assert.equal(withdrawn.json().deleted,false);
  assert.equal((await send('writer','POST',`/slots/${fixture.slot.id}/withdraw`,{reason:'Safe retry'},fixture.slot.etag)).statusCode,200);
  assert.equal((await send('member','GET',`/studies/${publicationId}`)).statusCode,404);assert.equal((await app.inject(`/v1/public/churches/lifecycle/studies/${publicationId}`)).statusCode,404);
  assert.equal((await send('writer','GET',`/content/${live.id}`)).statusCode,404);
  assert.equal((await send('writer','POST',`/content/${live.id}/revisions`,{baseRevisionId:live.headRevisionId,payload},live.etag)).statusCode,404);
  assert.equal((await send('admin','POST',`/slots/${fixture.slot.id}/delete`,{},withdrawn.json().etag)).json().code,'published_study_requires_withdrawal');
  assert.equal((await privileged.query('SELECT count(*)::integer AS count FROM publications WHERE church_id=$1 AND content_id=$2',[churchId,live.id])).rows[0].count,1);
  assert.equal((await privileged.query('SELECT count(*)::integer AS count FROM reactions WHERE church_id=$1 AND publication_id=$2',[churchId,publicationId])).rows[0].count,1);
  assert.equal((await send('writer','POST',`/slots/${fixture.slot.id}/hard-delete`,{confirmation,reason:'No admin authority'},withdrawn.json().etag)).statusCode,403);
  assert.equal((await send('admin','POST',`/slots/${fixture.slot.id}/hard-delete`,{confirmation:'DELETE',reason:'Typed phrase is required'},withdrawn.json().etag)).statusCode,422);
  assert.equal((await send('admin','POST',`/slots/${fixture.slot.id}/hard-delete`,{confirmation,reason:' '},withdrawn.json().etag)).statusCode,422);
  const key=randomUUID();const purged=await send('admin','POST',`/slots/${fixture.slot.id}/hard-delete`,{confirmation,reason:'Permanently remove disposable test fixture'},withdrawn.json().etag,key);
  assert.equal(purged.statusCode,200,purged.body);assert.equal(purged.json().purged,true);
  assert.deepEqual((await send('admin','POST',`/slots/${fixture.slot.id}/hard-delete`,{confirmation,reason:'Permanently remove disposable test fixture'},withdrawn.json().etag,key)).json(),purged.json());
  assert.deepEqual((await send('admin','POST',`/slots/${fixture.slot.id}/hard-delete`,{confirmation,reason:'Retry with independent command key'},withdrawn.json().etag)).json(),purged.json());
  for(const table of ['publication_audiences','publication_audience_members','study_opens','reactions','discussions']) assert.equal((await privileged.query(`SELECT 1 FROM ${table} WHERE church_id=$1 AND publication_id=$2`,[churchId,publicationId])).rowCount,0,table);
  for(const table of ['discussion_evaluations','discussion_resolutions']) assert.equal((await privileged.query(`SELECT 1 FROM ${table} WHERE church_id=$1 AND discussion_id=$2`,[churchId,discussionId])).rowCount,0,table);
  assert.equal((await privileged.query('SELECT 1 FROM slots WHERE church_id=$1 AND id=$2',[churchId,fixture.slot.id])).rowCount,0);
  assert.equal((await privileged.query('SELECT 1 FROM revisions WHERE church_id=$1 AND aggregate_id=ANY($2::uuid[])',[churchId,[fixture.plan.id,live.id]])).rowCount,0);
  assert.equal((await privileged.query('SELECT 1 FROM aggregates WHERE church_id=$1 AND id=$2',[churchId,independent.content.id])).rowCount,1);
  assert.equal((await privileged.query('SELECT 1 FROM study_purge_audit WHERE church_id=$1 AND study_id=$2',[churchId,fixture.slot.id])).rowCount,1);
});

test('runtime SQL cannot delete roots, forge immutable purge context, or purge without admin authority',async()=>{
  const {slot,plan}=await study();
  await assert.rejects(database.transaction(churchId,'writer',async client=>{
    await client.query("SELECT set_config('app.purge_study',$1,true)",[slot.id]);
    await client.query('DELETE FROM revisions WHERE church_id=$1 AND aggregate_id=$2',[churchId,plan.id]);
  }),{code:'42501'});
  await privileged.query('GRANT DELETE ON revisions TO gather_runtime');
  try {
    await assert.rejects(database.transaction(churchId,'writer',async client=>{
      await client.query("SELECT set_config('app.purge_study',$1,true)",[slot.id]);
      await client.query('DELETE FROM revisions WHERE church_id=$1 AND aggregate_id=$2',[churchId,plan.id]);
    }),{code:'23000'});
  } finally {await privileged.query('REVOKE DELETE ON revisions FROM gather_runtime');}
  await assert.rejects(database.transaction(churchId,'writer',client=>client.query('DELETE FROM slots WHERE church_id=$1 AND id=$2',[churchId,slot.id])),{code:'42501'});
  await assert.rejects(database.transaction(churchId,'writer',client=>client.query('SELECT purge_withdrawn_study($1,$2,$3,$4,1)',[churchId,slot.id,`PERMANENTLY DELETE ${slot.id}`,'No admin authority'])),{code:'42501'});
  assert.equal((await privileged.query('SELECT 1 FROM revisions WHERE church_id=$1 AND aggregate_id=$2',[churchId,plan.id])).rowCount,1);
});

test('delete cancels reserved AI work and stale review requests; publication races cannot resurrect a deleted study',async()=>{
  const fixture=await approvedStudy();
  const period=(await privileged.query("SELECT to_char(now(),'YYYY-MM') AS period")).rows[0].period;
  await privileged.query("INSERT INTO provider_budgets(church_id,monthly_limit,period,reserved_tokens,profile_version,profile) VALUES($1,10000,$2,500,'fixture','fixture')",[churchId,period]);
  const jobId=randomUUID();
  await privileged.query("INSERT INTO provider_jobs(church_id,id,actor_id,kind,payload,reservation,budget_period) VALUES($1,$2,'writer','ai',$3,500,$4)",[churchId,jobId,{aggregateId:fixture.content.id},period]);
  const scheduled=await send('writer','POST',`/content/${fixture.content.id}/schedules`,{revisionId:fixture.content.headRevisionId,approvalId:fixture.content.approvalId,localDate:fixture.slot.localDate,localTime:fixture.slot.localTime,timeZone:fixture.slot.timeZone},fixture.content.etag);
  assert.equal(scheduled.statusCode,201,scheduled.body);
  const writer=await database.pool.connect();
  try {
    await writer.query('BEGIN');await writer.query("SELECT set_config('app.church_id',$1,true),set_config('app.user_id','writer',true)",[churchId]);
    const result=await terminateStudy(writer,{userId:'writer',capabilities:capabilities.contributor},churchId,fixture.slot.id,fixture.slot.etag,'Isolated race deletion','delete');assert.ok(result.cancelledPendingWork>=2);
    const publishing=database.transaction(churchId,'writer',client=>publishOccurrence(client,churchId,scheduled.json().id,new Date('2039-01-01T12:00:00Z')));
    await writer.query('COMMIT');await publishing;
  } finally {await writer.query('ROLLBACK');writer.release();}
  assert.equal((await privileged.query('SELECT reserved_tokens FROM provider_budgets WHERE church_id=$1',[churchId])).rows[0].reserved_tokens,0);
  assert.equal((await privileged.query('SELECT status FROM provider_jobs WHERE church_id=$1 AND id=$2',[churchId,jobId])).rows[0].status,'cancelled');
  assert.equal((await privileged.query('SELECT 1 FROM publications WHERE church_id=$1 AND content_id=$2',[churchId,fixture.content.id])).rowCount,0);
});

test('past-due final approval publishes immediately without requiring plan approval',async()=>{
  now=new Date('2030-01-01T12:00:00Z');
  const fixture=await approvedStudy('2020-02-10');
  assert.equal(fixture.content.status,'published');assert.ok(fixture.content.livePublicationId);
  assert.equal(fixture.plan.approvalId,null);
  assert.equal((await send('member','GET',`/studies/${fixture.content.livePublicationId}`)).statusCode,200);
  assert.equal((await privileged.query('SELECT member_count FROM publication_audiences WHERE church_id=$1 AND publication_id=$2',[churchId,fixture.content.livePublicationId])).rows[0].member_count,1);
});

test('AI drafts and selective adoption work without plan approval and reject withdrawal during generation',async context=>{
  let calls=0;let withdrawDuringRequest=false;let fixture:Awaited<ReturnType<typeof study>>;
  const server=createServer(async(request,response)=>{
    const chunks:Buffer[]=[];for await(const chunk of request) chunks.push(Buffer.from(chunk));
    const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));const submitted=JSON.parse(input.input[0].content[0].text);
    calls+=1;assert.ok(submitted.unapprovedPlanContext);assert.equal(submitted.planContextRevisionId,fixture.plan.headRevisionId);
    if(withdrawDuringRequest) {
      const removed=await send('writer','POST',`/slots/${fixture.slot.id}/delete`,{},fixture.slot.etag);assert.equal(removed.statusCode,200,removed.body);
    }
    const fields=['title','body','reflection','discussionQuestion','application','smsPreview'].map(path=>({path,date:null,suggestion:'Isolated human-reviewed suggestion',evidence:[{sourceId,spanId:'span-1'}],scriptureReferences:['John 6:68'],warnings:['Human review required']}));
    response.setHeader('content-type','application/json');response.end(JSON.stringify({id:`fixture-${calls}`,model:'fixture-model',status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({fields})}]}],usage:{input_tokens:100,output_tokens:100}}));
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  context.after(async()=>{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));});
  const address=server.address();assert.ok(address&&typeof address==='object');
  const runtime={enabled:true,openai:{apiKey:'isolated-fixture',model:'fixture-model',baseUrl:`http://127.0.0.1:${address.port}`}};
  const providerApp=Fastify();await providerApp.register(cookie);
  providerApp.setErrorHandler((error,_request,reply)=>{const failure=error as Error&{statusCode?:number;code?:string};return reply.code(failure.statusCode??500).send({code:failure.code,message:failure.message});});
  await registerProviderRoutes(providerApp,database,{...config(),appOrigin:origin},runtime);
  context.after(()=>providerApp.close());
  await privileged.query("UPDATE provider_budgets SET monthly_limit=50000,profile='Isolated context',profile_version='fixture',rights_confirmed=true WHERE church_id=$1",[churchId]);
  async function providerRequest(path:string,body:unknown,etag?:string) {
    const session=sessions.get('writer')!;
    return providerApp.inject({method:'POST',url:`/v1/churches/${churchId}/providers${path}`,headers:{cookie:session.cookie,origin,'x-csrf-token':session.csrf,'idempotency-key':randomUUID(),...(etag?{'if-match':etag}:{})},payload:body as Record<string,unknown>});
  }
  for(const interrupted of [false,true]) {
    fixture=await study();withdrawDuringRequest=interrupted;
    const created=await send('writer','POST',`/plans/${fixture.plan.id}/content`,{mode:'manual'},fixture.plan.etag);assert.equal(created.statusCode,201,created.body);const content=created.json() as Aggregate;
    assert.equal(content.head.sourceSnapshot instanceof Array,true);assert.equal(fixture.plan.approvalId,null);
    const queued=await providerRequest('/ai/jobs',{aggregateId:content.id,baseRevisionId:content.headRevisionId,workflow:'study_draft',explicitAction:true,task:'Draft from reviewed source and optional unapproved notes',sourceIds:[sourceId],reservedInputTokens:9000,reservedOutputTokens:1500});
    assert.equal(queued.statusCode,202,queued.body);
    await runProviderWork(database,{...config(),appOrigin:origin},runtime);
    const job=(await privileged.query('SELECT * FROM provider_jobs WHERE church_id=$1 AND id=$2',[churchId,queued.json().id])).rows[0];
    if(interrupted) {assert.equal(job.status,'failed');assert.equal((await privileged.query('SELECT 1 FROM provider_proposals WHERE church_id=$1 AND job_id=$2',[churchId,job.id])).rowCount,0);}
    else {
      assert.equal(job.status,'completed',JSON.stringify(job));
      const adopted=await providerRequest(`/ai/proposals/${job.result.proposalId}/adopt`,{fields:['body'],confirmedReplacement:true},content.etag);
      assert.equal(adopted.statusCode,201,adopted.body);assert.equal(adopted.json().head.payload.body,'Isolated human-reviewed suggestion');assert.equal(adopted.json().status,'draft');
    }
  }
  assert.equal(calls,2);assert.equal((await privileged.query('SELECT reserved_tokens FROM provider_budgets WHERE church_id=$1',[churchId])).rows[0].reserved_tokens,0);
});

test('withdrawal serializes with provider claims, retains accepted-send evidence, and permits authenticated callbacks',async context=>{
  const accountSid=`AC${'1'.repeat(32)}`;const messageSid=`SM${'2'.repeat(32)}`;const authToken='isolated-fixture-token';
  const connectionId=randomUUID();const contactId=randomUUID();const encryptionKey=Buffer.alloc(32,7).toString('base64');
  const senderScope='isolated-sender';const callbackOrigin='https://rooted-lifecycle.invalid';let calls=0;
  let requestStarted:()=>void=()=>{};const started=new Promise<void>(resolve=>{requestStarted=resolve;});
  let releaseRequest:()=>void=()=>{};const released=new Promise<void>(resolve=>{releaseRequest=resolve;});
  const server=createServer(async(_request,response)=>{
    calls+=1;requestStarted();await released;
    response.setHeader('content-type','application/json');response.end(JSON.stringify({account_sid:accountSid,sid:messageSid,status:'queued'}));
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  context.after(async()=>{releaseRequest();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));});
  const address=server.address();assert.ok(address&&typeof address==='object');
  const runtime={enabled:true,encryptionKey,twilio:{accountSid,authToken,from:'+15005550006',churchId,senderScope,activationApproved:true,baseUrl:`http://127.0.0.1:${address.port}`}};
  const settings={...config(),appOrigin:callbackOrigin};
  const providerApp=Fastify();await providerApp.register(cookie);await registerProviderRoutes(providerApp,database,settings,runtime);context.after(()=>providerApp.close());
  await privileged.query("INSERT INTO provider_connections(church_id,id,provider,owner_id,status,config) VALUES($1,$2,'twilio','writer','configured',$3)",[churchId,connectionId,{accountSid,senderScope}]);
  const offset=new Date().getUTCHours()-12;const zone=`Etc/GMT${offset>=0?'+':''}${offset}`;
  await privileged.query("INSERT INTO provider_contacts(church_id,id,user_id,phone_ciphertext,phone_hash,zone,zone_source,sender_scope,consent_version,suppressed) VALUES($1,$2,'member',$3,$4,$5,'member_confirmed',$6,1,false)",[churchId,contactId,encryptToken('+15005550006',JSON.stringify([churchId,contactId]),encryptionKey),'isolated-phone-hash',zone,senderScope]);
  async function intent(content:Aggregate) {
    const intentId=randomUUID();
    await privileged.query("INSERT INTO provider_send_intents(church_id,id,connection_id,publication_id,contact_id,actor_id,approval_id,preview_hash,body,consent_version,expires_at) VALUES($1,$2,$3,$4,$5,'writer',$6,$7,$8,1,now()+interval '1 hour')",[churchId,intentId,connectionId,content.livePublicationId,contactId,content.approvalId,createHash('sha256').update(payload.outboundPreview).digest('hex'),payload.outboundPreview]);
    return intentId;
  }
  const cancelled=await approvedStudy();const cancelledLive=await publish(cancelled.content);const cancelledIntent=await intent(cancelledLive);
  const removed=await send('writer','POST',`/slots/${cancelled.slot.id}/withdraw`,{reason:'Cancel unclaimed isolated provider work'},cancelled.slot.etag);assert.equal(removed.statusCode,200,removed.body);
  await runProviderWork(database,settings,runtime);assert.equal(calls,0);
  assert.equal((await privileged.query('SELECT status FROM provider_send_intents WHERE church_id=$1 AND id=$2',[churchId,cancelledIntent])).rows[0].status,'cancelled');
  const dispatched=await approvedStudy();const dispatchedLive=await publish(dispatched.content);const dispatchedIntent=await intent(dispatchedLive);
  const worker=runProviderWork(database,settings,runtime);
  try {
    await Promise.race([started,worker.then(()=>{throw new Error('Provider claim did not reach the isolated HTTP server');})]);
    const withdrawal=await send('writer','POST',`/content/${dispatchedLive.id}/withdraw`,{reason:'Retain evidence of provider claim'},dispatchedLive.etag);
    assert.equal(withdrawal.statusCode,200,withdrawal.body);assert.equal(withdrawal.json().alreadyDispatched,1);
    const blocked=await send('admin','POST',`/slots/${dispatched.slot.id}/hard-delete`,{confirmation:`PERMANENTLY DELETE ${dispatched.slot.id}`,reason:'Purge must wait for active provider claim'},withdrawal.json().etag);
    assert.equal(blocked.statusCode,409,blocked.body);assert.equal(blocked.json().code,'provider_work_in_flight');
    releaseRequest();await worker;
    assert.equal((await privileged.query('SELECT status FROM provider_send_intents WHERE church_id=$1 AND id=$2',[churchId,dispatchedIntent])).rows[0].status,'queued');
    const callbackPath=`/v1/provider-callbacks/twilio/${churchId}/${connectionId}?intentId=${dispatchedIntent}`;
    const form={AccountSid:accountSid,MessageSid:messageSid,MessageStatus:'delivered'};
    const signed=`${callbackOrigin}/api${callbackPath}`+Object.entries(form).sort(([left],[right])=>left.localeCompare(right)).map(([name,value])=>name+value).join('');
    const callback=await providerApp.inject({method:'POST',url:callbackPath,headers:{'content-type':'application/x-www-form-urlencoded','x-twilio-signature':createHmac('sha1',authToken).update(signed).digest('base64')},payload:new URLSearchParams(form).toString()});
    assert.equal(callback.statusCode,200,callback.body);
    const evidence=(await privileged.query('SELECT status,delivery_events FROM provider_send_intents WHERE church_id=$1 AND id=$2',[churchId,dispatchedIntent])).rows[0];assert.equal(evidence.status,'delivered');assert.ok(evidence.delivery_events.length>=3);
    const purged=await send('admin','POST',`/slots/${dispatched.slot.id}/hard-delete`,{confirmation:`PERMANENTLY DELETE ${dispatched.slot.id}`,reason:'Purge reconciled disposable fixture'},withdrawal.json().etag);
    assert.equal(purged.statusCode,200,purged.body);assert.equal((await privileged.query('SELECT 1 FROM provider_send_intents WHERE church_id=$1 AND id=$2',[churchId,dispatchedIntent])).rowCount,0);
    assert.equal((await privileged.query("SELECT 1 FROM provider_webhook_inbox WHERE church_id=$1 AND payload->>'messageSid'=$2",[churchId,messageSid])).rowCount,0);
    assert.equal((await privileged.query('SELECT 1 FROM provider_contacts WHERE church_id=$1 AND id=$2',[churchId,contactId])).rowCount,1);
  } finally {releaseRequest();await worker;}
});
