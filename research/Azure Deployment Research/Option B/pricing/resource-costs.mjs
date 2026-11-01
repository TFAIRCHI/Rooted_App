import {readFile,writeFile} from 'node:fs/promises';

const filters=[
  "productName eq 'SQL Database Single Basic' and skuName eq 'B' and armRegionName eq 'eastus' and priceType eq 'Consumption'",
  "serviceName eq 'Azure Database for MySQL' and armRegionName eq 'eastus' and (skuName eq 'B1MS' or contains(productName, 'Flexible Server Storage')) and priceType eq 'Consumption'",
  "serviceName eq 'Container Registry' and armRegionName eq 'eastus' and skuName eq 'Basic' and priceType eq 'Consumption'",
  "productName eq 'Virtual Machines BS Series' and armSkuName eq 'Standard_B1ms' and armRegionName eq 'eastus' and priceType eq 'Consumption'",
];
const sources=[];
for(const filter of filters){
  const url=new URL('https://prices.azure.com/api/retail/prices');url.searchParams.set('$filter',filter);url.searchParams.set('currencyCode','USD');
  const response=await fetch(url,{signal:AbortSignal.timeout(20_000)});if(!response.ok)throw new Error(`Public price request returned ${response.status}; do not substitute an assumed price`);
  const page=await response.json();if(page.NextPageLink)throw new Error('Unexpected pagination; inspect the query');sources.push({requestUrl:url.href,items:page.Items});
}
const base=JSON.parse(await readFile(new URL('../../pricing/cost-estimate.json',import.meta.url),'utf8'));
const round=x=>Math.round(x*100)/100;
function charge(processes){const cpu=processes.reduce((sum,p)=>sum+p.cpu*p.hours*3600,0),memory=processes.reduce((sum,p)=>sum+p.gib*p.hours*3600,0);return Math.max(0,cpu-180000)*base.rates.cpuActivePerSecond+Math.max(0,memory-360000)*base.rates.memoryActivePerGiBSecond;}
const front={cpu:.5,gib:1,hours:20},api={cpu:.25,gib:.5,hours:20},worker={cpu:.25,gib:.5,hours:730};
const sql=sources[0].items.find(x=>x.meterName==='B DTU');if(!sql)throw new Error('Basic SQL meter missing');
const registry=sources[2].items.find(x=>x.meterName==='Basic Registry Unit');if(!registry)throw new Error('Registry meter missing');
const fetchedAt=new Date().toISOString();
const result={fetchedAt,currency:'USD',region:'eastus',hoursPerMonth:730,source:'Azure public Retail Prices API and existing dated PostgreSQL/Container Apps snapshot',sources,examples:{databasePostgres:base.result.postgresTotalUsd,sqlBasicDatabase:round(sql.retailPrice*730/24),registryBasic:round(registry.retailPrice*730/24),baselineCore:base.result.coreInfrastructureUsd,baselinePlusRegistry:round(base.result.coreInfrastructureUsd+registry.retailPrice*730/24),workerAloneAfterAllComputeGrant:round(charge([worker])),webApiIncrementAfterWorkerUsesGrant:round(charge([front,api,worker])-charge([worker])),boundedJobCore:round(charge([front,api,{...worker,hours:20}])+base.result.postgresTotalUsd),operatorOnly176HoursCore:round(charge([front,api,{...worker,hours:176}])+176*base.rates.postgresB1msPerHour+32*base.rates.postgresStoragePerGbMonth),bundledWebApiCore:round(charge([{cpu:.5,gib:1,hours:20},worker])+base.result.postgresTotalUsd),bundledAllAlwaysOnCore:round(charge([{cpu:.75,gib:1.5,hours:730}])+base.result.postgresTotalUsd),sqlBasicAfterPortCore:round(charge([front,api,worker])+sql.retailPrice*730/24),sqlFreeAfterPortCore:round(charge([front,api,worker]))},notes:['All cost examples exclude AI, taxes, domain renewal, logs, networking, CI and separately chosen services.','Shared compute grants apply once per alternative; the per-process attribution is illustrative, not independent free grants.','SQL Basic includes only 2 GB per the separately linked official limits, unlike the 32 GB PostgreSQL example.','Bundled process resource sizes and operator-only schedules are hypotheses, not tested deployment performance.','VM meter is compute-only; do not treat it as a complete self-managed database quote.']};
await writeFile(new URL('resource-rates-and-scenarios.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.examples,null,2));
