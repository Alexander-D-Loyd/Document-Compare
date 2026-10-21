import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {styleSingleQuoteRanges} from './style-single-quote-ranges.mjs';
import {invalidUnconjoinedCardinalRanges} from './style-written-quantity-evidence.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
const overlap=(rows,a,b)=>rows.some(r=>r.start<b&&r.end>a);

// These recognizable expressions are outside the value converters. Ask about
// the complete expression; never calculate a value from its prefix or suffix.
export function lcbNumericalUncertaintyIssues(doc,references,{existingIssues=[]}={}){
 const page=references?.lcb?.pages?.find(p=>p.page===21);
 if(!page?.text.includes('Spell out all numbers when starting sentences.'))return [];
 const view=styleWordDivisionView(doc,{preserveRemainingWords:true}),d=view?.doc||doc;
 const prior=view?existingIssues.map(i=>({...i,start:view.toView(i.start),end:view.toView(i.end)})):existingIssues;
 const result=withStyleContext(d,()=>{
  const ctx=styleContext(d),source=ctx.source,blocked=styleEvidenceGuard(d,ctx),literal=originalStyleLiteralGuard(d,ctx),single=styleSingleQuoteRanges(source),issues=[];
  const collect=s=>{
   const found=invalidUnconjoinedCardinalRanges(s).map(r=>({...r,reason:'The adjacent number words are not a supported canonical whole quantity. They may represent separate quantities, a year, or an intended number.'}));
   for(const m of s.matchAll(/(?<![\p{L}\p{N}\p{M}_-])(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|\d+(?:\.\d+)?)\s+(?:quadrillion|quintillion|sextillion|septillion|octillion|nonillion|decillion)(?![\p{L}\p{N}\p{M}_-])/giu))found.push({start:m.index,end:m.index+m[0].length,reason:'This scale is outside the supported whole-value converter.'});
   for(const m of s.matchAll(/(?<![\p{L}\p{N}\p{M}_.+-])\d+(?:\.\d+)?[eE][+−-]?\d+(?![\p{L}\p{N}\p{M}_.])/gu))found.push({start:m.index,end:m.index+m[0].length,reason:'Exponent notation is outside the supported ordinary numeral conversions. Confirm whether it is a technical expression or ordinary prose quantity.'});
   return found;
  };
  const candidates=collect(source),original=collect(originalBodyStyleContext(d)?.source||d.text);
  for(const c of candidates){
   const {start,end}=c;
   if(blocked(start,end)||original.some(r=>r.start<end&&r.end>start&&blocked(r.start,r.end))||literal(start,end)||overlap(single,start,end)||overlap(prior,start,end)||overlap(issues,start,end)||ctx.at(start)==='Heading'||ctx.tableAt(start)||cutsOriginalStyleWord(d,start)||cutsOriginalStyleWord(d,end)||/[:/\\#@\p{L}\p{N}\p{M}_-]$/u.test(source.slice(0,start))||/^[:/\\#@\p{L}\p{N}\p{M}_-]/u.test(source.slice(end)))continue;
   issues.push({start,end,text:d.text.slice(start,end),suggestion:null,guideId:'lcb',guidePage:21,guidePrintedPage:String(page.printedPage),rule:'Numerals: unresolved whole expression',category:'Numerical Expression Review',context:ctx.at(start),reviewSuggested:true,confidence:'Review Suggested',checkId:'lcb-numerical-uncertainty-review',conflict:false,matchesPrimary:false,message:'Review Suggested: '+c.reason+' Check the complete expression against LCB21 sentence-opening, document-type and specialized-number rules. No intended value, error or replacement is asserted.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:21,guidePrintedPage:String(page.printedPage),rule:'Numerals: general and document-type provisions',preferred:null,ruleText:page.text}]});
  }
  return issues;
 });
 return view?view.restore(result):result;
}
