import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
const root=path.dirname(fileURLToPath(import.meta.url));
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const box=(x,y,w,h,title,lines,fill='#fffefa')=>`<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="15" fill="${fill}" stroke="#b6c8bd"/><text x="${x+22}" y="${y+35}" font-size="23" font-family="Georgia" fill="#153b43">${esc(title)}</text>${lines.map((s,i)=>`<text x="${x+22}" y="${y+64+i*24}" font-size="16" font-family="Arial" fill="#435c60">${esc(s)}</text>`).join('')}</g>`;
const arrow=(x,y,x2,y2)=>`<path d="M${x} ${y} L${x2} ${y2}" stroke="#24785e" stroke-width="3" fill="none" marker-end="url(#a)"/>`;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1220" role="img" aria-labelledby="title desc"><title id="title">Rooted unified product architecture</title><desc id="desc">A channel source library imports many formats into scoped context for one semantic document with Write and Design views. Exact review precedes publication and member rendering. Public decks have separate approval. Homepage muted autoplay and future identity integration remain distinct responsibilities.</desc><defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#24785e"/></marker></defs><rect width="1800" height="1220" fill="#f6f4eb"/><text x="55" y="48" font-size="14" font-family="Arial" letter-spacing="3" fill="#24785e">ROOTED · RESEARCH REBUILT NOVEMBER 1, 2026</text><text x="55" y="99" font-size="40" font-family="Georgia" fill="#153b43">Broad context. One flexible creator. Faithful reading.</text><text x="55" y="136" font-size="18" font-family="Arial" fill="#435c60">Logical responsibilities proposed for review. No application, provider account or production resources changed.</text>
${box(55,175,1690,100,'Preserve authorization and exact publication integrity',['Verified identity + church/private scope · immutable revisions · bounded jobs/fetching · exact-hash review · explicit publication'],'#e3eadf')}
${box(55,320,500,140,'Channel source library + ONE Import',['Files / links / paste / consented connections','Named rows: processing / ready / error + coverage','Broad capability registry; only tested adapters enabled'])}
${box(55,500,500,140,'Versioned context and retrieval',['Bounded extraction / OCR / transcription / indexing','Selected ready versions; tenant filter before ranking','Immutable evidence spans, citations and source manifest'])}
${arrow(305,460,305,500)}
<rect x="610" y="320" width="620" height="510" rx="18" fill="#e3eadf" stroke="#8eae9a" stroke-width="2"/>
<text x="635" y="362" font-size="27" font-family="Georgia" fill="#153b43">ONE Compose workspace</text><text x="635" y="394" font-size="17" font-family="Arial" fill="#435c60">One semantic document + layout + history + save state</text>
${box(635,420,270,145,'Write',['Rich text + selection','Outline / direct edits','Source-grounded assistant'])}
${box(930,420,275,145,'Design',['Objects / layers / crop','Position / group / align','Same nodes; reading order'])}
${box(635,590,570,110,'Selected AI and media operations',['Preview → Apply / Reject → Undo; version-aware atomic edits','Bounded text / image / data / video tools; no forced handoff'])}
${box(635,725,570,80,'Protected review conversation',['Visible request/reply + exact revision + repeated cycles'])}
${arrow(555,570,610,570)}
${box(1285,320,460,140,'Approved publication snapshot',['Content + layout + assets + template version','Shared preview/member renderer','Phone reflow + alternatives + narration order'])}
${box(1285,510,460,125,'Public deck rendition',['Separate public approval + brand/caption/link','Reuse layout primitives, exclude private data','Member preview / opt-in / download fallback'])}
${box(1285,685,460,125,'Asset / rendition jobs',['Durable private media; idempotent and bounded','Stale results cannot overwrite new work','Providers need actual quality/cost/rights tests'])}
<path d="M1230 765 H1255 V390 H1285" fill="none" stroke="#24785e" stroke-width="3" marker-end="url(#a)"/>${arrow(1515,460,1515,510)}${arrow(1285,745,1230,745)}
${box(55,690,500,140,'Homepage AI-tab recording',['Visible first viewport; muted inline autostart','Pause + transcript + preference/policy fallback','Research sample now; genuine release recording later'])}
${box(55,880,1690,245,'Member access is a separate boundary',['QR carries church/return context → verified credential → explicit church enrollment policy → intended reader','Phone-first provider + recovery + stable principal links remain conditional; preserve staff assurance','Future Planning Center People sync is separately authorized candidate association, not authentication','Private source files, staff discussion and directory records never become public deck or default reading context'],'#e9e3ef')}
<text x="55" y="1175" font-family="Arial" font-size="17" fill="#435c60">Local prototype/model checks are bounded evidence. Rich editor integration, live adapters, durable assets and real church usability are future gates.</text></svg>`;
await writeFile(path.join(root,'product-architecture.svg'),svg);
await sharp(Buffer.from(svg)).png().toFile(path.join(root,'product-architecture.png'));
console.log('Rebuilt unified architecture SVG and PNG');
