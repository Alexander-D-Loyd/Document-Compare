import {styleContext} from './style-context.mjs';
// Use explicit source examples and noun positions. A bare adjective phrase
// cannot establish which word it modifies or whether it is a literal name.
const forms=[{open:'crystal clear',closed:'crystal-clear',noun:'water'},{open:'fire tested',closed:'fire-tested',noun:'materials?'}];
export function modifierPositionIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const quotes=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
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
  for(const m of source.matchAll(new RegExp('\\b'+form.closed+'\\b','gi'))){
   const before=source.slice(Math.max(0,m.index-65),m.index),after=source.slice(m.index+m[0].length);
   if(new RegExp('\\b'+form.noun+'\\s+(?:is|are|was|were|remains?|becomes?)\\s*$','i').test(before)&&/^\s*(?:[.;,:!?)]|$)/.test(after))add(m,form.open,true);
  }
 }
 return issues.sort((a,b)=>a.start-b.start);
}
