import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PublicSignIn } from './sign-in';

vi.mock('./frame',()=>({PublicFrame:({children}:{children:React.ReactNode})=><>{children}</>,FlowStory:()=>null}));
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});

it('offers contributor sign-in and a church-link route for readers',async()=>{
  vi.spyOn(globalThis,'fetch').mockImplementation(async input=>String(input).endsWith('/auth/options')?json({localIssuer:false,demoLogin:false}):json({message:'Sign in'},401));
  render(<PublicSignIn/>);
  const link=await screen.findByRole('link',{name:'Contributor or administrator sign in →'});
  await waitFor(()=>expect(link).toHaveAttribute('href'));
  const target=new URL(link.getAttribute('href')!,'https://rooted.test');
  expect(target.searchParams.get('access')).toBe('contributor');
  expect(target.searchParams.has('returnTo')).toBe(false);
  expect(screen.getByText(/Members can read studies through a church link without signing in/)).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Use a church link or invitation →'})).toHaveAttribute('href','/find-church');
  expect(screen.queryByText(/Member sign in/)).not.toBeInTheDocument();
});

it('preserves a workspace destination and does not redirect a legacy reader session',async()=>{
  const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>String(input).endsWith('/auth/options')?json({localIssuer:false,demoLogin:false}):json({user:{id:'reader',displayName:'Reader'},churches:[{slug:'grace',capabilities:[]}],access:'member',csrfToken:'test'}));
  render(<PublicSignIn returnTo='/dashboard'/>);
  const link=await screen.findByRole('link',{name:'Contributor or administrator sign in →'});
  await waitFor(()=>expect(link).toHaveAttribute('href',expect.stringContaining('access=contributor')));
  expect(link).toHaveAttribute('href',expect.stringContaining('returnTo=%2Fdashboard'));
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(screen.getByText('Your church workspace.')).toBeInTheDocument();
});

it('presents account verification as the next step of church setup',async()=>{
  vi.spyOn(globalThis,'fetch').mockImplementation(async input=>String(input).endsWith('/auth/options')?json({localIssuer:false,demoLogin:false}):json({message:'Sign in'},401));
  render(<PublicSignIn returnTo='/onboarding?intent=create-church'/>);
  const link=await screen.findByRole('link',{name:'Create account or sign in →'});
  await waitFor(()=>expect(link).toHaveAttribute('href'));
  const target=new URL(link.getAttribute('href')!,'https://rooted.test');
  expect(target.searchParams.get('access')).toBe('contributor');
  expect(target.searchParams.get('returnTo')).toBe('/onboarding?intent=create-church');
  expect(screen.getByText(/return to confirm your church’s workspace/)).toBeInTheDocument();
});
