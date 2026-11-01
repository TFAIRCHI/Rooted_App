# DB — relational storage choices

## Is PostgreSQL Flexible Server required?

**PostgreSQL is required by the current implementation; Flexible Server is a hosting choice.** A compatible PostgreSQL installation elsewhere can preserve the engine. Azure SQL or MySQL can also support a church application, but Rooted would need a migration before using them. Changing only `DATABASE_URL` will not make those engines work.

Flexible Server is Azure's managed PostgreSQL product, not a synonym for an expensive tier. It includes Burstable, General Purpose and Memory Optimized configurations; one server can hold multiple databases. “Basic PostgreSQL” is not a separate cheaper current managed service that bypasses those choices. The former Azure PostgreSQL Single Server product retired on March 28, 2025. [Compute tiers](https://learn.microsoft.com/en-us/azure/postgresql/compute-storage/concepts-compute), [retirement notice](https://techcommunity.microsoft.com/t5/azure-database-for-postgresql/announcement-retiring-azure-postgresql-single-server-in-2025-and/td-p/3820887).

## Function and current engine dependencies

This resource stores churches, identities/memberships, study content/revisions, comments/reactions, source text, private conversations, confirmations and durable jobs. It also enforces tenant isolation and transactional creation/publication.

The [database runtime](../../../backend/src/infrastructure/database.ts) uses `pg`, PostgreSQL catalogs, a nonowner `gather_runtime` role, transaction-local `set_config` and forced row-level security. [Migrations](../../../backend/src/infrastructure/migrate.ts) and [workflow code](../../../backend/src/modules/study-workflows.ts) also depend on PostgreSQL SQL/JSON types, security-definer functions, advisory locks and locked job claims. This is not a database-neutral ORM implementation.

## Alternatives, costs and tradeoffs

USD/East US examples use a 730-hour month. Costs exclude application hosting, AI, tax, optional networking and migration labor. [Rate evidence](pricing/resource-rates-and-scenarios.json).

| Choice | Monthly database example | Advantages | Disadvantages / changes |
|---|---:|---|---|
| **PostgreSQL Flexible Server, B1MS + 32 GB** | **$16.09** | Existing engine; managed backups/operations; smallest architectural change | Constrained CPU-credit/connection capacity; managed-admin migration validation still required; pilot rather than assumed production sizing |
| **PostgreSQL free introductory offer** | **Potentially $0 within eligible allowance** | Keep the engine while lowering initial bill | Time-limited and subscription-dependent; not confirmed for this account; reprice at expiry |
| **Azure SQL Database Free** | **$0 inside its selected free limits** | Managed relational database; recurring free offer rather than only an introductory year | Port driver, queries, migrations, job locks and isolation policies; worker polling/long-lived activity can consume allowance; quota exhaustion can pause access |
| **Azure SQL Database Basic DTU** | **About $4.90**, including its 2 GB limit | Small predictable managed bill; no serverless allowance dependency | Only 5 DTUs/2 GB; not equivalent capacity to 32 GB PostgreSQL; full engine port still required |
| **MySQL Flexible Server B1MS + 32 GB** | **About $16.09** at retrieved selected compute/storage rates | Managed MySQL; familiar relational tooling | No compelling rate saving in this comparison; different driver, dialect and tenant-isolation design |
| **PostgreSQL on a small Azure Linux VM** | **$15.11 compute alone** for B1ms; add disks, backup, network/operations | Keep PostgreSQL and full server control | Not a complete $15 database quote; self-managed upgrades, recovery, monitoring, disk capacity and availability; small VM capacity needs validation |
| **External hosted PostgreSQL free tier** | **Potentially $0 within provider limits** | Keep PostgreSQL engine; possible low idle cost | Outside an Azure-native-only resource choice; role/RLS/migration compatibility, backup, privacy, quotas and region need proof |

The SQL Basic meter is **$0.161/day × 730/24 = $4.897...**. It is a billable Basic DTU database, **not** the separate Azure SQL General Purpose serverless free offer. MySQL compute is $0.017/hour and selected storage $0.115/GB-month; this excludes extra IOPS/other features. VM B1ms is $0.0207/hour and includes no managed database service or data disk. A smaller nominal bill does not establish adequate capacity.

## Azure SQL Free deserves a serious look, with a migration estimate

Microsoft currently offers up to ten free General Purpose serverless databases per eligible subscription. Each has **100,000 vCore-seconds, 32 GB data and 32 GB backup/month**; configure quota-exhaustion auto-pause to avoid automatically opting into paid overage. A normal serverless database created without the free-offer setting is billable. Continuous polling can undermine idle savings; a free quota is not unlimited 24/7 compute. [Azure SQL free offer](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-tier?view=azuresql).

Azure SQL supports row-level security, but through its own policies/predicates and execution context. Replace PostgreSQL-specific mechanisms with proven equivalents, not just application-side `WHERE church_id=...`. [Azure SQL RLS](https://learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security?view=sql-server-ver17). Basic's separate capacity limits are documented in [DTU limits](https://learn.microsoft.com/en-us/azure/azure-sql/database/resource-limits-dtu-single-databases?view=azuresql).

A migration needs: compatible driver/transactions; translated schema/JSON/time/constraint logic; verified row isolation and context reset on pooled connections; durable locks/idempotency; export/import and restore; and the existing integration/browser acceptance suite on the new engine. No alternative engine was deployed or compatibility-tested here.

SQL Basic lowers the modeled database bill by approximately **$11.19/month**, or about **$134/year**, compared with the PostgreSQL example. Assess total cost using:

```text
Migration break-even months = one-time migration cost / monthly infrastructure saving
```

No development price has been agreed. Even if developer labor is personally supplied, the time and regression risk matter.

## Recommendation and minimum-cost settings

For the first working pilot, keep the current engine, share one application database across churches using the existing forced-RLS design, cap pool sizes, monitor credits/connections, and avoid optional replicas/features not required by the pilot. The API and worker are the database clients; the Next.js frontend does not need its own PostgreSQL pool.

B1MS is a cost illustration, not a production default. Microsoft primarily recommends Burstable for nonproduction and General Purpose for most production workloads. Do not use a smaller unsupported/undersized service solely to match a quoted budget. Postgres provisioned storage starts at the documented minimum and cannot simply be reduced to Azure SQL Basic's 2 GB example. [Current compute guidance](https://learn.microsoft.com/en-us/azure/postgresql/compute-storage/concepts-compute).

For an operator-only demo, stopping PostgreSQL outside agreed hours saves compute while retaining storage charges; members cannot use the application while it is stopped. Azure can automatically restart a stopped server after seven days. [Pricing](https://azure.microsoft.com/en-us/pricing/details/postgresql/flexible-server/), [restart/maintenance behavior](https://learn.microsoft.com/en-us/azure/postgresql/configure-maintain/concepts-maintenance).
