// Live acceptance: authenticates interactively, then logs out/replays only this isolated test session.
// No cookies, CSRF tokens, authorization codes, traces or storage state are written to disk.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium,request} from 'playwright';

const origin='https://rooted-together.com';
const church='b150be0c-6cb1-46b6-98ab-7b83155e685e';
const expectedActor='entra:84524f4e-0cf6-4701-b128-dae041d1c910:9e8a2eb2-cf3a-41c7-a2b5-01b5f522a76e';
const directory='research/Azure Deployment Research/advanced-acceptance-20261030';
const report={scenario:'live isolated contributor-session logout and old-cookie replay',checkedAt:new Date().toISOString(),passed:false};
let browser,replay;
try{
  await mkdir(directory,{recursive:true});
  browser=await chromium.launch({channel:'msedge',headless:false});
  const context=await browser.newContext();
  const page=await context.newPage();
  console.log('A separate Edge test window is opening. Sign in there as Contributor Fairchild. No cookie values will be displayed or saved.');
  // Let the user start verification when ready, so an identity flow does not expire while waiting.
  await page.goto(origin+'/dashboard',{waitUntil:'domcontentloaded',timeout:90000});
  const deadline=Date.now()+30*60*1000;
  let session;
  while(Date.now()<deadline){
    const location=new URL(page.url());
    if(location.origin===origin&&!location.pathname.startsWith('/api/')){
      const response=await context.request.get(origin+'/api/v1/auth/session',{timeout:20000});
      if(response.status()===200){
        const candidate=await response.json();
        if(candidate.access==='contributor'){
          assert.equal(candidate.user.id,expectedActor,'Expected the existing Contributor Fairchild account');
          assert.ok(candidate.churches.some(item=>item.id===church));
          session=candidate;report.beforeLogoutStatus=response.status();break;
        }
      }
    }
    await delay(750);
  }
  assert.ok(session,'Contributor sign-in was not completed within the thirty-minute test window');
  const cookie=(await context.cookies(origin)).find(item=>item.name==='gather_session');
  assert.ok(cookie?.value,'Verified test session cookie missing');
  const workspace=await context.request.get(origin+`/api/v1/churches/${church}/workspace`,{timeout:30000});
  report.beforeWorkspaceStatus=workspace.status();assert.equal(workspace.status(),200);
  console.log('Contributor session verified. Logging out this test session and checking old-cookie replay.');
  const logout=await context.request.post(origin+'/api/v1/auth/logout',{
    headers:{origin,'x-csrf-token':session.csrfToken},data:{},timeout:30000
  });
  report.logoutStatus=logout.status();assert.equal(logout.status(),200);
  replay=await request.newContext({baseURL:origin,extraHTTPHeaders:{cookie:`gather_session=${cookie.value}`}});
  const replaySession=await replay.get('/api/v1/auth/session',{timeout:30000});
  const replayWorkspace=await replay.get(`/api/v1/churches/${church}/workspace`,{timeout:30000});
  report.oldSessionReplayStatus=replaySession.status();
  report.oldWorkspaceReplayStatus=replayWorkspace.status();
  assert.equal(replaySession.status(),401);assert.equal(replayWorkspace.status(),401);
  const after=await context.request.get(origin+'/api/v1/auth/session',{timeout:30000});
  report.loggedOutBrowserStatus=after.status();assert.equal(after.status(),401);
  report.passed=true;report.completedAt=new Date().toISOString();
  await page.goto('about:blank');
  await page.setContent('<title>Rooted session replay check</title><main style="font:20px system-ui;max-width:700px;margin:80px auto"><h1>Session replay check passed</h1><p>The test session worked before logout. After logout, the captured old session was rejected by both the session and workspace endpoints.</p><p>No cookie or token values were saved. This test window will close automatically.</p></main>');
  console.log(JSON.stringify(report));
  await delay(5000);
}catch(error){
  report.errorType=error.name;
  // Playwright error messages can contain callback URLs. Keep them out of reports/output.
  console.error('Session replay check did not complete. Sanitized status report saved; no tokens or URLs printed.');
  process.exitCode=1;
}finally{
  await replay?.dispose();await browser?.close();
  await mkdir(directory,{recursive:true});
  await writeFile(directory+'/session-replay.json',JSON.stringify(report,null,2)+'\n');
}
