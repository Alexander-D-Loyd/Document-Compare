import {predicateRoleAtoms} from './style-predicate-role-atoms.mjs';
// Preserve the established finite predicate grammar. Evidence describes its
// exact original copula/adverb and right-boundary witnesses; it adds no role.
const adverbs='(?:not|never|still|already|also|very|highly|more|less|sufficiently|particularly|reasonably|equally|fully)';
const copula=new RegExp('\\b(?:is|are|was|were|be|been|being|remains?|remained|becomes?|became|seems?|seemed|appears?|appeared)\\s+(?:'+adverbs+'\\s+)*$','i');
const closing=/^\s*(?:[.;:!?)]|$)/;
const complement=/^\s+(?:for|because|when|while|although|unless|if|than|enough\s+to)\b/i;
const finiteClause=/^(?:(?:the|this|that|these|those)\s+(?:\w+\s+){0,6}|(?:it|they|we|he|she|you)\s+)(?:shall|must|may|will|would|should|could|is|are|was|were|has|have|had|does|do|did|remains?|becomes?|applies|qualifies|provides|requires)\b/i;
const commaClausePrefix=/^\s*,\s*(?:(?:and|but|or)\s+)?(?:(?:when|while|although|unless|if|because)\s+)?/i;
const commaPrefix=/^\s*,\s*/;
const reducedClause=/^(?:when|while|if|unless)\s+(?:not\s+)?(?:used|applied|reviewed|required|authorized|permitted|approved|adopted|tested|operated|provided)(?:\s+(?:for\s+this\s+purpose|under\s+this\s+section))?\s*(?:[.;!?)]|$)/i;
const subjectTo=/^subject\s+to\s+(?:(?:this|that)\s+(?:section|subdivision|paragraph|article)|(?:Section|Subdivision|Paragraph|Article)\s+[A-Za-z0-9().]+)\s*(?:[.;!?)]|$)/i;
const conjunctionPrefix=/^\s+(?:and|but|or)\s+/i;
function boundaryLength(after){
 const close=closing.exec(after);if(close)return close[0].length;
 const complete=complement.exec(after);if(complete)return complete[0].length;
 if(/^\s*,/.test(after)){
  const prefix=commaClausePrefix.exec(after),finite=finiteClause.exec(after.slice(prefix[0].length));if(finite)return prefix[0].length+finite[0].length;
  const comma=commaPrefix.exec(after),tail=after.slice(comma[0].length),reduced=reducedClause.exec(tail)||subjectTo.exec(tail);if(reduced)return comma[0].length+reduced[0].length;
 }
 const conjunction=conjunctionPrefix.exec(after),finite=conjunction&&finiteClause.exec(after.slice(conjunction[0].length));
 return finite?conjunction[0].length+finite[0].length:null;
}
export function predicateAdjectiveEvidence(before,after){return copula.test(before)&&boundaryLength(after)!==null;}
export const predicateRangeKey=m=>m.index+':'+m[0].length;
const conjunction=new RegExp('^\\s*(?:,\\s*)?(?:and|or|but)\\s+(?:'+adverbs+'\\s+)*$','i');
const comma=new RegExp('^\\s*,\\s*(?:'+adverbs+'\\s+)*$','i');
export function predicateCompoundEvidence(source,candidates){
 const keys=new Set(candidates.map(predicateRangeKey)),sorted=[...new Map([...candidates,...predicateRoleAtoms(source,candidates)].map(m=>[predicateRangeKey(m),m])).values()].sort((a,b)=>a.index-b.index),found=new Map();
 const record=(m,anchor,start,end)=>{const key=predicateRangeKey(m);if(keys.has(key))found.set(key,{anchor,start,end});};
 for(let i=0;i<sorted.length;i++){
  const m=sorted[i],beforeStart=Math.max(0,m.index-300),before=source.slice(beforeStart,m.index),afterStart=m.index+m[0].length,copular=copula.exec(before),rightLength=copular&&boundaryLength(source.slice(afterStart));
  if(copular&&rightLength!==null){record(m,m.index,beforeStart+copular.index,afterStart+rightLength);continue;}
  if(!copular)continue;
  const chain=[m];let hasConjunction=false,j=i;
  while(sorted[j+1]){
   const left=sorted[j],right=sorted[j+1],gap=source.slice(left.index+left[0].length,right.index);
   if(conjunction.test(gap)){hasConjunction=true;}else if(!comma.test(gap)||hasConjunction)break;
   chain.push(right);j++;
   const end=right.index+right[0].length,length=hasConjunction?boundaryLength(source.slice(end)):null;
   if(hasConjunction&&length!==null){for(const item of chain)record(item,m.index,beforeStart+copular.index,end+length);i=j;break;}
  }
 }return found;
}
// Compatibility contract: callers still receive the same key -> anchor map.
export function predicateCompoundMatches(source,candidates){return new Map([...predicateCompoundEvidence(source,candidates)].map(([key,evidence])=>[key,evidence.anchor]));}
