import test from 'node:test';
import assert from 'node:assert/strict';
import { options, summary, localAdmin, ownedName } from '../../scripts/load-check.mjs';

test('benchmark requires explicit execution and rejects unbounded/unknown settings', () => {
  assert.equal(options([]).run, false);
  assert.equal(options(['--run']).readers, 2000);
  assert.equal(options(['--run', '--diagnostics']).diagnostics, true);
  for (const argument of ['--readers=0', '--readers=4001', '--rounds=21', '--timeout=901', '--database=gather', '--help']) {
    assert.throws(() => options([argument]));
  }
});

test('nearest-rank p95 includes tail latency and strict target boundary', () => {
  assert.equal(summary(Array.from({ length: 100 }, (_, index) => index + 1), 95).pass, false);
  assert.equal(summary([1, 2, 1000], 500).p95Ms, 1000);
  assert.throws(() => summary([], 500));
});

test('admin connection rejects remote hosts and options that can change destination', () => {
  assert.equal(localAdmin('postgres://postgres@127.0.0.1:54329/gather').pathname, '/postgres');
  for (const url of ['postgres://postgres@example.com/gather', 'postgres://gather_runtime@127.0.0.1/gather', 'postgres://postgres@127.0.0.1/gather?host=example.com']) assert.throws(() => localAdmin(url));
});

test('cleanup accepts only exact unique names created in this invocation', () => {
  const name = `gather_load_${'a'.repeat(24)}`;
  assert.equal(ownedName(name, new Set([name])), name);
  assert.throws(() => ownedName(name, new Set()));
  for (const forbidden of ['gather', 'gather_test', 'gather_load_existing', 'postgres']) assert.throws(() => ownedName(forbidden, new Set([forbidden])));
});
