import {styleContext} from './style-context.mjs';
export function referenceCaseIssues(doc,references,existing=[]){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const quoted=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const gpoPage=references.gpo.pages.find(p=>/(?:^|\n)\s*3\.10\.\s/.test(p.flowText||p.text))?.page||43;
 for(const m of source.matchAll(/\b(sections?|schedules?)\s+\d+(?:\.\d+)*\b/gi)){
  const start=m.index,end=start+m[1].length,word=m[1],preferred=word[0].toUpperCase()+word.slice(1).toLowerCase();
  if(word===word.toUpperCase()||ctx.at(start)==='Heading'||ctx.tableAt(start)||/^\s*:/.test(source.slice(m.index+m[0].length))||[...(doc.struck||[]),...doc.blocks.filter(b=>b.ignored).map(b=>({start:b.start,end:b.end})),...quoted].some(r=>r.start<end&&r.end>start))continue;
  const citations=[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:19,guidePrintedPage:'19',rule:'Capitalization examples: Numbered references',preferred,ruleText:'LCB page 19 lists Section and Schedule with a number as capitalized. Page 22 gives Sections 123 and 124.'},{guideId:'gpo',guideName:'GPO Style Manual',guidePage:gpoPage,guidePrintedPage:references.gpo.pages[gpoPage-1].printedPage,rule:'3.10',preferred:word.toLowerCase(),ruleText:'GPO 3.10 lowercases a common reference noun used with a number merely for sequence or reference, including section 3 and schedule K. Named publication titles use their separate rule.'}];
  const message=word===preferred?'Current wording follows LCB; no LCB correction is suggested. GPO uses lowercase for a generic numbered reference.':'LCB capitalizes this numbered reference; GPO uses lowercase. LCB takes priority.';
  const conflictNote='LCB’s numbered-reference example and GPO 3.10 differ. LCB takes priority; explicit named titles, quotations, headings and all-capital section labels are protected.';
  const prior=existing.find(i=>i.start<=start&&i.end>=end);
  if(prior){
   prior.suggestion=prior.suggestion.replace(new RegExp('^'+word+'\\b','i'),preferred);
   for(const c of citations)if(!prior.references.some(r=>r.guideId===c.guideId&&r.rule===c.rule))prior.references.push(c);
   prior.guideId='lcb';prior.guidePage=19;prior.guidePrintedPage='19';prior.conflict=true;prior.matchesPrimary=false;prior.conflictNote=conflictNote;
   continue;
  }
  issues.push({start,end,text:doc.text.slice(start,end),suggestion:preferred,guideId:'lcb',guidePage:19,guidePrintedPage:'19',rule:'Capitalization examples: Numbered references',category:'Guide conflict',context:ctx.at(start),checkId:'reference-case',conflict:true,matchesPrimary:word===preferred,message,conflictNote,references:citations});
 }
 return issues;
}
