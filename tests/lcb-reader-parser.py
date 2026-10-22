"""Fresh bundled-parser evidence for the explicitly enabled LCB reader layer."""
import json,importlib.util,os
from pathlib import Path
os.environ.update(OMP_NUM_THREADS='1',OPENBLAS_NUM_THREADS='1',BLIS_NUM_THREADS='1')
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('lcb_parser',root/'engines/lcb_parser.py')
parser=importlib.util.module_from_spec(spec);spec.loader.exec_module(parser)
import spacy
nlp=spacy.load('en_core_web_sm',exclude=['ner'])
texts=[
 'The agency uses risk adjustment algorithms.',
 'The department requires information security policies.',
 'The office maintains public health assessment records.',
 'The interface is signal-driven.',
 'The interface remains signal-driven and evidence-based.',
 'The equipment, signal-driven, remains available.',
 'The documents, school-related, are retained.',
 'The documents that are school-related are retained.',
 'The agency uses land for demonstration, exhibition, or educational purposes related to greenhouse gas emissions.',
 'The office shall provide the licensing authority valid documentation.',
 'The panel considers fast growing woodpeckers.',
 'The panel considers sugar free beverages.',
 'The panel considers newly developed prototypes.',
 'The panel considers newly-developed prototypes.',
 'The agency evaluates fast growing or slow moving organisms.',
 'The agency evaluates fast growing and sugar free organisms.',
 'The agency evaluates locally developed and widely distributed prototypes.',
 'The agency evaluates locally-developed and widely-distributed prototypes.',
 'The agency studies treatment risks and weather warning signals.',
 'The agency evaluates low temperature high pressure reactors.',
 'The agency evaluates fast growing, slow moving, and sugar free organisms.',
 'The agency evaluates risk adjustment algorithms.',
 'The agency reports staff training improves outcomes.',
 'The agency reports staff training improves.',
 'The agency evaluates ordinary and slow moving organisms.',
 'The agency evaluates slow moving and ordinary organisms.',
 'The agency evaluates ordinary and familiar organisms.',
]
rows=[]
rules=json.loads((root/'engines/language-config.json').read_text(encoding='utf-8'))['lcbModifiers']
listed=parser.ListedModifierParser(rules)
for text in texts:
 doc=nlp(text)
 candidates=list(parser.lcb_reader_review_candidates(doc,nlp.get_pipe('tagger')))
 assert all(c['suggestion'] is None and c['reviewSuggested'] for c in candidates)
 assert not any(c['engineRule'] not in ['LCB_GENERAL_UNIT_MODIFIER_REVIEW','LCB_ATTRIBUTIVE_PHRASE_REVIEW','LCB_GROUPED_MODIFIER_REVIEW','LCB_AMBIGUOUS_MODIFIER_HEAD_REVIEW',parser.PREDICATE_COMPOUND_RULE,parser.POSTNOMINAL_COMPOUND_RULE] for c in candidates)
 assert not any(c.get('reviewSuggested') for c in listed.candidates(doc)), 'Ordinary style mode must retain its exact-only contract.'
 rows.append({'text':text,'candidates':candidates})
assert any(c['engineRule']=='LCB_GENERAL_UNIT_MODIFIER_REVIEW' for r in rows for c in r['candidates'])
assert any(c['engineRule']==parser.PREDICATE_COMPOUND_RULE for r in rows for c in r['candidates'])
assert any(c['engineRule']==parser.POSTNOMINAL_COMPOUND_RULE for r in rows for c in r['candidates'])
assert not any(c.get('head')=='emissions' for c in rows[8]['candidates'])
assert not rows[9]['candidates'], 'An independent recipient object is not a unit modifier.'
print(json.dumps(rows,ensure_ascii=True))
