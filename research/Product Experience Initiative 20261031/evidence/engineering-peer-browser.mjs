// Read-only research concept review. No application/provider actions.
// Superseded November 1: old split-task selectors do not validate unified authoring.
if(!process.argv.includes('--legacy-20261031')) throw new Error('Retired storyboard helper. Use only with --legacy-20261031 for historical investigation; no rebuilt-UX validity.');
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const origin='http://127.0.0.1:3091';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const checks=[],external=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===origin)return r.continue();external.push(u.origin);return r.abort()});
const check=(name,pass,detail)=>checks.push({name,pass,detail});
const visit=async(query)=>page.goto(origin+'/?'+query);
try {
 await visit('view=deck&state=approval');
 const approval=await page.locator('.approval-gate').innerText();
 check('Deck review pins prior approved r10 rather than current draft r12',approval.includes('approved study r10')&&approval.includes('not the current draft r12'),approval);
 await page.locator('[data-action="approve-deck"]').click();
 check('Deck approval result includes rendition, approved source, caption and destination',await page.locator('#deck-result').innerText().then(t=>t.includes('deck v2, approved study r10')&&t.includes('caption + destination')));
 await visit('view=deck&state=stale');
 check('Stale rendition has no approval action',await page.locator('[data-action="approve-deck"]').count()===0);
 await visit('view=share');
 check('Member public deck refers to approved r10',await page.locator('.pill').innerText().then(t=>t.includes('approved study r10')));
 check('Member sharing starts disabled',await page.locator('[data-action="share-deck"]').isDisabled());
 await visit('view=sources&source=excel');
 check('Unconfirmed source is not available to include',await page.locator('[data-action="include-source"]').isDisabled());
 const source=await page.locator('main').innerText();
 check('Excel saved/absent formulas and hidden-sheet boundaries visible',source.includes('no saved result')&&source.includes('may be stale')&&source.includes('hidden sheets excluded'));
 await visit('view=studio');
 await page.locator('[data-action="move-up"]').click();
 const order=await page.locator('.block-items [data-block]').evaluateAll(es=>es.map(e=>Number(e.dataset.block)));
 check('Studio tree moves diagram before Scripture',order.indexOf(2)<order.indexOf(1),order);
 await page.getByRole('link',{name:'Immersive preview ↗',exact:true}).click();
 await page.locator('.full-preview').waitFor();
 const previewOrder=await page.evaluate(()=>{const root=document.querySelector('.full-preview');const all=[...root.querySelectorAll('*')];return {diagram:all.indexOf(root.querySelector('svg.diagram')),scripture:all.findIndex(e=>e.textContent.startsWith('Read John 15:1–8 in your Bible.'))}});
 check('Immersive DOM follows moved diagram before Scripture',previewOrder.diagram>=0&&previewOrder.scripture>=0&&previewOrder.diagram<previewOrder.scripture,previewOrder);
 const previewBlocks=await page.locator('[data-reading-block]').evaluateAll(es=>es.map(e=>Number(e.dataset.readingBlock)));
 check('All six immersive blocks match Studio order',JSON.stringify(previewBlocks)===JSON.stringify(order),previewBlocks);
 await visit('view=reader');
 const readerOrder=await page.evaluate(()=>{const root=document.querySelector('.phone-main');const all=[...root.querySelectorAll('*')];return {diagram:all.indexOf(root.querySelector('svg.diagram')),scripture:all.findIndex(e=>e.textContent.startsWith('Read John 15:1–8 in your Bible.'))}});
 check('Member concept DOM follows moved diagram before Scripture',readerOrder.diagram>=0&&readerOrder.scripture>=0&&readerOrder.diagram<readerOrder.scripture,readerOrder);
 const readerBlocks=await page.locator('[data-reading-block]').evaluateAll(es=>es.map(e=>Number(e.dataset.readingBlock)));
 check('All six member rendition preview blocks match Studio order',JSON.stringify(readerBlocks)===JSON.stringify(order),readerBlocks);
 await visit('view=phone&state=ambiguity');
 await page.locator('[data-choose-church="north"]').click();
 await page.locator('[data-phone-state="ready"]').click();
 await page.locator('[data-phone-state="verify"]').click();
 check('Verification retains selected church',await page.locator('.church-context').innerText().then(t=>t.includes('Salem')));
 await page.locator('[data-phone-state="name"]').click();
 await page.locator('[data-phone-state="conflict"]').click();
 check('Conflict explicitly forbids name bypass or merge',await page.locator('main').innerText().then(t=>t.includes('name change cannot bypass')&&t.includes('won’t open or merge')));
 await page.locator('[data-phone-state="ready"]').click();
 check('Conflict return retains selected church',await page.locator('.church-context').innerText().then(t=>t.includes('Salem')));
} finally {
 await browser.close();
 const result={scope:'Standalone browser checks of research concept only; no current application/auth/provider proof',createdAt:new Date().toISOString(),checks,externalRequestsAttempted:external,errors};
 await writeFile(new URL('engineering-peer-browser.json',import.meta.url),JSON.stringify(result,null,2));
 console.log(JSON.stringify({checks:checks.length,failures:checks.filter(x=>!x.pass),errors,externalRequestsAttempted:external}));
}
