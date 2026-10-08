import json,pdfplumber
from pathlib import Path
base=Path(__file__).resolve().parents[1]/'app/data';ref=json.loads((base/'lcb-reference.json').read_text(encoding='utf-8'))
for page in ref['pages']:
 if page['page'] in [3,4,5,9,10,11,12,13,14,18,19,20]:
  page['lexicalEntries']=[]
with pdfplumber.open(base/'lcb-stylemanual-2019.pdf') as pdf:
 for record in ref['pages']:
  if 'lexicalEntries' not in record:continue
  p=pdf.pages[record['page']-1]
  for left,right in [(80,315),(335,535)]:
   words=p.crop((left,65,right,735)).extract_words();lines=[]
   for word in sorted(words,key=lambda w:(round(w['top'],1),w['x0'])):
    if not lines or abs(word['top']-lines[-1]['top'])>1:lines.append({'top':word['top'],'words':[]})
    lines[-1]['words'].append(word)
   previous=None;entry=[]
   for line in lines:
    if previous is not None and line['top']-previous>17:
     record['lexicalEntries'].append(' '.join(entry));entry=[]
    entry.append(' '.join(w['text'] for w in sorted(line['words'],key=lambda w:w['x0'])))
    previous=line['top']
   if entry:record['lexicalEntries'].append(' '.join(entry))
  print(record['page'],len(record['lexicalEntries']))
ref['lexicalEntryExtraction']={'method':'Source column coordinates and paragraph spacing; wrapped lines retained with their entry','columns':[[80,315],[335,535]],'top':65,'bottom':735,'newParagraphGap':17}
(base/'lcb-reference.json').write_text(json.dumps(ref,ensure_ascii=False),encoding='utf-8')
(base/'lcb-geometry-entries.json').write_text(json.dumps({p['page']:p['lexicalEntries'] for p in ref['pages'] if 'lexicalEntries' in p},ensure_ascii=False,indent=2),encoding='utf-8')
