import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(root, 'package.json'));
try { process.loadEnvFile(path.join(root, '.env')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (process.env.NODE_ENV === 'production') throw new Error('Local development bootstrap refuses production configuration');
const databaseMode = process.env.GATHER_DATABASE_MODE ?? 'native';
if (!['native', 'external'].includes(databaseMode)) throw new Error('GATHER_DATABASE_MODE must be native or external');
for (const key of ['DATABASE_URL', 'MIGRATION_DATABASE_URL']) {
  if (!process.env[key]) throw new Error(`${key} is required; copy .env.example to .env without replacing existing configuration`);
  const target = new URL(process.env[key]);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) || target.pathname !== '/gather') throw new Error(`${key} must target the local gather development database; fictional seeding is forbidden elsewhere`);
}
const demo = process.env.STUDY_COWRITER_ENABLED === 'true' && process.env.EXTERNAL_SERVICES_ENABLED === 'true';
const environment = { ...process.env, NODE_ENV: 'development', EXTERNAL_SERVICES_ENABLED: demo ? 'true' : 'false', STUDY_COWRITER_ONLY: 'true' };
const tsxLoader = pathToFileURL(require.resolve('tsx')).href;
const children = [];
let stopping = false;
await mkdir(path.join(root, '.local/logs'), { recursive: true });

async function command(filename, args = [], loader = false) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...(loader ? ['--import', tsxLoader] : []), filename, ...args], { cwd: root, env: environment, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${filename} exited ${code}`)));
  });
}

async function service(name, filename, args = [], loader = false) {
  const log = await open(path.join(root, '.local/logs', `${name}.log`), 'a');
  const child = spawn(process.execPath, [...(loader ? ['--import', tsxLoader] : []), filename, ...args], {
    cwd: root, env: environment, windowsHide: true, stdio: ['ignore', log.fd, log.fd]
  });
  children.push(child);
  child.once('error', error => { console.error(`${name}: ${error.message}`); stop(1); });
  child.once('exit', code => { if (!stopping) { console.error(`${name} exited ${code}; see .local/logs/${name}.log`); stop(code || 1); } });
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}

process.once('SIGINT', () => stop());
process.once('SIGTERM', () => stop());
if (databaseMode === 'native') await command(path.join(root, 'backend/scripts/postgres.mjs'), ['start']);
await command(path.join(root, 'backend/src/infrastructure/migrate.ts'), [], true);
if (!process.argv.includes('--preserve-data')) await command(path.join(root, 'backend/src/infrastructure/seed.ts'), [], true);
await service('identity', path.join(root, 'backend/src/auth/local-issuer.ts'), [], true);
await service('api', path.join(root, 'backend/src/server.ts'), [], true);
await service('worker', path.join(root, 'backend/src/workers/worker.ts'), [], true);
await service('frontend', require.resolve('next/dist/bin/next'), ['dev', path.join(root, 'frontend'), '--hostname', '127.0.0.1', '--port', '3000']);
console.log('Rooted 1.2.13: http://127.0.0.1:3000 | API :4000 | local OIDC :4010');
console.log(`Local services. Azure co-writer ${demo ? 'enabled' : 'disabled'}; other providers disabled. Logs: .local/logs/. Press Ctrl+C to stop app processes. PostgreSQL can be stopped separately with npm run db:stop.`);
