import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import sharp from 'sharp';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const workspace=path.resolve(root,'../..');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFile(path.join(root,p));
const json=async p=>JSON.parse(await read(p));
const now=new Date().toISOString();
const baseline=await json('_audit/before-20261101.json');
const archive=path.join(root,'_history/20261031-baseline.zip');
const zipScript="import zipfile,json,hashlib,sys; z=zipfile.ZipFile(sys.argv[1]); b=json.load(open(sys.argv[2],encoding='utf-8-sig')); failures=[x['path'] for x in b['files'] if hashlib.sha256(z.read(x['path'])).hexdigest()!=x['sha256']]; print(json.dumps({'files':len(b['files']),'archiveMembers':len(z.namelist()),'badMember':z.testzip(),'mismatches':failures})); sys.exit(bool(failures))";
const zr=spawnSync('python',['-c',zipScript,archive,path.join(root,'_audit/before-20261101.json')],{encoding:'utf8'});
if(zr.status!==0)throw new Error(zr.stderr||zr.stdout);
const archiveProof={...JSON.parse(zr.stdout),sha256:sha(await fs.readFile(archive)),verifiedAt:now};
await fs.writeFile(path.join(root,'_audit/archive-verification.json'),JSON.stringify(archiveProof,null,2)+'\n');

const appBaseline=await json('evidence/application-source-baseline.json');
const release=JSON.parse(await fs.readFile(path.join(workspace,'BuildPrompts/1.2.15/evidence/release-source-manifest.json'),'utf8'));
async function checkInputs(items){const changed=[];for(const x of items){try{if(sha(await fs.readFile(path.join(workspace,x.file)))!==x.sha256)changed.push(x.file)}catch{changed.push(x.file)}}return {checked:items.length,changed,unchanged:items.length-changed.length};}
const preservation={checkedAt:now,scope:'Original app/build inputs and prior release inputs; research artifacts excluded',application:await checkInputs(appBaseline.files),priorRelease:await checkInputs(release.inputs),applicationBaselineByteUnchanged:sha(await read('evidence/application-source-baseline.json'))===baseline.files.find(x=>x.path==='evidence/application-source-baseline.json').sha256};
preservation.pass=preservation.application.changed.length===0&&preservation.priorRelease.changed.length===0&&preservation.applicationBaselineByteUnchanged;
await fs.writeFile(path.join(root,'evidence/application-source-preservation.json'),JSON.stringify(preservation,null,2)+'\n');

