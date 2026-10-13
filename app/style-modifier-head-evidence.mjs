import {styleEvidenceGuard,cutsOriginalStyleWord}from './style-evidence.mjs';

function originalHeadWord(doc,ctx,head){
 const physical=ctx.source.slice(head.start,head.end);if(/^[a-z]+$/u.test(physical))return physical;
 // Only an intact, reader-recognized word division can restore a complete
 // head. A raw hyphen/newline or arbitrary masked body gap is not evidence.
 const divided=(doc.wrappedWords||[]).find(w=>w.start===head.start&&w.end===head.end&&w.recognized);
 if(!divided||!Array.isArray(divided.spans)||divided.spans.length<2||divided.spans.length!==divided.parts?.length||divided.word!==divided.parts.join('')||!/^[a-z]+$/u.test(divided.word))return null;
 for(let n=0;n<divided.spans.length;n++){
  const span=divided.spans[n];if(!Number.isInteger(span.start)||!Number.isInteger(span.end)||span.end<=span.start||span.start<head.start||span.end>head.end||doc.text.slice(span.start,span.end)!==divided.parts[n]||ctx.source.slice(span.start,span.end)!==divided.parts[n])return null;
  if(n&&!/^[-\u00ad\u2010][ \t]*\n\s*$/u.test(ctx.source.slice(divided.spans[n-1].end,span.start)))return null;
 }
 if(divided.spans[0].start!==head.start||divided.spans.at(-1).end!==head.end)return null;
 return divided.word;
}
export function nonNominalModifierHeadEvidence(doc,ctx,head){
 if(!head||!Number.isInteger(head.start)||!Number.isInteger(head.end)||head.end<=head.start||head.start<0||head.end>doc.text.length||cutsOriginalStyleWord(doc,head.start)||cutsOriginalStyleWord(doc,head.end))return null;
 const word=originalHeadWord(doc,ctx,head),after=ctx.source.slice(head.end),pattern=word==='pursuant'?/^\s+to(?![\p{L}\p{N}\p{M}_])/u:word==='complies'?/^\s+with(?![\p{L}\p{N}\p{M}_])/u:word==='thereunder'?/^\s*(?:[.,;!?)]|$)/u:word==='therefor'?/^\s+as\s+a\s+result\s+of(?![\p{L}\p{N}\p{M}_])/u:null,continuation=pattern?.exec(after);
 if(!continuation)return null;const end=head.end+continuation[0].length;
 if(cutsOriginalStyleWord(doc,end)||styleEvidenceGuard(doc,ctx)(head.start,end))return null;
 return {start:head.start,end,kind:'Complete nonnominal '+word+' construction'};
}
