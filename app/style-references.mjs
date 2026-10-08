import {styleContext} from './style-context.mjs';
export function referenceIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const pattern=/\b(sections?|paragraphs?|subdivisions?|subparagraphs?|subsections?)\s+(\d+(?:\.\d+)*|[a-z]|\([a-z\d]+\))((?:\s*\([a-z\d]+\))+)(?=\s|[,.;:!?)]|$)/gi;
 for(const m of source.matchAll(pattern)){
  if(ctx.at(m.index)==='Heading'||ctx.tableAt(m.index)||[...(doc.struck||[]),...doc.blocks.filter(b=>b.ignored).map(b=>({start:b.start,end:b.end}))].some(r=>r.start<m.index+m[0].length&&r.end>m.index))continue;
  if(!/\s+\(/.test(m[3]))continue;
  // GPO explicitly permits a space at a shared prefix followed by separate
  // alternatives: section 9(a) (1) and (2). Keep this list boundary intact.
  if(/\)\s+\(/.test(m[0])&&/^\s+(?:and|or)\s+\(/i.test(source.slice(m.index+m[0].length)))continue;
  const suggestion=m[1]+' '+m[2]+m[3].replace(/\s+/g,'');
  const rule='2.25',message='GPO 2.25 closes up a numbered or lettered reference and its parenthetical identifiers, for example section 7(B)(1)(a). Shared-prefix lists remain spaced.';
  issues.push({start:m.index,end:m.index+m[0].length,text:doc.text.slice(m.index,m.index+m[0].length),suggestion,guideId:'gpo',guidePage:27,guidePrintedPage:references.gpo.pages[26].printedPage,rule,category:'Reference notation',context:ctx.at(m.index),checkId:'legal-references',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:27,guidePrintedPage:references.gpo.pages[26].printedPage,rule,preferred:suggestion,ruleText:message}]});
 }
 return issues;
}
