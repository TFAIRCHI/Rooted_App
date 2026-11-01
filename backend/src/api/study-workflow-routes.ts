import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { authenticate, csrf } from '../auth/routes.js';
import type { Database, Membership } from '../infrastructure/database.js';
import type { config } from '../infrastructure/config.js';
import { canonical, hash } from '../modules/revisions.js';
import { cancelWorkflow, configureWorkflow, confirmIntent, confirmWorkflow, newWorkflow, prepareConversationPlan, queuePlan, retryWorkflow, reviewPlan, workflowPermission, workflowRun, workflowView, type WorkflowRuntime } from '../modules/study-workflows.js';
import { workflowPlanSchema } from '../../contracts/study-workflow.js';
import { demand } from './errors.js';
import { studyWorkflowConfig } from '../integrations/workflow-runtime.js';

const uuid=z.string().uuid();
const versioned=z.object({version:z.number().int().positive()});
export async function studyWorkflowRoutes(app:FastifyInstance,database:Database,settings:ReturnType<typeof config>,clock=()=>new Date(),runtime:WorkflowRuntime=studyWorkflowConfig) {
  const prefix='/v1/churches/:churchId/study-workflows';
  async function context(request:FastifyRequest,write=false){const session=await authenticate(database,request);if(write)csrf(request,session,settings.appOrigin);return {...z.object({churchId:uuid,id:uuid.optional()}).parse(request.params),actorId:session.userId};}
  app.get(prefix,async request=>{
    const ctx=await context(request);
    return database.transaction(ctx.churchId,ctx.actorId,async(client,member)=>{
      workflowPermission(member);
      const rows=(await client.query("SELECT id,state,version,created_at,expires_at,tokens_used,error,plan->>'theme' AS theme FROM study_workflows WHERE church_id=$1 AND state<>'erased' AND expires_at>now() ORDER BY updated_at DESC",[ctx.churchId])).rows;
      let configured=false;try{runtime();configured=true;}catch{/* Configuration is reported without secrets. */}
      return {items:rows,configured};
    });
  });
  app.get(prefix+'/:id',async request=>{
    const ctx=await context(request);return database.transaction(ctx.churchId,ctx.actorId,async(client,member)=>{workflowPermission(member);return workflowView(client,await workflowRun(client,ctx.churchId,ctx.id!));});
  });
  type Action=(client:PoolClient,member:Membership,ctx:{churchId:string;id?:string},request:FastifyRequest)=>Promise<string>;
  function command(path:string,action:Action,erasing=false){
    app.post(prefix+path,async request=>{
      const ctx=await context(request,true);const key=z.string().min(8).max(200).parse(request.headers['idempotency-key']);
      const requestHash=hash(canonical(request.body??{}));const operation=request.url.split('?')[0]!;
      return database.transaction(ctx.churchId,ctx.actorId,async(client,member)=>{
        workflowPermission(member);
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`workflow-command:${ctx.churchId}:${ctx.actorId}:${operation}:${key}`]);
        const prior=(await client.query('SELECT * FROM study_workflow_commands WHERE church_id=$1 AND actor_id=$2 AND command=$3 AND key=$4',[ctx.churchId,ctx.actorId,operation,key])).rows[0];
        let id:string;
        if(prior){demand(prior.request_hash===requestHash,409,'idempotency_conflict','This command key was already used with different input');id=prior.run_id;}
        else{if(['','/chat','/:id/setup','/:id/prepare','/:id/discuss','/:id/confirm','/:id/retry'].includes(path))runtime();id=await action(client,member,ctx,request);await client.query('INSERT INTO study_workflow_commands(church_id,id,actor_id,command,key,request_hash,run_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[ctx.churchId,randomUUID(),ctx.actorId,operation,key,requestHash,id]);}
        return erasing?{erased:true}:workflowView(client,await workflowRun(client,ctx.churchId,id));
      });
    });
  }
  command('',async(client,member,ctx,request)=>{
    const input=z.object({seriesId:uuid,assigneeId:z.string().min(1).max(200),localTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),task:z.string().trim().min(1).max(2000),sourceText:z.string().max(262144).optional(),librarySourceId:uuid.optional(),reviewed:z.literal(true),rightsConfirmed:z.literal(true),filename:z.string().max(200).optional()}).strict().parse(request.body);
    demand(Boolean(input.sourceText)!==Boolean(input.librarySourceId),422,'one_source_required','Choose either reviewed pasted text or one reviewed library source');
    demand(!input.filename||/\.txt$/i.test(input.filename),422,'text_only','This workflow accepts UTF-8 .txt sources, not audio, video, PDF or images');
    return newWorkflow(client,member,ctx.churchId,input,clock());
  });
  command('/:id/discuss',async(client,member,ctx,request)=>{
    const input=versioned.extend({task:z.string().trim().min(1).max(2000)}).strict().parse(request.body);const run=await workflowRun(client,ctx.churchId,ctx.id!);
    demand(run.version===input.version,409,'workflow_version','A newer workflow version exists. Reload before changing direction.');await queuePlan(client,member,run,input.task);return run.id;
  });
  command('/chat',async(client,member,ctx,request)=>{
    const input=z.object({task:z.string().trim().min(1).max(2000)}).strict().parse(request.body);
    return newWorkflow(client,member,ctx.churchId,{task:input.task,assigneeId:member.userId,localTime:'08:00',clarificationOnly:true},clock());
  });
  command('/:id/setup',async(client,member,ctx,request)=>{
    const input=versioned.extend({seriesId:uuid,localTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),task:z.string().trim().max(2000).optional(),sourceText:z.string().max(262144).optional(),librarySourceId:uuid.optional(),reviewed:z.literal(true),rightsConfirmed:z.literal(true)}).strict().parse(request.body);
    demand(Boolean(input.sourceText)!==Boolean(input.librarySourceId),422,'one_source_required','Choose one reviewed source');
    const run=await workflowRun(client,ctx.churchId,ctx.id!);demand(run.version===input.version,409,'workflow_version','A newer conversation version exists. Review the latest reply.');
    await configureWorkflow(client,member,run,input);return run.id;
  });
  command('/:id/prepare',async(client,member,ctx,request)=>{
    const input=versioned.strict().parse(request.body);const run=await workflowRun(client,ctx.churchId,ctx.id!);demand(run.version===input.version,409,'workflow_version','Review the latest conversation before preparing its plan');
    await prepareConversationPlan(client,member,run);return run.id;
  });
  command('/:id/plan',async(client,member,ctx,request)=>{
    const input=versioned.extend({plan:workflowPlanSchema}).strict().parse(request.body);const run=await workflowRun(client,ctx.churchId,ctx.id!);
    demand(run.version===input.version,409,'workflow_version','A newer workflow version exists. Reload before changing direction.');await reviewPlan(client,member,run,input.plan);return run.id;
  });
  command('/:id/intent',async(client,member,ctx,request)=>{
    const input=versioned.extend({planHash:z.string().length(64),confirmed:z.literal(true),reviewedSource:z.boolean().optional()}).strict().parse(request.body);const run=await workflowRun(client,ctx.churchId,ctx.id!);
    demand(run.version===input.version,409,'workflow_version','Review the latest understanding before confirming');await confirmIntent(client,member,run,input.planHash,input.reviewedSource);return run.id;
  });
  command('/:id/confirm',async(client,member,ctx,request)=>{
    const input=versioned.extend({planHash:z.string().length(64),sourceHash:z.string().length(64),profileHash:z.string().length(64),confirmed:z.literal(true)}).strict().parse(request.body);const run=await workflowRun(client,ctx.churchId,ctx.id!);
    demand(run.version===input.version,409,'workflow_version','The plan version changed. Review it again.');await confirmWorkflow(client,member,run,input);return run.id;
  });
  command('/:id/cancel',async(client,member,ctx,request)=>{const input=versioned.strict().parse(request.body);const run=await workflowRun(client,ctx.churchId,ctx.id!);demand(input.version===run.version,409,'workflow_version','Reload the current workflow before canceling');await cancelWorkflow(client,member,run);return run.id;});
  command('/:id/retry',async(client,member,ctx,request)=>{const input=versioned.strict().parse(request.body);const run=await workflowRun(client,ctx.churchId,ctx.id!);demand(input.version===run.version,409,'workflow_version','Reload the current workflow before retrying');await retryWorkflow(client,member,run);return run.id;});
  command('/:id/erase',async(client,_member,ctx,request)=>{
    z.object({confirmed:z.literal(true)}).strict().parse(request.body);const run=await workflowRun(client,ctx.churchId,ctx.id!);
    await client.query('SELECT study_workflow_erase_run($1,$2)',[ctx.churchId,run.id]);return run.id;
  },true);
}
