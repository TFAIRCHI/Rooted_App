// Research-only offline validation against existing source and installed sharp.
import assert from 'node:assert/strict';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { validateSourceUrl, isPublicAddress } from '../../../backend/src/integrations/ingestion.ts';
const out = fileURLToPath(new URL('./engineering-rerun-20261101/', import.meta.url));
await mkdir(out,{recursive:true});
const results: string[]=[];
const check=(name:string,condition:boolean)=>{assert.ok(condition,name);results.push(name)};
const publicResolver=async()=>[{address:'8.8.8.8',family:4}];
for(const url of ['http://sermon.example/a','https://name:secret@sermon.example/a','https://sermon.example:444/a','https://sermon.example.evil/a','https://sermon.example/a#f','https://2130706433/a','https://0x7f000001/a']){
  await assert.rejects(validateSourceUrl(url,['sermon.example','127.0.0.1'],publicResolver));results.push('reject '+url.replace('name:secret@','credentials@'));
}
await assert.rejects(validateSourceUrl('https://sermon.example/a',['sermon.example'],async()=>[{address:'8.8.8.8',family:4},{address:'169.254.169.254',family:4}]));results.push('reject mixed public/private DNS');
for(const address of ['127.0.0.1','10.0.0.1','169.254.169.254','100.64.0.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1'])check('deny '+address,!isPublicAddress(address));
check('accept allowlisted public resolution',(await validateSourceUrl('https://sermon.example/a',['sermon.example'],publicResolver)).addresses[0].address==='8.8.8.8');
const frames=[['Pause and notice','What brought you hope this week?'],['Reflect together','Where could you practice patient care?'],['Take one next step','Offer encouragement to someone today.']];
const hashes=[];
for(let i=0;i<frames.length;i++){
  const [title,body]=frames[i];
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="1080" height="1350" fill="#f5f0e7"/><rect x="70" y="70" width="940" height="1210" rx="24" fill="#204c45"/><text x="140" y="185" font-family="Arial" font-size="30" fill="#ede4cf">SYNTHETIC RESEARCH CHURCH</text><text x="140" y="455" font-family="Arial" font-size="55" fill="white">${title}</text><text x="140" y="555" font-family="Arial" font-size="32" fill="#ede4cf">${body}</text><text x="140" y="1130" font-family="Arial" font-size="28" fill="white">Research export · ${i+1} of 3</text><text x="140" y="1190" font-family="Arial" font-size="22" fill="#ede4cf">Synthetic text. No Scripture quotation. No real church.</text></svg>`;
  const file=out+`synthetic-deck-${i+1}.png`;
  await sharp(Buffer.from(svg)).png().toFile(file);
  const meta=await sharp(file).metadata();check(`deck slide ${i+1} PNG dimensions`,meta.width===1080&&meta.height===1350&&meta.format==='png');
  hashes.push(createHash('sha256').update(await readFile(file)).digest('hex'));
}
check('slides differ',new Set(hashes).size===3);
await writeFile(out+'engineering-runtime-results.json',JSON.stringify({scope:'Offline synthetic URL validation against current source; sharp PNG export only',checksPassed:results.length,checks:results,deckHashes:hashes,limits:['No external DNS/network or browser share invocation','Rendering does not prove text wrapping, font embedding, brand policy or social acceptance','No live image/video provider, SMS or Planning Center API tested']},null,2));
console.log(JSON.stringify({checksPassed:results.length,result:'engineering-runtime-results.json'}));
