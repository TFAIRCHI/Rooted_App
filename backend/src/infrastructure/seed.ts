import './config.js';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { blankPlan, insertRevision } from '../modules/revisions.js';
import { hashCredential } from '../auth/routes.js';

export const graceId = '10000000-0000-4000-8000-000000000001';
export const riversideId = '10000000-0000-4000-8000-000000000002';
export const fixtureSeriesId = '20000000-0000-4000-8000-000000000001';
export const capabilities = {
  contributor: ['workspace:read','sermons:create','series:manage','plans:edit','content:edit','comments:write','ai:use','theme:manage','settings:manage','privacy:manage','audit:read','plans:approve','content:approve','publication:schedule','moderation:manage','engagement:read','studies:delete'],
  pastor: ['workspace:read','plans:edit','plans:approve','content:approve','publication:schedule','comments:write','moderation:manage','audit:read','theme:manage'],
  admin: ['workspace:read','memberships:manage','admin:manage','settings:manage','series:manage','sermons:create','audit:read','privacy:manage','studies:delete','engagement:read','plans:approve','content:approve','publication:schedule','comments:write'],
  member: [],
};

export async function seed(connectionString = process.env.MIGRATION_DATABASE_URL) {
  if (!connectionString) throw new Error('MIGRATION_DATABASE_URL required');
  if (process.env.NODE_ENV === 'production') throw new Error('Local fictional fixtures cannot seed production');
  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [churchId, slug, name] of [[graceId,'grace','Grace Community Church'],[riversideId,'riverside','Riverside Church']]) {
      await client.query('INSERT INTO churches(id,slug,name,time_zone) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[churchId,slug,name,'America/New_York']);
      for (const [userId, grants] of Object.entries(capabilities)) {
        if (churchId === riversideId && userId !== 'admin') {
          await client.query('DELETE FROM memberships WHERE church_id=$1 AND user_id=$2',[churchId,userId]);
          continue;
        }
        await client.query(`INSERT INTO memberships(church_id,user_id,display_name,capabilities) VALUES($1,$2,$3,$4) ON CONFLICT(church_id,user_id) DO UPDATE SET capabilities=excluded.capabilities,active=true`,[churchId,userId,`Local ${userId}`,grants]);
      }
    }
    if (process.env.ROOTED_ENABLE_DEMO_LOGINS==='true') {
      const demoUsers=[
        ['anna.contributor','Anna Mitchell','contributor'],
        ['james.contributor','James Ellis','contributor'],
        ['riley.member','Riley Morgan','member'],
        ['morgan.admin','Morgan Reed','admin'],
      ] as const;
      for (const [userId,displayName,role] of demoUsers) {
        await client.query('INSERT INTO memberships(church_id,user_id,display_name,capabilities) VALUES($1,$2,$3,$4) ON CONFLICT(church_id,user_id) DO UPDATE SET display_name=excluded.display_name,capabilities=excluded.capabilities,active=true',[graceId,userId,displayName,capabilities[role]]);
      }
      const passwords:Record<string,string>={'anna.contributor':'RootedDemo!2026A','james.contributor':'RootedDemo!2026B','riley.member':'RootedDemo!2026C','morgan.admin':'RootedDemo!2026D'};
      for (const [username,password] of Object.entries(passwords)) await client.query('INSERT INTO local_credentials(username,user_id,password_hash) VALUES($1,$2,$3) ON CONFLICT(username) DO UPDATE SET user_id=excluded.user_id,password_hash=excluded.password_hash,enabled=true,failed_attempts=0,last_failed_at=NULL,updated_at=now()',[username,username,hashCredential(password)]);
    }
    const existing = await client.query('SELECT 1 FROM series WHERE church_id=$1 AND id=$2',[graceId,fixtureSeriesId]);
    if (!existing.rowCount) {
      const sermonId = randomUUID();
      await client.query(`INSERT INTO sermons(church_id,id,title,preached_date,speaker,passages,notes) VALUES($1,$2,$3,$4,$5,$6,$7)`,[graceId,sermonId,'To Whom Shall We Go?','2026-10-18','Pastor Jordan',JSON.stringify(['John 6:68']),'Fictional teaching fixture. Read John 6:60–69 in context.']);
      await client.query('INSERT INTO series(church_id,id,title,week_anchor,time_zone) VALUES($1,$2,$3,$4,$5)',[graceId,fixtureSeriesId,'To Whom Shall We Go?','2026-10-19','America/New_York']);
      await client.query('INSERT INTO series_sermons VALUES($1,$2,$3)',[graceId,fixtureSeriesId,sermonId]);
      for (const localDate of ['2026-10-19','2026-10-21','2026-10-23']) {
        const slotId = randomUUID();
        const planId = randomUUID();
        await client.query('INSERT INTO slots(church_id,id,series_id,local_date,local_time,time_zone,assignee_ids) VALUES($1,$2,$3,$4,$5,$6,$7)',[graceId,slotId,fixtureSeriesId,localDate,'08:00','America/New_York',['contributor']]);
        await client.query("INSERT INTO aggregates(church_id,id,kind,slot_id) VALUES($1,$2,'plan',$3)",[graceId,planId,slotId]);
        const revisionId = await insertRevision(client,{churchId:graceId,aggregateId:planId,kind:'plan',number:1,authorId:'contributor',payload:blankPlan(),calendar:{localDate,localTime:'08:00',timeZone:'America/New_York'}});
        await client.query('UPDATE aggregates SET head_revision_id=$3 WHERE church_id=$1 AND id=$2',[graceId,planId,revisionId]);
      }
    }
    if (process.env.ROOTED_ENABLE_DEMO_LOGINS==='true' && process.env.NODE_ENV !== 'test' && new URL(connectionString).pathname==='/gather') {
      await client.query("UPDATE slots SET assignee_ids=ARRAY['anna.contributor']::text[] WHERE church_id=$1 AND 'contributor'=ANY(assignee_ids)",[graceId]);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); await pool.end(); }
}

if (/\/seed\.[tj]s$/.test(process.argv[1]?.replaceAll('\\','/')??'')) {
  await seed();
  console.log('Fictional fixtures seeded');
}
