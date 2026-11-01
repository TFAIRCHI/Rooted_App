import { writeFile } from 'node:fs/promises';

// Public unauthenticated price lookup only. No Azure resources or deployment calls.
const region = 'eastus';
const currency = 'USD';
const queries = [
  { service: 'Azure Container Apps', keep: item => item.productName === 'Azure Container Apps' && item.skuName === 'Standard' && ['Standard vCPU Active Usage', 'Standard Memory Active Usage', 'Standard vCPU Idle Usage', 'Standard Memory Idle Usage', 'Standard Requests'].includes(item.meterName) },
  { service: 'Azure Database for PostgreSQL', keep: item => item.productName === 'Azure Database for PostgreSQL Flexible Server Burstable BS Series Compute' && item.skuName === 'B1MS' || item.productName === 'Azure Database for PostgreSQL Flex Server Storage' && item.skuName === 'Storage' || item.productName === 'Azure Database for PostgreSQL Flexible Server Backup Storage' && item.skuName === 'Backup Storage LRS' },
];
const responses = [];
for (const query of queries) {
  const filter = `serviceName eq '${query.service}' and armRegionName eq '${region}' and priceType eq 'Consumption'`;
  const request = new URL('https://prices.azure.com/api/retail/prices');
  request.searchParams.set('$filter', filter); request.searchParams.set('currencyCode', currency);
  let next = request.href; const items = [];
  while (next) {
    const url = new URL(next);
    if (url.protocol !== 'https:' || url.hostname !== 'prices.azure.com') throw new Error('Unexpected price pagination host');
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Retail price lookup failed: ${response.status}`);
    const page = await response.json(); items.push(...page.Items.filter(query.keep)); next = page.NextPageLink;
  }
  responses.push({ service: query.service, requestUrl: request.href, items });
}
function meter(name) {
  const matches = responses.flatMap(response => response.items).filter(item => item.meterName === name && item.isPrimaryMeterRegion && item.currencyCode === currency && item.type === 'Consumption');
  if (matches.length !== 1) throw new Error(`Expected one primary USD consumption meter for ${name}, got ${matches.length}; review rather than guessing`);
  return matches[0].retailPrice;
}
const fetchedAt = new Date().toISOString();
const snapshot = { fetchedAt, currency, region, source: 'Azure Retail Prices API; no account-specific discounts, eligibility or tax calculation', responses };
const datedName = `azure-retail-prices-${fetchedAt.slice(0, 10)}.json`;
await writeFile(new URL(datedName, import.meta.url), JSON.stringify(snapshot, null, 2) + '\n');
const rates = { cpuActivePerSecond: meter('Standard vCPU Active Usage'), memoryActivePerGiBSecond: meter('Standard Memory Active Usage'), postgresB1msPerHour: meter('B1MS'), postgresStoragePerGbMonth: meter('Storage Data Stored') };
const processes = [
  { name: 'frontend', vCPU: 0.5, memoryGiB: 1, activeHours: 20 },
  { name: 'api', vCPU: 0.25, memoryGiB: 0.5, activeHours: 20 },
  { name: 'continuous worker', vCPU: 0.25, memoryGiB: 0.5, activeHours: 730 },
];
const cpuSeconds = processes.reduce((sum, process) => sum + process.activeHours * 3600 * process.vCPU, 0);
const memoryGiBSeconds = processes.reduce((sum, process) => sum + process.activeHours * 3600 * process.memoryGiB, 0);
const freeGrant = { cpuSeconds: 180_000, memoryGiBSeconds: 360_000, requests: 2_000_000 };
const rounding = value => Math.round(value * 100) / 100;
const compute = Math.max(0, cpuSeconds - freeGrant.cpuSeconds) * rates.cpuActivePerSecond + Math.max(0, memoryGiBSeconds - freeGrant.memoryGiBSeconds) * rates.memoryActivePerGiBSecond;
const database = 730 * rates.postgresB1msPerHour + 32 * rates.postgresStoragePerGbMonth;
const estimate = { calculatedAt: fetchedAt, priceSnapshot: datedName, currency, region, model: 'Illustrative pilot, not a quote or performance guarantee', rates, processes, sharedMonthlyFreeGrantAssumedAvailable: freeGrant, usage: { cpuSeconds, memoryGiBSeconds }, postgres: { sku: 'B1MS', hours: 730, storageGb: 32, highAvailability: false, freeOfferApplied: false }, result: { containerComputeUsd: rounding(compute), postgresComputeUsd: rounding(730 * rates.postgresB1msPerHour), postgresStorageUsd: rounding(32 * rates.postgresStoragePerGbMonth), postgresTotalUsd: rounding(database), coreInfrastructureUsd: rounding(compute + database) }, exclusions: ['AI/model charges', 'registry and CI/artifact costs', 'logging/monitoring ingestion and retention', 'identity premium/SMS charges', 'network egress, NAT, private endpoints and other network services', 'additional backups or storage/IOPS', 'domain renewals and tax', 'idle/cooldown allocation beyond the active-hours assumption', 'extra app replicas and consumed subscription grants'] };
await writeFile(new URL('cost-estimate.json', import.meta.url), JSON.stringify(estimate, null, 2) + '\n');
console.log(JSON.stringify({ snapshot: datedName, ...estimate.result }));
console.log('Review written examples after refresh; new prices do not automatically rewrite the research documents.');
