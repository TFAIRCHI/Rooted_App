import { randomBytes, createHash, randomBytes as randomSalt, scryptSync, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import '@fastify/cookie';
import { createRemoteJWKSet } from 'jose';
import { demand, ApiError } from '../api/errors.js';
import type { Database } from '../infrastructure/database.js';
import type { config } from '../infrastructure/config.js';
import { z } from 'zod';
import { safeContinuation } from './continuation.js';
import { verificationDiagnostic } from './verification-diagnostic.js';
import { verifyIdentityToken } from './verify-identity-token.js';
import { identitySubject, MEMBER_COOKIE_SECONDS, PRIVILEGED_SESSION_SECONDS, requireMfa, type Session } from './session.js';
export type { Session } from './session.js';

const digest = (input: string) => createHash('sha256').update(input).digest('hex');
const random = () => randomBytes(32).toString('base64url');
export function hashCredential(password:string) { const salt=randomSalt(16); const derived=scryptSync(password,salt,32,{N:16384,r:8,p:1}); return `scrypt$16384$8$1$${salt.toString('base64url')}$${derived.toString('base64url')}`; }
function verifyCredential(password:string,encoded:string) { const [,n,r,p,saltText,hashText]=encoded.split('$'); if(n!=='16384'||r!=='8'||p!=='1'||!saltText||!hashText)return false; const expected=Buffer.from(hashText,'base64url'); const actual=scryptSync(password,Buffer.from(saltText,'base64url'),expected.length,{N:Number(n),r:Number(r),p:Number(p)}); return expected.length===actual.length&&timingSafeEqual(expected,actual); }
export async function authenticate(database: Database, request: FastifyRequest, access: 'member' | 'contributor' = 'contributor'): Promise<Session> {
  const token = request.cookies.gather_session;
  demand(token,401,'unauthenticated','Sign in to continue');
  const result = await database.pool.query('SELECT user_id,display_name,csrf_token,mfa_verified_until,verified_email,claimed_email FROM auth_sessions WHERE token_hash=$1 AND (expires_at IS NULL OR expires_at>now())',[digest(token)]);
  const row = result.rows[0];
  demand(row,401,'session_expired','Your session expired');
  const production = request.server.rootedProduction ?? process.env.NODE_ENV === 'production';
  const session = {userId:row.user_id,displayName:row.display_name,csrfToken:row.csrf_token,privileged:!production || !!row.mfa_verified_until && new Date(row.mfa_verified_until).getTime()>Date.now(),verifiedEmail:row.verified_email ?? undefined,claimedEmail:row.claimed_email ?? undefined};
  request.rootedSessionToken = token;
  if (access === 'contributor') requireMfa(session);
  return session;
}

export function csrf(request: FastifyRequest, session: Session, appOrigin: string) {
  demand(request.headers['x-csrf-token']===session.csrfToken,403,'csrf_invalid','Refresh your session before changing data');
  if (request.headers.origin) demand(request.headers.origin===appOrigin,403,'origin_invalid','Unexpected request origin');
}

export async function authRoutes(app: FastifyInstance, database: Database, settings: ReturnType<typeof config>) {
  app.decorate('rootedProduction', settings.production);
  app.addHook('onSend', async (request, reply, payload) => {
    // Browsers require a finite cookie lifetime. Renew it on use; the reading session itself has no expiry.
    if (request.rootedSessionToken && request.routeOptions.url !== '/v1/auth/logout' && !reply.hasHeader('set-cookie')) {
      reply.setCookie('gather_session', request.rootedSessionToken, {httpOnly:true,secure:settings.production,sameSite:'lax',path:'/',maxAge:MEMBER_COOKIE_SECONDS});
    }
    return payload;
  });
  type Discovery = {authorization_endpoint:string;token_endpoint:string;jwks_uri:string;issuer:string};
  let discovery: Discovery | undefined;
  async function metadata() {
    if (!discovery) {
      const response = await fetch(settings.discoveryUrl ?? `${settings.issuer}/.well-known/openid-configuration`,{signal:AbortSignal.timeout(5000)});
      if (!response.ok) throw new ApiError(503,'identity_unavailable','Identity provider is unavailable');
      const candidate = await response.json() as Discovery;
      demand(candidate?.issuer===settings.issuer,503,'identity_configuration','Identity issuer mismatch');
      if (settings.production) demand([candidate.authorization_endpoint,candidate.token_endpoint,candidate.jwks_uri].every(endpoint=>endpoint.startsWith('https://')),503,'identity_configuration','Identity endpoints must use HTTPS');
      discovery = candidate;
    }
    return discovery!;
  }
  app.get('/v1/auth/options',async(_request,reply)=>{
    reply.header('Cache-Control','private, no-store');
    return {localIssuer:!settings.production&&new URL(settings.issuer).hostname==='127.0.0.1',demoLogin:!settings.production&&process.env.ROOTED_ENABLE_DEMO_LOGINS==='true'&&new URL(settings.issuer).hostname==='127.0.0.1',accessBasedLogin:true};
  });
  app.post('/v1/auth/demo-login',async(request,reply)=>{
    demand(!settings.production&&process.env.ROOTED_ENABLE_DEMO_LOGINS==='true'&&new URL(settings.issuer).hostname==='127.0.0.1',404,'not_found','Development login is unavailable');
    const body=z.object({username:z.string().trim().min(1).max(200),password:z.string().min(1).max(200),returnTo:z.string().max(500).optional()}).strict().parse(request.body);
    const continuation=safeContinuation(body.returnTo);
    demand(!body.returnTo||continuation,422,'invalid_continuation','Choose a supported application destination');
    const client=await database.pool.connect();
    try {
      await client.query('BEGIN'); const result=await client.query('SELECT * FROM local_credentials WHERE username=$1 AND enabled FOR UPDATE',[body.username]); const credential=result.rows[0];
      demand(credential,401,'invalid_credentials','Username or password is incorrect');
      const locked=credential.failed_attempts>=5&&credential.last_failed_at&&Date.now()-new Date(credential.last_failed_at).getTime()<15*60*1000;
      demand(!locked,429,'login_rate_limited','Too many attempts. Try again later');
      if(!verifyCredential(body.password,credential.password_hash)) { await client.query('UPDATE local_credentials SET failed_attempts=failed_attempts+1,last_failed_at=now(),updated_at=now() WHERE username=$1',[body.username]); await client.query('COMMIT'); demand(false,401,'invalid_credentials','Username or password is incorrect'); }
      await client.query('UPDATE local_credentials SET failed_attempts=0,last_failed_at=NULL,updated_at=now() WHERE username=$1',[body.username]);
      const membership=(await client.query('SELECT * FROM auth_memberships($1) ORDER BY name LIMIT 1',[credential.user_id])).rows[0];
      const token=random(); const csrfToken=random(); await client.query('INSERT INTO auth_sessions(token_hash,user_id,display_name,csrf_token,expires_at) VALUES($1,$2,$3,$4,NULL)',[digest(token),credential.user_id,membership?.display_name ?? credential.user_id,csrfToken]); await client.query('COMMIT');
      reply.setCookie('gather_session',token,{httpOnly:true,secure:false,sameSite:'lax',path:'/',maxAge:MEMBER_COOKIE_SECONDS});
      const redirectTo=!membership?'/onboarding':membership.capabilities.includes('workspace:read')?(membership.capabilities.includes('admin:manage')?`/settings?church=${membership.id}`:`/dashboard?church=${membership.id}`):`/c/${membership.slug}`;
      return {user:{id:credential.user_id},redirectTo:continuation??redirectTo};
    } catch(error) { try { await client.query('ROLLBACK'); } catch { void 0; } throw error; } finally { client.release(); }
  });
  app.get('/v1/auth/login',async (request,reply) => {
    const query = request.query as Record<string,string>;
    const access = z.enum(['member','contributor']).default('member').parse(query.access);
    const clientId = access === 'contributor' ? settings.contributorClientId : settings.clientId;
    const continuation=safeContinuation(query.returnTo);
    demand(!query.returnTo||continuation,422,'invalid_continuation','Choose a supported application destination');
    const churchSlug=query.church ? z.string().regex(/^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/).parse(query.church) : null;
    const loginHint=query.email ? z.email().max(320).parse(query.email) : null;
    if (query.persona) demand(!settings.production && new URL(settings.issuer).hostname==='127.0.0.1' && ['contributor','pastor','admin','member','anna.contributor','james.contributor','riley.member','morgan.admin'].includes(query.persona),422,'invalid_persona','Fixture personas are only available with the local issuer');
    let prior: Session | undefined;
    if (access === 'contributor' && request.cookies.gather_session) {
      try { prior = await authenticate(database, request, 'member'); }
      catch (error) { if (!(error instanceof ApiError) || error.statusCode !== 401) throw error; }
    }
    const state = random(); const verifier = random(); const nonce = random();
    await database.pool.query("INSERT INTO auth_flows(state_hash,verifier,nonce,expires_at,continuation,access,prior_user_id,prior_session_hash,church_slug) VALUES($1,$2,$3,now()+interval '10 minutes',$4,$5,$6,$7,$8)",[digest(state),verifier,nonce,continuation??null,access,prior?.userId??null,prior ? digest(request.cookies.gather_session!) : null,churchSlug]);
    reply.setCookie('gather_oidc_state',state,{httpOnly:true,secure:settings.production,sameSite:'lax',path:'/',maxAge:600});
    const target = new URL((await metadata()).authorization_endpoint);
    const emailClaims={email:{essential:true},email_verified:{essential:false}};
    const parameters = {client_id:clientId,redirect_uri:settings.callbackUrl,response_type:'code',scope:'openid profile email',state,nonce,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',claims:JSON.stringify({id_token:{...emailClaims,...(access==='contributor'?{amr:{essential:true,values:['mfa']},auth_time:{essential:true}}:{})}}),...(access === 'contributor' ? {prompt:'login',max_age:'0'} : {}),...(loginHint ? {login_hint:loginHint} : {}),...(query.persona ? {login_hint:query.persona,prompt:'login'} : {})};
    Object.entries(parameters).forEach(([name,value])=>target.searchParams.set(name,value));
    return reply.redirect(target.href);
  });
  app.get('/v1/auth/callback',async (request,reply) => {
    const query = request.query as Record<string,string>;
    demand(query.state && query.state===request.cookies.gather_oidc_state && query.code,401,'invalid_oauth_state','Identity callback could not be validated');
    const flows = await database.pool.query('DELETE FROM auth_flows WHERE state_hash=$1 AND expires_at>now() RETURNING verifier,nonce,continuation,access,prior_user_id,prior_session_hash,church_slug',[digest(query.state)]);
    const flow = flows.rows[0]; demand(flow,401,'invalid_oauth_state','Identity flow expired or already used');
    const contributor = flow.access === 'contributor';
    const clientId = contributor ? settings.contributorClientId : settings.clientId;
    const clientSecret = contributor ? settings.contributorClientSecret : settings.clientSecret;
    const metadataValue = await metadata();
    const body = new URLSearchParams({grant_type:'authorization_code',code:query.code,redirect_uri:settings.callbackUrl,client_id:clientId,code_verifier:flow.verifier});
    if (clientSecret) body.set('client_secret',clientSecret);
    const exchange = await fetch(metadataValue.token_endpoint,{method:'POST',body,signal:AbortSignal.timeout(5000)});
    demand(exchange.ok,401,'token_exchange_failed','Identity code exchange failed');
    const tokens = await exchange.json() as {id_token?:string};
    demand(tokens.id_token,401,'identity_token_missing','Identity token missing');
    let verified;
    try {
      verified = await verifyIdentityToken(tokens.id_token,createRemoteJWKSet(new URL(metadataValue.jwks_uri)),settings.issuer,clientId);
    } catch (error) {
      request.log.warn({event:'identity_token_verification_failed',access:contributor ? 'contributor' : 'member',...verificationDiagnostic(error)},'Identity token verification failed');
      throw new ApiError(401,'identity_token_invalid','Identity token could not be verified');
    }
    demand(verified.payload.nonce===flow.nonce && verified.payload.sub,401,'identity_token_invalid','Identity token did not match login');
    const userId = identitySubject(verified.payload, settings.subjectMode, settings.tenantId);
    const verifiedEmail = verified.payload.email_verified === true && typeof verified.payload.email === 'string' ? verified.payload.email.trim().toLowerCase() : null;
    const claimedEmail = typeof verified.payload.email === 'string' ? verified.payload.email.trim().toLowerCase() : null;
    let mfaUntil: Date | null = null;
    if (contributor && settings.production) {
      demand(Array.isArray(verified.payload.amr) && verified.payload.amr.includes('mfa'),403,'mfa_required','Multi-factor authentication is required for contributor access');
      const authenticatedAt = verified.payload.auth_time;
      const now = Date.now()/1000;
      demand(typeof authenticatedAt === 'number' && Number.isFinite(authenticatedAt) && authenticatedAt <= now + 60 && authenticatedAt + PRIVILEGED_SESSION_SECONDS > now,403,'mfa_required','Sign in again to verify contributor access');
      mfaUntil = new Date(Math.min(authenticatedAt,now)*1000 + PRIVILEGED_SESSION_SECONDS*1000);
    }
    if (flow.prior_user_id) {
      demand(request.cookies.gather_session && digest(request.cookies.gather_session) === flow.prior_session_hash,401,'identity_session_changed','Your reading session changed; start contributor sign-in again');
      demand(flow.prior_user_id === userId,403,'identity_account_mismatch','Use the same account to verify contributor access, or sign out first');
    }
    const token = random();
    const client = await database.pool.connect();
    try {
      await client.query('BEGIN');
      if (flow.prior_session_hash) {
        const prior = await client.query('DELETE FROM auth_sessions WHERE token_hash=$1 AND user_id=$2 AND (expires_at IS NULL OR expires_at>now()) RETURNING user_id',[flow.prior_session_hash,userId]);
        demand(prior.rowCount,401,'identity_session_changed','Your reading session ended; start sign-in again');
      }
      await client.query('INSERT INTO auth_sessions(token_hash,user_id,display_name,csrf_token,expires_at,mfa_verified_until,verified_email,claimed_email) VALUES($1,$2,$3,$4,NULL,$5,$6,$7)',[digest(token),userId,String(verified.payload.name ?? verified.payload.sub),random(),mfaUntil,verifiedEmail,claimedEmail]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    reply.clearCookie('gather_oidc_state',{path:'/'});
    reply.setCookie('gather_session',token,{httpOnly:true,secure:settings.production,sameSite:'lax',path:'/',maxAge:MEMBER_COOKIE_SECONDS});
    const memberships=(await database.pool.query('SELECT * FROM auth_memberships($1) ORDER BY name',[userId])).rows;
    const membership=flow.church_slug ? memberships.find(item=>item.slug===flow.church_slug) : memberships[0];
    const workspaceAccess = !settings.production || contributor;
    const destination=flow.church_slug && !membership ? '/sign-in?issue=church-access' : membership&&(!workspaceAccess||!membership.capabilities.includes('workspace:read'))?`/c/${membership.slug}`:membership?`/dashboard?church=${membership.id}`:flow.continuation?flow.continuation:'/onboarding?intent=join';
    return reply.redirect(`${settings.appOrigin}${flow.church_slug && !membership ? destination : safeContinuation(flow.continuation)??(!flow.church_slug&&memberships.length>1?'/choose-church':destination)}`);
  });
  app.get('/v1/auth/session',async request => {
    const session = await authenticate(database,request,'member');
    const churches = await database.pool.query('SELECT * FROM auth_memberships($1)',[session.userId]);
    return {user:{id:session.userId,displayName:session.displayName},churches:churches.rows.map(row=>({id:row.id,slug:row.slug,name:row.name,timeZone:row.time_zone,capabilities:session.privileged ? row.capabilities : [],contributorAccess:row.capabilities.includes('workspace:read')})),csrfToken:session.csrfToken,access:session.privileged?'contributor':'member'};
  });
  app.post('/v1/auth/logout',async (request,reply) => {
    const session = await authenticate(database,request,'member'); csrf(request,session,settings.appOrigin);
    await database.pool.query('DELETE FROM auth_sessions WHERE token_hash=$1',[digest(request.cookies.gather_session!)]);
    reply.clearCookie('gather_session',{path:'/'}); reply.clearCookie('gather_oidc_state',{path:'/'}); return {signedOut:true};
  });
}
