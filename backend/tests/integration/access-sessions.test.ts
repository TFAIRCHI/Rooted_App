import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import pg from 'pg';
import { exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { buildApp } from '../../src/app.js';
import { config } from '../../src/infrastructure/config.js';
import { Database } from '../../src/infrastructure/database.js';
import { migrate } from '../../src/infrastructure/migrate.js';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const tenant = '10000000-0000-4000-8000-000000000001';
const object = '20000000-0000-4000-8000-000000000002';
const actor = `entra:${tenant}:${object}`;

test('production access sessions: persistent reading, verified MFA, account binding and revocation', async t => {
  const rootUrl = new URL(process.env.TEST_MIGRATION_DATABASE_URL ?? 'postgres://postgres@127.0.0.1:54329/gather_test');
  assert.ok(['127.0.0.1','localhost'].includes(rootUrl.hostname), 'Tests must use local PostgreSQL');
  const root = new pg.Client({connectionString:rootUrl.href}); await root.connect();
  const name = `gather_access_${randomUUID().replaceAll('-','')}`;
  await root.query(`CREATE DATABASE ${name}`);
  const cleanup: Array<()=>Promise<unknown>> = [()=>root.end(),()=>root.query(`DROP DATABASE ${name} WITH (FORCE)`)];
  t.after(async () => { for (const close of cleanup.reverse()) await close(); });
  const migrationUrl = new URL(rootUrl); migrationUrl.pathname = `/${name}`;
  await migrate(migrationUrl.href);
  const admin = new pg.Pool({connectionString:migrationUrl.href});
  cleanup.push(()=>admin.end());
  const runtimeUrl = new URL(migrationUrl); runtimeUrl.username = 'gather_runtime'; runtimeUrl.password = process.env.RUNTIME_DATABASE_PASSWORD!;
  const database = new Database(runtimeUrl.href);
  cleanup.push(()=>database.close());
  const issuer = 'https://identity.rooted.test/tenant/v2.0';
  const settings = {...config(),production:true,databaseUrl:runtimeUrl.href,issuer,appOrigin:'https://rooted.test',callbackUrl:'https://rooted.test/api/v1/auth/callback',clientId:'member-client',clientSecret:'member-test-secret',contributorClientId:'contributor-client',contributorClientSecret:'contributor-test-secret',subjectMode:'entra-oid' as const,tenantId:tenant};
  const app = await buildApp({database,settings});
  cleanup.push(()=>app.close());
  const church = randomUUID(); const foreign = randomUUID();
  await admin.query("INSERT INTO churches(id,slug,name,time_zone) VALUES($1,'access-church','Access church','UTC'),($2,'foreign-church','Foreign church','UTC')",[church,foreign]);
  await admin.query("INSERT INTO memberships(church_id,user_id,display_name,capabilities) VALUES($1,$2,'Reader','{}')",[church,actor]);
  const {privateKey,publicKey} = await generateKeyPair('RS256');
  const jwk = {...await exportJWK(publicKey),kid:'test-key',alg:'RS256',use:'sig'};
  const exchanges = new Map<string,{token:string;clientId:string;challenge:string}>();
  t.mock.method(globalThis,'fetch',async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = String(input);
    if (url === `${issuer}/.well-known/openid-configuration`) return Response.json({issuer,authorization_endpoint:`${issuer}/authorize`,token_endpoint:`${issuer}/token`,jwks_uri:`${issuer}/jwks`});
    if (url === `${issuer}/jwks`) return Response.json({keys:[jwk]});
    if (url === `${issuer}/token`) {
      const body = new URLSearchParams(String(init?.body));
      const exchange = exchanges.get(body.get('code')!); assert.ok(exchange);
      assert.equal(body.get('client_id'),exchange.clientId);
      assert.equal(body.get('client_secret'),exchange.clientId === settings.clientId ? settings.clientSecret : settings.contributorClientSecret);
      assert.equal(createHash('sha256').update(body.get('code_verifier')!).digest('base64url'),exchange.challenge);
      assert.equal(body.get('redirect_uri'),settings.callbackUrl);
      return Response.json({id_token:exchange.token});
    }
    throw new Error('Unexpected identity test request');
  });
  async function login(access:'member'|'contributor',claims:JWTPayload={},priorCookie?:string,audience?:string) {
    const begin = await app.inject({url:`/v1/auth/login?access=${access}`,headers:priorCookie?{cookie:priorCookie}:{}});
    assert.equal(begin.statusCode,302,begin.body);
    const target = new URL(begin.headers.location!);
    assert.equal(target.searchParams.get('code_challenge_method'),'S256');
    if(access==='contributor') { assert.equal(target.searchParams.get('prompt'),'login'); assert.equal(target.searchParams.get('max_age'),'0'); }
    const clientId = access==='member'?settings.clientId:settings.contributorClientId;
    const code = randomUUID();
    const payload = {tid:tenant,oid:object,nonce:target.searchParams.get('nonce'),...(access==='contributor'?{amr:['mfa'],auth_time:Math.floor(Date.now()/1000)}:{}),...claims};
    const token = await new SignJWT(payload).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer(issuer).setSubject(access==='member'?'pairwise-member':'pairwise-contributor').setAudience(audience??clientId).setIssuedAt().setExpirationTime('5m').sign(privateKey);
    exchanges.set(code,{token,clientId,challenge:target.searchParams.get('code_challenge')!});
    const state = target.searchParams.get('state')!;
    const response = await app.inject({url:`/v1/auth/callback?state=${state}&code=${code}`,headers:{cookie:`gather_oidc_state=${state}${priorCookie?`; ${priorCookie}`:''}`}});
    const sessionCookie = response.cookies.find(cookie=>cookie.name==='gather_session');
    return {response,cookie:sessionCookie?`gather_session=${sessionCookie.value}`:undefined,state,code};
  }
  let readingCookie = '';
  await t.test('email-only member login creates a persistent, private reading session',async()=>{
    const logged = await login('member'); assert.equal(logged.response.statusCode,302,logged.response.body);
    readingCookie = logged.cookie!;
    assert.match(String(logged.response.headers['set-cookie']),/Max-Age=34560000/);
    assert.match(String(logged.response.headers['set-cookie']),/HttpOnly/);
    assert.match(String(logged.response.headers['set-cookie']),/Secure/);
    const rows = await admin.query('SELECT expires_at,mfa_verified_until FROM auth_sessions WHERE user_id=$1',[actor]);
    assert.equal(rows.rows[0].expires_at,null); assert.equal(rows.rows[0].mfa_verified_until,null);
    await admin.query("UPDATE auth_sessions SET created_at=now()-interval '2 years' WHERE user_id=$1",[actor]);
    const read = await app.inject({url:`/v1/churches/${church}/studies`,headers:{cookie:readingCookie}});
    assert.equal(read.statusCode,200,read.body); assert.deepEqual(read.json().items,[]);
    assert.match(String(read.headers['set-cookie']),/Max-Age=34560000/);
    assert.equal((await app.inject({url:`/v1/churches/${foreign}/studies`,headers:{cookie:readingCookie}})).statusCode,404);
  });
  await t.test('direct privileged API calls and owner onboarding require MFA, even after role promotion',async()=>{
    await admin.query("UPDATE memberships SET capabilities=ARRAY['workspace:read','memberships:manage','admin:manage','settings:manage','policy:manage','ai:use'] WHERE church_id=$1 AND user_id=$2",[church,actor]);
    const session = await app.inject({url:'/v1/auth/session',headers:{cookie:readingCookie}});
    assert.equal(session.json().access,'member'); assert.deepEqual(session.json().churches[0].capabilities,[]);
    assert.equal(session.json().churches[0].contributorAccess,true);
    for (const path of ['workspace','members/access','invitations','moderation','providers/status',`content/${randomUUID()}/cowriter/status`]) {
      const response = await app.inject({url:`/v1/churches/${church}/${path}`,headers:{cookie:readingCookie}});
      assert.equal(response.statusCode,403,`${path}: ${response.body}`); assert.equal(response.json().code,'mfa_required');
    }
    const create = await app.inject({method:'POST',url:'/v1/churches',headers:{cookie:readingCookie,'x-csrf-token':session.json().csrfToken,'idempotency-key':randomUUID()},payload:{name:'Unauthorized',slug:'unauthorized',timeZone:'UTC'}});
    assert.equal(create.statusCode,403); assert.equal(create.json().code,'mfa_required');
    assert.equal((await app.inject({url:`/v1/churches/${church}/studies`,headers:{cookie:readingCookie}})).statusCode,200);
    await database.transaction(church,actor,async(client,member)=>{
      assert.deepEqual(member.capabilities,[]);
      assert.equal((await client.query("SELECT current_setting('app.permissions') AS permissions")).rows[0].permissions,'[]');
    },{userId:actor,displayName:'Reader',csrfToken:'test',privileged:false});
  });
  await t.test('member invitation succeeds without MFA; a privileged invitation cannot elevate it',async()=>{
    const session=(await app.inject({url:'/v1/auth/session',headers:{cookie:readingCookie}})).json();
    await admin.query("INSERT INTO memberships(church_id,user_id,display_name,capabilities) VALUES($1,'inviter','Inviter',ARRAY['memberships:manage','policy:manage'])",[foreign]);
    async function invitation(role:string,capabilities:string[]) {
      const token=randomUUID()+randomUUID();
      await admin.query("INSERT INTO invitations(church_id,id,target_subject,role,capabilities,invited_by,reason,token_hash,expires_at) VALUES($1,$2,$3,$4,$5,'inviter','Test invitation',$6,now()+interval '1 day')",[foreign,randomUUID(),actor,role,capabilities,hash(token)]);
      return app.inject({method:'POST',url:'/v1/invitations/accept',headers:{cookie:readingCookie,'x-csrf-token':session.csrfToken,'idempotency-key':randomUUID()},payload:{token}});
    }
    const denied=await invitation('contributor',['workspace:read','content:edit']);
    assert.equal(denied.statusCode,403,denied.body); assert.equal(denied.json().code,'mfa_required');
    const accepted=await invitation('member',[]); assert.equal(accepted.statusCode,201,accepted.body);
  });
  await t.test('failed or mismatched contributor verification preserves reading access',async()=>{
    for (const claims of [{amr:['pwd']},{auth_time:Math.floor(Date.now()/1000)-9*60*60},{oid:randomUUID()},{tid:randomUUID()}]) {
      const failed=await login('contributor',claims,readingCookie);
      assert.ok([401,403].includes(failed.response.statusCode),failed.response.body);
      assert.equal(failed.cookie,undefined);
      assert.equal((await app.inject({url:'/v1/auth/session',headers:{cookie:readingCookie}})).statusCode,200);
    }
    const wrongAudience=await login('contributor',{},readingCookie,settings.clientId);
    assert.equal(wrongAudience.response.statusCode,401);
    const onlyMember=await login('member',{amr:['mfa'],auth_time:Math.floor(Date.now()/1000)});
    assert.equal(onlyMember.response.statusCode,302,onlyMember.response.body);
    assert.equal((await app.inject({url:'/v1/auth/session',headers:{cookie:onlyMember.cookie!}})).json().access,'member');
  });
  let privilegedCookie='';
  await t.test('verified contributor login maps pairwise subjects to the same identity and rotates the session',async()=>{
    const upgraded=await login('contributor',{},readingCookie);
    assert.equal(upgraded.response.statusCode,302,upgraded.response.body); privilegedCookie=upgraded.cookie!;
    assert.notEqual(privilegedCookie,readingCookie);
    assert.equal((await app.inject({url:'/v1/auth/session',headers:{cookie:readingCookie}})).statusCode,401);
    const current=(await app.inject({url:'/v1/auth/session',headers:{cookie:privilegedCookie}})).json();
    assert.equal(current.user.id,actor); assert.equal(current.access,'contributor');
    assert.ok(current.churches.find((item:{id:string})=>item.id===church).capabilities.includes('workspace:read'));
    const invitations=await app.inject({url:`/v1/churches/${church}/invitations`,headers:{cookie:privilegedCookie}});
    assert.equal(invitations.statusCode,200,invitations.body);
    const members=await app.inject({url:`/v1/churches/${church}/members/access`,headers:{cookie:privilegedCookie}});
    assert.equal(members.statusCode,200,members.body);
    assert.equal(members.json().items[0].userId,actor);
    assert.equal((await app.inject({url:`/v1/churches/${foreign}/members/access`,headers:{cookie:privilegedCookie}})).statusCode,403);
    const noRole=await app.inject({url:`/v1/churches/${foreign}/invitations`,headers:{cookie:privilegedCookie}});
    assert.equal(noRole.statusCode,403,noRole.body); assert.equal(noRole.json().code,'forbidden');
    const replay=await app.inject({url:`/v1/auth/callback?state=${upgraded.state}&code=${upgraded.code}`,headers:{cookie:`gather_oidc_state=${upgraded.state}`}});
    assert.equal(replay.statusCode,401);
  });
  await t.test('MFA expiry removes workspace access while reading persists; logout revokes immediately',async()=>{
    await admin.query("UPDATE auth_sessions SET mfa_verified_until=now()-interval '1 second' WHERE user_id=$1",[actor]);
    const session=(await app.inject({url:'/v1/auth/session',headers:{cookie:privilegedCookie}})).json();
    assert.equal(session.access,'member');
    assert.equal((await app.inject({url:`/v1/churches/${church}/studies`,headers:{cookie:privilegedCookie}})).statusCode,200);
    assert.equal((await app.inject({url:`/v1/churches/${church}/invitations`,headers:{cookie:privilegedCookie}})).statusCode,403);
    assert.equal((await app.inject({url:`/v1/churches/${church}/members/access`,headers:{cookie:privilegedCookie}})).statusCode,403);
    const missingCsrf=await app.inject({method:'POST',url:'/v1/auth/logout',headers:{cookie:privilegedCookie}});
    assert.equal(missingCsrf.statusCode,403);
    const logout=await app.inject({method:'POST',url:'/v1/auth/logout',headers:{cookie:privilegedCookie,'x-csrf-token':session.csrfToken}});
    assert.equal(logout.statusCode,200,logout.body);
    assert.match(String(logout.headers['set-cookie']),/gather_session=;/);
    assert.doesNotMatch(String(logout.headers['set-cookie']),/Max-Age=34560000/);
    assert.equal((await app.inject({url:'/v1/auth/session',headers:{cookie:privilegedCookie}})).statusCode,401);
  });
});
