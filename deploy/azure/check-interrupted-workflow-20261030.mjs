// Isolated local PostgreSQL + real child-process termination. Never connects to production/Azure AI.
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {fork} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import pg from 'pg';
import {Database} from '../../backend/dist/src/infrastructure/database.js';
import {migrate} from '../../backend/dist/src/infrastructure/migrate.js';
import {seed,graceId,fixtureSeriesId} from '../../backend/dist/src/infrastructure/seed.js';
import {newWorkflow,workflowRun,retryWorkflow,runStudyWorkflows} from '../../backend/dist/src/modules/study-workflows.js';

const expectedDeployedModuleHash='1d8286830785f9ce2201c331827fc878d53014cb4beef767d1ac7424bb76cae4';
const moduleBytes=await readFile(new URL('../../backend/dist/src/modules/study-workflows.js',import.meta.url));
assert.equal(createHash('sha256').update(moduleBytes).digest('hex'),expectedDeployedModuleHash,'Workflow module differs from inspected deployed worker image');

function localOnly(text){
  const url=new URL(text);
  assert.ok(['127.0.0.1','localhost'].includes(url.hostname),'Only local PostgreSQL is allowed');
  assert.equal(url.port,'54329','Only the isolated development PostgreSQL port is allowed');
  return url;
}

