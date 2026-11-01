import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import pg from 'pg';
import { migrate } from '../../src/infrastructure/migrate.js';
import { Database } from '../../src/infrastructure/database.js';
import { seed, graceId } from '../../src/infrastructure/seed.js';

async function isolatedDatabase(action: (url: string, client: pg.Client) => Promise<void>) {
  const configured = process.env.TEST_MIGRATION_DATABASE_URL;
  assert.ok(configured, 'Real PostgreSQL migration tests require TEST_MIGRATION_DATABASE_URL');
  assert.match(new URL(configured).pathname, /^\/(gather_test|gather_ci_test)$/);
  const name = `gather_migration_${randomUUID().replaceAll('-', '')}`;
  assert.match(name, /^gather_migration_[a-f0-9]{32}$/);
  const administrative = new pg.Client({ connectionString: configured });
  await administrative.connect();
  let created = false;
  let client: pg.Client | undefined;
  try {
    await administrative.query(`CREATE DATABASE "${name}"`);
    created = true;
    const connection = new URL(configured);
    connection.pathname = `/${name}`;
    client = new pg.Client({ connectionString: connection.href });
    await client.connect();
    await action(connection.href, client);
  } finally {
    if (client) await client.end();
    if (created) await administrative.query(`DROP DATABASE "${name}"`);
    await administrative.end();
  }
}

test('G1A migrations install an empty real database, rerun without schema drift, and detect modified history', async () => {
  await isolatedDatabase(async (url, client) => {
    await migrate(url);
    const first = await client.query('SELECT name,checksum,applied_at FROM schema_migrations ORDER BY name');
    assert.ok(first.rows.length >= 3);
    assert.ok(first.rows.every(row => /^[a-f0-9]{64}$/.test(row.checksum)));
    await migrate(url);
    assert.deepEqual((await client.query('SELECT name,checksum,applied_at FROM schema_migrations ORDER BY name')).rows, first.rows);
    assert.equal((await client.query("SELECT has_table_privilege('gather_runtime','schema_migrations','UPDATE') AS allowed")).rows[0].allowed, false);
    await client.query("UPDATE schema_migrations SET checksum='tampered' WHERE name=$1", [first.rows[0].name]);
    await assert.rejects(migrate(url), /Applied migration changed/);
  });
});

test('G1A existing core schema upgrades through additive migrations without replacing stored tenant data', async () => {
  await isolatedDatabase(async (url, client) => {
    const core = await readFile(new URL('../../migrations/001_core.sql', import.meta.url), 'utf8');
    await client.query(core);
    await client.query('CREATE TABLE schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now(), checksum text)');
    await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', ['001_core.sql', createHash('sha256').update(core).digest('hex')]);
    const churchId = randomUUID();
    await client.query("INSERT INTO churches(id,slug,name,time_zone) VALUES($1,'upgrade-fixture','Preserved church','UTC')", [churchId]);
    const runtimeUrl = new URL(url);
    runtimeUrl.username = 'gather_runtime';
    runtimeUrl.password = process.env.RUNTIME_DATABASE_PASSWORD!;
    const runtime = new Database(runtimeUrl.href);
    try {
      await assert.rejects(runtime.assertSchema(), { code: 'schema_not_ready', statusCode: 503 });
      await migrate(url);
      await runtime.assertRuntime();
      await client.query('ALTER TABLE sermons DISABLE ROW LEVEL SECURITY');
      await assert.rejects(runtime.assertSchema(), { code: 'schema_not_ready', statusCode: 503 });
      await client.query('ALTER TABLE sermons ENABLE ROW LEVEL SECURITY');
      await runtime.assertSchema();
    } finally { await runtime.close(); }
    assert.equal((await client.query('SELECT name FROM churches WHERE id=$1', [churchId])).rows[0].name, 'Preserved church');
    assert.ok((await client.query('SELECT name FROM schema_migrations')).rows.length >= 3);
    assert.equal((await client.query("SELECT relforcerowsecurity FROM pg_class WHERE relname='sources'")).rows[0].relforcerowsecurity, true);
  });
});

