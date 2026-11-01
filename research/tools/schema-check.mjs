import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const schemaPath = fileURLToPath(new URL('../schema.sql', import.meta.url));
const dependencyOption = process.argv.indexOf('--dependency-root');
const dependencyRoot = dependencyOption >= 0 ? process.argv[dependencyOption + 1] : undefined;
if (dependencyOption >= 0 && (!dependencyRoot || dependencyRoot.startsWith('--'))) {
  throw new Error('--dependency-root requires the directory containing node_modules');
}
const requireDependency = createRequire(
  dependencyRoot ? path.resolve(dependencyRoot, 'package.json') : import.meta.url
);
const { PGlite } = requireDependency('@electric-sql/pglite');
const dependencyPackage = JSON.parse(
  await readFile(path.resolve(path.dirname(requireDependency.resolve('@electric-sql/pglite')), '../package.json'), 'utf8')
);
const schema = await readFile(schemaPath, 'utf8');
const script = await readFile(scriptPath, 'utf8');
const digest = value => createHash('sha256').update(value).digest('hex');
const identifier = value => `00000000-0000-0000-0000-${String(value).padStart(12, '0')}`;
const tenantA = identifier(100);
const tenantB = identifier(200);
const validHash = "sha256(convert_to('{}', 'UTF8'))";
const checks = [];
const database = new PGlite();

function verify(name, condition, observed) {
  checks.push({ name, passed: Boolean(condition), observed });
  if (!condition) throw new Error(`Check failed: ${name}`);
}

async function seedTenant(base) {
  const tenant = identifier(base);
  await database.exec(`
    SET search_path = church_design, pg_catalog;
    INSERT INTO church VALUES ('${tenant}', 'Fictional church', 'America/New_York', now());
    INSERT INTO membership(church_id, id, identity_subject)
      VALUES ('${tenant}', '${identifier(base + 1)}', 'fixture-reviewer');
    INSERT INTO weekly_series VALUES
      ('${tenant}', '${identifier(base + 2)}', 'Fixture series', '2026-10-19', 'America/New_York');
    INSERT INTO dated_slot(church_id, id, series_id, local_date, local_time, time_zone) VALUES
      ('${tenant}', '${identifier(base + 3)}', '${identifier(base + 2)}',
       '2026-10-19', '08:00', 'America/New_York');
    INSERT INTO plan(church_id, id, slot_id) VALUES
      ('${tenant}', '${identifier(base + 4)}', '${identifier(base + 3)}');
    INSERT INTO plan_revision VALUES
      ('${tenant}', '${identifier(base + 5)}', '${identifier(base + 4)}', 1, 1,
       convert_to('{}', 'UTF8'), '{}', ${validHash}, '${identifier(base + 1)}', now());
    UPDATE plan SET head_revision_id = '${identifier(base + 5)}'
      WHERE church_id = '${tenant}' AND id = '${identifier(base + 4)}';
    INSERT INTO plan_approval VALUES
      ('${tenant}', '${identifier(base + 6)}', '${identifier(base + 4)}',
       '${identifier(base + 5)}', ${validHash}, '${identifier(base + 1)}', 'fixture-policy', now());
    INSERT INTO content(church_id, id, plan_id, channel, locale) VALUES
      ('${tenant}', '${identifier(base + 7)}', '${identifier(base + 4)}', 'web', 'en');
    INSERT INTO content_revision VALUES
      ('${tenant}', '${identifier(base + 8)}', '${identifier(base + 7)}',
       '${identifier(base + 4)}', '${identifier(base + 6)}', ${validHash}, 1, 1,
       convert_to('{}', 'UTF8'), '{}', ${validHash}, '${identifier(base + 1)}', now());
    UPDATE content SET head_revision_id = '${identifier(base + 8)}'
      WHERE church_id = '${tenant}' AND id = '${identifier(base + 7)}';
    INSERT INTO content_approval VALUES
      ('${tenant}', '${identifier(base + 9)}', '${identifier(base + 7)}',
       '${identifier(base + 8)}', ${validHash}, '${identifier(base + 6)}', ${validHash},
       '${identifier(base + 1)}', 'fixture-policy', now());
    INSERT INTO destination VALUES
      ('${tenant}', '${identifier(base + 10)}', 'web', 'fixture-private-reference');
    INSERT INTO schedule(church_id, id, content_id, revision_id, approval_id, destination_id,
      local_date, local_time, time_zone, resolver_version, due_at) VALUES
      ('${tenant}', '${identifier(base + 11)}', '${identifier(base + 7)}',
       '${identifier(base + 8)}', '${identifier(base + 9)}', '${identifier(base + 10)}',
       '2026-10-19', '08:00', 'America/New_York', 'fixture-resolver', '2026-10-19T12:00:00Z');
    INSERT INTO publication VALUES
      ('${tenant}', '${identifier(base + 12)}', '${identifier(base + 7)}',
       '${identifier(base + 11)}', '${identifier(base + 8)}', '${identifier(base + 9)}', now());
    UPDATE content SET live_publication_id = '${identifier(base + 12)}'
      WHERE church_id = '${tenant}' AND id = '${identifier(base + 7)}';
  `);
}

