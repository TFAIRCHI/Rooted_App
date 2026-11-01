# Storage — files, assets and backup capacity

## Function and current requirement

Storage retains content beyond a process restart. Option B already includes **32 GB provisioned PostgreSQL storage at $3.68/month** in its database subtotal. Do not add that $3.68 a second time as a separate Storage Account charge.

Current [logo upload](../../../backend/src/api/theme-routes.ts) stores generated logo bytes in PostgreSQL; current reviewed source text and ordinary study data also reside there. Rooted does **not** currently require a separate Blob account merely to retain those features. Browser read-aloud creates no stored audio files.

## Alternatives and cost

| Choice | Price example | Pros | Cons |
|---|---:|---|---|
| Existing PostgreSQL asset/text storage | Already in DB budget | Fewest resources; current implementation | Large/binary media increases DB growth and backup cost |
| Private Blob Storage for future media | **About $0.07/month** for the parent example of 1 GB/10k reads/10k writes, before extras | Better separation for larger files; lifecycle controls | Storage adapter, access checks, deletion/backup policies and operations/egress costs |
| Container local filesystem | Ephemeral platform allocation | Temporary processing/scratch use | Not reliable durable upload storage across replica replacement |
| Mounted persistent file share | Price depends on selected file-share model | Can support a filesystem-dependent application | Extra service/mount operations and capacity charges; no current requirement established |

[Parent Blob example](../option-cost-comparison.md), [Container Apps storage behavior](https://learn.microsoft.com/en-us/azure/container-apps/storage-mounts).

## Cost minimization

Retain the current DB-backed small assets for the pilot, set upload limits, keep only necessary derivatives, and measure growth. Introduce Blob when actual media/size requirements justify it rather than creating accounts speculatively. Define private reads, church ownership, erasure and retention before moving files; public static website containers are not suitable private church storage.

Database backup allowance is different from an independent recoverable backup strategy. Verify retained backup volume/restore and excess backup billing; snapshots, versions, replication and long retention can increase costs. Provisioned DB storage is billed even if application content currently uses much less. [PostgreSQL pricing](https://azure.microsoft.com/en-us/pricing/details/postgresql/flexible-server/).
