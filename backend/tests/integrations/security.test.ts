import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { parseTranscript, validateSourceUrl, isPublicAddress } from '../../src/integrations/ingestion.js';
import { encryptToken, decryptToken, verifyPlanningCenterWebhook } from '../../src/integrations/planning-center.js';
import { verifyTwilioSignature } from '../../src/integrations/twilio.js';
import { verifyScripture, type ScriptureEvidence } from '../../src/integrations/scripture.js';

test('SSRF denies private IPv4, IPv6, mapped and encoded literals, mixed DNS and URL tricks', async () => {
  for (const address of ['0.0.0.0', '127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '224.0.0.1', '::1', '::', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '64:ff9b::a00:1', '2002:a00:1::', '2001:db8::1']) assert.equal(isPublicAddress(address), false, address);
  assert.equal(isPublicAddress('8.8.8.8'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
  const publicResolver = async () => [{ address: '8.8.8.8', family: 4 }];
  const mixedResolver = async () => [{ address: '8.8.8.8', family: 4 }, { address: '127.0.0.1', family: 4 }];
  await assert.rejects(validateSourceUrl('https://sermon.example/a', ['sermon.example'], mixedResolver), { code: 'UNSAFE_DESTINATION' });
  for (const url of ['http://sermon.example/a', 'https://sermon.example:444/a', 'https://name:secret@sermon.example/a', 'https://sermon.example.evil/a', 'https://sermon.example/a#fragment']) await assert.rejects(validateSourceUrl(url, ['sermon.example'], publicResolver));
  await assert.rejects(validateSourceUrl('https://2130706433/a', ['127.0.0.1'], publicResolver));
  const result = await validateSourceUrl('https://sermon.example/a', ['sermon.example'], publicResolver);
  assert.equal(result.addresses[0]!.address, '8.8.8.8');
});

test('TXT VTT SRT extraction is bounded, review-only and rejects unsupported binary/malformed input', () => {
  const encode = (value: string) => Buffer.from(value);
  assert.equal(parseTranscript(encode('A sermon\r\nnotes'), 'txt').normalizedText, 'A sermon\nnotes');
  const vtt = parseTranscript(encode('WEBVTT\n\n00:00:01.000 --> 00:00:02.500\n<v Speaker>Hello</v>\n\n00:03.000 --> 00:04.000\nSecond'), 'vtt');
  assert.equal(vtt.spans[0]!.text, 'Hello');
  assert.equal(vtt.spans[1]!.startMs, 3000);
  assert.equal(vtt.reviewStatus, 'needs_review');
  assert.equal(parseTranscript(encode('1\n00:00:00,000 --> 00:00:01,000\nHello'), 'srt').spans[0]!.endMs, 1000);
  assert.throws(() => parseTranscript(encode('%PDF-1.5'), 'txt'));
  assert.throws(() => parseTranscript(new Uint8Array([255, 0]), 'txt'));
  assert.throws(() => parseTranscript(encode(''), 'txt'));
  assert.throws(() => parseTranscript(encode('notes'), 'txt', { maxBytes: 2 }));
  assert.throws(() => parseTranscript(encode('WEBVTT\n\n00:00:02.000 --> 00:00:01.000\nNo'), 'vtt'));
  assert.throws(() => parseTranscript(encode('WEBVTT\n\nnot a cue'), 'vtt'));
  assert.throws(() => parseTranscript(encode('no'), 'pdf' as 'txt'), { code: 'UNSUPPORTED_FORMAT' });
});

test('AES GCM tokens authenticate tenant/connection binding and detect tampering', () => {
  const key = randomBytes(32).toString('base64');
  const first = encryptToken('private-refresh', 'tenant-a:connection-a', key);
  assert.notEqual(first, encryptToken('private-refresh', 'tenant-a:connection-a', key));
  assert.equal(decryptToken(first, 'tenant-a:connection-a', key), 'private-refresh');
  assert.throws(() => decryptToken(first, 'tenant-b:connection-a', key), { code: 'INVALID_TOKEN_ENVELOPE' });
  assert.throws(() => decryptToken(first.slice(0, -4) + 'AAAA', 'tenant-a:connection-a', key));
  assert.throws(() => encryptToken('token', 'binding', 'invalid'), { code: 'INVALID_ENCRYPTION_KEY' });
});

test('PCO authenticates exact raw body, not reserialized JSON', () => {
  const raw = Buffer.from('{ "data": [] }');
  const signature = createHmac('sha256', 'subscription-secret').update(raw).digest('hex');
  assert.equal(verifyPlanningCenterWebhook(raw, signature, 'subscription-secret'), true);
  assert.equal(verifyPlanningCenterWebhook(Buffer.from('{"data":[]}'), signature, 'subscription-secret'), false);
  assert.equal(verifyPlanningCenterWebhook(raw, signature, 'wrong'), false);
});

test('Twilio official security example validates exact external URL and all form fields', () => {
  const input = { externalUrl: 'https://example.com/myapp.php?foo=1&bar=2', rawBody: new URLSearchParams({ CallSid: 'CA1234567890ABCDE', Caller: '+14158675310', Digits: '1234', From: '+14158675310', To: '+18005551212' }).toString(), contentType: 'application/x-www-form-urlencoded' as const, signature: 'L/OH5YylLD5NRKLltdqwSvS0BnU=', authToken: '12345' };
  assert.equal(verifyTwilioSignature(input), true);
  assert.equal(verifyTwilioSignature({ ...input, externalUrl: input.externalUrl.replace('https:', 'http:') }), false);
  assert.equal(verifyTwilioSignature({ ...input, rawBody: input.rawBody + '&NewField=value' }), false);
});

test('Scripture existence, exact licensed quotation, and interpretation remain separate', () => {
  const evidence: ScriptureEvidence = { reference: 'John 6:68', referenceExists: true, translation: 'test', edition: 'fixture', authorizedText: 'Authorized fixture quotation.', rightsConfirmed: true, licenseId: 'fixture-rights', retrievedAt: '2026-10-19T00:00:00Z', sourceId: 'licensed-fixture' };
  const input = { reference: 'John 6:68', translation: 'test', edition: 'fixture', quote: evidence.authorizedText! };
  assert.equal(verifyScripture(input, evidence).exactLicensedText, true);
  assert.equal(verifyScripture(input, evidence).interpretationVerified, false);
  assert.equal(verifyScripture({ ...input, quote: 'Different text.' }, evidence).status, 'unverified_quotation');
  assert.equal(verifyScripture(input, { ...evidence, rightsConfirmed: false }).exactLicensedText, false);
  assert.equal(verifyScripture({ ...input, reference: 'John 99:99' }, evidence).referenceExists, false);
  assert.equal(verifyScripture(input, null).status, 'unverified_reference');
});

test('Twilio JSON signatures bind raw body hash, exact URL, and reject body tampering', () => {
  const rawBody = '{ "MessageStatus": "delivered" }';
  const externalUrl = `https://callback.example/twilio?bodySHA256=${createHash('sha256').update(rawBody).digest('hex')}`;
  const signature = createHmac('sha1', 'fixture-auth-token').update(externalUrl).digest('base64');
  const input = { rawBody, externalUrl, signature, authToken: 'fixture-auth-token', contentType: 'application/json' as const };
  assert.equal(verifyTwilioSignature(input), true);
  assert.equal(verifyTwilioSignature({ ...input, rawBody: '{"MessageStatus":"delivered"}' }), false);
  assert.equal(verifyTwilioSignature({ ...input, externalUrl: 'https://callback.example/twilio' }), false);
});
