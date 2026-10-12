import {predicateRoleAtoms} from './style-predicate-role-atoms.mjs';
// A copular adjective complement differs from a noun modifier after "is a".
// Require an explicit copula and a closing boundary or subordinate complement.
// Do not guess from arbitrary adjacent words or a following noun phrase.
const adverbs='(?:not|never|still|already|also|very|highly|more|less|sufficiently|particularly|reasonably|equally|fully)';
const copula=new RegExp('\\b(?:is|are|was|were|be|been|being|remains?|remained|becomes?|became|seems?|seemed|appears?|appeared)\\s+(?:'+adverbs+'\\s+)*$','i');
const closing=/^\s*(?:[.;:!?)]|$)/;
const complement=/^\s+(?:for|because|when|while|although|unless|if|than|enough\s+to)\b/i;
const finiteClause=/^(?:(?:the|this|that|these|those)\s+(?:\w+\s+){0,6}|(?:it|they|we|he|she|you)\s+)(?:shall|must|may|will|would|should|could|is|are|was|were|has|have|had|does|do|did|remains?|becomes?|applies|qualifies|provides|requires)\b/i;
function commaBoundary(after){
 if(!/^\s*,/.test(after))return false;
 const continuation=after.replace(/^\s*,\s*(?:(?:and|but|or)\s+)?(?:(?:when|while|although|unless|if|because)\s+)?/i,'');
 if(finiteClause.test(continuation))return true;
 // Selected reduced clauses and statutory complements must close, rather
 // than interrupt an adjective series before its eventual noun head.
 const tail=after.replace(/^\s*,\s*/,'');
 return /^(?:when|while|if|unless)\s+(?:not\s+)?(?:used|applied|reviewed|required|authorized|permitted|approved|adopted|tested|operated|provided)(?:\s+(?:for\s+this\s+purpose|under\s+this\s+section))?\s*(?:[.;!?)]|$)/i.test(tail)||/^subject\s+to\s+(?:(?:this|that)\s+(?:section|subdivision|paragraph|article)|(?:Section|Subdivision|Paragraph|Article)\s+[A-Za-z0-9().]+)\s*(?:[.;!?)]|$)/i.test(tail);
}
const conjunctionBoundary=after=>/^\s+(?:and|but|or)\s+/i.test(after)&&finiteClause.test(after.replace(/^\s+(?:and|but|or)\s+/i,''));
export function predicateAdjectiveEvidence(before,after){return copula.test(before)&&(closing.test(after)||complement.test(after)||commaBoundary(after)||conjunctionBoundary(after));}

export const predicateRangeKey=m=>m.index+':'+m[0].length;
const conjunction=new RegExp('^\\s*(?:,\\s*)?(?:and|or|but)\\s+(?:'+adverbs+'\\s+)*$','i');
const comma=new RegExp('^\\s*,\\s*(?:'+adverbs+'\\s+)*$','i');
export function predicateCompoundMatches(source,candidates){
 const keys=new Set(candidates.map(predicateRangeKey));
 const sorted=[...new Map([...candidates,...predicateRoleAtoms(source,candidates)].map(m=>[predicateRangeKey(m),m])).values()].sort((a,b)=>a.index-b.index),found=new Map();
 const record=(m,anchor)=>{if(keys.has(predicateRangeKey(m)))found.set(predicateRangeKey(m),anchor);};
 for(let i=0;i<sorted.length;i++){
  const m=sorted[i],before=source.slice(Math.max(0,m.index-300),m.index),after=source.slice(m.index+m[0].length);
  if(predicateAdjectiveEvidence(before,after)){record(m,m.index);continue;}
  if(!copula.test(before))continue;
  const chain=[m];let hasConjunction=false,j=i;
  while(sorted[j+1]){
   const left=sorted[j],right=sorted[j+1],gap=source.slice(left.index+left[0].length,right.index);
   if(conjunction.test(gap)){hasConjunction=true;}else if(!comma.test(gap)||hasConjunction)break;
   chain.push(right);j++;
   if(hasConjunction&&predicateAdjectiveEvidence(before,source.slice(right.index+right[0].length))){for(const item of chain)record(item,m.index);i=j;break;}
  }
 }
 return found;
}
