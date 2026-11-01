// Run only AFTER Portal confirms rooted-frontend-centralus has zero replicas.
// One first request plus one warm comparison; no configuration or identity changes.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {mkdir,writeFile} from 'node:fs/promises';

const origin='https://rooted-together.com';
const directory='research/Azure Deployment Research/advanced-acceptance-20261030';
assert.ok(process.env.ROOTED_ZERO_REPLICA_OBSERVED_AT,'A Portal-confirmed zero-replica observation is required first');
const observed=Date.parse(process.env.ROOTED_ZERO_REPLICA_OBSERVED_AT);
assert.ok(Number.isFinite(observed)&&Date.now()-observed>=0&&Date.now()-observed<5*60*1000,'Zero-replica observation must be from the preceding five minutes');
const report={scenario:'live frontend zero-replica HTTP activation',zeroReplicaObservation:'user Azure Portal confirmation',
  zeroReplicasObservedAt:new Date(observed).toISOString(),startedAt:new Date().toISOString(),passed:false};
try{
  for(const label of ['firstRequest','warmRequest']){
    const started=performance.now();
    const response=await fetch(origin+'/?rooted_acceptance='+Date.now(),{
      headers:{'cache-control':'no-cache, no-store'},redirect:'error',signal:AbortSignal.timeout(60000)
    });
    const html=await response.text();
    report[label]={status:response.status,milliseconds:Math.round(performance.now()-started),
      html:response.headers.get('content-type')?.includes('text/html')===true,rootedPage:/Rooted/.test(html)};
    assert.equal(response.status,200,label+' did not return HTTP 200');
    assert.ok(report[label].html&&report[label].rootedPage,'Expected Rooted HTML');
  }
  const proxy=await fetch(origin+'/api/v1/auth/options',{
    headers:{'cache-control':'no-cache, no-store'},redirect:'error',signal:AbortSignal.timeout(30000)
  });
  report.backendProxyStatus=proxy.status;
  assert.equal(proxy.status,200,'Frontend-to-API proxy did not recover');
  const options=await proxy.json();
  report.productionAuthOptions={localIssuer:options.localIssuer,demoLogin:options.demoLogin,accessBasedLogin:options.accessBasedLogin};
  assert.equal(options.localIssuer,false);assert.equal(options.demoLogin,false);assert.equal(options.accessBasedLogin,true);
  report.passed=true;report.completedAt=new Date().toISOString();
}catch(error){report.errorType=error.name;process.exitCode=1;}
finally{
  await mkdir(directory,{recursive:true});
  await writeFile(directory+'/cold-start.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}
