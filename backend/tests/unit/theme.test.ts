import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import { processLogo } from '../../src/modules/theme.js';

test('logo processing creates bounded derivatives and deterministic palette candidates', async () => {
  const input = await sharp({ create: { width: 32, height: 20, channels: 4, background: { r: 23, g: 117, b: 105, alpha: 1 } } }).png().toBuffer();
  const result = await processLogo(input);
  assert.equal(result.width, 32);
  assert.equal(result.height, 20);
  assert.ok(result.mark.length > 0);
  assert.ok(result.lockup.length > 0);
  assert.ok(result.preview.length > 0);
  assert.match(result.tokens.brand, /^#[0-9a-f]{6}$/);
  assert.ok(result.paletteCandidates.length > 0);
});

test('logo processing rejects unsupported image formats', async () => {
  await assert.rejects(() => processLogo(Buffer.from('<svg><script>alert(1)</script></svg>')), /Use a PNG, JPEG, or WebP logo/);
});

test('logo processing rejects oversized input before image decoding', async () => {
  await assert.rejects(() => processLogo(Buffer.alloc(5_000_001)), /Logo must be between/);
});
