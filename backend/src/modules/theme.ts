import { createHash, randomUUID } from 'node:crypto';
import sharp, { type Metadata } from 'sharp';
import type { PoolClient } from 'pg';
import { demand } from '../api/errors.js';

export const fallbackTokens = {
  brand: '#177569', brandStrong: '#105a51', accent: '#ae813e', pageSurface: '#f6f4ee', panelSurface: '#fffefa',
  navSurface: '#142e3b', actionSurface: '#177569', focusRing: '#bf8b36', textOnBrand: '#ffffff', textOnSurface: '#243e49', border: '#dedfd7',
};

function hex(red: number, green: number, blue: number) { return `#${[red, green, blue].map(value => value.toString(16).padStart(2, '0')).join('')}`; }
function contrastForeground(red: number, green: number, blue: number) { return (red * 299 + green * 587 + blue * 114) / 1000 > 150 ? '#142e3b' : '#ffffff'; }

export async function processLogo(input: Buffer) {
  demand(input.length > 0 && input.length <= 5_000_000, 422, 'invalid_logo', 'Logo must be between 1 byte and 5 MB');
  const source = sharp(input, { limitInputPixels: 40_000_000, failOn: 'error' });
  let metadata: Metadata;
  try { metadata = await source.metadata(); } catch { demand(false, 422, 'invalid_logo', 'Use a PNG, JPEG, or WebP logo'); throw new Error('unreachable'); }
  demand(['png', 'jpeg', 'webp'].includes(metadata.format ?? ''), 422, 'invalid_logo', 'Use a PNG, JPEG, or WebP logo');
  demand(Boolean(metadata.width && metadata.height && metadata.width <= 10000 && metadata.height <= 10000), 422, 'invalid_logo', 'Logo dimensions are too large');
  const mark = await sharp(input).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const lockup = await sharp(input).resize(720, 220, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const preview = await sharp(input).resize(1400, 700, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } }).webp({ quality: 88 }).toBuffer();
  const { data, info } = await sharp(input).resize(64, 64, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const buckets = new Map<string, { red: number; green: number; blue: number; count: number }>();
  for (let index = 0; index < data.length; index += info.channels) {
    const alpha = data[index + 3] ?? 255; if (alpha < 32) continue;
    const red = Math.floor((data[index] ?? 0) / 32) * 32, green = Math.floor((data[index + 1] ?? 0) / 32) * 32, blue = Math.floor((data[index + 2] ?? 0) / 32) * 32;
    const key = `${red}:${green}:${blue}`; const current = buckets.get(key) ?? { red, green, blue, count: 0 }; current.count += 1; buckets.set(key, current);
  }
  const paletteCandidates = [...buckets.values()].sort((left, right) => right.count - left.count).slice(0, 6).map(item => ({ color: hex(item.red, item.green, item.blue), confidence: Number((item.count / Math.max(1, data.length / info.channels)).toFixed(3)) }));
  const brand = paletteCandidates[0]?.color ?? fallbackTokens.brand;
  const [red, green, blue] = [parseInt(brand.slice(1, 3), 16), parseInt(brand.slice(3, 5), 16), parseInt(brand.slice(5, 7), 16)];
  return { id: randomUUID(), sha256: createHash('sha256').update(input).digest('hex'), width: metadata.width!, height: metadata.height!, mark, lockup, preview, paletteCandidates, tokens: { ...fallbackTokens, brand, brandStrong: brand, actionSurface: brand, textOnBrand: contrastForeground(red, green, blue) } };
}

export async function activeTheme(client: PoolClient, churchId: string) {
  const result = await client.query(`SELECT c.theme,c.active_theme_revision_id,r.mode,r.tokens,a.id AS asset_id FROM churches c LEFT JOIN theme_revisions r ON r.church_id=c.id AND r.id=c.active_theme_revision_id LEFT JOIN theme_assets a ON a.church_id=r.church_id AND a.id=r.asset_id WHERE c.id=$1`, [churchId]);
  const row = result.rows[0]; const legacy = row?.theme ?? {}; const base = { ...fallbackTokens, ...(legacy.primary ? { brand: legacy.primary, actionSurface: legacy.primary } : {}), ...(legacy.accent ? { accent: legacy.accent } : {}), ...(legacy.surface ? { pageSurface: legacy.surface } : {}), ...(row?.tokens ?? legacy.tokens ?? {}) };
  return { mode: row?.mode ?? row?.theme?.mode ?? 'light', tokens: base, assetId: row?.asset_id ?? row?.theme?.assetId ?? null, revisionId: row?.active_theme_revision_id ?? null };
}
