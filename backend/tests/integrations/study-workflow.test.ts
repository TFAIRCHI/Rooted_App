import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prepareWorkflowRequest, sourceReferences, validateCompleteDay, validateWorkflowPlan, weekSunday, WorkflowModel } from '../../src/integrations/study-workflow.js';
import type { WorkflowPlan } from '../../contracts/study-workflow.js';

export const fixtureDirection={audience:'Adults of varied familiarity',takeaway:'Bring honest questions to Jesus',depth:'Simple through intermediate',translation:'Use supplied references; no quotations',illustrations:'A daily decision',application:'Name one question and one faithful next step'};
export function fixtureDay(date:string,sourceId:string){return {date,content:{schemaVersion:1,title:'Trust with questions',references:['John 6:68'],body:'Synthetic devotional explanation grounded in the outline.',reflection:'Where do you feel uncertain?',discussionQuestion:'How can trust and questions coexist?',application:'Name one question and speak with a trusted friend.',outboundPreview:'Explore trust with honest questions.'},evidence:['title','references','body','reflection','discussionQuestion','application','outboundPreview'].map(field=>({field,sourceId,spanId:'outline'})),warnings:['References require human verification.']};}
export const fixturePlan:WorkflowPlan={theme:'Trust amid uncertainty',progression:'Observe, reflect, act',weekStart:'2026-11-01',direction:fixtureDirection,questions:[],assumptions:['Three proposed dates for your confirmation'],days:[2,4,6].map(day=>({date:`2026-11-0${day}`,title:'Trust with questions',objective:'Explore honest faith',theme:'Trust',references:['John 6:68']}))};
test('workflow dates use the church timezone, Sunday boundaries and cross-month weeks',()=>{
  assert.equal(weekSunday(new Date('2026-11-01T03:30:00Z'),'America/New_York'),'2026-10-25');
  assert.equal(weekSunday(new Date('2026-11-01T07:30:00Z'),'America/New_York'),'2026-11-01');
  assert.equal(weekSunday(new Date('2027-01-01T10:00:00Z'),'America/New_York'),'2026-12-27');
  assert.deepEqual(sourceReferences('John 6:68; John 6:68. Also Psalm 46:1–3.'),['John 6:68','Psalm 46:1-3']);
  assert.equal(validateWorkflowPlan(fixturePlan,['John 6:68'],'America/New_York').days.length,3);
  assert.throws(()=>validateWorkflowPlan({...fixturePlan,days:[fixturePlan.days[0],fixturePlan.days[0]]},['John 6:68'],'America/New_York'));
  assert.throws(()=>validateWorkflowPlan({...fixturePlan,weekStart:'2026-11-02'},['John 6:68'],'America/New_York'));
});
test('complete day schema requires all editor fields and exact source evidence',()=>{
  const id=randomUUID(),day=fixtureDay('2026-11-02',id);
  assert.equal(validateCompleteDay(day,day.date,id,['John 6:68']).content.references[0],'John 6:68');
  assert.throws(()=>validateCompleteDay({...day,content:{...day.content,body:''}},day.date,id,['John 6:68']));
  assert.throws(()=>validateCompleteDay({...day,evidence:day.evidence.slice(1)},day.date,id,['John 6:68']));
  assert.throws(()=>validateCompleteDay(day,day.date,randomUUID(),['John 6:68']));
  assert.throws(()=>validateCompleteDay({...day,content:{...day.content,references:['John 1:1']}},day.date,id,['John 6:68']));
  assert.throws(()=>prepareWorkflowRequest({kind:'day',task:'Draft',sourceId:id,sourceText:'x'.repeat(15000),allowedReferences:['John 6:68'],profile:'Demo',timeZone:'America/New_York',referenceSunday:'2026-10-25',plan:fixturePlan,date:day.date,history:[]}));
});
test('full-day Azure response preserves complete payload, source IDs and actual usage',async()=>{
  const id=randomUUID(),date='2026-11-02';
  const prepared=prepareWorkflowRequest({kind:'day',task:'Draft',sourceId:id,sourceText:'John 6:68. Trust with questions.',allowedReferences:['John 6:68'],profile:'Demo',timeZone:'America/New_York',referenceSunday:'2026-10-25',plan:fixturePlan,date,history:[]});
  const fetcher:typeof fetch=async(_url,init)=>{const body=JSON.parse(init!.body as string);assert.equal(body.model,'gpt-5.6-luna');assert.equal(body.store,false);assert.deepEqual(body.tools,[]);assert.equal(body.text.format.strict,true);assert.equal(new Headers(init!.headers).get('api-key'),'fixture');return Response.json({id:'fixture-response',model:body.model,status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(fixtureDay(date,id))}]}],usage:{input_tokens:400,output_tokens:300}});};
  const result=await new WorkflowModel({apiKey:'fixture',model:'gpt-5.6-luna',baseUrl:'https://fixture.openai.azure.com/openai/v1',fetch:fetcher}).generate(prepared);
  assert.equal(result.usage.inputTokens,400);assert.ok(result.value&&'content'in result.value);
});
