import type { FastifyInstance, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { authenticate, csrf } from '../auth/routes.js';
import { Database } from '../infrastructure/database.js';
import type { config } from '../infrastructure/config.js';
import { audit } from '../modules/editorial.js';
import { activeTheme, fallbackTokens, processLogo } from '../modules/theme.js';
import { demand } from './errors.js';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const themeInput = z.object({ mode: z.enum(['light', 'dark', 'system']), tokens: z.record(z.string(), hex), assetId: z.string().uuid().nullable().optional() }).strict();
const allowedTokens = new Set(Object.keys(fallbackTokens));
function requireThemeCapability(member: { capabilities: string[] }) { demand(member.capabilities.includes('theme:manage') || member.capabilities.includes('settings:manage'), 403, 'forbidden', 'Theme management requires church theme authority'); }

function checkTokens(tokens: Record<string, string>) {
  demand(Object.keys(tokens).every(key => allowedTokens.has(key)), 422, 'invalid_theme_tokens', 'Unknown theme token');
  demand(Object.keys(tokens).length >= 4, 422, 'invalid_theme_tokens', 'Theme needs page, panel, brand, and action colors');
}

export async function themeRoutes(app: FastifyInstance, database: Database, settings: ReturnType<typeof config>) {
  app.post('/v1/churches/:churchId/theme/logo', async (request, reply) => {
    const session = await authenticate(database, request); csrf(request, session, settings.appOrigin);
    const churchId = z.string().uuid().parse((request.params as { churchId: string }).churchId);
    const member = await database.transaction(churchId, session.userId, async (_client, current) => { requireThemeCapability(current); return current; });
    void member;
    const file = await request.file(); demand(file, 422, 'invalid_logo', 'Choose one PNG, JPEG, or WebP logo');
    demand(['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype), 422, 'invalid_logo', 'Use a PNG, JPEG, or WebP logo');
    const processed = await processLogo(await file.toBuffer());
    const result = await database.transaction(churchId, session.userId, async (client, current) => {
      requireThemeCapability(current);
      const existing = await client.query('SELECT id,palette_candidates FROM theme_assets WHERE church_id=$1 AND sha256=$2', [churchId, processed.sha256]);
      if (existing.rowCount) return { assetId: existing.rows[0].id, paletteCandidates: existing.rows[0].palette_candidates, tokens: { ...fallbackTokens } };
      await client.query('INSERT INTO theme_assets(church_id,id,original_name,mime_type,sha256,width,height,mark_bytes,lockup_bytes,preview_bytes,palette_candidates,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', [churchId, processed.id, file.filename.slice(0, 200) || 'church-logo', file.mimetype, processed.sha256, processed.width, processed.height, processed.mark, processed.lockup, processed.preview, JSON.stringify(processed.paletteCandidates), session.userId]);
      await audit(client, churchId, session.userId, 'theme.logo_uploaded', processed.id, { sha256: processed.sha256, width: processed.width, height: processed.height });
      return { assetId: processed.id, paletteCandidates: processed.paletteCandidates, tokens: processed.tokens };
    });
    return reply.code(201).send(result);
  });

  app.post('/v1/churches/:churchId/theme/preview', async (request, reply) => {
    const session = await authenticate(database, request); csrf(request, session, settings.appOrigin);
    const churchId = z.string().uuid().parse((request.params as { churchId: string }).churchId);
    const body = themeInput.parse(request.body); checkTokens(body.tokens);
    const result = await database.transaction(churchId, session.userId, async (client, member) => { requireThemeCapability(member); if (body.assetId) demand((await client.query('SELECT 1 FROM theme_assets WHERE church_id=$1 AND id=$2', [churchId, body.assetId])).rowCount, 404, 'not_found', 'Theme asset not found'); return { mode: body.mode, tokens: { ...fallbackTokens, ...body.tokens }, assetId: body.assetId ?? null }; });
    return reply.send(result);
  });

  app.post('/v1/churches/:churchId/theme', async (request, reply) => {
    const session = await authenticate(database, request); csrf(request, session, settings.appOrigin);
    const churchId = z.string().uuid().parse((request.params as { churchId: string }).churchId);
    const body = themeInput.parse(request.body); checkTokens(body.tokens);
    const result = await database.transaction(churchId, session.userId, async (client, member) => {
      requireThemeCapability(member);
      if (body.assetId) demand((await client.query('SELECT 1 FROM theme_assets WHERE church_id=$1 AND id=$2', [churchId, body.assetId])).rowCount, 404, 'not_found', 'Theme asset not found');
      const revisionId = randomUUID(); const tokens = { ...fallbackTokens, ...body.tokens };
      await client.query('INSERT INTO theme_revisions(church_id,id,asset_id,mode,tokens,created_by) VALUES($1,$2,$3,$4,$5,$6)', [churchId, revisionId, body.assetId ?? null, body.mode, JSON.stringify(tokens), session.userId]);
      await client.query('UPDATE churches SET active_theme_revision_id=$2,theme=$3 WHERE id=$1', [churchId, revisionId, JSON.stringify({ mode: body.mode, tokens, assetId: body.assetId ?? null })]);
      await audit(client, churchId, session.userId, 'theme.activated', revisionId, { assetId: body.assetId ?? null });
      return { revisionId, mode: body.mode, tokens, assetId: body.assetId ?? null };
    });
    return reply.send(result);
  });

  app.get('/v1/churches/:churchId/theme', async (request, reply) => {
    const session = await authenticate(database, request,'member'); const churchId = z.string().uuid().parse((request.params as { churchId: string }).churchId);
    const result = await database.transaction(churchId, session.userId, async client => activeTheme(client, churchId),session);
    return reply.send(result);
  });

  app.get('/v1/churches/:churchId/theme/logo/:assetId/:variant', async (request, reply) => {
    const session = await authenticate(database, request,'member'); const params = z.object({ churchId: z.string().uuid(), assetId: z.string().uuid(), variant: z.enum(['mark', 'lockup', 'preview']) }).parse(request.params);
    const result = await database.transaction(params.churchId, session.userId, async client => (await client.query(`SELECT ${params.variant === 'mark' ? 'mark_bytes' : params.variant === 'lockup' ? 'lockup_bytes' : 'preview_bytes'} AS bytes FROM theme_assets WHERE church_id=$1 AND id=$2`, [params.churchId, params.assetId])).rows[0],session);
    demand(result, 404, 'not_found', 'Theme asset not found'); reply.type(params.variant === 'preview' ? 'image/webp' : 'image/png').header('Content-Disposition', 'inline'); return reply.send(result.bytes);
  });

  app.get('/v1/public/churches/:slug/theme', async request => publicTheme(database, request));
  app.get('/v1/public/churches/:slug/theme/logo/:variant', async (request, reply) => {
    const params = z.object({ slug: z.string().max(100), variant: z.enum(['mark', 'lockup', 'preview']) }).parse(request.params);
    const lookup = await database.pool.query('SELECT * FROM public_church($1)', [params.slug]); demand(lookup.rowCount, 404, 'not_found', 'Church not found');
    const client = await database.pool.connect(); try { await client.query('BEGIN'); await client.query("SELECT set_config('app.church_id',$1,true)", [lookup.rows[0].id]); const row = (await client.query(`SELECT ${params.variant === 'mark' ? 'a.mark_bytes' : params.variant === 'lockup' ? 'a.lockup_bytes' : 'a.preview_bytes'} AS bytes FROM theme_assets a JOIN theme_revisions r ON r.church_id=a.church_id AND r.asset_id=a.id JOIN churches c ON c.id=r.church_id AND c.active_theme_revision_id=r.id WHERE c.id=$1`, [lookup.rows[0].id])).rows[0]; await client.query('COMMIT'); demand(row, 404, 'not_found', 'Theme asset not found'); reply.type(params.variant === 'preview' ? 'image/webp' : 'image/png').header('Cache-Control', 'public, max-age=300'); return reply.send(row.bytes); } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  });
}

async function publicTheme(database: Database, request: FastifyRequest) {
  const slug = z.string().max(100).parse((request.params as { slug: string }).slug); const lookup = await database.pool.query('SELECT * FROM public_church($1)', [slug]); demand(lookup.rowCount, 404, 'not_found', 'Church not found');
  const client = await database.pool.connect(); try { await client.query('BEGIN'); await client.query("SELECT set_config('app.church_id',$1,true)", [lookup.rows[0].id]); const result = await activeTheme(client, lookup.rows[0].id); await client.query('COMMIT'); return { ...result, churchName: lookup.rows[0].name, logoUrl: result.assetId ? `/api/v1/public/churches/${slug}/theme/logo/lockup` : null }; } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
