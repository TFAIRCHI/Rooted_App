import {test,expect,type Page,type BrowserContext} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import axe from 'axe-core';

const evidence='BuildPrompts/1.2.15/evidence';
mkdirSync(evidence,{recursive:true});
async function screenshot(page:Page,name:string){await page.screenshot({path:`${evidence}/${name}.png`,fullPage:true});}
async function login(page:Page,persona:string,returnTo?:string){
  const query=new URLSearchParams({persona,...(returnTo?{returnTo}:{})});
  await page.goto(`/api/v1/auth/login?${query}`);
  await page.waitForURL(url=>!url.pathname.startsWith('/api/'));
  expect((await page.request.get('/api/v1/auth/session')).status()).toBe(200);
}
async function command(context:BrowserContext,path:string,body:unknown,key=randomUUID()){
  const session=await(await context.request.get('/api/v1/auth/session')).json();
  return context.request.post(`/api/v1${path}`,{headers:{'X-CSRF-Token':session.csrfToken,'Idempotency-Key':key},data:body});
}
async function accessible(page:Page){
  await page.addScriptTag({content:axe.source});
  const issues=await page.evaluate(async()=>{
    const w=window as unknown as {axe:typeof axe};
    return (await w.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));
  });
  expect(issues).toEqual([]);
}

test('1.2.15 anonymous public pages match the design, work by keyboard and do not call AI',async({page})=>{
  test.setTimeout(180_000);const errors:string[]=[];const writes:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.url().includes('/api/v1/')&&(request.method()!=='GET'||/cowriter|workflow|azure/.test(request.url())))writes.push(request.url());});
  await page.setViewportSize({width:1440,height:900});await page.goto('/');
  await expect(page.getByRole('heading',{level:1})).toContainText('Let Sunday');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.getByRole('link',{name:'See how it works →'})).toHaveAttribute('href','/how-it-works');
  await screenshot(page,'home-desktop');await accessible(page);
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'AI Co-writer',exact:true}).click();
  await expect(page.getByText('Your church stays in charge.',{exact:true})).toBeVisible();
  await expect(page.getByText(/Confirm each day before saving its editable draft/)).toBeVisible();
  await page.locator('#example-co-writer').screenshot({path:evidence+'/ai-simple-desktop.png'});
  const notes=page.getByRole('button',{name:'With sermon notes',exact:true});await notes.focus();await page.keyboard.press('Space');
  await expect(notes).toHaveAttribute('aria-pressed','true');await expect(page.getByText(/Our sermon notes focus/)).toBeVisible();
  await page.locator('#example-co-writer').screenshot({path:evidence+'/ai-detailed-desktop.png'});
  await page.goto('/why-rooted');await page.getByRole('button',{name:'Before Sunday',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page.getByText('Pray & anticipate',{exact:true})).toBeVisible();await page.locator('#example-week').screenshot({path:evidence+'/before-sunday-desktop.png'});
  for(const width of [390,320]){await page.setViewportSize({width,height:844});await page.goto('/');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(width===390){await screenshot(page,'home-mobile');await page.goto('/ai-co-writer');await screenshot(page,'ai-mobile');}}
  for(const route of ['/get-started','/sign-in','/find-church','/sample-study']){
    await page.setViewportSize({width:1440,height:900});await page.goto(route);if(route==='/sign-in')await expect(page.locator('a[href^="/api/v1/auth/login?"]')).toHaveAttribute('href',/auth\/login/);
    await accessible(page);await screenshot(page,route.slice(1)+'-desktop');
    await page.setViewportSize({width:390,height:844});await screenshot(page,route.slice(1)+'-mobile');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.getByRole('button',{name:'Mark this moment of reflection ✓'}).click();await expect(page.getByRole('status')).toContainText('not saved');
  expect(errors).toEqual([]);expect(writes).toEqual([]);
  expect(await(await page.request.get('/robots.txt')).text()).toContain('Disallow: /');
  expect(await(await page.request.get('/sitemap.xml')).text()).not.toContain('/c/');
});

