import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PublicSignIn } from './sign-in';

vi.mock('./frame',()=>({PublicFrame:({children}:{children:React.ReactNode})=><>{children}</>,FlowStory:()=>null}));
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});

it('uses the member email flow and preserves the study destination',async()=>{
  vi.spyOn(globalThis,'fetch').mockImplementation(async input=>String(input).endsWith('/auth/options')?json({localIssuer:false,demoLogin:false}):json({message:'Sign in'},401));
  const destination='/c/grace/studies/10000000-0000-4000-8000-000000000001';
  render(<PublicSignIn returnTo={destination}/>);
  const link=await screen.findByRole('link',{name:'Member sign in →'});
  await waitFor(()=>expect(link).toHaveAttribute('href'));
  const target=new URL(link.getAttribute('href')!,'https://rooted.test');
  expect(target.searchParams.get('access')).toBe('member');
  expect(target.searchParams.get('returnTo')).toBe(destination);
  expect(screen.getByText(/stay signed in on this browser until you sign out/)).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Contributor or administrator sign in →'})).toHaveAttribute('href',expect.stringContaining('access=contributor'));
});

it('keeps an existing reader on contributor verification instead of redirecting in a loop',async()=>{
  const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>String(input).endsWith('/auth/options')?json({localIssuer:false,demoLogin:false}):json({user:{id:'reader',displayName:'Reader'},churches:[{slug:'grace',capabilities:[]}],access:'member',csrfToken:'test'}));
  render(<PublicSignIn returnTo='/dashboard'/>);
  const link=await screen.findByRole('link',{name:'Verify contributor access →'});
  await waitFor(()=>expect(link).toHaveAttribute('href',expect.stringContaining('access=contributor')));
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(screen.getByText('Your church workspace.')).toBeInTheDocument();
  expect(screen.queryByText(/stay signed in on this browser/)).not.toBeInTheDocument();
});
