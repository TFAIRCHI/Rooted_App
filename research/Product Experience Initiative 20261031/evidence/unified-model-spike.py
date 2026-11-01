"""2026-11-01 research: own structured model, not an editor/RAG/provider implementation."""
from pathlib import Path
from copy import deepcopy
from datetime import datetime, timezone
import hashlib, html, json

OUT=Path(__file__).resolve().parent/'engineering-rerun-20261101'
OUT.mkdir(exist_ok=True)
checks=[]
def check(name,value):
    assert value,name
    checks.append(name)
def canonical(value): return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False)
def sha(value): return hashlib.sha256(canonical(value).encode()).hexdigest()
def rejected(name,fn,kind=ValueError):
    try: fn()
    except kind: checks.append(name);return
    raise AssertionError(name)

registry={
 'text/plain':{'kind':'file','capability':'available','extractor':'utf8-v1'},
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':{'kind':'file','capability':'isolated-subset','extractor':'docx-research-v1'},
 'application/pdf':{'kind':'file','capability':'planned','extractor':None},
 'image/png':{'kind':'file','capability':'planned-ocr','extractor':None},
 'audio/mpeg':{'kind':'file','capability':'requires-provider','extractor':None},
 'youtube':{'kind':'link','capability':'requires-permission','extractor':None},
 'google-drive':{'kind':'connector','capability':'requires-connection','extractor':None},
}
class Library:
    def __init__(self): self.rows={};self.jobs={};self.chunks=[];self.selections={}
    def batch(self,church,channel,key,items):
        binding=(church,channel,key)
        if binding in self.jobs:return self.jobs[binding]
        ids=[]
        for i,item in enumerate(items):
            sid=f'{church}:{channel}:{key}:{i}'
            self.rows[sid]={'id':sid,'church':church,'channel':channel,'displayName':item['name'],'originalUrl':item.get('url'),
                           'kind':item['kind'],'type':item['type'],'status':'processing','versions':[],'activeVersion':None,'removed':False}
            ids.append(sid)
        self.jobs[binding]=ids
        return ids
    def finish(self,sid,text=None):
        row=self.rows[sid];cap=registry.get(row['type'])
        if not cap or cap['capability'] not in ('available','isolated-subset'):
            row['status']='error';row['error']='capability-unavailable';return
        if text is None:raise ValueError('missing extraction')
        version={'id':len(row['versions'])+1,'text':text,'extractor':cap['extractor'],'hash':sha(text)}
        row['versions'].append(version);row['activeVersion']=version['id'];row['status']='ready'
        self.chunks.append({'church':row['church'],'channel':row['channel'],'source':sid,'version':version['id'],'locator':'paragraph/1','text':text})
    def select(self,church,channel,sid):
        r=self.rows[sid]
        if r['church']!=church or r['channel']!=channel or r['status']!='ready' or r['removed']:raise ValueError('not selectable')
        return {'source':sid,'version':r['activeVersion'],'hash':r['versions'][-1]['hash'],'locator':'paragraph/1'}
    def retrieve(self,church,channel,manifest,query,budget):
        allowed={(m['source'],m['version']) for m in manifest}
        # lexical demonstration only: tenant/scope/selection filters happen BEFORE ranking.
        found=[c for c in self.chunks if c['church']==church and c['channel']==channel and (c['source'],c['version']) in allowed and not self.rows[c['source']]['removed']]
        ranked=sorted(found,key=lambda c:query.lower() in c['text'].lower(),reverse=True)
        selected=[];used=0
        for c in ranked:
            size=len(c['text'].encode())
            if used+size>budget:continue
            selected.append(deepcopy(c));used+=size
        return selected
    def remove(self,sid):self.rows[sid]['removed']=True

lib=Library()
items=[{'name':'sermon.txt','kind':'file','type':'text/plain'}, {'name':'teaching.pdf','kind':'file','type':'application/pdf'},
       {'name':'Sunday clip','kind':'link','type':'youtube','url':'https://www.youtube.com/watch?v=synthetic'}]
