import { IntegrationError } from './errors.js';

export type Fetch = typeof globalThis.fetch;

export interface TransportOptions { fetch?: Fetch; baseUrl?: string; timeoutMs?: number }

export async function boundedText(response: Response, maxBytes = 1_000_000): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > maxBytes) throw new IntegrationError('RESPONSE_TOO_LARGE', 'Provider response exceeds the limit', 502);
      chunks.push(chunk.value);
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally { await reader.cancel(); }
}

export function retryAfter(value: string | null, now = Date.now()): number | undefined {
  if (value === null) return undefined;
  const seconds = /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : (Date.parse(value) - now) / 1000;
  return Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : undefined;
}

export async function providerJson(fetcher: Fetch, url: string, init: RequestInit, submission = false): Promise<unknown> {
  let response: Response;
  try { response = await fetcher(url, { ...init, redirect: 'error', signal: init.signal ?? AbortSignal.timeout(15_000) }); }
  catch { throw new IntegrationError(submission ? 'SUBMISSION_UNKNOWN' : 'PROVIDER_UNAVAILABLE', 'Provider transport failed; no automatic retry was performed', 502); }
  if (!response.ok) {
    await response.body?.cancel();
    throw new IntegrationError(submission && response.status >= 500 ? 'SUBMISSION_UNKNOWN' : 'PROVIDER_HTTP_ERROR', `Provider returned HTTP ${response.status}`, response.status === 429 ? 429 : 502, retryAfter(response.headers.get('retry-after')));
  }
  try { return JSON.parse(await boundedText(response)); }
  catch (error) {
    if (error instanceof IntegrationError && !submission) throw error;
    throw new IntegrationError(submission ? 'SUBMISSION_UNKNOWN' : 'INVALID_PROVIDER_RESPONSE', 'Provider returned invalid JSON', 502);
  }
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new IntegrationError('INVALID_PROVIDER_RESPONSE', 'Expected an object', 502);
  return value as Record<string, unknown>;
}
