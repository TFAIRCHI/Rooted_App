import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, realpath, writeFile, open } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

export const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const dockerInstructions = 'Install PostgreSQL 17 and set POSTGRES_BIN to its bin directory, or start Docker Desktop and run: docker run --name gather-postgres-dev -e POSTGRES_HOST_AUTH_METHOD=trust -p 127.0.0.1:54329:5432 -v gather-postgres-dev:/var/lib/postgresql/data -d postgres:17 . Then create gather and gather_test with docker exec gather-postgres-dev createdb -U postgres <database>. Docker data is separate from this script; stop it with docker stop gather-postgres-dev.';

export function inside(parent, target) {
  const relative = path.relative(path.resolve(parent), path.resolve(target));
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error(`Path must be strictly inside ${parent}: ${target}`);
  }
  return path.resolve(target);
}

export function findBinaries() {
  const candidates = [process.env.POSTGRES_BIN, process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/17/bin' : undefined,
    '/usr/lib/postgresql/17/bin', '/opt/homebrew/opt/postgresql@17/bin', '/usr/local/opt/postgresql@17/bin',
    ...(process.env.PATH ?? '').split(path.delimiter)].filter(Boolean);
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const directory = candidates.find(candidate => ['postgres', 'initdb', 'pg_ctl', 'psql', 'createdb', 'pg_dump', 'pg_restore']
    .every(binary => existsSync(path.join(candidate, `${binary}${suffix}`))));
  if (!directory) throw new Error(dockerInstructions);
  return name => path.join(directory, `${name}${suffix}`);
}

async function run(binary, args, background = false) {
  return new Promise((resolve, reject) => {
    const environment = { ...process.env };
    for (const key of Object.keys(environment)) {
      if (key.toUpperCase().startsWith('PG')) delete environment[key];
    }
    environment.PGCONNECT_TIMEOUT = '5';
    const child = spawn(binary, args, {
      windowsHide: true, detached: background, stdio: background ? 'ignore' : ['ignore', 'pipe', 'pipe'],
      env: environment,
    });
    let output = '';
    child.stdout?.on('data', chunk => { output += chunk; });
    child.stderr?.on('data', chunk => { output += chunk; });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve(output.trim()) : reject(new Error(`${path.basename(binary)} exited ${code}: ${output.trim()}`)));
  });
}

async function available(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}

