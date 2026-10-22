"""Fresh direct-role candidates for finite source-canonical calibration."""
import importlib.util,json,os
from pathlib import Path
os.environ.update(OMP_NUM_THREADS='1',OPENBLAS_NUM_THREADS='1',BLIS_NUM_THREADS='1')
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('lcb_parser',root/'engines/lcb_parser.py')
parser=importlib.util.module_from_spec(spec);spec.loader.exec_module(parser)
import spacy
nlp=spacy.load('en_core_web_sm',exclude=['ner'])
texts=[
 'The agency evaluates health care policies.',
 'The agency employs full-time workers.',
 'The agency employs part-time workers.',
 'The agency purchases low-income housing.',
 'The agency retains long-term records.',
 'The agency supports short-term projects.',
 'The agency operates load-serving entities.',
 'The agency evaluates public health policies.',
 'The agency operates community-based programs.',
 'The agency schedules one-time payments.',
 'The agency evaluates health care service plans.',
 'The agency evaluates full-time and part-time employees.',
 'The employees remain full-time.',
 'The agency evaluates newly-developed prototypes.',
 'The agency supports health-care providers.',
 'The agency employs full time workers.',
 'The agency employs part time workers.',
 'The agency establishes cost of living adjustments.',
 'The agency establishes cost-of-living adjustments.',
 'The agency has to ensure health care access.',
]
print(json.dumps([{'text':text,'candidates':list(parser.lcb_reader_review_candidates(nlp(text),nlp.get_pipe('tagger')))}for text in texts],ensure_ascii=True))
