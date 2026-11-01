import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { IntegrationError, requireConfigured } from './errors.js';
import { object, providerJson, type TransportOptions } from './http.js';

function equalSignature(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function verifyTwilioSignature(input: { externalUrl: string; rawBody: string; contentType: 'application/x-www-form-urlencoded' | 'application/json'; signature: string; authToken: string }): boolean {
  if (!input.authToken || Buffer.byteLength(input.rawBody) > 1_000_000) return false;
  let signed = input.externalUrl;
  if (input.contentType === 'application/json') {
    let hash: string | null;
    try { hash = new URL(input.externalUrl).searchParams.get('bodySHA256'); } catch { return false; }
    if (!hash || !equalSignature(hash, createHash('sha256').update(input.rawBody).digest('hex'))) return false;
  } else if (input.contentType === 'application/x-www-form-urlencoded') {
    const params = new URLSearchParams(input.rawBody);
    for (const key of Array.from(new Set(params.keys())).sort()) {
      for (const value of Array.from(new Set(params.getAll(key))).sort()) signed += key + value;
    }
  } else return false;
  return equalSignature(createHmac('sha1', input.authToken).update(signed).digest('base64'), input.signature);
}

export interface TwilioConfig extends TransportOptions { accountSid?: string; authToken?: string; from?: string; messagingServiceSid?: string }
export interface TwilioMessage { provider: 'twilio'; sid: string; status: string; errorCode: string | number | null; evidence: 'provider_status_only' }

export class TwilioAdapter {
  private readonly fetcher: typeof fetch;
  private readonly base: string;
  constructor(private readonly config: TwilioConfig = {}) {
    this.fetcher = config.fetch ?? globalThis.fetch;
    this.base = config.baseUrl ?? 'https://api.twilio.com';
  }

  private auth(): string {
    requireConfigured(this.config.accountSid && this.config.authToken, 'Twilio');
    if (!/^AC[a-f\d]{32}$/i.test(this.config.accountSid!)) throw new IntegrationError('INVALID_PROVIDER_CONFIG', 'Invalid Twilio account SID', 503);
    return `Basic ${Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64')}`;
  }

  private parse(value: unknown, submission: boolean): TwilioMessage {
    const data = object(value);
    if (typeof data.sid !== 'string' || !/^SM[a-f\d]{32}$/i.test(data.sid) || typeof data.status !== 'string' || data.account_sid !== this.config.accountSid) throw new IntegrationError(submission ? 'SUBMISSION_UNKNOWN' : 'INVALID_PROVIDER_RESPONSE', 'Invalid or mismatched Twilio message response', 502);
    return { provider: 'twilio', sid: data.sid, status: data.status, errorCode: typeof data.error_code === 'number' || typeof data.error_code === 'string' ? data.error_code : null, evidence: 'provider_status_only' };
  }

  async send(input: { to: string; body: string; statusCallback?: string }): Promise<TwilioMessage> {
    const authorization = this.auth();
    requireConfigured(this.config.from || this.config.messagingServiceSid, 'Twilio sender');
    if (!/^\+[1-9]\d{7,14}$/.test(input.to) || !input.body || input.body.length > 1600) throw new IntegrationError('INVALID_SMS', 'SMS requires an E.164 destination and 1–1600 UTF-16 units');
    const form = new URLSearchParams({ To: input.to, Body: input.body });
    if (this.config.messagingServiceSid) form.set('MessagingServiceSid', this.config.messagingServiceSid);
    else form.set('From', this.config.from!);
    if (input.statusCallback) {
      const callback = new URL(input.statusCallback);
      if (callback.protocol !== 'https:' || callback.username || callback.password || callback.hash) throw new IntegrationError('INVALID_CALLBACK', 'Callback requires an HTTPS URL');
      form.set('StatusCallback', input.statusCallback);
    }
    const response = await providerJson(this.fetcher, `${this.base}/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`, { method: 'POST', headers: { Authorization: authorization, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form, signal: AbortSignal.timeout(this.config.timeoutMs ?? 15_000) }, true);
    try { return this.parse(response, true); }
    catch { throw new IntegrationError('SUBMISSION_UNKNOWN', 'Twilio response could not establish submission identity', 502); }
  }

  async status(sid: string): Promise<TwilioMessage> {
    const authorization = this.auth();
    if (!/^SM[a-f\d]{32}$/i.test(sid)) throw new IntegrationError('INVALID_MESSAGE_SID', 'Invalid Twilio message SID');
    const response = this.parse(await providerJson(this.fetcher, `${this.base}/2010-04-01/Accounts/${this.config.accountSid}/Messages/${sid}.json`, { headers: { Authorization: authorization }, signal: AbortSignal.timeout(this.config.timeoutMs ?? 15_000) }), false);
    if (response.sid !== sid) throw new IntegrationError('INVALID_PROVIDER_RESPONSE', 'Twilio returned another message', 502);
    return response;
  }
}
