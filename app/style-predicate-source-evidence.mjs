import {styleContext} from './style-context.mjs';
import {predicateCompoundEvidence,predicateRangeKey} from './style-predicate-evidence.mjs';
import {styleEvidenceGuard,originalBodyStyleContext,cutsOriginalStyleWord} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {compoundSourceBoundaryBlocked} from './style-compound-source-boundaries.mjs';

// Preserve the existing finite grammar, but require its complete copula,
// connecting whitespace, coordinated compounds and closing witness to survive
// the original PDF source. Restored text only vetoes a finding; it supplies no
// positive grammatical role or vocabulary.
export function guardedPredicateCompoundEvidence(doc,candidates,ctx=styleContext(doc)){
 if(!candidates.length)return new Map();
 const source=ctx.source,original=originalBodyStyleContext(doc)?.source||source;
 const found=predicateCompoundEvidence(source,candidates),originalFound=original===source?found:predicateCompoundEvidence(original,candidates);
 const blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),byKey=new Map(candidates.map(m=>[predicateRangeKey(m),m]));
 return new Map([...found].filter(([key,e])=>{
  const old=originalFound.get(key),m=byKey.get(key),end=m.index+m[0].length;
  return old?.anchor===e.anchor&&old.start===e.start&&old.end===e.end&&!blocked(e.start,e.end)&&!literal(e.start,e.end)&&!cutsOriginalStyleWord(doc,e.start)&&!cutsOriginalStyleWord(doc,e.end)&&!compoundSourceBoundaryBlocked(doc.text,source,original,e.start,e.end)&&!compoundSourceBoundaryBlocked(doc.text,source,original,m.index,end);
 }));
}
