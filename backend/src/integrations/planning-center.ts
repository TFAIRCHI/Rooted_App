import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { IntegrationError, requireConfigured } from './errors.js';
import { object, providerJson, type TransportOptions } from './http.js';

function encryptionKey(encoded: string | undefined): Buffer {
  requireConfigured(encoded, 'Token encryption key');
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32 || key.toString('base64') !== encoded) throw new IntegrationError('INVALID_ENCRYPTION_KEY', 'Token key must be canonical base64 encoding of 32 random bytes', 503);
  return key;
}

export function encryptToken(token: string, binding: string, keyBase64 = process.env.PCO_TOKEN_ENCRYPTION_KEY): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(keyBase64), nonce);
  cipher.setAAD(Buffer.from(binding));
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return ['v1', nonce.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptToken(envelope: string, binding: string, keyBase64 = process.env.PCO_TOKEN_ENCRYPTION_KEY): string {
  const key = encryptionKey(keyBase64);
  try {
    const parts = envelope.split('.');
    if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('Invalid envelope');
    const nonce = Buffer.from(parts[1]!, 'base64url');
    const tag = Buffer.from(parts[2]!, 'base64url');
    if (nonce.length !== 12 || tag.length !== 16) throw new Error('Invalid envelope');
    const decipher = createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAAD(Buffer.from(binding));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(Buffer.from(parts[3]!, 'base64url')), decipher.final()]).toString('utf8');
  } catch { throw new IntegrationError('INVALID_TOKEN_ENVELOPE', 'Token authentication failed', 400); }
}

export function verifyPlanningCenterWebhook(rawBody: Uint8Array, signature: string, secret: string): boolean {
  if (!secret || rawBody.byteLength > 1_000_000 || !/^[a-f\d]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

export interface PlanningCenterConfig extends TransportOptions { accessToken?: string; clientId?: string; clientSecret?: string; allowAudioDownload?: boolean }
export interface OAuthTokens { accessToken: string; refreshToken: string; expiresIn: number; tokenType: string }

export class PlanningCenterAdapter {
  private readonly fetcher: typeof fetch;
  private readonly base: string;
  constructor(private readonly config: PlanningCenterConfig = {}) {
    this.fetcher = config.fetch ?? globalThis.fetch;
    this.base = config.baseUrl ?? 'https://api.planningcenteronline.com';
  }

  authorizationUrl(input: { redirectUri: string; state: string; codeVerifier: string }): string {
    requireConfigured(this.config.clientId, 'Planning Center OAuth');
    if (input.state.length < 32 || !/^[A-Za-z0-9._~-]{43,128}$/.test(input.codeVerifier)) throw new IntegrationError('INVALID_OAUTH_INPUT', 'OAuth requires strong state and PKCE verifier');
    const url = new URL('/oauth/authorize', this.base);
    url.search = new URLSearchParams({ client_id: this.config.clientId, redirect_uri: input.redirectUri, response_type: 'code', scope: 'publishing', state: input.state, code_challenge_method: 'S256', code_challenge: createHash('sha256').update(input.codeVerifier).digest('base64url') }).toString();
    return url.href;
  }

  async exchangeCode(input: { code: string; redirectUri: string; codeVerifier: string }): Promise<OAuthTokens> {
    return this.tokenRequest({ grant_type: 'authorization_code', code: input.code, redirect_uri: input.redirectUri, code_verifier: input.codeVerifier });
  }

  async refresh(refreshToken: string): Promise<OAuthTokens> { return this.tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken }); }

  async revoke(token: string, tokenType: 'access_token' | 'refresh_token' = 'refresh_token'): Promise<void> {
    requireConfigured(this.config.clientId && this.config.clientSecret, 'Planning Center OAuth');
    await providerJson(this.fetcher, `${this.base}/oauth/revoke`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token, token_type_hint: tokenType, client_id: this.config.clientId!, client_secret: this.config.clientSecret! }), signal: AbortSignal.timeout(this.config.timeoutMs ?? 15_000) });
  }

  private async tokenRequest(fields: Record<string, string>): Promise<OAuthTokens> {
    requireConfigured(this.config.clientId && this.config.clientSecret, 'Planning Center OAuth');
    const response = object(await providerJson(this.fetcher, `${this.base}/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...fields, client_id: this.config.clientId!, client_secret: this.config.clientSecret! }), signal: AbortSignal.timeout(this.config.timeoutMs ?? 15_000) }));
    if (typeof response.access_token !== 'string' || typeof response.refresh_token !== 'string' || typeof response.expires_in !== 'number' || response.expires_in <= 0 || typeof response.token_type !== 'string') throw new IntegrationError('INVALID_PROVIDER_RESPONSE', 'Invalid OAuth token response', 502);
    return { accessToken: response.access_token, refreshToken: response.refresh_token, expiresIn: response.expires_in, tokenType: response.token_type };
  }

  async read(path: string): Promise<unknown> {
    requireConfigured(this.config.accessToken, 'Planning Center');
    const url = new URL(path, this.base);
    const validPath = /^\/publishing\/v2\/episodes(?:\/[A-Za-z0-9_-]+(?:\/(?:note_template|series|speakerships|episode_resources|episode_times|channel))?)?$/.test(url.pathname) || url.pathname === '/webhooks/v2/available_events' || url.pathname === '/current/v2/me';
    const allowedQuery = new Set(['per_page', 'offset', 'include']);
    if (url.origin !== new URL(this.base).origin || url.username || url.password || url.hash || !validPath || Array.from(url.searchParams.keys()).some(key => !allowedQuery.has(key))) throw new IntegrationError('PCO_REQUEST_DENIED', 'Only allowlisted Planning Center read routes are permitted', 403);
    return providerJson(this.fetcher, url.href, { method: 'GET', headers: { Authorization: `Bearer ${this.config.accessToken}`, Accept: 'application/vnd.api+json' }, signal: AbortSignal.timeout(this.config.timeoutMs ?? 15_000) });
  }

  listEpisodes(offset = 0): Promise<unknown> {
    if (!Number.isSafeInteger(offset) || offset < 0) throw new IntegrationError('INVALID_OFFSET', 'Invalid page offset');
    return this.read(`/publishing/v2/episodes?per_page=100&offset=${offset}`);
  }

  availableEvents(): Promise<unknown> { return this.read('/webhooks/v2/available_events'); }

  async generateAudioDownloadUrl(episodeId: string): Promise<unknown> {
    requireConfigured(this.config.accessToken, 'Planning Center');
    if (!this.config.allowAudioDownload || !/^[A-Za-z0-9_-]+$/.test(episodeId)) throw new IntegrationError('PCO_REQUEST_DENIED', 'Audio download action is not authorized', 403);
    return providerJson(this.fetcher, `${this.base}/publishing/v2/episodes/${episodeId}/generate_download_url`, { method: 'POST', headers: { Authorization: `Bearer ${this.config.accessToken}` } });
  }
}
