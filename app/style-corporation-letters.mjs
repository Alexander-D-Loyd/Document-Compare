import {styleContext} from './style-context.mjs';
export const LCB_CORPORATION_LETTERS=[{page:18,preferred:'“C” corporation',letter:'C'},{page:19,preferred:'“S” corporation',letter:'S'}];
export function corporationLetterIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 for(const m of source.matchAll(/(?:“([cs])”|"([cs])")(?=\s+corporations?\b)/g)){
  const letter=m[1]||m[2],start=m.index+1,end=start+1,r=LCB_CORPORATION_LETTERS.find(r=>r.letter===letter.toUpperCase());
  if(ctx.at(start)==='Heading'||ctx.tableAt(start))continue;
  if(/^\s+corporations?\s+(?:(?:of|for|the|and|in|on)\s+)?[A-Z][a-z]/.test(source.slice(m.index+m[0].length)))continue;
  // The quote pair around one classification letter is the listed form,
  // but an enclosing literal quotation still protects all source wording.
  if(ctx.literalRanges.some(q=>q.start<end&&q.end>start&&(q.start!==m.index||q.end!==m.index+m[0].length)))continue;
  const message='LCB explicitly lists '+r.preferred+' with a capital classification letter. Only the case of this independently quoted letter before corporation is checked. The quote characters and following noun are preserved; enclosing literal quotations and unknown classifications remain protected.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion:r.letter,guideId:'lcb',guidePage:r.page,guidePrintedPage:references.lcb.pages[r.page-1].printedPage,rule:'Capitalization examples: Corporation classification letter',category:'Classification capitalization',context:ctx.at(start),checkId:'corporation-letter',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:r.page,guidePrintedPage:references.lcb.pages[r.page-1].printedPage,rule:'Capitalization examples: '+r.preferred,preferred:r.letter,ruleText:message}]});
 }
 return issues;
}
