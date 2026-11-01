import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1366,height:768}});const results=[];
for(const task of ['sources','studio','review']){
 await page.goto(`http://127.0.0.1:3091/?view=${task}`);
 const controls=page.locator('main a:visible,main button:visible:not(:disabled),main input:visible,main textarea:visible,main summary:visible');
 for(let i=0;i<await controls.count();i++){
  const control=controls.nth(i);await control.focus();
  results.push(await control.evaluate((e,task)=>{const r=e.getBoundingClientRect(),rail=document.querySelector('.task-actions')?.getBoundingClientRect();return{task,name:(e.getAttribute('aria-label')||e.textContent||e.getAttribute('id')||e.tagName).trim().slice(0,75),top:Math.round(r.top),bottom:Math.round(r.bottom),railTop:Math.round(rail?.top||innerHeight),notObscured:r.top>=0&&(e.closest('.task-actions')?r.bottom<=innerHeight:r.bottom<=(rail?.top||innerHeight))}},task));
 }
}
await browser.close();await writeFile(new URL('./keyboard-focus-validation.json',import.meta.url),JSON.stringify({results,failures:results.filter(r=>!r.notObscured)},null,2));console.log(JSON.stringify({controls:results.length,failures:results.filter(r=>!r.notObscured)},null,2));
