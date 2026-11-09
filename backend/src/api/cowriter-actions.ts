import type { PoolClient } from 'pg';
import { z } from 'zod';
import { demand } from './errors.js';
import { aggregateDto, loadAggregate, requireEditor } from '../modules/editorial.js';
import { saveRevision } from '../modules/save-revision.js';
import { everPublished, lockStudy, moveStudy, slotEtag } from '../modules/study-lifecycle.js';
import { resolveKjv } from '../integrations/kjv.js';
import type { Membership } from '../infrastructure/database.js';

export const actionInput = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('full_kjv'), contentId: z.string().uuid(), baseRevisionId: z.string().uuid() }).strict(),
  z.object({ kind: z.literal('move'), slotId: z.string().uuid(), slotEtag: z.string(), destinationDate: z.iso.date() }).strict(),
]);
export type CowriterAction = z.infer<typeof actionInput>;

export async function previewCowriterAction(client: PoolClient, member: Membership, churchId: string, action: CowriterAction) {
  if (action.kind === 'full_kjv') {
    const aggregate = await loadAggregate(client, churchId, action.contentId, 'content');
    await requireEditor(client, aggregate, member);
    demand(aggregate.head_revision_id === action.baseRevisionId, 409, 'base_revision_changed', 'The study changed. Reload it before reviewing this action.');
    const current = await aggregateDto(client, aggregate);
    const payload = current.head?.payload as { title?: string; references?: string[]; scriptureReading?: unknown } | undefined;
    const reading = payload?.references?.map(resolveKjv).find(Boolean);
    demand(reading, 422, 'kjv_reference_required', 'Add a supported KJV passage reference to this study before requesting its full text.');
    demand(!payload?.scriptureReading, 409, 'kjv_already_present', 'This study already has a verified full KJV reading. If readers cannot see it, inspect the published revision.');
    return { kind: action.kind, studyId: action.contentId, title: payload?.title ?? 'Untitled study', reference: reading.reference, verses: reading.verses, alreadyPresent: Boolean(payload?.scriptureReading), baseRevisionId: action.baseRevisionId };
  }
  const { slot, content } = await lockStudy(client, churchId, action.slotId);
  demand(slotEtag(slot) === action.slotEtag, 409, 'study_changed', 'The study date changed. Reload before reviewing this move.');
  demand(!slot.deleted_at && !slot.withdrawn_at, 404, 'study_unavailable', 'The selected study is unavailable.');
  demand(member.capabilities.includes('series:manage'), 403, 'forbidden', 'Moving a study requires series management access.');
  const from = slot.local_date.toISOString().slice(0, 10);
  demand(from !== action.destinationDate, 422, 'same_date', 'This study is already on the requested date.');
  demand(!(await everPublished(client, churchId, action.slotId)), 409, 'published_study_date_immutable', 'Published studies cannot be moved; create a new study for the destination date.');
  demand(!(await client.query('SELECT 1 FROM slots WHERE church_id=$1 AND local_date=$2 AND id<>$3 AND deleted_at IS NULL AND withdrawn_at IS NULL', [churchId, action.destinationDate, action.slotId])).rowCount, 409, 'date_conflict', 'Another study already uses that church date.');
  return { kind: action.kind, studyId: action.slotId, from, to: action.destinationDate, contentTitles: content.length, slotEtag: action.slotEtag, consequence: 'Moving the study cancels pending delivery and renews final approval.' };
}

export async function applyCowriterAction(client: PoolClient, member: Membership, churchId: string, action: CowriterAction) {
  await previewCowriterAction(client, member, churchId, action);
  if (action.kind === 'full_kjv') {
    const aggregate = await loadAggregate(client, churchId, action.contentId, 'content', true);
    const current = await aggregateDto(client, aggregate);
    const payload = current.head!.payload as Record<string, unknown>;
    const reading = ((payload.references as string[]) ?? []).map(resolveKjv).find(Boolean);
    demand(reading, 422, 'kjv_reference_required', 'The study no longer has a supported KJV reference.');
    return { kind: action.kind, study: await saveRevision(client, aggregate, member, { baseRevisionId: action.baseRevisionId, payload: { ...payload, scriptureReading: { ...reading, featuredVerse: reading.verses[0]!.number } } }) };
  }
  const { slot } = await lockStudy(client, churchId, action.slotId);
  return { kind: action.kind, study: await moveStudy(client, member, churchId, action.slotId, action.slotEtag, { localDate: action.destinationDate, localTime: slot.local_time, timeZone: slot.time_zone }) };
}
