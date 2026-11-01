import type { FastifyInstance } from 'fastify';
import { DateTime } from 'luxon';
import { z } from 'zod';
import type { Database } from '../infrastructure/database.js';
import { requireCapability } from '../infrastructure/database.js';
import type { config } from '../infrastructure/config.js';
import { tenantRoutes } from './tenant-boundary.js';
import { demand } from './errors.js';
import { publicationEngagement } from '../modules/engagement.js';

export async function dashboardRoutes(app: FastifyInstance, database: Database, settings: ReturnType<typeof config>, clock: () => Date) {
  const routes = tenantRoutes(app, database, settings);
  routes.get('/dashboard', async ({ client, member, churchId, request }) => {
    requireCapability(member, 'workspace:read');
    const query = z.object({ weekStart: z.iso.date().optional(), publicationId: z.string().uuid().optional() }).parse(request.query);
    const church = (await client.query('SELECT time_zone FROM churches WHERE id=$1', [churchId])).rows[0];
    const today = DateTime.fromJSDate(clock()).setZone(church.time_zone).startOf('day');
    const start = query.weekStart ? DateTime.fromISO(query.weekStart, { zone: church.time_zone }) : today.minus({ days: today.weekday % 7 });
    demand(start.isValid && start.weekday % 7 === 0, 422, 'invalid_week', 'Choose a Sunday as the week start');
    const end = start.plus({ days: 7 });
    const restricted = member.capabilities.some(capability => ['plans:edit', 'content:edit'].includes(capability)) && !member.capabilities.some(capability => ['series:manage', 'settings:manage', 'admin:manage'].includes(capability));
    const rows = (await client.query(`SELECT s.id,s.local_date,s.local_time,s.time_zone,s.series_id,c.id AS content_id,c.status,c.head_revision_id,c.approval_id,c.live_publication_id,c.payload,
      EXISTS(SELECT 1 FROM approvals a WHERE a.church_id=s.church_id AND a.id=c.approval_id AND a.revision_id=c.head_revision_id) AS valid_approval,
      (SELECT count(*)::integer FROM study_review_requests q WHERE q.church_id=s.church_id AND q.content_id=c.id AND q.revision_id=c.head_revision_id AND q.status='pending') AS review_count,
      (SELECT count(*)::integer FROM study_review_requests q WHERE q.church_id=s.church_id AND q.content_id=c.id AND q.revision_id=c.head_revision_id AND q.status='pending' AND q.approver_id=$4) AS assigned_review_count,
      EXISTS(SELECT 1 FROM schedules t WHERE t.church_id=s.church_id AND t.content_id=c.id AND t.revision_id=c.head_revision_id AND t.approval_id=c.approval_id AND t.status='pending' AND t.due_at>$5) AS future_schedule,
      EXISTS(SELECT 1 FROM schedules t WHERE t.church_id=s.church_id AND t.content_id=c.id AND t.revision_id=c.head_revision_id AND t.status IN ('blocked_approval','needs_staff_review')) AS publication_issue
      FROM slots s LEFT JOIN LATERAL (SELECT a.*,r.payload FROM aggregates a LEFT JOIN revisions r ON r.church_id=a.church_id AND r.id=a.head_revision_id WHERE a.church_id=s.church_id AND a.slot_id=s.id AND a.kind='content' ORDER BY a.created_at DESC,a.id DESC LIMIT 1) c ON true
      WHERE s.church_id=$1 AND s.local_date>=$2::date AND s.local_date<$3::date AND s.deleted_at IS NULL AND s.withdrawn_at IS NULL ${restricted ? 'AND $4=ANY(s.assignee_ids)' : ''} ORDER BY s.local_date,s.local_time,s.id`, [churchId, start.toISODate(), end.toISODate(), member.userId, clock()])).rows;
    const ready = rows.filter(row => row.valid_approval && ['approved', 'scheduled', 'published'].includes(row.status));
    const canEngage = member.capabilities.includes('engagement:read');
    const publication = canEngage ? (await client.query(`SELECT p.id,p.revision_id,p.published_at,r.payload FROM publications p JOIN aggregates a ON a.church_id=p.church_id AND a.id=p.content_id AND a.live_publication_id=p.id JOIN slots s ON s.church_id=a.church_id AND s.id=a.slot_id JOIN revisions r ON r.church_id=p.church_id AND r.id=p.revision_id WHERE p.church_id=$1 AND s.deleted_at IS NULL AND s.withdrawn_at IS NULL ${query.publicationId ? 'AND p.id=$2' : ''} ORDER BY p.published_at DESC,p.id DESC LIMIT 1`, [churchId, ...(query.publicationId ? [query.publicationId] : [])])).rows[0] : null;
    if (query.publicationId && canEngage) demand(publication, 404, 'not_found', 'Published study not found');
    return {
      week: { start: start.toISODate(), end: end.minus({ days: 1 }).toISODate(), timeZone: church.time_zone, scope: restricted ? 'Your assigned studies' : 'Church studies' },
      readiness: {
        plannedCount: rows.length,
        readyCount: ready.length,
        pendingReviewCount: rows.reduce((total, row) => total + row.review_count, 0),
        assignedReviewCount: rows.reduce((total, row) => total + row.assigned_review_count, 0),
        readyToPublishCount: ready.filter(row => !row.live_publication_id && !row.future_schedule).length,
        scheduledCount: ready.filter(row => !row.live_publication_id && row.future_schedule).length,
        publicationIssueCount: rows.filter(row => row.publication_issue).length
      },
      studies: rows.map(row => ({ studyId: row.id, contentId: row.content_id, seriesId: row.series_id, localDate: row.local_date.toISOString().slice(0, 10), localTime: row.local_time, timeZone: row.time_zone, title: row.payload?.title || 'Study not started', status: row.status || 'not_started', livePublicationId: row.live_publication_id })),
      engagement: publication ? { publicationId: publication.id, revisionId: publication.revision_id, title: publication.payload.title, publishedAt: publication.published_at, ...await publicationEngagement(client, churchId, publication.id) } : null,
      engagementAllowed: canEngage,
      asOf: clock().toISOString()
    };
  });
}
