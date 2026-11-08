import '../infrastructure/config.js';
import { createServer } from 'node:http';
import Provider from 'oidc-provider';

export async function startLocalIssuer(port = 4010) {
  if (process.env.NODE_ENV === 'production') throw new Error('Local fixture issuer is forbidden in production');
  const issuer = `http://127.0.0.1:${port}`;
  const provider = new Provider(issuer, {
    clients: [{ client_id: process.env.OIDC_CLIENT_ID ?? 'gather-local', redirect_uris: [process.env.OIDC_CALLBACK_URL ?? 'http://127.0.0.1:3000/api/v1/auth/callback'], response_types: ['code'], grant_types: ['authorization_code'], token_endpoint_auth_method: 'none' }],
    features: { devInteractions: { enabled: false }, claimsParameter: { enabled: true } },
    pkce: { required: () => true },
    claims: { openid: ['sub'], profile: ['name'], email: ['email','email_verified'] },
    findAccount: async (_context, subject) => ({ accountId: subject, claims: async () => ({sub: subject, name: `Local ${subject}`, email: `${subject}@rooted.test`, email_verified: true}) }),
    interactions: { url: async (_context, interaction) => `/interaction/${interaction.uid}` },
    cookies: { keys: ['local-fixture-issuer-key-only-not-for-production'] },
  });
  const callback = provider.callback();
  const server = createServer(async (request, response) => {
    try {
      if (request.url?.startsWith('/interaction/')) {
        const details = await provider.interactionDetails(request,response);
        const persona = String(details.params.login_hint ?? '');
        if (!['contributor','pastor','admin','member','anna.contributor','james.contributor','riley.member','morgan.admin'].includes(persona)) { response.writeHead(400); response.end('Choose a fictional persona through the application login'); return; }
        if (details.prompt.name === 'login') {
          await provider.interactionFinished(request,response,{login:{accountId:persona}},{mergeWithLastSubmission:false});
        } else if (details.prompt.name === 'consent') {
          const grant = details.grantId ? await provider.Grant.find(details.grantId) : new provider.Grant({accountId:details.session!.accountId,clientId:String(details.params.client_id)});
          if (!grant) throw new Error('Local consent grant missing');
          const scopes = details.prompt.details.missingOIDCScope as string[] | undefined;
          if (scopes) grant.addOIDCScope(scopes.join(' '));
          const claims = details.prompt.details.missingOIDCClaims as string[] | undefined;
          if (claims) grant.addOIDCClaims(claims);
          await provider.interactionFinished(request,response,{consent:{grantId:await grant.save()}},{mergeWithLastSubmission:true});
        } else { response.writeHead(400); response.end('Unsupported local interaction'); }
      } else callback(request,response);
    } catch { response.writeHead(500); response.end('Local identity interaction failed'); }
  });
  await new Promise<void>(resolve => server.listen(port,'127.0.0.1',resolve));
  return server;
}

if (/\/local-issuer\.[tj]s$/.test(process.argv[1]?.replaceAll('\\','/')??'')) {
  await startLocalIssuer();
  console.log('Local OIDC fixture issuer listening on http://127.0.0.1:4010; never use for production');
}
