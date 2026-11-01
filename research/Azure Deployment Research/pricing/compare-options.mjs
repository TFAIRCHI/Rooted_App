import {readFile,writeFile} from 'node:fs/promises';

// Public retail-rate reads and local arithmetic only; no subscription or deployment operations.
const filters = [
  "productName eq 'Static Web Apps' and skuName eq 'Standard' and armRegionName eq 'eastus2' and priceType eq 'Consumption'",
  "serviceName eq 'Functions' and productName eq 'Flex Consumption' and skuName eq 'On Demand' and armRegionName eq 'eastus' and priceType eq 'Consumption'",
  "serviceName eq 'Storage' and armRegionName eq 'eastus' and productName eq 'General Block Blob v2' and skuName eq 'Hot LRS' and priceType eq 'Consumption'",
  "productName eq 'Azure Front Door' and skuName eq 'Standard' and armRegionName eq 'Zone 1' and priceType eq 'Consumption'",
];
const sources=[];
for (const filter of filters) {
  const request=new URL('https://prices.azure.com/api/retail/prices');request.searchParams.set('$filter',filter);request.searchParams.set('currencyCode','USD');
  const response=await fetch(request,{signal:AbortSignal.timeout(20_000)});
  if(!response.ok)throw new Error(`Retail lookup failed ${response.status}`);
  const page=await response.json();if(page.NextPageLink)throw new Error('Unexpected pagination: review the filter before estimating');
  sources.push({requestUrl:request.href,items:page.Items});
}
function price(meter,predicate=()=>true) {
  const matches=sources.flatMap(x=>x.items).filter(x=>x.meterName===meter&&predicate(x));
  if(matches.length!==1)throw new Error(`Expected one meter for ${meter}, found ${matches.length}`);
  return matches[0].retailPrice;
}
const base=JSON.parse(await readFile(new URL('cost-estimate.json',import.meta.url),'utf8'));
const rates={swaStandardMonthly:price('Standard App'),blobGbMonthly:price('Hot LRS Data Stored',x=>x.tierMinimumUnits===0),blobReadPer10k:price('Hot Read Operations'),blobWritePer10k:price('Hot LRS Write Operations'),functionsFlexGbSecond:price('On Demand Execution Time',x=>x.tierMinimumUnits>0),functionsFlexPerExecution:price('On Demand Total Executions',x=>x.tierMinimumUnits>0)/10,frontDoorBaseMonthly:price('Standard Base Fees'),frontDoorEgressPerGb:price('Standard Data Transfer Out',x=>x.tierMinimumUnits===0),frontDoorRequestsPer10k:price('Standard Requests',x=>x.tierMinimumUnits===0)};
const round=x=>Math.round(x*100)/100;
function compute(processes) {
  const cpu=processes.reduce((s,p)=>s+p.hours*3600*p.cpu,0);
  const memory=processes.reduce((s,p)=>s+p.hours*3600*p.gib,0);
  return Math.max(0,cpu-180000)*base.rates.cpuActivePerSecond+Math.max(0,memory-360000)*base.rates.memoryActivePerGiBSecond;
}
const database=base.result.postgresTotalUsd;
const frontend={hours:20,cpu:.5,gib:1},api={hours:20,cpu:.25,gib:.5},worker={hours:730,cpu:.25,gib:.5},jobs={hours:20,cpu:.25,gib:.5};
const blob=rates.blobGbMonthly+rates.blobReadPer10k+rates.blobWritePer10k;
const functionsUsage={instanceMemoryGb:2,apiRequests:100000,apiSecondsPerRequest:.2,timerInvocations:730*60/5,timerSecondsPerInvocation:3,aiJobs:100,aiSecondsPerJob:60};
const executions=functionsUsage.apiRequests+functionsUsage.timerInvocations+functionsUsage.aiJobs;
const gbSeconds=functionsUsage.instanceMemoryGb*(functionsUsage.apiRequests*functionsUsage.apiSecondsPerRequest+functionsUsage.timerInvocations*functionsUsage.timerSecondsPerInvocation+functionsUsage.aiJobs*functionsUsage.aiSecondsPerJob);
const functions=Math.max(0,gbSeconds-100000)*rates.functionsFlexGbSecond+Math.max(0,executions-250000)*rates.functionsFlexPerExecution;
const rows=[];
function row(id,label,hosting,storage,db,planning,notes){rows.push({id,label,hostingUsd:round(hosting),storageUsd:round(storage),databaseUsd:round(db),coreMonthlyUsd:round(hosting+storage+db),coreIfPostgresOfferAppliesUsd:round(hosting+storage),planningMonthlyUsd:planning,notes});}
row('A','SWA Free public preview',0,0,0,[0,0],'Public pages only; within SWA and CI quotas.');
row('A-storage','SWA Free plus optional Blob Storage',0,blob,0,[.10,1],'Still public pages only. Blob adds 1 GB, 10k reads and 10k writes.');
row('Storage-edge','Storage static website plus Front Door Standard',rates.frontDoorBaseMonthly+10*rates.frontDoorEgressPerGb+10*rates.frontDoorRequestsPer10k,blob,0,[40,50],'Public pages only; 10 GB North America delivery and 100k edge requests; 10k origin reads assumed.');
row('B','Container Apps frontend/API/continuous worker',compute([frontend,api,worker]),0,database,[35,50],'Current worker architecture; no introductory database offer applied.');
row('C','Container Apps frontend/API/bounded jobs',compute([frontend,api,jobs]),0,database,[20,30],'Worker refactor required; 20 total billed job hours including startup.');
row('D-free','SWA Free frontend plus separate API/continuous worker',compute([api,worker]),0,database,[35,50],'Hybrid-preview proof or static-client/cross-origin refactor required; not a linked API on Free.');
row('D-standard','SWA Standard static frontend plus linked API/continuous worker',rates.swaStandardMonthly+compute([api,worker]),0,database,[45,60],'Static-client rewrite and linked API/session integration required.');
row('E-free','SWA Free plus Flex Functions/Storage/PostgreSQL',functions,blob,database,[20,30],'Serverless rewrite, direct API/cookie integration and timer/finite-worker implementation required.');
row('E-standard','SWA Standard plus linked Flex Functions/Storage/PostgreSQL',rates.swaStandardMonthly+functions,blob,database,[30,40],'Serverless/static-client rewrite required; includes Standard linked-API charge.');
const fetchedAt=new Date().toISOString();
const snapshotName=`option-retail-prices-${fetchedAt.slice(0,10)}.json`;
await writeFile(new URL(snapshotName,import.meta.url),JSON.stringify({fetchedAt,currency:'USD',regions:'East US compute/storage; East US 2 SWA; North America Zone 1 Front Door',sources},null,2)+'\n');
await writeFile(new URL('option-comparison.json',import.meta.url),JSON.stringify({calculatedAt:fetchedAt,currency:'USD',priceSnapshot:snapshotName,baseSnapshot:base.priceSnapshot,rates,functionsUsage,functionsTotals:{executions,gbSeconds,chargeUsd:round(functions)},blobUsage:{gb:1,readOperations:10000,writeOperations:10000,chargeUsd:round(blob)},sharedGrantAssumption:'Each option is an alternative using one available subscription grant, not cumulative deployments',exclusions:base.exclusions,rows},null,2)+'\n');
console.log(JSON.stringify({rates,functionsTotals:{executions,gbSeconds,chargeUsd:round(functions)},rows},null,2));
