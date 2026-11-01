// Research-only current-source harness. Run from repository root with node --import tsx.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import pg from 'pg';

process.loadEnvFile(new URL('../../../.env', import.meta.url));
assert.notEqual(process.env.NODE_ENV, 'production', 'Production environment is forbidden');
function localDb(value: string | undefined) {
  assert.ok(value, 'Explicit TEST database URL required');
  const url = new URL(value);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Database must be loopback');
  assert.equal(url.port, '54329', 'Only the designated local test PostgreSQL port is permitted');
  return url;
}
const adminUrl = localDb(process.env.TEST_MIGRATION_DATABASE_URL);
// Root .env has no TEST_DATABASE_URL in this checkout; validate the local runtime
// endpoint then replace its database name before creating any runtime pool.
const runtimeUrlSource = process.env.TEST_DATABASE_URL ? 'TEST_DATABASE_URL' : 'DATABASE_URL guarded loopback fallback';
const runtimeUrl = localDb(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL);
assert.equal(runtimeUrl.username, 'gather_runtime');
process.env.NODE_ENV = 'test';
process.env.EXTERNAL_SERVICES_ENABLED = 'false';
process.env.STUDY_COWRITER_ENABLED = 'false';
process.env.ROOTED_ENABLE_DEMO_LOGINS = 'false';
process.env.LOG_LEVEL = 'silent';
for (const key of Object.keys(process.env)) {
  if (/^(OPENAI_|AZURE_OPENAI_|PCO_|TWILIO_)/.test(key)) delete process.env[key];
}
process.env.OIDC_CLIENT_ID = 'gather-local';
delete process.env.OIDC_CLIENT_SECRET;
delete process.env.OIDC_CONTRIBUTOR_CLIENT_SECRET;
process.env.OIDC_CONTRIBUTOR_CLIENT_ID = 'gather-local';
process.env.OIDC_SUBJECT_MODE = 'sub';
delete process.env.OIDC_DISCOVERY_URL;

