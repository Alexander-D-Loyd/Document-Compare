import {mapCountRelationSource,validMappedCountRelation,sourceCountDetails}from './style-parsed-number-relations.mjs';
import {protectedCountUnit}from './style-coordinated-number-relations.mjs';
import {styleContext}from './style-context.mjs';
import {cutsOriginalStyleWord,styleEvidenceGuard}from './style-evidence.mjs';
import {numericExpressionGuard}from './style-numeric-expression-evidence.mjs';
import {writtenQuantityEvidenceGuard}from './style-written-quantity-evidence.mjs';
import {numeralIdentifierRanges}from './style-numeral-identifiers.mjs';
import {sourceNameRanges}from './style-source-names.mjs';
export const MIXED_COUNT_LIST_RULE='LCB_MIXED_COUNT_LIST_REVIEW';
export const MIXED_COUNT_LIST_SCOPE='Conditional offline review of source-complete lists with at least three directly attached complete counts, comma separators and an explicit final and/or/nor, when an intermediate common-noun head is parsed as apposition. Every count, qualifier gap, noun path to the shared nominal anchor, punctuation/conjunction role and full list separator is independently source-checked without an item-count cap. Ordinary explanatory apposition, unfinished or discontinuous lists, missing intermediate heads and unsupported postnominal qualifiers are insufficient. Whole numerical expressions, units along the selected paths, legal references, names, opening exceptions, digest conflicts, source exclusions, quotations and tables remain protected. Recognized word/page divisions restore all nested witnesses; prior precise/reader owners retain priority. The full list supports a reader question, not proof that the quantities have the same meaning or a required correction. Other parser shapes, implicit lists, complex rates, missing count attachments, unfamiliar units, semantic distinctions and chunk edges remain incomplete. This extends selected LCB21 Bill item3 checking, not whole-rule automation or office accuracy certification.';
const noun=/^\p{Ll}[\p{Ll}\p{M}]*$/u,gap=/^\s+(?:[\p{L}\p{M}]+(?:[-’'][\p{L}\p{M}]+)*\s+)*$/u;
const keys=['start','end','text','pos','tag','dep','lemma','headStart','headEnd','headText'];
const same=(a,b)=>a&&b&&keys.every(k=>a[k]===b[k]);
const overlap=(rows,a,b)=>rows.some(r=>r.start<b&&r.end>a);
function validList(proof,text,start,end,selectedMembers,syntaxText=text){
 const m=proof?.members,c=proof?.counts,p=proof?.paths,r=proof?.markers,s=proof?.separators;
 if(!Array.isArray(m)||m.length<3||![c,p,r].every(rows=>Array.isArray(rows)&&rows.length===m.length)||!Array.isArray(s)||s.length!==m.length-1||!Array.isArray(selectedMembers)||selectedMembers.length!==2)return false;
 const valid=n=>n&&[n.start,n.end,n.headStart,n.headEnd].every(Number.isInteger)&&n.start>=start&&n.end<=end&&n.start<n.end&&n.headStart>=start&&n.headEnd<=end&&n.headStart<n.headEnd&&text.slice(n.start,n.end)===n.text&&text.slice(n.headStart,n.headEnd)===n.headText;
 const heads=new Map(),nodes=new Map();let apposition=false;
 for(let k=0;k<m.length;k++){
  const member=m[k],path=p[k],cue=r[k],count=c[k];
  if(!member||![member.start,member.end,member.headStart,member.headEnd].every(Number.isInteger)||member.start<start||member.start>=member.end||member.end>member.headStart||member.headStart>=member.headEnd||member.headEnd>end||!noun.test(member.head)||!noun.test(member.lemma)||text.slice(member.start,member.end)!==member.sourceText||sourceCountDetails(member.sourceText)===null||text.slice(member.headStart,member.headEnd)!==member.head||!gap.test(text.slice(member.end,member.headStart))||heads.has(member.headStart))return false;
  if(!Array.isArray(path)||!path.length||!path.every(n=>valid(n)&&n.pos==='NOUN'&&noun.test(n.text)&&noun.test(n.lemma))||new Set(path.map(n=>n.start)).size!==path.length||!same(path.at(-1),p[0]?.at(-1))||path[0].start!==member.headStart||path[0].end!==member.headEnd||path[0].text!==member.head||path[0].lemma!==member.lemma||!valid(count)||count.pos!=='NUM'||count.dep!=='nummod'||count.start<member.start||count.end>member.end||count.headStart!==member.headStart||count.headEnd!==member.headEnd||count.headText!==member.head||!Array.isArray(cue)||cue.length!==path.length-1)return false;
  heads.set(member.headStart,member);
  for(const n of path){if(nodes.has(n.start)&&!same(nodes.get(n.start),n))return false;nodes.set(n.start,n);}
  for(let j=0;j<path.length-1;j++){
   const child=path[j],parent=path[j+1],mark=cue[j];
   if(!['conj','appos'].includes(child.dep)||child.headStart!==parent.start||child.headEnd!==parent.end||child.headText!==parent.text||parent.end>child.start||!valid(mark)||mark.start<parent.end||mark.end>child.start||mark.headStart!==parent.start||mark.headEnd!==parent.end||mark.headText!==parent.text||!(mark.pos==='PUNCT'&&mark.dep==='punct'&&mark.text===','||child.dep==='conj'&&mark.pos==='CCONJ'&&mark.dep==='cc'&&/^(?:and|or|nor)$/u.test(mark.text)))return false;
   if(child.dep==='appos')apposition=true;
  }
  if(k){const sep=s[k-1],previous=m[k-1],last=k===m.length-1;if(!sep||sep.start!==previous.headEnd||sep.end!==member.start||sep.start>=sep.end||text.slice(sep.start,sep.end)!==sep.text||!(last?/^(?:\s*,\s*|\s+)(?:and|or|nor)\s+$/u:/^\s*,\s*$/u).test(syntaxText.slice(sep.start,sep.end)))return false;}
 }
 if(!apposition||[...nodes.keys()].some(at=>!heads.has(at))||p.at(-1)[0].dep!=='conj'||r.at(-1)[0]?.dep!=='cc')return false;
 // The final grammatical cc witness must be the actual final separator.
 const final=r.at(-1)[0],lastSeparator=s.at(-1);if(final.start<lastSeparator.start||final.end>lastSeparator.end)return false;
 const indices=selectedMembers.map(sel=>m.findIndex(member=>['start','end','headStart','headEnd','head','lemma'].every(key=>member[key]===sel[key])));
 return indices.every(at=>at>=0)&&indices[0]!==indices[1]&&selectedMembers[0].lemma!==selectedMembers[1].lemma&&!indices.some(at=>p[at].some(n=>protectedCountUnit(n.lemma)));
}
function sourceMembersSafe(doc,proof){
 const ctx=styleContext(doc),numeric=numericExpressionGuard(doc,ctx),written=writtenQuantityEvidenceGuard(doc,ctx),identifiers=numeralIdentifierRanges(ctx.source),names=sourceNameRanges(ctx.source);
 return proof.members.every(m=>ctx.at(m.start)==='Bill'&&![m.start,m.end,m.headStart,m.headEnd].some(at=>cutsOriginalStyleWord(doc,at))&&!overlap(identifiers,m.start,m.headEnd)&&!overlap(names,m.start,m.headEnd)&&!(/^\d/u.test(m.sourceText)?numeric(m.start,m.end):written(m.start,m.end,m.headEnd)));
}
function mapList(proof,map,text){
 if(!proof||!Array.isArray(proof.members)||!Array.isArray(proof.counts)||!Array.isArray(proof.paths)||!Array.isArray(proof.markers)||!Array.isArray(proof.separators)||![...proof.paths,...proof.markers].every(Array.isArray))return null;
 const roles=[...proof.counts,...proof.paths.flat(),...proof.markers.flat()];if(!roles.every(r=>r&&[r.start,r.end,r.headStart,r.headEnd].every(Number.isInteger))||!proof.members.every(m=>m&&[m.start,m.end,m.headStart,m.headEnd].every(Number.isInteger))||!proof.separators.every(s=>s&&[s.start,s.end].every(Number.isInteger)))return null;
 const restore=r=>{const start=map(r.start),end=map(r.end,true),headStart=map(r.headStart),headEnd=map(r.headEnd,true);return {...r,start,end,text:text.slice(start,end),headStart,headEnd,headText:text.slice(headStart,headEnd)};};
 const members=proof.members.map(m=>{const start=map(m.start),end=map(m.end,true);return {...m,start,end,headStart:map(m.headStart),headEnd:map(m.headEnd,true),sourceText:text.slice(start,end)};});
 return {...proof,members,counts:proof.counts.map(restore),paths:proof.paths.map(rows=>rows.map(restore)),markers:proof.markers.map(rows=>rows.map(restore)),separators:proof.separators.map((s,k)=>{const start=members[k].headEnd,end=members[k+1].start;return {...s,start,end,text:text.slice(start,end)};})};
}
export const restoreMixedCountListEvidence=mapList;
export function mapMixedCountList(doc,plan,issue,selected,evidence){
 if(issue.engineRule!==MIXED_COUNT_LIST_RULE)return null;
 const selectedMembers=[{start:issue.start,end:issue.end,headStart:issue.headStart,headEnd:issue.headEnd,head:issue.head,lemma:issue.headLemma},{start:issue.peerStart,end:issue.peerEnd,headStart:issue.peerHeadStart,headEnd:issue.peerHeadEnd,head:issue.peerHead,lemma:issue.peerHeadLemma}];
 if(!validList(issue.mixedCountListEvidence,plan.text,issue.evidenceStart,issue.evidenceEnd,selectedMembers))return null;
 const result=mapCountRelationSource(doc,plan,issue,selected,evidence,{requireSameLemma:false});if(!result)return null;
 const point=(at,last=false)=>{const range=plan.range(last?at-1:at,last?at:at+1);return range?last?range.end:range.start:NaN;},proof=mapList(issue.mixedCountListEvidence,point,doc.text);if(!proof||!sourceMembersSafe(doc,proof))return null;
 return {...result,reviewKind:'mixed-count-list',mixedCountListEvidence:proof};
}
export function mixedCountListReviewIssues(candidates,doc,references,{existingIssues=[]}={}){
 const out=[];
 for(const i of candidates){
  if(i.engineRule!==MIXED_COUNT_LIST_RULE||i.reviewSuggested!==true||i.suggestion!==null||!validMappedCountRelation(i,doc,{requireSameLemma:false,reviewKind:'mixed-count-list'})||!validList(i.mixedCountListEvidence,doc.text,i.evidenceStart,i.evidenceEnd,i.relationshipEvidence.members,styleContext(doc).source)||styleEvidenceGuard(doc,styleContext(doc))(i.evidenceStart,i.evidenceEnd)||!sourceMembersSafe(doc,i.mixedCountListEvidence)||overlap([...existingIssues,...out],i.start,i.end))continue;
  out.push({...i,guideId:'lcb',guidePage:21,guidePrintedPage:String(references.lcb.pages[20].printedPage),rule:'Numerals: Bill, item 3',category:'Numerical Relationship Review',context:'Bill',confidence:'Review Suggested',conflict:false,matchesPrimary:false,checkId:'lcb-mixed-count-list-review',message:'Review Suggested: This complete counted list includes a quantity of 10 or more. Confirm whether “'+i.relationshipEvidence.members.map(m=>m.head).join('” and “')+'” belong to the same numerical expression. If related, use “'+i.conditionalSuggestion+'” here. The list includes an uncertain apposition attachment; different quantities retain separate treatment and no replacement is asserted.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:21,guidePrintedPage:String(references.lcb.pages[20].printedPage),rule:'Numerals: Bill, item 3',preferred:null,ruleText:'LCB uses figures for related numbers in a sentence when one is 10 or larger; different numerical expressions retain separate treatment.'},{guideId:'gpo',guideName:'GPO Style Manual',guidePage:287,guidePrintedPage:String(references.gpo.pages[286].printedPage),rule:'12.5 / 12.6',preferred:null,ruleText:'GPO figure treatment depends on related counts. Measurement, time and money do not force figures for other numerical expressions.'}]});
 }
 return out;
}
