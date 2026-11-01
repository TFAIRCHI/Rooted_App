import assert from 'node:assert/strict';
import { test } from 'node:test';
import { errors } from 'jose';
import { verificationDiagnostic } from '../../src/auth/verification-diagnostic.js';

test('identity verification diagnostics distinguish failed checks without token or error contents', () => {
  const secret = 'private-token-or-claim-value';
  const error = new errors.JWTClaimValidationFailed(secret,{sub:secret,email:secret},'aud','check_failed');
  assert.deepEqual(verificationDiagnostic(error),{verificationCode:'claim_validation_failed',claim:'aud',reason:'check_failed'});
  const unsafe = new errors.JWTClaimValidationFailed(secret,{sub:secret},secret,secret);
  assert.deepEqual(verificationDiagnostic(unsafe),{verificationCode:'claim_validation_failed',claim:'other',reason:'other'});
  for (const candidate of [error,unsafe,new Error(secret),{code:secret,payload:{sub:secret}},new errors.JWKSNoMatchingKey(secret)]) {
    assert.ok(!JSON.stringify(verificationDiagnostic(candidate)).includes(secret));
  }
  assert.deepEqual(verificationDiagnostic(new errors.JWKSTimeout()),{verificationCode:'signing_keys_timeout'});
  assert.deepEqual(verificationDiagnostic(new errors.JWSSignatureVerificationFailed()),{verificationCode:'signature_invalid'});
});

test('expired token diagnostics report timing differences only and omit invalid timestamps', () => {
  const error = new errors.JWTExpired('private message',{exp:995,iat:900,email:'private email',sub:'private subject'},'exp','check_failed');
  assert.deepEqual(verificationDiagnostic(error,1000),{verificationCode:'expired',claim:'exp',reason:'check_failed',expiredBySeconds:5,issuedAgoSeconds:100,tokenLifetimeSeconds:95});
  const invalid = new errors.JWTExpired('private message',{exp:NaN,iat:Infinity},'exp','check_failed');
  assert.deepEqual(verificationDiagnostic(invalid,1000),{verificationCode:'expired',claim:'exp',reason:'check_failed'});
});
