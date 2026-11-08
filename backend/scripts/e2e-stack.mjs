import { spawn, execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(root, 'package.json'));
try { process.loadEnvFile(path.join(root, '.env')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const configuredUrl = new URL(process.env.TEST_MIGRATION_DATABASE_URL ?? 'postgresql://postgres@127.0.0.1:54329/gather_test');
if (!['/gather_test', '/gather_ci_test'].includes(configuredUrl.pathname)) throw new Error('E2E database must use an explicit test database template');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(configuredUrl.hostname)) throw new Error('Browser fixture bootstrap must target a loopback test database');
const databaseName = `gather_e2e_${randomUUID().replaceAll('-', '')}`;
const disposableUrl = new URL(configuredUrl); disposableUrl.pathname = `/${databaseName}`;
const migrationUrl = disposableUrl.href;
configuredUrl.pathname = '/postgres';
const administrative = new pg.Pool({ connectionString: configuredUrl.href });
let databaseCreated = false;
const runtimeUrl = new URL(migrationUrl);
runtimeUrl.username = 'gather_runtime';
runtimeUrl.password = process.env.RUNTIME_DATABASE_PASSWORD ?? 'gather_local_development';
const environment = {
  ...process.env,
  NODE_ENV: 'test', GATHER_E2E: 'true', EXTERNAL_SERVICES_ENABLED: 'false', ROOTED_WORKFLOW_FIXTURE: 'true', ROOTED_ENABLE_DEMO_LOGINS: 'true', ROOTED_EMAIL_TEST_MODE: 'true',
  GATHER_E2E_CLOCK_TOKEN: process.env.GATHER_E2E_CLOCK_TOKEN ?? 'gather-browser-clock-local-fixture-only-111',
  PUBLIC_VISITOR_SECRET: 'gather-browser-public-visitor-local-fixture-only-111',
  MIGRATION_DATABASE_URL: migrationUrl, DATABASE_URL: runtimeUrl.href,
  RUNTIME_DATABASE_PASSWORD: runtimeUrl.password,
  APP_ORIGIN: 'http://127.0.0.1:3002', BACKEND_URL: 'http://127.0.0.1:4102',
  OIDC_ISSUER: 'http://127.0.0.1:4014', OIDC_CLIENT_ID: 'gather-local',
  OIDC_CALLBACK_URL: 'http://127.0.0.1:3002/api/v1/auth/callback'
};
const loader = pathToFileURL(require.resolve('tsx')).href;
const children = [];
let stopping = false;
function launch(filename, args, useLoader = false) {
  const child = spawn(process.execPath, [...(useLoader ? ['--import', loader] : []), filename, ...args], { cwd: root, env: environment, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.once('error', error => { console.error(error.message); void stop(1); });
  child.once('exit', code => { if (!stopping) { console.error(`E2E service ${path.basename(filename)} exited ${code}`); void stop(code || 1); } });
  return child;
}
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  await Promise.all(children.map(child => new Promise(resolve => {
    if (!child.pid || child.exitCode !== null) return resolve();
    if (process.platform === 'win32') execFile('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, () => resolve());
    else { child.once('exit', resolve); child.kill(); }
  })));
  if (databaseCreated) await administrative.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`).catch(error => console.error('E2E database cleanup failed:', error.message));
  await administrative.end();
  process.exitCode = code;
}
process.once('SIGINT', () => { void stop(); });
process.once('SIGTERM', () => { void stop(); });
if (!process.env.CI && process.env.GATHER_DATABASE_MODE !== 'external') {
  const { createManager } = await import('./postgres.mjs');
  await createManager().start();
}
await administrative.query(`CREATE DATABASE "${databaseName}"`);
databaseCreated = true;
launch(path.join(root, 'backend/tests/e2e-server.ts'), [], true);
launch(require.resolve('next/dist/bin/next'), ['dev', path.join(root, 'frontend'), '--hostname', '127.0.0.1', '--port', '3002']);