test('lifecycle migration stops on churchwide duplicates without discarding history and replaces the unconditional date index',async()=>{
  await isolatedDatabase(async(url,client)=>{
    const directory=new URL('../../migrations/',import.meta.url);
    await client.query('CREATE TABLE schema_migrations(name text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now(),checksum text)');
    for(const name of (await readdir(directory)).filter(name=>name.endsWith('.sql')&&name<'017').sort()) {
      const sql=await readFile(new URL(name,directory),'utf8');await client.query(sql);
      await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,createHash('sha256').update(sql).digest('hex')]);
    }
    const churchId=randomUUID();const firstSeries=randomUUID();const secondSeries=randomUUID();const firstSlot=randomUUID();const secondSlot=randomUUID();
    await client.query("INSERT INTO churches(id,slug,name,time_zone) VALUES($1,'duplicate-preflight','Preserved duplicate fixtures','UTC')",[churchId]);
    await client.query("INSERT INTO memberships(church_id,user_id,display_name,capabilities) VALUES($1,'administrator','Administrator',ARRAY['admin:manage'])",[churchId]);
    for(const seriesId of [firstSeries,secondSeries]) await client.query("INSERT INTO series(church_id,id,title,week_anchor,time_zone) VALUES($1,$2,'Preserved series','2035-01-01','UTC')",[churchId,seriesId]);
    for(const [slotId,seriesId] of [[firstSlot,firstSeries],[secondSlot,secondSeries]]) await client.query("INSERT INTO slots(church_id,id,series_id,local_date,local_time,time_zone,assignee_ids) VALUES($1,$2,$3,'2035-01-01','08:00','UTC','{}')",[churchId,slotId,seriesId]);
    await assert.rejects(migrate(url),error=>error instanceof Error&&error.message.includes(firstSlot)&&error.message.includes(secondSlot)&&error.message.includes('2035-01-01'));
    assert.equal((await client.query('SELECT count(*)::integer AS count FROM slots WHERE church_id=$1',[churchId])).rows[0].count,2);
    assert.equal((await client.query("SELECT to_regclass('public.one_study_per_series_date') IS NOT NULL AS exists")).rows[0].exists,true);
    await client.query("UPDATE slots SET local_date='2035-01-02' WHERE church_id=$1 AND id=$2",[churchId,secondSlot]);
    await migrate(url);
    assert.equal((await client.query("SELECT to_regclass('public.one_study_per_series_date') IS NULL AS removed")).rows[0].removed,true);
    await client.query("UPDATE slots SET deleted_at=now(),deleted_by='administrator' WHERE church_id=$1 AND id=$2",[churchId,firstSlot]);
    await client.query("INSERT INTO slots(church_id,id,series_id,local_date,local_time,time_zone,assignee_ids) VALUES($1,$2,$3,'2035-01-01','08:00','UTC','{}')",[churchId,randomUUID(),firstSeries]);
    await assert.rejects(client.query("INSERT INTO slots(church_id,id,series_id,local_date,local_time,time_zone,assignee_ids) VALUES($1,$2,$3,'2035-01-01','08:00','UTC','{}')",[churchId,randomUUID(),secondSeries]),{code:'23505'});
    assert.deepEqual((await client.query("SELECT 'studies:delete'=ANY(capabilities) AS deletes,'engagement:read'=ANY(capabilities) AS history,'moderation:manage'=ANY(capabilities) AS moderation FROM memberships WHERE church_id=$1 AND user_id='administrator'",[churchId])).rows[0],{deletes:true,history:true,moderation:false});
  });
});

test('demo login seeding preserves contributor assignments in disposable databases outside test NODE_ENV',async()=>{
  await isolatedDatabase(async(url,client)=>{
    await migrate(url);
    const previousDemo=process.env.ROOTED_ENABLE_DEMO_LOGINS;const previousEnvironment=process.env.NODE_ENV;
    try {
      process.env.ROOTED_ENABLE_DEMO_LOGINS='true';process.env.NODE_ENV='development';
      await seed(url);
    } finally {
      if(previousDemo===undefined)delete process.env.ROOTED_ENABLE_DEMO_LOGINS;else process.env.ROOTED_ENABLE_DEMO_LOGINS=previousDemo;
      if(previousEnvironment===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previousEnvironment;
    }
    const slots=(await client.query('SELECT assignee_ids FROM slots WHERE church_id=$1',[graceId])).rows;
    assert.equal(slots.length,3);assert.ok(slots.every(slot=>slot.assignee_ids.length===1&&slot.assignee_ids[0]==='contributor'));
  });
});
