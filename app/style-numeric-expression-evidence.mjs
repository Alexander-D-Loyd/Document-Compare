import {originalBodyStyleContext,cutsOriginalStyleWord,styleEvidenceGuard} from './style-evidence.mjs';
const glyphs='¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞';
const atom=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?:[+−-]\\s*)?(?:\\.\\d+|[\\d'+glyphs+'])[\\d.,/⁄'+glyphs+']*(?:\\s*[/⁄]\\s*[\\d.,/⁄'+glyphs+']+)*(?:st|nd|rd|th)?','giu');
const integer=/^[+−-]?\s*\d+(?:,\d{3})*$/;
const fractional=new RegExp('[/⁄'+glyphs+']','u');
// These ranges identify indivisible source expressions, not numerical values
// or valid notation. Malformed expressions must not yield suffix corrections.
function expressionRanges(source){
 const ranges=[];
 for(const m of source.matchAll(atom)){
  const text=m[0].replace(/[.,]+$/,'');if(!text)continue;
  const r={start:m.index,end:m.index+text.length,text},prior=ranges.at(-1);
  if(prior&&/^\s+$/.test(source.slice(prior.end,r.start))&&integer.test(prior.text)&&fractional.test(text)){
   prior.end=r.end;prior.text=source.slice(prior.start,prior.end);
  }else ranges.push(r);
 }
 return ranges;
}
export const NUMERIC_EXPRESSION_SCOPE=' Whole numeric source expressions protect leading decimals, spaced or joined mixed fractions, signed quantities and malformed numeric runs from isolated digit/fraction corrections. Original uncertain body text is used only to protect complete expressions; recognized page heads retain source offsets. This does not infer values, correct unfamiliar notation or certify whole numerical rules.';
export function numericExpressionGuard(doc,ctx){
 const ranges=expressionRanges(ctx.source),evidence=styleEvidenceGuard(doc,ctx);let originals=null,prepared=false;
 const partial=(list,start,end)=>{let lo=0,hi=list.length;while(lo<hi){const mid=(lo+hi)>>1;if(list[mid].end<=start)lo=mid+1;else hi=mid;}
  for(let i=lo;i<list.length&&list[i].start<end;i++)if(list[i].start!==start||list[i].end!==end)return true;return false;};
 return (start,end)=>{
  if(cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||evidence(start,end)||partial(ranges,start,end))return true;
  if(!prepared){prepared=true;const original=originalBodyStyleContext(doc);originals=original?expressionRanges(original.source):null;}
  return !!originals&&partial(originals,start,end);
 };
}
