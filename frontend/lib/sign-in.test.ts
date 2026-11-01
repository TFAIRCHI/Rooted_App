import { expect, it } from 'vitest';
import { contributorSignIn, loginAccess } from './sign-in';

it('uses simple sign-in for reading and joining, and MFA for workspace and church creation',()=>{
  for(const path of [undefined,'/c/grace','/user','/onboarding?intent=join','/onboarding/complete']) expect(loginAccess(path)).toBe('member');
  for(const path of ['/dashboard','/studies','/settings','/onboarding?intent=create-church']) expect(loginAccess(path)).toBe('contributor');
  const target=new URL(contributorSignIn('//evil.example'),'https://rooted.test');
  expect(target.searchParams.get('access')).toBe('contributor');
  expect(target.searchParams.get('returnTo')).toBe('/dashboard');
});
