import './config.js';
import { readdir, readFile } from 'node:fs/promises';
import pg from 'pg';
import { createHash } from 'node:crypto';

export async function migrate(connectionString = process.env.MIGRATION_DATABASE_URL) {
  if (!connectionString) throw new Error('MIGRATION_DATABASE_URL is required; migrations must use a privileged connection');
  const password = process.env.RUNTIME_DATABASE_PASSWORD;
  if (!password || (process.env.NODE_ENV === 'production' && password.length < 24)) throw new Error('RUNTIME_DATABASE_PASSWORD is required (24+ characters in production)');
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('gather:migrations'))");
    const role = await client.query("SELECT rolcanlogin,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname='gather_runtime'");
    if (role.rowCount) {
      const existing = role.rows[0];
      if (!existing.rolcanlogin || existing.rolsuper || existing.rolbypassrls || existing.rolcreatedb || existing.rolcreaterole) throw new Error('Existing gather_runtime role is unsafe; correct its grants explicitly before migrating');
    } else {
      const quoted = `'${password.replaceAll("'", "''")}'`;
      await client.query(`CREATE ROLE gather_runtime LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE PASSWORD ${quoted}`);
    }
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    await client.query('ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum text');
    const directory = new URL('../../migrations/', import.meta.url);
    for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
      const sql=await readFile(new URL(name,directory),'utf8');
      const checksum=createHash('sha256').update(sql).digest('hex');
      const applied=await client.query('SELECT checksum FROM schema_migrations WHERE name=$1',[name]);
      if(applied.rowCount) {
        if(applied.rows[0].checksum&&applied.rows[0].checksum!==checksum) throw new Error(`Applied migration changed: ${name}`);
        if(!applied.rows[0].checksum) await client.query('UPDATE schema_migrations SET checksum=$2 WHERE name=$1',[name,checksum]);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [name,checksum]);
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    }
    await client.query('GRANT USAGE ON SCHEMA public TO gather_runtime');
    await client.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO gather_runtime');
    await client.query('REVOKE ALL ON schema_migrations FROM gather_runtime');
    if ((await client.query("SELECT to_regclass('public.cowriter_daily_allowance') AS relation")).rows[0].relation) await client.query('REVOKE ALL ON cowriter_daily_allowance FROM gather_runtime');
    if ((await client.query("SELECT to_regclass('public.study_workflow_sources') AS relation")).rows[0].relation) await client.query('REVOKE UPDATE,DELETE ON study_workflow_sources,study_workflow_plans FROM gather_runtime');
    await client.query('REVOKE DELETE ON slots,aggregates FROM gather_runtime');
    await client.query('REVOKE INSERT,UPDATE,DELETE ON study_purge_audit FROM gather_runtime');
    for(const table of ['discussion_evaluations','discussion_resolutions']) {
      if((await client.query('SELECT to_regclass($1) AS relation',[`public.${table}`])).rows[0].relation) await client.query(`REVOKE UPDATE,DELETE ON ${table} FROM gather_runtime`);
    }
    const immutableTables=await client.query("SELECT DISTINCT relname FROM pg_trigger JOIN pg_class ON pg_class.oid=pg_trigger.tgrelid JOIN pg_namespace ON pg_namespace.oid=pg_class.relnamespace WHERE pg_namespace.nspname='public' AND pg_trigger.tgname='immutable'");
    for(const table of immutableTables.rows) {
      if(!/^[a-z_]+$/.test(table.relname))throw new Error('Invalid immutable table identifier');
      await client.query(`REVOKE UPDATE,DELETE ON ${table.relname} FROM gather_runtime`);
    }
    await client.query('GRANT EXECUTE ON FUNCTION auth_memberships(text),worker_churches(),public_church(text) TO gather_runtime');
    await client.query('GRANT EXECUTE ON FUNCTION purge_withdrawn_study(uuid,uuid,text,text,integer) TO gather_runtime');
  } finally { await client.end(); }
}

if (/\/migrate\.[tj]s$/.test(process.argv[1]?.replaceAll('\\','/')??'')) {
  await migrate();
  console.log('Migrations applied');
}
