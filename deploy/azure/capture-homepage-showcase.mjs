// Run against backend/scripts/e2e-stack.mjs ONLY. No production access or provider calls.
import {chromium} from 'playwright';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import sharp from 'sharp';

const origin='http://127.0.0.1:3002';
const church='10000000-0000-4000-8000-000000000001';
const base=`${origin}/api/v1/churches/${church}`;
const browser=await chromium.launch({channel:'msedge',headless:true});
async function actor(persona){const context=await browser.newContext({viewport:{width:1360,height:960}});const page=await context.newPage();await page.goto(`${origin}/api/v1/auth/login?persona=${persona}`);await page.waitForURL(u=>u.origin===origin&&!u.pathname.startsWith('/api/'));const r=await context.request.get(`${origin}/api/v1/auth/session`);if(r.status()!==200)throw new Error('Local fixture login failed');return {context,page,session:await r.json()};}
async function command(actor,route,data,etag){const response=await actor.context.request.post(base+route,{headers:{'X-CSRF-Token':actor.session.csrfToken,'Idempotency-Key':randomUUID(),...(etag?{'If-Match':etag}:{})},data});if(!response.ok())throw new Error(`Local fixture ${route}: ${response.status()} ${await response.text()}`);return response.json();}
async function get(actor,route){return (await actor.context.request.get(base+route)).json();}
async function capture(page,route,name){await page.goto(origin+route);await page.waitForLoadState('networkidle');await page.locator('main').waitFor();await page.evaluate(()=>document.fonts.ready);await page.addStyleTag({content:'nextjs-portal{display:none!important}'});if(name==='member-study')await page.evaluate(()=>window.scrollTo(0,550));const png=await page.screenshot({animations:'disabled'});await sharp(png).webp({quality:90}).toFile(`frontend/public/showcase/${name}.webp`);console.log(`Captured ${name}: ${new URL(page.url()).pathname}`);}
try{
  // The isolated test-only endpoint proves the fixture server is active before writes.
  const check=await fetch('http://127.0.0.1:4102/v1/__test/clock',{method:'POST',headers:{'content-type':'application/json','x-test-clock-token':'gather-browser-clock-local-fixture-only-111'},body:JSON.stringify({now:new Date().toISOString()})});
  if(!check.ok)throw new Error('Refusing capture without the isolated local fixture server');
  const staff=await actor('contributor');const reviewer=await actor('james.contributor');
  const day=new Date().toISOString().slice(0,10);
  const series=await command(staff,'/series',{title:'Words of eternal life',weekAnchor:day,timeZone:'America/New_York',sermonIds:[]});
  const slot=await command(staff,`/series/${series.id}/slots`,{localDate:day,localTime:'08:00',timeZone:'America/New_York',assigneeIds:['contributor']});
  let plan=await get(staff,`/plans/${slot.planId}`);
  plan=await command(staff,`/plans/${plan.id}/revisions`,{baseRevisionId:plan.headRevisionId,payload:{schemaVersion:1,title:'Words of eternal life',primaryScripture:{reference:'John 6:68',translation:null},learningObjective:'Bring our questions to Jesus and consider Peter’s response.',outline:['Read John 6:60–69 in context','Reflect on where we turn for hope'],discussionQuestion:'Where do you turn when faith feels difficult?',notes:'Fictional demonstration content prepared for the Rooted showcase.',extensions:[]}},plan.etag);
  let content=await command(staff,`/plans/${plan.id}/content`,{mode:'manual'},plan.etag);
  content=await command(staff,`/content/${content.id}/revisions`,{baseRevisionId:content.headRevisionId,payload:{schemaVersion:1,title:'Words of eternal life',body:'Read John 6:60–69. When others turn away, Jesus asks his disciples whether they also want to leave. Peter responds by pointing to the words of life he has found in Jesus. Make room today to sit with that question and response.',reflection:'Faith can include honest questions. Pause, read the passage again, and notice what draws your attention.',discussionQuestion:'Where do you turn when faith feels difficult?',application:'Carry one question into prayer today. Make time this week to read the passage with someone you trust.',references:['John 6:68'],outboundPreview:'A little time in the Word. A shared direction for the week.'}},content.etag);
  await command(staff,`/content/${content.id}/submit`,{revisionId:content.headRevisionId,approverId:'james.contributor',note:'Review this fictional demonstration study.'},content.etag);
  content=await get(reviewer,`/content/${content.id}`);
  await command(reviewer,`/content/${content.id}/decisions`,{revisionId:content.headRevisionId,expectedHash:content.head.hash,decision:'approve',reason:'Reviewed fictional demonstration content.'},content.etag);
  content=await get(reviewer,`/content/${content.id}`);
  await command(reviewer,`/content/${content.id}/publish`,{revisionId:content.headRevisionId,approvalId:content.approvalId},content.etag);
  content=await get(staff,`/content/${content.id}`);
  const member=await actor('member');await mkdir('frontend/public/showcase',{recursive:true});
  await capture(member.page,'/c/grace','member-home');
  await capture(member.page,`/c/grace/studies/${content.livePublicationId}`,'member-study');
  await capture(staff.page,`/dashboard?church=${church}`,'team-dashboard');
  await capture(staff.page,`/studies?church=${church}&slot=${slot.id}`,'team-editor');
  await staff.page.goto(`${origin}/calendar?church=${church}`);await staff.page.waitForLoadState('networkidle');
  await staff.page.getByRole('button',{name:'List view',exact:true}).click();await staff.page.addStyleTag({content:'nextjs-portal{display:none!important}'});
  await sharp(await staff.page.screenshot({animations:'disabled'})).webp({quality:90}).toFile('frontend/public/showcase/team-calendar.webp');
}finally{await browser.close();}
