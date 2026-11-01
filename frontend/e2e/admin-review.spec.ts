import {test,expect,type BrowserContext,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';

test('contributor submits to administrator without authoring grants; administrator approves independently',async({browser,page})=>{
  const church='10000000-0000-4000-8000-000000000001';
  const prefix=`/api/v1/churches/${church}`;
  async function login(target:Page,persona:string){await target.goto(`/api/v1/auth/login?persona=${persona}`);await target.waitForURL(url=>!url.pathname.startsWith('/api/'));}
  async function command(context:BrowserContext,path:string,data:unknown,etag?:string){
    const session=await(await context.request.get('/api/v1/auth/session')).json();
    const response=await context.request.post(prefix+path,{headers:{'X-CSRF-Token':session.csrfToken,'Idempotency-Key':randomUUID(),...(etag?{'If-Match':etag}:{})},data});
    expect(response.ok(),await response.text()).toBeTruthy();return response.json();
  }
  await login(page,'contributor');
  const adminContext=await browser.newContext({baseURL:'http://127.0.0.1:3002'});const admin=await adminContext.newPage();
  try{
    await login(admin,'admin');
    const session=await(await adminContext.request.get('/api/v1/auth/session')).json();
    const grants=session.churches.find((item:{id:string})=>item.id===church).capabilities;
    expect(grants).toContain('content:approve');expect(grants).not.toContain('plans:edit');expect(grants).not.toContain('content:edit');
    const day=new Date(Date.now()+2*86400000).toISOString().slice(0,10);
    const series=await command(page.context(),'/series',{title:'Admin and contributor review',weekAnchor:day,timeZone:'America/New_York',sermonIds:[]});
    const slot=await command(page.context(),`/series/${series.id}/slots`,{localDate:day,localTime:'08:00',timeZone:'America/New_York',assigneeIds:['contributor']});
    let plan=await(await page.request.get(prefix+`/plans/${slot.planId}`)).json();
    plan=await command(page.context(),`/plans/${plan.id}/revisions`,{baseRevisionId:plan.headRevisionId,payload:{schemaVersion:1,title:'Words of life',primaryScripture:{reference:'John 6:68',translation:null},learningObjective:'Consider Peter’s response',outline:['Read John 6:60–69','Reflect together'],discussionQuestion:'What does Peter say?',notes:'Fictional browser fixture',extensions:[]}},plan.etag);
    let content=await command(page.context(),`/plans/${plan.id}/content`,{mode:'manual'},plan.etag);
    content=await command(page.context(),`/content/${content.id}/revisions`,{baseRevisionId:content.headRevisionId,payload:{schemaVersion:1,title:'Words of life',body:'Read John 6:60–69 in context.',reflection:'Pause and consider the response.',discussionQuestion:'Where do you turn for hope?',application:'Read with someone this week.',references:['John 6:68'],outboundPreview:'Words of life for the week.'}},content.etag);
    const route=`/studies?church=${church}&slot=${slot.id}&month=${day.slice(0,7)}`;
    await page.goto(route);await page.getByTestId(`date-card-${slot.id}`).click();
    await page.getByRole('button',{name:'Next: Gain Approval',exact:true}).click();
    await expect(page.getByLabel('Approver',{exact:true}).locator('option[value="admin"]')).toHaveCount(1);
    await page.getByLabel('Approver',{exact:true}).selectOption('admin');
    await page.getByTestId('content-submit').click();
    await expect.poll(async()=>(await(await page.request.get(prefix+`/content/${content.id}`)).json()).status).toBe('in_review');
    await admin.goto(route);await admin.getByTestId(`date-card-${slot.id}`).click();
    await expect(admin.getByTestId('content-approve')).toBeEnabled();
    await admin.getByTestId('content-approve').click();
    await expect.poll(async()=>(await(await page.request.get(prefix+`/content/${content.id}`)).json()).status).toBe('approved');
  }finally{await adminContext.close();}
});
