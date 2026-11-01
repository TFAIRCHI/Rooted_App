import { jwtVerify, type JWTVerifyGetKey } from 'jose';

export function verifyIdentityToken(token: string, key: JWTVerifyGetKey, issuer: string, audience: string) {
  return jwtVerify(token,key,{
    issuer,audience,
    algorithms:['RS256','PS256','ES256','EdDSA'],
    requiredClaims:['exp','iat','sub','nonce'],
    // Allow the agreed 30-second window for provider/API clock and delivery differences.
    clockTolerance:30,
  });
}
