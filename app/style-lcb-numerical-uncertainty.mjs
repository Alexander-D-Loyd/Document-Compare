import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {styleSingleQuoteRanges} from './style-single-quote-ranges.mjs';
import {invalidUnconjoinedCardinalRanges,writtenCardinalRuns} from './style-written-quantity-evidence.mjs';
import {andCardinalParts} from './style-compound-cardinals.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
import {uncertainNumberRanges,numericTokenIdentifierRanges} from './style-uncertain-number-ranges.mjs';
import {numeralIdentifierRanges} from './style-numeral-identifiers.mjs';
import {lumberProtectionRanges} from './style-gpo-lumber.mjs';
import {chemicalNameRanges} from './chemical-name-ranges.mjs';
import {sourceNameRanges} from './style-source-names.mjs';
import {labelledNumericalRoleRanges,labelledNumericalRoleQuestionProtections} from './style-lcb-labelled-numerical-roles.mjs';
const overlap=(rows,a,b)=>rows.some(r=>r.start<b&&r.end>a);

// These recognizable expressions are outside the value converters. Ask about
// the complete expression; never calculate a value from its prefix or suffix.
export function lcbNumericalUncertaintyIssues(doc,references,{existingIssues=[]}={}){
 const page=references?.lcb?.pages?.find(p=>p.page===21);
 if(!page?.text.includes('Spell out all numbers when starting sentences.'))return [];
 const view=styleWordDivisionView(doc,{preserveRemainingWords:true}),d=view?.doc||doc;
 const prior=view?existingIssues.map(i=>({...i,start:view.toView(i.start),end:view.toView(i.end)})):existingIssues;
 const result=withStyleContext(d,()=>{
  const ctx=styleContext(d),source=ctx.source,blocked=styleEvidenceGuard(d,ctx),literal=originalStyleLiteralGuard(d,ctx),single=styleSingleQuoteRanges(source),identifiers=numeralIdentifierRanges(source),issues=[];
  identifiers.push(...chemicalNameRanges(source),...sourceNameRanges(source),...lumberProtectionRanges(d,references,ctx));
  const labelledRoles=labelledNumericalRoleRanges(d,ctx);
  const questionProtections=labelledNumericalRoleQuestionProtections(d,ctx);
  // These intact source labels already establish a serial role in the precise
  // numeral checks; an unresolved-expression route must retain that ownership.
  for(const pattern of [/\bCAS(?:\s+(?:RN|Registry(?:\s+(?:Number|No\.?))?|Number|No\.?))?\s*(?:[:#]\s*)?\d{2,7}\s*-\s*\d{2}\s*-\s*\d(?![\p{L}\p{N}_])/giu,/\b\d+\s+Cal\.\s*(?:App\.\s*|Rptr\.\s*)?(?:2d|3d|4th|5th)?\s+\d+(?:\s*,\s*\d+)*\b/g,/\b\d+\s+U\.S\.\s+\d+(?:\s*,\s*\d+)*\b/g])for(const m of source.matchAll(pattern))identifiers.push({start:m.index,end:m.index+m[0].length});
  const collect=s=>{
   const found=invalidUnconjoinedCardinalRanges(s).map(r=>({...r,reason:'The adjacent number words are not a supported canonical whole quantity. They may represent separate quantities, a year, or an intended number.'}));
   for(const r of andCardinalParts(s))found.push({...r,wholeOwnerOnly:true,canonicalAnd:r.value!==null,reason:r.value===null?'The complete scale-and-conjunction wording is not a supported single canonical value. It may be a list, an intended whole count or ambiguous wording.':'The complete written quantity includes a scale and an internal conjunction. No recognized noun head has established a precise form comparison; check the whole quantity under the applicable numeral rule.'});
   const bigScale=/^\s+(?:quadrillion|quintillion|sextillion|septillion|octillion|nonillion|decillion)(?![\p{L}\p{N}\p{M}_-])/iu;
   for(const r of writtenCardinalRuns(s)){const tail=bigScale.exec(s.slice(r.end));if(tail)found.push({start:r.start,end:r.end+tail[0].length,wholeOwnerOnly:true,reason:'The complete large-scale quantity is outside the supported whole-value converter. A comparison of just its leading number does not resolve its whole form.'});}
   for(const m of s.matchAll(/(?<![\p{L}\p{N}\p{M}_.-])\d+(?:\.\d+)?\s+(?:quadrillion|quintillion|sextillion|septillion|octillion|nonillion|decillion)(?![\p{L}\p{N}\p{M}_-])/giu))found.push({start:m.index,end:m.index+m[0].length,wholeOwnerOnly:true,reason:'This complete large-scale quantity is outside the supported whole-value converter.'});
   for(const r of uncertainNumberRanges(s))found.push({...r,wholeOwnerOnly:true,reason:r.kind==='spoken-decimal'?'This wording may be a spoken decimal. LCB uses figures for decimals; confirm the complete numerical expression and any sentence-opening requirement rather than converting its separate words.':r.kind==='space-grouped-figure'?'Spaces may group the digits of this complete quantity, or separate distinct numbers. The ordinary converter cannot establish that distinction.':'This complete figure or exponent expression is outside the ordinary supported notation. Confirm its numerical role and whole form rather than converting a component or exponent into an independent count.'});
   for(const r of numericTokenIdentifierRanges(s))found.push({...r,wholeOwnerOnly:true,identifierRole:true,reason:'This complete alphanumeric token may be a serial, technical identifier or other literal label rather than an ordinary prose quantity. Its role has not been established by a recognized source label. Confirm the whole token under the applicable numeral rule; no form, virus, year-period identity or replacement is inferred.'});
   for(const m of s.matchAll(/(?<![\p{L}\p{N}\p{M}_./⁄-])[+−-](?:\d+\.\d+|\.\d+)(?![\p{L}\p{N}\p{M}_./⁄-])/gu))found.push({start:m.index,end:m.index+m[0].length,wholeOwnerOnly:true,openingOnly:true,reason:'This signed decimal starts the sentence. LCB21 requires spelled-out sentence openings and figures for decimals; confirm how to rephrase the complete signed quantity without changing its value. No wording or replacement is selected.'});
   for(const m of s.matchAll(/(?<![\p{L}\p{N}\p{M}_./⁄-])(?<whole>\d+)(?:[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|[ \t]+\d+[ \t]*[\/⁄][ \t]*\d+)(?![\p{L}\p{N}\p{M}_./⁄-])/gu))found.push({start:m.index,end:m.index+m[0].length,wholeOwnerOnly:true,billSmallMixed:BigInt(m.groups.whole)<10n,skipOtherMixed:BigInt(m.groups.whole)>=10n,reason:'This is a complete mixed-fraction figure below ten in Bill text. LCB spells out fractions and small Bill quantities, subject to specialized contexts. Confirm its role and whole form; do not convert only its fractional suffix.'});
   for(const r of writtenCardinalRuns(s)){
    const tail=/^\s+(?:day|week|month|year)\s+old(?![\p{L}\p{N}\p{M}_-])/iu.exec(s.slice(r.end));
    if(tail)found.push({start:r.start,end:r.end+tail[0].length,wholeOwnerOnly:true,agePhrase:true,reason:'This number, duration unit and old may be an age modifier or separate wording. LCB22 illustrates a hyphenated number-year-old modifier; LCB8 bases compound hyphens on grammatical role. Confirm the complete role and the document-specific number form. No hyphens or value are inferred.'});
   }
   for(const m of s.matchAll(/(?<![\p{L}\p{N}\p{M}_./⁄-])\d+\s+(?:day|week|month|year)\s+old(?![\p{L}\p{N}\p{M}_-])/giu))found.push({start:m.index,end:m.index+m[0].length,wholeOwnerOnly:true,agePhrase:true,reason:'This figure, duration unit and old may form an age modifier. Check the complete grammatical role and document-specific number form against LCB8 and the LCB22 age examples. No hyphens or value are inferred.'});
   return found;
  };
  const candidates=collect(source).sort((a,b)=>a.start-b.start||b.end-a.end),original=collect(originalBodyStyleContext(d)?.source||d.text);
  for(const c of candidates){
   const {start,end}=c;
   const term=source.slice(start,end),opening=!source.slice(ctx.sentenceAt(start).start,start).replace(/^[\s”"’']*(?:\([a-z\d]+\)\s*)*/iu,'').trim();
   // Normalizing a printed body dash for style matching must not invent one
   // alphanumeric identifier from a label and its separately printed value.
   if(c.identifierRole&&/[\u2014\u2015]/u.test(d.text.slice(start,end)))continue;
   const namedCase=!c.identifierRole&&(term===term.toUpperCase()&&/\p{L}{2}/u.test(term)||/(?:^|[\s-])\p{Lu}[\p{L}\p{M}]+/u.test(term.slice(1)));
   if(c.skipOtherMixed||c.billSmallMixed&&ctx.at(start)!=='Bill'||c.canonicalAnd&&opening||c.openingOnly&&!opening||namedCase||questionProtections.some(r=>r.start<=start&&r.end>=end))continue;
   const priorOwner=c.wholeOwnerOnly?prior.some(i=>i.start<=start&&i.end>=end):overlap(prior,start,end);
   if(blocked(start,end)||original.some(r=>r.start<end&&r.end>start&&blocked(r.start,r.end))||literal(start,end)||overlap(single,start,end)||overlap(identifiers,start,end)||labelledRoles.some(r=>r.start<=start&&r.end>=end)||priorOwner||overlap(issues,start,end)||ctx.at(start)==='Heading'||ctx.tableAt(start)||cutsOriginalStyleWord(d,start)||cutsOriginalStyleWord(d,end)||/[:/\\#@\p{L}\p{N}\p{M}_-]$/u.test(source.slice(0,start))||/^[:/\\#@\p{L}\p{N}\p{M}_-]/u.test(source.slice(end)))continue;
   issues.push({start,end,text:d.text.slice(start,end),suggestion:null,guideId:'lcb',guidePage:21,guidePrintedPage:String(page.printedPage),rule:'Numerals: unresolved whole expression',category:'Numerical Expression Review',context:ctx.at(start),reviewSuggested:true,confidence:'Review Suggested',checkId:'lcb-numerical-uncertainty-review',conflict:false,matchesPrimary:false,message:'Review Suggested: '+c.reason+' Check the complete expression against LCB21 sentence-opening, document-type and specialized-number rules. No intended value, error or replacement is asserted.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:21,guidePrintedPage:String(page.printedPage),rule:'Numerals: general and document-type provisions',preferred:null,ruleText:page.text}]});
   if(c.agePhrase)for(const [guidePage,rule]of [[8,'Compound modifiers: grammatical role'],[22,'Numerals: ages']]){const sourcePage=references.lcb.pages.find(p=>p.page===guidePage);if(sourcePage)issues.at(-1).references.push({guideId:'lcb',guideName:'LCB Style Manual',guidePage,guidePrintedPage:String(sourcePage.printedPage),rule,preferred:null,ruleText:sourcePage.text});}
  }
  return issues;
 });
 return view?view.restore(result):result;
}
