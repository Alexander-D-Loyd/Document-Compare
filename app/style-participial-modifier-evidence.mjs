import {nounHeadPattern,nounPhraseEvidenceRanges} from './style-noun-heads.mjs';

// A subject followed by a finite verb and its object can look like a missing
// modifier hyphen: "the department based payments on records". Require evidence
// of a noun phrase beyond the adjacent words themselves. Articles alone do not
// establish that role. This deliberately leaves clipped/ambiguous prose manual.
const determiner='(?:a|an|the|these|those|such|any|all|each|every|its|their)';
const finite=/^\s+(?:has|have|had|exists?|continues?|ends?|begins?|operates?|serves?)\b/i;
const object=new RegExp('\\b(?:provide|provides|require|requires|use|uses|maintain|maintains|operate|operates|administer|administers|establish|establishes|support|supports|inspect|inspects|review|reviews|authorize|authorizes|fund|funds|implement|implements|offer|offers|serve|serves|concern|concerns)\\s+(?:'+determiner+'\\s+)?(?:[A-Z]{2,8}\\s+)?$');
const preposition=new RegExp('\\b(?:with|without|in|within|of|from|under|through|among|between|by)\\s+(?:'+determiner+'\\s+)?$','i');
const toObject=new RegExp('\\bto\\s+'+determiner+'\\s+$','i');
const copularNoun=new RegExp('\\b(?:is|are|was|were|be|been|being)\\s+'+determiner+'\\s+$','i');
const coordinated=new RegExp('^\\s+(?:and|or)\\s+(?:'+determiner+'\\s+)?[a-z]+(?:[\\s-]+[a-z]+){0,3}\\s+('+nounHeadPattern+')\\b','i');
// In a nominal series, later items inherit the introducing preposition. Each
// preceding item must be a complete recognized noun phrase, not an arbitrary
// run of words that could contain an independent clause.
const nounItem='(?:'+determiner+'\\s+)?(?:employment|retirement|military\\s+service|'+nounHeadPattern+')';
const introducedSeries=new RegExp('\\b(?:through|with|without|from|of|in|within|among|between|by)\\s+'+nounItem+'(?:\\s*,\\s*'+nounItem+'){1,}\\s*,\\s*(?:(?:and|or)\\s+)?(?:'+determiner+'\\s+)?$','i');
const introducedList=/\b(?:include|includes|including|provide|provides|contain|contains)\s+(?:(?:any|all|each|one|both)\s+of\s+)?the\s+following\s*:\s*(?:\([a-z0-9]+\)\s*)?$/i;
export function participialModifierEvidenceRanges(before,afterHead){
 const ranges=nounPhraseEvidenceRanges(before,afterHead);
 const following=finite.exec(afterHead);if(following)ranges.push({side:'after',start:0,end:following[0].length});
 for(const pattern of [object,preposition,toObject,copularNoun,introducedSeries,introducedList]){
  const m=pattern.exec(before);if(m)ranges.push({side:'before',start:m.index,end:m.index+m[0].length});
 }
 // A finite predicate after an explicitly coordinated second noun phrase can
 // establish the first phrase's role without classifying an article as proof.
 const next=coordinated.exec(afterHead);
 if(next){
  const rest=afterHead.slice(next[0].length),tail=nounPhraseEvidenceRanges('',rest),ending=finite.exec(rest);
  for(const range of tail)ranges.push({side:'after',start:0,end:next[0].length+range.end});
  if(ending)ranges.push({side:'after',start:0,end:next[0].length+ending[0].length});
 }
 return ranges;
}
export const participialModifierEvidence=(before,afterHead)=>participialModifierEvidenceRanges(before,afterHead).length>0;
