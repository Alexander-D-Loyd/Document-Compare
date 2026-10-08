import pdfplumber,json,re
from pathlib import Path
from gpo_glyph_mapping import restore_page_glyphs
root=Path(__file__).resolve().parents[1]
p=root/'app/data/gpo-reference.json';ref=json.loads(p.read_text(encoding='utf-8'))
with pdfplumber.open(root/'app/data/gpo-stylemanual-2016.pdf') as pdf:
 assert len(pdf.pages)==len(ref['pages'])
 for i,page in enumerate(pdf.pages):
  mapping,restored,unresolved=restore_page_glyphs(page)
  flow=page.extract_text(layout=False) or ''
  if restored:ref['pages'][i]['text']=flow
  raw=ref['pages'][i]['text']
  def join(m):
   joined=m[2]+m[3];return m[1]+joined if re.search(r'\b'+re.escape(joined)+r'\b',raw) else m[0]
  ref['pages'][i]['flowText']=re.sub(r'(?m)^([ \t]*(?:\d+\.\d+\.[ \t]*)?)([A-Z])[ \t]+([a-z]+)',join,flow)
  page.close()
  if (i+1)%50==0:print('Reindexed source page '+str(i+1),flush=True)
p.write_text(json.dumps(ref,ensure_ascii=False),encoding='utf-8')
print('Saved coordinate-ordered rule source for '+str(len(ref['pages']))+' pages',flush=True)