test('1.2.13 leader sign-in creates one persisted church after uncertain response and shows actual roles',async({page})=>{
  test.setTimeout(120_000);
  await page.goto('/get-started');await page.getByRole('link',{name:/I help lead a church/}).click();
  await expect(page).toHaveURL(/\/onboarding\?intent=create-church/);
  await expect(page.getByRole('heading',{name:'Set up your church.'})).toBeVisible();
  const slug=`test-${randomUUID().slice(0,12)}`;
  await page.getByLabel('Church name',{exact:true}).fill('New Rhythm Church');await page.getByLabel('Your church link').fill(slug);
  await page.getByLabel('Church IANA timezone').fill('Not/AZone');await page.getByLabel('I’m authorized').check();
  await page.getByRole('button',{name:'Continue to account setup →'}).click();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
  await expect(page.getByRole('heading',{name:'Continue church setup.'})).toBeVisible();
  await expect(page.locator('a[href^="/api/v1/auth/login?"]')).toHaveAttribute('href',/persona=/);
  await page.getByLabel('Local development identity').selectOption('morgan.admin');
  await page.locator('a[href^="/api/v1/auth/login?"]').click();await expect(page).toHaveURL(/\/onboarding\?intent=create-church/);
  await expect(page.getByLabel('Church name',{exact:true})).toHaveValue('New Rhythm Church');
  await expect(page.getByLabel('Your church link')).toHaveValue(slug);
  await expect(page.getByLabel('Church IANA timezone')).toHaveValue('Not/AZone');
  await page.getByLabel('I’m authorized').check();
  await page.getByRole('button',{name:'Create church workspace',exact:true}).click();await expect(page.locator('main').getByRole('alert')).toContainText('valid IANA timezone');
  await page.getByLabel('Church IANA timezone').fill('America/New_York');await screenshot(page,'church-setup-desktop');await accessible(page);
  await page.setViewportSize({width:390,height:844});await screenshot(page,'church-setup-mobile');await page.setViewportSize({width:1440,height:1000});
  let first=true;const keys:string[]=[];const ids:string[]=[];
  await page.route('**/api/v1/churches',async route=>{if(route.request().method()!=='POST'){await route.continue();return;}keys.push(route.request().headers()['idempotency-key']);const response=await route.fetch();ids.push((await response.json()).id);if(first){first=false;await route.abort();}else await route.fulfill({response});});
  await page.getByRole('button',{name:'Create church workspace',exact:true}).click();await expect(page.locator('main').getByRole('alert')).toBeVisible();
  await page.getByRole('button',{name:'Create church workspace',exact:true}).click();await expect(page).toHaveURL(/\/onboarding\/complete\?church=/);
  await expect(page.getByRole('heading',{level:1})).toContainText('New Rhythm Church');expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);expect(ids[0]).toBe(ids[1]);
  const session=await(await page.request.get('/api/v1/auth/session')).json();const church=session.churches.find((c:{slug:string})=>c.slug===slug);
  expect(session.churches.filter((c:{slug:string})=>c.slug===slug)).toHaveLength(1);
  // Accepted admin-review release grants review/publication without authoring or AI.
  for(const grant of ['ai:use','plans:edit','content:edit'])expect(church.capabilities).not.toContain(grant);
  for(const grant of ['workspace:read','memberships:manage','plans:approve','content:approve','publication:schedule'])expect(church.capabilities).toContain(grant);
  await expect(page.getByRole('link',{name:'Create a study →',exact:true})).toHaveCount(0);await expect(page.getByRole('link',{name:'Invite your team →'})).toBeVisible();
  await screenshot(page,'first-steps-desktop');await accessible(page);await page.setViewportSize({width:390,height:844});await screenshot(page,'first-steps-mobile');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.reload();await expect(page.getByRole('heading',{level:1})).toContainText('New Rhythm Church');
  await page.goto('/onboarding/complete?church=00000000-0000-4000-8000-000000000000');await expect(page.getByRole('heading',{name:'Church access isn’t available.'})).toBeVisible();
});

test('1.2.13 member entry rejects external links and accepts only an identity-bound invitation',async({browser,page})=>{
  await page.goto('/find-church');await page.getByLabel('Church link or slug').fill('https://evil.example/c/grace');await page.getByRole('button',{name:'Open church link →'}).click();await expect(page.locator('main').getByRole('alert')).toContainText('public Rooted link');
  await login(page,'morgan.admin');const created=await command(page.context(),'/churches',{name:'Invitation Test Church',slug:`invite-${randomUUID().slice(0,12)}`,timeZone:'America/New_York'});expect(created.status()).toBe(201);const church=await created.json();
  const invited=await command(page.context(),`/churches/${church.id}/invitations`,{targetSubject:'riley.member',role:'member',reason:'Explicit test invitation'});expect(invited.status()).toBe(201);const token=(await invited.json()).token;
  const other=await browser.newContext();const wrong=await other.newPage();await login(wrong,'anna.contributor');expect((await command(other,'/invitations/accept',{token})).status()).toBe(404);await other.close();
  const member=await browser.newContext();const memberPage=await member.newPage();await login(memberPage,'riley.member','/onboarding?intent=join');
  await memberPage.getByLabel('Invitation token').fill(token);await memberPage.getByRole('button',{name:'Accept invitation',exact:true}).click();await expect(memberPage).toHaveURL(/\/onboarding\/complete/);
  await expect(memberPage.getByRole('link',{name:'Open church workspace →'})).toHaveCount(0);await expect(memberPage.getByRole('link',{name:'Open your church experience →'})).toHaveAttribute('href',`/c/${church.slug}`);
  expect((await command(member,'/invitations/accept',{token})).status()).toBe(404);await member.close();
});

test('1.2.13 identity continuation rejects external targets, survives callback and cannot be replayed',async({page})=>{
  for(const target of ['https://evil.example','//evil.example','/onboarding?intent=admin','/%2f%2fevil.example'])expect((await page.request.get(`/api/v1/auth/login?returnTo=${encodeURIComponent(target)}`,{maxRedirects:0})).status()).toBe(422);
  expect((await page.request.get('/api/v1/auth/callback?code=fake&state=fake',{maxRedirects:0})).status()).toBe(401);
  const callbacks:string[]=[];page.on('request',r=>{if(r.url().includes('/auth/callback?'))callbacks.push(r.url());});
  await login(page,'morgan.admin','/onboarding?intent=create-church');await expect(page).toHaveURL(/intent=create-church/);expect(callbacks).toHaveLength(1);
  expect((await page.request.get(callbacks[0],{maxRedirects:0})).status()).toBe(401);
  const response=await page.request.get('/c/grace');expect(response.headers()['cache-control']).toContain('no-store');expect(response.headers()['x-robots-tag']).toContain('noindex');
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL('/');expect((await page.request.get('/api/v1/auth/session')).status()).toBe(401);
});

test('public church reading needs no sign-in while workspace still does',async({page})=>{
  await page.goto('/c/grace');
  await expect(page.getByRole('heading',{name:'Make room for what matters.'})).toBeVisible();
  expect((await page.request.get('/api/v1/auth/session')).status()).toBe(401);
  await page.goto('/dashboard');await expect(page.locator('a[href^="/api/v1/auth/login?"]')).toHaveAttribute('href',/returnTo=%2Fdashboard/);
});
