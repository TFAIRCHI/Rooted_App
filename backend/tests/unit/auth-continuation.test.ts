import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeContinuation } from '../../src/auth/continuation.js';
test('auth continuation permits bounded application destinations and rejects redirect bypasses',()=>{
  for(const path of ['/dashboard','/onboarding?intent=create-church','/onboarding?intent=join','/c/grace','/onboarding/complete?church=10000000-0000-4000-8000-000000000001']) assert.equal(safeContinuation(path),path);
  for(const value of [undefined,['/dashboard'],'https://evil.example','//evil.example','/\\evil.example','/%2f%2fevil.example','/dashboard#evil','/dashboard?returnTo=https://evil.example','/onboarding?intent=admin','/onboarding?intent=join&intent=create-church','/api/v1/auth/logout','/c/grace?role=admin','/dashboard\n']) assert.equal(safeContinuation(value),undefined);
});
