"""Research only: synthetic OOXML extraction and identity/provenance models. Stdlib only.
Not a production parser, phone library, malware scanner or provider integration.
"""
from pathlib import Path, PurePosixPath
from zipfile import ZipFile, ZIP_DEFLATED
from io import BytesIO
from xml.etree import ElementTree as ET
from datetime import datetime, timedelta
import hashlib, json, re

ROOT = Path(__file__).resolve().parent / 'engineering-rerun-20261101'
ROOT.mkdir(exist_ok=True)
FIXTURES = ROOT / 'synthetic-fixtures'
FIXTURES.mkdir(exist_ok=True)
checks = []
def check(name, condition):
    assert condition, name
    checks.append(name)

def archive(parts):
    output = BytesIO()
    with ZipFile(output, 'w', ZIP_DEFLATED) as z:
        for name, content in parts.items():
            z.writestr(name, content)
    return output.getvalue()

def safe_parts(blob):
    # Reject active/external parts rather than executing/following them. Read in memory.
    with ZipFile(BytesIO(blob)) as z:
        infos = z.infolist()
        names = [x.filename for x in infos]
        if len(infos) > 100 or sum(x.file_size for x in infos) > 1_000_000:
            raise ValueError('expanded_limit')
        if len(names) != len(set(names)):
            raise ValueError('duplicate_part')
        result = {}
        for x in infos:
            p = PurePosixPath(x.filename)
            if p.is_absolute() or '..' in p.parts or '\\' in x.filename:
                raise ValueError('part_path')
            if 'vbaproject' in x.filename.lower() or '/embeddings/' in x.filename.lower():
                raise ValueError('active_part')
            data = z.read(x)
            if b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():
                raise ValueError('xml_declaration')
            if x.filename.endswith('.rels'):
                if any(e.get('TargetMode') == 'External' for e in ET.fromstring(data)):
                    raise ValueError('external_relationship')
            result[x.filename] = data
        return result

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
S = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
def word_extract(blob):
    parts = safe_parts(blob)
    body = ET.fromstring(parts['word/document.xml']).find(W+'body')
    result = []
    for index, block in enumerate(body, 1):
        if block.tag == W+'p':
            result.append({'locator': f'body/block/{index}', 'type': 'paragraph',
                           'text': ''.join(block.itertext())})
        if block.tag == W+'tbl':
            for rownum, row in enumerate(block.findall(W+'tr'), 1):
                result.append({'locator': f'body/block/{index}/row/{rownum}', 'type': 'table-row',
                               'cells': [''.join(c.itertext()) for c in row.findall(W+'tc')]})
    return result

word = archive({'word/document.xml': f'''<w:document xmlns:w="{W[1:-1]}"><w:body><w:p><w:r><w:t>A synthetic </w:t></w:r><w:r><w:t>sermon</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Theme</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Hope &amp; service</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:p><w:r><w:t>Closing reflection</w:t></w:r></w:p></w:body></w:document>'''})
(FIXTURES/'sermon-notes.docx').write_bytes(word)
docx = word_extract(word)
check('DOCX split runs preserve paragraph text', docx[0]['text'] == 'A synthetic sermon')
check('DOCX table row/cell boundaries and XML entities', docx[1]['cells'] == ['Theme', 'Hope & service'])
check('DOCX source order after table', docx[2]['text'] == 'Closing reflection')

def excel_date(serial, date1904=False):
    if not date1904 and serial == 60:
        return 'invalid-1900-leap-day'
    epoch = datetime(1904, 1, 1) if date1904 else datetime(1899, 12, 31)
    adjustment = 0 if date1904 or serial < 60 else 1
    return (epoch + timedelta(days=serial-adjustment)).isoformat()

def xlsx_extract(blob):
    parts = safe_parts(blob)
    workbook = ET.fromstring(parts['xl/workbook.xml'])
    date1904 = workbook.find(S+'workbookPr').get('date1904') == '1'
    strings = [''.join(e.itertext()) for e in ET.fromstring(parts['xl/sharedStrings.xml'])]
    formats = [int(e.get('numFmtId')) for e in ET.fromstring(parts['xl/styles.xml']).find(S+'cellXfs')]
    cells=[]
    for c in ET.fromstring(parts['xl/worksheets/sheet1.xml']).iter(S+'c'):
        v = c.find(S+'v'); raw = v.text if v is not None else None
        f = c.find(S+'f'); value = raw
        if c.get('t') == 's': value = strings[int(raw)]
        elif c.get('t') == 'inlineStr': value = ''.join(c.find(S+'is').itertext())
        elif raw is not None and formats[int(c.get('s', '0'))] == 14: value = excel_date(float(raw), date1904)
        elif c.get('t') == 'b': value = raw == '1'
        elif raw is not None: value = float(raw)
        cells.append({'locator': 'Sermon!'+c.get('r'), 'value': value, 'raw': raw,
                      'formula': f.text if f is not None else None,
                      'warning': ('saved-result-may-be-stale' if raw is not None else 'no-saved-result') if f is not None else None})
    return cells

