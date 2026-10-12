import {nounHeadMatch,nounPhraseEvidenceRanges} from './style-noun-heads.mjs';
// The encoded followup noun/modifier form may precede a complete ordinary
// noun beyond the older head shortlist. Other phrasal families need separate
// role evidence: "phase in adoption" can be a phase + prepositional phrase.
export function additionalNominalCompoundEvidence(doc,source,start,end,preferred,blocked){
 if(preferred!=='followup')return null;
 const after=source.slice(end),head=/^\s+(adoptions?)(?![\p{L}\p{N}_])/u.exec(after)||nounHeadMatch(after);
 if(!head||!/^\s+[a-z]/.test(head[0]))return null;
 const headEnd=end+head[0].length,afterHead=source.slice(headEnd);
 if(/^\s+[A-Z][a-z]/.test(afterHead))return null;
 const beforeStart=Math.max(0,start-65),before=source.slice(beforeStart,start),cues=nounPhraseEvidenceRanges(before,afterHead);
 const determiner=/\b(?:a|an|the|this|that|these|those|each|every|its|their|our|your)\s+$/i.exec(before);
 if(determiner)cues.push({side:'before',start:determiner.index,end:determiner.index+determiner[0].length});
 const timely=/\b(?:provide|provides|provided|providing)\s+timely\s+$/i.exec(before);
 if(timely)cues.push({side:'before',start:timely.index,end:timely.index+timely[0].length});
 const cutsWord=index=>/[\p{L}\p{N}_]$/u.test(doc.text.slice(Math.max(0,index-2),index))&&/^[\p{L}\p{N}_]/u.test(doc.text.slice(index,index+2));
 for(const cue of cues){
  const evidenceStart=cue.side==='before'?beforeStart+cue.start:start,evidenceEnd=cue.side==='after'?headEnd+cue.end:headEnd;
  if(!cutsWord(evidenceStart)&&!cutsWord(evidenceEnd)&&!blocked(evidenceStart,evidenceEnd))return {start:evidenceStart,end:evidenceEnd,head:head[0].trim(),cueSide:cue.side};
 }
 return null;
}
