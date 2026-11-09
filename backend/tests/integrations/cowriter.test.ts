import { test } from 'node:test';
import assert from 'node:assert/strict';
import { azureBaseUrl, cowriterConfig, CowriterAdapter, transcriptText } from '../../src/integrations/cowriter.js';
import { IntegrationError } from '../../src/integrations/errors.js';

test('Azure endpoint normalization, configuration gates and text validation fail closed', () => {
  for (const endpoint of ['https://demo.openai.azure.com', 'https://demo.openai.azure.com/', 'https://demo.openai.azure.com/openai/v1/']) assert.equal(azureBaseUrl(endpoint), 'https://demo.openai.azure.com/openai/v1');
  for (const endpoint of ['http://demo.openai.azure.com', 'https://evil.example', 'https://demo.openai.azure.com/openai/deployments/x', 'https://demo.openai.azure.com/?key=x', 'https://demo.openai.azure.com@evil.example', 'https://demo.openai.azure.com:444']) assert.throws(() => azureBaseUrl(endpoint));
  assert.throws(() => cowriterConfig({}));
  const env = { EXTERNAL_SERVICES_ENABLED: 'true', STUDY_COWRITER_ENABLED: 'true', AZURE_OPENAI_API_KEY: 'fixture-key', AZURE_OPENAI_DEPLOYMENT: 'gpt-5.6-luna', AZURE_OPENAI_ENDPOINT: 'https://demo.openai.azure.com' };
  assert.equal(cowriterConfig(env).provider, 'azure');
  assert.throws(() => cowriterConfig({ ...env, AZURE_OPENAI_DEPLOYMENT: 'other' }));
  assert.equal(transcriptText(' Notes '), 'Notes');
  for (const text of ['', 'binary\u0000text', '\uFFFD', 'x'.repeat(6 * 1024 * 1024 + 1)]) assert.throws(() => transcriptText(text));
});

test('Azure chat is bounded, uses key authentication, does not retry and sanitizes failures', async () => {
  let calls = 0;
  const fetcher: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(url, 'https://demo.openai.azure.com/openai/v1/responses');
    assert.equal(new Headers(init?.headers).get('api-key'), 'fixture-key');
    assert.equal(new Headers(init?.headers).has('Authorization'), false);
    assert.equal(init?.redirect, 'error');
    const body = JSON.parse(init!.body as string);
    assert.equal(body.store, false); assert.equal(body.model, 'gpt-5.6-luna'); assert.equal(body.max_output_tokens, 1500); assert.deepEqual(body.tools, []);
    return Response.json({ id: 'fixture', model: body.model, status: 'completed', output: [{ type: 'reasoning' }, { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'A simple explanation.' }] }], usage: { input_tokens: 100, output_tokens: 20 } });
  };
  const config = { apiKey: 'fixture-key', model: 'gpt-5.6-luna', baseUrl: 'https://demo.openai.azure.com/openai/v1', fetch: fetcher };
  assert.equal((await new CowriterAdapter(config).chat({ task: 'Explain', context: {}, history: [] })).text, 'A simple explanation.');
  await assert.rejects(new CowriterAdapter(config).chat({ task: 'x'.repeat(25001), context: {}, history: [] })); assert.equal(calls, 1);
  for (const status of [401, 403, 404, 429, 500]) {
    const adapter = new CowriterAdapter({ ...config, fetch: async () => { calls++; return new Response('private provider body', { status }); } });
    await assert.rejects(adapter.chat({ task: 'Hi', context: {}, history: [] }), error => error instanceof Error && !error.message.includes('private provider body'));
  }
  assert.equal(calls, 6);
  for (const response of [{ status: 'incomplete' }, { id: 'x', model: 'x', status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'refusal' }] }] }, { id: 'x', model: 'x', status: 'completed', output: [] }]) await assert.rejects(new CowriterAdapter({ ...config, fetch: async () => Response.json(response) }).chat({ task: 'Hi', context: {}, history: [] }));
  await assert.rejects(new CowriterAdapter({ ...config, fetch: async () => { throw new Error('private header/key'); } }).chat({ task: 'Hi', context: {}, history: [] }), /no automatic retry/);
});

test('Azure incomplete replies identify safe provider reasons without exposing response content', async () => {
  const cases = [
    { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, code: 'AI_OUTPUT_LIMIT', text: 'reply length limit' },
    { status: 'incomplete', incomplete_details: { reason: 'content_filter' }, code: 'AI_CONTENT_FILTER', text: 'content filter' },
    { status: 'incomplete', incomplete_details: { reason: 'other_private_reason' }, code: 'AI_INCOMPLETE', text: 'stopped the reply' },
    { status: 'failed', error: { message: 'private provider detail' }, code: 'AI_PROVIDER_FAILED', text: 'generation failed' },
    { status: 'cancelled', code: 'AI_PROVIDER_CANCELLED', text: 'cancelled the reply' },
    { status: 'completed', output: null, code: 'AI_INVALID_RESPONSE', text: 'unexpected reply format' },
  ];
  for (const item of cases) {
    const response = { id: 'resp_abc123', model: 'gpt-5.6-luna', output: [], ...item };
    const adapter = new CowriterAdapter({ apiKey: 'fixture', model: 'gpt-5.6-luna', baseUrl: 'https://demo.openai.azure.com/openai/v1', fetch: async () => Response.json(response) });
    await assert.rejects(adapter.chat({ task: 'Explain', context: {}, history: [] }), error => {
      assert.ok(error instanceof IntegrationError);
      assert.equal(error.code, item.code);
      assert.match(error.message, new RegExp(item.text));
      assert.match(error.message, /resp_abc123/);
      assert.doesNotMatch(error.message, /private/);
      return true;
    });
  }
});
