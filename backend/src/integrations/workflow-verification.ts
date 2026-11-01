import { mkdir, open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IntegrationError } from './errors.js';

interface Entry {id:string;at:string;kind:string;reservation:number;charged:number;status:string;responseId?:string;model?:string;usage?:{inputTokens:number;outputTokens:number};httpStatus?:number}
interface Ledger {version:'1.2.12';maxAttempts:number;maxTokens:number;requests:Entry[]}
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,here.includes(`${process.platform==='win32'?'\\':'/'}dist${process.platform==='win32'?'\\':'/'}`)?'../../../..':'../../..');
const directory=resolve(root,'BuildPrompts/1.2.12/evidence'),filename=resolve(directory,'live-verification.json'),lock=filename+'.lock';
async function change<T>(action:(ledger:Ledger)=>T):Promise<T>{
  await mkdir(directory,{recursive:true});let handle;
  try{handle=await open(lock,'wx');}catch{throw new IntegrationError('VERIFICATION_LOCK','Another verification submission is active. No inference was sent.',409);}
  try{let ledger:Ledger;try{ledger=JSON.parse(await readFile(filename,'utf8'));}catch(error){if((error as {code?:string}).code!=='ENOENT')throw new Error('Verification ledger cannot be read safely; no inference was sent',{cause:error});ledger={version:'1.2.12',maxAttempts:10,maxTokens:150000,requests:[]};}
    if(ledger.version!=='1.2.12'||ledger.maxAttempts!==10||ledger.maxTokens!==150000)throw new Error('Verification ledger does not match authorized limits');
    const result=action(ledger);const temporary=filename+'.tmp';await writeFile(temporary,JSON.stringify(ledger,null,2)+'\n');await rename(temporary,filename);return result;
  }finally{await handle.close();await unlink(lock);}
}
export const verificationFetch:typeof fetch=async(url,init)=>{
  const body=JSON.parse(init!.body as string);const reservation=12000+Number(body.max_output_tokens);
  const id=globalThis.crypto.randomUUID();
  await change(ledger=>{if(ledger.requests.length>=10||ledger.requests.reduce((sum,item)=>sum+item.charged,0)+reservation>150000)throw new IntegrationError('VERIFICATION_LIMIT','The authorized live-verification allowance is exhausted; no inference was sent.',422);ledger.requests.push({id,at:new Date().toISOString(),kind:body.text?.format?.name??'unknown',reservation,charged:reservation,status:'submission_unknown'});});
  const response=await globalThis.fetch(url,init);
  const safe:{responseId?:string;model?:string;usage?:{inputTokens:number;outputTokens:number};status:string}={status:response.ok?'response_received':'provider_error'};
  try{const data=await response.clone().json();if(typeof data.id==='string')safe.responseId=data.id;if(typeof data.model==='string')safe.model=data.model;if(typeof data.status==='string')safe.status=data.status;const input=data.usage?.input_tokens,output=data.usage?.output_tokens;if(Number.isSafeInteger(input)&&Number.isSafeInteger(output)&&input>=0&&input<=12000&&output>=0&&output<=Number(body.max_output_tokens))safe.usage={inputTokens:input,outputTokens:output};}catch{/* Ambiguous usage retains its conservative reservation. */}
  await change(ledger=>{const entry=ledger.requests.find(item=>item.id===id)!;Object.assign(entry,safe,{httpStatus:response.status});if(safe.usage)entry.charged=safe.usage.inputTokens+safe.usage.outputTokens;});
  return response;
};
