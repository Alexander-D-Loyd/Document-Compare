import {selectedEntityAuthority} from './style-selected-entity-authority.mjs';
import {lcbSourceReviewRows} from './style-lcb-source-review.mjs';

// A dataset hash establishes provenance, not complete authority. In particular
// a small licensed/imported subset must not remove the dictionary limitation.
export function lcbReviewReadiness(references,{authority=null,entityAuthority=null}={}){
 const pages=references?.lcb?.pages||[],entity=selectedEntityAuthority(entityAuthority),rows=lcbSourceReviewRows(references?.lcb);
 return {
  sourcePages:pages.map(p=>p.page),lexicalSourceRows:rows.filter(r=>r.id.startsWith('lcb-source-')).length,endWordSourceRows:rows.filter(r=>r.page===15).length,
  entitySource:{file:entity.source.file||entity.source.inputFile,sha256:entity.source.sha256||entity.source.datasetId,entries:entity.entries.length,eligible:entity.entries.filter(e=>e.checkEligible).length,readerReview:entity.entries.filter(e=>!e.checkEligible).length},
  dictionary:{availableSubset:true,importedSubset:!!authority,completeOrderedAuthority:false,reason:authority?'The selected spelling import checks only its listed entries; it does not certify the complete ordered dictionary or senses.':'The complete ordered Merriam-Webster editions specified by LCB are unavailable. Ordinary spelling checks and the bundled preference subset do not verify every first-listed spelling.'},
  supplementaryCitationAuthority:{complete:false,selectedForms:['Reporter abbreviation spacing','Full-case year placement','Parenthetical code separator','Code citations using supra','Unresolved Id./Ibid. reference chains'],reason:'Selected LCB forms and source-verified California Style Manual citation checks run for explicit Opinion/Cover letter selections. Case identity, pinpoint accuracy, publication status, typography and complete supplementary citation coverage remain unverified.'},
  wholeRuleCertification:false,
  warning:'LCB reader review is enabled. Complete dictionary-preference verification is unavailable and supplementary citation authority is incomplete; findings do not certify full LCB compliance.'
 };
}
