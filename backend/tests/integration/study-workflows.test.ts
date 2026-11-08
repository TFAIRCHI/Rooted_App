import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import pg from 'pg';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { ZodError } from 'zod';
import { migrate } from '../../src/infrastructure/migrate.js';
import { seed, graceId, riversideId } from '../../src/infrastructure/seed.js';
import { Database } from '../../src/infrastructure/database.js';
import { config } from '../../src/infrastructure/config.js';
import { studyWorkflowRoutes } from '../../src/api/study-workflow-routes.js';
import { runStudyWorkflows } from '../../src/modules/study-workflows.js';
import { canonical, hash } from '../../src/modules/revisions.js';

test('guided workflow plans, resumes, stages and atomically saves complete private drafts',async t=>{
  const base=new URL(process.env.TEST_MIGRATION_DATABASE_URL!);assert.ok(['localhost','127.0.0.1'].includes(base.hostname));
  const root=new pg.Client({connectionString:base.href});await root.connect();const name=`gather_workflow_${randomUUID().replaceAll('-','')}`;await root.query(`CREATE DATABASE ${name}`);
  base.pathname='/'+name;await migrate(base.href);await seed(base.href);
  const admin=new pg.Client({connectionString:base.href});await admin.connect();
  const runtimeUrl=new URL(base);runtimeUrl.username='gather_runtime';runtimeUrl.password=process.env.RUNTIME_DATABASE_PASSWORD!;
  const db=new Database(runtimeUrl.href);await db.assertRuntime();
  const app=Fastify();await app.register(cookie);app.setErrorHandler((error,_request,reply)=>{const e=error as {code?:string;statusCode?:number;message:string};return reply.code(error instanceof ZodError?422:e.statusCode??(e.code==='23505'?409:500)).send({message:e.message});});
  await studyWorkflowRoutes(app,db,{...config(),databaseUrl:runtimeUrl.href},()=>new Date('2026-10-24T16:00:00Z'),()=>model);
  t.after(async()=>{await app.close();await db.close();await admin.end();await root.query(`DROP DATABASE ${name} WITH (FORCE)`);await root.end();});
  const sessions:Record<string,string>={};
  for(const actor of ['contributor','member','second','admin']){const token=randomUUID();sessions[actor]=token;await admin.query("INSERT INTO auth_sessions(token_hash,user_id,display_name,csrf_token,expires_at) VALUES($1,$2,$2,'flow-csrf',now()+interval '1 hour')",[createHash('sha256').update(token).digest('hex'),actor]);}
  await admin.query("INSERT INTO memberships(church_id,user_id,display_name,capabilities) SELECT church_id,'second','Second',capabilities FROM memberships WHERE church_id=$1 AND user_id='contributor'",[graceId]);
  const series=(await admin.query('SELECT id FROM series WHERE church_id=$1 LIMIT 1',[graceId])).rows[0].id;
  const prefix=`/v1/churches/${graceId}/study-workflows`;
  const createBody={seriesId:series,assigneeId:'contributor',localTime:'08:00',task:'Create a three-day study for the week after next.',sourceText:'John 6:68. Synthetic notes: honest questions can accompany trust. Take a small faithful next step.',reviewed:true,rightsConfirmed:true};
  const inject=(actor:string,path:string,body?:unknown,key:string=randomUUID())=>app.inject({method:body===undefined?'GET':'POST',url:prefix+path,headers:{cookie:`gather_session=${sessions[actor]}`,'x-csrf-token':'flow-csrf','idempotency-key':key},...(body===undefined?{}:{payload:JSON.stringify(body),headers:{cookie:`gather_session=${sessions[actor]}`,'x-csrf-token':'flow-csrf','idempotency-key':key,'content-type':'application/json'}})});
  // Keep the original comprehensive batch test as a compatibility check for pre-022 runs.
  const call=async(actor:string,path:string,body?:unknown,key:string=randomUUID())=>{
    const response=await inject(actor,path,body,key);
    if(path===''&&body&&response.statusCode===200&&!(body as {task:string}).task.startsWith('Guided'))await admin.query('UPDATE study_workflows SET sequential=false WHERE id=$1',[response.json().id]);
    return response;
  };
  let calls=0,failChat=false,failDate:string|null=null,held:Promise<void>|null=null;const dates:string[]=[];
  const model={apiKey:'fixture',model:'gpt-5.6-luna',baseUrl:'https://fixture.openai.azure.com/openai/v1',fetch:(async(_url,init)=>{
    calls++;if(held)await held;
    const body=JSON.parse(init!.body as string);
    if(!body.text?.format&&failChat)return new Response('{}',{status:429});
    if(!body.text?.format)return Response.json({id:`fixture-chat-${calls}`,model:body.model,status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'I understand the Paul study request. Which audience and passage would you like to use? Nothing has been created.'}]}],usage:{input_tokens:300,output_tokens:80}});
    const input=JSON.parse(body.input[0].content[0].text);let value:unknown;
    if(input.kind==='plan')value={reply:input.plan?'I have reviewed your feedback. Please check the revised teaching direction before confirming creation.':'My understanding is three studies from your outline. Is this the direction you want?',weekOffset:input.originalRequest?.startsWith('Bridge')?6:input.task.startsWith('Guided')?5:2,dayCount:3,theme:'Honest faith',progression:'Observe, reflect, act',direction:{audience:'Adults',takeaway:'Bring questions to Jesus',depth:'Simple to intermediate',translation:'Reference only',illustrations:'A daily decision',application:'One faithful next step'},questions:[],assumptions:['Three suggested dates'],days:[1,3,5].map(weekday=>({weekday,title:'Trust with questions',objective:'Explore honest faith',theme:'Trust',references:['John 6:68']}))};
    else{dates.push(input.date);if(failDate===input.date)return new Response('{}',{status:429});value={date:input.date,content:{schemaVersion:1,title:'A complete day',references:['John 6:68'],body:'A complete synthetic devotional body.',reflection:'Where do you have questions?',discussionQuestion:'What does trust look like?',application:'Take one faithful next step.',outboundPreview:'Reflect on honest faith today.'},evidence:['title','references','body','reflection','discussionQuestion','application','outboundPreview'].map(field=>({field,sourceId:input.sourceId,spanId:'outline'})),warnings:['Human Scripture review required.']};}
  if(input.kind==='plan'&&input.plan)value={...(value as Record<string,unknown>),weekOffset:Math.round((Date.parse(input.plan.weekStart)-Date.parse(input.referenceSunday))/(7*86400000)),days:input.plan.days.map((day:{date:string;title:string;objective:string;theme:string;references:string[]})=>({weekday:new Date(day.date+'T12:00:00Z').getUTCDay(),title:day.title,objective:day.objective,theme:day.theme,references:day.references}))};
    return Response.json({id:`fixture-${calls}`,model:body.model,status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:400,output_tokens:250}});
  }) as typeof fetch};
  const tick=()=>runStudyWorkflows(db,()=>model);
  const slotsBefore=Number((await admin.query('SELECT count(*) FROM slots')).rows[0].count);
  assert.equal((await call('member','',createBody)).statusCode,403);
  assert.equal((await app.inject({method:'GET',url:prefix})).statusCode,401);
  assert.equal((await app.inject({method:'POST',url:prefix,headers:{cookie:`gather_session=${sessions.contributor}`},payload:createBody})).statusCode,403);
  const key=randomUUID(),created=await call('contributor','',createBody,key);assert.equal(created.statusCode,200,created.body);let run=created.json();const id=run.id;
  assert.equal((await call('contributor','',createBody,key)).json().id,id);
  assert.equal((await call('contributor','',{...createBody,task:'different'},key)).statusCode,409);
  assert.equal((await call('second','/'+id)).statusCode,404);
  assert.equal((await app.inject({method:'GET',url:prefix.replace(graceId,riversideId)+'/'+id,headers:{cookie:`gather_session=${sessions.contributor}`}})).statusCode,404);
  assert.equal(Number((await admin.query('SELECT count(*) FROM slots')).rows[0].count),slotsBefore);
  await tick();run=(await call('contributor','/'+id)).json();assert.equal(run.state,'direction_review',JSON.stringify(run));assert.equal(run.plan.days.length,3);assert.equal(calls,1);
  assert.equal((await call('contributor',`/${id}/confirm`,{version:run.version,planHash:run.planHash,sourceHash:run.sourceHash,profileHash:run.profileHash,confirmed:true})).statusCode,409);
  run=(await call('contributor',`/${id}/plan`,{version:run.version,plan:run.plan})).json();assert.equal(run.state,'awaiting_generation_confirmation');
  const confirmBody={version:run.version,planHash:run.planHash,sourceHash:run.sourceHash,profileHash:run.profileHash,confirmed:true};const confirmationKey=randomUUID();
  const confirmed=await call('contributor',`/${id}/confirm`,confirmBody,confirmationKey);assert.equal(confirmed.statusCode,200,confirmed.body);assert.equal((await call('contributor',`/${id}/confirm`,confirmBody,confirmationKey)).statusCode,200);
  assert.equal(Number((await admin.query('SELECT count(*) FROM slots')).rows[0].count),slotsBefore);
  failDate='2026-11-04';await tick();await tick();run=(await call('contributor','/'+id)).json();assert.equal(run.state,'failed');assert.equal(Number((await admin.query('SELECT count(*) FROM slots')).rows[0].count),slotsBefore);
  failDate=null;const retry=await call('contributor',`/${id}/retry`,{version:run.version});assert.equal(retry.statusCode,200,retry.body);
  await tick();await tick();await tick();run=(await call('contributor','/'+id)).json();assert.equal(run.state,'drafts_saved',JSON.stringify(run));assert.equal(run.mapping.length,3);assert.equal(dates.filter(date=>date==='2026-11-02').length,1);assert.equal(dates.filter(date=>date==='2026-11-04').length,2);
  assert.equal(Number((await admin.query('SELECT count(*) FROM slots')).rows[0].count),slotsBefore+3);
  for(const target of run.mapping){const saved=(await admin.query('SELECT r.*,a.status FROM revisions r JOIN aggregates a ON a.church_id=r.church_id AND a.head_revision_id=r.id WHERE r.church_id=$1 AND a.id=$2',[graceId,target.contentId])).rows[0];assert.equal(saved.status,'draft');for(const field of ['title','references','body','reflection','discussionQuestion','application','outboundPreview'])assert.ok(saved.payload[field]?.length,field);assert.equal(saved.payload.scriptureReading.translation,'KJV');assert.equal(saved.payload.scriptureReading.reference,'John 6:68');assert.equal(saved.payload.scriptureReading.verses.length,1);assert.equal(saved.payload.scriptureReading.featuredVerse,68);assert.equal(JSON.parse(saved.canonical_bytes).sourceSnapshot[0].workflowId,id);assert.equal(saved.hash,hash(canonical(JSON.parse(saved.canonical_bytes))));}
  assert.equal(Number((await admin.query('SELECT count(*) FROM publications')).rows[0].count),0);
  assert.equal((await admin.query('SELECT reserved_tokens FROM provider_budgets WHERE church_id=$1',[graceId])).rows[0].reserved_tokens,0);
  const slotsSaved=Number((await admin.query('SELECT count(*) FROM slots')).rows[0].count);await tick();assert.equal(Number((await admin.query('SELECT count(*) FROM slots')).rows[0].count),slotsSaved);
  // An insert failure on day two must roll back day one, and commit retry must reuse all staged output.
  let rollbackRun=(await call('contributor','',createBody)).json();await tick();rollbackRun=(await call('contributor','/'+rollbackRun.id)).json();
  rollbackRun.plan.weekStart='2026-11-08';rollbackRun.plan.days=rollbackRun.plan.days.map((day:{date:string})=>({...day,date:new Date(Date.parse(day.date+'T12:00:00Z')+7*86400000).toISOString().slice(0,10)}));
  rollbackRun=(await call('contributor',`/${rollbackRun.id}/plan`,{version:rollbackRun.version,plan:rollbackRun.plan})).json();
  await call('contributor',`/${rollbackRun.id}/confirm`,{version:rollbackRun.version,planHash:rollbackRun.planHash,sourceHash:rollbackRun.sourceHash,profileHash:rollbackRun.profileHash,confirmed:true});
  await tick();await tick();await tick();
  await admin.query("CREATE FUNCTION fail_second_day() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.local_date='2026-11-11' THEN RAISE EXCEPTION 'fixture commit failure' USING ERRCODE='23514'; END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_commit BEFORE INSERT ON slots FOR EACH ROW EXECUTE FUNCTION fail_second_day()");
  await tick();rollbackRun=(await call('contributor','/'+rollbackRun.id)).json();assert.equal(rollbackRun.state,'paused_conflict');assert.equal(Number((await admin.query('SELECT count(*) FROM slots')).rows[0].count),slotsSaved);assert.equal(rollbackRun.mapping.length,0);
  await admin.query('DROP TRIGGER fixture_commit ON slots; DROP FUNCTION fail_second_day()');
  const callsBeforeCommitRetry=calls;await call('contributor',`/${rollbackRun.id}/retry`,{version:rollbackRun.version});await tick();rollbackRun=(await call('contributor','/'+rollbackRun.id)).json();assert.equal(rollbackRun.state,'drafts_saved');assert.equal(calls,callsBeforeCommitRetry);
  await assert.rejects(db.pool.query('SELECT * FROM cowriter_daily_allowance'),/permission denied/);
  await assert.rejects(db.transaction(graceId,'contributor',client=>client.query("UPDATE study_workflow_sources SET text='changed' WHERE church_id=$1",[graceId])),/permission denied/);
  assert.equal((await db.transaction(graceId,'second',client=>client.query('SELECT * FROM study_workflows WHERE id=$1',[id]))).rowCount,0);
  // A fresh run plans normally, but existing target dates are rejected without overwriting.
  const other=(await call('contributor','',createBody)).json();await tick();const conflicting=(await call('contributor','/'+other.id)).json();assert.equal((await call('contributor',`/${other.id}/plan`,{version:conflicting.version,plan:conflicting.plan})).statusCode,409);
  const erased=await call('contributor',`/${other.id}/erase`,{confirmed:true});assert.equal(erased.statusCode,200,erased.body);assert.equal((await call('contributor','/'+other.id)).statusCode,404);
  assert.equal((await admin.query('SELECT text FROM study_workflow_sources WHERE run_id=$1',[other.id])).rows[0].text,'');
  const resumed=(await call('contributor','',createBody)).json();let release=()=>{};held=new Promise(resolve=>{release=resolve;});const pending=tick();const before=calls;while(calls===before)await new Promise(resolve=>setTimeout(resolve,10));
  await call('contributor',`/${resumed.id}/cancel`,{version:resumed.version});release();await pending;held=null;
  assert.equal((await call('contributor','/'+resumed.id)).json().state,'canceled');
  assert.equal((await admin.query('SELECT reserved_tokens FROM provider_budgets WHERE church_id=$1',[graceId])).rows[0].reserved_tokens,0);
  await admin.query("UPDATE study_workflows SET expires_at=now()-interval '1 second' WHERE id=$1",[resumed.id]);await tick();assert.equal((await admin.query('SELECT state FROM study_workflows WHERE id=$1',[resumed.id])).rows[0].state,'erased');
  // Reviewed privacy export/erase operates on the exact subject without losing accounting.
  const privateRun=(await call('contributor','',createBody)).json();
  const exported=await db.transaction(graceId,'admin',async client=>(await client.query('SELECT study_workflow_private_data($1,$2,false) AS data',[graceId,'contributor'])).rows[0].data);
  assert.ok(exported.some((item:{id:string;sourceText:string})=>item.id===privateRun.id&&item.sourceText.includes('Synthetic notes')));
  await db.transaction(graceId,'admin',client=>client.query('SELECT study_workflow_private_data($1,$2,true)',[graceId,'contributor']));
  assert.equal((await admin.query('SELECT text FROM study_workflow_sources WHERE run_id=$1',[privateRun.id])).rows[0].text,'');
  assert.equal((await admin.query('SELECT reserved_tokens FROM provider_budgets WHERE church_id=$1',[graceId])).rows[0].reserved_tokens,0);
  // A revoked contributor's in-flight result is discarded and cannot be read.
  const revokeRun=(await call('contributor','',createBody)).json();held=new Promise(resolve=>{release=resolve;});const callsBeforeRevoke=calls;const inFlight=tick();while(calls===callsBeforeRevoke)await new Promise(resolve=>setTimeout(resolve,10));
  await admin.query("UPDATE memberships SET active=false WHERE church_id=$1 AND user_id='contributor'",[graceId]);release();await inFlight;held=null;
  assert.equal((await call('contributor','/'+revokeRun.id)).statusCode,404);
  assert.equal((await admin.query('SELECT result FROM study_workflow_jobs WHERE run_id=$1',[revokeRun.id])).rows[0].result,null);
  assert.equal((await admin.query('SELECT reserved_tokens FROM provider_budgets WHERE church_id=$1',[graceId])).rows[0].reserved_tokens,0);
  await admin.query("UPDATE memberships SET active=true WHERE church_id=$1 AND user_id='contributor'",[graceId]);
  // Losing a claimed step never automatically submits it again after lease expiry.
  const abandoned=(await call('contributor','',createBody)).json();const beforeRecovery=calls;
  await admin.query("UPDATE study_workflow_jobs SET state='running',lease_until=now()-interval '1 second' WHERE run_id=$1",[abandoned.id]);
  await admin.query("UPDATE study_workflows SET state='planning' WHERE id=$1",[abandoned.id]);await tick();
  assert.equal(calls,beforeRecovery);assert.equal((await admin.query('SELECT state FROM study_workflow_jobs WHERE run_id=$1',[abandoned.id])).rows[0].state,'submission_unknown');
  assert.equal((await admin.query('SELECT reserved_tokens FROM provider_budgets WHERE church_id=$1',[graceId])).rows[0].reserved_tokens,0);
  // New runs require request consent, then independent consent for each day.
  let guided=(await call('contributor','',{...createBody,task:'Guided: Create three studies five weeks from now.'})).json();
  assert.equal(guided.sequential,true);await tick();guided=(await call('contributor','/'+guided.id)).json();
  const guidedId=guided.id,existingCount=Number((await admin.query('SELECT count(*) FROM slots')).rows[0].count);
  assert.equal(guided.intentConfirmed,false);
  assert.equal((await call('contributor',`/${guidedId}/plan`,{version:guided.version,plan:guided.plan})).statusCode,409);
  assert.equal((await call('contributor',`/${guidedId}/confirm`,{version:guided.version,planHash:guided.planHash,sourceHash:guided.sourceHash,profileHash:guided.profileHash,confirmed:true})).statusCode,409);
  guided=(await call('contributor',`/${guidedId}/intent`,{version:guided.version,planHash:guided.planHash,confirmed:true})).json();assert.equal(guided.intentConfirmed,true);
  await tick();assert.equal(Number((await admin.query('SELECT count(*) FROM slots')).rows[0].count),existingCount);
  for(let index=0;index<3;index++){
    const version=guided.version;
    if(index===1){const unauthorized=structuredClone(guided.plan);unauthorized.days[0].title='Overwrite saved day';assert.equal((await call('contributor',`/${guidedId}/plan`,{version,plan:unauthorized})).statusCode,409);}
    guided.plan.days[index].objective=`Confirmed objective for day ${index+1}`;
    const review=await call('contributor',`/${guidedId}/plan`,{version:guided.version,plan:guided.plan});assert.equal(review.statusCode,200,review.body);guided=review.json();
    const body={version:guided.version,planHash:guided.planHash,sourceHash:guided.sourceHash,profileHash:guided.profileHash,confirmed:true};
    const consentKey=randomUUID();const submitted=await call('contributor',`/${guidedId}/confirm`,body,consentKey);assert.equal(submitted.statusCode,200,submitted.body);
    assert.equal((await call('contributor',`/${guidedId}/confirm`,body,consentKey)).statusCode,200);
    const pendingJobs=(await admin.query("SELECT local_date::text AS date FROM study_workflow_jobs WHERE run_id=$1 AND state='pending'",[guidedId])).rows;assert.deepEqual(pendingJobs.map(x=>x.date),[guided.plan.days[index].date]);
    await tick();await tick();guided=(await call('contributor','/'+guidedId)).json();
    assert.equal(guided.mapping.length,index+1);assert.equal(guided.state,index===2?'drafts_saved':'direction_review');
    const idleCalls:number=calls;await tick();assert.equal(calls,idleCalls);assert.equal(Number((await admin.query('SELECT count(*) FROM slots')).rows[0].count),existingCount+index+1);
    if(index<2)assert.equal((await call('contributor',`/${guidedId}/confirm`,body)).statusCode,409);
  }
  assert.ok(guided.messages.some((x:{text:string})=>x.text.includes('day 2 only')));
  const history=(await call('contributor','')).json();assert.ok(history.items.some((x:{id:string})=>x.id===guidedId));
  assert.equal((await call('second','/'+guidedId)).statusCode,404);
  const savedMapping=JSON.stringify(guided.mapping);const savedDirection=JSON.stringify(guided.plan);
  assert.equal((await call('contributor',`/${guidedId}/discuss`,{version:guided.version,task:'Explain why these references fit the studies.'})).statusCode,200);await tick();await tick();
  guided=(await call('contributor','/'+guidedId)).json();assert.equal(guided.state,'drafts_saved');assert.equal(JSON.stringify(guided.mapping),savedMapping);assert.equal(JSON.stringify(guided.plan),savedDirection);assert.equal(Number((await admin.query('SELECT count(*) FROM slots')).rows[0].count),existingCount+3);


  // Sending an unconfigured request creates only private discussion, never a study.
  const countBeforeChat=Number((await admin.query('SELECT count(*) FROM slots')).rows[0].count);
  const initialTask='Create a study for Wednesday next week about the life of Paul.';
  const chatKey=randomUUID();const conversation=await call('contributor','/chat',{task:initialTask},chatKey);assert.equal(conversation.statusCode,200,conversation.body);
  let chat=conversation.json();const chatId=chat.id;assert.equal(chat.seriesId,null);assert.equal(chat.plan,null);assert.equal(chat.messages[0].text,initialTask);
  assert.equal((await call('contributor','/chat',{task:initialTask},chatKey)).json().id,chatId);
  assert.equal((await call('member','/chat',{task:initialTask})).statusCode,403);
  await tick();chat=(await call('contributor','/'+chatId)).json();assert.equal(chat.state,'direction_review');assert.ok(chat.messages.at(-1).text.includes('Which audience'));assert.equal(chat.plan,null);
  assert.equal((await call('second','/'+chatId)).statusCode,404);assert.equal(Number((await admin.query('SELECT count(*) FROM slots')).rows[0].count),countBeforeChat);
  assert.equal((await call('contributor',`/${chatId}/discuss`,{version:chat.version,task:'Adults who are new to the Bible. Focus on his conversion.'})).statusCode,200);await tick();chat=(await call('contributor','/'+chatId)).json();assert.equal(chat.messages.length,4);
  failChat=true;await call('contributor',`/${chatId}/discuss`,{version:chat.version,task:'Please help clarify the next step.'});await tick();chat=(await call('contributor','/'+chatId)).json();assert.equal(chat.state,'failed');
  const failedCalls:number=calls;await tick();assert.equal(calls,failedCalls);
  failChat=false;const retried=await call('contributor',`/${chatId}/retry`,{version:chat.version});assert.equal(retried.statusCode,200,retried.body);await tick();chat=(await call('contributor','/'+chatId)).json();assert.equal(chat.state,'direction_review');assert.ok(chat.messages.at(-1).text.includes('Which audience'));
  assert.equal((await call('contributor',`/${chatId}/confirm`,{version:chat.version,planHash:'a'.repeat(64),sourceHash:chat.sourceHash,profileHash:chat.profileHash,confirmed:true})).statusCode,409);
  const configured=await call('contributor',`/${chatId}/setup`,{version:chat.version,seriesId:series,localTime:'08:00',sourceText:'Acts 9:1-19. Reviewed teaching notes about the conversion of Saul and his encounter with Jesus.',task:'Develop the study plan from this conversation.',reviewed:true,rightsConfirmed:true});assert.equal(configured.statusCode,200,configured.body);
  assert.equal(configured.json().id,chatId);assert.equal(configured.json().messages[0].text,initialTask);
  // Source attachment does not create calendar entries or bypass intent/day consent.
  assert.equal(Number((await admin.query('SELECT count(*) FROM slots')).rows[0].count),countBeforeChat);
  const budgetAfterChat=(await admin.query('SELECT reserved_tokens FROM provider_budgets WHERE church_id=$1',[graceId])).rows[0];assert.ok(budgetAfterChat.reserved_tokens>0);

  await call('contributor',`/${chatId}/cancel`,{version:configured.json().version});
  // A user's create instruction bridges supplied notes into a plan without menu setup.
  let bridge=(await call('contributor','/chat',{task:'Bridge: Create three devotional studies. John 6:68. These are my sermon summary notes about trust and questions.'})).json();await tick();bridge=(await call('contributor','/'+bridge.id)).json();
  const beforeSeries=Number((await admin.query('SELECT count(*) FROM series')).rows[0].count);
  assert.equal((await call('contributor',`/${bridge.id}/discuss`,{version:bridge.version,task:'Okay sounds great. Create these now.'})).statusCode,200);await tick();bridge=(await call('contributor','/'+bridge.id)).json();
  assert.ok(bridge.plan);assert.equal(bridge.seriesId,null);assert.equal(bridge.sourceReviewed,false);assert.equal(bridge.conversationSource,true);assert.ok(!bridge.sourceText.includes('Which audience'));
  assert.equal(Number((await admin.query('SELECT count(*) FROM series')).rows[0].count),beforeSeries);
  assert.equal((await call('contributor',`/${bridge.id}/intent`,{version:bridge.version,planHash:bridge.planHash,confirmed:true})).statusCode,422);
  bridge=(await call('contributor',`/${bridge.id}/intent`,{version:bridge.version,planHash:bridge.planHash,confirmed:true,reviewedSource:true})).json();assert.equal(bridge.sourceReviewed,true);
  bridge=(await call('contributor',`/${bridge.id}/plan`,{version:bridge.version,plan:bridge.plan})).json();
  const createdDay=await call('contributor',`/${bridge.id}/confirm`,{version:bridge.version,planHash:bridge.planHash,sourceHash:bridge.sourceHash,profileHash:bridge.profileHash,confirmed:true});assert.equal(createdDay.statusCode,200,createdDay.body);
  await tick();await tick();bridge=(await call('contributor','/'+bridge.id)).json();assert.equal(bridge.mapping.length,1);assert.ok(bridge.seriesId);assert.equal(Number((await admin.query('SELECT count(*) FROM series')).rows[0].count),beforeSeries+1);

});
