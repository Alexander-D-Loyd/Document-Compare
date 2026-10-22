import {prepareOfflineLanguage} from './offline-language.mjs';
import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard} from './style-evidence.mjs';
import {styleFindingPolicy} from './style-finding-policy.mjs';
import {sourceNameRanges} from './style-source-names.mjs';

// This reports an actual analysis limit, not a grammatical interpretation.
// Recompute it from original document input; an engine cannot invent a span.
export function lcbIncompleteAnalysisIssues(doc,references){
 const page=references?.lcb?.pages?.find(p=>p.page===8);if(!page)return [];
 const plan=prepareOfflineLanguage(doc);if(!plan.incompleteRanges.length)return [];
 const ctx=styleContext(doc),blocked=styleEvidenceGuard(doc,ctx),issues=[];
 const policy=styleFindingPolicy(doc,{context:ctx,names:sourceNameRanges(ctx.source)});
 for(const r of plan.incompleteRanges){
  const physical=plan.range(r.start,r.end);if(!physical||blocked(physical.start,physical.end))continue;
  const issue={...physical,text:doc.text.slice(physical.start,physical.end),matchText:plan.text.slice(r.start,r.end),evidenceStart:physical.start,evidenceEnd:physical.end,suggestion:null,guideId:'lcb',guidePage:8,guidePrintedPage:String(page.printedPage),rule:'Hyphenation, items 1–3',category:'Incomplete Grammar Analysis',context:ctx.at(physical.start),confidence:'Review Suggested',reviewSuggested:true,reviewKind:'incomplete-sentence-analysis',checkId:'lcb-incomplete-analysis-review',conflict:false,analysisLimit:r.reason,message:'Review Suggested: This sentence exceeds the parser’s processing limit and was split into fragments. Its complete grammatical structure has not been checked. Review unit modifiers before and after the word modified under LCB8 items 1–2 and the adverb-ending-in-ly exception under item 3. A fragment cannot establish the intended structure or an error. No replacement has been selected.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:8,guidePrintedPage:String(page.printedPage),rule:'Hyphenation, items 1–3',preferred:null,ruleText:'Check unit modifiers in their position before or after the word modified and apply the exception for an adverb ending in ly.'}]};
  if(policy(issue))issues.push(issue);
 }
 return issues;
}
