import {styleContext} from './style-context.mjs';
// Explicit examples in GPO 5.14–5.15. Do not infer stress for unfamiliar roots.
export const SUFFIX_SPELLINGS=[
 ['formating','formatting','5.14'],['formated','formatted','5.14'],
 ['inputing','inputting','5.14'],['inputed','inputted','5.14'],
 ['baging','bagging','5.14'],['baged','bagged','5.14'],
 ['redish','reddish','5.14'],['robing','robbing','5.14'],['robed','robbed','5.14'],
 ['referrence','reference','5.15'],['preferrence','preference','5.15'],['inferrence','inference','5.15']
];
// Robing and robed are valid clothing words, so their meaning cannot safely
// be inferred from this suffix rule. Retain those examples for manual review.
const checked=SUFFIX_SPELLINGS.filter(([bad])=>!['robing','robed'].includes(bad));
export function suffixSpellingIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],quoted=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 for(const [bad,good,rule] of checked)for(const m of source.matchAll(new RegExp('\\b'+bad+'\\b','gi'))){
  const start=m.index,end=start+m[0].length;
  if(ctx.at(start)==='Heading'||ctx.tableAt(start)||quoted.some(r=>r.start<end&&r.end>start)||m[0]===m[0].toUpperCase()||/^[A-Z]/.test(m[0])&&/^\s+[A-Z][a-z]/.test(source.slice(end)))continue;
  const suggestion=/^[A-Z]/.test(m[0])?good[0].toUpperCase()+good.slice(1):good;
  const message=rule==='5.14'?'GPO 5.14 explicitly gives this root with a doubled final consonant before a vowel suffix. This check uses listed roots only, rather than inferring stress for unfamiliar words.':'GPO 5.15 explicitly gives reference, preference and inference with a single consonant when the derivative accent shifts to an earlier syllable.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'gpo',guidePage:108,guidePrintedPage:references.gpo.pages[107].printedPage,rule,category:'Listed suffix spelling',context:ctx.at(start),checkId:'suffix-spelling',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:108,guidePrintedPage:references.gpo.pages[107].printedPage,rule,preferred:suggestion,ruleText:message}]});
 }
 return issues;
}
