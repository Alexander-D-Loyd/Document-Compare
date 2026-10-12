import {styleContext} from './style-context.mjs';
import {NOMINAL_COMPOUNDS} from './style-compounds.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
export const PHRASAL_VERB_EVIDENCE_SCOPE=' Existing finite modal verb checks retain complete original modal/verb words and all connecting spaces. Original Unicode/combining-mark boundaries, source strikes, wrapped literals, every intersecting table and unknown ignored/excluded content cannot invent grammatical evidence. Identified interior page heads preserve exact body selections. This finite grammar does not establish unfamiliar syntax, inflection/meaning roles or full first-listed dictionary authority.';

// A finite source list plus a modal is evidence of a verb. Do not classify
// every occurrence of "to" as an infinitive: "access to backup equipment"
// is a noun phrase. Quotations and names must retain their source wording.
export function phrasalVerbIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const blocked=styleEvidenceGuard(doc,ctx);
 const literal=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 for(const [open,solid,page] of NOMINAL_COMPOUNDS){
  for(const m of source.matchAll(new RegExp('\\b(?:shall|must|should|will|would|could|can|may)\\s+('+solid+')\\b','gi'))){
   const start=m.index+m[0].length-m[1].length,end=start+m[1].length;
   if(cutsOriginalStyleWord(doc,m.index)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||blocked(m.index,end))continue;
   if(ctx.at(start)==='Heading'||ctx.tableAt(start)||literal.some(r=>r.start<end&&r.end>start)||m[1]===m[1].toUpperCase())continue;
   // A capitalized continuation can be a quoted/defined product or title.
   if(/^[A-Z]/.test(m[1])||/^\s+[A-Z][a-z]/.test(source.slice(end)))continue;
   const suggestion=open;
   issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:page,guidePrintedPage:references.lcb.pages[page-1].printedPage,rule:'Hyphenation: Noun and verb forms',category:'Compound form',context:ctx.at(start),checkId:'phrasal-verbs',conflict:false,message:'This listed compound follows a modal verb. LCB distinguishes its solid noun or unit-modifier form from its separate-word verb form.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:page,guidePrintedPage:references.lcb.pages[page-1].printedPage,rule:'Hyphenation examples',preferred:suggestion,ruleText:'LCB lists “'+solid+'” as a noun or unit modifier and “'+open+'” as a verb.'}]});
  }
 }
 return issues;
}
