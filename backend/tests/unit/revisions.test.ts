import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canonical, hash, planPayloadSchema, blankPlan } from '../../src/modules/revisions.js';
import { verifyCanonical, type AggregateRow } from '../../src/modules/editorial.js';

test('canonical revision hashing is deterministic across nested key order and Unicode',()=>{
  assert.equal(canonical({title:'Peter’s reply',nested:{question:'Why?',number:1}}),canonical({nested:{number:1,question:'Why?'},title:'Peter’s reply'}));
  assert.equal(hash(canonical({first:1,second:2})),hash(canonical({second:2,first:1})));
  assert.notEqual(hash(canonical({first:1})),hash(canonical({first:2})));
});
test('draft plan schema permits empty work and rejects unrecognized fields',()=>{
  assert.deepEqual(planPayloadSchema.parse(blankPlan()),blankPlan());
  assert.equal(planPayloadSchema.safeParse({...blankPlan(),approved:true}).success,false);
});
test('canonical verification binds author and revision number in addition to payload',()=>{
  const aggregate={church_id:'church',id:'plan',kind:'plan'} as AggregateRow;
  const envelope={churchId:'church',aggregateId:'plan',kind:'plan',authorId:'contributor',number:2,payload:{title:'Original'},calendar:{},planApprovalId:null,planHash:null};
  const bytes=canonical(envelope);
  const row={canonical_bytes:bytes,hash:hash(bytes),payload:envelope.payload,calendar:{},plan_approval_id:null,plan_hash:null,author_id:'contributor',number:2};
  assert.doesNotThrow(()=>verifyCanonical(row,aggregate));
  assert.throws(()=>verifyCanonical({...row,author_id:'pastor'},aggregate),/canonical binding/);
  assert.throws(()=>verifyCanonical({...row,number:3},aggregate),/canonical binding/);
});