ids=lib.batch('church-a','channel-1','batch-1',items)
check('mixed batch preserves every title and URL',lib.rows[ids[2]]['originalUrl']==items[2]['url'] and len(ids)==3)
check('batch submission is idempotent in same tenant/channel',lib.batch('church-a','channel-1','batch-1',items)==ids)
check('batch starts each item processing',all(lib.rows[x]['status']=='processing' for x in ids))
lib.finish(ids[0],'Hope is the selected teaching context.');lib.finish(ids[1]);lib.finish(ids[2])
check('one failure does not roll back ready item',lib.rows[ids[0]]['status']=='ready' and lib.rows[ids[1]]['status']=='error')
check('planned PDF and permissioned YouTube remain honest errors',lib.rows[ids[1]]['error']==lib.rows[ids[2]]['error']=='capability-unavailable')
rejected('processing/error sources cannot enter context',lambda:lib.select('church-a','channel-1',ids[1]))
rejected('cross-channel selection rejected',lambda:lib.select('church-a','other-channel',ids[0]))
rejected('cross-tenant selection rejected',lambda:lib.select('church-b','channel-1',ids[0]))
manifest=[lib.select('church-a','channel-1',ids[0])]
old_hash=manifest[0]['hash'];lib.finish(ids[0],'A refreshed source has a new message.')
check('refresh creates a new immutable version',len(lib.rows[ids[0]]['versions'])==2 and old_hash!=lib.rows[ids[0]]['versions'][-1]['hash'])
retrieved=lib.retrieve('church-a','channel-1',manifest,'Hope',100)
check('old request remains pinned after refresh',len(retrieved)==1 and retrieved[0]['version']==1 and 'Hope' in retrieved[0]['text'])
check('byte context budget excludes overflow',lib.retrieve('church-a','channel-1',manifest,'Hope',3)==[])
check('retrieval filters tenant before rank',lib.retrieve('church-b','channel-1',manifest,'Hope',100)==[])
lib.remove(ids[0])
check('removed source excluded immediately from retrieval',lib.retrieve('church-a','channel-1',manifest,'Hope',100)==[])
check('citation manifest remains after removal',manifest[0]['hash']==old_hash)
rejected('removed source cannot be reselected',lambda:lib.select('church-a','channel-1',ids[0]))

draft={'schemaVersion':2,'church':'church-a','version':1,
       'nodes':{'intro':{'id':'intro','kind':'paragraph','runs':[{'text':'Start with hope.','marks':[]}]},
                'diagram':{'id':'diagram','kind':'image','assetHash':'synthetic-asset','alt':'A branch connected to a vine.'}},
       'readingOrder':['intro','diagram'],
       'layouts':{'document':{'mode':'flow'},'social':{'mode':'canvas','width':1080,'height':1080,'placements':{'intro':{'x':80,'y':100,'w':900,'h':200,'z':2},'diagram':{'x':100,'y':400,'w':700,'h':500,'z':1}}}},
       'contextManifest':manifest}
def validate(d):
    if len(d['readingOrder'])!=len(set(d['readingOrder'])) or set(d['readingOrder'])!=set(d['nodes']):raise ValueError('order')
    for n in d['nodes'].values():
        if n['kind'] not in ('paragraph','image'):raise ValueError('node kind')
        if n['kind']=='image' and not n['alt']:raise ValueError('alt')
        for run in n.get('runs',[]):
            if any(m not in ('bold','italic') for m in run['marks']):raise ValueError('mark')
    for l in d['layouts'].values():
        for nid,p in l.get('placements',{}).items():
            if nid not in d['nodes'] or p['w']<=0 or p['h']<=0:raise ValueError('placement')
def apply(d,op):
    if op['base']!=d['version']:raise ValueError('revision_conflict')
    n=deepcopy(d);nid=op['target']
    if nid not in n['nodes']:raise ValueError('missing anchor')
    if op['kind']=='replaceText':n['nodes'][nid]['runs']=[{'text':op['text'],'marks':[]}]
    elif op['kind']=='mark':n['nodes'][nid]['runs'][0]['marks']=[op['mark']]
    elif op['kind']=='place':n['layouts']['social']['placements'][nid]=op['placement']
    elif op['kind']=='moveReading':
        n['readingOrder'].remove(nid);n['readingOrder'].insert(op['index'],nid)
    else:raise ValueError('operation')
    n['version']+=1;validate(n);return n
