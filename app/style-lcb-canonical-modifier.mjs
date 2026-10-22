import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
const cache=new WeakMap();
const normalize=s=>s.replace(/\s+/gu,' ').replace(/\s*-\s*/gu,'-').trim();
const letters=s=>s.replace(/[ -]/gu,'');
function canonicalRows(reference){
 if(!reference?.pages)return new Map();if(cache.has(reference))return cache.get(reference);
 const grouped=new Map();
 for(const page of reference.pages)for(const entry of page.lexicalEntries||[]){
  const form=entry.split(' (')[0].trim();
  // Capitalization, alternatives, solid words and any meaning qualification
  // retain their existing checks. These rows settle only complete lower-case
  // spellings with an explicit source boundary and no semantic condition.
  if(!/^[a-z]+(?:[ -][a-z]+)+$/u.test(form))continue;
  const qualifier=entry.slice(form.length).trim(),key=letters(form),group=grouped.get(key)||[];
  group.push({form,page:page.page,entry,qualifier,unit:/^\((?:u\.m\.|n\., u\.m\.)\)$/u.test(qualifier)});grouped.set(key,group);
 }
 cache.set(reference,grouped);return grouped;
}
export function canonicalLcbModifierForm(candidate,references){
 const direct=candidate?.engine==='spaCy'&&candidate.reviewSuggested===true&&candidate.suggestion===null&&(candidate.engineRule==='LCB_GENERAL_UNIT_MODIFIER_REVIEW'&&candidate.nounRoleEvidence||candidate.engineRule==='LCB_ATTRIBUTIVE_PHRASE_REVIEW'&&candidate.attributiveSourceValidated===true);
 if(!direct||typeof candidate.matchText!=='string'||candidate.matchText!==candidate.matchText.toLowerCase()||![candidate.start,candidate.end,candidate.headStart,candidate.headEnd,candidate.evidenceStart,candidate.evidenceEnd].every(Number.isInteger)||candidate.start>=candidate.end||candidate.headStart<=candidate.end||candidate.headEnd<=candidate.headStart||candidate.evidenceStart>candidate.start||candidate.evidenceEnd<candidate.headEnd)return null;
 const term=normalize(candidate.matchText),group=canonicalRows(references?.lcb).get(letters(term));if(!group)return null;
 // A role-specific source prescription wins over a plain entry. In
 // particular "full time" cannot settle the spelling of "full time workers"
 // when the same table explicitly supplies "full-time (u.m.)".
 if(group.some(r=>r.qualifier&&!r.unit))return null;
 const unit=group.filter(r=>r.unit),eligible=unit.length?unit:group.filter(r=>!r.qualifier),row=eligible.find(r=>r.form===term);
 return row?{...row,guideId:'lcb',rule:row.entry,sourceCanonical:true}:null;
}
export function settledCanonicalModifierRanges(doc,references,engineIssues=[]){
 const ctx=styleContext(doc),blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),settled=[];
 for(const candidate of engineIssues){
  const row=canonicalLcbModifierForm(candidate,references);if(!row)continue;
  const {start,end,headStart,headEnd,evidenceStart,evidenceEnd}=candidate;
  if(blocked(evidenceStart,evidenceEnd)||literal(evidenceStart,evidenceEnd)||ctx.at(start)==='Heading'||ctx.tableAt(start)||[start,end,headStart,headEnd].some(at=>cutsOriginalStyleWord(doc,at))||normalize(ctx.source.slice(start,end))!==row.form||normalize(ctx.source.slice(headStart,headEnd))!==candidate.head||!/^\s+$/u.test(ctx.source.slice(end,headStart)))continue;
  if([...doc.text.slice(start,end).matchAll(/[\u2012-\u2015]/gu)].some(m=>ctx.source[start+m.index]!==' '))continue;
  // Noun-prefix records retain their complete mapped witnesses. Check that
  // none of those tokens or their parents refers to stale physical text.
  const proof=candidate.nounRoleEvidence;
  if(proof){
   if(!Array.isArray(proof.components)||proof.components.length<2||!proof.predicate||!Array.isArray(proof.predicate.finiteAuxiliaries))continue;
   const valid=r=>r&&Number.isInteger(r.start)&&Number.isInteger(r.end)&&r.start>=evidenceStart&&r.end<=evidenceEnd&&r.start<r.end&&doc.text.slice(r.start,r.end)===r.text&&normalize(ctx.source.slice(r.start,r.end))===(r.parsedText||r.text);
   if(!proof.components.every(r=>valid(r)&&Number.isInteger(r.headStart)&&Number.isInteger(r.headEnd)&&r.headStart>=evidenceStart&&r.headEnd<=evidenceEnd&&doc.text.slice(r.headStart,r.headEnd)===r.headText&&normalize(ctx.source.slice(r.headStart,r.headEnd))===(r.parsedHead||r.headText))||!valid(proof.predicate)||!proof.predicate.finiteAuxiliaries.every(valid))continue;
  }
  settled.push({start,end,sourcePage:row.page,sourceEntry:row.entry,sourceForm:row.form,role:'Validated direct before-head source form'});
 }
 return settled;
}
