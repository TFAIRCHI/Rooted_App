import { errors } from 'jose';

// Never log the error object: JOSE claim errors carry the token's full payload.
export function verificationDiagnostic(error: unknown, nowSeconds = Date.now()/1000) {
  if (error instanceof errors.JWTClaimValidationFailed || error instanceof errors.JWTExpired) {
    const claims = ['iss','aud','exp','iat','sub','nonce','nbf'];
    const reasons = ['check_failed','invalid','mismatch','missing','unspecified'];
    const timing: {expiredBySeconds?:number;issuedAgoSeconds?:number;tokenLifetimeSeconds?:number} = {};
    if (error instanceof errors.JWTExpired) {
      const {exp,iat} = error.payload;
      // Only numeric timing differences; no identity claims or complete payloads.
      if (typeof exp === 'number' && Number.isSafeInteger(exp)) timing.expiredBySeconds = Math.floor(nowSeconds)-exp;
      if (typeof iat === 'number' && Number.isSafeInteger(iat)) timing.issuedAgoSeconds = Math.floor(nowSeconds)-iat;
      if (typeof exp === 'number' && Number.isSafeInteger(exp) && typeof iat === 'number' && Number.isSafeInteger(iat) && Number.isSafeInteger(exp-iat)) timing.tokenLifetimeSeconds = exp-iat;
    }
    return {
      verificationCode:error instanceof errors.JWTExpired ? 'expired' : 'claim_validation_failed',
      claim:claims.includes(error.claim) ? error.claim : 'other',
      reason:reasons.includes(error.reason) ? error.reason : 'other',
      ...timing,
    };
  }
  if (error instanceof errors.JWKSNoMatchingKey) return {verificationCode:'signing_key_not_found'};
  if (error instanceof errors.JWKSTimeout) return {verificationCode:'signing_keys_timeout'};
  if (error instanceof errors.JWSSignatureVerificationFailed) return {verificationCode:'signature_invalid'};
  if (error instanceof errors.JOSEAlgNotAllowed) return {verificationCode:'algorithm_not_allowed'};
  return {verificationCode:'verification_unavailable_or_invalid'};
}
