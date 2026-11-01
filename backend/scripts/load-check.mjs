import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { performance } from 'node:perf_hooks';
import { Agent, request as httpRequest } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus, platform, release, totalmem } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pg from 'pg';
import { observePool, sqlProfiles } from '../tests/operations/diagnostics.mjs';

const backend = fileURLToPath(new URL('../', import.meta.url));
const digest = value => createHash('sha256').update(value).digest('hex');
const execute = promisify(execFile);

function readerRequest(origin, route, agent, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(new URL(route, origin), { agent, headers }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => {
        try { resolve({ status: response.statusCode, value: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch (error) { reject(error); }
      });
    });
    request.setTimeout(60000, () => request.destroy(new Error('Reader request timed out')));
    request.on('error', reject);
    request.end();
  });
}

export function options(args) {
  const result = { run: false, keep: false, diagnostics: false, readers: 2000, rounds: 5, timeout: 300 };
  for (const argument of args) {
    if (argument === '--run') result.run = true;
    else if (argument === '--keep-databases') result.keep = true;
    else if (argument === '--diagnostics') result.diagnostics = true;
    else {
      const match = /^--(readers|rounds|timeout)=(\d+)$/.exec(argument);
      if (!match) throw new Error(`Unknown option: ${argument}`);
      result[match[1]] = Number(match[2]);
    }
  }
  assert.ok(result.readers >= 1 && result.readers <= 4000, 'readers must be 1..4000');
  assert.ok(result.rounds >= 1 && result.rounds <= 20, 'rounds must be 1..20');
  assert.ok(result.timeout >= 30 && result.timeout <= 900, 'timeout must be 30..900 seconds');
  return result;
}

export function summary(samples, targetMs) {
  assert.ok(samples.length, 'A latency result requires samples');
  const sorted = [...samples].sort((left, right) => left - right);
  const percentile = fraction => sorted[Math.ceil(sorted.length * fraction) - 1];
  return { count: sorted.length, p50Ms: percentile(0.5), p95Ms: percentile(0.95), maxMs: sorted.at(-1), targetMs, pass: percentile(0.95) < targetMs };
}

export function localAdmin(input) {
  const url = new URL(input);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol) && url.hostname === '127.0.0.1', 'Only IPv4 loopback PostgreSQL is allowed');
  assert.equal(url.username, 'postgres', 'Use the local postgres administrator');
  assert.ok(!url.search && !url.hash, 'Database URL query options are forbidden');
  url.pathname = '/postgres';
  return url;
}

export function ownedName(name, created) {
  assert.match(name, /^gather_(load|restore)_[a-f0-9]{24}$/);
  assert.ok(created.has(name), 'Cleanup only accepts databases created by this invocation');
  return name;
}

async function migrateWithoutRoleChanges(migrate, url) {
  const OriginalClient = pg.Client;
  let skipped = 0;
  pg.Client = class extends OriginalClient {
    query(sql, ...parameters) {
      if (typeof sql === 'string' && /^(ALTER|CREATE) ROLE /i.test(sql)) {
        assert.equal(sql, "ALTER ROLE gather_runtime LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE PASSWORD 'gather_local_development'");
        skipped++;
        return super.query('SELECT 1 AS existing_runtime_role');
      }
      return super.query(sql, ...parameters);
    }
  };
  try { await migrate(url); assert.ok(skipped <= 1); return skipped; }
  finally { pg.Client = OriginalClient; }
}

async function fingerprints(client) {
  const tables = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
  const result = {};
  for (const { tablename } of tables) {
    assert.match(tablename, /^[a-z_]+$/);
    const rows = await client.query(`SELECT row_to_json(record)::text AS value FROM "${tablename}" record ORDER BY row_to_json(record)::text COLLATE "C"`);
    result[tablename] = { count: rows.rowCount, sha256: digest(rows.rows.map(row => row.value).join('\n')) };
  }
  return result;
}

