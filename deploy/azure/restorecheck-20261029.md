# October 29 managed restore validation

Target: `rooted-postgres-restorecheck-20261029.postgres.database.azure.com`.
Source: `rooted-postgres-centralus.postgres.database.azure.com`.

The paired `.mjs` file is diagnostic source for an inline Node invocation in the existing **rooted-worker Azure Portal Console**, whose working directory contains `dist/src/infrastructure/database.js`. It is not a new worker or an application deployment. Do not run it as a local file expecting local credentials or module paths to work.

The source was syntax checked locally with `node --check deploy/azure/restorecheck-20261029.mjs`. User subsequently ran the supplied one-line inline command in the existing worker Console and supplied successful output. Codex did not directly execute remote SQL.

The diagnostic:

- Guards the existing production hostname and changes the hostname only on two temporary diagnostic connection objects. It never changes `process.env.DATABASE_URL`, secrets, app settings or the running worker's connection.
- Enforces `default_transaction_read_only=on` through startup options on both pools, bounds connection/query waits, and verifies the read-only setting.
- Calls the existing runtime-role/schema/forced-RLS checks and verifies no churches are visible without tenant context.
- Reads the three known pilot studies using the existing church/Contributor tenant context; compares title/status/date and full-payload MD5 equality between source and restored copy. The checksum is an equality diagnostic, not a cryptographic security guarantee.
- Compares the known publication count, reaction counts and discussion-status counts. It prints no passwords, session tokens, source body or comment text.
- Closes both temporary diagnostic pools. It does not run migrations, provider inference or publication workers.

Expected output includes `runtimeSchemaIsolation: passed`, `dataMatches: true`, `readOnly: on`, all three known studies, publicationCount 1, thankful 1, and the previously accepted approved/declined discussion statuses. Before interpreting a match, verify the expected records are present; two empty result sets would not establish recovery.

If results differ, retain the restored target and investigate which metadata changed. A concurrent production edit/publication after the restore point can legitimately cause a mismatch. Do not change production or rerun migrations to manufacture a match.

After accepted validation, remove only the temporary restored server. Keep the source server, shared VNet/subnet, DNS zone and all application connections intact. Confirm temporary-resource deletion and production page availability before closing the restore acceptance group.

## Observed result

User screenshot shows correct restore hostname, `runtimeSchemaIsolation: passed`, `dataMatches: true`, and `readOnly: on`. The three recovered studies are Remaining in Christ (2026-10-30, scheduled), Asking for Wisdom (2026-10-31, published), and Choosing Wisely (2026-11-02, draft). Known publication count is 1, thankful count 1, discussion status counts approved 1 and declined 1. No error is displayed and shell prompt returned.

This accepts sampled study payload equality and the enumerated runtime/isolation checks. It is not a full database row-by-row comparison or measured RPO/RTO. User subsequently deleted the temporary server, explicitly confirmed it is absent from the refreshed resource-group list, and confirmed production Asking for Wisdom still loads. The screenshot retains the production server and shared networking/DNS. **Managed restore acceptance and cleanup are complete.** No additional production page check is needed absent a new change/failure.
