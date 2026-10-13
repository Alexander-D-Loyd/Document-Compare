import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {styleEvidenceGuard} from './style-evidence.mjs';

export const STYLE_REVIEW_SCOPE='Style findings require an explicit LCB or GPO provision and a supported context. Grammar and spelling remain separate language checks. General compound guesses, fuzzy name comparisons and inferred legal targets are disabled.';
export const STYLE_EXCEPTION_SUMMARY='Quoted wording is respected within this bill. Literal quotations, legislative identifiers, names, deleted text and table contexts retain their applicable protections. LCB takes priority when its applicable provision differs from GPO.';
const titleChecks=new Set(['lcb-created-title-reference-review','lcb-created-official-title-review','lcb-created-title-identity-review','lcb-designated-title-reference-review','lcb-designated-title-creation-review','lcb-created-public-entity-creation-review','lcb-created-public-entity-reference-review','lcb-official-head-title-review']);
const tableChecks=new Set(['table-figures','lcb-table-cell-figures','lcb-table-cell-review']);
const quoteBoundaryRules=new Set(['Punctuation: Quotation Marks','8.120']);
export function styleNameProtected(issue,names,source=null){
 const text=source===null?issue.matchText||issue.text:source.slice(issue.start,issue.end);
 const normalized=value=>value.replace(/\s+/gu,' ').replace(/\s*-\s*/gu,'-').replace(/[’']/gu,"'").trim();
 const current=normalized(text||''),wanted=typeof issue.suggestion==='string'?normalized(issue.suggestion):'';
 const preservesCapitals=[...current].every((c,n)=>c===c.toLowerCase()||wanted[n]!==wanted[n]?.toLowerCase());
 const exactCase=issue.checkId==='capitalization'&&/^[A-Z]/u.test(wanted)&&current.toLowerCase()===wanted.toLowerCase()&&preservesCapitals;
 return issue.checkId!=='california-entities'&&!exactCase&&!titleChecks.has(issue.checkId)&&!printedNameWitness(issue,source)&&names.some(r=>r.start<issue.end&&r.end>issue.start);
}
function printedNameWitness(issue,source){
 const e=issue.listedNameEvidence;
 return issue.checkId==='lcb-listed-punctuation-name'&&e?.sourcePage===7&&['Public Employees’ Retirement System','State Teachers’ Retirement System'].includes(e.printedName)&&Number.isInteger(e.start)&&Number.isInteger(e.end)&&e.start<=issue.start&&e.end>=issue.end&&typeof e.sourceText==='string'&&(source===null||source.slice(e.start,e.end)===e.sourceText)&&issue.references?.some(r=>r.guideId==='lcb'&&r.guidePage===7);
}
// Shared final exceptions. Individual detectors must still establish their
// complete rule-specific condition before returning a finding. This gate
// cannot turn a parser attachment or a source citation into applicability.
export function styleFindingPolicy(doc,{context,names=[],conflictRanges=[]}){
 const quoted=billQuotedTermProtection(doc,context);
 const sourceBlocked=styleEvidenceGuard(doc,{...context,literalAt:()=>false,tableAt:()=>false});
 return issue=>{
  if(!Number.isInteger(issue.start)||!Number.isInteger(issue.end)||issue.start<0||issue.end>doc.text.length||issue.end<=issue.start)return false;
  if(!issue.references?.length||issue.references.some(r=>!['lcb','gpo'].includes(r.guideId)||!Number.isInteger(r.guidePage)||r.guidePage<1))return false;
  // A normalized style view cannot turn a visible body dash into a word join.
  const physical=doc.text.slice(issue.start,issue.end);
  const lexicalJoin=issue.references.some(r=>r.guideId==='lcb'&&r.guidePage>=8&&r.guidePage<=16)&&!issue.references.some(r=>r.guideId==='lcb'&&r.guidePage>=21);
  const bodyDashes=[...physical.matchAll(/[\u2012-\u2015]/gu)].filter(m=>context.source[issue.start+m.index]==='-').length;
  if(lexicalJoin&&typeof issue.suggestion==='string'&&bodyDashes>(issue.suggestion.match(/[\u2012-\u2015]/gu)||[]).length)return false;
  if(issue.conflict||quoted(issue)||context.technicalAt(issue.start,issue.end)||sourceBlocked(issue.start,issue.end))return false;
  if(!quoteBoundaryRules.has(issue.rule)&&context.wrappedLiteralRanges.some(r=>r.start<issue.end&&r.end>issue.start)&&!['lcb-designated-title-creation-review','lcb-fresh-definition-term-review'].includes(issue.checkId))return false;
  if(styleNameProtected(issue,names,context.source)||issue.checkId!=='california-entities'&&conflictRanges.some(r=>r.start<issue.end&&r.end>issue.start))return false;
  if(!tableChecks.has(issue.checkId)&&doc.blocks.some(b=>!b.ignored&&!b.runningHead&&!b.layoutLabel&&b.start<issue.end&&b.end>issue.start&&context.tableAt(b.start)))return false;
  return true;
 };
}
