import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { request } from 'node:https';
import { hasDisallowedControls, IntegrationError } from './errors.js';

export interface ResolvedAddress { address: string; family: number }
export type Resolver = (hostname: string) => Promise<ResolvedAddress[]>;

export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const octets = address.split('.').map(Number);
    const first = octets[0]!;
    const second = octets[1]!;
    return !(first === 0 || first === 10 || first === 127 || first >= 224 || (first === 100 && second >= 64 && second <= 127) || (first === 169 && second === 254) || (first === 172 && second >= 16 && second <= 31) || (first === 192 && (second === 168 || second === 0 || second === 2)) || (first === 198 && (second === 18 || second === 19 || second === 51)) || (first === 203 && second === 0));
  }
  if (isIP(address) === 6) {
    const normalized = new URL(`https://[${address}]/`).hostname.slice(1, -1).toLowerCase();
    const first = Number.parseInt(normalized.split(':')[0]!, 16);
    return first >= 0x2000 && first <= 0x3fff && !normalized.startsWith('2001:') && !normalized.startsWith('2002:') && !normalized.startsWith('3fff:');
  }
  return false;
}

export async function validateSourceUrl(raw: string, allowedHosts: readonly string[], resolver: Resolver = hostname => lookup(hostname, { all: true, verbatim: true })) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new IntegrationError('UNSAFE_URL', 'Invalid source URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || (url.port && url.port !== '443') || !allowedHosts.includes(url.hostname.toLowerCase())) {
    throw new IntegrationError('UNSAFE_URL', 'Source requires HTTPS and an explicitly allowed host without credentials, fragment or custom port');
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await resolver(hostname);
  if (!addresses.length || addresses.some(value => !isPublicAddress(value.address))) throw new IntegrationError('UNSAFE_DESTINATION', 'Every resolved source address must be public');
  return { url, addresses };
}

export async function fetchSource(raw: string, options: { allowedHosts: readonly string[]; maxBytes?: number; timeoutMs?: number; resolver?: Resolver }): Promise<{ bytes: Buffer; sha256: string; contentType: string }> {
  const validated = await validateSourceUrl(raw, options.allowedHosts, options.resolver);
  const address = validated.addresses[0]!;
  const maxBytes = options.maxBytes ?? 2_000_000;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 25_000_000) throw new IntegrationError('INVALID_LIMIT', 'Invalid source size limit');
  return new Promise((resolve, reject) => {
    const outbound = request(validated.url, {
      method: 'GET',
      agent: false,
      signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
      lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
      headers: { 'Accept-Encoding': 'identity' },
    }, response => {
      if (response.statusCode !== 200 || (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity')) {
        response.destroy();
        reject(new IntegrationError('SOURCE_HTTP_REJECTED', 'Source must return HTTP 200 without redirects or compression', 422));
        return;
      }
      const chunks: Buffer[] = [];
      let length = 0;
      response.on('data', (chunk: Buffer) => {
        length += chunk.length;
        if (length > maxBytes) response.destroy(new IntegrationError('SOURCE_TOO_LARGE', 'Source exceeds byte limit', 413));
        else chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => {
        const bytes = Buffer.concat(chunks);
        resolve({ bytes, sha256: createHash('sha256').update(bytes).digest('hex'), contentType: response.headers['content-type'] ?? '' });
      });
    });
    outbound.on('error', reject);
    outbound.end();
  });
}

export interface TranscriptSpan { id: string; text: string; startMs: number | null; endMs: number | null }

function timestamp(value: string): number {
  const matched = /^(?:(\d{2,}):)?(\d{2}):(\d{2})[.,](\d{3})$/.exec(value);
  if (!matched || Number(matched[2]) > 59 || Number(matched[3]) > 59) throw new IntegrationError('INVALID_TRANSCRIPT', 'Invalid cue timestamp');
  return ((Number(matched[1] ?? 0) * 60 + Number(matched[2])) * 60 + Number(matched[3])) * 1000 + Number(matched[4]);
}

export function parseTranscript(bytes: Uint8Array, format: 'txt' | 'vtt' | 'srt', limits: { maxBytes?: number; maxCharacters?: number; maxSpans?: number } = {}) {
  if (!['txt', 'vtt', 'srt'].includes(format)) throw new IntegrationError('UNSUPPORTED_FORMAT', 'Only TXT, VTT and SRT transcripts are supported', 415);
  if (bytes.byteLength > (limits.maxBytes ?? 2_000_000)) throw new IntegrationError('SOURCE_TOO_LARGE', 'Transcript exceeds byte limit', 413);
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'); }
  catch { throw new IntegrationError('INVALID_TRANSCRIPT', 'Transcript must be valid UTF-8'); }
  if (text.length > (limits.maxCharacters ?? 500_000) || hasDisallowedControls(text) || text.startsWith('%PDF-')) throw new IntegrationError('INVALID_TRANSCRIPT', 'Transcript is oversized or contains binary content');
  const spans: TranscriptSpan[] = [];
  if (format === 'txt') spans.push({ id: 'span-1', text: text.trim(), startMs: null, endMs: null });
  else {
    if (format === 'vtt') {
      if (!/^WEBVTT(?:\s|$)/.test(text)) throw new IntegrationError('INVALID_TRANSCRIPT', 'Missing WEBVTT header');
      text = text.replace(/^WEBVTT[^\n]*(?:\n|$)/, '').trimStart();
    }
    for (const block of text.trim().split(/\n\s*\n/)) {
      if (format === 'vtt' && /^(NOTE(?:\s|$)|STYLE(?:\s|$)|REGION(?:\s|$))/.test(block)) continue;
      const lines = block.split('\n');
      const timingIndex = lines[0]?.includes('-->') ? 0 : 1;
      const timing = /^(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/.exec(lines[timingIndex] ?? '');
      if (!timing) throw new IntegrationError('INVALID_TRANSCRIPT', 'Malformed subtitle cue');
      const startMs = timestamp(timing[1]!);
      const endMs = timestamp(timing[2]!);
      if (endMs <= startMs) throw new IntegrationError('INVALID_TRANSCRIPT', 'Cue end must follow its start');
      const cueText = lines.slice(timingIndex + 1).join('\n').replace(/<[^>]*>/g, '').trim();
      if (!cueText) throw new IntegrationError('INVALID_TRANSCRIPT', 'Empty subtitle cue');
      spans.push({ id: `span-${spans.length + 1}`, text: cueText, startMs, endMs });
      if (spans.length > (limits.maxSpans ?? 10_000)) throw new IntegrationError('SOURCE_TOO_LARGE', 'Too many transcript cues', 413);
    }
  }
  const normalizedText = spans.map(span => span.text).join('\n');
  if (!normalizedText) throw new IntegrationError('INVALID_TRANSCRIPT', 'Transcript is empty');
  return { normalizedText, spans, sha256: createHash('sha256').update(normalizedText).digest('hex'), reviewStatus: 'needs_review' as const };
}