async function run(settings) {
  const { register } = await import('tsx/esm/api');
  register();
  const [{ migrate }, { Database }, { buildApp }, { runLocalWork }, { capabilities }, { publishedStudies }] = await Promise.all([
    import('../src/infrastructure/migrate.ts'), import('../src/infrastructure/database.ts'),
    import('../src/app.ts'), import('../src/workers/publication.ts'), import('../src/infrastructure/seed.ts'),
    import('../src/api/core-routes.ts'),
  ]);
  process.env.NODE_ENV = 'test';
  process.env.RUNTIME_DATABASE_PASSWORD = 'gather_local_development';
  process.env.EXTERNAL_SERVICES_ENABLED = 'false';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const target = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    assert.equal(target.hostname, '127.0.0.1', 'Outbound HTTP is blocked in the operations drill');
    return originalFetch(input, init);
  };
  const adminUrl = localAdmin(process.env.OPERATIONS_ADMIN_URL ?? 'postgres://postgres@127.0.0.1:54329/postgres');
  const identifier = randomUUID().replaceAll('-', '').slice(0, 24);
  const name = `gather_load_${identifier}`;
  const restoreName = `gather_restore_${identifier}`;
  const created = new Set();
  const artifacts = path.join(backend, 'tests/operations/results', identifier);
  await mkdir(artifacts, { recursive: true });
  const report = {
    runId: identifier, startedAt: new Date().toISOString(), status: 'incomplete',
    envelope: { tenants: 20, membersPerTenant: 500, editorsPerTenant: 2, studiesPerTenant: 3, extraPendingRecoveryStudiesPerTenant: 1, readersPerBurst: settings.readers, readBursts: 2, saveChains: 40, savesPerChain: settings.rounds },
    fullReaderEnvelope: settings.readers >= 2000,
    environment: { node: process.version, os: `${platform()} ${release()}`, cpu: cpus()[0]?.model, logicalCpus: cpus().length, memoryBytes: totalmem(), databaseSourceSha256: digest(await readFile(path.join(backend, 'src/infrastructure/database.ts'))) },
    databases: [name, restoreName], metrics: {}, errors: [],
    limits: ['Single host with HTTP client, API and PostgreSQL sharing resources', 'Synthetic sessions bypass OIDC issuance; real authentication, CSRF, membership and RLS execute', 'Controlled due clock; publication includes worker/database and HTTP visibility, excludes production polling delay', 'No cloud availability, regional RPO/RTO, external object/key recovery, SMS/AI throughput or accessibility proof'],
  };
  const root = new pg.Client({ connectionString: adminUrl.href, query_timeout: 15000 });
  let administrative, restored, database, restoredDatabase, app, restoredApp, sampling;
  const readers = [];
  const started = performance.now();
  const deadline = setTimeout(() => {
    report.status = 'timeout';
    report.errors.push('Hard time limit reached; inspect and manually clean listed owned databases');
    writeFile(path.join(artifacts, 'report.json'), JSON.stringify(report, null, 2)).finally(() => process.exit(2));
  }, settings.timeout * 1000);
  const runtimeUrl = databaseName => {
    const url = new URL(adminUrl); url.pathname = `/${databaseName}`;
    url.username = 'gather_runtime'; url.password = 'gather_local_development'; return url.href;
  };
  const privilegedUrl = databaseName => { const url = new URL(adminUrl); url.pathname = `/${databaseName}`; return url.href; };
  try {
    await root.connect();
    report.environment.postgres = (await root.query('SELECT version() AS version')).rows[0].version;
    report.environment.connectionBudget = (await root.query("SELECT current_setting('max_connections')::integer AS maximum,current_setting('superuser_reserved_connections')::integer AS superuser_reserved,(SELECT count(*)::integer FROM pg_stat_activity) AS currently_used")).rows[0];
    const role = (await root.query("SELECT rolsuper,rolbypassrls,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname='gather_runtime'")).rows[0];
    assert.deepEqual(role, { rolsuper: false, rolbypassrls: false, rolcreatedb: false, rolcreaterole: false });
    const roleBefore = (await root.query("SELECT * FROM pg_authid WHERE rolname='gather_runtime'")).rows[0];
    await root.query(`CREATE DATABASE ${name}`); created.add(name);
    report.suppressedLegacyRoleStatements = await migrateWithoutRoleChanges(migrate, privilegedUrl(name));
    administrative = new pg.Client({ connectionString: privilegedUrl(name) }); await administrative.connect();
    database = new Database(runtimeUrl(name)); await database.assertRuntime();
    report.environment.runtimePoolMax = database.pool.options.max;
    assert.ok(database.pool.options.max <= 40, 'Benchmark pool must not exceed 40');
    const budget = report.environment.connectionBudget;
    assert.ok(budget.currently_used + database.pool.options.max + budget.superuser_reserved + 10 <= budget.maximum, 'Insufficient global PostgreSQL connection headroom including a ten-connection reserve');
    const observer = settings.diagnostics ? observePool(database.pool) : undefined;
    if (observer) sampling = setInterval(observer.sample, 10);
    await database.pool.query('SELECT 1');
    let clock = new Date();
    const due = new Date(Math.ceil((Date.now() + 120000) / 60000) * 60000);
    const dueLater = new Date(due.getTime() + 60000);
    const recoveryDue = new Date(dueLater.getTime() + 60000);
    app = await buildApp({ database, clock: () => clock, settings: {
      production: false, databaseUrl: runtimeUrl(name), issuer: 'http://127.0.0.1:1', appOrigin: 'http://127.0.0.1',
      clientId: 'gather-local', callbackUrl: 'http://127.0.0.1/v1/auth/callback', port: 0,
    } });
    const origin = await app.listen({ host: '127.0.0.1', port: 0 });
    const tenants = [];
    const session = async userId => {
      const token = randomUUID(), csrf = randomUUID();
      await administrative.query("INSERT INTO auth_sessions(token_hash,user_id,display_name,csrf_token,expires_at) VALUES($1,$2,$2,$3,now()+interval '1 hour')", [digest(token), userId, csrf]);
      return { cookie: `gather_session=${token}`, 'x-csrf-token': csrf };
    };
    for (let index = 0; index < 20; index++) {
      const tenant = { id: randomUUID(), slug: `load-${index}`, contributorId: `${index}-contributor`, members: [], editors: [] };
      await administrative.query("INSERT INTO churches(id,slug,name,time_zone,reading_policy) VALUES($1,$2,$2,'UTC','public')", [tenant.id, tenant.slug]);
      for (const persona of ['contributor', 'pastor']) {
        const userId = `${index}-${persona}`;
        await administrative.query('INSERT INTO memberships(church_id,user_id,display_name,capabilities) VALUES($1,$2,$2,$3)', [tenant.id, userId, capabilities[persona]]);
        tenant[persona] = await session(userId);
      }
      await administrative.query("INSERT INTO memberships(church_id,user_id,display_name) SELECT $1,$2||number,'Fictional member '||number FROM generate_series(0,499) number", [tenant.id, `member-${index}-`]);
      await administrative.query("INSERT INTO consent(church_id,id,user_id,channel,status,evidence) SELECT church_id,gen_random_uuid(),user_id,'web','granted','{\"source\":\"fictional-load-fixture\"}'::jsonb FROM memberships WHERE church_id=$1 AND capabilities='{}'", [tenant.id]);
      for (let member = 0; member < 100; member++) tenant.members.push(await session(`member-${index}-${member}`));
      tenants.push(tenant);
    }
    const request = async (tenant, persona, method, route, body, etag, expected = 200) => {
      const response = await fetch(`${origin}/v1/churches/${tenant.id}${route}`, {
        method, headers: { ...tenant[persona], 'content-type': 'application/json', 'idempotency-key': randomUUID(), ...(etag ? { 'if-match': etag } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: globalThis.AbortSignal.timeout(60000),
      });
      const value = await response.json();
      assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(value)}`); return value;
    };
    const planPayload = { schemaVersion: 1, title: 'Fictional load plan', primaryScripture: { reference: 'John 6:68', translation: null }, learningObjective: 'Read the context', outline: ['Read', 'Discuss'], discussionQuestion: 'What does Peter say?', notes: 'Fictional church-owned source', extensions: [] };
    const contentPayload = { schemaVersion: 1, title: 'Fictional study', body: 'Fictional locally authored reading. '.repeat(100), reflection: 'Read in context.', discussionQuestion: 'What happens?', application: 'Discuss together.', references: ['John 6:68'], outboundPreview: 'A study is ready.' };
    async function newPlan(tenant, intended) {
      const calendar = { localDate: intended.toISOString().slice(0, 10), localTime: intended.toISOString().slice(11, 16), timeZone: 'UTC' };
      const slot = await request(tenant, 'contributor', 'POST', `/series/${tenant.seriesId}/slots`, { ...calendar, assigneeIds: [tenant.contributorId] }, undefined, 201);
      return { plan: await request(tenant, 'contributor', 'GET', `/plans/${slot.planId}`), calendar };
    }
    async function approve(tenant, kind, aggregate) {
      const submitted = await request(tenant, 'contributor', 'POST', `/${kind}/${aggregate.id}/submit`, { revisionId: aggregate.headRevisionId }, aggregate.etag);
      return request(tenant, 'pastor', 'POST', `/${kind}/${aggregate.id}/decisions`, { revisionId: submitted.headRevisionId, expectedHash: submitted.head.hash, decision: 'approve', reason: 'Reviewed exact fictional revision' }, submitted.etag, 201);
    }
    console.log('Preparing 20 tenants, 10,000 members, 60 load schedules, 20 recovery schedules and 40 independent save chains');
    const prepared = await Promise.allSettled(tenants.map(async tenant => {
      const sermon = await request(tenant, 'contributor', 'POST', '/sermons', { title: 'Fictional source', preachedDate: due.toISOString().slice(0, 10), speaker: 'Fixture', passages: ['John 6:68'], notes: `Owned fictional source for ${tenant.slug}` }, undefined, 201);
      const series = await request(tenant, 'contributor', 'POST', '/series', { title: 'Local capacity fixture', weekAnchor: due.toISOString().slice(0, 10), timeZone: 'UTC', sermonIds: [sermon.id] }, undefined, 201);
      tenant.seriesId = series.id;
      for (let study = 0; study < 4; study++) {
        let { plan, calendar } = await newPlan(tenant, study === 0 ? due : study === 3 ? recoveryDue : dueLater);
        plan = await request(tenant, 'contributor', 'POST', `/plans/${plan.id}/revisions`, { baseRevisionId: plan.headRevisionId, payload: planPayload }, plan.etag, 201);
        plan = await approve(tenant, 'plans', plan);
        let content = await request(tenant, 'contributor', 'POST', `/plans/${plan.id}/content`, { planApprovalId: plan.approvalId, mode: 'manual' }, plan.etag, 201);
        content = await request(tenant, 'contributor', 'POST', `/content/${content.id}/revisions`, { baseRevisionId: content.headRevisionId, planApprovalId: plan.approvalId, payload: contentPayload }, content.etag, 201);
        content = await approve(tenant, 'content', content);
        await request(tenant, 'pastor', 'POST', `/content/${content.id}/schedules`, { revisionId: content.headRevisionId, approvalId: content.approvalId, ...calendar }, content.etag, 201);
      }
      for (let editor = 0; editor < 2; editor++) tenant.editors.push((await newPlan(tenant, dueLater)).plan);
    }));
    const preparationFailure = prepared.find(result => result.status === 'rejected');
    if (preparationFailure) throw preparationFailure.reason;
    await administrative.query('ANALYZE');
    clock = due; await runLocalWork(database, clock);
    assert.equal(Number((await administrative.query('SELECT count(*) FROM publications')).rows[0].count), 20);
    if (settings.diagnostics) report.sqlProfiles = await sqlProfiles(database, tenants[0], publishedStudies, digest(tenants[0].members[0].cookie.split('=')[1]));
    console.log(`Connecting ${settings.readers} persistent reader clients in batches of 40`);
    for (let offset = 0; offset < settings.readers; offset += 40) {
      await Promise.all(Array.from({ length: Math.min(40, settings.readers - offset) }, async () => {
        const agent = new Agent({ keepAlive: true, maxSockets: 1, maxFreeSockets: 1 });
        readers.push(agent);
        const response = await readerRequest(origin, '/health/live', agent);
        assert.equal(response.status, 200);
      }));
    }
    report.environment.readerConnections = 'One preconnected keepalive HTTP/1.1 socket per reader; staged setup excluded from latency';
    const readBurst = async authenticated => {
      const samples = [], failures = [];
      const begin = performance.now();
      await Promise.all(Array.from({ length: settings.readers }, async (_, index) => {
        const tenant = tenants[index % 20];
        const since = performance.now();
        try {
          const target = authenticated ? `/v1/churches/${tenant.id}/studies` : `/v1/public/churches/${tenant.slug}/studies`;
          const { status, value } = await readerRequest(origin, target, readers[index], authenticated ? tenant.members[Math.floor(index / 20) % 100] : {});
          assert.equal(status, 200);
          assert.ok(value.items.length >= 1 && value.items.every(item => item.churchId === tenant.id && item.payload.body === contentPayload.body));
        } catch (error) { failures.push(`${error.message}${error.cause?.code ? ` (${error.cause.code})` : ''}`); }
        finally { samples.push(performance.now() - since); }
      }));
      return { ...summary(samples, 500), pass: failures.length === 0 && summary(samples, 500).pass, errors: failures.length, errorExamples: failures.slice(0, 3), durationMs: performance.now() - begin, offeredConcurrency: settings.readers };
    };
    const saveLoad = async () => {
      const samples = [], failures = [];
      await Promise.all(tenants.flatMap(tenant => tenant.editors.map(async initial => {
        let plan = initial;
        for (let round = 0; round < settings.rounds; round++) {
          const since = performance.now();
          try {
            plan = await request(tenant, 'contributor', 'POST', `/plans/${plan.id}/revisions`, { baseRevisionId: plan.headRevisionId, payload: { ...planPayload, notes: `Save ${round}: ${'Fictional draft. '.repeat(100)}` } }, plan.etag, 201);
            assert.equal(plan.head.payload.notes.startsWith(`Save ${round}:`), true);
          } catch (error) { failures.push(`${error.message}${error.cause?.code ? ` (${error.cause.code})` : ''}`); }
          finally { samples.push(performance.now() - since); }
        }
      })));
      return { ...summary(samples, 1000), pass: failures.length === 0 && summary(samples, 1000).pass, errors: failures.length, errorExamples: failures.slice(0, 3) };
    };
    const publicationLoad = async () => {
      const since = performance.now();
      await runLocalWork(database, dueLater);
      const observed = await Promise.all(tenants.map(async tenant => {
        const response = await fetch(`${origin}/v1/public/churches/${tenant.slug}/studies`, { signal: globalThis.AbortSignal.timeout(60000) });
        assert.equal(response.status, 200); assert.equal((await response.json()).items.length, 3);
        return performance.now() - since;
      }));
      const before = await administrative.query('SELECT count(*)::integer AS count FROM publications');
      await runLocalWork(database, dueLater);
      assert.equal((await administrative.query('SELECT count(*)::integer AS count FROM publications')).rows[0].count, 60);
      assert.equal(before.rows[0].count, 60);
      return { ...summary(observed.flatMap(value => [value, value]), 60000), dueOccurrences: 40, observedTenants: 20, observation: 'Conservative shared visibility time for each pair of occurrences in a tenant', duplicateReplay: 'no additional publications', clock: 'controlled due instant plus measured elapsed time; no scheduler polling' };
    };
    console.log('Starting 2,000-reader envelope with concurrent saves and publication (custom reader count is reported)');
    clock = dueLater;
    observer?.start('authenticatedBurstWithSavesAndPublication');
    const workloads = await Promise.allSettled([readBurst(true), saveLoad(), publicationLoad()]);
    for (const [index, metric] of ['authenticatedReads', 'saves', 'publication'].entries()) {
      if (workloads[index].status === 'fulfilled') report.metrics[metric] = workloads[index].value;
    }
    const workloadFailure = workloads.find(result => result.status === 'rejected');
    if (workloadFailure) throw workloadFailure.reason;
    if (observer) report.poolDiagnostics = observer.stop(summary);
    observer?.start('publicBurst');
    report.metrics.publicReads = await readBurst(false);
    if (observer) report.poolDiagnostics = observer.stop(summary);
    assert.equal(Number((await administrative.query('SELECT count(*) FROM sources')).rows[0].count), 20);
    console.log('Benchmark complete; backing up and restoring database plus embedded source payloads');
    const backupStart = performance.now();
    const before = await fingerprints(administrative);
    const sources = (await administrative.query('SELECT church_id,id,sermon_id,rights,provenance,payload FROM sources ORDER BY church_id,id')).rows;
    const sourcesFile = path.join(artifacts, 'sources.json');
    await writeFile(sourcesFile, JSON.stringify(sources));
    const dumpFile = path.join(artifacts, 'database.dump');
    const bin = process.env.OPERATIONS_PG_BIN ?? (platform() === 'win32' ? 'C:/Program Files/PostgreSQL/17/bin' : '');
    const binary = name => bin ? path.join(bin, `${name}${platform() === 'win32' ? '.exe' : ''}`) : name;
    const commandOptions = { timeout: 60000, windowsHide: true, maxBuffer: 1024 * 1024 };
    await execute(binary('pg_dump'), ['--no-password', '--format=custom', '--file', dumpFile, '--dbname', privilegedUrl(name)], commandOptions);
    const backupMs = performance.now() - backupStart;
    const recoveryStart = performance.now();
    await root.query(`CREATE DATABASE ${restoreName}`); created.add(restoreName);
    await execute(binary('pg_restore'), ['--no-password', '--exit-on-error', '--single-transaction', '--dbname', privilegedUrl(restoreName), dumpFile], commandOptions);
    restored = new pg.Client({ connectionString: privilegedUrl(restoreName) }); await restored.connect();
    assert.deepEqual(await fingerprints(restored), before, 'All table counts and row hashes must survive restore');
    const recoveredSources = (await restored.query('SELECT church_id,id,sermon_id,rights,provenance,payload FROM sources ORDER BY church_id,id')).rows;
    assert.equal(digest(JSON.stringify(recoveredSources)), digest(await readFile(sourcesFile)));
    assert.equal((await restored.query("SELECT count(*)::integer AS invalid FROM revisions WHERE hash<>encode(digest(canonical_bytes,'sha256'),'hex')")).rows[0].invalid, 0);
    restoredDatabase = new Database(runtimeUrl(restoreName)); await restoredDatabase.assertRuntime();
    assert.equal((await restoredDatabase.pool.query('SELECT id FROM sources')).rowCount, 0);
    for (const tenant of tenants) {
      await restoredDatabase.transaction(tenant.id, `${tenants.indexOf(tenant)}-contributor`, async client => {
        const rows = (await client.query('SELECT church_id FROM sources')).rows;
        assert.equal(rows.length, 1); assert.ok(rows.every(row => row.church_id === tenant.id));
      });
    }
    const forced = await restored.query("SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND (c.relname='churches' OR EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='church_id')) AND NOT(c.relrowsecurity AND c.relforcerowsecurity)");
    assert.equal(forced.rowCount, 0);
    assert.equal(Number((await restored.query("SELECT count(*) FROM schedules WHERE status='pending'")).rows[0].count), 20);
    await runLocalWork(restoredDatabase, recoveryDue);
    await runLocalWork(restoredDatabase, recoveryDue);
    assert.equal(Number((await restored.query('SELECT count(*) FROM publications')).rows[0].count), 80);
    restoredApp = await buildApp({ database: restoredDatabase, clock: () => recoveryDue, settings: {
      production: false, databaseUrl: runtimeUrl(restoreName), issuer: 'http://127.0.0.1:1', appOrigin: 'http://127.0.0.1',
      clientId: 'gather-local', callbackUrl: 'http://127.0.0.1/v1/auth/callback', port: 0,
    } });
    const restoredOrigin = await restoredApp.listen({ host: '127.0.0.1', port: 0 });
    for (const tenant of tenants) {
      const value = await requestRestored(tenant);
      assert.equal(value.items.length, 4);
      assert.ok(value.items.every(item => item.churchId === tenant.id && item.payload.body === contentPayload.body));
    }
    async function requestRestored(tenant) {
      const response = await fetch(`${restoredOrigin}/v1/churches/${tenant.id}/studies`, { headers: tenant.members[0], signal: globalThis.AbortSignal.timeout(60000) });
      assert.equal(response.status, 200); return response.json();
    }
    const roleAfter = (await root.query("SELECT * FROM pg_authid WHERE rolname='gather_runtime'")).rows[0];
    assert.ok(digest(JSON.stringify(roleAfter)) === digest(JSON.stringify(roleBefore)), 'Runtime role catalog changed during run; values redacted. This drill does not issue role mutations.');
    report.recovery = { pass: true, backupMs, restoreAndValidateMs: performance.now() - recoveryStart, tables: before, sourceCount: sources.length, sourceSnapshotSha256: digest(await readFile(sourcesFile)), dumpSha256: digest(await readFile(dumpFile)), rlsTenantsChecked: 20, authenticatedApiTenantsChecked: 20, recoveredPendingOccurrences: 20, recoveryReplay: '80 total publications after two sweeps; no duplicates', runtimeRoleUnchanged: true, scope: 'Quiescent logical snapshot; all implemented sources are embedded JSON in PostgreSQL. Sidecar verifies source bytes independently. Not PITR or regional RPO/RTO proof.' };
    report.status = Object.values(report.metrics).every(metric => metric.pass && !metric.errors) && report.fullReaderEnvelope ? 'pass' : 'targets_missed';
  } catch (error) {
    report.status = 'failed'; report.errors.push(error.message); console.error(error.stack);
  } finally {
    clearInterval(sampling);
    for (const agent of readers) agent.destroy();
    await restoredApp?.close().catch(error => report.errors.push(error.message));
    await app?.close().catch(error => report.errors.push(error.message));
    for (const connection of [database, restoredDatabase]) if (connection) await connection.close().catch(error => report.errors.push(error.message));
    for (const connection of [administrative, restored]) if (connection) await connection.end().catch(error => report.errors.push(error.message));
    report.cleanup = [];
    if (!settings.keep) for (const databaseName of [...created].reverse()) {
      try { await root.query(`DROP DATABASE ${ownedName(databaseName, created)}`); report.cleanup.push({ database: databaseName, dropped: true }); }
      catch (error) { report.cleanup.push({ database: databaseName, dropped: false, error: error.message }); }
    }
    await root.end().catch(error => report.errors.push(error.message));
    globalThis.fetch = originalFetch;
    clearTimeout(deadline);
    if (report.errors.length || report.cleanup.some(item => !item.dropped)) report.status = 'failed';
    report.elapsedMs = performance.now() - started;
    await writeFile(path.join(artifacts, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ status: report.status, metrics: report.metrics, recovery: report.recovery && { pass: report.recovery.pass, backupMs: report.recovery.backupMs, restoreAndValidateMs: report.recovery.restoreAndValidateMs }, errors: report.errors, report: path.join(artifacts, 'report.json') }, null, 2));
  }
  return report.status === 'pass' ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const settings = options(process.argv.slice(2));
    if (settings.run) process.exitCode = await run(settings);
    else console.log('Explicit local benchmark + restore drill: node backend/scripts/load-check.mjs --run [--readers=2000] [--rounds=5] [--timeout=300] [--keep-databases] [--diagnostics]\nDATABASE_POOL_MAX controls the validated runtime pool (default 12, range 2..40). Creates only unique gather_load_/gather_restore_ databases. Smaller reader counts cannot pass the full envelope.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
