import {styleContext,styleRangeBlocked} from './style-context.mjs';
import {referenceNotationParts} from './reference-notation-parts.mjs';
export function referenceIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 for(const part of referenceNotationParts(source)){
  const {start,end,evidenceEnd,suggestion}=part;
  if(ctx.at(start)==='Heading'||ctx.literalAt(start,evidenceEnd)||styleRangeBlocked(doc,start,evidenceEnd)||doc.blocks.some(b=>b.start<evidenceEnd&&b.end>start&&ctx.tableAt(Math.max(start,b.start))))continue;
  const rule='2.25',message='GPO 2.25 closes a numbered or lettered reference and its parenthetical identifiers, such as section 7(B)(1)(a). Preserve an existing gap before a shared-prefix alternative, as in section 9(a) (1) and (2). A line/page division after a complete parenthetical element is permitted without a hyphen. Only complete recognized chains are checked; unfamiliar reference and abbreviation meanings remain manual.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'gpo',guidePage:27,guidePrintedPage:references.gpo.pages[26].printedPage,rule,category:'Reference notation',context:ctx.at(start),checkId:'legal-references',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:27,guidePrintedPage:references.gpo.pages[26].printedPage,rule,preferred:suggestion,ruleText:message}]});
 }
 return issues;
}
