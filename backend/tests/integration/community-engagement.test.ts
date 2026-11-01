import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import pg from 'pg';
import { buildApp } from '../../src/app.js';
import { Database } from '../../src/infrastructure/database.js';
import { config } from '../../src/infrastructure/config.js';
import { migrate } from '../../src/infrastructure/migrate.js';
import { seed, graceId, riversideId } from '../../src/infrastructure/seed.js';
import { publicationEngagement, retireEngagementIdentifiers } from '../../src/modules/engagement.js';

type Aggregate = { id: string; etag: string; headRevisionId: string; approvalId: string; livePublicationId: string; status: string; head: { hash: string; payload: Record<string, unknown> } };

test('Rooted member conversation, reach, answers, withdrawal and permanent history lifecycle', async context => {
  const administrativeUrl = new URL(process.env.TEST_MIGRATION_DATABASE_URL ?? 'postgres://postgres@127.0.0.1:54329/gather_test');
  assert.ok(['127.0.0.1', 'localhost'].includes(administrativeUrl.hostname));
  const databaseName = `gather_129_${randomUUID().replaceAll('-', '')}`;
  administrativeUrl.pathname = '/postgres';
  const administrator = new pg.Pool({ connectionString: administrativeUrl.href });
  await administrator.query(`CREATE DATABASE "${databaseName}"`);
  administrativeUrl.pathname = `/${databaseName}`;
  const privileged = new pg.Pool({ connectionString: administrativeUrl.href });
  const runtimeUrl = new URL(administrativeUrl); runtimeUrl.username = 'gather_runtime'; runtimeUrl.password = process.env.RUNTIME_DATABASE_PASSWORD ?? 'gather_local_development';
  const database = new Database(runtimeUrl.href);
  const previousEnvironment = process.env.NODE_ENV; process.env.NODE_ENV = 'test';
  await migrate(administrativeUrl.href); await seed(administrativeUrl.href);
  if (previousEnvironment === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnvironment;
  await privileged.query("INSERT INTO memberships(church_id,user_id,display_name,capabilities) SELECT church_id,'reviewer','James Ellis',capabilities FROM memberships WHERE church_id=$1 AND user_id='contributor'", [graceId]);
  const sessions = new Map<string, string>();
  for (const user of ['contributor', 'reviewer', 'admin', 'member']) {
    const token = randomUUID(); sessions.set(user, token);
    await privileged.query("INSERT INTO auth_sessions(token_hash,user_id,display_name,csrf_token,expires_at) VALUES($1,$2,$2,'fixture-csrf',now()+interval '1 hour')", [createHash('sha256').update(token).digest('hex'), user]);
  }
  const now = new Date('2030-01-06T12:00:00Z');
  const app = await buildApp({ database, settings: { ...config(), databaseUrl: runtimeUrl.href }, clock: () => now });
  context.after(async () => { await app.close(); await database.close(); await privileged.end(); await administrator.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`); await administrator.end(); });
  const prefix = `/v1/churches/${graceId}`;
  async function call(user: string, method: 'GET' | 'POST' | 'PUT', path: string, payload?: unknown, etag?: string, key = randomUUID()) {
    return app.inject({ method, url: prefix + path, headers: { cookie: `gather_session=${sessions.get(user)}`, 'x-csrf-token': 'fixture-csrf', 'idempotency-key': key, ...(etag ? { 'if-match': etag } : {}), ...(payload === undefined ? {} : { 'content-type': 'application/json' }) }, ...(payload === undefined ? {} : { payload: JSON.stringify(payload) }) });
  }
  async function command(user: string, path: string, body: unknown, etag?: string, status = 200) {
    const response = await call(user, 'POST', path, body, etag); assert.equal(response.statusCode, status, response.body); return response.json();
  }
  let studyId = ''; let publicationId = ''; let content: Aggregate;
  await context.test('one final approval publishes without any plan approval and snapshots the member audience once', async () => {
    const series = await command('contributor', '/series', { title: 'Historical artifact', weekAnchor: '2030-01-06', timeZone: 'UTC', sermonIds: [] }, undefined, 201);
    const slot = await command('contributor', `/series/${series.id}/slots`, { localDate: '2030-01-08', localTime: '08:00', timeZone: 'UTC', assigneeIds: ['contributor'] }, undefined, 201); studyId = slot.id;
    const plan = (await call('contributor', 'GET', `/plans/${slot.planId}`)).json();
    content = await command('contributor', `/plans/${plan.id}/content`, { mode: 'manual' }, plan.etag, 201);
    content = await command('contributor', `/content/${content.id}/revisions`, { baseRevisionId: content.headRevisionId, payload: { schemaVersion: 1, title: 'Words for our week', body: 'Read John 6:68 in context.', reflection: 'Consider where you place your trust.', discussionQuestion: 'What helps you trust?', application: 'Pray with a friend.', references: ['John 6:68'], outboundPreview: 'Read this week’s study.' } }, content.etag, 201);
    content = await command('contributor', `/content/${content.id}/submit`, { revisionId: content.headRevisionId, approverId: 'reviewer' }, content.etag);
    content = await command('reviewer', `/content/${content.id}/decisions`, { revisionId: content.headRevisionId, expectedHash: content.head.hash, decision: 'approve', reason: 'Reviewed the exact study.' }, content.etag, 201);
    content = await command('contributor', `/content/${content.id}/publish`, { revisionId: content.headRevisionId, approvalId: content.approvalId }, content.etag, 201); publicationId = content.livePublicationId;
    assert.ok(publicationId); assert.equal((await call('member', 'GET', `/studies/${publicationId}`)).statusCode, 200);
    const audience = await database.transaction(graceId, 'contributor', client => publicationEngagement(client, graceId, publicationId));
    assert.ok(audience.audienceMemberCount && audience.audienceMemberCount > 0); assert.equal(audience.uniqueOpens, 0);
    const count = await privileged.query('SELECT count(*)::integer AS count FROM publication_audiences WHERE publication_id=$1', [publicationId]); assert.equal(count.rows[0].count, 1);
  });
  await context.test('unique member opens exclude previews and new members do not inflate the original audience percentage', async () => {
    for (const user of ['member', 'member', 'contributor']) assert.equal((await call(user, 'POST', `/studies/${publicationId}/open`, {})).statusCode, 200);
    await privileged.query("INSERT INTO memberships(church_id,user_id,display_name) VALUES($1,'later','Later Member')", [graceId]);
    await database.transaction(graceId, 'later', client => client.query('INSERT INTO study_opens(church_id,publication_id,user_id) VALUES($1,$2,$3)', [graceId, publicationId, 'later']));
    const result = await database.transaction(graceId, 'contributor', client => publicationEngagement(client, graceId, publicationId));
    assert.equal(result.uniqueAudienceOpens, 1); assert.equal(result.uniqueOpens, 2); assert.equal(result.additionalMemberOpens, 1); assert.ok(result.openPercent! <= 100);
    const reaction = await call('member', 'PUT', `/studies/${publicationId}/my-reaction`, { type: 'thankful' }); assert.equal(reaction.statusCode, 200);
  });
  let questionId = ''; let questionEtag = ''; let replyId = '';
  await context.test('questions stay private, clear attacks auto-decline and a posted contributor reply resolves the exact question', async () => {
    await privileged.query('UPDATE churches SET discussions_enabled=true WHERE id=$1', [graceId]);
    const question = await command('member', `/studies/${publicationId}/discussion`, { body: 'How can I pray during my workday?', kind: 'question' }, undefined, 201);
    questionId = question.id; assert.equal(question.status, 'pending');
    const declined = await command('member', `/studies/${publicationId}/discussion`, { body: 'You are an idiot.', kind: 'response' }, undefined, 201); assert.equal(declined.status, 'declined');
    const other = await call('reviewer', 'GET', `/studies/${publicationId}/community`); assert.ok(!other.body.includes('You are an idiot.'));
    const own = await call('member', 'GET', `/studies/${publicationId}/community`); assert.ok(own.body.includes('You are an idiot.'));
    const approved = await command('contributor', `/moderation/${question.id}/decisions`, { decision: 'approve', reason: 'Sincere Scripture question' }, question.etag, 201); questionEtag = approved.etag;
    const before = await database.transaction(graceId, 'contributor', client => publicationEngagement(client, graceId, publicationId)); assert.equal(before.questionsNeedingAnswer, 1);
    const reply = await command('contributor', `/discussion/${question.id}/replies`, { body: 'Try a short reminder before lunch.' }, questionEtag, 201); replyId = reply.id;
    const after = await database.transaction(graceId, 'contributor', client => publicationEngagement(client, graceId, publicationId)); assert.equal(after.questionsNeedingAnswer, 0);
    assert.ok((await call('member', 'GET', `/studies/${publicationId}/community`)).body.includes('Try a short reminder before lunch.'));
    const replyHidden = await command('reviewer', `/moderation/${replyId}/decisions`, { decision: 'hide', reason: 'Revising this answer' }, reply.etag, 201); assert.equal(replyHidden.status, 'hidden');
    const reopened = await database.transaction(graceId, 'contributor', client => publicationEngagement(client, graceId, publicationId)); assert.equal(reopened.questionsNeedingAnswer, 1);
    const listed = (await call('contributor', 'GET', `/engagement/studies/${publicationId}/comments?filter=unanswered`)).json(); assert.equal(listed.items.length, 1); questionEtag = listed.items[0].etag;
    assert.equal((await call('member', 'POST', `/discussion/${questionId}/resolution`, { decision: 'resolve', reason: 'Not permitted' }, questionEtag)).statusCode, 403);
  });
  await context.test('reviewed privacy erasure reopens a question when its only published answer is removed', async () => {
    const question=await command('member',`/studies/${publicationId}/discussion`,{body:'What is a simple way to pray during a difficult week?',kind:'question'},undefined,201);
    const approved=await command('contributor',`/moderation/${question.id}/decisions`,{decision:'approve',reason:'A sincere member question'},question.etag,201);
    await command('reviewer',`/discussion/${question.id}/replies`,{body:'Begin with one honest sentence and ask someone to pray with you.'},approved.etag,201);
    const answered=await database.transaction(graceId,'contributor',client=>publicationEngagement(client,graceId,publicationId));
    assert.equal(answered.questionsNeedingAnswer,1);
    const request=await command('reviewer','/privacy/requests',{kind:'erasure'},undefined,202);
    const fulfillment=await command('admin',`/privacy/requests/${request.id}/fulfill`,{identityVerified:true,reason:'Verified and processed the contributor data removal request',retentionBasis:'Local test retention policy: retain exact teaching and security evidence pending named church privacy review; not a legal determination.',retentionReviewAt:new Date(Date.now()+7*24*60*60*1000).toISOString()});
    assert.equal(fulfillment.status,'completed_with_retention_review');
    const reopened=await database.transaction(graceId,'contributor',client=>publicationEngagement(client,graceId,publicationId));
    assert.equal(reopened.questionsNeedingAnswer,2);
  });
  await context.test('Dashboard metrics and engagement agree; member and foreign-tenant analytics stay protected', async () => {
    const dashboard = await call('contributor', 'GET', '/dashboard?weekStart=2030-01-06'); assert.equal(dashboard.statusCode, 200, dashboard.body);
    const result = dashboard.json(); assert.equal(result.readiness.plannedCount, 1); assert.equal(result.readiness.readyCount, 1); assert.equal(result.engagement.publicationId, publicationId); assert.equal(result.engagement.questionsNeedingAnswer, 2); assert.equal(result.engagement.reactions.thankful, 1);
    assert.equal((await call('member', 'GET', '/dashboard')).statusCode, 403);
    const foreign = await app.inject({ url: `/v1/churches/${riversideId}/dashboard`, headers: { cookie: `gather_session=${sessions.get('contributor')}` } }); assert.equal(foreign.statusCode, 404);
    const exported = (await call('member', 'GET', '/privacy/export')).json(); assert.equal(exported.studyOpens.length, 1); assert.equal(exported.publicationAudiences.length, 1);
  });
  await context.test('published artifacts forbid ordinary delete; withdrawal retains immutable history until explicitly confirmed admin Hard Delete', async () => {
    let lifecycle = (await call('contributor', 'GET', `/slots/${studyId}/lifecycle`)).json();
    const forbidden = await call('admin', 'POST', `/slots/${studyId}/delete`, { reason: 'Cannot ordinary delete a publication' }, lifecycle.etag); assert.equal(forbidden.statusCode, 409, forbidden.body);
    assert.equal((await call('admin', 'POST', `/slots/${studyId}/hard-delete`, { confirmation: `PERMANENTLY DELETE ${studyId}`, reason: 'Fixture only' }, lifecycle.etag)).statusCode, 409);
    await command('contributor', `/slots/${studyId}/withdraw`, { reason: 'Retain this exact historical artifact' }, lifecycle.etag);
    assert.equal((await call('member', 'GET', `/studies/${publicationId}`)).statusCode, 404);
    const retained = await call('admin', 'GET', `/engagement/studies/${publicationId}`); assert.equal(retained.statusCode, 200, retained.body); assert.equal(retained.json().publication.withdrawn, true); assert.equal(retained.json().publication.payload.title, 'Words for our week');
    lifecycle = (await call('admin', 'GET', `/slots/${studyId}/lifecycle`)).json();
    assert.equal((await call('contributor', 'POST', `/slots/${studyId}/hard-delete`, { confirmation: `PERMANENTLY DELETE ${studyId}`, reason: 'Fixture only' }, lifecycle.etag)).statusCode, 403);
    assert.equal((await call('admin', 'POST', `/slots/${studyId}/hard-delete`, { confirmation: 'wrong', reason: 'Fixture only' }, lifecycle.etag)).statusCode, 422);
    const purged = await command('admin', `/slots/${studyId}/hard-delete`, { confirmation: `PERMANENTLY DELETE ${studyId}`, reason: 'Explicit irreversible removal of disposable fixture' }, lifecycle.etag); assert.equal(purged.purged, true);
    assert.equal((await privileged.query('SELECT id FROM publications WHERE id=$1', [publicationId])).rowCount, 0);
    assert.equal((await privileged.query('SELECT id FROM discussions WHERE publication_id=$1', [publicationId])).rowCount, 0);
    assert.equal((await privileged.query('SELECT * FROM study_purge_audit WHERE study_id=$1', [studyId])).rowCount, 1);
    assert.equal((await privileged.query('SELECT * FROM study_opens WHERE publication_id=$1', [publicationId])).rowCount, 0);
  });
  await context.test('retention routine is tenant scoped and safe on a tenant without tracked publications', async () => {
    await database.transaction(graceId, 'contributor', client => retireEngagementIdentifiers(client, graceId, new Date('2031-01-06T12:00:00Z')));
  });
});
