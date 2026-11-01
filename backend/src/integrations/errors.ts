export class IntegrationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

export function requireConfigured(configured: unknown, provider: string): asserts configured {
  if (!configured) throw new IntegrationError('PROVIDER_DISABLED', `${provider} is not configured`, 503);
}

export function instant(value: string): number {
  const parts = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  const date = parts ? Date.parse(`${parts[1]}T00:00:00Z`) : NaN;
  if (!parts || !Number.isFinite(date) || new Date(date).toISOString().slice(0, 10) !== parts[1] || Number(parts[2]) > 23 || Number(parts[3]) > 59 || Number(parts[4]) > 59 || Number(parts[6] ?? 0) > 23 || Number(parts[7] ?? 0) > 59 || !Number.isFinite(Date.parse(value))) {
    throw new IntegrationError('INVALID_INSTANT', 'An ISO instant with an explicit offset is required');
  }
  return Date.parse(value);
}

export function hasDisallowedControls(value: string): boolean {
  return Array.from(value).some(character => {
    const code = character.charCodeAt(0);
    return code < 32 && code !== 9 && code !== 10 && code !== 13;
  });
}
