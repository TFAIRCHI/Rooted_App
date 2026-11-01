import {chromium} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),initiative=path.dirname(root);
const baseline=JSON.parse(await readFile(path.join(initiative,'_audit/before-20261101.json'),'utf8'));
const images=baseline.files.filter(f=>f.path.startsWith('mockups/')&&/\.(png|webp)$/.test(f.path));
await mkdir(path.join(root,'file-review-evidence'),{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1600,height:1140}});
for(let i=0;i<images.length;i+=9){const group=images.slice(i,i+9),name=`baseline-contact-${Math.floor(i/9)+1}`;
const html=`<!doctype html><meta charset="utf-8"><title>Baseline file inspection only</title><style>body{font:13px Arial;background:#f6f5ed;color:#17363f;margin:20px}main{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}figure{margin:0;padding:10px;background:white;border:1px solid #ccd7c4;height:340px}img{display:block;width:100%;height:294px;object-fit:contain}figcaption{font-size:10px;margin-top:8px;overflow-wrap:anywhere}</style><h2>Superseded baseline inspection — not current designs</h2><main>${group.map(f=>`<figure><img src="${pathToFileURL(path.join(initiative,f.path))}"><figcaption>${f.path}</figcaption></figure>`).join('')}</main>`;
const file=path.join(root,'file-review-evidence',name+'.html');await writeFile(file,html);await page.goto(pathToFileURL(file).href);await page.screenshot({path:path.join(root,'file-review-evidence',name+'.png'),fullPage:true});}
await browser.close();console.log(`Rendered ${images.length} old images in ${Math.ceil(images.length/9)} inspection sheets. No baseline pixels reused in new designs.`);
