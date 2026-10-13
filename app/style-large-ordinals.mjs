import {styleContext} from './style-context.mjs';
import {cutsOriginalStyleWord} from './style-evidence.mjs';
import {writtenOrdinalRuns,canonicalWrittenOrdinalValue,ordinalRankEvidenceEnd,isScaleOrdinalRun,writtenOrdinalEvidenceGuard} from './style-written-ordinal-evidence.mjs';
export function compoundScaleOrdinalRanges(source){
 const ranges=[];
 for(const r of writtenOrdinalRuns(source)){
  const text=source.slice(r.start,r.end),value=canonicalWrittenOrdinalValue(text);
  // The ordinary numeral engine already recognizes one hundredth and
  // one thousandth as complete words, including ordinal lists. They need
  // no fragment guard here; fractional contexts have their own protection.
  if(/(?:hundred|thousand|million|billion|trillion)th$/i.test(text)&&value!==null&&![100,1000].includes(value))ranges.push(r);
 }
 return ranges;
}
export function largeOrdinalParts(source){
 const parts=[];
 for(const r of writtenOrdinalRuns(source)){
  if(cutsOriginalStyleWord({text:source},r.start)||cutsOriginalStyleWord({text:source},r.end)||!isScaleOrdinalRun(source,r)||ordinalRankEvidenceEnd(source,r.end)===null)continue;
  const text=source.slice(r.start,r.end),value=canonicalWrittenOrdinalValue(text);
  if(value===null||value<100)continue;
  parts.push({...r,text,value});
 }
 return parts.sort((a,b)=>a.start-b.start);
}
export function largeOrdinalIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],blocked=writtenOrdinalEvidenceGuard(doc,ctx);
 for(const r of largeOrdinalParts(source)){
  if(ctx.at(r.start)==='Heading'||blocked(r.start,r.end,ordinalRankEvidenceEnd(source,r.end))||r.text===r.text.toUpperCase())continue;
  const after=source.slice(r.end);
  const prefix=source.slice(ctx.sentenceAt(r.start).start,r.start).replace(/^[\s”"’']*(?:\([a-z\d]+\)\s*)*/i,'').trim();
  if(!prefix||/\b(?:Section|Article|Chapter|Part|Division|Paragraph|Subdivision|No\.?)\s*$/i.test(prefix)||/\b[A-Z][a-z]+[\s-]+[A-Z][a-z]+/.test(r.text)||/^\s+[A-Z][a-z]/.test(after))continue;
  const n=r.value,suffix=n%100>=11&&n%100<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th'),suggestion=n.toLocaleString('en-US')+suffix;
  const message='LCB uses figures for ordinals of 10 or larger in bills and digests. This complete canonical compound number has a singular rank noun and explicit boundary. Sentence starts, named/legal identifiers, literal quotations, fractional units and ambiguous count-plus-adjective phrases are preserved.';
  issues.push({...r,text:doc.text.slice(r.start,r.end),suggestion,guideId:'lcb',guidePage:21,guidePrintedPage:references.lcb.pages[20].printedPage,rule:'Numerals: Compound ordinals',category:'Ordinal form',context:ctx.at(r.start),checkId:'large-ordinals',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:21,guidePrintedPage:references.lcb.pages[20].printedPage,rule:'Numerals: Bill/Digest ordinals',preferred:suggestion,ruleText:message}]});
 }
 return issues;
}
