import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
export function referenceCaseIssues(doc,references,existing=[]){
 const ctx=styleContext(doc),source=ctx.source,issues=[],blocked=styleEvidenceGuard(doc,ctx);
 for(const m of source.matchAll(/(?<![\p{L}\p{N}\p{M}_])(sections?|schedules?)\s+\d+(?:\.\d+)*(?![\p{L}\p{N}\p{M}_])/giu)){
  const start=m.index,end=start+m[1].length,evidenceEnd=start+m[0].length,word=m[1],preferred=word[0].toUpperCase()+word.slice(1).toLowerCase();
  if(word===preferred||word===word.toUpperCase()||ctx.at(start)==='Heading'||ctx.tableAt(start)||blocked(start,evidenceEnd)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,evidenceEnd)||/^\s*:/.test(source.slice(evidenceEnd)))continue;
  const cite={guideId:'lcb',guideName:'LCB Style Manual',guidePage:19,guidePrintedPage:'19',rule:'Capitalization examples: Numbered references',preferred:preferred.replace(/s$/u,''),ruleText:'LCB lists Section and Schedule with a number as capitalized. Page22 gives Sections123 and124.'};
  const prior=existing.find(i=>['legal-references','lcb-inclusive-range'].includes(i.checkId)&&i.start===start&&i.end>=evidenceEnd&&typeof i.suggestion==='string');
  if(prior){
   prior.suggestion=prior.suggestion.replace(new RegExp('^'+word+'\\b','iu'),preferred);
   if(!prior.references.some(r=>r.guideId==='lcb'&&r.guidePage===19))prior.references.push(cite);
   prior.guidePriority='lcb';prior.guideId='lcb';prior.guidePage=19;prior.guidePrintedPage='19';prior.rule=cite.rule;prior.conflict=false;continue;
  }
  issues.push({start,end,evidenceStart:start,evidenceEnd,text:doc.text.slice(start,end),suggestion:preferred,guideId:'lcb',guidePage:19,guidePrintedPage:'19',rule:cite.rule,category:'LCB reference review',context:ctx.at(start),checkId:'reference-case',conflict:false,guidePriority:'lcb',message:'LCB capitalizes this numbered reference. Confirm the complete reference and bill-local quoted exceptions.',references:[cite]});
 }
 return issues;
}
