// Score fixed annotations, never expectations inferred from checker output.
// Suggestions and reader-review findings have different precision semantics.
export function scoreFindings(expected, findings, {exhaustive=false}={}) {
 const owners=new Map(),matches=new Map();
 const eligible=(e,f)=>e.start===f.start&&e.end===f.end&&(!e.kind||e.kind===f.kind)&&(!e.checkId||e.checkId===f.checkId);
 function attach(index,seen){
  for(let n=0;n<findings.length;n++)if(!seen.has(n)&&eligible(expected[index],findings[n])){
   seen.add(n);const owner=owners.get(n);
   if(owner===undefined||attach(owner,seen)){owners.set(n,index);matches.set(index,n);return true;}
  }return false;
 }
 for(let n=0;n<expected.length;n++)attach(n,new Set());
 const missed=expected.filter((_,n)=>!matches.has(n)),matched=[...matches].map(([e,f])=>({expected:expected[e],finding:findings[f]}));
 const unmatched=findings.filter((_,n)=>!owners.has(n));
 const duplicate=unmatched.filter(f=>expected.some(e=>eligible(e,f))),additional=unmatched.filter(f=>!duplicate.includes(f));
 const incorrectSuggestions=matched.filter(({expected:e,finding:f})=>e.suggestion!==undefined&&f.suggestion!=null&&e.suggestion!==f.suggestion);
 const falseCorrections=exhaustive?additional.filter(f=>!f.reviewSuggested):[];
 const reviewBurden=additional.filter(f=>f.reviewSuggested);
 const detected=matched.length,recall=expected.length?detected/expected.length:null;
 return {expected:expected.length,detected,recall,missed,missedCritical:missed.filter(e=>e.critical),incorrectSuggestions,falseCorrections,reviewBurden,duplicate,unannotated:exhaustive?[]:additional};
}
