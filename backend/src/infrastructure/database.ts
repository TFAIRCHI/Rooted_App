import pg, { type PoolClient } from 'pg';
import { ApiError } from '../api/errors.js';
import type { Session } from '../auth/session.js';

export interface Membership { userId: string; capabilities: string[] }

export class Database {
  readonly pool: pg.Pool;
  constructor(connectionString: string) {
    const maximum = Number(process.env.DATABASE_POOL_MAX ?? 12);
    if (!Number.isInteger(maximum) || maximum < 2 || maximum > 40) throw new Error('DATABASE_POOL_MAX must be an integer from 2 through 40; budget total database connections across every process');
    this.pool = new pg.Pool({ connectionString, max: maximum });
  }

  async assertRuntime() {
    const result = await this.pool.query('SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user');
    const role = result.rows[0];
    if (role.rolsuper || role.rolbypassrls || role.rolname !== 'gather_runtime') throw new Error('Unsafe runtime database role');
    const owned = await this.pool.query("SELECT 1 FROM pg_tables WHERE schemaname='public' AND tableowner=current_user LIMIT 1");
    if (owned.rowCount) throw new Error('Runtime cannot own application tables');
    await this.assertSchema();
  }

  async assertSchema() {
    const result = await this.pool.query(`SELECT
      to_regclass('public.provider_jobs') IS NOT NULL AND to_regclass('public.privacy_tombstones') IS NOT NULL
      AND to_regclass('public.study_purge_audit') IS NOT NULL AND to_regclass('public.publication_audiences') IS NOT NULL
      AND to_regclass('public.study_workflows') IS NOT NULL
      AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.slots') AND attname='withdrawn_at' AND NOT attisdropped)
      AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.revisions') AND attname='source_snapshot' AND NOT attisdropped) AS current_schema,
      EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.auth_sessions') AND attname='mfa_verified_until' AND NOT attisdropped)
      AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.auth_flows') AND attname='access' AND NOT attisdropped) AS access_sessions,
      NOT EXISTS(SELECT 1 FROM pg_class tables JOIN pg_namespace namespaces ON namespaces.oid=tables.relnamespace
        WHERE namespaces.nspname='public' AND tables.relkind='r' AND (tables.relname='churches'
          OR EXISTS(SELECT 1 FROM pg_attribute columns WHERE columns.attrelid=tables.oid AND columns.attname='church_id' AND NOT columns.attisdropped))
        AND (NOT tables.relrowsecurity OR NOT tables.relforcerowsecurity)) AS isolated`);
    if (!result.rows[0]?.current_schema || !result.rows[0]?.access_sessions || !result.rows[0]?.isolated) throw new ApiError(503, 'schema_not_ready', 'Required database migrations or tenant isolation policies are unavailable');
  }

  async transaction<Result>(churchId: string, actorId: string, callback: (client: PoolClient, member: Membership) => Promise<Result>, session?: Session): Promise<Result> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.church_id',$1,true), set_config('app.user_id',$2,true)", [churchId, actorId]);
      const lookup = await client.query("SELECT CASE WHEN $3 THEN capabilities ELSE '{}'::text[] END AS capabilities,set_config('app.permissions',to_json(CASE WHEN $3 THEN capabilities ELSE '{}'::text[] END)::text,true) AS permissions_context FROM memberships WHERE church_id=$1 AND user_id=$2 AND active", [churchId, actorId, session?.privileged !== false]);
      if (!lookup.rowCount) throw new ApiError(404, 'not_found', 'Church not found');
      const member = { userId: actorId, capabilities: lookup.rows[0].capabilities as string[] };
      const result = await callback(client, member);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async close() { await this.pool.end(); }
}

export function requireCapability(member: Membership, capability: string) {
  if (!member.capabilities.includes(capability)) throw new ApiError(403, 'forbidden', 'This action requires an explicit capability');
}
