"""Fresh parser evidence for fragment, interrupted and infinitival questions."""
import importlib.util,json,os
from pathlib import Path
os.environ.update(OMP_NUM_THREADS='1',OPENBLAS_NUM_THREADS='1',BLIS_NUM_THREADS='1')
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('lcb_parser',root/'engines/lcb_parser.py')
parser=importlib.util.module_from_spec(spec);spec.loader.exec_module(parser)
import spacy
nlp=spacy.load('en_core_web_sm',exclude=['ner'])
texts=[
 'Fast growing organisms.',
 'Information security policies.',
 'The agency evaluates fast growing and, in some cases, slow moving organisms.',
 'The agency evaluates easy to use interfaces.',
 'The agency evaluates difficult to replace equipment.',
 'It is difficult to replace equipment.',
 'The agency finds it difficult to replace equipment.',
 'The agency evaluates difficult to replace the equipment.',
 'The agency evaluates fishing licenses and, in some cases, fish processing permits.',
 'Ordinary familiar organisms.',
 'Newly developed prototypes.',
 'The agency evaluates fast growing and, the record shows, slow moving organisms.',
 'The agency evaluates ordinary and familiar organisms.',
 'The records look signal-driven.',
 'The process keeps staff well-informed.',
 'The agency considers the documents school-related.',
 'The documents, although apparently signal-driven, remain available.',
 'The agency wants the equipment to remain signal-driven.',
 'The equipment, signal-driven and newly-installed, remains available.',
 'The agency evaluates hard to obtain permits.',
 'The agency evaluates efficient but easy to use interfaces.',
 'Fast growing and slow moving organisms.',
 'The agency evaluates fast growing and, when available, slow moving organisms.',
 'The records look self-contained.',
 'The agency evaluates signal-driven equipment.',
 'The office remains decision-making.',
 'Fast-growing organisms.',
 'Newly-developed prototypes.',
 'The agency requires hard to obtain permits.',
 'The agency works hard to obtain permits.',
 'The agency requires difficult to replace equipment.',
 'The agency requires staff to obtain permits.',
 'The agency requires that staff obtain permits.',
 'The agency requires quickly to obtain permits.',
 'The agency expects soon to obtain permits.',
]
rows=[]
for text in texts:
 doc=nlp(text)
 rows.append({'text':text,'candidates':[c for c in parser.lcb_reader_review_candidates(doc,nlp.get_pipe('tagger'))if c['engineRule']==parser.UNRESOLVED_MODIFIER_STRUCTURE_RULE]})
print(json.dumps(rows,ensure_ascii=True))