async function expectRejected(name, statement, expectedCode) {
  await database.exec('BEGIN');
  await database.query("SELECT set_config('app.church_id', $1, true)", [tenantA]);
  let actualCode = null;
  try {
    await database.exec(statement);
  } catch (error) {
    actualCode = error.code ?? 'missing_sqlstate';
  } finally {
    await database.exec('ROLLBACK');
  }
  verify(name, actualCode === expectedCode, { expectedCode, actualCode });
}

let databaseVersion;
let failure = null;
try {
  await database.exec(schema);
  databaseVersion = (await database.query('SELECT version() AS version')).rows[0].version;
  const coverage = (await database.query(`
    SELECT count(*)::int AS tables,
      bool_and(relrowsecurity AND relforcerowsecurity) AS all_forced
    FROM pg_class JOIN pg_namespace ON pg_namespace.oid = relnamespace
    WHERE nspname = 'church_design' AND relkind = 'r'
  `)).rows[0];
  verify('all tenant tables enable and force RLS', coverage.tables === 24 && coverage.all_forced, coverage);
  await seedTenant(100);
  await seedTenant(200);
  verify('two complete relational approval and publication chains insert', true, { tenants: 2 });
  await database.exec(`
    CREATE ROLE design_runtime NOSUPERUSER NOBYPASSRLS;
    GRANT USAGE ON SCHEMA church_design TO design_runtime;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA church_design TO design_runtime;
    SET ROLE design_runtime;
  `);
  const runtime = (await database.query(`
    SELECT rolsuper, rolbypassrls,
      (SELECT bool_and(relowner <> current_user::regrole)
       FROM pg_class JOIN pg_namespace ON pg_namespace.oid = relnamespace
       WHERE nspname = 'church_design' AND relkind = 'r') AS nonowner
    FROM pg_roles WHERE rolname = current_user
  `)).rows[0];
  verify('checks run as nonowner without superuser or BYPASSRLS',
    !runtime.rolsuper && !runtime.rolbypassrls && runtime.nonowner, runtime);
  const countVisible = async () => (await database.query('SELECT count(*)::int AS total FROM church')).rows[0].total;
  verify('missing tenant context returns no rows', await countVisible() === 0, { visibleRows: 0 });
  for (const [tenant, completion] of [[tenantA, 'COMMIT'], [tenantB, 'ROLLBACK']]) {
    await database.exec('BEGIN');
    await database.query("SELECT set_config('app.church_id', $1, true)", [tenant]);
    const visible = (await database.query('SELECT church_id FROM church')).rows;
    verify(`transaction selects only ${tenant}`, visible.length === 1 && visible[0].church_id === tenant,
      { visibleTenantIds: visible.map(row => row.church_id) });
    await database.exec(completion);
    const total = await countVisible();
    verify(`${completion.toLowerCase()} clears transaction context on reused connection`, total === 0, { visibleRows: total });
  }
  await expectRejected('cross-tenant write rejected by RLS', `
    INSERT INTO membership(church_id, id, identity_subject)
    VALUES ('${tenantB}', '${identifier(300)}', 'fixture-intruder')`, '42501');
  await expectRejected('existing foreign-tenant parent rejected by composite FK', `
    INSERT INTO dated_slot(church_id, id, series_id, local_date, local_time, time_zone)
    VALUES ('${tenantA}', '${identifier(301)}', '${identifier(202)}',
      '2026-10-21', '08:00', 'America/New_York')`, '23503');
  await expectRejected('revision update rejected', `
    UPDATE plan_revision SET payload = '{"changed":true}' WHERE id = '${identifier(105)}'`, 'P0001');
  await expectRejected('revision deletion rejected', `
    DELETE FROM plan_revision WHERE id = '${identifier(105)}'`, 'P0001');
  await expectRejected('canonical bytes hash mismatch rejected', `
    INSERT INTO plan_revision VALUES ('${tenantA}', '${identifier(302)}', '${identifier(104)}',
      2, 1, convert_to('{}', 'UTF8'), '{}', decode(repeat('00', 32), 'hex'),
      '${identifier(101)}', now())`, '23514');
  await expectRejected('plan approval hash mismatch rejected', `
    INSERT INTO plan_approval VALUES ('${tenantA}', '${identifier(303)}', '${identifier(104)}',
      '${identifier(105)}', decode(repeat('00', 32), 'hex'), '${identifier(101)}', 'fixture-policy', now())`, '23503');
  await expectRejected('content approval wrong plan reference rejected', `
    INSERT INTO content_approval VALUES ('${tenantA}', '${identifier(304)}', '${identifier(107)}',
      '${identifier(108)}', ${validHash}, '${identifier(206)}', ${validHash},
      '${identifier(101)}', 'fixture-policy', now())`, '23503');
  for (const state of ['Scheduled', 'Published']) {
    await expectRejected(`plan ${state} state rejected`, `
      UPDATE plan SET state = '${state}' WHERE id = '${identifier(104)}'`, '22P02');
  }
  await expectRejected('duplicate publication for one schedule rejected', `
    INSERT INTO publication VALUES ('${tenantA}', '${identifier(305)}', '${identifier(107)}',
      '${identifier(111)}', '${identifier(108)}', '${identifier(109)}', now())`, '23505');
  await expectRejected('publication mutation rejected', 'UPDATE publication SET published_at = now()', 'P0001');
  await expectRejected('content approval mutation rejected', `
    UPDATE content_approval SET policy_version = 'changed'`, 'P0001');
  await database.exec('BEGIN');
  await database.query("SELECT set_config('app.church_id', $1, true)", [tenantA]);
  const scoped = (await database.query(`
    SELECT (SELECT count(*)::int FROM publication) AS publications,
      (SELECT count(*)::int FROM plan_approval) AS approvals
  `)).rows[0];
  verify('end-to-end approval and publication reads stay tenant-scoped',
    scoped.publications === 1 && scoped.approvals === 1, scoped);
  await database.exec('COMMIT');
  await database.exec('RESET ROLE');
  const dates = (await database.query(`
    SELECT to_char(local_date, 'YYYY-MM-DD') AS local_date,
      to_char((local_date + time '08:00') AT TIME ZONE 'America/New_York'
        AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS due_utc
    FROM (VALUES (date '2026-10-19'), (date '2026-10-21'), (date '2026-10-23')) AS dates(local_date)
  `)).rows;
  verify('three illustrative dates at 08:00 America/New_York resolve to 12:00 UTC',
    dates.length === 3 && dates.every(row => row.due_utc === `${row.local_date}T12:00:00Z`), dates);
} catch (error) {
  failure = { message: error.message, code: error.code ?? null };
} finally {
  await database.close();
}

