import {styleContext} from './style-context.mjs';
const nouns=new Set('cities counties districts agencies boards commissions departments offices schools hospitals clinics providers contractors employers employees workers students pupils members participants residents programs services records documents forms applications reports permits licenses fees taxes'.split(' '));
// Require an explicitly introduced list, existing semicolon grouping, and
// comma-separated groups of known nouns. General clause meaning stays manual.
export function semicolonSeriesIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const quotes=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const valid=group=>{const words=group.trim().split(/\s*,\s*/);return words.length>=2&&words.every(w=>nouns.has(w.toLowerCase()));};
 for(const m of source.matchAll(/\b(?:includes?|consists\s+of)\s+([A-Za-z,;\s]{1,300})(?=[.!?]|$)/gi)){
  const start=m.index+m[0].length-m[1].length,end=start+m[1].trimEnd().length,text=source.slice(start,end);
  if(ctx.at(start)==='Heading'||ctx.tableAt(start)||quotes.some(r=>r.start<end&&r.end>start))continue;
  const groups=text.split(';');if(groups.length<2)continue;
  const last=groups.at(-1),conjunction=/\s+and\s+/.exec(last);if(!conjunction)continue;
  const left=last.slice(0,conjunction.index),right=last.slice(conjunction.index+conjunction[0].length);
  if(!groups.slice(0,-1).every(valid)||!valid(left)||!valid(right))continue;
  const at=text.length-last.length+conjunction.index;
  const suggestion=(text.slice(0,at)+'; and '+right).replace(/\s+/g,' ').trim();
  const message='LCB places the final semicolon before the final “and” in grouped series containing commas. This explicitly introduced list already separates comparable noun groups with semicolons; its final comma-containing group needs the same separator.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:6,guidePrintedPage:references.lcb.pages[5].printedPage,rule:'Punctuation: Semicolons',category:'Grouped series',context:ctx.at(start),checkId:'semicolon-series',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:6,guidePrintedPage:references.lcb.pages[5].printedPage,rule:'Punctuation: Semicolons',preferred:suggestion,ruleText:message},{guideId:'gpo',guideName:'GPO Style Manual',guidePage:233,guidePrintedPage:references.gpo.pages[232].printedPage,rule:'8.148',preferred:suggestion,ruleText:'GPO 8.148 uses semicolons to separate clauses containing commas; its grouped example places a semicolon before the final and.'}]});
 }
 return issues;
}
