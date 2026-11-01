import { Database } from "./dist/src/infrastructure/database.js";
const sourceHost = "rooted-postgres-centralus.postgres.database.azure.com";
const restoreHost = "rooted-postgres-restorecheck-20261029.postgres.database.azure.com";
const church = "b150be0c-6cb1-46b6-98ab-7b83155e685e";
const actor = "entra:84524f4e-0cf6-4701-b128-dae041d1c910:9e8a2eb2-cf3a-41c7-a2b5-01b5f522a76e";
const ids = ["f693cc3c-0169-41e8-bb86-c27b4beb4e31","c9e94975-a44f-4e4f-8325-82c78e63ae77","c4e2912c-723c-4607-ba5f-6c365f146840"];
const publication = "fafc2050-f8f9-401c-a9b2-b5db163a14e4";
try {
  const base = new URL(process.env.DATABASE_URL);
  if (base.hostname !== sourceHost) throw new Error("Unexpected source host");
  const snapshots = {};
  for (const [label, host] of [["source", sourceHost], ["restore", restoreHost]]) {
    const url = new URL(base);
    url.hostname = host;
    url.searchParams.set("options", (url.searchParams.get("options") || "") + " -c default_transaction_read_only=on -c statement_timeout=15000");
    const db = new Database(url.toString());
    db.pool.options.connectionTimeoutMillis = 10000;
    try {
      await db.assertRuntime();
      const unscoped = (await db.pool.query("SELECT count(*)::int AS n FROM churches")).rows[0].n;
      if (unscoped !== 0) throw new Error("Unscoped tenant data visible");
      snapshots[label] = await db.transaction(church, actor, async c => ({
        readOnly: (await c.query("SHOW transaction_read_only")).rows[0].transaction_read_only,
        studies: (await c.query("SELECT s.local_date::text AS date,a.status,r.payload->>$1 AS title,md5(r.payload::text) AS checksum FROM slots s JOIN aggregates a ON a.church_id=s.church_id AND a.slot_id=s.id JOIN revisions r ON r.church_id=a.church_id AND r.id=a.head_revision_id WHERE a.kind=$2 AND s.id=ANY($3::uuid[]) ORDER BY s.local_date", ["title","content",ids])).rows,
        publicationCount: (await c.query("SELECT count(*)::int AS n FROM publications WHERE id=$1", [publication])).rows[0].n,
        reactions: (await c.query("SELECT type,count(*)::int AS n FROM reactions WHERE publication_id=$1 GROUP BY type ORDER BY type", [publication])).rows,
        comments: (await c.query("SELECT status,count(*)::int AS n FROM discussions WHERE publication_id=$1 GROUP BY status ORDER BY status", [publication])).rows
      }));
      if (snapshots[label].readOnly !== "on") throw new Error("Read-only safeguard missing");
    } finally {
      await db.close();
    }
  }
  const restored = snapshots.restore;
  console.log(JSON.stringify({
    restoreHost,
    runtimeSchemaIsolation: "passed",
    dataMatches: JSON.stringify(snapshots.source) === JSON.stringify(restored),
    restored: {...restored, studies: restored.studies.map(({checksum,...study}) => study)}
  }, null, 2));
} catch (error) {
  console.error("Restore check failed:", error.code || error.name);
  process.exitCode = 1;
}
