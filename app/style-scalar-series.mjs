import {canonicalWrittenValue} from './style-numerals.mjs';
import {countedListPhrase,listNounPhrase,LIST_INTRODUCERS} from './style-list-phrases.mjs';
import {introducedListRanges} from './style-introduced-lists.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
function completeEvidence(ctx,doc){const blocked=doc&&styleEvidenceGuard(doc,ctx);return (start,end)=>ctx.at(start)!=='Heading'&&!ctx.tableAt(start)&&!ctx.literalAt(start,end)&&(!doc||!cutsOriginalStyleWord(doc,start)&&!cutsOriginalStyleWord(doc,end)&&!blocked(start,end));}
// Pure, expressly introduced number series share one numerical expression.
// Counts with units, references, clauses and ambiguous cardinal wording do
// not enter this classification. Offsets remain in the original source.
export function scalarSeriesRanges(ctx,doc){
 const source=ctx.source,ranges=[],validEvidence=completeEvidence(ctx,doc);
 for(const range of introducedListRanges(source,'(?:values|figures|numbers)\\s+are|'+LIST_INTRODUCERS)){
  const start=range.listStart,raw=source.slice(start,range.end).trimEnd();
  if(!raw||!validEvidence(range.start,range.end))continue;
  // Includes one hundred and two is ambiguous between one number and two
  // list values. A plural values/figures/numbers heading, or a real list
  // comma, is required before assigning a shared scalar expression.
  const masked=raw.replace(/\b\d{1,3}(?:,\d{3})+(?!\d)/g,n=>n.replaceAll(',','\uE000'));
  if(!/^(?:values|figures|numbers)\b/i.test(source.slice(range.start,start))&&!masked.includes(','))continue;
  const chunks=masked.replace(/,\s+(and|or|nor)\b/gi,' $1').split(/\s*(?:,|\b(?:and|or|nor|to|through)\b)\s*/i);
  if(chunks.length<2||chunks.some(s=>!s.trim()))continue;
  const valid=chunks.every(chunk=>{const text=chunk.replaceAll('\uE000',',').trim();return /^\d+(?:,\d{3})*$/.test(text)&&Number.isSafeInteger(Number(text.replaceAll(',','')))||canonicalWrittenValue(text)!==null;});
  if(valid)ranges.push({start,end:start+raw.length});
 }
 return ranges;
}
export function countedSeriesGroups(ctx,reference,doc){
 const source=ctx.source,groups=[],validEvidence=completeEvidence(ctx,doc);
 for(const range of introducedListRanges(source,LIST_INTRODUCERS)){
  const start=range.listStart,raw=source.slice(start,range.end).trimEnd();
  if(!raw||!validEvidence(range.start,range.end))continue;
  const masked=raw.replace(/\b\d{1,3}(?:,\d{3})+(?!\d)/g,n=>n.replaceAll(',','\uE000'));
  const connectors=[...masked.matchAll(/,\s*(?:(?:and|or|nor)\b\s*)?|\s+(?:and|or|nor)\s+/gi)],members=[];let begin=0,valid=true;
  if(!connectors.length)continue;
  for(const stop of [...connectors,{index:masked.length,0:''}]){
   const atom=masked.slice(begin,stop.index).replaceAll('\uE000',','),part=countedListPhrase(atom,reference);
   if(!part){valid=false;break;}
   members.push({start:start+begin+part.start,end:start+begin+part.end});begin=stop.index+stop[0].length;
  }
  if(valid&&members.length>=2)groups.push(members);
 }
 return groups;
}

// A stated whole followed by “of whom/which/them” ties only the counts
// acting as subjects of the partition clauses to that whole. Dates, durations
// and counts buried in those clauses remain independent expressions.
export function partitiveCountGroups(ctx,candidates,reference,doc){
 const source=ctx.source,groups=[],validEvidence=completeEvidence(ctx,doc);
 for(const m of source.matchAll(/,\s+of\s+(?:whom|which|them)\s+/gi)){
  const sentence=ctx.sentenceAt(m.index),start=m.index+m[0].length;
  const whole=candidates.findLast(n=>n.start>=sentence.start&&n.end<m.index&&!n.exception&&!n.ordinal&&!n.duration&&!n.measure);
  if(!whole||!listNounPhrase(source.slice(whole.end,m.index),reference))continue;
  const tail=source.slice(start,sentence.end);
  // Conditional partitions need further interpretation rather than a guess.
  if(/\b(?:if|unless|when|provided|except)\b/i.test(tail))continue;
  const ends=[];
  for(const n of candidates){if(n.start<start||n.end>sentence.end||n.exception||n.ordinal||n.duration||n.measure)continue;
   const before=source.slice(start,n.start),predicate=/^\s+(?:are|is|were|was)\b/i.exec(source.slice(n.end,sentence.end));
   if(!predicate||n.start!==start&&!/(?:,\s*(?:(?:and|or)\s+)?|\s+(?:and|or)\s+)$/.test(before))continue;
   ends.push(n);
  }
  if(!ends.length||ends[0].start!==start||!validEvidence(whole.start,sentence.end))continue;
  groups.push([whole,...ends]);
 }
 return groups;
}
