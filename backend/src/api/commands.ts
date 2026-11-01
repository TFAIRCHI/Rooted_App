import type { FastifyRequest } from 'fastify';
import type { PoolClient } from 'pg';
import { demand } from './errors.js';
import { canonical, hash } from '../modules/revisions.js';

export interface CommandResult { status: number; body: unknown; etag?: string }

export async function idempotentCommand(client: PoolClient, request: FastifyRequest, churchId: string, actorId: string, action: () => Promise<CommandResult>): Promise<CommandResult> {
  const key = request.headers['idempotency-key'];
  demand(typeof key==='string' && key.length>=8 && key.length<=200,422,'idempotency_required','Provide a unique Idempotency-Key of 8–200 characters');
  const route = `${request.method}:${request.url.split('?')[0]}`;
  const requestHash = hash(canonical({body:request.body ?? null,ifMatch:request.headers['if-match'] ?? null}));
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${churchId}:${actorId}:${route}:${key}`]);
  const result = await client.query('SELECT * FROM idempotency WHERE church_id=$1 AND actor_id=$2 AND route=$3 AND key=$4',[churchId,actorId,route,key]);
  if (result.rowCount) {
    const previous = result.rows[0];
    demand(previous.request_hash===requestHash,409,'idempotency_conflict','The idempotency key was already used for a different request');
    return {status:previous.status,body:previous.body,etag:previous.etag ?? undefined};
  }
  const response = await action();
  await client.query('INSERT INTO idempotency(church_id,actor_id,route,key,request_hash,status,body,etag) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[churchId,actorId,route,key,requestHash,response.status,JSON.stringify(response.body),response.etag ?? null]);
  return response;
}
