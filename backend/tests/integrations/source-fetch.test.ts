import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { syncBuiltinESMExports } from 'node:module';
import { fetchSource } from '../../src/integrations/ingestion.js';

test('source transport pins validated DNS, preserves TLS hostname and rejects redirect/oversize', async context => {
  let statusCode = 200;
  let content = 'A safe source';
  let resolverCalls = 0;
  let requestCalls = 0;
  const captured: { url: URL; options: https.RequestOptions }[] = [];
  const fakeRequest = (url: URL, options: https.RequestOptions, onResponse: (response: unknown) => void) => {
    requestCalls += 1;
    captured.push({ url, options });
    const outbound = new EventEmitter() as EventEmitter & { end: () => void };
    outbound.end = () => {
      const response = new PassThrough() as PassThrough & { statusCode: number; headers: Record<string, string> };
      response.statusCode = statusCode;
      response.headers = { 'content-type': 'text/plain', location: 'https://127.0.0.1/private' };
      onResponse(response);
      if (!response.destroyed) response.end(Buffer.from(content));
    };
    return outbound;
  };
  context.mock.method(https, 'request', fakeRequest as unknown as typeof https.request);
  syncBuiltinESMExports();
  context.after(() => { context.mock.restoreAll(); syncBuiltinESMExports(); });
  const options = { allowedHosts: ['sermon.example'], resolver: async () => { resolverCalls += 1; return [{ address: '8.8.8.8', family: 4 }]; } };
  assert.equal((await fetchSource('https://sermon.example/source', options)).bytes.toString(), content);
  assert.equal(resolverCalls, 1);
  assert.equal(captured[0]!.url.hostname, 'sermon.example');
  assert.equal(captured[0]!.options.agent, false);
  assert.equal(captured[0]!.options.rejectUnauthorized, undefined);
  const lookup = captured[0]!.options.lookup!;
  const pinned = await new Promise<string>((resolve, reject) => {
    lookup('sermon.example', { family: 4 }, (error, address) => error ? reject(error) : resolve(address as string));
  });
  assert.equal(pinned, '8.8.8.8');
  assert.equal(resolverCalls, 1);
  statusCode = 302;
  await assert.rejects(fetchSource('https://sermon.example/source', options), { code: 'SOURCE_HTTP_REJECTED' });
  assert.equal(requestCalls, 2);
  statusCode = 200;
  content = 'b'.repeat(100);
  await assert.rejects(fetchSource('https://sermon.example/source', { ...options, maxBytes: 10 }), { code: 'SOURCE_TOO_LARGE' });
});