const ownedName = `gather_research_approval_${randomUUID().replaceAll('-', '')}`;
assert.match(ownedName, /^gather_research_approval_[a-f0-9]{32}$/);
const admin = new pg.Pool({ connectionString: adminUrl.href });
const ownedAdminUrl = new URL(adminUrl); ownedAdminUrl.pathname = `/${ownedName}`;
const ownedRuntimeUrl = new URL(runtimeUrl); ownedRuntimeUrl.pathname = `/${ownedName}`;
process.env.DATABASE_URL = ownedRuntimeUrl.href;
process.env.MIGRATION_DATABASE_URL = ownedAdminUrl.href;
const evidence: Record<string, any> = {
  purpose: 'Research-only current API reproduction against fictional isolated data',
  startedAt: new Date().toISOString(), database: ownedName, runtimeUrlSource,
  externalServicesEnabled: false, providerRequestsMade: 0,
  statuses: [], assertions: {}, cleanup: {}, limits: [
    'Real current API plus disposable PostgreSQL and local OIDC; no browser UI was started.',
    'No application source, tests, configuration, packages or deployment changed.',
    'Successful API/DB evidence does not prove production incident state or UI rendering.'
  ]
};
let stage = 'preflight';
let created = false;
let ownedAdmin: pg.Pool | undefined;
let database: any;
let app: any;
let issuer: any;
const sessions = new Map<string, { cookie: string; csrf: string }>();
const realFetch = globalThis.fetch;
const permittedOrigins = new Set<string>();
globalThis.fetch = async (input, options) => {
  const target = new URL(typeof input === 'string' || input instanceof URL ? input.toString() : input.url);
  assert.ok(permittedOrigins.has(target.origin), 'Harness blocks fetch outside its owned loopback origins');
  return realFetch(input, options);
};
async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const port = address.port;
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}
function status(label: string, response: any) {
  const body = response.json();
  evidence.statuses.push({ label, status: response.statusCode, ...(typeof body.code === 'string' ? { code: body.code } : {}) });
  return body;
}
async function request(persona: string, method: 'GET' | 'POST', path: string, payload?: any, etag?: string, church = '10000000-0000-4000-8000-000000000001') {
  const session = sessions.get(persona)!;
  return app.inject({ method, url: `/v1/churches/${church}${path}`, headers: {
    cookie: session.cookie, 'x-csrf-token': session.csrf, 'idempotency-key': randomUUID(), ...(etag ? { 'if-match': etag } : {})
  }, ...(payload === undefined ? {} : { payload }) });
}
async function command(label: string, persona: string, path: string, payload: any, etag: string | undefined, expected: number) {
  const response = await request(persona, 'POST', path, payload, etag);
  const body = status(label, response);
  assert.equal(response.statusCode, expected, `${label}: unexpected status`);
  return body;
}
try {
  const existingRole = await admin.query("SELECT rolcanlogin,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname='gather_runtime'");
  assert.equal(existingRole.rowCount, 1, 'Harness must not create a server-wide runtime role');
  const role = existingRole.rows[0];
  assert.ok(role.rolcanlogin && !role.rolsuper && !role.rolbypassrls && !role.rolcreatedb && !role.rolcreaterole);
  stage = 'create owned database';
  await admin.query(`CREATE DATABASE "${ownedName}"`); created = true;
  ownedAdmin = new pg.Pool({ connectionString: ownedAdminUrl.href });
  stage = 'migrate and seed owned database';
  const { migrate } = await import('../../../backend/src/infrastructure/migrate.ts');
  const { seed, graceId } = await import('../../../backend/src/infrastructure/seed.ts');
  await migrate(ownedAdminUrl.href); await seed(ownedAdminUrl.href);
  const apiPort = await freePort(); let oidcPort = await freePort(); while (oidcPort === apiPort) oidcPort = await freePort();
  const apiOrigin = `http://127.0.0.1:${apiPort}`;
  const issuerOrigin = `http://127.0.0.1:${oidcPort}`;
  permittedOrigins.add(apiOrigin); permittedOrigins.add(issuerOrigin);
  evidence.ownedLoopbackPorts = { api: apiPort, oidc: oidcPort };
  process.env.OIDC_CALLBACK_URL = `${apiOrigin}/v1/auth/callback`;
  const { startLocalIssuer } = await import('../../../backend/src/auth/local-issuer.ts');
  const { Database } = await import('../../../backend/src/infrastructure/database.ts');
  const { config } = await import('../../../backend/src/infrastructure/config.ts');
  const { buildApp } = await import('../../../backend/src/app.ts');
  stage = 'start owned API and identity';
  issuer = await startLocalIssuer(oidcPort);
  database = new Database(ownedRuntimeUrl.href);
  app = await buildApp({ database, settings: { ...config(), production: false, databaseUrl: ownedRuntimeUrl.href, issuer: issuerOrigin, discoveryUrl: undefined, appOrigin: apiOrigin, callbackUrl: process.env.OIDC_CALLBACK_URL } });
  await app.listen({ port: apiPort, host: '127.0.0.1' });
  stage = 'authenticate fictional users';
  for (const persona of ['contributor', 'admin', 'member']) {
    const jar = new Map<string, string>(); let target = `${apiOrigin}/v1/auth/login?persona=${persona}`; let complete = false;
    for (let redirects = 0; redirects < 20; redirects++) {
      const response = await fetch(target, { redirect: 'manual', headers: { cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; ') } });
      assert.ok(response.status < 400, 'Local OIDC failed');
      for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(';')[0]!; const equal = pair.indexOf('='); jar.set(pair.slice(0, equal), pair.slice(equal + 1)); }
      const location = response.headers.get('location'); assert.ok(location);
      target = new URL(location, target).href;
      if (target === `${apiOrigin}/dashboard` || target === `${apiOrigin}/c/grace`) { complete = true; break; }
    }
    assert.ok(complete, 'OIDC redirect loop failed');
    const cookie = [...jar].map(([key, value]) => `${key}=${value}`).join('; ');
    const response = await app.inject({ method: 'GET', url: '/v1/auth/session', headers: { cookie } });
    const session = status(`OIDC session ${persona}`, response); assert.equal(response.statusCode, 200); assert.equal(session.user.id, persona);
    sessions.set(persona, { cookie, csrf: session.csrfToken });
  }
  stage = 'create fictional study';
  const day = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const series = await command('create series', 'contributor', '/series', { title: 'Research-only approval loop', weekAnchor: day, timeZone: 'UTC', sermonIds: [] }, undefined, 201);
  const slot = await command('create slot', 'contributor', `/series/${series.id}/slots`, { localDate: day, localTime: '09:00', timeZone: 'UTC', assigneeIds: ['contributor'] }, undefined, 201);
  let response = await request('contributor', 'GET', `/plans/${slot.planId}`);
  let plan = status('get plan', response); assert.equal(response.statusCode, 200);
  plan = await command('save plan', 'contributor', `/plans/${plan.id}/revisions`, { baseRevisionId: plan.headRevisionId, payload: { schemaVersion: 1, title: 'Research-only hope', primaryScripture: { reference: 'John 6:68', translation: null }, learningObjective: 'Discuss the fictional sample', outline: ['Read passage', 'Discuss context'], discussionQuestion: 'What does Peter say?', notes: 'Fictional church-authored research fixture', extensions: [] } }, plan.etag, 201);
  plan = await command('submit plan', 'contributor', `/plans/${plan.id}/submit`, { revisionId: plan.headRevisionId }, plan.etag, 200);
  plan = await command('admin approves plan', 'admin', `/plans/${plan.id}/decisions`, { revisionId: plan.headRevisionId, expectedHash: plan.head.hash, decision: 'approve', reason: 'Fictional plan approval' }, plan.etag, 201);
  let content = await command('create content', 'contributor', `/plans/${plan.id}/content`, { planApprovalId: plan.approvalId, mode: 'manual' }, plan.etag, 201);
  const contentPayload = { schemaVersion: 1, title: 'Research-only words of hope', body: 'Read John 6:60–69 in context.', reflection: 'Consider the fictional study.', discussionQuestion: 'What does Peter say?', application: 'Read the passage together.', references: ['John 6:68'], outboundPreview: 'Fictional research sample.' };
  content = await command('save content', 'contributor', `/content/${content.id}/revisions`, { baseRevisionId: content.headRevisionId, planApprovalId: plan.approvalId, payload: contentPayload }, content.etag, 201);
  const contributorNote = 'Fictional contributor note: please check the discussion question.';
  const reviewerReason = 'Fictional administrator reason: clarify the question before approval.';
  evidence.fictionalNotes = { contributorNote, reviewerReason };
  content = await command('submit content with note', 'contributor', `/content/${content.id}/submit`, { revisionId: content.headRevisionId, approverId: 'admin', note: contributorNote }, content.etag, 200);
  const submitted = content;
  const decision = { revisionId: content.headRevisionId, expectedHash: content.head.hash, decision: 'request_changes', reason: reviewerReason };
  stage = 'negative decisions and requested changes';
  await command('empty change reason', 'admin', `/content/${content.id}/decisions`, { ...decision, reason: '  ' }, content.etag, 422);
  await command('wrong reviewed hash', 'admin', `/content/${content.id}/decisions`, { ...decision, expectedHash: '0'.repeat(64) }, content.etag, 409);
  await command('stale version decision', 'admin', `/content/${content.id}/decisions`, decision, '"stale-research-version"', 412);
  content = await command('admin requests changes', 'admin', `/content/${content.id}/decisions`, decision, content.etag, 201);
  assert.equal(content.status, 'changes_requested');
  stage = 'check stored notes and author readers';
  const assignmentRows = await ownedAdmin.query('SELECT note,status,revision_id FROM study_review_requests WHERE church_id=$1 AND content_id=$2', [graceId, content.id]);
  const decisionRows = await ownedAdmin.query('SELECT reason,decision,revision_id FROM reviews WHERE church_id=$1 AND aggregate_id=$2', [graceId, content.id]);
  assert.equal(assignmentRows.rowCount, 1); assert.equal(assignmentRows.rows[0].note, contributorNote);
  assert.equal(decisionRows.rowCount, 1); assert.equal(decisionRows.rows[0].reason, reviewerReason);
  evidence.assertions.storedAssignmentNote = true; evidence.assertions.storedDecisionReason = true;
  evidence.assertions.storedBothOnSubmittedRevision = assignmentRows.rows[0].revision_id === submitted.headRevisionId && decisionRows.rows[0].revision_id === submitted.headRevisionId;
  for (const [label, path] of [['author aggregate', `/content/${content.id}`], ['author latest review request', `/content/${content.id}/review-request`], ['author comments', `/content/${content.id}/comments`]] as const) {
    response = await request('contributor', 'GET', path); const body = status(label, response); assert.equal(response.statusCode, 200);
    const serialized = JSON.stringify(body);
    evidence.assertions[label] = { keys: Object.keys(body), includesContributorNote: serialized.includes(contributorNote), includesReviewerReason: serialized.includes(reviewerReason), ...(body.request ? { requestStatus: body.request.status } : {}), ...(Array.isArray(body.items) ? { itemCount: body.items.length } : {}) };
  }
  assert.equal(evidence.assertions['author aggregate'].includesReviewerReason, false);
  assert.equal(evidence.assertions['author latest review request'].includesContributorNote, true);
  assert.equal(evidence.assertions['author latest review request'].includesReviewerReason, false);
  assert.equal(evidence.assertions['author comments'].includesReviewerReason, false);
  for (const suffix of ['', '/review-request', '/comments']) {
    response = await request('member', 'GET', `/content/${content.id}${suffix}`); status(`member denied ${suffix || 'aggregate'}`, response); assert.equal(response.statusCode, 403);
  }
  response = await request('contributor', 'GET', `/content/${content.id}`, undefined, undefined, '10000000-0000-4000-8000-000000000002');
  status('cross-church author denied', response); assert.equal(response.statusCode, 404);
  stage = 'same revision resubmit';
  const resubmit = await command('no-edit resubmit', 'contributor', `/content/${content.id}/submit`, { revisionId: content.headRevisionId, approverId: 'admin', note: 'Fictional retry note' }, content.etag, 409);
  evidence.assertions.sameRevisionResubmitCode = resubmit.code;
  assert.equal(resubmit.code, '23505');
  response = await request('contributor', 'GET', `/content/${content.id}/review-request`); const afterRetry = status('request after failed resubmit', response);
  assert.equal(afterRetry.request.note, contributorNote); assert.equal(afterRetry.request.status, 'changes_requested');
  evidence.assertions.failedResubmitPreservesOriginalNoteAndStatus = true;
  stage = 'new revision successful loop';
  content = await command('edit after changes', 'contributor', `/content/${content.id}/revisions`, { baseRevisionId: content.headRevisionId, planApprovalId: plan.approvalId, payload: { ...contentPayload, discussionQuestion: 'What does Peter call the words of Jesus?' } }, content.etag, 201);
  assert.equal(content.status, 'draft');
  content = await command('resubmit edited revision', 'contributor', `/content/${content.id}/submit`, { revisionId: content.headRevisionId, approverId: 'admin', note: 'Fictional response: discussion question clarified.' }, content.etag, 200);
  content = await command('approve edited revision', 'admin', `/content/${content.id}/decisions`, { revisionId: content.headRevisionId, expectedHash: content.head.hash, decision: 'approve', reason: 'Fictional final approval after correction.' }, content.etag, 201);
  assert.equal(content.status, 'approved');
  const retained = await ownedAdmin.query('SELECT reason FROM reviews WHERE church_id=$1 AND aggregate_id=$2 ORDER BY created_at', [graceId, content.id]);
  assert.equal(retained.rowCount, 2); assert.equal(retained.rows[0].reason, reviewerReason);
  evidence.assertions.previousChangeReasonRetainedAfterFinalApproval = true;
  evidence.assertions.newRevisionResubmitAndApprovalSuccessful = true;
  evidence.outcome = 'passed';
} catch (error) {
  evidence.outcome = 'failed'; evidence.failedStage = stage;
  evidence.failure = { name: error instanceof Error ? error.name : 'UnknownError', ...(error && typeof error === 'object' && 'code' in error && /^[A-Z0-9_]+$/i.test(String(error.code)) ? { code: String(error.code) } : {}) };
  process.exitCode = 1;
} finally {
  for (const [name, close] of [
    ['api', async () => { if (app) await app.close(); }],
    ['runtimePool', async () => { if (database) await database.close(); }],
    ['ownedAdminPool', async () => { if (ownedAdmin) await ownedAdmin.end(); }],
    ['oidc', async () => { if (issuer) await new Promise<void>((resolve, reject) => issuer.close((error: Error | undefined) => error ? reject(error) : resolve())); }]
  ] as const) {
    try { await close(); evidence.cleanup[name] = 'closed'; } catch { evidence.cleanup[name] = 'failed'; process.exitCode = 1; }
  }
  try {
    if (created) {
      assert.equal(ownedAdminUrl.pathname, `/${ownedName}`);
      assert.match(ownedName, /^gather_research_approval_[a-f0-9]{32}$/);
      await admin.query(`DROP DATABASE "${ownedName}"`);
      const absent = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [ownedName]); assert.equal(absent.rowCount, 0);
      evidence.cleanup.ownedDatabase = 'dropped and absence verified';
    } else evidence.cleanup.ownedDatabase = 'not created';
  } catch { evidence.cleanup.ownedDatabase = 'failed'; process.exitCode = 1; }
  await admin.end(); globalThis.fetch = realFetch;
  evidence.finishedAt = new Date().toISOString();
  await writeFile(new URL('./approval-roundtrip.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ outcome: evidence.outcome, failedStage: evidence.failedStage, statuses: evidence.statuses, cleanup: evidence.cleanup }));
}
