import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { authenticate, csrf } from '../auth/routes.js';
import type { config } from '../infrastructure/config.js';
import type { Database, Membership } from '../infrastructure/database.js';
import { idempotentCommand, type CommandResult } from './commands.js';

export function tenantRoutes(app:FastifyInstance,database:Database,settings:ReturnType<typeof config>,access:'member'|'contributor'='contributor') {
  type Context = {client:PoolClient;member:Membership;churchId:string;request:FastifyRequest;id?:string};
  const parse = (request:FastifyRequest) => z.object({churchId:z.string().uuid(),id:z.string().uuid().optional()}).parse(request.params);
  const prefix='/v1/churches/:churchId';
  return {
    get(path:string,action:(context:Context)=>Promise<unknown>) {
      app.get(prefix+path,async(request,reply)=>{
        const session=await authenticate(database,request,access);const params=parse(request);
        return database.transaction(params.churchId,session.userId,async(client,member)=>{
          const result=await action({client,member,request,...params});
          if(result&&typeof result==='object'&&'etag' in result)reply.header('ETag',String(result.etag));
          return result;
        },session);
      });
    },
    command(path:string,action:(context:Context)=>Promise<CommandResult>,method:'POST'|'PUT'='POST') {
      app.route({method,url:prefix+path,handler:async(request,reply)=>{
        const session=await authenticate(database,request,access);csrf(request,session,settings.appOrigin);const params=parse(request);
        const result=await database.transaction(params.churchId,session.userId,(client,member)=>idempotentCommand(client,request,params.churchId,session.userId,()=>action({client,member,request,...params})),session);
        if(result.etag)reply.header('ETag',result.etag);
        return reply.code(result.status).send(result.body);
      }});
    },
  };
}
