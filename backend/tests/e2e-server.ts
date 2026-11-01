import { timingSafeEqual } from 'node:crypto';
import { startLocalIssuer } from '../src/auth/local-issuer.js';
import { buildApp } from '../src/app.js';
import { config } from '../src/infrastructure/config.js';
import { Database } from '../src/infrastructure/database.js';
import { migrate } from '../src/infrastructure/migrate.js';
import { seed } from '../src/infrastructure/seed.js';
import { runLocalWork } from '../src/workers/publication.js';
import { runStudyWorkflows } from '../src/modules/study-workflows.js';

if (process.env.NODE_ENV !== 'test' || process.env.GATHER_E2E !== 'true') throw new Error('The browser test server is restricted to the isolated test environment');
const clockToken = process.env.GATHER_E2E_CLOCK_TOKEN;
if (!clockToken || clockToken.length < 32) throw new Error('An isolated browser-clock token is required');
const migrationUrl = process.env.MIGRATION_DATABASE_URL;
if (!migrationUrl || !/^\/gather_e2e_[a-f0-9]{32}$/.test(new URL(migrationUrl).pathname) || !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(migrationUrl).hostname)) throw new Error('Browser tests must use a uniquely named disposable loopback test database');
await migrate(migrationUrl);
await seed(migrationUrl);
const settings = config();
const database = new Database(settings.databaseUrl);
const issuer = await startLocalIssuer(4014);
let now = new Date();
const app = await buildApp({ database, settings, clock: () => new Date(now) });
app.post('/v1/__test/clock', async (request, reply) => {
  const supplied = request.headers['x-test-clock-token'];
  if (typeof supplied !== 'string' || Buffer.byteLength(supplied) !== Buffer.byteLength(clockToken) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(clockToken))) {
    return reply.code(403).send({ code: 'test_clock_forbidden' });
  }
  const value = (request.body as { now?: unknown })?.now;
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return reply.code(422).send({ code: 'invalid_test_clock' });
  now = new Date(value);
  await runLocalWork(database, now);
  return { now: now.toISOString(), providerCalls: 'disabled' };
});
await app.listen({ port: 4102, host: '127.0.0.1' });
let working=false;
const workflowTimer=setInterval(async()=>{if(working)return;working=true;try{await runStudyWorkflows(database);}catch(error){console.error('Fixture workflow iteration failed',error instanceof Error?error.name:'unknown');}finally{working=false;}},200);
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    clearInterval(workflowTimer);
    await app.close();
    await database.close();
    issuer.close();
  });
}
console.log('Isolated browser API :4102, OIDC :4014, controlled publication clock; external providers disabled');
