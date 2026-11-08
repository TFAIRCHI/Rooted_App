import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { Database, requireCapability, type Membership } from '../infrastructure/database.js';
import { demand } from '../api/errors.js';
import { audit, createContent, loadAggregate } from './editorial.js';
import { saveRevision } from './save-revision.js';
import { blankPlan, canonical, hash, insertRevision } from './revisions.js';
import { demoProfile, transcriptText } from '../integrations/cowriter.js';
import { studyWorkflowConfig } from '../integrations/workflow-runtime.js';
import { prepareWorkflowRequest, sourceReferences, validateCompleteDay, validateWorkflowPlan, weekSunday, WorkflowModel, type WorkflowModelRequest, type WorkflowModelResult } from '../integrations/study-workflow.js';
import type { WorkflowPlan, WorkflowSummary } from '../../contracts/study-workflow.js';
import type { OpenAIConfig } from '../integrations/ai.js';
import { resolveCivilTime } from '../integrations/time.js';

export interface WorkflowRow {
  sequential:boolean;intent_confirmed:boolean;conversation_source:boolean;source_reviewed:boolean;
  church_id:string;id:string;actor_id:string;series_id:string|null;assignee_id:string;time_zone:string;local_time:string;
  state:WorkflowSummary['state'];version:number;source_id:string;source_hash:string;profile:string;profile_hash:string;
  reference_sunday:string|Date;plan:WorkflowPlan|null;messages:{role:'user'|'assistant';text:string}[];
  confirmation:{planHash:string;sourceHash:string;profileHash:string;version:number;actorId:string;at:string}|null;
  mapping:WorkflowSummary['mapping'];tokens_used:number;tokens_reserved:number;attempts:number;error:string|null;expires_at:Date;
}
interface SourceRow {id:string;text:string;sha256:string;allowed_references:string[];library_source_id:string|null;library_hash:string|null}
interface JobRow {church_id:string;id:string;run_id:string;actor_id:string;kind:'plan'|'day';local_date:string|null;run_version:number;prepared:WorkflowModelRequest;reservation:number;period:string;state:string;result:WorkflowModelResult|null}
export type WorkflowRuntime=()=>OpenAIConfig;
function pendingPlan(run:WorkflowRow,plan:WorkflowPlan):WorkflowPlan {
  return run.sequential?{...plan,days:plan.days.slice(run.mapping.length)}:plan;
}
function assertGuidedPlan(run:WorkflowRow,plan:WorkflowPlan) {
  if(!run.sequential||!run.intent_confirmed||!run.plan)return;
  demand(plan.days.length===run.plan.days.length&&plan.weekStart===run.plan.weekStart,409,'intent_changed','The confirmed day count or week changed. Start a new conversation to change the request.');
  for(let index=0;index<run.plan.days.length;index++)if(index!==run.mapping.length){
    demand(canonical(plan.days[index])===canonical(run.plan.days[index]),409,'day_scope_changed','Only the current day can be adjusted. Other days retain their own review step.');
  }
}
export async function confirmIntent(client:PoolClient,member:Membership,run:WorkflowRow,planHash:string,reviewedSource=false) {
  workflowPermission(member);
  demand(run.sequential&&!run.intent_confirmed&&run.state==='direction_review'&&run.plan,409,'intent_unavailable','Wait for the request understanding before confirming it');
  demand(planHash===hash(canonical(run.plan)),409,'intent_stale','Review the latest request understanding');
  demand(!run.conversation_source||run.source_reviewed||reviewedSource,422,'source_review_required','Review the conversation notes and confirm permission to use them before agreeing to the plan');
  await boundSource(client,run);
  const day=run.plan.days[0]!;
  await client.query("UPDATE study_workflows SET intent_confirmed=true,source_reviewed=true,version=version+1,messages=messages||$3::jsonb,updated_at=now() WHERE church_id=$1 AND id=$2",[run.church_id,run.id,JSON.stringify([{role:'user',text:'I confirm this understanding of my request.'},{role:'assistant',text:`Let us develop day 1 (${day.date}): ${day.title}. ${day.objective} References: ${day.references.join(', ')}. Please review the teaching details or tell me what to adjust. I will only create this day after your explicit confirmation.`}])]);
}
export function workflowPermission(member:Membership) {
  for(const cap of ['workspace:read','ai:use','series:manage','plans:edit','content:edit'])requireCapability(member,cap);
}
export async function workflowRun(client:PoolClient,churchId:string,id:string):Promise<WorkflowRow> {
  const row=(await client.query('SELECT *,reference_sunday::text AS reference_sunday FROM study_workflows WHERE church_id=$1 AND id=$2 AND expires_at>now() AND state<>\'erased\' FOR UPDATE',[churchId,id])).rows[0];
  demand(row,404,'workflow_not_found','Workflow unavailable, expired, or private to another contributor');return row;
}
export async function workflowView(client:PoolClient,run:WorkflowRow):Promise<WorkflowSummary> {
  const source=(await client.query('SELECT text FROM study_workflow_sources WHERE church_id=$1 AND id=$2',[run.church_id,run.source_id])).rows[0];
  const jobs=(await client.query('SELECT id,kind,local_date::text AS date,state,error,usage FROM study_workflow_jobs WHERE church_id=$1 AND run_id=$2 ORDER BY created_at,id',[run.church_id,run.id])).rows;
  return {conversationSource:run.conversation_source,sourceReviewed:run.source_reviewed,sequential:run.sequential,intentConfirmed:run.intent_confirmed,id:run.id,state:run.state,version:run.version,sourceHash:run.source_hash,profileHash:run.profile_hash,planHash:run.plan?hash(canonical(run.plan)):null,seriesId:run.series_id,assigneeId:run.assignee_id,localTime:run.local_time,timeZone:run.time_zone,plan:run.plan,sourceId:run.source_id,sourceText:source?.text??'',messages:run.messages,jobs,mapping:run.mapping,tokensUsed:run.tokens_used,tokensReserved:run.tokens_reserved,attempts:run.attempts,error:run.error,expiresAt:run.expires_at.toISOString()};
}
export async function profileSnapshot(client:PoolClient,churchId:string) {
  const budget=(await client.query('SELECT * FROM provider_budgets WHERE church_id=$1',[churchId])).rows[0];
  const profile=budget?.rights_confirmed?budget.profile:demoProfile;
  return {profile,hash:hash(canonical({profile,version:budget?.rights_confirmed?budget.profile_version:'demo-collaborator-v1'}))};
}
async function boundSource(client:PoolClient,run:WorkflowRow):Promise<SourceRow> {
  const source=(await client.query('SELECT * FROM study_workflow_sources WHERE church_id=$1 AND id=$2 AND run_id=$3',[run.church_id,run.source_id,run.id])).rows[0] as SourceRow;
  demand(source&&hash(source.text)===run.source_hash&&source.sha256===run.source_hash,409,'source_changed','Reviewed workflow source is unavailable or changed');
  if(source.library_source_id){
    const original=(await client.query('SELECT s.payload,s.rights FROM sources s JOIN provider_source_reviews r ON r.church_id=s.church_id AND r.source_id=s.id WHERE s.church_id=$1 AND s.id=$2',[run.church_id,source.library_source_id])).rows[0];
    demand(original?.rights.confirmed&&hash(canonical(original.payload))===source.library_hash,409,'source_changed','The library source changed or lost review/rights. Start a fresh workflow.');
  }
  const current=await profileSnapshot(client,run.church_id);demand(current.hash===run.profile_hash,409,'profile_changed','Church teaching profile changed. Revise the plan to review the new direction.');
  demand((await client.query("SELECT 1 FROM memberships WHERE church_id=$1 AND user_id=$2 AND active AND 'plans:edit'=ANY(capabilities) AND 'content:edit'=ANY(capabilities)",[run.church_id,run.assignee_id])).rowCount,409,'assignment_changed','The confirmed contributor is no longer eligible');
  return source;
}
export async function assertDatesFree(client:PoolClient,run:WorkflowRow,plan:WorkflowPlan,lock=false) {
  for(const day of [...plan.days].sort((a,b)=>a.date.localeCompare(b.date))){
    resolveCivilTime({localDate:day.date,localTime:run.local_time,zone:run.time_zone});
    if(lock)await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`study-date:${run.church_id}:${day.date}`]);
    demand(!(await client.query('SELECT 1 FROM slots WHERE church_id=$1 AND local_date=$2 AND deleted_at IS NULL AND withdrawn_at IS NULL',[run.church_id,day.date])).rowCount,409,'date_conflict',`A study already occupies ${day.date}. Choose another date; existing work will not be replaced.`);
  }
}
export async function newWorkflow(client:PoolClient,member:Membership,churchId:string,input:{seriesId?:string;assigneeId:string;localTime:string;task:string;sourceText?:string;librarySourceId?:string;clarificationOnly?:boolean},now:Date) {
  workflowPermission(member);demand(input.assigneeId===member.userId,403,'workflow_assignee','This first release creates drafts assigned to you.');
  const church=(await client.query('SELECT time_zone FROM churches WHERE id=$1',[churchId])).rows[0];
  if(!input.clarificationOnly)demand((await client.query('SELECT 1 FROM series WHERE church_id=$1 AND id=$2',[churchId,input.seriesId])).rowCount,404,'series_not_found','Choose an existing study series');
  let sourceText=input.sourceText??'';let libraryHash:string|null=null;
  if(input.librarySourceId){
    const source=(await client.query('SELECT s.payload,s.rights FROM sources s JOIN provider_source_reviews r ON r.church_id=s.church_id AND r.source_id=s.id WHERE s.church_id=$1 AND s.id=$2',[churchId,input.librarySourceId])).rows[0];
    demand(source?.rights.confirmed&&Array.isArray(source.payload.spans),422,'reviewed_source_required','Choose a church-owned reviewed source with confirmed rights');
    sourceText=source.payload.spans.map((span:{text:string})=>span.text).join('\n');libraryHash=hash(canonical(source.payload));
  }
  sourceText=input.clarificationOnly?'':transcriptText(sourceText);const refs=sourceReferences(sourceText);
  demand(input.clarificationOnly||refs.length,422,'source_passage_required','Add the sermon passage reference to the reviewed outline before planning; references will not be invented.');
  await client.query("INSERT INTO provider_budgets(church_id,monthly_limit,period,profile,profile_version) VALUES($1,200000,to_char(now() AT TIME ZONE 'UTC','YYYY-MM'),$2,'demo-collaborator-v1') ON CONFLICT DO NOTHING",[churchId,demoProfile]);
  const profile=await profileSnapshot(client,churchId);const id=randomUUID(),sourceId=randomUUID();
  await client.query('INSERT INTO study_workflows(church_id,id,actor_id,series_id,assignee_id,time_zone,local_time,source_id,source_hash,profile,profile_hash,reference_sunday,sequential) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true)',[churchId,id,member.userId,input.seriesId??null,input.assigneeId,church.time_zone,input.localTime,sourceId,hash(sourceText),profile.profile,profile.hash,weekSunday(now,church.time_zone)]);
  await client.query('INSERT INTO study_workflow_sources(church_id,id,run_id,actor_id,text,sha256,allowed_references,library_source_id,library_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[churchId,sourceId,id,member.userId,sourceText,hash(sourceText),JSON.stringify(refs),input.librarySourceId??null,libraryHash]);
  const run=await workflowRun(client,churchId,id);await queuePlan(client,member,run,input.task);
  await audit(client,churchId,member.userId,'workflow.created',id,{sourceHash:run.source_hash});return id;
}
async function reserveJobs(client:PoolClient,run:WorkflowRow,prepared:{date:string|null;kind:'plan'|'day';request:WorkflowModelRequest}[]) {
  const amount=prepared.reduce((sum,item)=>sum+item.request.reservation,0);
  const pending=Number((await client.query("SELECT count(*) FROM study_workflow_jobs WHERE church_id=$1 AND run_id=$2 AND state IN ('pending','running')",[run.church_id,run.id])).rows[0].count);
  demand(run.attempts+pending+prepared.length<=12&&run.tokens_used+run.tokens_reserved+amount<=100000,422,'workflow_budget','This workflow exceeds its 12-attempt or 100,000-token ceiling. Reduce the source or number of days.');
  const budget=(await client.query('SELECT *,to_char(now() AT TIME ZONE \'UTC\',\'YYYY-MM\') AS current_period FROM provider_budgets WHERE church_id=$1 FOR UPDATE',[run.church_id])).rows[0];
  demand(budget,422,'budget_required','Church usage allowance is unavailable');
  demand(budget.period===budget.current_period||budget.reserved_tokens===0,409,'budget_rollover','Prior reservations must be reconciled first');
  const charged=budget.period===budget.current_period?budget.charged_tokens:0;
  demand(charged+budget.reserved_tokens+amount<=budget.monthly_limit,422,'budget_exceeded','The church monthly token allowance cannot cover this workflow. Reduce its scope.');
  await client.query('UPDATE provider_budgets SET period=$2,charged_tokens=$3,reserved_tokens=reserved_tokens+$4 WHERE church_id=$1',[run.church_id,budget.current_period,charged,amount]);
  await client.query('UPDATE study_workflows SET tokens_reserved=tokens_reserved+$3 WHERE church_id=$1 AND id=$2',[run.church_id,run.id,amount]);
  for(const item of prepared)await client.query("INSERT INTO study_workflow_jobs(church_id,id,run_id,actor_id,kind,local_date,run_version,state,prepared,reservation,period) VALUES($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10)",[run.church_id,randomUUID(),run.id,run.actor_id,item.kind,item.date,run.version,JSON.stringify(item.request),item.request.reservation,budget.current_period]);
}
export async function configureWorkflow(client:PoolClient,member:Membership,run:WorkflowRow,input:{seriesId:string;localTime:string;task?:string;sourceText?:string;librarySourceId?:string}) {
  workflowPermission(member);
  demand(!run.plan&&!run.intent_confirmed&&!run.mapping.length&&['direction_review','failed','canceled','paused_conflict'].includes(run.state),409,'setup_unavailable','Wait for the current reply before adding planning details');
  demand(!(await client.query("SELECT 1 FROM study_workflow_jobs WHERE church_id=$1 AND run_id=$2 AND state IN ('pending','running')",[run.church_id,run.id])).rowCount,409,'workflow_busy','Wait for the current reply');
  demand((await client.query('SELECT 1 FROM series WHERE church_id=$1 AND id=$2',[run.church_id,input.seriesId])).rowCount,404,'series_not_found','Choose an existing study series');
  let text=input.sourceText??'',libraryHash:string|null=null;
  if(input.librarySourceId){
    const source=(await client.query('SELECT s.payload,s.rights FROM sources s JOIN provider_source_reviews r ON r.church_id=s.church_id AND r.source_id=s.id WHERE s.church_id=$1 AND s.id=$2',[run.church_id,input.librarySourceId])).rows[0];
    demand(source?.rights.confirmed&&Array.isArray(source.payload.spans),422,'reviewed_source_required','Choose a reviewed source with confirmed rights');
    text=source.payload.spans.map((span:{text:string})=>span.text).join('\n');libraryHash=hash(canonical(source.payload));
  }
  text=transcriptText(text);const refs=sourceReferences(text);demand(refs.length,422,'source_passage_required','Include the passage reference in the reviewed source');
  const id=randomUUID();
  await client.query('INSERT INTO study_workflow_sources(church_id,id,run_id,actor_id,text,sha256,allowed_references,library_source_id,library_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[run.church_id,id,run.id,member.userId,text,hash(text),JSON.stringify(refs),input.librarySourceId??null,libraryHash]);
  await client.query('UPDATE study_workflows SET series_id=$3,local_time=$4,source_id=$5,source_hash=$6,version=version+1,confirmation=NULL WHERE church_id=$1 AND id=$2',[run.church_id,run.id,input.seriesId,input.localTime,id,hash(text)]);
  const current=await workflowRun(client,run.church_id,run.id);
  await queuePlan(client,member,current,input.task?.trim()||'Develop the study plan requested in this conversation using the newly reviewed source. Preserve the requested day count, dates and agreed teaching direction.');
}
async function releasePending(client:PoolClient,run:WorkflowRow) {
  const jobs=await client.query("UPDATE study_workflow_jobs SET state='canceled',prepared='{}',finished_at=now() WHERE church_id=$1 AND run_id=$2 AND state='pending' RETURNING reservation,period",[run.church_id,run.id]);
  for(const job of jobs.rows){await client.query('UPDATE provider_budgets SET reserved_tokens=reserved_tokens-$3 WHERE church_id=$1 AND period=$2 AND reserved_tokens>=$3',[run.church_id,job.period,job.reservation]);await client.query('UPDATE study_workflows SET tokens_reserved=tokens_reserved-$3 WHERE church_id=$1 AND id=$2',[run.church_id,run.id,job.reservation]);}
}
export function requestsStudyCreation(task:string) {
  return /\b(?:create|build|generate|prepare)\s+(?:(?:these|those|the|our|my|all|three|3)\s+)*(?:studies|devotionals|drafts|plan|now|them)\b/i.test(task);
}
async function bindConversationNotes(client:PoolClient,run:WorkflowRow,task:string) {
  const notes=[...run.messages.filter(message=>message.role==='user').map(message=>message.text),task].join('\n\n');
  const references=sourceReferences(notes);
  demand(references.length,422,'conversation_passage_required','Which Scripture passage should anchor the study? Add its reference to this conversation before preparing the plan.');
  const text=transcriptText(notes),id=randomUUID();
  await client.query('INSERT INTO study_workflow_sources(church_id,id,run_id,actor_id,text,sha256,allowed_references) VALUES($1,$2,$3,$4,$5,$6,$7)',[run.church_id,id,run.id,run.actor_id,text,hash(text),JSON.stringify(references)]);
  await client.query('UPDATE study_workflows SET source_id=$3,source_hash=$4,conversation_source=true,source_reviewed=false WHERE church_id=$1 AND id=$2',[run.church_id,run.id,id,hash(text)]);
  run.source_id=id;run.source_hash=hash(text);run.conversation_source=true;run.source_reviewed=false;
}
export async function prepareConversationPlan(client:PoolClient,member:Membership,run:WorkflowRow) {
  workflowPermission(member);
  demand(!run.plan&&!['plan_queued','planning','queued','generating','drafts_saved'].includes(run.state),409,'workflow_busy','Wait for the reply before preparing the plan');
  await queuePlan(client,member,run,'Prepare the agreed study plan from this conversation. Preserve the latest user corrections to dates, audience, length and topics.',true);
}
export async function queuePlan(client:PoolClient,member:Membership,run:WorkflowRow,task:string,prepareConversation=false) {
  workflowPermission(member);demand(!['plan_queued','planning','queued','generating'].includes(run.state)||run.messages.length===0,409,'workflow_busy','Wait or cancel before changing direction');
  const conversationOnly=!!run.plan&&run.mapping.length===run.plan.days.length;
  demand(!(await client.query("SELECT 1 FROM study_workflow_jobs WHERE church_id=$1 AND run_id=$2 AND state='running'",[run.church_id,run.id])).rowCount,409,'workflow_busy','Wait for the submitted call to finish before revising');
  // Reviewing a new profile is explicit through this fresh plan proposal.
  const profile=await profileSnapshot(client,run.church_id);
  await client.query('UPDATE study_workflows SET profile=$3,profile_hash=$4 WHERE church_id=$1 AND id=$2',[run.church_id,run.id,profile.profile,profile.hash]);run.profile=profile.profile;run.profile_hash=profile.hash;
  if(!run.plan&&!run.conversation_source&&!run.series_id&&(prepareConversation||(run.messages.length>0&&requestsStudyCreation(task)&&sourceReferences(run.messages.filter(message=>message.role==='user').map(message=>message.text).join('\n')+'\n'+task).length>0)))await bindConversationNotes(client,run,task);
  const source=await boundSource(client,run);
  await releasePending(client,run);run.tokens_reserved=0;
  const scopedTask=conversationOnly?`Answer this question about the saved studies. This is conversation only: preserve the entire supplied plan and never claim to create, edit, approve or publish anything. ${task}`:run.sequential&&run.intent_confirmed?`Discuss and revise ONLY day ${run.mapping.length+1}. Preserve the number of days and all other day plans exactly. Respond to this feedback in the revised objective/direction or questions: ${task}`:task;
  const request=prepareWorkflowRequest({kind:'plan',originalRequest:run.conversation_source?(run.messages.find(message=>message.role==='user')?.text.split('\n')[0]??task):(run.messages.find(message=>message.role==='user')?.text??task),clarificationOnly:(!run.series_id&&!run.conversation_source)||!source.allowed_references.length,conversationOnly,task:scopedTask,sourceId:source.id,sourceText:source.text,allowedReferences:source.allowed_references,profile:run.profile,timeZone:run.time_zone,referenceSunday:String(run.reference_sunday),plan:run.plan,date:null,history:run.conversation_source?run.messages.slice(-8).map((message,index)=>({role:message.role,text:message.role==='user'?(index===0?'Original user notes and requirements are provided in sourceText.':message.text):(message.text.length>1000?message.text.slice(0,650)+'\n[Earlier reply shortened]\n'+message.text.slice(-300):message.text)})):run.messages.slice(-8)});
  await reserveJobs(client,run,[{kind:'plan',date:null,request}]);
  await client.query("UPDATE study_workflows SET state='plan_queued',confirmation=NULL,error=NULL,messages=messages||$3::jsonb,updated_at=now() WHERE church_id=$1 AND id=$2",[run.church_id,run.id,JSON.stringify([{role:'user',text:task}])]);
}
export async function reviewPlan(client:PoolClient,member:Membership,run:WorkflowRow,plan:WorkflowPlan) {
  workflowPermission(member);demand(['direction_review','awaiting_generation_confirmation','failed','canceled','paused_conflict'].includes(run.state),409,'workflow_state','Wait or cancel before changing the plan');
  demand(!(await client.query("SELECT 1 FROM study_workflow_jobs WHERE church_id=$1 AND run_id=$2 AND state='running'",[run.church_id,run.id])).rowCount,409,'workflow_busy','A submitted call is still running');
  demand(!run.sequential||run.intent_confirmed,409,'intent_required','Confirm the request understanding before reviewing a day');
  assertGuidedPlan(run,plan);
  const source=await boundSource(client,run);validateWorkflowPlan(plan,source.allowed_references,run.time_zone);await assertDatesFree(client,run,pendingPlan(run,plan));
  await releasePending(client,run);
  if(run.sequential)await client.query('UPDATE study_workflows SET messages=messages||$3::jsonb WHERE church_id=$1 AND id=$2',[run.church_id,run.id,JSON.stringify([{role:'user',text:`Reviewed day ${run.mapping.length+1}: ${plan.days[run.mapping.length]!.title} (${plan.days[run.mapping.length]!.date}). Objective: ${plan.days[run.mapping.length]!.objective}. References: ${plan.days[run.mapping.length]!.references.join(', ')}. Audience: ${plan.direction.audience}. Takeaway: ${plan.direction.takeaway}. Depth: ${plan.direction.depth}. Translation: ${plan.direction.translation}. Illustrations: ${plan.direction.illustrations}. Application: ${plan.direction.application}.`},{role:'assistant',text:`Please confirm creation of day ${run.mapping.length+1} only. The remaining days will wait for their own review and confirmation.`}])]);
  const version=run.version+1;
  await client.query('INSERT INTO study_workflow_plans(church_id,id,run_id,actor_id,version,payload,sha256) VALUES($1,$2,$3,$4,$5,$6,$7)',[run.church_id,randomUUID(),run.id,member.userId,version,JSON.stringify(plan),hash(canonical(plan))]);
  await client.query("UPDATE study_workflows SET state='awaiting_generation_confirmation',version=$3,plan=$4,confirmation=NULL,error=NULL,updated_at=now() WHERE church_id=$1 AND id=$2",[run.church_id,run.id,version,JSON.stringify(plan)]);
}
export async function confirmWorkflow(client:PoolClient,member:Membership,run:WorkflowRow,input:{planHash:string;sourceHash:string;profileHash:string}) {
  workflowPermission(member);demand(run.source_reviewed,422,'source_review_required','Review and confirm the conversation notes before creating studies');demand(run.state==='awaiting_generation_confirmation'&&run.plan,409,'direction_required','Review and save the direction before generating');
  demand(input.planHash===hash(canonical(run.plan))&&input.sourceHash===run.source_hash&&input.profileHash===run.profile_hash,409,'confirmation_stale','The plan, source or teaching profile changed. Review the current version.');
  const source=await boundSource(client,run);await assertDatesFree(client,run,pendingPlan(run,run.plan));
  demand(!run.sequential||run.intent_confirmed,409,'intent_required','Confirm your request first');
  const targets=run.sequential?run.plan.days.slice(run.mapping.length,run.mapping.length+1):run.plan.days;
  demand(targets.length>0,409,'workflow_complete','No remaining day to create');
  const jobs=targets.map(day=>({date:day.date,kind:'day' as const,request:prepareWorkflowRequest({kind:'day',task:`Write the complete study for ${day.date}. Objective: ${day.objective}`,sourceId:source.id,sourceText:source.text,allowedReferences:day.references,profile:run.profile,timeZone:run.time_zone,referenceSunday:String(run.reference_sunday),plan:run.plan,date:day.date,history:[]},3000)}));
  await reserveJobs(client,run,jobs);
  await client.query("UPDATE study_workflows SET state='queued',confirmation=$3,error=NULL,updated_at=now() WHERE church_id=$1 AND id=$2",[run.church_id,run.id,JSON.stringify({...input,version:run.version,actorId:member.userId,at:new Date().toISOString()})]);
  if(run.sequential)await client.query('UPDATE study_workflows SET messages=messages||$3::jsonb WHERE church_id=$1 AND id=$2',[run.church_id,run.id,JSON.stringify([{role:'user',text:`I confirm the reviewed plan and authorize creating day ${run.mapping.length+1} only: ${targets[0]!.date}.`}])]);
  await audit(client,run.church_id,member.userId,'workflow.generation_confirmed',run.id,{planHash:input.planHash,dates:targets.map(day=>day.date)});
}
export async function cancelWorkflow(client:PoolClient,member:Membership,run:WorkflowRow) {
  workflowPermission(member);if(run.state==='drafts_saved')return;
  await releasePending(client,run);
  await client.query("UPDATE study_workflows SET state='canceled',confirmation=NULL,error=NULL,updated_at=now() WHERE church_id=$1 AND id=$2",[run.church_id,run.id]);
}
export async function retryWorkflow(client:PoolClient,member:Membership,run:WorkflowRow) {
  if(['failed','paused_conflict'].includes(run.state)&&!run.plan&&!run.confirmation){
    const message=run.messages.findLast(item=>item.role==='user');demand(message,409,'retry_unavailable','Send a message to begin the conversation');
    await queuePlan(client,member,run,message.text);return;
  }
  workflowPermission(member);demand(['failed','paused_conflict'].includes(run.state)&&run.confirmation&&run.plan,409,'retry_unavailable','Revise and reconfirm the plan when direction or dates changed');
  await boundSource(client,run);await assertDatesFree(client,run,pendingPlan(run,run.plan));
  demand(!(await client.query("SELECT 1 FROM study_workflow_jobs WHERE church_id=$1 AND run_id=$2 AND state IN ('pending','running')",[run.church_id,run.id])).rowCount,409,'workflow_busy','Work is already pending');
  const existing=(await client.query("SELECT DISTINCT ON (j.local_date) j.*,j.local_date::text AS local_date FROM study_workflow_jobs j WHERE church_id=$1 AND run_id=$2 AND kind='day' AND run_version=$3 ORDER BY j.local_date,j.created_at DESC,j.id DESC",[run.church_id,run.id,run.version])).rows as JobRow[];
  const source=await boundSource(client,run);
  const targets=run.sequential?run.plan.days.slice(run.mapping.length,run.mapping.length+1):run.plan.days;
  const pending=targets.filter(day=>!existing.some(job=>job.local_date===day.date&&job.state==='completed')).map(day=>({date:day.date,kind:'day' as const,request:prepareWorkflowRequest({kind:'day',task:`Write the complete study for ${day.date}. Objective: ${day.objective}`,sourceId:source.id,sourceText:source.text,allowedReferences:day.references,profile:run.profile,timeZone:run.time_zone,referenceSunday:String(run.reference_sunday),plan:run.plan,date:day.date,history:[]},3000)}));
  if(pending.length)await reserveJobs(client,run,pending);
  await client.query("UPDATE study_workflows SET state='queued',error=NULL,updated_at=now() WHERE church_id=$1 AND id=$2",[run.church_id,run.id]);
}

async function commitDrafts(client:PoolClient,member:Membership,run:WorkflowRow) {
  const authority=(await client.query('SELECT capabilities,active FROM memberships WHERE church_id=$1 AND user_id=$2 FOR SHARE',[run.church_id,member.userId])).rows[0];
  demand(authority?.active,403,'workflow_authority','Your church access changed before saving');workflowPermission({userId:member.userId,capabilities:authority.capabilities});
  await client.query('SELECT church_id FROM provider_budgets WHERE church_id=$1 FOR SHARE',[run.church_id]);
  demand(run.plan&&run.confirmation&&run.confirmation.version===run.version&&run.confirmation.planHash===hash(canonical(run.plan))&&run.confirmation.sourceHash===run.source_hash&&run.confirmation.profileHash===run.profile_hash,409,'confirmation_stale','Confirmation no longer matches the plan');
  const source=await boundSource(client,run);await assertDatesFree(client,run,pendingPlan(run,run.plan),true);
  const jobs=(await client.query("SELECT DISTINCT ON (j.local_date) j.*,j.local_date::text AS local_date FROM study_workflow_jobs j WHERE church_id=$1 AND run_id=$2 AND kind='day' AND run_version=$3 ORDER BY j.local_date,j.created_at DESC,j.id DESC",[run.church_id,run.id,run.version])).rows as JobRow[];
  const targets=run.sequential?run.plan.days.slice(run.mapping.length,run.mapping.length+1):run.plan.days;
  demand(jobs.length===targets.length&&jobs.every(job=>job.state==='completed'&&job.result),409,'incomplete_batch','Every day must be complete before saving');
  if(!run.series_id){
    demand(run.conversation_source&&run.source_reviewed,409,'series_required','A reviewed conversation plan is required to create a new study series');
    const seriesId=randomUUID();await client.query('INSERT INTO series(church_id,id,title,week_anchor,time_zone) VALUES($1,$2,$3,$4,$5)',[run.church_id,seriesId,run.plan.theme,run.plan.days[0]!.date,run.time_zone]);
    await client.query('UPDATE study_workflows SET series_id=$3 WHERE church_id=$1 AND id=$2',[run.church_id,run.id,seriesId]);run.series_id=seriesId;
  }
  const mapping:WorkflowSummary['mapping']=[...run.mapping];
  for(const day of targets){
    const proposal=validateCompleteDay(jobs.find(job=>job.local_date===day.date)!.result!.value,day.date,source.id,day.references);
    const slotId=randomUUID(),planId=randomUUID();
    await client.query('INSERT INTO slots(church_id,id,series_id,local_date,local_time,time_zone,assignee_ids) VALUES($1,$2,$3,$4,$5,$6,$7)',[run.church_id,slotId,run.series_id,day.date,run.local_time,run.time_zone,[run.assignee_id]]);
    await client.query("INSERT INTO aggregates(church_id,id,kind,slot_id) VALUES($1,$2,'plan',$3)",[run.church_id,planId,slotId]);
    const snapshot=[{id:source.id,kind:'workflow_outline',payloadHash:source.sha256,workflowId:run.id,planHash:run.confirmation.planHash,rights:{confirmed:true,attestedBy:run.actor_id}}];
    const calendar={localDate:day.date,localTime:run.local_time,timeZone:run.time_zone};
    const planRevision=await insertRevision(client,{churchId:run.church_id,aggregateId:planId,kind:'plan',number:1,authorId:member.userId,payload:{...blankPlan(),title:day.title,primaryScripture:{reference:day.references[0],translation:run.plan.direction.translation},learningObjective:day.objective,outline:[day.theme],discussionQuestion:proposal.content.discussionQuestion},calendar,sourceSnapshot:snapshot});
    await client.query('UPDATE aggregates SET head_revision_id=$3 WHERE church_id=$1 AND id=$2',[run.church_id,planId,planRevision]);
    const created=await createContent(client,await loadAggregate(client,run.church_id,planId),member);
    const saved=await saveRevision(client,await loadAggregate(client,run.church_id,created.id),member,{baseRevisionId:created.headRevisionId,payload:proposal.content,sourceSnapshot:snapshot});
    mapping.push({date:day.date,slotId,planId,contentId:saved.id,revisionId:saved.headRevisionId});
  }
  const done=mapping.length===run.plan.days.length;
  const message=done?'All confirmed study days are saved.':`Day ${mapping.length} is saved. Let us review day ${mapping.length+1}. Nothing else will be created until you confirm that day.`;
  await client.query("UPDATE study_workflows SET state=$4,mapping=$3,confirmation=NULL,version=version+1,messages=messages||$5::jsonb,error=NULL,updated_at=now() WHERE church_id=$1 AND id=$2",[run.church_id,run.id,JSON.stringify(mapping),done?'drafts_saved':'direction_review',JSON.stringify([{role:'assistant',text:message}])]);
  await audit(client,run.church_id,member.userId,'workflow.drafts_saved',run.id,{dates:mapping.map(day=>day.date),sourceHash:run.source_hash,planHash:run.confirmation.planHash});
}
async function actorTransaction<T>(database:Database,churchId:string,actorId:string,action:(client:PoolClient)=>Promise<T>) {
  const client=await database.pool.connect();try{await client.query('BEGIN');await client.query("SELECT set_config('app.church_id',$1,true),set_config('app.user_id',$2,true)",[churchId,actorId]);const result=await action(client);await client.query('COMMIT');return result;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
async function settleJob(client:PoolClient,job:JobRow,charged:number,state:string,error:string|null,result:WorkflowModelResult|null) {
  const finished=await client.query('UPDATE study_workflow_jobs SET state=$3,charged=$4,error=$5,result=$6,usage=$7,provider_response_id=$8,lease_until=NULL,finished_at=now() WHERE church_id=$1 AND id=$2 AND state=\'running\' RETURNING id',[job.church_id,job.id,state,charged,error,result?JSON.stringify(result):null,result?JSON.stringify(result.usage):null,result?.responseId??null]);
  if(!finished.rowCount)return;
  await client.query('UPDATE provider_budgets SET reserved_tokens=reserved_tokens-$3,charged_tokens=charged_tokens+$4 WHERE church_id=$1 AND period=$2 AND reserved_tokens>=$3',[job.church_id,job.period,job.reservation,charged]);
  await client.query('UPDATE study_workflows SET tokens_reserved=tokens_reserved-$3,tokens_used=tokens_used+$4,updated_at=now() WHERE church_id=$1 AND id=$2',[job.church_id,job.run_id,job.reservation,charged]);
}
export async function runStudyWorkflows(database:Database,runtime:WorkflowRuntime=studyWorkflowConfig) {
  await database.pool.query('SELECT cleanup_study_workflows()');
  let config:OpenAIConfig;try{config=runtime();}catch{return {steps:0};}
  const actors=(await database.pool.query('SELECT * FROM study_workflow_actors()')).rows as {church_id:string;actor_id:string}[];
  let steps=0;
  for(const owner of actors){
    // Expired leases never submit inference automatically again.
    await actorTransaction(database,owner.church_id,owner.actor_id,async client=>{
      const expired=(await client.query("SELECT *,local_date::text AS local_date FROM study_workflow_jobs WHERE church_id=$1 AND state='running' AND lease_until<now() FOR UPDATE",[owner.church_id])).rows as JobRow[];
      for(const job of expired){await settleJob(client,job,job.reservation,'submission_unknown','Worker interrupted. Submitted inference was not automatically retried.',null);await client.query("UPDATE study_workflows SET state='failed',error='A submitted step was interrupted. Retry explicitly after reviewing usage.' WHERE church_id=$1 AND id=$2 AND state NOT IN ('canceled','erased','drafts_saved')",[job.church_id,job.run_id]);}
    });
    let job:JobRow|null;
    try{
      job=await database.transaction(owner.church_id,owner.actor_id,async(client,member)=>{
        workflowPermission(member);
        const runRow=(await client.query("SELECT id FROM study_workflows WHERE church_id=$1 AND state IN ('plan_queued','queued','generating') AND expires_at>now() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1",[owner.church_id])).rows[0];
        if(!runRow)return null;const run=await workflowRun(client,owner.church_id,runRow.id);await boundSource(client,run);
        if(run.confirmation&&run.plan)await assertDatesFree(client,run,pendingPlan(run,run.plan));
        const next=(await client.query("SELECT j.*,j.local_date::text AS local_date FROM study_workflow_jobs j WHERE church_id=$1 AND run_id=$2 AND run_version=$3 AND state='pending' ORDER BY j.created_at,j.local_date,j.id FOR UPDATE SKIP LOCKED LIMIT 1",[owner.church_id,run.id,run.version])).rows[0] as JobRow|undefined;
        if(!next){if(run.confirmation){await commitDrafts(client,member,run);}return null;}
        const budget=(await client.query('SELECT * FROM provider_budgets WHERE church_id=$1 FOR UPDATE',[owner.church_id])).rows[0];
        demand(budget&&budget.charged_tokens+budget.reserved_tokens<=budget.monthly_limit,422,'budget_changed','The church allowance was reduced. Review the workflow before continuing.');
        demand((await client.query('SELECT reserve_cowriter_allowance() AS allowed')).rows[0].allowed,429,'daily_limit','The daily model-call allowance has been reached.');
        demand(run.attempts<12,422,'workflow_attempt_limit','Workflow inference attempt limit reached');
        await client.query("UPDATE study_workflow_jobs SET state='running',lease_until=now()+interval '2 minutes' WHERE church_id=$1 AND id=$2",[next.church_id,next.id]);
        await client.query("UPDATE study_workflows SET attempts=attempts+1,state=$3,updated_at=now() WHERE church_id=$1 AND id=$2",[run.church_id,run.id,next.kind==='plan'?'planning':'generating']);
        return next;
      });
    }catch(error){
      const code=(error as {code?:string}).code;if(code==='23505')continue;
      if(code&&/^[A-Z0-9]{5}$/.test(code))console.error('Study workflow claim failed',code,(error as {routine?:string}).routine??'');
      await actorTransaction(database,owner.church_id,owner.actor_id,async client=>{
        const runs=(await client.query("SELECT * FROM study_workflows WHERE church_id=$1 AND state IN ('plan_queued','planning','queued','generating') FOR UPDATE",[owner.church_id])).rows as WorkflowRow[];
        for(const run of runs){await releasePending(client,run);await client.query("UPDATE study_workflows SET state='paused_conflict',error=$3 WHERE church_id=$1 AND id=$2",[run.church_id,run.id,error instanceof Error&&'statusCode' in error?error.message:'Workflow access or calendar state changed; review before retrying.']);}
      });continue;
    }
    if(!job)continue;steps++;
    let result:WorkflowModelResult|null=null;let failure:string|null=null;let charged=job.reservation;
    try{result=await new WorkflowModel(config).generate(job.prepared);charged=result.usage.inputTokens+result.usage.outputTokens;demand(charged<=job.reservation,502,'usage_exceeded','Provider usage exceeded its conservative reservation');}catch(error){failure=error instanceof Error&&'statusCode' in error?error.message:'Generation failed; no draft set was saved. Retry only after reviewing the failed step.';const usage=(error as {usage?:{inputTokens:number;outputTokens:number}}).usage;if(usage&&Number.isSafeInteger(usage.inputTokens)&&Number.isSafeInteger(usage.outputTokens)&&usage.inputTokens+usage.outputTokens<=job.reservation)charged=usage.inputTokens+usage.outputTokens;}
    const currentJob=job;
    try{
      await database.transaction(job.church_id,job.actor_id,async(client,member)=>{
        workflowPermission(member);const run=await workflowRun(client,currentJob.church_id,currentJob.run_id);
        const live=(await client.query('SELECT state FROM study_workflow_jobs WHERE church_id=$1 AND id=$2 FOR UPDATE',[currentJob.church_id,currentJob.id])).rows[0];if(live?.state!=='running')return;
        if(run.state==='canceled'||run.version!==currentJob.run_version){await settleJob(client,currentJob,charged,'canceled',null,null);return;}
        await boundSource(client,run);
        if(failure||!result){await settleJob(client,currentJob,charged,charged===currentJob.reservation?'submission_unknown':'failed',failure,null);await releasePending(client,run);await client.query("UPDATE study_workflows SET state=$4,error=$3 WHERE church_id=$1 AND id=$2",[run.church_id,run.id,failure,currentJob.prepared.input.conversationOnly?'drafts_saved':'failed']);return;}
        await settleJob(client,currentJob,charged,'completed',null,result);
        if(currentJob.kind==='plan'){
          if(currentJob.prepared.input.clarificationOnly){
            await client.query("UPDATE study_workflows SET state='direction_review',version=version+1,messages=messages||$3::jsonb,error=NULL,updated_at=now() WHERE church_id=$1 AND id=$2",[run.church_id,run.id,JSON.stringify([{role:'assistant',text:result.reply}])]);return;
          }

          if(currentJob.prepared.input.conversationOnly){
            await client.query("UPDATE study_workflows SET state='drafts_saved',version=version+1,messages=messages||$3::jsonb,error=NULL,updated_at=now() WHERE church_id=$1 AND id=$2",[run.church_id,run.id,JSON.stringify([{role:'assistant',text:result.reply??'The saved studies remain unchanged. Open a study to review or edit it.'}])]);return;
          }

          let plan=result.value as WorkflowPlan;
          if(run.sequential&&run.intent_confirmed&&run.plan&&plan.days.length===run.plan.days.length)plan={...plan,days:plan.days.map((day,index)=>index===run.mapping.length?day:run.plan!.days[index]!)};
          assertGuidedPlan(run,plan);const version=run.version+1;
          await client.query('INSERT INTO study_workflow_plans(church_id,id,run_id,actor_id,version,payload,sha256) VALUES($1,$2,$3,$4,$5,$6,$7)',[run.church_id,randomUUID(),run.id,run.actor_id,version,JSON.stringify(plan),hash(canonical(plan))]);
          await client.query("UPDATE study_workflows SET state='direction_review',version=$3,plan=$4,messages=messages||$5::jsonb,error=NULL,updated_at=now() WHERE church_id=$1 AND id=$2",[run.church_id,run.id,version,JSON.stringify(plan),JSON.stringify([{role:'assistant',text:(result.reply?result.reply+'\n\n':'')+(run.sequential&&!run.intent_confirmed?`My understanding: ${plan.days.length} studies in the week beginning ${plan.weekStart}, about ${plan.theme}, for ${plan.direction.audience}. ${plan.progression} Please confirm this intention or tell me what to adjust. No study has been created.`:run.sequential?`Day ${run.mapping.length+1} proposal: ${plan.days[run.mapping.length]!.title}. ${plan.days[run.mapping.length]!.objective} Tell me what to adjust, or review and confirm this day before I create it.`:`Plan ready: ${plan.days.length} days. ${plan.progression}`)}])]);
        }
      });
    }catch(error){
      await actorTransaction(database,currentJob.church_id,currentJob.actor_id,async client=>{
        const run=(await client.query('SELECT * FROM study_workflows WHERE church_id=$1 AND id=$2 FOR UPDATE',[currentJob.church_id,currentJob.run_id])).rows[0] as WorkflowRow|undefined;
        await settleJob(client,currentJob,charged,'failed','Access, source or profile changed during generation; output was discarded.',null);
        if(run){await releasePending(client,run);if(run.state!=='erased')await client.query("UPDATE study_workflows SET state='paused_conflict',error=$3 WHERE church_id=$1 AND id=$2",[run.church_id,run.id,error instanceof Error&&'statusCode' in error?error.message:'Workflow changed during generation. Review before continuing.']);}
      });
    }
  }
  return {steps};
}
