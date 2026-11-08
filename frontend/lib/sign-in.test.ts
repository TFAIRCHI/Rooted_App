import { expect, it } from 'vitest';
import { contributorSignIn } from './sign-in';

it('uses contributor access and rejects an unsafe return destination',()=>{
  const target=new URL(contributorSignIn('//evil.example'),'https://rooted.test');
  expect(target.searchParams.get('access')).toBe('contributor');
  expect(target.searchParams.get('returnTo')).toBe('/dashboard');
});
