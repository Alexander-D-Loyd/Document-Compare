import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {percentageValueMatches} from './style-percentage-values.mjs';

const word='[\\p{L}\\p{N}\\p{M}_]',article='(?:a|an|the|each|every|any|this|that)',gap='(?:\\s*-\\s*|\\s+)';
const rules=[
 {kind:'percentage-increase',head:'increase',source:'5-percent increase (bill); 5% increase (digest)',value:'5',bill:'5-percent',digest:'5%',body:'five'+gap+'percent'},
 {kind:'inch-board',head:'board',source:'two-inch board (bill); 2-inch board (digest)',value:'2',bill:'two-inch',digest:'2-inch',body:'(?:2|two)'+gap+'inch'},
 {kind:'quarter-ton-truck',head:'truck',source:'three-quarter-ton truck (bill); 3⁄4-ton truck (digest)',value:'3⁄4',bill:'three-quarter-ton',digest:'3⁄4-ton',body:'(?:3\\s*[/⁄]\\s*4|¾|three'+gap+'quarter)'+gap+'ton'},
].map(r=>({...r,pattern:new RegExp('(?<!'+word+')(?<article>'+article+')\\s+(?<modifier>'+r.body+')\\s+(?<head>'+r.head+')(?!'+word+')','giu')}));
const titleExtension=/^\s+(?:(?:of|for|the|and|in|on)\s+){0,2}[A-Z][\p{L}\p{M}’'-]*|^\s+(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board)\b/u;
const clean=s=>s.replace(/\s+/gu,' ').replace(/\s*-\s*/gu,'-').replaceAll('/','⁄').replace(/\s*⁄\s*/gu,'⁄').trim();
export const LCB_LISTED_NUMERIC_MODIFIER_SCOPE='LCB23’s printed percentage-increase construction preserves complete intact integer/grouped/decimal percentage values textually while changing only percent/% and its modifier boundary for actual Bill/Digest text. No Number conversion rounds a magnitude. The explicit five written-value variant is also selected. Only the finite printed two-inch/2-inch board and three-quarter-ton/3⁄4-ton truck values are checked for those noun heads. Complete article/value/unit/head source evidence and actual Bill/Digest context are required. Other unit/noun heads, partitives, unknown identifiers or semantic roles remain manual. Quotes and bill-local quoted forms, headings/tables, extended names, source strikes/exclusions, original Unicode boundaries, malformed numbers and visible body dashes remain protected; no generic numeric unit modifier is inferred.';

function percentageIncreaseCandidates(doc,ctx){
 // Reuse the existing complete percentage-value validator. Replacing only an
 // analysis-view percent boundary hyphen with equal-length spaces makes its
 // modifier form eligible without changing a physical source character or
 // weakening its original numeric/currency/range/Unicode protections.
 const source=ctx.source.replace(/(?<=\d)[ \t\n]*-[ \t\n]*(?=percent(?![\p{L}\p{N}\p{M}_]))/giu,g=>' '.repeat(g.length));
 const candidates=[];
 for(const value of percentageValueMatches(doc,{...ctx,source})){
  const end=value.index+value[0].length,head=/^\s+(increase)(?![\p{L}\p{N}\p{M}_])/iu.exec(ctx.source.slice(end));if(!head)continue;
  let articleEnd=value.index;while(articleEnd>0&&/\s/u.test(ctx.source[articleEnd-1]))articleEnd--;
  let articleStart=articleEnd;while(articleStart>0&&/[\p{L}\p{M}]/u.test(ctx.source[articleStart-1]))articleStart--;
  const lead=ctx.source.slice(articleStart,articleEnd);if(!new RegExp('^'+article+'$','iu').test(lead))continue;
  const r={...rules[0],value:value.number,bill:value.number+'-percent',digest:value.number+'%'};
  const m={index:articleStart,0:ctx.source.slice(articleStart,end+head[0].length),groups:{article:lead,modifier:ctx.source.slice(value.index,end),head:head[1]}};
  candidates.push({r,m});
 }
 return candidates;
}

function actualContext(doc,ctx){
 const blocked=styleEvidenceGuard(doc,ctx),enact=/\bdo\s+enact\s+as\s+follows\s*:/iu.exec(ctx.source),digest=/\blegislative\s+counsel[’']s\s+digest\b/iu.exec(ctx.source);
 return at=>{
  const kind=ctx.at(at),witness=kind==='Bill'?enact:kind==='Digest'?digest:null;
  if(!witness||blocked(witness.index,witness.index+witness[0].length))return null;
  return kind;
 };
}
function eligibleListedNumericModifiers(doc,ctx){
 const blocked=styleEvidenceGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),contextAt=actualContext(doc,ctx),original=originalBodyStyleContext(doc)?.source||ctx.source,eligible=[];
 const candidates=[...rules.flatMap(r=>[...ctx.source.matchAll(r.pattern)].map(m=>({r,m}))),...percentageIncreaseCandidates(doc,ctx)];
 for(const {r,m} of candidates){
  const start=m.index,end=start+m[0].length,modifierStart=start+m[0].indexOf(m.groups.modifier,m.groups.article.length),modifierEnd=modifierStart+m.groups.modifier.length,headStart=start+m[0].lastIndexOf(m.groups.head),context=contextAt(modifierStart);
  if(ctx.at(modifierStart)==='Heading'||blocked(start,end)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||m[0]===m[0].toUpperCase())continue;
  // The noun is a printed role witness, not a matched fragment of a longer
  // unit/name. Preserve source case, original dash characters and exclusions.
  if(/[A-Z]/u.test(m.groups.modifier)||/^[A-Z]/u.test(m.groups.head)||titleExtension.test(original.slice(end))||/[-\u2010-\u2015]/u.test(doc.text[end]||''))continue;
  if([...doc.text.slice(start,end).matchAll(/[\u2012-\u2015]/gu)].some(d=>/\S/u.test(ctx.source[start+d.index]||'')))continue;
  if(quoted({start:modifierStart,end:modifierEnd}))continue;
  eligible.push({r,m,start,end,modifierStart,modifierEnd,headStart,context});
 }
 return eligible;
}

export function lcbListedNumericModifierProtectionRanges(doc){
 const ctx=styleContext(doc);
 // Even when the document type is unknown, a fully established printed
 // compound cannot be reformatted by a generic contained value check. This
 // negative ownership supplies no Bill/Digest replacement or type inference.
 return eligibleListedNumericModifiers(doc,ctx).filter(e=>!e.context).map(e=>({start:e.modifierStart,end:e.modifierEnd,evidenceStart:e.start,evidenceEnd:e.end,construction:e.r.kind,supersedesCheckIds:['fractions','numerals'],supersedesRules:['Numerals: Percent']}));
}

export function lcbListedNumericModifierIssues(doc,references){
 const ctx=styleContext(doc),issues=[];
 for(const {r,m,start,end,modifierStart,modifierEnd,headStart,context} of eligibleListedNumericModifiers(doc,ctx)){
  if(!context)continue;
  const suggestion=r[context.toLowerCase()];
  if(clean(m.groups.modifier)===suggestion)continue;
  const issue={start:modifierStart,end:modifierEnd,text:doc.text.slice(modifierStart,modifierEnd),suggestion,evidenceStart:start,evidenceEnd:end,guideId:'lcb',guidePage:23,guidePrintedPage:references.lcb.pages[22].printedPage,rule:r.kind==='percentage-increase'?'Numerals: Percent':'Numerals: Measures',category:'Printed Numeric Modifier',context,checkId:'lcb-listed-numeric-modifier',reviewSuggested:false,conflict:false,numericModifierEvidence:{kind:'exact-lcb23-listed-modifier',construction:r.kind,sourceValue:r.value,start,end,article:{start,end:start+m.groups.article.length,text:m.groups.article},modifier:{start:modifierStart,end:modifierEnd,text:doc.text.slice(modifierStart,modifierEnd)},head:{start:headStart,end,text:m.groups.head}},message:'LCB23 prints “'+(context==='Bill'?r.bill:r.digest)+' '+r.head+'” for '+context+' text. This complete article/value/unit/'+r.head+' construction establishes the selected modifier only; no different unit or legal identity is inferred.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:23,guidePrintedPage:references.lcb.pages[22].printedPage,rule:r.kind==='percentage-increase'?'Numerals: Percent':'Numerals: Measures',preferred:suggestion,ruleText:r.source}]};
  issues.push(issue);
 }
 return issues;
}
export function restoreListedNumericModifierEvidence(e,map,text){
 const range=r=>{const start=map(r.start),end=map(r.end,true);return {...r,start,end,text:text.slice(start,end)};};
 return {...e,start:map(e.start),end:map(e.end,true),article:range(e.article),modifier:range(e.modifier),head:range(e.head)};
}
