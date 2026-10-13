"""Actual bundled spaCy controls; run with the staged Python runtime.

This checks quiet AB 76/AB 8 reproductions plus exact printed modifier
controls after removal of speculative production families. Not office recall.
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
 def test_unlisted_gas_free_phrase_cannot_become_a_modifier_question(self):
  found=general('The agency requires greenhouse gas free equipment.')
  self.assertEqual(found,[])
 def test_other_ordinary_open_noun_sequences_are_quiet(self):
  self.assertEqual(general('The agency requires information security policies.'),[])
  self.assertEqual(general('The agency develops student loan repayment procedures.'),[])
 def test_actual_sectional_prefix_produces_no_speculative_question(self):
  found=general('The land is subject to a sectional planning area document.')
  self.assertEqual(found,[])
 def test_larger_same_head_prefix_stays_quiet_without_lexical_authority(self):
  text='The agency reviews the sectional planning area document plan.';found=general(text)
  self.assertEqual(found,[])
 def test_independent_printed_source_heads_keep_independent_candidates(self):
  found=general('The agency reviews sectional planning area documents and information security policies.')
  self.assertEqual(found,[])
  precise=list(finder.candidates(nlp('The agency requires data processing systems and high quality programs.')))
  self.assertEqual({i['head']for i in precise},{'systems','programs'})
 def test_unlisted_participle_and_data_sharing_are_quiet_but_printed_data_processing_remains(self):
  text='The agency requires person centered planning practices. The agency requires data sharing agreements. The agency requires data processing systems.';issues=list(finder.candidates(nlp(text)))
  self.assertEqual([i['suggestion']for i in issues],['data-processing'])
 def test_printed_candidate_retains_complete_role_and_sentence_coordinates(self):
  text='The agency requires data processing systems.';issues=list(finder.candidates(nlp(text)))
  item=issues[0]
  self.assertEqual(text[item['headStart']:item['headEnd']],'systems')
  self.assertEqual(text[item['evidenceStart']:item['evidenceEnd']],text)
  self.assertEqual([c['text']for c in item['modifierRoleEvidence']['components']],['data','processing'])
  for c in item['modifierRoleEvidence']['components']:
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
 def test_complete_unlisted_agency_certified_phrase_stays_quiet(self):
  text='The licensing authority requires agency certified records.'
  self.assertEqual(general(text),[])
 def test_singular_unlisted_agency_certified_phrase_stays_quiet(self):
  text='The licensing authority receives a copy from a local agency certified laboratory.'
  self.assertEqual(general(text),[])
 def test_unfamiliar_adjective_roles_are_quiet_and_exact_printed_roles_still_work(self):
  for text in ['The agency requires gas free equipment.','The office provides authority certified documentation.','The agency requires community based services.','The agency requires person centered planning practices.']:
   self.assertEqual(general(text),[],text)
  self.assertTrue(any(i['suggestion']=='board-approved'for i in finder.candidates(nlp('The agency requires board approved programs.'))))
if __name__=='__main__':unittest.main()
