"""Actual bundled spaCy controls; run with the staged Python runtime.

This checks bounded AB 76 false-positive and duplicate reproductions, not
office accuracy or general understanding of compound meaning.
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
def general(text):
 return [(text[i['start']:i['end']],i['head'],i['reviewVariant'])for i in finder.candidates(nlp(text))if i['engineRule']=='LCB_GENERAL_UNIT_MODIFIER_REVIEW']
class ModifierPrecision(unittest.TestCase):
 def test_actual_greenhouse_emissions_noun_is_open(self):
  text='The agency uses land for demonstration, exhibition, or educational purposes related to greenhouse gas emissions.'
  self.assertNotIn(('greenhouse gas','emissions','noun-sequence'),general(text))
 def test_greenhouse_protection_does_not_hide_gas_free_modifier(self):
  found=general('The agency requires greenhouse gas free equipment.')
  self.assertTrue(any(term=='gas free'for term,head,variant in found),found)
 def test_other_open_noun_questions_remain_available(self):
  self.assertIn(('information security','policies','noun-sequence'),general('The agency requires information security policies.'))
  self.assertIn(('student loan repayment','procedures','noun-sequence'),general('The agency develops student loan repayment procedures.'))
 def test_actual_sectional_prefix_is_one_complete_question(self):
  found=general('The land is subject to a sectional planning area document.')
  self.assertIn(('sectional planning area','document','qualified-noun-prefix'),found)
  self.assertNotIn(('planning area','document','noun-sequence'),found)
 def test_larger_same_head_prefix_keeps_full_evidence(self):
  text='The agency reviews the sectional planning area document plan.';found=general(text)
  self.assertIn(('sectional planning area document','plan','qualified-noun-prefix'),found)
  self.assertNotIn(('planning area document','plan','noun-sequence'),found)
 def test_independent_source_heads_stay_independent(self):
  found=general('The agency reviews sectional planning area documents and information security policies.')
  self.assertTrue(any(head=='documents'for term,head,variant in found),found)
  self.assertTrue(any(head=='policies'for term,head,variant in found),found)
 def test_participle_modifier_questions_and_listed_corrections_remain(self):
  text='The agency requires person centered planning practices. The agency requires data sharing agreements.';issues=list(finder.candidates(nlp(text)))
  self.assertTrue(any(text[i['start']:i['end']]=='person centered'for i in issues))
  self.assertTrue(any(i.get('suggestion')=='data-sharing'for i in issues))
 def test_qualified_prefix_retains_complete_role_and_sentence_coordinates(self):
  text='The land is subject to a sectional planning area document.';issues=list(finder.candidates(nlp(text)))
  item=next(i for i in issues if i.get('reviewVariant')=='qualified-noun-prefix')
  self.assertEqual(text[item['headStart']:item['headEnd']],'document')
  self.assertEqual(text[item['evidenceStart']:item['evidenceEnd']],text)
  self.assertEqual([c['text']for c in item['nounRoleEvidence']['components']],['sectional','planning','area'])
  for c in item['nounRoleEvidence']['components']:
   self.assertEqual(text[c['start']:c['end']],c['text']);self.assertEqual(text[c['headStart']:c['headEnd']],c['headText'])
 def test_postnominal_issued_clause_does_not_modify_function_word(self):
  text='Provide the applicant’s valid seller’s permit number issued pursuant to Part 1 of Division 2 of the Revenue and Taxation Code or indicate that the applicant is currently applying for a seller’s permit.'
  self.assertNotIn(('number issued','pursuant','open-modifier'),general(text))
 def test_explicit_provider_recipient_does_not_form_authority_valid_compound(self):
  text='The person provides the licensing authority valid documentation of their registration with the United States Drug Enforcement Administration and the location where the activity will be performed prior to engaging in the activity.'
  self.assertFalse(any(head=='documentation'for term,head,variant in general(text)),general(text))
 def test_singular_prepositional_recipient_is_separate_from_plural_records(self):
  text='Notwithstanding any other law, a licensing authority may request and receive from a local or state agency certified records of all arrests and convictions, certified records regarding probation, and any and all other related documentation needed to complete an applicant or licensee investigation.'
  self.assertNotIn(('agency certified','records','open-modifier'),general(text))
 def test_complete_agency_certified_modifier_without_prepositional_recipient_remains(self):
  text='The licensing authority requires agency certified records.'
  self.assertIn(('agency certified','records','open-modifier'),general(text))
 def test_singular_final_head_does_not_satisfy_plural_object_boundary(self):
  text='The licensing authority receives a copy from a local agency certified laboratory.'
  self.assertIn(('agency certified','laboratory','open-modifier'),general(text))
 def test_ordinary_adjective_compounds_and_unfamiliar_roles_are_not_blanket_disabled(self):
  for text in ['The agency requires gas free equipment.','The office provides authority certified documentation.','The agency requires community based services.','The agency requires person centered planning practices.']:
   self.assertTrue(general(text),text)
if __name__=='__main__':unittest.main()
