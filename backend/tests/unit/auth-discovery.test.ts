import assert from 'node:assert/strict';
import { test } from 'node:test';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { authRoutes } from '../../src/auth/routes.js';
import type { config } from '../../src/infrastructure/config.js';
import type { Database } from '../../src/infrastructure/database.js';

const issuer = 'https://tenant-id.ciamlogin.com/tenant-id/v2.0';
const discoveryUrl = 'https://customers.ciamlogin.com/tenant-id/v2.0/.well-known/openid-configuration';
const authorization = 'https://customers.ciamlogin.com/tenant-id/oauth2/v2.0/authorize';

for (const validIssuer of [true, false]) {
  test(`customer discovery keeps the signed issuer separate: ${validIssuer ? 'accept matching issuer' : 'reject mismatch on every attempt'}`, async t => {
    const app = Fastify();
    await app.register(cookie);
    t.after(() => app.close());
    const database = {pool:{query:async () => ({rows:[]})}} as unknown as Database;
    const settings = {production:true,issuer,discoveryUrl,clientId:'member-client',contributorClientId:'contributor-client',callbackUrl:'https://rooted.test/api/v1/auth/callback'} as ReturnType<typeof config>;
    let requests = 0;
    t.mock.method(globalThis, 'fetch', async (input: Parameters<typeof fetch>[0]) => {
      assert.equal(String(input), discoveryUrl);
      requests++;
      return Response.json({issuer:validIssuer ? issuer : 'https://wrong.example',authorization_endpoint:authorization,token_endpoint:'https://customers.ciamlogin.com/token',jwks_uri:'https://customers.ciamlogin.com/keys'});
    });
    await authRoutes(app,database,settings);
    for (const access of ['member','contributor']) {
      const response = await app.inject(`/v1/auth/login?access=${access}`);
      assert.equal(response.statusCode,validIssuer ? 302 : 503,response.body);
      if (validIssuer) {
        const target = new URL(response.headers.location!);
        assert.equal(target.origin + target.pathname,authorization);
        assert.equal(target.searchParams.get('client_id'),`${access}-client`);
        assert.equal(target.searchParams.get('code_challenge_method'),'S256');
        assert.ok(target.searchParams.get('state'));
        assert.ok(target.searchParams.get('nonce'));
        if (access === 'contributor') {
          assert.equal(target.searchParams.get('prompt'),'login');
          assert.equal(target.searchParams.get('max_age'),'0');
          assert.deepEqual(JSON.parse(target.searchParams.get('claims')!),{id_token:{amr:{essential:true,values:['mfa']},auth_time:{essential:true}}});
        }
      }
    }
    assert.equal(requests,validIssuer ? 1 : 2);
  });
}
