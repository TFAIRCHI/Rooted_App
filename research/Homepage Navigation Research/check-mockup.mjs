import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir,readdir,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const capture=path.join(root,'screenshots');
await mkdir(capture,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage();
const files=(await readdir(path.join(root,'mockup'))).filter(x=>x.endsWith('.html'));
const results=[];
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
const axe=await readFile(path.resolve('node_modules/axe-core/axe.min.js'),'utf8');
const sizes=[['desktop',1440,900],['laptop',1366,768],['compact',1280,800],['tablet',1024,768],['narrow-tablet',800,900],['mobile',390,844],['small-mobile',320,568],['reflow',640,900]];
for(const [size,width,height] of sizes){
  await page.setViewportSize({width,height});
  for(const file of files){
    await page.goto(`http://127.0.0.1:3090/${file}`);
    const measures=await page.evaluate(()=>({title:document.title,h1s:document.querySelectorAll('h1').length,height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,viewport:innerWidth,brokenImages:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).length,main:document.querySelector('main').getBoundingClientRect().toJSON()}));
    const result={size,file,...measures,screenLengths:Number((measures.height/height).toFixed(2)),horizontalOverflow:measures.width>width};
    if(size==='desktop'||size==='mobile'){
      await page.addScriptTag({content:axe});
      const audit=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>n.target)}))});
      result.accessibilityViolations=audit;
      await page.screenshot({path:path.join(capture,`${file.replace('.html','')}-${size}.png`),fullPage:true});
    }
    results.push(result);
  }
}
// Check actual links, route changes, history, disclosure controls, and keyboard behavior.
const interactions=[];
const check=(name,passed)=>{interactions.push({name,passed});if(!passed)throw Error(name)};
await page.setViewportSize({width:1440,height:900});
await page.goto('http://127.0.0.1:3090/index.html');
const localLinks=new Set();
for(const file of files){await page.goto(`http://127.0.0.1:3090/${file}`);for(const href of await page.locator('a').evaluateAll(as=>as.map(a=>a.getAttribute('href')))){if(href&&!href.startsWith('http')&&!href.startsWith('#'))localLinks.add(href)}}
for(const href of localLinks)await access(path.join(root,'mockup',href));
check('Every local link resolves to an artifact',true);
await page.goto('http://127.0.0.1:3090/index.html');
await page.locator('nav a[href="why-rooted.html"]').click();
check('Main navigation changes URL and current page',page.url().endsWith('why-rooted.html')&&await page.locator('nav [aria-current="page"]').innerText()==='Why Rooted');
await page.goBack();check('Browser Back returns Home',page.url().endsWith('index.html'));
await page.goForward();check('Browser Forward restores topic',page.url().endsWith('why-rooted.html'));
await page.getByRole('button',{name:'Before Sunday',exact:true}).click();check('Weekly example switches content',await page.locator('#rhythm-content').innerText().then(t=>t.includes('Pray & anticipate')));
await page.goto('http://127.0.0.1:3090/how-it-works.html');
await page.getByRole('button',{name:'For your team',exact:true}).click();await page.getByRole('button',{name:'03 Plan the week',exact:true}).click();
check('Product tour reaches team calendar',await page.locator('#tour-image').getAttribute('src')==='assets/team-calendar.webp');
await page.goto('http://127.0.0.1:3090/ai-co-writer.html');await page.getByRole('button',{name:'With sermon notes',exact:true}).click();check('AI example switches without a live request',await page.locator('#chat-content').innerText().then(t=>t.includes('Our sermon notes')));
await page.goto('http://127.0.0.1:3090/questions.html');await page.locator('summary').first().click();check('FAQ expands',await page.locator('details').first().getAttribute('open')!==null);
await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:3090/index.html');
const menu=page.locator('.menu-toggle');check('Closed mobile navigation hides links',!await page.locator('nav a').first().isVisible());await menu.click();check('Mobile menu exposes all pages and account actions',await page.locator('nav a:visible').count()===8);await page.keyboard.press('Escape');check('Escape closes menu and returns focus',await menu.getAttribute('aria-expanded')==='false'&&await menu.evaluate(el=>el===document.activeElement));
await page.reload();await page.keyboard.press('Tab');check('Skip link is first keyboard stop',await page.locator('.skip').evaluate(el=>el===document.activeElement));await page.keyboard.press('Enter');check('Skip link focuses main content',await page.locator('main').evaluate(el=>el===document.activeElement));
await browser.close();
const report={checkedAt:new Date().toISOString(),scope:'Local research prototype only',viewports:sizes,results,interactions,scriptErrors:errors};
await writeFile(path.join(root,'validation.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({pages:files.length,layouts:results.length,overflows:results.filter(x=>x.horizontalOverflow),a11y:results.filter(x=>x.accessibilityViolations?.length).map(x=>({file:x.file,size:x.size,violations:x.accessibilityViolations})),desktopHeights:results.filter(x=>x.size==='laptop').map(x=>({file:x.file,height:x.height,screenLengths:x.screenLengths})),mobileHeights:results.filter(x=>x.size==='mobile').map(x=>({file:x.file,height:x.height,screenLengths:x.screenLengths})),interactions,errors},null,2));
