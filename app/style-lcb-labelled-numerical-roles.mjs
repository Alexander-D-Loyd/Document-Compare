import {styleContext} from './style-context.mjs';
import {originalBodyStyleContext,styleEvidenceGuard} from './style-evidence.mjs';
import {technicalClockBoundary} from './style-time-abbreviations-next.mjs';

// A printed label can establish that a hyphenated figure is a reference rather
// than an unresolved quantity. It does not establish the reference's accuracy.
// Keep the evidence separate from the selected coordinates: neither a nearby
// count nor all the remaining numbers in a Budget document inherit this role.
const left='(?<![\\p{L}\\p{N}\\p{M}_-])',right='(?![\\p{L}\\p{N}\\p{M}_-]|\\.(?=[\\p{L}\\p{N}]))';
const item='\\d{4}\\s*-\\s*\\d{3}(?:\\s*-\\s*\\d{4})?';
const year='[12]\\d{3}\\s*-\\s*\\d{2}(?:\\d{2})?';
const phone='(?:[2-9]\\s*-\\s*1\\s*-\\s*1|9\\s*-\\s*8\\s*-\\s*8)';
const order='(?:[A-Z]{1,4}\\d*\\s*-\\s*)?\\d+(?:\\s*-\\s*\\d+)+';
const ruleCode='[A-Z]{2,8}(?:\\s*-\\s*[A-Z0-9]+)+';
const claim='(?:\\d{2,3}(?:\\s*-\\s*(?:[A-Z]{2,4}|\\d{1,3})){1,3}|\\d{3,5})';
const clock="(?:[1-9]|1[0-2])(?::[0-5]\\d)?(?:\\s+o[’']clock)?\\s*[ap]\\.\\s*m\\.";
const writtenClock="(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\\s+o[’']clock";
const undottedClock="(?:(?:[1-9]|1[0-2])(?::[0-5]\\d)?(?:\\s+o[’']clock)?|"+writtenClock+')\\s*[ap]m\\.?';
const clockLead="(?<![\\p{L}\\p{N}\\p{M}_./:\\\\#@’'\\-])(?:at|after|before|by|until|from|between|to)\\s+";
const list=value=>value+'(?:\\s*(?:,\\s*(?:(?:and|or)\\s+)?|(?:and|or)\\s+)'+value+')*';
const patterns=[
 ['item',new RegExp(left+'Items?\\s+(?<values>'+list(item)+')'+right,'giu')],
 ['item-heading',new RegExp(left+'(?<values>'+item+')\\s*-\\s*(?:For\\s+(?:support|local\\s+assistance|capital\\s+outlay)|Reappropriation|Reversion)'+right,'giu')],
 ['fund-heading',new RegExp('^[ \\t]*(?:\\(\\d+\\)[ \\t]*)?(?<values>\\d{4})[ \\t]*-[ \\t]*(?:[\\p{L}][\\p{L}’\u0027()-]*[ \\t]+)*(?:Fund|Account)(?=[ \\t]*(?:[.,(]|$))','gmu')],
 ['code-legend',new RegExp(left+'(?<values>\\d{3,4})\\s*-\\s*(?:(?:Reference|Fund)\\s+Code|Business\\s+Unit)'+right,'giu')],
 ['public-law',new RegExp(left+'(?:P\\.\\s*L\\.|Pub\\.\\s*L\\.|Public\\s+Law)\\s*(?:No\\.\\s*)?(?<values>\\d+\\s*-\\s*\\d+)'+right,'giu')],
 ['year',new RegExp(left+'(?:fiscal|school|academic|calendar|tax)\\s+years?\\s+(?<values>'+list(year)+')'+right,'giu')],
 ['year',new RegExp(left+'(?<values>'+list(year)+')\\s+(?:(?:fiscal|school|academic|calendar|tax)\\s+years?|Regular\\s+Session|(?:[1-9]\\d*(?:st|nd|rd|th)\\s+)?Ex\\.\\s*Sess\\.|Governor[’\u0027]s\\s+Budget|May\\s+Revision)'+right,'giu')],
 ['grade',new RegExp(left+'grades?\\s+(?<values>K\\s*-\\s*12)'+right,'giu')],
 ['phone',new RegExp(left+'(?<values>'+phone+')\\s+(?:dialing|telephone\\s+(?:number|service)|information\\s+and\\s+referral(?:\\s+response)?\\s+system)'+right,'giu')],
 ['phone',new RegExp(left+'(?:dial(?:ing)?|telephone\\s+(?:number|service))\\s+(?<values>'+phone+')'+right,'giu')],
 ['decision',new RegExp(left+'(?:Public\\s+Utilities\\s+Commission\\s+)?Decision\\s+(?<values>\\d{2}\\s*-\\s*\\d{2}\\s*-\\s*\\d{3})'+right,'giu')],
 ['order',new RegExp(left+'Order\\s+No\\.?\\s+(?<values>'+order+')'+right,'giu')],
 ['rule-code',new RegExp(left+'(?:Final\\s+)?Rule\\s*\\(\\s*(?<values>'+ruleCode+')\\s*\\)'+right,'gu')],
 ['project-code',new RegExp(left+'\\(\\s*(?<values>'+ruleCode+')\\s*\\)\\s+(?:projects?|programs?)'+right,'gu')],
 ['claim',new RegExp(left+'CSM(?:\\s*-\\s*|\\s+)(?<values>'+list(claim)+')'+right,'gu')],
 ['version',new RegExp(left+'(?<values>v\\d+(?:\\.\\d+)+)'+right,'gu')],
 ['version',new RegExp(left+'[Vv]ersion\\s+(?<values>\\d+(?:\\.\\d+)+)'+right,'gu')],
 ['clock',new RegExp(left+'(?<values>'+clock+')'+right,'giu')],
 ['clock',new RegExp(clockLead+'(?<values>'+undottedClock+')'+right,'giu')],
 ['clock',new RegExp(clockLead+'(?<values>'+writtenClock+'\\s*[ap]\\.\\s*m\\.)'+right,'giu')]
];
const valuesFor={item:new RegExp(item,'gu'),'item-heading':new RegExp(item,'gu'),'fund-heading':/\d{4}/gu,'code-legend':/\d{3,4}/gu,'public-law':/\d+\s*-\s*\d+/gu,year:new RegExp(year,'gu'),grade:/K\s*-\s*12/giu,phone:new RegExp(phone,'gu'),decision:/\d{2}\s*-\s*\d{2}\s*-\s*\d{3}/gu,order:new RegExp(order,'giu'),'rule-code':new RegExp(ruleCode,'gu'),'project-code':new RegExp(ruleCode,'gu'),claim:new RegExp(claim,'gu'),version:/v?\d+(?:\.\d+)+/gu};
function supportedYear(value){
 const [first,last]=value.split(/\s*-\s*/u),next=String(Number(first)+1);
 return last.length===2?next.slice(-2)===last:next===last;
}
export function labelledNumericalRoleWitnesses(source){
 const out=[];
 for(const [role,pattern]of patterns)for(const m of source.matchAll(pattern)){
  if(['fund-heading','item-heading'].includes(role)&&!/\bBudget\s+Act\s+of\s+\d{4}\b/iu.test(source))continue;
  const values=m.groups.values,valueAt=m.index+m[0].indexOf(values),coordinates=role==='clock'?[{0:values,index:0}]:[...values.matchAll(valuesFor[role])];
  // An unfamiliar or malformed labelled period still needs the whole-expression
  // question. No calendar period or missing digit is inferred from its prefix.
  if(role==='year'&&coordinates.some(v=>!supportedYear(v[0])))continue;
  for(const v of coordinates)out.push({role,start:valueAt+v.index,end:valueAt+v.index+v[0].length,evidenceStart:m.index,evidenceEnd:m.index+m[0].length});
 }
 return out;
}
export function labelledNumericalRoleRanges(doc,ctx=styleContext(doc)){
 const originalSource=originalBodyStyleContext(doc)?.source||ctx.source;
 const current=labelledNumericalRoleWitnesses(ctx.source),original=labelledNumericalRoleWitnesses(originalSource),blocked=styleEvidenceGuard(doc,ctx);
 const budgetPattern=/\bBudget\s+Act\s+of\s+\d{4}\b/giu,originalBudgetAnchors=new Set([...originalSource.matchAll(budgetPattern)].map(m=>m.index+':'+(m.index+m[0].length)));
 const budgetAnchor=[...ctx.source.matchAll(budgetPattern)].find(m=>!blocked(m.index,m.index+m[0].length)&&originalBudgetAnchors.has(m.index+':'+(m.index+m[0].length))&&originalSource.slice(m.index,m.index+m[0].length)===m[0]);
 // An Item label supplies an explicit serial role even when a wrapped
 // continuation line contains only identifiers. The Budget heuristic for
 // digits-only amount rows cannot invalidate that label. Physical table
 // geometry and dot leaders still retain their original protections.
 const itemBlocked=styleEvidenceGuard(doc,{...ctx,tableAt:offset=>ctx.tableAt(offset)&&doc.blocks.some(b=>b.start<=offset&&b.end>offset&&(b.formatting?.headerGaps?.length>=2||/\.{3,}/u.test(ctx.source.slice(b.start,b.end))))});
 const intact=current.filter(r=>(!['fund-heading','item-heading'].includes(r.role)||budgetAnchor)&&!(r.role==='item'?itemBlocked:blocked)(r.evidenceStart,r.evidenceEnd)&&!(r.role==='clock'&&technicalClockBoundary(doc,ctx.source,originalSource,r.start,r.end))&&original.some(o=>o.role===r.role&&o.start===r.start&&o.end===r.end&&o.evidenceStart===r.evidenceStart&&o.evidenceEnd===r.evidenceEnd));
 // Once this source explicitly identifies a complete dialing code, its
 // repeated identical token remains that identifier. This licenses neither
 // other hyphenated figures nor a partial code manufactured by removed text.
 const phoneCodes=new Map();for(const r of intact.filter(r=>r.role==='phone')){const value=ctx.source.slice(r.start,r.end).replace(/\s/gu,'');if(!phoneCodes.has(value))phoneCodes.set(value,r);}
 for(const [value,witness] of phoneCodes){
  const matcher=new RegExp(left+value.split('-').join('\\s*-\\s*')+right,'gu');
  const originalCoordinates=new Set([...originalSource.matchAll(matcher)].map(m=>m.index+':'+(m.index+m[0].length)));
  for(const m of ctx.source.matchAll(matcher)){
   const start=m.index,end=start+m[0].length;
   if(intact.some(r=>r.start===start&&r.end===end)||blocked(start,end)||!originalCoordinates.has(start+':'+end)||originalSource.slice(start,end)!==m[0])continue;
   intact.push({...witness,start,end});
  }
 }
 return intact;
}
