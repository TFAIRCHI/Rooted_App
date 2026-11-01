// Explicit synthetic Azure verification; normal automated tests never invoke this command.
import { chromium, expect } from '@playwright/test';
import { DateTime } from 'luxon';
import { existsSync } from 'node:fs';
import { mkdir,readFile,writeFile } from 'node:fs/promises';

if(!process.argv.includes('--run-live')){console.log('Opt-in: node backend/scripts/study-workflow-demo.mjs --run-live --single-day (then --three-day)');process.exit(0);}
const mode=process.argv.includes('--single-day')?'single-day':'three-day',count=mode==='single-day'?1:3;
const folder='BuildPrompts/1.2.12/evidence',reportPath=folder+'/live-demo.json';await mkdir(folder,{recursive:true});
let report={version:'1.2.12',runs:[]};
if(existsSync(reportPath))report=JSON.parse(await readFile(reportPath,'utf8'));
let entry=report.runs.find(run=>run.mode===mode);
if(entry?.passed&&!process.argv.includes('--capture-existing')){console.log('This live journey already passed. Inspect its saved evidence instead of sending more model calls.');process.exit(0);}
const chrome=process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser=await chromium.launch({headless:true,...(existsSync(chrome)?{executablePath:chrome}:{})});
const context=await browser.newContext({baseURL:'http://127.0.0.1:3000',viewport:{width:1600,height:1000}}),page=await context.newPage();
const church='10000000-0000-4000-8000-000000000001',prefix=`/api/v1/churches/${church}`;
async function save(){await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');}
async function openPanel(){
  await expect(page.locator('.cowriter-launcher:visible').first()).toBeVisible({timeout:30000});
  const launcher=page.getByRole('button',{name:'Plan studies with co-writer'});
  if(await launcher.isVisible())await launcher.click();else{await page.getByRole('button',{name:'Open study co-writer'}).click();await page.getByRole('button',{name:'Plan studies · create a multi-day draft set'}).click();}
  await expect(page.getByRole('dialog',{name:'Study planning co-writer'})).toBeVisible();
  if(await page.getByRole('button',{name:'Expand planning panel'}).isVisible())await page.getByRole('button',{name:'Expand planning panel'}).click();
}
async function loadRun(){const response=await context.request.get(prefix+'/study-workflows/'+entry.runId);if(!response.ok())throw new Error('Live workflow unavailable: HTTP '+response.status());return response.json();}
async function waitFor(states){const deadline=Date.now()+180000;while(Date.now()<deadline){const run=await loadRun();if(states.includes(run.state))return run;if(['failed','paused_conflict','canceled','erased'].includes(run.state))throw new Error(run.error??`Workflow stopped: ${run.state}`);await page.waitForTimeout(700);}throw new Error('Timed out waiting for durable workflow progress');}
try{
  const login=await context.request.post('/api/v1/auth/demo-login',{data:{username:'anna.contributor',password:'RootedDemo!2026A'}});if(!login.ok())throw new Error('Start the local demo stack with fictional contributor logins enabled.');
  const workspace=await(await context.request.get(prefix+'/workspace')).json();
  if(!entry){
    const today=DateTime.now().setZone(workspace.church.timeZone??'America/New_York');const currentSunday=today.startOf('day').minus({days:today.weekday%7});
    const week=currentSunday.plus({weeks:count===1?4:1}),occupied=new Set(workspace.slots.map(slot=>slot.localDate));
    const candidateDays=[1,3,5,2,4,6,0].map(day=>week.plus({days:day})).filter(day=>!occupied.has(day.toISODate()));
    if(candidateDays.length<count)throw new Error('The synthetic acceptance week does not have enough unused dates; do not replace existing work.');
    entry={mode,expectedDates:candidateDays.slice(0,count).map(day=>day.toISODate()).sort(),weekStart:week.toISODate(),startedAt:new Date().toISOString(),passed:false};report.runs.push(entry);await save();
  }
  await page.goto(`/studies?church=${church}`);await openPanel();
  if(!entry.runId){
    await page.getByRole('button',{name:'New plan',exact:true}).click();
    await page.getByLabel('Planning study series').selectOption(workspace.series[0].id);
    const task=`Create a ${count===1?'one':'three'}-day study ${count===3?'for next week':'for the specified future week'} based on this outline. Exact requested dates: ${entry.expectedDates.join(', ')}. Week beginning ${entry.weekStart}. Audience adults with varied biblical familiarity. Explain simply through intermediate depth. Reference-only Scripture, no quotations. Use a short practical daily illustration. The direction is trust with honest questions and one small faithful next step. Return exactly ${count} day${count===1?'':'s'}.`;
    await page.getByLabel('Study planning request').fill(task);
    await page.getByLabel('Planning sermon outline').fill('Synthetic verification outline: John 6:68. Peter brings uncertainty to Jesus rather than pretending to understand everything. Central takeaway: trust can coexist with honest questions. Encourage members to name a question, reflect with a trusted friend, and take one small faithful action. This is fictional teaching material, not a Bible quotation.');
    await page.getByRole('checkbox',{name:'I reviewed this source and have permission to use it.'}).check();
    const createdResponse=page.waitForResponse(response=>response.url().endsWith('/study-workflows')&&response.request().method()==='POST');
    await page.getByRole('button',{name:'Propose study plan',exact:true}).click();const response=await createdResponse,data=await response.json();if(!response.ok())throw new Error(data.message??'Planning request failed');entry.runId=data.id;await save();
  }else await page.getByLabel('Resume a workflow').selectOption(entry.runId);
  let run=await loadRun();
  if(['failed','paused_conflict'].includes(run.state)){
    if(!process.argv.includes('--retry-failed'))throw new Error(run.error??'Inspect and correct the failed run before explicit retry.');
    if(run.plan&&run.jobs.some(job=>job.kind==='day'))await page.getByRole('button',{name:'Retry failed days only'}).click();
    else{await page.getByLabel('Discuss study direction').fill('Retry the original request with exactly the requested day count, date range, complete schema and supplied reference IDs.');await page.getByRole('button',{name:'Discuss direction',exact:true}).click();}
    run=await loadRun();
  }
  if(['plan_queued','planning'].includes(run.state))run=await waitFor(['direction_review']);
  if(run.state==='direction_review'){
    if(run.plan.days.length!==count)throw new Error('The plan day count differs from the request. Inspect the plan instead of generating extra days.');
    await expect(page.getByLabel('Workflow theme')).toBeVisible({timeout:10000});
    await page.getByLabel('Workflow week beginning').fill(entry.weekStart);
    for(let index=0;index<count;index++)await page.getByLabel(`Day ${index+1} date`,{exact:true}).fill(entry.expectedDates[index]);
    await page.getByLabel('Audience',{exact:true}).fill('Adults with varied biblical familiarity');
    await page.getByLabel('Reading depth',{exact:true}).fill('Simple explanation progressing to intermediate understanding');
    await page.getByLabel('Translation preference',{exact:true}).fill('Passage references only; no Scripture quotations');
    if(run.plan.questions.length)await page.getByRole('checkbox',{name:'I resolved these questions in the direction fields above.'}).check();
    await page.getByRole('button',{name:'Review agreed direction',exact:true}).click();
    await expect(page.getByRole('button',{name:`Confirm direction & generate ${count} drafts`})).toBeVisible();run=await loadRun();
  }
  if(run.state==='awaiting_generation_confirmation'){
    entry.noDraftsBeforeConfirmation=(await(await context.request.get(prefix+'/workspace')).json()).slots.every(slot=>!entry.expectedDates.includes(slot.localDate));
    if(!entry.noDraftsBeforeConfirmation)throw new Error('An expected date became occupied; confirmation stopped.');
    await page.screenshot({path:`${folder}/${mode}-direction.png`,fullPage:true});
    await page.getByRole('button',{name:`Confirm direction & generate ${count} drafts`}).click();
    await page.waitForTimeout(300);await page.reload();await openPanel();entry.resumedAfterReload=true;await save();
  }
  run=await waitFor(['drafts_saved']);entry.mapping=run.mapping;entry.tokensUsed=run.tokensUsed;entry.jobs=run.jobs;entry.completeFields=[];
  if(run.mapping.length!==count)throw new Error('Saved draft count mismatch');
  await expect(page.getByRole('heading',{name:'Draft set saved',exact:true})).toBeVisible({timeout:10000});
  await page.screenshot({path:`${folder}/${mode}-saved.png`,fullPage:true});
  await page.setViewportSize({width:390,height:844});const box=await page.getByRole('dialog',{name:'Study planning co-writer'}).boundingBox();entry.mobileWithinViewport=!!box&&box.x>=0&&box.x+box.width<=390;
  await page.screenshot({path:`${folder}/${mode}-mobile.png`,fullPage:true});await page.setViewportSize({width:1600,height:1000});
  for(const day of run.mapping){
    const content=await(await context.request.get(prefix+'/content/'+day.contentId)).json();
    const fields=['title','references','body','reflection','discussionQuestion','application','outboundPreview'];
    if(!fields.every(field=>content.head.payload[field]?.length)||content.status!=='draft'||content.approvalId||content.livePublicationId)throw new Error('A saved day is incomplete or unexpectedly approved/published');
    await page.goto(`/studies?church=${church}&month=${day.date.slice(0,7)}&slot=${day.slotId}`);await expect(page.getByTestId('content-title')).toHaveValue(content.head.payload.title);await expect(page.getByTestId('content-body')).toHaveValue(content.head.payload.body);await page.reload();await expect(page.getByTestId('content-application')).toHaveValue(content.head.payload.application);
    entry.completeFields.push({date:day.date,fields,reloaded:true,state:content.status});await page.screenshot({path:`${folder}/editor-${day.date}.png`,fullPage:true});
  }
  const foreign=await context.request.get(`/api/v1/churches/10000000-0000-4000-8000-000000000002/study-workflows/${run.id}`);entry.foreignChurchDenied=foreign.status()===404;
  entry.passed=entry.mobileWithinViewport&&entry.foreignChurchDenied&&entry.completeFields.length===count;entry.finishedAt=new Date().toISOString();delete entry.blocker;await save();console.log(JSON.stringify(entry,null,2));
  if(!entry.passed)process.exitCode=1;
}catch(error){entry??={mode,passed:false};if(!report.runs.includes(entry))report.runs.push(entry);entry.blocker=error instanceof Error?error.message:'Live acceptance failed';entry.passed=false;await save();console.error(entry.blocker);process.exitCode=1;}
finally{await context.close();await browser.close();}