xlsxparts={'xl/workbook.xml':f'<workbook xmlns="{S[1:-1]}"><workbookPr date1904="0"/><sheets><sheet name="Sermon" sheetId="1"/></sheets></workbook>',
 'xl/sharedStrings.xml':f'<sst xmlns="{S[1:-1]}"><si><t>Hope</t></si></sst>',
 'xl/styles.xml':f'<styleSheet xmlns="{S[1:-1]}"><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="14"/></cellXfs></styleSheet>',
 'xl/worksheets/sheet1.xml':f'<worksheet xmlns="{S[1:-1]}"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" s="1"><v>40729</v></c><c r="C1"><f>2+3</f><v>5</v></c><c r="D1"><f>NOW()</f></c><c r="E1" t="b"><v>1</v></c><c r="F1" t="inlineStr"><is><t>Reflection</t></is></c></row></sheetData></worksheet>'}
xlsxblob=archive(xlsxparts); (FIXTURES/'study-context.xlsx').write_bytes(xlsxblob)
cells=xlsx_extract(xlsxblob)
check('XLSX shared strings', cells[0]['value']=='Hope')
check('XLSX styled 1900 date', cells[1]['value']=='2011-07-05T00:00:00')
check('XLSX formula and cached value retained without evaluation', cells[2]['formula']=='2+3' and cells[2]['value']==5 and cells[2]['warning']=='saved-result-may-be-stale')
check('XLSX absent cached formula stays unknown', cells[3]['value'] is None and cells[3]['warning']=='no-saved-result')
check('XLSX boolean and inline string', cells[4]['value'] is True and cells[5]['value']=='Reflection')
check('XLSX 1904 date has 1462-day difference', excel_date(39267,True)==excel_date(40729))
check('XLSX serial 60 marked invalid', excel_date(60)=='invalid-1900-leap-day')

for name,parts in [('path',{'../escape.xml':'x'}),('macro',{'xl/vbaProject.bin':'not executable'}),('external',{'_rels/.rels':'<Relationships><Relationship TargetMode="External" Target="https://example.invalid"/></Relationships>'}),('entity',{'word/document.xml':'<!DOCTYPE x [<!ENTITY a "x">]><x/>'}),('size',{'large.xml':'x'*1_000_001})]:
    try: safe_parts(archive(parts)); raise AssertionError(name)
    except ValueError: checks.append('OOXML rejects '+name)

def digest(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
source_v1={'churchId':'synthetic-a','sourceId':'s1','originalHash':hashlib.sha256(word).hexdigest(), 'extractor':'research-v1','spans':docx,'rights':{'aiUse':True,'publicExport':False}}
source_hash=digest(source_v1)
source_v2={**source_v1,'rights':{'aiUse':True,'publicExport':True}}
snapshot={'revisionId':'r1','sourceHash':source_hash,'spanIds':[docx[0]['locator']]}
check('rights change invalidates source version hash', digest(source_v2)!=snapshot['sourceHash'])
changed={**source_v1,'extractor':'research-v2'}
check('extractor version changes source version hash', digest(changed)!=source_hash)
check('canonical ordering keeps hash stable', digest(dict(reversed(list(source_v1.items()))))==source_hash)
check('cross-tenant hash differs', digest({**source_v1,'churchId':'synthetic-b'})!=source_hash)
rendition={'revisionHash':'revision-1','brandVersion':2,'templateVersion':1,'sourceHash':source_hash}
check('brand update invalidates rendition approval target', digest(rendition)!=digest({**rendition,'brandVersion':3}))

def normalize_phone(value, region=None):
    # Deliberately narrow synthetic fixture normalization; no global validity claim.
    if re.search('[A-Za-z#]',value): raise ValueError('extension_or_letters')
    if not re.fullmatch(r'[+0-9() .-]+',value): raise ValueError('characters')
    digits=re.sub(r'\D','',value)
    if value.startswith('+') and re.fullmatch('[1-9][0-9]{7,14}',digits): return '+'+digits
    if region=='US' and len(digits)==10: return '+1'+digits
    if region=='US' and len(digits)==11 and digits.startswith('1'): return '+'+digits
    raise ValueError('need_country_or_invalid')
check('US country selection normalizes formatting', normalize_phone('(202) 555-0100','US')=='+12025550100')
check('explicit international number preserves prefix', normalize_phone('+44 7700 900123')=='+447700900123')
for value,region in [('2025550100',None),('2025550100 ext 1','US'),('+012345678',None),('123','US')]:
    try: normalize_phone(value,region); raise AssertionError(value)
    except ValueError: checks.append('phone rejects ambiguous/invalid '+value)
people=[{'id':'person-a','name':'Alex','phone':'+12025550100'}, {'id':'person-b','name':'Sam','phone':'+12025550100'}]
candidates=[p['id'] for p in people if p['phone']==normalize_phone('(202) 555-0100','US')]
check('shared household produces ambiguity, not auto link', len(candidates)==2)
check('names cannot disambiguate duplicate names',len([p for p in [{'name':'Alex'},{'name':'Alex'}] if p['name']=='Alex'])==2)

result={'scope':'synthetic offline stdlib research; no provider calls','checksPassed':len(checks),'checks':checks,'docx':docx,'xlsx':cells,'sourceVersionHash':source_hash,'revisionSnapshot':snapshot,'householdCandidates':candidates,'limits':['Fixtures are minimal XML packages, not full Office application interoperability validation.','Fixed filenames, subset of styles/cells only; no relationship-based workbook traversal.','No tracked changes, comments, footnotes, textboxes, nested tables or real customer documents.','No formula recalculation, macros, external links or document rendering.','Phone normalization is narrow fixture logic, not libphonenumber validity or OTP proof.','Hash model does not prove database RLS or production workflow integration.']}
(ROOT/'engineering-spike-results.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps({'checksPassed':len(checks),'result':'engineering-spike-results.json'}))
