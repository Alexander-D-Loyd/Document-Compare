import {validateListedModifierWitness} from './offline-style.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {sourceNameRanges} from './style-source-names.mjs';
import {OFFLINE_MODIFIERS}from './offline-rules.mjs';
import {openIncomeQualifierBefore}from './style-income-qualifiers.mjs';
import {inStatePrepositionalEvidence}from './style-in-state-evidence.mjs';
import {nonNominalModifierHeadEvidence}from './style-modifier-head-evidence.mjs';
import {mapLcbReaderCandidate,isLcbReaderCandidate} from './style-lcb-parser-review.mjs';
export function listedModifierSelection(rule,text){
 const words=text.split(/[\s-]+/u),expected=rule.preferred.split('-');
 if(words.length!==expected.length)return null;
 for(let n=0;n<words.length;n++){
  const word=words[n].replaceAll("'",'’'),wanted=expected[n];
  if(word.toLowerCase()!==wanted.toLowerCase())return null;
  // Preserve listed proper components such as English, and ordinary initial
  // capitalization. Other mixed/all-capital components can be a title.
  if(word!==wanted&&word!==wanted.toLowerCase()&&!(n===0&&word===wanted[0].toUpperCase()+wanted.slice(1)))return null;
 }
 const normalized=text.replace(/\s+/gu,' ').replace(/\s*-\s*/gu,'-').replaceAll("'",'’');
 if(normalized[0].toLowerCase()+normalized.slice(1)===rule.preferred)return null;
 return /^[A-Z]/u.test(words[0])?rule.preferred[0].toUpperCase()+rule.preferred.slice(1):rule.preferred;
}
const lowerNominalWord="[\\p{Ll}][\\p{Ll}\\p{M}\\p{N}'’]*",acronymWord='[A-Z]{2,}s?',nominalWord='(?:'+lowerNominalWord+'|'+acronymWord+')',nominalGap=new RegExp('^\\s+(?:'+nominalWord+'(?:-'+nominalWord+')*\\s+)*$','u'),nominalHead=new RegExp('^(?:'+lowerNominalWord+'|'+acronymWord+')$','u');
// Analysis text is a separate view. Neither PDF display nor comparison text
// is changed. Every reported UTF-16 offset must map back to original evidence.
export function prepareOfflineLanguage(doc){
 const joined=styleWordDivisionView(doc),review=joined?.doc||doc,ctx=styleContext(review),chars=ctx.source.split('');
 const masks=[...ctx.literalRanges,...[...ctx.source.matchAll(/(?<![\p{L}\p{N}\p{M}_])(?:‘[^’]*’|'[^']*')/gu)].map(m=>({start:m.index,end:m.index+m[0].length})),...review.blocks.filter(b=>ctx.at(b.start)==='Heading'||ctx.tableAt(b.start)).map(b=>({start:b.start,end:b.end}))];
 for(const r of masks)for(let n=r.start;n<r.end;n++)if(chars[n]!=='\n')chars[n]=' ';
 // Some PDF fonts expose isolated UTF-16 surrogate code units. They are not
 // usable language evidence. Mask only the analysis copy and reject sentences
 // relying on those source characters; valid astral characters stay intact.
 for(const m of chars.join('').matchAll(/[\uD800-\uDFFF]/gu))chars[m.index]=' ';
 const source=chars.join(''),segments=[],parts=[];let length=0;
 const firstEvidenceBlock=review.blocks.find(b=>ctx.at(b.start)!=='Heading'&&!ctx.tableAt(b.start));
 const evidenceFloor=firstEvidenceBlock?firstEvidenceBlock.start+(firstEvidenceBlock.margin?.length||0):source.length;
 for(const m of source.matchAll(/\s+|\S+/gu)){
  const whitespace=/^\s/u.test(m[0]),value=whitespace?' ':m[0];
  if(whitespace&&!parts.length&&m.index+m[0].length<=evidenceFloor)continue;
  segments.push({start:length,end:length+value.length,viewStart:whitespace&&!parts.length?Math.max(m.index,evidenceFloor):m.index,viewEnd:m.index+m[0].length,whitespace});parts.push(value);length+=value.length;
 }
 const text=parts.join(''),sourceOffset=(at,end=false)=>{
  let lo=0,hi=segments.length;
  while(lo<hi){const mid=(lo+hi)>>1;if(end?segments[mid].end<at:segments[mid].end<=at)lo=mid+1;else hi=mid;}
  const s=segments[lo];if(!s||at<s.start||at>s.end)return null;
  const view=s.whitespace?(end?s.viewEnd:s.viewStart):s.viewStart+at-s.start;
  return joined?joined.toSource(view,end):view;
 };
 const range=(a,b)=>{if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b>text.length||b<=a)return null;const start=sourceOffset(a),end=sourceOffset(b,true);return start!==null&&end!==null&&end>start?{start,end}:null;};
 // A hard chunk split cannot supply positive sentence evidence at its edge.
 const endings=[];
 for(let at=0;at<text.length;at++){
  if(!/[.!?]/.test(text[at]))continue;
  if(text[at]==='.'&&((/\d/.test(text[at-1]||'')&&/\d/.test(text[at+1]||''))||/\b(?:SEC|Sec|No|Mr|Mrs|Ms|Dr|St|U|S|a|p|m|e|g|i)\.$/.test(text.slice(Math.max(0,at-10),at+1))))continue;
  if(at+1===text.length||/\s/.test(text[at+1]))endings.push(at+1);
 }
 const chunks=[];let start=0,completeStart=true,endingIndex=0;
 while(start<text.length){
  const limit=Math.min(start+11000,text.length);let end=limit,completeEnd=end===text.length;
  while(endingIndex<endings.length&&endings[endingIndex]<=start)endingIndex++;
  if(!completeEnd){let n=endingIndex;while(n<endings.length&&endings[n]<=limit)n++;if(n>endingIndex){end=endings[n-1];completeEnd=true;}else{const gap=text.lastIndexOf(' ',limit);if(gap>start)end=gap;else if(/[\uD800-\uDBFF]/.test(text[end-1]))end--;}}
  chunks.push({text:text.slice(start,end),start,completeStart,completeEnd});start=end;completeStart=completeEnd;
 }
 return {text,chunks,range};
}
export function mapOfflineIssues(doc,plan,raw,kind,{includeLcbReaderReview=false}={}){
 const ctx=styleContext(doc),blocked=styleEvidenceGuard(doc,ctx),names=sourceNameRanges(ctx.source),singles=[...ctx.source.matchAll(/(?<![\p{L}\p{N}\p{M}_])(?:‘[^’]*’|'[^']*')/gu)].map(m=>({start:m.index,end:m.index+m[0].length})),out=[];
 for(const issue of raw||[]){
  const reader=kind==='style'&&includeLcbReaderReview&&isLcbReaderCandidate(issue);
  if(!['grammar','style'].includes(kind)||kind==='style'&&!reader&&!OFFLINE_MODIFIERS.some(r=>r.engineRule===issue.engineRule))continue;
  const selected=plan.range(issue.start,issue.end),evidence=plan.range(issue.evidenceStart,issue.evidenceEnd);
  if(!selected||!evidence||!plan.text.slice(issue.start,issue.end).trim()||selected.start<evidence.start||selected.end>evidence.end||/[\uD800-\uDFFF]/u.test(ctx.source.slice(evidence.start,evidence.end))||cutsOriginalStyleWord(doc,selected.start)||cutsOriginalStyleWord(doc,selected.end)||ctx.at(selected.start)==='Heading'||names.some(r=>r.start<selected.end&&r.end>selected.start))continue;
  const quotedEvidence=blocked(evidence.start,evidence.end)||singles.some(r=>r.start<evidence.end&&r.end>evidence.start);
  // Uncertain full sentence evidence cannot establish an applicable style
  // condition. No adjacent-noun or quotation fallback manufactures a flag.
  if(quotedEvidence)continue;
  if(reader){const question=mapLcbReaderCandidate(doc,plan,issue,selected,evidence);if(question)out.push(question);continue;}
  if(typeof issue.suggestion!=='string'||!issue.suggestion.trim())continue;
  if(kind==='grammar'){
   if(!['AGREEMENT_SENT_START','APOS_ARE','FEWER_LESS','SPACY_REQUIRED_INFINITIVE_REVIEW'].includes(issue.engineRule))continue;
   if(issue.engineRule==='SPACY_REQUIRED_INFINITIVE_REVIEW'){
    const phrase=plan.text.slice(issue.start,issue.end);
    if(!issue.reviewSuggested||issue.engine!=='spaCy'||! /^(?:required|obligated)\s+\p{Ll}+$/u.test(phrase)||issue.suggestion!==phrase.replace(/\s+/u,' to '))continue;
   }
   if(issue.engineRule==='FEWER_LESS'){
    const before=plan.text.slice(issue.evidenceStart,issue.start),after=plan.text.slice(issue.end,issue.evidenceEnd);
    // Numeric limit wording and subtraction of financial amounts are not
    // sufficient evidence for a count-noun correction. These protections
    // come from contextual review of the actual bill replay, not its counts.
    if(/(?:\d[\d,.]*|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:or\s+)?$/i.test(before)||/\bor\s+$/i.test(before)||/^\s+(?:refunds|payments|receipts|deductions|taxes|revenues|amounts|costs)\b/i.test(after))continue;
   }
   out.push({...selected,matchText:plan.text.slice(issue.start,issue.end),message:issue.message||'Possible grammar issue',suggestion:issue.suggestion,engine:issue.engineRule==='SPACY_REQUIRED_INFINITIVE_REVIEW'?'spaCy':'LanguageTool',engineRule:issue.engineRule,...(issue.engineRule==='SPACY_REQUIRED_INFINITIVE_REVIEW'?{reviewSuggested:true}: {})});
  }else{
   const head=plan.range(issue.headStart,issue.headEnd);
   const rule=OFFLINE_MODIFIERS.find(r=>r.engineRule===issue.engineRule);
   const role=validateListedModifierWitness(plan,issue,rule);if(!role)continue;
   const matchText=plan.text.slice(issue.start,issue.end),suggestion=listedModifierSelection(rule,matchText);
   if(!suggestion||!head||head.start<selected.end||head.end>evidence.end||!nominalGap.test(plan.text.slice(issue.end,issue.headStart))||!nominalHead.test(issue.head)||plan.text.slice(issue.headStart,issue.headEnd)!==issue.head||blocked(selected.start,head.end)||singles.some(r=>r.start<head.end&&r.end>selected.start))continue;
   if(rule?.preferred==='low-income'&&openIncomeQualifierBefore(plan.text,issue.start))continue;
   if(rule?.engineRule==='LCB_IN_STATE_MODIFIER'&&inStatePrepositionalEvidence(doc,ctx,selected.start,selected.end,head.end))continue;
   if(nonNominalModifierHeadEvidence(doc,ctx,head))continue;
   // styleSource normalizes dash glyphs for existing rules. A body em/en dash
   // must not become a missing component hyphen; identified heads stay masked.
   if([...doc.text.slice(selected.start,selected.end).matchAll(/[\u2012-\u2015]/gu)].some(m=>ctx.source[selected.start+m.index]==='-'))continue;
   const mapRole=r=>{const span=plan.range(r.start,r.end),parent=plan.range(r.headStart,r.headEnd);return span&&parent?{...r,...span,headStart:parent.start,headEnd:parent.end,sourceText:doc.text.slice(span.start,span.end)}:null;};
   const components=role.components.map(mapRole),mappedHead=mapRole(role.head),predicate=mapRole(role.predicate),auxiliaries=role.predicate.finiteAuxiliaries.map(mapRole);
   if(components.some(r=>!r)||!mappedHead||!predicate||auxiliaries.some(r=>!r))continue;
   out.push({...selected,text:doc.text.slice(selected.start,selected.end),matchText,suggestion,evidenceStart:evidence.start,evidenceEnd:evidence.end,engine:'spaCy',engineRule:issue.engineRule,head:issue.head,reviewSuggested:false,attachmentMethod:'direct',modifierRoleEvidence:{kind:role.kind,components,head:mappedHead,predicate:{...predicate,finiteAuxiliaries:auxiliaries}}});
  }
 }
 return out;
}
export function mergeOfflineGrammar(local,additional){
 const result=[...local];for(const issue of additional)if(!result.some(r=>r.start<issue.end&&r.end>issue.start))result.push(issue);
 return result.sort((a,b)=>a.start-b.start||a.end-b.end).map((issue,id)=>({...issue,id}));
}
export async function reviewOfflineLanguage(doc,kind,id,bridge=globalThis.offlineLanguage,{includeLcbReaderReview=false}={}){
 if(!bridge?.review)return {issues:[],warning:'Additional offline language checks are unavailable; existing checks were used.'};
 try{
  const plan=prepareOfflineLanguage(doc),result=await bridge.review(id,kind,plan.chunks,{includeLcbReaderReview});
  if(result.cancelled)return {cancelled:true,issues:[]};
  if(result.error)return {issues:[],warning:result.error};
  return {issues:mapOfflineIssues(doc,plan,result.issues,kind,{includeLcbReaderReview})};
 }catch{return {issues:[],warning:'Additional offline language checks could not finish; existing checks were used.'};}
}
export function cancelOfflineLanguage(id){if(id)try{globalThis.offlineLanguage?.cancel(id)?.catch(()=>{});}catch{}}
