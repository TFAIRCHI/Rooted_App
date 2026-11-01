import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCivilTime, evaluateCatchup, recipientSendWindow, smsSegments } from '../../src/integrations/time.js';

test('civil intent resolves to UTC; gaps reject; overlap requires matching offset', () => {
  assert.equal(resolveCivilTime({ localDate: '2026-10-19', localTime: '08:00', zone: 'America/New_York' }).utc, '2026-10-19T12:00:00.000Z');
  assert.throws(() => resolveCivilTime({ localDate: '2026-03-08', localTime: '02:30', zone: 'America/New_York' }), { code: 'NONEXISTENT_LOCAL_TIME' });
  assert.throws(() => resolveCivilTime({ localDate: '2026-11-01', localTime: '01:30', zone: 'America/New_York' }), { code: 'AMBIGUOUS_LOCAL_TIME' });
  assert.equal(resolveCivilTime({ localDate: '2026-11-01', localTime: '01:30', zone: 'America/New_York', offsetMinutes: -240 }).utc, '2026-11-01T05:30:00.000Z');
  assert.equal(resolveCivilTime({ localDate: '2026-11-01', localTime: '01:30', zone: 'America/New_York', offsetMinutes: -300 }).utc, '2026-11-01T06:30:00.000Z');
  assert.throws(() => resolveCivilTime({ localDate: '2026-11-01', localTime: '01:30', zone: 'America/New_York', offsetMinutes: -360 }), { code: 'INVALID_OFFSET' });
  assert.throws(() => resolveCivilTime({ localDate: '2026-02-30', localTime: '08:00', zone: 'America/New_York' }));
  assert.throws(() => resolveCivilTime({ localDate: '2026-10-19', localTime: '08:00', zone: 'UTC-4' }));
});

test('outage recovery is bounded at 15 minutes and approval must precede deadline', () => {
  const input = { scheduledAt: '2026-10-19T12:00:00Z', approvedAt: '2026-10-18T12:00:00Z', unchanged: true };
  assert.equal(evaluateCatchup({ ...input, now: '2026-10-19T12:15:00Z' }), 'eligible');
  assert.equal(evaluateCatchup({ ...input, now: '2026-10-19T12:15:00.001Z' }), 'staff_review');
  assert.equal(evaluateCatchup({ ...input, now: '2026-10-19T11:59:59Z' }), 'not_due');
  assert.equal(evaluateCatchup({ ...input, now: '2026-10-19T12:05:00Z', approvedAt: '2026-10-19T12:01:00Z' }), 'blocked_approval');
  assert.equal(evaluateCatchup({ ...input, now: '2026-10-19T12:05:00Z', unchanged: false }), 'blocked_approval');
  assert.equal(evaluateCatchup({ ...input, now: '2026-10-19T12:05:00Z', approvedAt: null }), 'blocked_approval');
  assert.throws(() => evaluateCatchup({ ...input, now: '2026-02-30T12:05:00Z' }), { code: 'INVALID_INSTANT' });
});

test('recipient window holds unknown zones, bounds 09–20, and respects expiry', () => {
  const input = { zone: 'America/New_York', expiresAt: '2026-10-20T18:00:00Z' };
  assert.deepEqual(recipientSendWindow({ ...input, now: '2026-10-19T12:00:00Z' }), { decision: 'defer', nextEligibleAt: '2026-10-19T13:00:00.000Z' });
  assert.deepEqual(recipientSendWindow({ ...input, now: '2026-10-19T13:00:00Z' }), { decision: 'send' });
  assert.deepEqual(recipientSendWindow({ ...input, now: '2026-10-20T00:00:00Z' }), { decision: 'defer', nextEligibleAt: '2026-10-20T13:00:00.000Z' });
  assert.deepEqual(recipientSendWindow({ ...input, now: '2026-10-19T12:00:00Z', zone: null }), { decision: 'hold_unknown_zone' });
  assert.deepEqual(recipientSendWindow({ ...input, now: '2026-10-20T00:00:00Z', expiresAt: '2026-10-20T12:00:00Z' }), { decision: 'expired' });
  assert.deepEqual(recipientSendWindow({ ...input, now: input.expiresAt }), { decision: 'expired' });
});

test('SMS sizing accounts for GSM escapes, UTF-16 surrogates and segment boundaries', () => {
  assert.deepEqual(smsSegments(''), { encoding: 'GSM-7', units: 0, segments: 0 });
  assert.deepEqual(smsSegments('a'.repeat(160)), { encoding: 'GSM-7', units: 160, segments: 1 });
  assert.equal(smsSegments('a'.repeat(161)).segments, 2);
  assert.deepEqual(smsSegments('^{}\\[~]|€\f'), { encoding: 'GSM-7', units: 20, segments: 1 });
  assert.equal(smsSegments('^'.repeat(153)).segments, 3);
  assert.deepEqual(smsSegments('😀'.repeat(35)), { encoding: 'UCS-2', units: 70, segments: 1 });
  assert.equal(smsSegments('😀'.repeat(67)).segments, 3);
  assert.equal(smsSegments('“'.repeat(71)).segments, 2);
});
