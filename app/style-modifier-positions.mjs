import {styleContext} from './style-context.mjs';
import {predicateCompoundMatches,predicateRangeKey} from './style-predicate-evidence.mjs';
import {listedPredicateCandidates,predicateBodyDash} from './style-predicate-examples.mjs';
import {productiveEndWordCandidates} from './style-end-word-predicates.mjs';
// Use explicit source examples and noun positions. A bare adjective phrase
// cannot establish which word it modifies or whether it is a literal name.
const forms=[{open:'crystal clear',closed:'crystal-clear',noun:'water'},{open:'fire tested',closed:'fire-tested',noun:'materials?'}];
export function modifierPositionIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const quotes=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const listed=listedPredicateCandidates(source,doc.text),matches=predicateCompoundMatches(source,[...listed.map(p=>p.m),...productiveEndWordCandidates(source).filter(m=>!predicateBodyDash(doc.text,source,m))]);
 const add=(m,suggestion,predicate)=>{
  const start=m.index,end=start+m[0].length,after=source.slice(end);
  if(ctx.at(start)==='Heading'||ctx.tableAt(start)||quotes.some(r=>r.start<end&&r.end>start)||m[0]===m[0].toUpperCase())return;
  if(/^[A-Z]/.test(m[0])&&(/^\s+[A-Z][a-z]/.test(after)||/\b[A-Z][a-z]+\s+[A-Z][a-z]+/.test(m[0])))return;
  if(/^[A-Z]/.test(m[0]))suggestion=suggestion[0].toUpperCase()+suggestion.slice(1);
  const message=predicate?'This adjective follows the explicit noun it modifies; LCB item 2 and GPO 7.7 leave the source example open in predicate position.':'This two-word adjective immediately precedes its explicit source noun; LCB item 1 and GPO 7.7 hyphenate the source example in unit-modifier position.';
  const rule='Hyphenation, item '+(predicate?2:1);
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:8,guidePrintedPage:references.lcb.pages[7].printedPage,rule,category:'Modifier position',context:ctx.at(start),checkId:'modifier-positions',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:8,guidePrintedPage:references.lcb.pages[7].printedPage,rule,preferred:suggestion,ruleText:message},{guideId:'gpo',guideName:'GPO Style Manual',guidePage:125,guidePrintedPage:references.gpo.pages[124].printedPage,rule:'7.7',preferred:suggestion,ruleText:'GPO 7.7 contrasts crystal-clear water with water is crystal clear, and fire-tested material with material is fire tested.'}]});
 };
 for(const form of forms){
  for(const m of source.matchAll(new RegExp('\\b'+form.open.replace(' ','\\s+')+'(?=\\s+'+form.noun+'\\b)','gi')))add(m,form.closed,false);
  for(const {m} of listed.filter(p=>p.form===form.closed)){
   const anchor=matches.get(predicateRangeKey(m));if(anchor===undefined)continue;
   const before=source.slice(Math.max(0,anchor-200),anchor);
   if(new RegExp('\\b'+form.noun+'\\s+(?:(?:shall|must|may|will|would|should|could)\\s+)?(?:is|are|was|were|be|remains?|remained|becomes?|became)\\s+(?:(?:not|never|still|already|also|very|highly|more|less|sufficiently|particularly|reasonably|equally|fully)\\s+)*$','i').test(before))add(m,form.open,true);
  }
 }
 return issues.sort((a,b)=>a.start-b.start);
}