if(process.argv[2]==='--worker'){
  const mode=process.argv[3];
  const url=localOnly(process.env.ROOTED_ACCEPTANCE_RUNTIME_URL);
  assert.match(url.pathname,/^\/gather_recovery_[a-f0-9]+$/);
  const database=new Database(url.toString());
  const model={apiKey:'fixture-only-not-a-provider-key',model:'gpt-5.6-luna',baseUrl:'https://fixture.openai.azure.com/openai/v1',fetch:async()=>{
    process.send?.({event:'provider-submit',mode});
    if(mode==='interrupt')return new Promise(()=>{});
    assert.equal(mode,'retry','Recovery must not automatically submit provider work');
    const value={reply:'A single fixture plan is ready for human review.',weekOffset:8,dayCount:1,theme:'Acceptance recovery',progression:'Reflect and practice',
      direction:{audience:'Adults',takeaway:'Take one faithful next step',depth:'Simple to intermediate',translation:'Reference only',illustrations:'An ordinary decision',application:'One faithful next step'},
      questions:[],assumptions:['One original fixture note'],days:[{weekday:1,title:'Recovery fixture',objective:'Reflect on the reviewed source',theme:'Trust',references:['John 6:68']}]};
    return Response.json({id:'fixture-retry-result',model:'gpt-5.6-luna',status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:50,output_tokens:20}});
  }};
  try{await database.assertRuntime();await runStudyWorkflows(database,()=>model);process.send?.({event:'worker-finished',mode});}
  finally{await database.close();}
  process.disconnect?.();
}else{
  const directory='research/Azure Deployment Research/advanced-acceptance-20261030';
  const report={scenario:'isolated real-process interrupted AI-job recovery',checkedAt:new Date().toISOString(),
    deployedImage:'rooted-backend:pilot-20261027-1',deployedWorkflowModuleSha256:expectedDeployedModuleHash,
    provider:'deterministic local fixture; no external AI requests',passed:false};
  const rootUrl=localOnly(process.env.TEST_MIGRATION_DATABASE_URL??'postgresql://postgres@127.0.0.1:54329/gather_test');
  const name='gather_recovery_'+randomUUID().replaceAll('-','');
  const root=new pg.Client({connectionString:rootUrl.toString()});
  const children=new Set();
  let admin,database,created=false;
  let submissions=0;
  async function startWorker(mode){
    const child=fork(fileURLToPath(import.meta.url),['--worker',mode],{
      env:{...process.env,NODE_ENV:'test',ROOTED_ACCEPTANCE_RUNTIME_URL:database.pool.options.connectionString},
      stdio:['ignore','ignore','ignore','ipc']
    });
    children.add(child);
    let submitted;
    const submission=new Promise(resolve=>{submitted=resolve;});
    child.on('message',message=>{if(message?.event==='provider-submit'){submissions++;submitted();}});
    const exit=new Promise((resolve,reject)=>{
      child.once('error',reject);child.once('exit',(code,signal)=>{children.delete(child);resolve({code,signal});});
    });
    return {child,submission,exit};
  }
  async function bounded(promise,milliseconds,label){
    let timer;
    try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label)),milliseconds);})]);}
    finally{clearTimeout(timer);}
  }
  try{
    await mkdir(directory,{recursive:true});
    await root.connect();await root.query(`CREATE DATABASE ${name}`);created=true;
    const migrationUrl=new URL(rootUrl);migrationUrl.pathname='/'+name;
    await migrate(migrationUrl.toString());await seed(migrationUrl.toString());
    admin=new pg.Client({connectionString:migrationUrl.toString()});await admin.connect();
    const runtimeUrl=new URL(migrationUrl);runtimeUrl.username='gather_runtime';runtimeUrl.password=process.env.RUNTIME_DATABASE_PASSWORD;
    assert.ok(runtimeUrl.password,'Local runtime password missing');
    database=new Database(runtimeUrl.toString());await database.assertRuntime();
    const slotsBefore=Number((await admin.query('SELECT count(*) AS n FROM slots')).rows[0].n);
    const publicationsBefore=Number((await admin.query('SELECT count(*) AS n FROM publications')).rows[0].n);
    const budgetBefore=(await admin.query('SELECT charged_tokens,reserved_tokens FROM provider_budgets WHERE church_id=$1',[graceId])).rows[0]??{charged_tokens:0,reserved_tokens:0};
    assert.equal(budgetBefore.reserved_tokens,0);
    const runId=await database.transaction(graceId,'contributor',(client,member)=>newWorkflow(client,member,graceId,{
      seriesId:fixtureSeriesId,assigneeId:'contributor',localTime:'08:00',
      task:'Create a one-day study eight weeks from now.',
      sourceText:'John 6:68. Original local acceptance fixture notes: bring honest questions to Jesus and take a thoughtful next step.'
    },new Date()));
    const running=await startWorker('interrupt');
    await bounded(running.submission,30000,'Fixture inference did not start');
    const claimed=(await admin.query('SELECT state,reservation,lease_until FROM study_workflow_jobs WHERE run_id=$1',[runId])).rows[0];
    assert.equal(claimed.state,'running');assert.ok(claimed.reservation>0);assert.equal(submissions,1);
    report.claimedReservation=claimed.reservation;
    const interruptedAt=Date.now();running.child.kill('SIGKILL');
    report.terminatedProcess=await bounded(running.exit,10000,'Interrupted child did not terminate');
    const wait=Number((await admin.query('SELECT greatest(0,extract(epoch FROM ($1::timestamptz-now()))*1000) AS milliseconds',[claimed.lease_until])).rows[0].milliseconds);
    assert.ok(wait<=125000,'Unexpected lease duration');
    console.log(`Actual child process terminated after claiming the job. Waiting ${Math.ceil(wait/1000)} seconds for its real lease to expire; no clock or database timestamp changes.`);
    await delay(Math.ceil(wait)+1000);
    for(let tick=0;tick<2;tick++){
      const recovered=await startWorker('recover');
      assert.equal((await bounded(recovered.exit,30000,'Recovery process did not finish')).code,0);
    }
    const recovered=(await admin.query('SELECT state,charged,reservation,lease_until FROM study_workflow_jobs WHERE run_id=$1',[runId])).rows[0];
    const run=(await admin.query('SELECT state,tokens_reserved,tokens_used FROM study_workflows WHERE id=$1',[runId])).rows[0];
    const budget=(await admin.query('SELECT charged_tokens,reserved_tokens FROM provider_budgets WHERE church_id=$1',[graceId])).rows[0];
    assert.equal(recovered.state,'submission_unknown');assert.equal(recovered.lease_until,null);
    assert.equal(recovered.charged,claimed.reservation);assert.equal(run.state,'failed');assert.equal(run.tokens_reserved,0);
    assert.equal(run.tokens_used,claimed.reservation);assert.equal(budget.reserved_tokens,0);
    assert.equal(budget.charged_tokens-budgetBefore.charged_tokens,claimed.reservation);
    assert.equal(submissions,1,'An uncertain call was submitted again automatically');
    report.recovery={jobState:recovered.state,workflowState:run.state,reservedTokens:budget.reserved_tokens,
      conservativeCharge:recovered.charged,automaticResubmissions:submissions-1,repeatedRecoveryTicks:2,
      secondsAfterInterruption:Math.round((Date.now()-interruptedAt)/1000)};
    await database.transaction(graceId,'contributor',async(client,member)=>{
      const current=await workflowRun(client,graceId,runId);await retryWorkflow(client,member,current);
    });
    const retry=await startWorker('retry');assert.equal((await bounded(retry.exit,30000,'Explicit retry did not finish')).code,0);
    const finalRun=(await admin.query('SELECT state,tokens_reserved,tokens_used,attempts FROM study_workflows WHERE id=$1',[runId])).rows[0];
    const jobs=(await admin.query('SELECT state,charged FROM study_workflow_jobs WHERE run_id=$1 ORDER BY created_at,id',[runId])).rows;
    const finalBudget=(await admin.query('SELECT charged_tokens,reserved_tokens FROM provider_budgets WHERE church_id=$1',[graceId])).rows[0];
    assert.equal(finalRun.state,'direction_review');assert.equal(finalRun.attempts,2);assert.equal(finalRun.tokens_reserved,0);
    assert.equal(submissions,2);assert.equal(jobs.length,2);assert.equal(jobs.filter(job=>job.state==='completed').length,1);
    assert.equal(finalBudget.reserved_tokens,0);assert.equal(finalBudget.charged_tokens-budgetBefore.charged_tokens,claimed.reservation+70);
    assert.equal(Number((await admin.query('SELECT count(*) AS n FROM slots')).rows[0].n),slotsBefore);
    assert.equal(Number((await admin.query('SELECT count(*) AS n FROM publications')).rows[0].n),publicationsBefore);
    report.explicitRetry={workflowState:finalRun.state,attempts:finalRun.attempts,completedJobs:1,providerSubmissions:submissions,
      reservedTokens:finalBudget.reserved_tokens,chargedDelta:finalBudget.charged_tokens-budgetBefore.charged_tokens,
      duplicateDrafts:0,duplicatePublications:0};
    report.passed=true;report.completedAt=new Date().toISOString();
  }catch(error){report.errorType=error.name;report.errorMessage=error.message;process.exitCode=1;}
  finally{
    for(const child of children)child.kill('SIGKILL');
    await database?.close();await admin?.end();
    if(created){assert.match(name,/^gather_recovery_[a-f0-9]+$/);await root.query(`DROP DATABASE ${name} WITH (FORCE)`);}
    await root.end();
    await mkdir(directory,{recursive:true});await writeFile(directory+'/interrupted-workflow.json',JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report));
  }
}
