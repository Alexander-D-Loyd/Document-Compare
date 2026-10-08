import {styleContext} from './style-context.mjs';
export function editorialNotationIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const literal=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const add=(start,end,suggestion,rule,page,message)=>{
  if(ctx.at(start)==='Heading'||ctx.tableAt(start)||literal.some(r=>r.start<end&&r.end>start))return;
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'gpo',guidePage:page,guidePrintedPage:references.gpo.pages[page-1].printedPage,rule,category:'Editorial notation',context:ctx.at(start),checkId:'editorial-notation',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:page,guidePrintedPage:references.gpo.pages[page-1].printedPage,rule,preferred:suggestion,ruleText:message}]});
 };
 for(const m of source.matchAll(/\[underscore\s+supplied\]/gi)){
  const start=m.index+1,end=m.index+m[0].length-1;
  let suggestion='italic supplied';if(/^[A-Z]/.test(m[0][1]))suggestion='Italic supplied';
  add(start,end,suggestion,'11.4',283,'GPO 11.4 changes the editorial annotation “underscore supplied” to “italic supplied,” while retaining emphasis in original/supplied/added/ours. This only checks the exact bracketed annotation, not the typography of the quoted passage.');
 }
 // An explicit case cue distinguishes the versus connector from a middle
 // initial or a Roman-numeral title. This checks only uppercase V., leaving
 // authentic names and roman/italic court-case treatment for manual review.
 const surname="[A-Z][a-z]+(?:[’'][A-Z]?[a-z]+)?";
 const pattern=new RegExp('\\b(?:case\\s+of|decision\\s+in|holding\\s+in)\\s+'+surname+'\\s+(?<term>V\\.)\\s+'+surname,'g');
 for(const m of source.matchAll(pattern)){
  const start=m.index+m[0].indexOf(m.groups.term),end=start+2;
  add(start,end,'v.','11.8',284,'GPO 11.8 sets the versus connector in a legal case name in lowercase. This check requires an explicit case/decision/holding cue; names, italics and unfamiliar case references still need review.');
 }
 return issues;
}
