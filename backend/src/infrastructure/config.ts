import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

if (process.env.NODE_ENV !== 'production') {
  const modulePath=fileURLToPath(import.meta.url);
  const environmentPath=modulePath.includes(`${process.platform==='win32'?'\\':'/'}dist${process.platform==='win32'?'\\':'/'}`)?resolve(dirname(modulePath),'../../../../.env'):fileURLToPath(new URL('../../../.env',import.meta.url));
  if (existsSync(environmentPath)) process.loadEnvFile(environmentPath);
}

export function config() {
  const production = process.env.NODE_ENV === 'production';
  const issuer = process.env.OIDC_ISSUER ?? 'http://127.0.0.1:4010';
  // Entra customer discovery can use a different hostname from the signed issuer.
  const discoveryUrl = process.env.OIDC_DISCOVERY_URL;
  const appOrigin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000';
  const databaseUrl = process.env.DATABASE_URL;
  const subjectMode = process.env.OIDC_SUBJECT_MODE ?? 'sub';
  if (subjectMode !== 'sub' && subjectMode !== 'entra-oid') throw new Error('OIDC_SUBJECT_MODE must be sub or entra-oid');
  if (!databaseUrl) throw new Error('DATABASE_URL is required and must use the nonowner runtime role');
  const issuerUrl=new URL(issuer);const originUrl=new URL(appOrigin);
  const loopback=(hostname:string)=>hostname==='localhost'||hostname==='[::1]'||hostname==='::1'||hostname.startsWith('127.')||hostname.endsWith('.localhost');
  if (discoveryUrl) {
    const endpoint = new URL(discoveryUrl);
    if (endpoint.username || endpoint.password || endpoint.hash || production && (endpoint.protocol !== 'https:' || loopback(endpoint.hostname))) {
      throw new Error('OIDC_DISCOVERY_URL must use public HTTPS in production, without credentials or fragment');
    }
  }
  if (production && (issuerUrl.protocol!=='https:' || originUrl.protocol!=='https:' || loopback(issuerUrl.hostname) || loopback(originUrl.hostname) || !process.env.OIDC_CLIENT_SECRET || !process.env.OIDC_CLIENT_ID || process.env.OIDC_CLIENT_ID==='gather-local')) {
    throw new Error('Production requires HTTPS OIDC/app origins and confidential client credentials');
  }
  if (production && (!process.env.OIDC_CONTRIBUTOR_CLIENT_ID || !process.env.OIDC_CONTRIBUTOR_CLIENT_SECRET || process.env.OIDC_CONTRIBUTOR_CLIENT_ID === process.env.OIDC_CLIENT_ID || subjectMode !== 'entra-oid' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(process.env.OIDC_TENANT_ID ?? ''))) {
    throw new Error('Production access-based sign-in requires separate member/contributor confidential clients and OIDC_SUBJECT_MODE=entra-oid with OIDC_TENANT_ID');
  }
  return {
    production, issuer, discoveryUrl, appOrigin, databaseUrl,
    clientId: process.env.OIDC_CLIENT_ID ?? 'gather-local',
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    contributorClientId: process.env.OIDC_CONTRIBUTOR_CLIENT_ID ?? process.env.OIDC_CLIENT_ID ?? 'gather-local',
    contributorClientSecret: process.env.OIDC_CONTRIBUTOR_CLIENT_SECRET ?? process.env.OIDC_CLIENT_SECRET,
    subjectMode: subjectMode as 'sub' | 'entra-oid',
    tenantId: process.env.OIDC_TENANT_ID,
    callbackUrl: process.env.OIDC_CALLBACK_URL ?? `${appOrigin}/api/v1/auth/callback`,
    port: Number(process.env.PORT ?? 4000),
  };
}