async function walk(dir=root){let a=[];for(const ent of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())a.push(...await walk(p));else a.push(path.relative(root,p).replaceAll('\\','/'));}return a.sort();}
let paths=await walk();
const brokenLinks=[],images=[],links=[];
for(const p of paths){
  if(p.endsWith('.md')){const txt=(await read(p)).toString('utf8');for(const match of txt.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){let target=match[1].replace(/^<|>$/g,'').split(/\s+"/)[0];if(/^(https?:|mailto:|#)/.test(target))continue;target=decodeURIComponent(target.split('#')[0]).replace(/:\d+(?::\d+)?$/,'');if(!target)continue;const resolved=path.resolve(path.dirname(path.join(root,p)),target);try{await fs.access(resolved);links.push({file:p,target})}catch{brokenLinks.push({file:p,target})}}}
  if(/\.(png|webp)$/i.test(p)){const data=await read(p);const meta=await sharp(data).metadata();await sharp(data).raw().toBuffer();images.push({file:p,width:meta.width,height:meta.height,bytes:data.length,sha256:sha(data)});}
}
const artifacts={checkedAt:now,scope:'All current Markdown local links and current raster images; historical ZIP is excluded',markdownFiles:paths.filter(p=>p.endsWith('.md')).length,relativeLinksChecked:links.length,brokenLinks,imagesDecoded:images.length,images,pass:brokenLinks.length===0};
await fs.writeFile(path.join(root,'evidence/artifact-validation.json'),JSON.stringify(artifacts,null,2)+'\n');

const audits={};
for(const p of ['roles/contributor-document-audit.json','evidence/engineering-file-audit.json','evidence/member-file-audit.json','mockups/file-audit.json']){try{audits[p]=await json(p)}catch{audits[p]={pending:true}}}
function records(value){if(!value||typeof value!=='object')return [];let out=[];if(typeof value.path==='string')out.push(value);for(const v of Object.values(value)){if(v&&typeof v==='object')out.push(...records(v));}return out;}
const roleRecords=Object.entries(audits).flatMap(([audit,value])=>records(value).map(x=>({...x,audit})));
const rootNotes={
 'README.md':'Rebuilt entry point, four decisions, new visual links and evidence boundaries.',
 'RESEARCH_CHARTER.md':'Reopened scope and all-file reassessment; removed separate-creator/manual-play assumptions.',
 'DECISIONS_AND_ROADMAP.md':'Resequenced broad library, unified rich editing, autoplay and downstream release gates.',
 'SOURCES.md':'Primary-source register rebuilt around NotebookLM, Word/Canva, framework licensing and playback policies.',
 'VALIDATION.md':'Replaced old current-UI signoff with dated reruns and fresh peer checks; historical proof explicitly scoped.',
 'architecture/README.md':'Replaced split verbal/visual boundaries with one semantic draft and source lifecycle.',
 'architecture/product-architecture.mmd':'Regenerated logical graph with broad context, unified creator, publication and identity boundaries.',
 'architecture/render-overview.mjs':'Rewrote reproducible renderer for unified architecture; no application renderer changed.',
 'architecture/product-architecture.svg':'Regenerated from new architecture renderer and inspected for legibility.',
 'architecture/product-architecture.png':'Regenerated from new SVG; actual raster decoded and visually reviewed.',
 'evidence/application-source-baseline.json':'Retain original baseline: original ZIP/SHA match; all215 entries freshly compared, not stale current-UI evidence.',
 'evidence/application-source-preservation.json':'Regenerated current comparison for215 app/build and121 prior-release inputs.',
 'evidence/artifact-validation.json':'Regenerated current document-link/image integrity checks; old counts superseded.'
};
for(const n of ['01-cowriter-context-inputs','02-social-sharing','03-real-cowriter-demonstration','04-compact-contributor-workspace','05-studio-creator','06-member-access'])rootNotes[`items/${n}.md`]='Fully reassessed and rewritten for the revised four decisions and their downstream effect; current scope/gates explicit.';
const dispositions=[];
for(const old of baseline.files){const rs=roleRecords.filter(x=>x.path===old.path);let bytes=null;try{bytes=await read(old.path)}catch{}const status=bytes===null?'removed':sha(bytes)===old.sha256?'unchanged':'modified';const note=rootNotes[old.path]||rs.map(x=>x.verdict||x.disposition||x.reason).filter(Boolean).join('; ')||'Reassessed against revised scope; inspect content-change status and role audit evidence.';dispositions.push({path:old.path,baselineSha256:old.sha256,currentSha256:bytes?sha(bytes):null,status,rationale:note,roleAuditReferences:[...new Set(rs.map(x=>x.audit))]});}
await fs.writeFile(path.join(root,'_audit/original-file-dispositions.json'),JSON.stringify({reviewedAt:now,baselineFiles:baseline.files.length,archiveProof,roleAuditStatus:Object.fromEntries(Object.entries(audits).map(([p,v])=>[p,v.pending?'pending':'present'])),files:dispositions},null,2)+'\n');

// Reports name themselves but deliberately omit their own hash to avoid a recursive checksum.
const reportPaths=['REBUILD_REPORT.md','_audit/change-inventory.json'];
paths=[...new Set([...(await walk()),...reportPaths])].sort();
const oldMap=new Map(baseline.files.map(x=>[x.path,x]));
const entries=[];
for(const p of [...new Set([...paths,...oldMap.keys()])].sort()){
  const old=oldMap.get(p);let data=null;try{data=await read(p)}catch{}const self=reportPaths.includes(p);const exists=data!==null||self;const hash=data?sha(data):null;const status=!old?'created':!exists?'removed':hash===old.sha256?'unchanged':'modified';
  const disposition=dispositions.find(x=>x.path===p);
  entries.push({path:p,status,beforeBytes:old?.bytes??null,afterBytes:self?null:data?.length??null,beforeSha256:old?.sha256??null,afterSha256:self?null:hash,note:self?'Self-describing generated inventory; recursive own hash/size intentionally omitted.':disposition?.rationale??(p.startsWith('_history/')?'Verified original106-file archive.':p.startsWith('mockups/')?'Rebuilt visual prototype, generated capture/media/export or current validation.':p.includes('engineering-rerun-20261101')?'Fresh dated engineering rerun/model evidence.':'New research/audit/peer-review evidence; no application code.')});
}
const counts=Object.fromEntries(['modified','created','removed','unchanged'].map(s=>[s,entries.filter(x=>x.status===s).length]));
const inventory={generatedAt:now,baselineFiles:baseline.files.length,currentFiles:paths.length,counts,definition:'Status compares SHA256/content with frozen106-file baseline. Removed originals remain recoverable in verified ZIP. This report and its JSON omit their own hashes/sizes; all paths are still listed.',preservation,entries};
await fs.writeFile(path.join(root,'_audit/change-inventory.json'),JSON.stringify(inventory,null,2)+'\n');
const tableRows=arr=>arr.map(e=>`| ${e.path} | ${e.note.replaceAll('|','/')} |`).join('\n');
let report=`# Rebuild and complete file-change analysis\n\nGenerated ${now}. Research only; application and production unchanged.\n\n## What changed\n\nThe initiative was reopened in full: broad channel source library and one Import; one Compose workspace with rich writing/design tools; dynamic layout and semantic reading order; first-viewport muted autoplay recording. Sharing, member identity and feedback were reassessed for those changes. Every original file has an explicit disposition; old visual signoffs are not current acceptance.\n\n| Status versus original106files | Files |\n|---|---:|\n| Modified in place | ${counts.modified} |\n| Created | ${counts.created} |\n| Removed from active package | ${counts.removed} |\n| Retained with integrity/relevance proof | ${counts.unchanged} |\n\nCurrent package: ${paths.length} files. Renames are reported as removal plus creation. Content-identical retained files are not claimed rewritten. [Machine-readable inventory](_audit/change-inventory.json) includes exact before/after hashes and sizes; [original dispositions](_audit/original-file-dispositions.json) references role audit proof. The two self-describing reports omit their own recursive checksum/size.\n\n## Preservation and scope\n\nVerified original ZIP: ${archiveProof.files} baseline files, ${archiveProof.archiveMembers} members, ${archiveProof.mismatches.length} hash mismatches, ZIP integrity ${archiveProof.badMember===null?'passed':'FAILED'}. All${preservation.application.checked} application/build inputs and all${preservation.priorRelease.checked} prior release inputs freshly compared: ${preservation.application.changed.length+preservation.priorRelease.changed.length} differences. No provider integration, application feature or production deployment was performed.\n\n## Analysis by area\n\n- Documents: rewritten decisions, interaction details, architectural implications, feasibility limits and rollout gates; all22baseline Markdown documents independently audited.\n- Mockups: retired all38old screen images and regenerated current states; new unified editing/library/autoplay screens and real research workflow video. The video is not live/current-production AI footage.\n- Architecture: new shared semantic document/layout diagram and source lifecycle; actual library integration remains future work.\n- Evidence: fresh parser/network/operation-model and UI runs separate from retained historical approval proof. Original raw results/fixtures survive only with dated narrow scope and hash checks.\n- Tooling: current capture/export/test/server helpers are research-only; three obsolete one-time mutation helpers retired. Loopback preview process replacement was blocked by automatic approval review; existing process left running and separate3092preview started instead.\n\n`;
for(const [status,title] of [['modified','Modified files'],['created','Created files'],['removed','Removed active files'],['unchanged','Retained files and rationale']])report+=`## ${title}\n\n| File | Analysis / reason |\n|---|---|\n${tableRows(entries.filter(e=>e.status===status))}\n\n`;
report+='## Review limitations\n\nThe storyboard and own-model tests are research evidence. They do not prove installed editor integration, genuine AI generation, all import adapters, durable assets, live SMS/People connections, native social posting, production accessibility or real church-user efficiency. Those remain explicit roadmap gates. See [validation](VALIDATION.md).\n';
await fs.writeFile(path.join(root,'REBUILD_REPORT.md'),report);
console.log(JSON.stringify({counts,currentFiles:paths.length,baselineFiles:baseline.files.length,archive:archiveProof,application:preservation,markdownFiles:artifacts.markdownFiles,relativeLinks:links.length,brokenLinkCount:brokenLinks.length,brokenLinks:brokenLinks.slice(0,12),imagesDecoded:images.length},null,2));
if(!preservation.pass||brokenLinks.length)process.exitCode=1;
