import assert from 'node:assert/strict';
import { test } from 'node:test';
import { errors, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { verifyIdentityToken } from '../../src/auth/verify-identity-token.js';

test('identity validation allows 30 seconds of clock skew and retains signature, issuer, audience and required-claim checks', async t => {
  const now = 1800000000;
  t.mock.timers.enable({apis:['Date'],now:now*1000});
  const {privateKey,publicKey} = await generateKeyPair('RS256');
  const issuer = 'https://identity.example/tenant';
  const audience = 'contributor-client';
  const claims = {iss:issuer,aud:audience,sub:'test-user',nonce:'test-nonce',iat:now-300,exp:now};
  const sign = (payload:JWTPayload) => new SignJWT(payload).setProtectedHeader({alg:'RS256'}).sign(privateKey);
  const verify = async (payload:JWTPayload) => verifyIdentityToken(await sign(payload),async()=>publicKey,issuer,audience);
  for (const age of [0,5,20,29]) {
    const result = await verify({...claims,exp:now-age});
    assert.equal(result.payload.sub,claims.sub);
  }
  for (const age of [30,31,60,300]) await assert.rejects(verify({...claims,exp:now-age}),errors.JWTExpired);
  for (const invalid of [{...claims,iss:'https://wrong.example'},{...claims,aud:'wrong-client'},{...claims,nonce:undefined}]) {
    await assert.rejects(verify(invalid),errors.JWTClaimValidationFailed);
  }
  const otherKey = await generateKeyPair('RS256');
  await assert.rejects(verifyIdentityToken(await sign(claims),async()=>otherKey.publicKey,issuer,audience),errors.JWSSignatureVerificationFailed);
});
