# Local PostgreSQL 17

Run these commands from the workspace root with Node.js 20 or newer:

```sh
node backend/scripts/postgres.mjs start
node backend/scripts/postgres.mjs status
node backend/scripts/postgres.mjs backup
node backend/scripts/postgres.mjs backup gather_test
node backend/scripts/postgres.mjs restore .local/postgres/backups/<archive>.dump gather_restore_check
node backend/scripts/postgres.mjs stop
node --test backend/scripts/postgres.test.mjs
```

The script discovers PostgreSQL 17 at `C:/Program Files/PostgreSQL/17/bin`, common Linux/Homebrew locations, or PATH. Set `POSTGRES_BIN` to override discovery. It runs `initdb` as the current OS user with `-U postgres`; on Unix, use an ordinary user rather than root. No service registration or system configuration changes are made.

The cluster lives under `.local/postgres`, including its ownership marker, data, PostgreSQL-managed `data/postmaster.pid`, log, configuration, and backups. Startup is idempotent, starts a background process, and creates only the `gather` and `gather_test` databases if missing. It does not install schemas, roles, grants, or passwords; those belong to the backend migrations/setup. An existing unowned data directory or occupied port is refused. Stopping preserves all data; starting again reuses it. Never remove `.local/postgres` to troubleshoot a startup problem: inspect `postgres.log` first.

Development connections:

```text
postgres://postgres@127.0.0.1:54329/gather
postgres://postgres@127.0.0.1:54329/gather_test
```

Trust authentication is restricted to IPv4 loopback; the server binds only `127.0.0.1` on port `54329`, with Unix sockets disabled. Any local OS process can connect as the development superuser. These settings are for local development only.

Backups are unique PostgreSQL custom-format archives under `.local/postgres/backups`. Restore accepts an archive inside this cluster directory and creates a fresh database whose name begins `gather_restore_`. Existing targets are refused, and restore never drops or overwrites databases. Restore omits original owners and grants; backend setup owns those. If restoration fails, its new database remains for inspection. Backups cover a single database, not global roles or passwords. Keep valuable backups outside disposable runtime storage yourself.

Tests use real installed PostgreSQL 17 in uniquely named `.local/postgres-tests` clusters on ephemeral loopback ports. They verify persistence, idempotency, backup/restore contents, target isolation, and refusal of unowned data. Only test-created directories are removed after their server stops. The main development cluster remains running.

## Docker fallback

If native binaries are absent, install PostgreSQL 17 or start the Docker daemon (Docker Desktop on Windows), then run:

```sh
docker run --name gather-postgres-dev -e POSTGRES_HOST_AUTH_METHOD=trust -p 127.0.0.1:54329:5432 -v gather-postgres-dev:/var/lib/postgresql/data -d postgres:17
docker exec gather-postgres-dev createdb -U postgres gather
docker exec gather-postgres-dev createdb -U postgres gather_test
docker stop gather-postgres-dev
docker start gather-postgres-dev
```

Use Docker only when the native cluster is stopped, since they share a port. Docker uses its own persistent named volume and lifecycle; the Node script manages native clusters only. Do not remove an existing container or volume to resolve a name conflict. Docker being installed does not imply its daemon is running.
