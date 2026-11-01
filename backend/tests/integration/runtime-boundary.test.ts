import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { migrate } from '../../src/infrastructure/migrate.js';
import { seed, graceId, riversideId } from '../../src/infrastructure/seed.js';
import { Database } from '../../src/infrastructure/database.js';

let administrative: pg.Client;
let runtime: Database;
let riverSermon: string;
let root:pg.Client;
const databaseName=`gather_boundary_${randomUUID().replaceAll('-','')}`;

before(async () => {
  const migrationUrl = process.env.TEST_MIGRATION_DATABASE_URL;
  assert.ok(migrationUrl, 'TEST_MIGRATION_DATABASE_URL is required; real PostgreSQL cannot be skipped');
  assert.match(new URL(migrationUrl).pathname, /\/(gather_test|gather_ci_test)$/);
  const isolated=new URL(migrationUrl);
  assert.ok(['127.0.0.1','localhost'].includes(isolated.hostname));
  root=new pg.Client({connectionString:migrationUrl});await root.connect();
  await root.query(`CREATE DATABASE "${databaseName}"`);
  isolated.pathname=`/${databaseName}`;
  await migrate(isolated.href);
  await seed(isolated.href);
  administrative = new pg.Client({ connectionString: isolated.href });
  await administrative.connect();
  const runtimeUrl = new URL(isolated);
  runtimeUrl.username = 'gather_runtime';
  runtimeUrl.password = process.env.RUNTIME_DATABASE_PASSWORD!;
  runtime = new Database(runtimeUrl.href);
  await runtime.assertRuntime();
  riverSermon = randomUUID();
  await administrative.query("INSERT INTO sermons(church_id,id,title,preached_date,speaker,passages,notes) VALUES($1,$2,'Private river sermon','2026-10-18','Test','[]','Private river notes')", [riversideId, riverSermon]);
});

after(async () => {
  if (administrative && riverSermon) await administrative.query('DELETE FROM sermons WHERE church_id=$1 AND id=$2', [riversideId, riverSermon]);
  if (runtime) await runtime.close();
  if (administrative) await administrative.end();
  if(root){await root.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);await root.end();}
});

test('AC13 runtime connection is a nonowner without privileged bypass', async () => {
  const result = await runtime.pool.query<{ rolsuper: boolean; rolbypassrls: boolean; rolcreatedb: boolean; rolcreaterole: boolean }>('SELECT rolsuper,rolbypassrls,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user');
  assert.deepEqual(result.rows[0], { rolsuper: false, rolbypassrls: false, rolcreatedb: false, rolcreaterole: false });
  assert.equal((await runtime.pool.query('SELECT id FROM churches')).rowCount, 0);
  assert.equal((await runtime.pool.query('SELECT id FROM sermons')).rowCount, 0);
});

test('AC13 every tenant table forces RLS including secondary provider records', async () => {
  const result = await administrative.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(`SELECT DISTINCT tables.relname,tables.relrowsecurity,tables.relforcerowsecurity
    FROM pg_class tables JOIN pg_namespace namespaces ON namespaces.oid=tables.relnamespace
    JOIN pg_attribute columns ON columns.attrelid=tables.oid
    WHERE namespaces.nspname='public' AND tables.relkind='r' AND (columns.attname='church_id' OR tables.relname='churches')`);
  assert.ok(result.rows.length >= 25);
  for (const table of result.rows) {
    assert.equal(table.relrowsecurity, true, `${table.relname} must enable RLS`);
    assert.equal(table.relforcerowsecurity, true, `${table.relname} must force RLS`);
  }
});

test('AC13/14 tenant membership is server checked and foreign rows remain hidden', async () => {
  await runtime.transaction(graceId, 'contributor', async client => {
    assert.equal((await client.query('SELECT id FROM sermons WHERE church_id=$1 AND id=$2', [riversideId, riverSermon])).rowCount, 0);
    assert.equal((await client.query('SELECT DISTINCT church_id FROM sermons')).rows.every(row => row.church_id === graceId), true);
  });
  await assert.rejects(runtime.transaction(riversideId, 'contributor', async () => undefined), { statusCode: 404 });
});

test('AC13 cross-tenant writes, reassignment and existing-parent references fail', async () => {
  await assert.rejects(runtime.transaction(graceId, 'contributor', client => client.query("INSERT INTO sermons(church_id,id,title,preached_date,speaker,passages,notes) VALUES($1,$2,'Denied','2026-10-18','Test','[]','')", [riversideId, randomUUID()])), { code: '42501' });
  await assert.rejects(runtime.transaction(graceId, 'contributor', client => client.query("INSERT INTO sources(church_id,id,sermon_id,kind,rights,provenance,payload) VALUES($1,$2,$3,'notes','{}','{}','{}')", [graceId, randomUUID(), riverSermon])), { code: '23503' });
  const own = await administrative.query<{ id: string }>('SELECT id FROM sermons WHERE church_id=$1 LIMIT 1', [graceId]);
  assert.ok(own.rows[0]);
  await assert.rejects(runtime.transaction(graceId, 'contributor', client => client.query('UPDATE sermons SET church_id=$1 WHERE church_id=$2 AND id=$3', [riversideId, graceId, own.rows[0]!.id])), { code: '42501' });
});

test('AC13 pooled connection loses context after commit, rollback and malformed context', async () => {
  const client = await runtime.pool.connect();
  try {
    for (const ending of ['COMMIT', 'ROLLBACK']) {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.church_id',$1,true)", [graceId]);
      assert.equal((await client.query('SELECT id FROM churches')).rowCount, 1);
      await client.query(ending);
      assert.equal((await client.query('SELECT id FROM churches')).rowCount, 0);
    }
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.church_id','invalid',true)");
    await assert.rejects(client.query('SELECT id FROM churches'), { code: '22P02' });
    await client.query('ROLLBACK');
    assert.equal((await client.query('SELECT id FROM churches')).rowCount, 0);
  } finally { client.release(); }
});

test('AC13 runtime cannot create tables, truncate tenant data or alter policy', async () => {
  await assert.rejects(runtime.pool.query('CREATE TABLE forbidden_runtime_schema_change(id integer)'), { code: '42501' });
  await assert.rejects(runtime.pool.query('TRUNCATE sermons CASCADE'), { code: '42501' });
  await assert.rejects(runtime.pool.query('ALTER TABLE sermons DISABLE ROW LEVEL SECURITY'), { code: '42501' });
});
