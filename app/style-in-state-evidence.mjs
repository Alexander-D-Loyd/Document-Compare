import {styleEvidenceGuard,cutsOriginalStyleWord}from './style-evidence.mjs';

// These complete source cues establish the preposition in followed by a
// state-qualified object. They do not classify every occurrence of in state.
const nominalLead=/(?<![\p{L}\p{N}\p{M}_])(?:reductions?|differences?|variations?|efficiency|efficiencies|growth|actions?|participation|investments?)\s*$/iu;
const introducedNominal=/(?<![\p{L}\p{N}\p{M}_])(?:a|an|the|this|that|these|those|any|each|every|its|their|our|your|some)\s+(?:(?:substantial|material|significant|statutory|annual|corresponding|proportional)\s+)?(?:changes?|increases?|decreases?|improvements?)\s*$/iu;
const verbalLead=/(?<![\p{L}\p{N}\p{M}_])(?:participates?|participated|participating|resides?|resided|residing)\s*$|(?<![\p{L}\p{N}\p{M}_])(?:is|are|was|were|be|been|being)\s+incarcerated\s*$|(?<![\p{L}\p{N}\p{M}_])(?:offenders?|persons?|individuals?|inmates?|prisoners?)\s+formerly\s+incarcerated\s*$/iu;
const allocated=/\b(?:allocates?|allocated|allocating|awards?|awarded|awarding|appropriates?|appropriated|appropriating)\b/giu;
const amount=/\$\s*(?:[1-9]\d{0,2}(?:,\d{3})+|[1-9]\d*)(?:\.\d{2})?(?![\p{L}\p{N}_,.])/u;
export function inStatePrepositionalEvidence(doc,ctx,start,end,headEnd){
 if(!Number.isInteger(start)||!Number.isInteger(end)||!Number.isInteger(headEnd)||end<=start||headEnd<end||headEnd>doc.text.length||ctx.source.slice(start,end).replace(/\s+/gu,' ').toLowerCase()!=='in state')return null;
 const sentenceStart=ctx.sentenceAt(start).start,before=ctx.source.slice(sentenceStart,start),blocked=styleEvidenceGuard(doc,ctx),lead=nominalLead.exec(before)||introducedNominal.exec(before)||verbalLead.exec(before);
 if(lead){const a=sentenceStart+lead.index;if(!cutsOriginalStyleWord(doc,a)&&!cutsOriginalStyleWord(doc,headEnd)&&!blocked(a,headEnd))return {start:a,end:headEnd,kind:'Complete selected nominal or verbal preposition cue'};}
 // An allocated amount for a named budget year in state tax credits uses
 // in as the allocation preposition, not an in-state geographical modifier.
 const year=/(?<![\p{L}\p{N}\p{M}_])[1-9]\d{3}(?:\s*[-–]\s*(?:[1-9]\d{3}|\d{2}))?\s+(?:calendar|fiscal|tax)\s+years?\s*$/iu.exec(before);
 if(!year||!/^\s+(?:low-income\s+)?(?:housing\s+)?tax\s+credits?$/iu.test(ctx.source.slice(end,headEnd)))return null;
 const allocation=[...before.matchAll(allocated)].at(-1);if(!allocation)return null;
 const bridge=before.slice(allocation.index+allocation[0].length,year.index);if(!amount.test(bridge)||/[;!?]/u.test(bridge))return null;
 const a=sentenceStart+allocation.index;if(cutsOriginalStyleWord(doc,a)||cutsOriginalStyleWord(doc,headEnd)||blocked(a,headEnd))return null;
 return {start:a,end:headEnd,kind:'Complete allocated amount and tax-credit preposition cue'};
}
