import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
export { planPayloadSchema, contentPayloadSchema } from '../../contracts/payloads.js';
export const blankPlan = () => ({ schemaVersion: 1, title: '', primaryScripture: { reference: '', translation: null }, learningObjective: '', outline: [], discussionQuestion: '', notes: '', extensions: [] });
export const blankContent = () => ({ schemaVersion: 1, title: '', body: '', reflection: '', discussionQuestion: '', application: '', references: [], outboundPreview: '' });

export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
}
export const hash = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

export async function insertRevision(client: PoolClient, input: {
  churchId: string; aggregateId: string; kind: string; number: number; authorId: string;
  payload: unknown; calendar: unknown; planApprovalId?: string | null; planHash?: string | null; sourceSnapshot?: unknown[] | null;
}) {
  const id = randomUUID();
  let sourceSnapshot:unknown[];
  if(input.sourceSnapshot) {
    sourceSnapshot=input.sourceSnapshot;
  } else if(input.planApprovalId) {
    const dependency=await client.query('SELECT revisions.source_snapshot FROM approvals JOIN revisions ON revisions.church_id=approvals.church_id AND revisions.id=approvals.revision_id WHERE approvals.church_id=$1 AND approvals.id=$2',[input.churchId,input.planApprovalId]);
    sourceSnapshot=dependency.rows[0]?.source_snapshot??[];
  } else {
    const sources=await client.query(`SELECT sources.id,sources.sermon_id,sources.kind,sources.payload,sources.rights FROM sources
      JOIN series_sermons ON series_sermons.church_id=sources.church_id AND series_sermons.sermon_id=sources.sermon_id
      JOIN slots ON slots.church_id=series_sermons.church_id AND slots.series_id=series_sermons.series_id
      JOIN aggregates ON aggregates.church_id=slots.church_id AND aggregates.slot_id=slots.id
      WHERE aggregates.church_id=$1 AND aggregates.id=$2 ORDER BY sources.id`,[input.churchId,input.aggregateId]);
    sourceSnapshot=sources.rows.map(source=>({id:source.id,sermonId:source.sermon_id,kind:source.kind,payloadHash:hash(canonical(source.payload)),rights:source.rights}));
  }
  const envelope = { schemaVersion: 2, churchId: input.churchId, aggregateId: input.aggregateId, kind: input.kind,
    number: input.number, authorId: input.authorId, payload: input.payload, calendar: input.calendar,
    planApprovalId: input.planApprovalId ?? null, planHash: input.planHash ?? null,sourceSnapshot };
  const bytes = canonical(envelope);
  await client.query(`INSERT INTO revisions (church_id,id,aggregate_id,number,author_id,payload,calendar,canonical_bytes,hash,plan_approval_id,plan_hash,source_snapshot)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
  [input.churchId, id, input.aggregateId, input.number, input.authorId, input.payload, input.calendar, bytes, hash(bytes), input.planApprovalId ?? null, input.planHash ?? null,JSON.stringify(sourceSnapshot)]);
  return id;
}