export function createManager({ root = path.join(workspace, '.local/postgres'), port = 54329 } = {}) {
  root = inside(path.join(workspace, '.local'), root);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid development port');
  const data = path.join(root, 'data');
  const marker = path.join(root, 'owner.json');
  const binary = findBinaries();
  const connection = database => `postgres://postgres@127.0.0.1:${port}/${database}`;
  const connectionArgs = database => ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', '-w', '-d', database];

  async function validatePath() {
    await mkdir(path.join(workspace, '.local'), { recursive: true });
    const actualWorkspace = await realpath(workspace);
    inside(actualWorkspace, await realpath(path.join(workspace, '.local')));
    if (existsSync(root)) inside(await realpath(path.join(workspace, '.local')), await realpath(root));
    if (existsSync(data)) inside(await realpath(root), await realpath(data));
  }

  async function owned() {
    await validatePath();
    const state = JSON.parse(await readFile(marker, 'utf8'));
    if (state.kind !== 'gather-local-postgres-v1' || state.root !== root || state.port !== port) {
      throw new Error('Cluster ownership or port does not match; refusing to operate');
    }
  }

  async function running() {
    try { await run(binary('pg_ctl'), ['-D', data, 'status']); return true; }
    catch (error) { if (/exited 3:/.test(error.message)) return false; throw error; }
  }

  async function sql(database, statement) {
    return run(binary('psql'), [...connectionArgs(database), '-X', '-v', 'ON_ERROR_STOP=1', '-At', '-c', statement]);
  }

  async function status() {
    await validatePath();
    if (!existsSync(marker)) {
      if (existsSync(data)) throw new Error('Unowned data directory; refusing to operate');
      return { running: false, initialized: false, root, port };
    }
    await owned();
    const active = existsSync(path.join(data, 'PG_VERSION')) && await running();
    return { running: active, initialized: existsSync(path.join(data, 'PG_VERSION')), root, port,
      url: connection('gather'), testUrl: connection('gather_test'),
      ...(active ? { version: await sql('postgres', 'SELECT version()'), pid: Number((await readFile(path.join(data, 'postmaster.pid'), 'utf8')).split('\n')[0]) } : {}) };
  }

  async function start() {
    await validatePath();
    const version = await run(binary('postgres'), ['--version']);
    if (!/\b17\./.test(version)) throw new Error(`PostgreSQL 17 required: ${version}`);
    if (existsSync(marker)) await owned();
    else {
      if (existsSync(data)) throw new Error('Existing unowned data directory; refusing initialization');
      await available(port);
      await mkdir(root, { recursive: true });
      await writeFile(marker, JSON.stringify({ kind: 'gather-local-postgres-v1', root, port }, null, 2), { flag: 'wx' });
    }
    if (!existsSync(path.join(data, 'PG_VERSION'))) {
      await run(binary('initdb'), ['-D', data, '-U', 'postgres', '--encoding=UTF8', '--locale=C', '--auth-local=trust', '--auth-host=reject']);
    }
    if (!await running()) {
      await available(port);
      const configPath = value => value.replaceAll('\\', '/').replaceAll("'", "''");
      await writeFile(path.join(root, 'pg_hba.conf'), 'local all all trust\nhost all all 127.0.0.1/32 trust\nhost all all 0.0.0.0/0 reject\nhost all all ::0/0 reject\n');
      await writeFile(path.join(root, 'server.conf'), `include = '${configPath(path.join(data, 'postgresql.conf'))}'\nlisten_addresses = '127.0.0.1'\nport = ${port}\nunix_socket_directories = ''\nhba_file = '${configPath(path.join(root, 'pg_hba.conf'))}'\n`);
      await run(binary('pg_ctl'), ['-D', data, '-l', path.join(root, 'postgres.log'), '-o', `-c config_file="${path.join(root, 'server.conf').replaceAll('\\', '/')}"`, '-w', '-t', '30', 'start'], true);
    }
    for (const database of ['gather', 'gather_test']) {
      if (await sql('postgres', `SELECT 1 FROM pg_database WHERE datname = '${database}'`) !== '1') {
        await run(binary('createdb'), ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', '-w', database]);
      }
    }
    return status();
  }

  async function stop() {
    await owned();
    if (await running()) await run(binary('pg_ctl'), ['-D', data, '-m', 'fast', '-w', '-t', '30', 'stop']);
    return status();
  }

  async function requireRunning() {
    await owned();
    if (!await running()) throw new Error('Start this workspace cluster first');
  }

  async function backup(database = 'gather') {
    if (!['gather', 'gather_test'].includes(database)) throw new Error('Backup database must be gather or gather_test');
    await requireRunning();
    const directory = path.join(root, 'backups');
    await mkdir(directory, { recursive: true });
    inside(await realpath(root), await realpath(directory));
    const file = path.join(directory, `${database}-${Date.now()}-${randomUUID()}.dump`);
    const handle = await open(file, 'wx');
    await handle.close();
    await run(binary('pg_dump'), [...connectionArgs(database), '--format=custom', '--file', file]);
    return { file, database };
  }

  async function restore(file, target = `gather_restore_${Date.now()}_${randomUUID().replaceAll('-', '')}`) {
    if (!/^gather_restore_[a-z0-9_]{1,48}$/.test(target)) throw new Error('Restore target must begin gather_restore_ and contain at most 48 lowercase letters, digits or underscores after it');
    await requireRunning();
    const archive = inside(await realpath(root), await realpath(path.resolve(file)));
    await run(binary('pg_restore'), ['--list', archive]);
    await run(binary('createdb'), ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', '-w', '--template=template0', target]);
    await run(binary('pg_restore'), [...connectionArgs(target), '--exit-on-error', '--no-owner', '--no-privileges', archive]);
    return { database: target, url: connection(target), file: archive };
  }

  return { start, status, stop, backup, restore, sql, root, port };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, ...args] = process.argv.slice(2);
    if (!['start', 'status', 'stop', 'backup', 'restore'].includes(command) || (command === 'restore' && !args[0]) || args.length > (command === 'restore' ? 2 : command === 'backup' ? 1 : 0)) {
      throw new Error('Usage: node backend/scripts/postgres.mjs start|status|stop|backup [gather|gather_test]|restore <dump-file> [gather_restore_name]');
    }
    console.log(JSON.stringify(await createManager()[command](...args), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
