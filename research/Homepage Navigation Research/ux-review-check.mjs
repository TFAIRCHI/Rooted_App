import {chromium} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
const base='http://127.0.0.1:3090/';
const out='research/Homepage Navigation Research';
await mkdir(`${out}/screenshots/ux-review`,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage();
const layouts=[];
for(const [width,height] of [[1440,900],[1366,768],[1101,768],[1100,768],[1024,768],[800,900],[390,844],[320,568]]){
 await page.setViewportSize({width,height});
 for(const file of ['index','why-rooted','how-it-works','ai-co-writer','power-of-four','questions']){
  await page.goto(`${base}${file}.html`);
  layouts.push(await page.evaluate(({width,height,file})=>{
   const box=e=>{const b=e.getBoundingClientRect();return {top:Math.round(b.top),bottom:Math.round(b.bottom),left:Math.round(b.left),right:Math.round(b.right)}};
   return {width,height,file,scrollHeight:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth,menu:getComputedStyle(document.querySelector('.menu-toggle')).display!=='none',h1:box(document.querySelector('h1')),firstAction:box([...document.querySelectorAll('main a,main button')].find(e=>e.getClientRects().length)||document.querySelector('h1'))};
  },{width,height,file}));
  if((width===1366||width===320)&&['index','why-rooted','ai-co-writer','power-of-four'].includes(file))await page.screenshot({path:`${out}/screenshots/ux-review/${file}-${width}.png`,fullPage:false});
 }
}
const interactions=[];
const note=(name,pass,detail='')=>interactions.push({name,pass,detail});
await page.setViewportSize({width:800,height:900});await page.goto(`${base}power-of-four.html`);
await page.getByRole('button',{name:/The Power of 4/}).click();
note('800px expanded menu exposes all eight destinations',await page.locator('nav a:visible').count()===8);
await page.keyboard.press('Tab');note('Disclosure proceeds into visible navigation',await page.locator('nav a').first().evaluate(e=>e===document.activeElement));
await page.keyboard.press('Escape');note('Escape closes disclosure and restores toggle',await page.locator('.menu-toggle').evaluate(e=>e===document.activeElement&&e.getAttribute('aria-expanded')==='false'));
await page.setViewportSize({width:320,height:568});await page.goto(`${base}power-of-four.html`);await page.locator('.menu-toggle').click();await page.screenshot({path:`${out}/screenshots/ux-review/menu-320.png`});
note('320px menu links fit inside viewport width',await page.locator('nav a').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})));
await page.locator('nav a[href="ai-co-writer.html"]').click();note('Navigation updates route and selected page',page.url().endsWith('ai-co-writer.html')&&await page.locator('nav [aria-current]').innerText()==='AI Co-writer');
await page.goBack();note('Back restores source URL',page.url().endsWith('power-of-four.html'));await page.goForward();note('Forward restores target URL',page.url().endsWith('ai-co-writer.html'));
await page.getByRole('button',{name:'With sermon notes',exact:true}).focus();await page.keyboard.press('Space');note('Keyboard switches AI example',await page.locator('#chat-content').innerText().then(t=>t.includes('Our sermon notes')));
await page.goto(`${base}why-rooted.html`);await page.getByRole('button',{name:'Before Sunday',exact:true}).focus();await page.keyboard.press('Enter');note('Keyboard switches week',await page.locator('#rhythm-content').innerText().then(t=>t.includes('Pray & anticipate')));
await page.goto(`${base}how-it-works.html`);await page.getByRole('button',{name:'For your team',exact:true}).click();await page.getByRole('button',{name:'03 Plan the week',exact:true}).click();note('Team calendar reachable',await page.locator('#tour-image').getAttribute('src')==='assets/team-calendar.webp');
await page.goto(`${base}index.html`);await page.keyboard.press('Tab');await page.keyboard.press('Enter');note('Skip link moves focus to main',await page.locator('main').evaluate(e=>e===document.activeElement));
for(const width of [1440,390,320]){
 await page.setViewportSize({width,height:width===320?568:900});
 for(const file of ['sign-in','get-started']){
  await page.goto(`${base}${file}.html`);
  if(width<1101)await page.locator('.menu-toggle').click();
  note(`${width}px ${file} account destination exposes current page`,await page.locator(`a[aria-current="page"][href="${file}.html"]:visible`).count()===1);
 }
}
for(const [file,target] of [['why-rooted','example-week'],['ai-co-writer','example-co-writer']]){
 await page.setViewportSize({width:320,height:568});await page.goto(`${base}${file}.html`);
 await page.locator('.page-shortcut').click();
 note(`${file} mobile shortcut exposes target below header`,await page.locator(`#${target}`).evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=document.querySelector('header').getBoundingClientRect().bottom&&r.top<innerHeight}));
 note(`${file} mobile shortcut moves focus to target`,await page.locator(`#${target}`).evaluate(e=>e===document.activeElement));
 await page.screenshot({path:`${out}/screenshots/ux-review/${file}-320-jump.png`});
}
await page.goto(`${base}why-rooted.html`);await page.locator('.difference-details summary').click();note('Four differentiation points remain discoverable',await page.locator('.difference-content p').count()===4&&await page.locator('.difference-content').isVisible());
await page.goto(`${base}ai-co-writer.html`);await page.locator('.context-details summary').click();note('Scoped context and agreement detail remains discoverable',await page.locator('.context-details p').innerText().then(t=>t.includes('account and church')&&t.includes('audience')));
await browser.close();
await writeFile(`${out}/ux-review-validation.json`,JSON.stringify({layouts,interactions},null,2));
console.log(JSON.stringify({layouts,interactions},null,2));