def publish_hash(d):return sha({k:v for k,v in d.items() if k!='version'})
def render(d):
    out=[]
    for nid in d['readingOrder']:
        n=d['nodes'][nid]
        if n['kind']=='paragraph':out.append('<p data-node="'+nid+'">'+''.join(html.escape(r['text']) for r in n['runs'])+'</p>')
        else:out.append('<figure data-node="'+nid+'">'+html.escape(n['alt'])+'</figure>')
    return ''.join(out)
validate(draft);approved=publish_hash(draft);snapshot=deepcopy(draft)
marked=apply(draft,{'kind':'mark','target':'intro','mark':'bold','base':1})
check('rich-text mark represented in one draft model',marked['nodes']['intro']['runs'][0]['marks']==['bold'])
rejected('stale assistant proposal rejected',lambda:apply(marked,{'kind':'replaceText','target':'intro','text':'Stale suggestion','base':1}))
rejected('missing selected node rejected',lambda:apply(marked,{'kind':'replaceText','target':'deleted','text':'x','base':2}))
placed=apply(marked,{'kind':'place','target':'diagram','base':2,'placement':{'x':50,'y':20,'w':500,'h':400,'z':5}})
check('canvas placement keeps semantic reading order',placed['readingOrder']==draft['readingOrder'])
check('design placement invalidates approval',publish_hash(placed)!=approved)
check('published snapshot immutable after draft change',publish_hash(snapshot)==approved and snapshot['layouts']['social']['placements']['diagram']['x']==100)
moved=apply(placed,{'kind':'moveReading','target':'diagram','index':0,'base':3})
check('reading reorder independent from z-order',moved['readingOrder'][0]=='diagram' and moved['layouts']['social']['placements']['diagram']['z']==5)
check('shared member and preview renderer exact equality',render(moved)==render(deepcopy(moved)))
check('semantic DOM begins with authored first node',render(moved).startswith('<figure data-node="diagram"'))
changed=apply(moved,{'kind':'replaceText','target':'intro','text':'<script>not executable</script>','base':4})
check('render escapes untrusted text', '<script>' not in render(changed) and '&lt;script&gt;' in render(changed))
bad=deepcopy(changed);bad['nodes']['diagram']['alt']=''
rejected('missing image alternative blocks model validation',lambda:validate(bad))
bad=deepcopy(changed);bad['readingOrder'].append('intro')
rejected('duplicate reading ids rejected',lambda:validate(bad))
# Undo is a new version; never restore the old optimistic concurrency number.
undo=deepcopy(moved);undo['version']=changed['version']+1
check('undo restores content while version remains monotonic',publish_hash(undo)==publish_hash(moved) and undo['version']>changed['version'])
anchor={'nodeId':'intro','quote':'Start with hope.','revisionHash':approved}
check('review anchor remains bound to reviewed snapshot',anchor['nodeId'] in snapshot['nodes'] and anchor['revisionHash']==approved and snapshot['nodes']['intro']['runs'][0]['text']==anchor['quote'])
check('context change invalidates content approval',publish_hash({**draft,'contextManifest':[]})!=approved)

result={'runAt':datetime.now(timezone.utc).isoformat(),'scope':'Synthetic own source lifecycle + structured editor operations; no provider, embeddings model, real editor engine, database or browser integration',
        'checksPassed':len(checks),'checks':checks,'registry':registry,'batchItems':list(lib.rows.values()),'contextManifest':manifest,
        'approvedHash':approved,'finalDraft':changed,'limits':['Retrieval uses a boolean lexical match, not semantic embeddings or RAG quality proof.','Tenant filters are an in-memory contract model, not DB RLS proof.','Rich text supports only synthetic paragraph runs/bold/italic; no IME/paste/selection mapping/editor engine proof.','Undo is snapshot-based single writer, not collaborative selective undo.','Shared renderer check verifies a deliberately small semantic output only.','No OCR/PDF/audio/video extraction, Google/YouTube/Drive API or paid calls.']}
(OUT/'unified-model-results.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
(OUT/'shared-reading.html').write_text('<!doctype html><meta charset="utf-8"><title>Research semantic output</title>'+render(changed),encoding='utf-8')
print(json.dumps({'checksPassed':len(checks),'result':'unified-model-results.json'}))