const result = {
  artifact: 'representative-schema-validation',
  recordedAt: new Date().toISOString(),
  schema: 'research/schema.sql',
  script: 'research/tools/schema-check.mjs',
  schemaSha256: digest(schema),
  scriptSha256: digest(script),
  environment: { node: process.version, pglite: dependencyPackage.version, postgres: databaseVersion },
  reproduce: {
    localDependency: 'node research/tools/schema-check.mjs',
    temporaryInstall: 'npm.cmd install --prefix "$env:TEMP/mychurch-design-validation" --no-audit --no-fund @electric-sql/pglite@0.5.10',
    temporaryDependency: 'node research/tools/schema-check.mjs --dependency-root "$env:TEMP/mychurch-design-validation"'
  },
  passed: failure === null && checks.every(check => check.passed),
  checks,
  failure,
  limitations: [
    'Isolated in-memory PGlite PostgreSQL, not a deployed production PostgreSQL or network transaction pool.',
    'Broad test-role DML grants exercise RLS and constraints; they are not production grants or capability policy.',
    'Minimal fixture payloads test relational and byte-hash constraints, not canonical JSON/reference equivalence.',
    'No command handlers, edit cancellation transactions, provider delivery, legal compliance or recovery SLOs validated.',
    'Sequential replay checks uniqueness; no concurrent worker or crash-injection publication test was run.'
  ]
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.passed) process.exitCode = 1;
