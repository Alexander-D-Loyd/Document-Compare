"""Production modifier eligibility controls using the actual bundled spaCy model.

These verify source-listed spelling and proved local attributive roles only;
they do not measure office accuracy or certify every lexical form's recall.
"""
import os,json,importlib.util,unittest
from pathlib import Path
os.environ.update(OMP_NUM_THREADS='1',OPENBLAS_NUM_THREADS='1',BLIS_NUM_THREADS='1')
source=Path(__file__).resolve().parents[1]/'engines/lcb_parser.py'
spec=importlib.util.spec_from_file_location('lcb_parser',source);parser=importlib.util.module_from_spec(spec);spec.loader.exec_module(parser)
import spacy
nlp=spacy.load('en_core_web_sm',exclude=['ner'])
rules=json.loads((source.parent/'language-config.json').read_text(encoding='utf-8'))['lcbModifiers']
finder=parser.ListedModifierParser(rules)
def candidates(text):return list(finder.candidates(nlp(text)))
class ModifierEligibility(unittest.TestCase):
 def test_registry_contains_only75_printed_forms(self):
  self.assertEqual(len(rules),75)
  self.assertFalse(any(r['engineRule']=='LCB_DATA_SHARING_MODIFIER'for r in rules))
 def test_unlisted_or_general_unit_modifier_questions_are_not_generated(self):
  for text in ['The social media platforms cause injuries.','The agency uses information technology systems.','The agency receives quality assurance standards.','The law enforcement agency applies.','The agency develops student loan repayment procedures.','The land is subject to a sectional planning area document.','The agency requires person centered planning practices.','The agency requires gas free equipment.','The agency requires authority certified documentation.','The agency requires data sharing agreements.','The loan is short-term.','The program was board-approved.']:
   self.assertEqual(candidates(text),[],text)
 def test_explicit_listed_attributive_roles_remain(self):
  for text,preferred in [('The agency develops a cost effective plan.','cost-effective'),('The agency requires high quality programs.','high-quality'),('The agency requires data processing systems.','data-processing'),('The agency requires board approved programs.','board-approved'),('The agency supports low income households.','low-income'),('The agency requires full time staff.','full-time'),('The agency says data processing supplies are used.','data-processing')]:
   found=candidates(text);self.assertTrue(any(i['suggestion']==preferred for i in found),(text,found))
   for item in found:self.assertIs(item['reviewSuggested'],False);self.assertEqual(item['attachmentMethod'],'direct')
 def test_whole_source_role_witnesses_are_supplied(self):
  text='The agency requires data processing systems.';item=candidates(text)[0];proof=item['modifierRoleEvidence']
  self.assertEqual(proof['kind'],'exact-listed-attributive');self.assertEqual(len(proof['components']),2)
  self.assertEqual(text[proof['head']['start']:proof['head']['end']],'systems')
  self.assertEqual(text[proof['predicate']['start']:proof['predicate']['end']],'requires')
  for r in [*proof['components'],proof['head'],proof['predicate'],*proof['predicate']['finiteAuxiliaries']]:
   self.assertEqual(text[r['start']:r['end']],r['text']);self.assertEqual(text[r['headStart']:r['headEnd']],r['headText'])
 def test_no_verb_subject_object_or_reporting_fallback(self):
  for text in ['The board approved programs.','The agency confirms the board approved programs.','The agency knows the school based its decision on the report.','The programs are board approved.','The people working at risk are eligible.']:
   self.assertEqual(candidates(text),[],text)
 def test_missing_attachment_or_intervening_nominal_sequence_is_quiet(self):
  for text in ['The agency requires a state of the art system.','The agency requires high quality safety systems.','The agency requires data processing professional standards.']:
   self.assertEqual(candidates(text),[],text)
 def test_correct_printed_forms_are_unchanged(self):
  for text in ['The agency develops a cost-effective plan.','The agency requires data-processing systems.','The agency requires board-approved programs.','The agency requires high-quality programs.']:
   self.assertEqual(candidates(text),[],text)
 def test_original_boundaries_and_partial_larger_compounds_are_quiet(self):
  for text in ['The agency requires édata processing systems.','The agency requires data processingé systems.','The agency requires non-data processing systems.','The agency requires data processing-based systems.']:
   self.assertEqual(candidates(text),[],text)
if __name__=='__main__':unittest.main()
