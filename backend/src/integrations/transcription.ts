import { createHash } from 'node:crypto';
import { IntegrationError, requireConfigured } from './errors.js';
import { object, providerJson, type TransportOptions } from './http.js';
import { parseTranscript } from './ingestion.js';

export interface TranscriptionRequest {
  bytes: Uint8Array;
  filename: string;
  sourceRevisionId: string;
  explicitAction: true;
  rightsConfirmed: true;
  scanPassed: true;
  durationSeconds: number;
  reservedSeconds: number;
  language?: string;
}

export class OpenAITranscriptionAdapter {
  constructor(private readonly config: TransportOptions & { apiKey?: string; model?: string } = {}) {}

  async transcribe(input: TranscriptionRequest) {
    requireConfigured(this.config.apiKey && this.config.model, 'OpenAI transcription');
    if (input.explicitAction !== true || input.rightsConfirmed !== true || input.scanPassed !== true) throw new IntegrationError('TRANSCRIPTION_NOT_AUTHORIZED', 'Explicit action, source rights and a trusted media scan are required', 403);
    if (!/^[A-Za-z0-9_. -]{1,150}\.(?:flac|mp3|mp4|mpeg|mpga|m4a|ogg|wav|webm)$/i.test(input.filename) || !input.bytes.length || input.bytes.length > 25_000_000) throw new IntegrationError('INVALID_AUDIO', 'Use a supported audio file of at most 25 MB', 422);
    if (!input.sourceRevisionId || !Number.isFinite(input.durationSeconds) || input.durationSeconds <= 0 || input.durationSeconds > 7200 || !Number.isFinite(input.reservedSeconds) || input.reservedSeconds < input.durationSeconds) throw new IntegrationError('TRANSCRIPTION_BUDGET_EXCEEDED', 'Trusted audio duration must fit the reserved transcription budget', 422);
    if (input.language && !/^[a-z]{2}$/.test(input.language)) throw new IntegrationError('INVALID_LANGUAGE', 'Use an ISO-639-1 language code');
    const body = new FormData();
    body.set('model', this.config.model!);
    body.set('response_format', 'json');
    body.set('file', new Blob([new Uint8Array(input.bytes)], { type: 'application/octet-stream' }), input.filename);
    if (input.language) body.set('language', input.language);
    const result = object(await providerJson(this.config.fetch ?? globalThis.fetch, `${this.config.baseUrl ?? 'https://api.openai.com/v1'}/audio/transcriptions`, { method: 'POST', headers: { Authorization: `Bearer ${this.config.apiKey}` }, body, signal: AbortSignal.timeout(this.config.timeoutMs ?? 120_000) }, true));
    if (typeof result.text !== 'string' || !result.text.trim()) throw new IntegrationError('INVALID_TRANSCRIPTION', 'Provider returned an empty or malformed transcript', 502);
    const transcript = parseTranscript(Buffer.from(result.text), 'txt');
    return { ...transcript, sourceRevisionId: input.sourceRevisionId, provenance: { provider: 'openai' as const, model: this.config.model!, audioSha256: createHash('sha256').update(input.bytes).digest('hex'), durationSeconds: input.durationSeconds }, usage: result.usage ?? null };
  }
}
