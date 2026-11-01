import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { createManager, inside, workspace } from './postgres.mjs';

test('workspace containment rejects parent and sibling paths', () => {
  assert.throws(() => inside(workspace, workspace));
  assert.throws(() => inside(workspace, path.resolve(workspace, '..')));
  assert.throws(() => inside(workspace, `${workspace}-other`));
});

test('real PostgreSQL 17 lifecycle and isolated backup restore', { timeout: 120000 }, async () => {
  const parent = path.join(workspace, '.local/postgres-tests');
  await mkdir(parent, { recursive: true });
  inside(await realpath(workspace), await realpath(parent));
  const root = await mkdtemp(path.join(parent, 'lifecycle-'));
  const port = await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const assigned = server.address().port;
      server.close(() => resolve(assigned));
    });
  });
  const manager = createManager({ root, port });
  let stopped = false;
  try {
    assert.equal((await manager.status()).initialized, false);
    const started = await manager.start();
    assert.equal(started.running, true);
    assert.match(started.version, /PostgreSQL 17\./);
    assert.equal(await manager.sql('postgres', 'SHOW listen_addresses'), '127.0.0.1');
    assert.equal(await manager.sql('postgres', 'SHOW unix_socket_directories'), '');
    assert.equal(await manager.sql('postgres', "SELECT count(*) FROM pg_hba_file_rules WHERE type = 'host' AND auth_method = 'trust' AND address <> '127.0.0.1'"), '0');
    assert.equal(await manager.sql('gather_test', 'SELECT current_database()'), 'gather_test');
    assert.equal((await manager.start()).pid, started.pid);
    await manager.sql('gather', "CREATE TABLE backup_probe (value text); INSERT INTO backup_probe VALUES ('restored correctly')");
    const backup = await manager.backup();
    const restored = await manager.restore(backup.file, 'gather_restore_probe');
    assert.equal(await manager.sql(restored.database, 'SELECT value FROM backup_probe'), 'restored correctly');
    await assert.rejects(manager.restore(backup.file, 'gather_restore_probe'));
    await assert.rejects(manager.restore(backup.file, 'gather'));
    await assert.rejects(manager.backup('postgres'));
    assert.equal(await manager.sql('gather', 'SELECT count(*) FROM backup_probe'), '1');
    assert.equal((await manager.stop()).running, false);
    assert.equal((await manager.start()).running, true);
    assert.equal(await manager.sql('gather', 'SELECT value FROM backup_probe'), 'restored correctly');
    assert.equal((await manager.stop()).running, false);
    assert.equal((await manager.stop()).running, false);
    stopped = true;
  } finally {
    if (!stopped) {
      try { await manager.stop(); stopped = true; } catch (error) { process.stderr.write(`Test cluster retained after stop failure: ${error.message}\n`); }
    }
    if (stopped) {
      const actualRoot = inside(await realpath(parent), await realpath(root));
      assert.ok(path.basename(actualRoot).startsWith('lifecycle-'));
      await rm(actualRoot, { recursive: true });
    }
  }
});

test('existing unowned data is preserved and refused', async () => {
  const parent = path.join(workspace, '.local/postgres-tests');
  await mkdir(parent, { recursive: true });
  inside(await realpath(workspace), await realpath(parent));
  const root = await mkdtemp(path.join(parent, 'unowned-'));
  try {
    await mkdir(path.join(root, 'data'));
    await writeFile(path.join(root, 'data/keep'), 'existing data');
    await assert.rejects(createManager({ root }).start(), /unowned/);
  } finally {
    const actualRoot = inside(await realpath(parent), await realpath(root));
    assert.ok(path.basename(actualRoot).startsWith('unowned-'));
    await rm(actualRoot, { recursive: true });
  }
});
