import { DateTime } from 'luxon';
import { z } from 'zod';
import { completeDaySchema, directionSchema, workflowPlanSchema, type CompleteDay, type WorkflowPlan } from '../../contracts/study-workflow.js';
import { CowriterAdapter, cowriterInstructions } from './cowriter.js';
import type { OpenAIConfig } from './ai.js';
import { IntegrationError, hasDisallowedControls } from './errors.js';
import { object, providerJson } from './http.js';

const text = (max: number) => z.string().trim().min(1).max(max);
const proposedPlanSchema = z.object({
  reply:text(1500),
  weekOffset: z.number().int().min(0).max(12), dayCount: z.number().int().min(1).max(7), theme: text(1000), progression: text(1500),
  direction: directionSchema, questions: z.array(text(500)).max(3), assumptions: z.array(text(500)).max(10),
  days: z.array(z.object({weekday:z.number().int().min(0).max(6),title:text(500),objective:text(1000),theme:text(1000),references:z.array(text(100)).min(1).max(10)}).strict()).min(1).max(7),
}).strict();
export const sourceReferences = (value:string) => [...new Set((value.match(/(?:[1-3]\s+)?(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song of (?:Songs|Solomon)|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation)\s+\d{1,3}:\d{1,3}(?:[-–]\d{1,3})?/gi) ?? []).map(ref=>ref.replace(/\s+/g,' ').replaceAll('–','-')))];
export function weekSunday(now:Date, zone:string) {
  const local = DateTime.fromJSDate(now,{zone});
  if (!local.isValid) throw new IntegrationError('INVALID_ZONE','A valid church timezone is required',422);
  return local.startOf('day').minus({days:local.weekday%7}).toISODate()!;
}
export function validateWorkflowPlan(value:unknown, allowed:string[], zone:string):WorkflowPlan {
  const plan = workflowPlanSchema.parse(value);
  const start=DateTime.fromISO(plan.weekStart,{zone});
  if (!start.isValid || start.weekday!==7 || new Set(plan.days.map(day=>day.date)).size!==plan.days.length || plan.days.some(day=>day.date<plan.weekStart || day.date>start.plus({days:6}).toISODate()! || day.references.some(ref=>!allowed.includes(ref)))) throw new IntegrationError('INVALID_PLAN','Choose unique dates within the confirmed Sunday–Saturday week and references from the reviewed source',422);
  return plan;
}
export function validateCompleteDay(value:unknown, date:string, sourceId:string, allowed:string[]):CompleteDay {
  const result=completeDaySchema.parse(value);
  const fields=['title','references','body','reflection','discussionQuestion','application','outboundPreview'] as const;
  if(result.date!==date || fields.some(field=>!result.evidence.some(item=>item.field===field && item.sourceId===sourceId)) || result.evidence.some(item=>item.sourceId!==sourceId) || !result.content.references.length || result.content.references.some(ref=>!allowed.includes(ref)) || Object.values(result.content).some(value=>typeof value==='string' && (!value.trim() || hasDisallowedControls(value) || /<[^>]*>|https?:\/\//i.test(value)))) throw new IntegrationError('INVALID_COMPLETE_DAY','The model did not return a complete, source-grounded day. No drafts were saved.',502);
  return result;
}
export interface WorkflowModelInput {
  originalRequest?:string;
  clarificationOnly?:boolean;
  conversationOnly?:boolean;
  kind:'plan'|'day'; task:string; sourceId:string; sourceText:string; allowedReferences:string[]; profile:string;
  timeZone:string; referenceSunday:string; plan:WorkflowPlan|null; date:string|null; history:{role:string;text:string}[];
}
export interface WorkflowModelRequest { input:WorkflowModelInput; schema:Record<string,unknown>; instructions:string; outputLimit:number; reservation:number }
export function prepareWorkflowRequest(input:WorkflowModelInput, outputLimit=3000):WorkflowModelRequest {
  if(input.clarificationOnly){
    if(Buffer.byteLength(JSON.stringify(input)+cowriterInstructions)+1600>12000)throw new IntegrationError('WORKFLOW_INPUT_LIMIT','Shorten the conversation before sending another message',422);
    return {input,schema:{},instructions:cowriterInstructions,outputLimit:1500,reservation:13500};
  }
  const base=input.kind==='plan'?proposedPlanSchema:completeDaySchema;
  const json=z.toJSONSchema(base,{target:'draft-7'}) as Record<string,unknown>;
  delete json.$schema;
  function constrain(node:unknown,key='') {
    if(!node||typeof node!=='object')return;
    const value=node as Record<string,unknown>;
    if(Object.hasOwn(value,'const')){value.enum=[value.const];delete value.const;}
    if(value.format==='date'){delete value.format;value.pattern='^\\d{4}-\\d{2}-\\d{2}$';}
    if(key==='sourceId')value.enum=[input.sourceId];
    if(key==='references'&&value.items)(value.items as Record<string,unknown>).enum=input.allowedReferences;
    if(value.type==='object'&&value.properties)for(const [name,child]of Object.entries(value.properties as Record<string,unknown>))constrain(child,name);
    if(value.items)constrain(value.items);
  }
  constrain(json);
  const instructions=cowriterInstructions+' Use only the supplied allowedReferences exactly. Do not quote Scripture. For a plan include a conversational reply that directly answers the latest question, explains your understanding or proposed adjustment, and asks for confirmation without claiming any action was taken. Interpret the request and follow-up in context, propose 1–7 days and weekday numbers (Sunday=0). weekOffset is counted from referenceSunday; next week is 1. Honor the latest USER corrections over earlier assistant suggestions, especially dates. If the user asks for consecutive days starting on a date, use consecutive calendar days rather than assuming a Monday/Wednesday/Friday cadence. Preserve the agreed audience, reading duration, requested prayers and exclusions. Ask at most three focused questions only when material context is missing. Do not repeat answered questions. Otherwise use clearly labeled assumptions for adult mixed familiarity and simple-to-intermediate depth. For a day return the full content schema, every text field meaningfully filled, a body sized to the agreed reading duration (normally 300–450 words; a roughly five-minute devotional can include 450–600 words with reflection and prayer), include a closing prayer in the body when requested, nonempty references, and evidence for ALL seven fields with exact sourceId and spanId outline. No HTML, hyperlinks, publication or approval claims.';
  const size=Buffer.byteLength(JSON.stringify(input)+JSON.stringify(json)+instructions)+256;
  if(size>12000) throw new IntegrationError('WORKFLOW_INPUT_LIMIT','Shorten the source or conversation; this step exceeds the 12,000-token conservative context allowance',422);
  if(outputLimit<1||outputLimit>4000)throw new IntegrationError('WORKFLOW_OUTPUT_LIMIT','Day output allowance must be between 1 and 4,000 tokens',422);
  return {input,schema:json,instructions,outputLimit,reservation:size+outputLimit};
}
export interface WorkflowModelResult { reply?:string; value: WorkflowPlan|CompleteDay|null; responseId:string; model:string; usage:{inputTokens:number;outputTokens:number} }
export class WorkflowModel {
  constructor(private readonly config:OpenAIConfig){}
  async generate(prepared:WorkflowModelRequest):Promise<WorkflowModelResult> {
    if(prepared.input.clarificationOnly){
      const input=prepared.input;
      const response=await new CowriterAdapter(this.config).chat({task:input.task,history:input.history.map(item=>({role:item.role==='user'?'user':'assistant',content:item.text})),context:{originalRequest:input.originalRequest,churchTimeZone:input.timeZone,weekBeginningSunday:input.referenceSunday,profile:input.profile,sourceText:input.sourceText||null,mode:'Clarify the request in conversation. Confirm your understanding, ask at most two focused questions for missing audience, timing or teaching direction. No study has been created. Do not invent sermon grounding or claim any action. Study creation requires reviewed source passages and a selected series, followed by separate intention and per-day confirmations. Explain this conversationally when relevant; never require a form before answering the user.'}});
      return {value:null,reply:response.text,responseId:response.responseId,model:response.model,usage:response.usage};
    }
    const response=object(await providerJson(this.config.fetch??globalThis.fetch,`${this.config.baseUrl}/responses`,{
      method:'POST',headers:{'api-key':this.config.apiKey!,'Content-Type':'application/json'},signal:AbortSignal.timeout(45000),
      body:JSON.stringify({model:this.config.model,store:false,instructions:prepared.instructions,input:[{role:'user',content:[{type:'input_text',text:JSON.stringify(prepared.input)}]}],tools:[],reasoning:{effort:'none'},max_output_tokens:prepared.outputLimit,text:{format:{type:'json_schema',name:prepared.input.kind==='plan'?'workflow_plan':'complete_study_day',strict:true,schema:prepared.schema}}}),
    },true));
    if(response.status!=='completed'||typeof response.id!=='string'||typeof response.model!=='string'||!Array.isArray(response.output))throw new IntegrationError('WORKFLOW_INCOMPLETE','Azure returned incomplete output; no draft set was saved',502);
    const chunks:string[]=[];
    for(const item of response.output){const message=object(item);if(message.type==='reasoning')continue;if(message.type!=='message'||message.role!=='assistant'||!Array.isArray(message.content))throw new IntegrationError('INVALID_WORKFLOW_OUTPUT','Unexpected model output',502);for(const part of message.content){const content=object(part);if(content.type==='refusal')throw new IntegrationError('WORKFLOW_REFUSAL','The model declined this request',422);if(content.type!=='output_text'||typeof content.text!=='string')throw new IntegrationError('INVALID_WORKFLOW_OUTPUT','Expected structured text',502);chunks.push(content.text);}}
    const usage=object(response.usage);
    if(!Number.isSafeInteger(usage.input_tokens)||!Number.isSafeInteger(usage.output_tokens)||Number(usage.input_tokens)<0||Number(usage.input_tokens)>12000||Number(usage.output_tokens)<0||Number(usage.output_tokens)>prepared.outputLimit)throw new IntegrationError('INVALID_WORKFLOW_USAGE','Provider usage was missing or invalid',502);
    let parsed:unknown;try{parsed=JSON.parse(chunks.join(''));}catch{throw new IntegrationError('INVALID_WORKFLOW_OUTPUT','Model output was not complete JSON',502);}
    const input=prepared.input;
    let value:WorkflowPlan|CompleteDay;let reply:string|undefined;
    try{
      if(input.kind==='day')value=validateCompleteDay(parsed,input.date!,input.sourceId,input.allowedReferences);
      else{
        const legacySchema=!(prepared.schema.properties as Record<string,unknown>)?.reply;
        const proposed=proposedPlanSchema.parse(legacySchema?{...object(parsed),reply:'Review this proposed direction before any study is created.'}:parsed);reply=proposed.reply;
        if(proposed.dayCount!==proposed.days.length||new Set(proposed.days.map(day=>day.weekday)).size!==proposed.days.length)throw new Error('Date count mismatch');
        const start=DateTime.fromISO(input.referenceSunday,{zone:input.timeZone}).plus({weeks:proposed.weekOffset});
        value=validateWorkflowPlan({theme:proposed.theme,progression:proposed.progression,weekStart:start.toISODate(),direction:proposed.direction,questions:proposed.questions,assumptions:proposed.assumptions,days:proposed.days.map(day=>({date:start.plus({days:day.weekday}).toISODate(),title:day.title,objective:day.objective,theme:day.theme,references:day.references})).sort((a,b)=>a.date!.localeCompare(b.date!))},input.allowedReferences,input.timeZone);
      }
    }catch{throw Object.assign(new IntegrationError('INVALID_WORKFLOW_OUTPUT','Model output failed complete-field, date or source validation. No drafts were saved.',502),{usage:{inputTokens:Number(usage.input_tokens),outputTokens:Number(usage.output_tokens)},responseId:response.id});}
    return {value,...(reply?{reply}:{}),responseId:response.id,model:response.model,usage:{inputTokens:Number(usage.input_tokens),outputTokens:Number(usage.output_tokens)}};
  }
}
