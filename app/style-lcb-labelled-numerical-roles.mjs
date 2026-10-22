import {styleContext} from './style-context.mjs';
import {originalBodyStyleContext,styleEvidenceGuard} from './style-evidence.mjs';
import {technicalClockBoundary} from './style-time-abbreviations-next.mjs';
import {originalRoleBoundaryBlocked} from './style-original-role-boundaries.mjs';

// A printed label can establish that a hyphenated figure is a reference rather
// than an unresolved quantity. It does not establish the reference's accuracy.
// Keep the evidence separate from the selected coordinates: neither a nearby
// count nor all the remaining numbers in a Budget document inherit this role.
const left='(?<![\\p{L}\\p{N}\\p{M}_-])',right='(?![\\p{L}\\p{N}\\p{M}_-]|\\.(?=[\\p{L}\\p{N}]))';
const item='\\d{4}\\s*-\\s*\\d{3}(?:\\s*-\\s*\\d{4})?';
const explicitItem='\\d{3,4}\\s*-\\s*\\d{3}(?:\\s*-\\s*\\d{4})?';
const year='[12]\\d{3}\\s*-\\s*\\d{2}(?:\\d{2})?';
const yearSequence=year+'(?:\\s*(?:,\\s*(?:(?:and|or)\\s*)?|(?:and|or|to|through|until|rather\\s+than)\\s+)'+year+')*';
const grade='(?:1[0-2]|[1-9])';
const fundReference='Fund\\s+\\d{4}';
const phone='(?:[2-9]\\s*-\\s*1\\s*-\\s*1|9\\s*-\\s*8\\s*-\\s*8)';
const order='(?:[A-Z]{1,4}\\d*\\s*-\\s*)?\\d+(?:\\s*-\\s*\\d+)+';
const ruleCode='[A-Z]{2,8}(?:\\s*-\\s*[A-Z0-9]+)+';
const claim='(?:\\d{2,3}(?:\\s*-\\s*(?:[A-Z]{2,4}|\\d{1,3})){1,3}|\\d{3,5})';
const mandateSerial='(?:\\d{2,3}\\s*-\\s*(?:[A-Z]{2,4}\\s*-\\s*\\d{1,3}|\\d{1,3}\\s*-\\s*\\d{1,3})|CSM\\s+\\d{3,5})';
const mandateCell='(?:'+mandateSerial+'|\\d{2,3}[A-Z]|\\d{3,5})';
const mandateList=mandateSerial+'(?:\\s*(?:,\\s*(?:(?:and|or)\\s*)?|(?:and|or)\\s+)'+mandateCell+')*';
const statuteCitation='\\((?:Chs?\\.?|Chapters?)\\s+[^()]{1,1000}\\bStats\\.?\\s*\\d{4}\\s*\\)';
const clock="(?:[1-9]|1[0-2])(?::[0-5]\\d)?(?:\\s+o[’']clock)?\\s*[ap]\\.\\s*m\\.";
const writtenClock="(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\\s+o[’']clock";
const undottedClock="(?:(?:[1-9]|1[0-2])(?::[0-5]\\d)?(?:\\s+o[’']clock)?|"+writtenClock+')\\s*[ap]m\\.?';
const clockLead="(?<![\\p{L}\\p{N}\\p{M}_./:\\\\#@’'\\-])(?:at|after|before|by|until|from|between|to)\\s+";
const list=value=>value+'(?:\\s*(?:,\\s*(?:(?:and|or)\\s+)?|(?:and|or)\\s+)'+value+')*';
const patterns=[
 ['item',new RegExp(left+'Items?\\s+(?<values>'+list(explicitItem)+')'+right,'giu')],
 ['item-list',new RegExp(left+'Items\\s+(?<values>'+explicitItem+'(?:(?:\\s*,\\s*(?:(?:and|or)\\s*)?|\\s+(?:and|or)\\s+|\\s+(?=\\d{3,4}\\s*-))'+explicitItem+')+)'+right,'giu')],
 ['budget-citation-item',new RegExp(left+'(?:Items?\\s+)?(?<values>'+explicitItem+')\\s*,\\s*Budget\\s+Act\\s+of\\s+[12]\\d{3}'+right,'gu')],
 ['item-heading',new RegExp(left+'(?<values>'+item+')\\s*-\\s*(?:For\\s+(?:support|local\\s+assistance|capital\\s+outlay)|Reappropriation|Reversion)'+right,'giu')],
 ['fund-heading',new RegExp('^[ \\t]*(?:\\(\\d+\\)[ \\t]*)?(?<values>\\d{4})[ \\t]*-[ \\t]*(?:[\\p{L}][\\p{L}’\u0027()-]*[ \\t]+)*(?:Fund|Account)(?=[ \\t]*(?:[.,(]|$))','gmu')],
 ['code-legend',new RegExp(left+'(?<values>\\d{3,4})\\s*-\\s*(?:(?:Reference|Fund)\\s+Code|Business\\s+Unit)'+right,'giu')],
 ['code-legend-range',new RegExp(left+'(?<values>\\d{3}\\s*-\\s*\\d{3})\\s+represents\\s+state\\s+operations\\s+in\\s+the\\s+Budget\\s+Act'+right,'gu')],
 ['fund-caption',new RegExp('^[ \\t]*(?:\\(\\d+\\)\\s*)?(?<values>\\d{4}\\s*-\\s*(?:\\d{3,4}(?=\\s+[\\p{Lu}]))?)\\s*(?:(?:[\\p{Lu}][\\p{L}’\u0027()-]*|and|of|the|for)\\s+){1,24}(?:Fund|Account)(?=\\s*(?:[.,(]|$))','gmu')],
 ['mandate-list',new RegExp(left+'following\\s+mandates(?:\\s+apply)?:\\s+(?<values>(?:[A-Z][\\p{L}\\p{M}’\u0027-]*(?:\\s+[A-Z][\\p{L}\\p{M}’\u0027-]*){0,9}\\s*\\(\\s*'+mandateSerial+'\\s*\\))(?:\\s*(?:,\\s*(?:and\\s+)?|and\\s+)[A-Z][\\p{L}\\p{M}’\u0027-]*(?:\\s+[A-Z][\\p{L}\\p{M}’\u0027-]*){0,9}\\s*\\(\\s*'+mandateSerial+'\\s*\\))*)','gu')],
 ['public-law',new RegExp(left+'(?:P\\.\\s*L\\.|Pub\\.\\s*L\\.|Public\\s+Law)\\s*(?:No\\.\\s*)?(?<values>\\d+\\s*-\\s*\\d+)'+right,'giu')],
 ['year',new RegExp(left+'(?:fiscal|school|academic|calendar|tax)\\s+years?\\s+(?<values>'+list(year)+')'+right,'giu')],
 ['year',new RegExp(left+'(?<values>'+list(year)+')\\s+(?:(?:fiscal|school|academic|calendar|tax)\\s+years?|Regular\\s+Session|(?:[1-9]\\d*(?:st|nd|rd|th)\\s+)?Ex\\.\\s*Sess\\.|Governor[’\u0027]s\\s+Budget|May\\s+Revision)'+right,'giu')],
 ['year',new RegExp(left+'(?:(?:each\\s+)?(?:fiscal|school|academic|calendar|tax|award)\\s+years?\\s+(?:(?:beginning|between|of)\\s+)?|baseline\\s+year\\s+of\\s+)(?<values>'+yearSequence+')'+right,'giu')],
 ['year',new RegExp(left+'(?<values>'+yearSequence+')\\s+award\\s+years?'+right,'giu')],
 ['year',new RegExp(left+'(?:its|the)\\s+(?<values>'+year+')\\s+budget\\s+plan'+right,'gu')],
 ['grade',new RegExp(left+'grades?\\s+(?<values>K\\s*-\\s*12)'+right,'giu')],
 ['grade-range',new RegExp(left+'grades\\s+(?<values>'+grade+'\\s+(?:to|through)\\s+'+grade+')\\s*,\\s*inclusive'+right,'giu')],
 ['fund-reference',new RegExp(left+'(?:from|to|in|of|into|under)\\s+(?:the\\s+)?(?<values>'+list(fundReference)+')'+right,'gu')],
 ['phone',new RegExp(left+'(?<values>'+phone+')\\s+(?:dialing|telephone\\s+(?:number|service)|information\\s+and\\s+referral(?:\\s+response)?\\s+system)'+right,'giu')],
 ['phone',new RegExp(left+'(?:dial(?:ing)?|telephone\\s+(?:number|service))\\s+(?<values>'+phone+')'+right,'giu')],
 ['decision',new RegExp(left+'(?:Public\\s+Utilities\\s+Commission\\s+)?Decision\\s+(?<values>\\d{2}\\s*-\\s*\\d{2}\\s*-\\s*\\d{3})'+right,'giu')],
 ['order',new RegExp(left+'Order\\s+No\\.?\\s+(?<values>'+order+')'+right,'giu')],
 ['rule-code',new RegExp(left+'(?:Final\\s+)?Rule\\s*\\(\\s*(?<values>'+ruleCode+')\\s*\\)'+right,'gu')],
 ['project-code',new RegExp(left+'\\(\\s*(?<values>'+ruleCode+')\\s*\\)\\s+(?:projects?|programs?)'+right,'gu')],
 ['claim',new RegExp(left+'CSM(?:\\s*-\\s*|\\s+)(?<values>'+list(claim)+')'+right,'gu')],
 ['mandate-claim',new RegExp(statuteCitation+'\\s*\\(\\s*(?<values>'+mandateList+')\\s*\\)','gu')],
 ['version',new RegExp(left+'(?<values>v\\d+(?:\\.\\d+)+)'+right,'gu')],
 ['version',new RegExp(left+'[Vv]ersion\\s+(?<values>\\d+(?:\\.\\d+)+)'+right,'gu')],
 ['clock',new RegExp(left+'(?<values>'+clock+')'+right,'giu')],
 ['clock',new RegExp(clockLead+'(?<values>'+undottedClock+')'+right,'giu')],
 ['clock',new RegExp(clockLead+'(?<values>'+writtenClock+'\\s*[ap]\\.\\s*m\\.)'+right,'giu')]
];
const valuesFor={item:new RegExp(explicitItem,'gu'),'item-list':new RegExp(explicitItem,'gu'),'budget-citation-item':new RegExp(explicitItem,'gu'),'item-heading':new RegExp(item,'gu'),'fund-heading':/\d{4}/gu,'code-legend':/\d{3,4}/gu,'public-law':/\d+\s*-\s*\d+/gu,year:new RegExp(year,'gu'),grade:/K\s*-\s*12/giu,'grade-range':/\d+/gu,'fund-reference':/\d{4}/gu,phone:new RegExp(phone,'gu'),decision:/\d{2}\s*-\s*\d{2}\s*-\s*\d{3}/gu,order:new RegExp(order,'giu'),'rule-code':new RegExp(ruleCode,'gu'),'project-code':new RegExp(ruleCode,'gu'),claim:new RegExp(claim,'gu'),version:/v?\d+(?:\.\d+)+/gu};
const wholeRoles=new Set(['clock','fund-caption','code-legend-range','mandate-claim','mandate-list']);
const titleWord='[\\p{Lu}][\\p{L}\\p{M}’\u0027-]*';
const sourceTitle='(?:'+titleWord+'\\s+){1,8}(?:Program|Network|Coordinators|Providers)';
const questionPatterns=[
 ['education-title',new RegExp(left+'(?<values>(?:PK|K)\\s*-\\s*[1-9]\\d?)\\s+'+sourceTitle+right,'gu')],
 ['education-program-component',new RegExp(left+'(?<values>K\\s*-\\s*12)\\s+component\\s+of\\s+the\\s+'+sourceTitle+right,'gu')],
 ['education-school',new RegExp(left+'(?<values>K\\s*-\\s*12)\\s+schools'+right,'gu')],
 ['education-workforce',new RegExp(left+'(?<values>PK\\s*-\\s*12)\\s+educational\\s+(?:career|workforce\\s+(?:data\\s+)?reporting)'+right,'gu')],
 ['education-pathways',new RegExp(left+'education\\s+pathways\\s+between\\s+(?<values>K\\s*-\\s*12)\\s+and\\s+community\\s+colleges'+right,'gu')],
 ['education-curricula',new RegExp(left+'curricula\\s+across\\s+(?<values>K\\s*-\\s*20)\\s+segments'+right,'gu')],
 ['education-report-entities',new RegExp(left+'(?:State\\s+)?Department\\s+of\\s+Education\\s+shall\\s+report\\s+on\\s+behalf\\s+of\\s+(?<values>K\\s*-\\s*12)\\s+entities'+right,'gu')],
 ['period-title',new RegExp(left+'(?<values>'+year+')\\s+Final\\s+Change\\s+Book\\s+for\\s+the\\s+(?<period>'+year+')\\s+fiscal\\s+year'+right,'gu')],
 ['protocol-number',new RegExp(left+'systems\\s+and\\s+protocols\\s+with\\s+(?<values>'+phone+'\\s+and\\s+'+phone+')\\s+to\\s+strengthen\\s+integration\\s+and\\s+direct\\s+people\\s+to\\s+the\\s+right\\s+number'+right,'gu')]
];
function localQuestionWitnesses(source){
 const out=[];
 for(const [role,pattern]of questionPatterns)for(const m of source.matchAll(pattern)){
  if(role==='period-title'&&(!supportedYear(m.groups.values)||m.groups.period!==m.groups.values))continue;
  const values=m.groups.values,at=m.index+m[0].indexOf(values),cells=role==='protocol-number'?[...values.matchAll(new RegExp(phone,'gu'))]:[{index:0,0:values}];
  for(const cell of cells)out.push({role,start:at+cell.index,end:at+cell.index+cell[0].length,evidenceStart:m.index,evidenceEnd:m.index+m[0].length});
 }
 return out;
}
function supportedYear(value){
 const [first,last]=value.split(/\s*-\s*/u),next=String(Number(first)+1);
 return last.length===2?next.slice(-2)===last:next===last;
}
function reimbursementAmountWitnesses(doc,ctx){
 const blocked=styleEvidenceGuard(doc,{...ctx,tableAt:()=>false}),original=originalBodyStyleContext(doc)?.source||ctx.source;
 const pattern=/^[ \t]*\(\d+\)\s+Reimbursements\s+to\s+\d{4}\s*-\s*[\p{L}][\p{L}\p{M}’'&(),\s-]{1,250}?\s+(?<values>[−-]\d{1,3}(?:,\d{3})+)(?=[ \t]*(?:$|\n))/gmu;
 const collect=source=>[...source.matchAll(pattern)].map(m=>({role:'reimbursement-amount',start:m.index+m[0].lastIndexOf(m.groups.values),end:m.index+m[0].length,evidenceStart:m.index,evidenceEnd:m.index+m[0].length})),old=collect(original),out=[];
 for(const r of collect(ctx.source)){
  const blocks=doc.blocks.filter(b=>b.start<r.end&&b.end>r.evidenceStart);if(blocks.length<1||blocks.length>2||blocks.some(b=>b.page!==blocks[0].page))continue;
  const block=blocks.at(-1),header=doc.blocks.find(b=>b.page===block.page&&/^Item\s+Amount$/u.test(b.text.trim())&&b.formatting?.headerParts?.length>=2);
  const run=block.formatting?.runs?.find(q=>block.start+q.start===r.start&&block.start+q.end===r.end&&!q.space),before=block.formatting?.runs?.filter(q=>!q.space&&q.end<=r.start-block.start&&q.x>=block.formatting.x).at(-1);
  if(!header||!run||!before||!Number.isFinite(run.x)||!Number.isFinite(before.width)||run.x-(before.x+before.width)<Math.max(4,(run.height||10)*0.5)||blocked(header.start,header.end)||blocked(r.evidenceStart,r.evidenceEnd)||!old.some(o=>o.start===r.start&&o.end===r.end&&o.evidenceStart===r.evidenceStart&&o.evidenceEnd===r.evidenceEnd)||original.slice(r.evidenceStart,r.evidenceEnd)!==ctx.source.slice(r.evidenceStart,r.evidenceEnd))continue;
  out.push({...r,headerStart:header.start,headerEnd:header.end});
 }
 return out;
}
// Whole legal lists may veto an ordinary-number question in a table without
// licensing a positive prose role or any correction in that table. The exact
// complete citation and every code cell must survive in both source views.
export function labelledNumericalRoleQuestionProtections(doc,ctx=styleContext(doc)){
 const original=originalBodyStyleContext(doc)?.source||ctx.source,blocked=styleEvidenceGuard(doc,{...ctx,tableAt:()=>false}),ordinaryBlocked=styleEvidenceGuard(doc,ctx),old=[...labelledNumericalRoleWitnesses(original),...localQuestionWitnesses(original)],now=[...labelledNumericalRoleWitnesses(ctx.source),...localQuestionWitnesses(ctx.source)];
 return now.filter(r=>(r.role==='mandate-claim'||questionPatterns.some(([role])=>role===r.role))&&!(r.role==='mandate-claim'?blocked:ordinaryBlocked)(r.evidenceStart,r.evidenceEnd)&&!originalRoleBoundaryBlocked(original,r.evidenceStart,r.evidenceEnd)&&old.some(o=>o.role===r.role&&o.start===r.start&&o.end===r.end&&o.evidenceStart===r.evidenceStart&&o.evidenceEnd===r.evidenceEnd)&&original.slice(r.evidenceStart,r.evidenceEnd)===ctx.source.slice(r.evidenceStart,r.evidenceEnd)).map(r=>({...r,negativeOnly:true}));
}
export function labelledNumericalRoleWitnesses(source){
 const out=[];
 for(const [role,pattern]of patterns)for(const m of source.matchAll(pattern)){
  if(['fund-heading','fund-caption','item-heading'].includes(role)&&!/\bBudget\s+Act\s+of\s+\d{4}\b/iu.test(source))continue;
  const values=m.groups.values,valueAt=m.index+m[0].indexOf(values),coordinates=wholeRoles.has(role)?[{0:values,index:0}]:[...values.matchAll(valuesFor[role])];
  if(role==='grade-range'&&Number(coordinates[0][0])>Number(coordinates[1][0]))continue;
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
 const intact=current.filter(r=>(!['fund-heading','fund-caption','item-heading'].includes(r.role)||budgetAnchor)&&!(['item','item-list','budget-citation-item'].includes(r.role)?itemBlocked:blocked)(r.evidenceStart,r.evidenceEnd)&&!(r.role==='clock'&&technicalClockBoundary(doc,ctx.source,originalSource,r.start,r.end))&&original.some(o=>o.role===r.role&&o.start===r.start&&o.end===r.end&&o.evidenceStart===r.evidenceStart&&o.evidenceEnd===r.evidenceEnd));
 intact.push(...reimbursementAmountWitnesses(doc,ctx));
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
