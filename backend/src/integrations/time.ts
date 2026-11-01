import { DateTime, IANAZone } from 'luxon';
import { instant, IntegrationError } from './errors.js';

export interface CivilTimeInput {
  localDate: string;
  localTime: string;
  zone: string;
  offsetMinutes?: number;
}

export function resolveCivilTime(input: CivilTimeInput) {
  if (!IANAZone.isValidZone(input.zone) || !/^\d{4}-\d{2}-\d{2}$/.test(input.localDate) || !/^\d{2}:\d{2}(?::\d{2})?$/.test(input.localTime)) {
    throw new IntegrationError('INVALID_CIVIL_TIME', 'Use an IANA zone, YYYY-MM-DD date and HH:mm[:ss] time');
  }
  const expected = `${input.localDate}T${input.localTime.length === 5 ? `${input.localTime}:00` : input.localTime}`;
  const candidate = DateTime.fromISO(expected, { zone: input.zone });
  if (!candidate.isValid || candidate.toFormat("yyyy-MM-dd'T'HH:mm:ss") !== expected) {
    throw new IntegrationError('NONEXISTENT_LOCAL_TIME', 'The civil time is invalid or falls in a DST gap');
  }
  const possibilities = candidate.getPossibleOffsets();
  if (possibilities.length > 1 && input.offsetMinutes === undefined) {
    throw new IntegrationError('AMBIGUOUS_LOCAL_TIME', 'An overlap requires an explicit offsetMinutes choice');
  }
  const resolved = input.offsetMinutes === undefined ? candidate : possibilities.find(value => value.offset === input.offsetMinutes);
  if (!resolved) throw new IntegrationError('INVALID_OFFSET', 'The offset does not match this civil time and zone');
  return { ...input, offsetMinutes: resolved.offset, utc: resolved.toUTC().toISO()! };
}

export function evaluateCatchup(input: { scheduledAt: string; now: string; approvedAt: string | null; unchanged: boolean }): 'not_due' | 'eligible' | 'blocked_approval' | 'staff_review' {
  const scheduled = instant(input.scheduledAt);
  const now = instant(input.now);
  if (!input.approvedAt || instant(input.approvedAt) > scheduled || !input.unchanged) return 'blocked_approval';
  if (now < scheduled) return 'not_due';
  return now - scheduled <= 15 * 60_000 ? 'eligible' : 'staff_review';
}

export type RecipientWindow = { decision: 'send' | 'expired' | 'hold_unknown_zone' } | { decision: 'defer'; nextEligibleAt: string };

export function recipientSendWindow(input: { now: string; expiresAt: string; zone: string | null }): RecipientWindow {
  const now = instant(input.now);
  const expiry = instant(input.expiresAt);
  if (now >= expiry) return { decision: 'expired' };
  if (!input.zone || !IANAZone.isValidZone(input.zone)) return { decision: 'hold_unknown_zone' };
  const local = DateTime.fromMillis(now, { zone: input.zone });
  if (local.hour >= 9 && local.hour < 20) return { decision: 'send' };
  const next = (local.hour < 9 ? local : local.plus({ days: 1 })).startOf('day').set({ hour: 9 });
  return next.toMillis() >= expiry ? { decision: 'expired' } : { decision: 'defer', nextEligibleAt: next.toUTC().toISO()! };
}

const gsmBasic = new Set(Array.from('@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'));
const gsmExtension = new Set(Array.from('\f^{}\\[~]|€'));

export function smsSegments(text: string): { encoding: 'GSM-7' | 'UCS-2'; units: number; segments: number } {
  const symbols = Array.from(text);
  const gsm = symbols.every(symbol => gsmBasic.has(symbol) || gsmExtension.has(symbol));
  const weights = gsm ? symbols.map(symbol => gsmExtension.has(symbol) ? 2 : 1) : symbols.map(symbol => symbol.length);
  const units = weights.reduce((total, weight) => total + weight, 0);
  const single = gsm ? 160 : 70;
  const multipart = gsm ? 153 : 67;
  let segments = units === 0 ? 0 : 1;
  if (units > single) {
    let occupied = 0;
    for (const weight of weights) {
      if (occupied + weight > multipart) { segments += 1; occupied = 0; }
      occupied += weight;
    }
  }
  return { encoding: gsm ? 'GSM-7' : 'UCS-2', units, segments };
}
