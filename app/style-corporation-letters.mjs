import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
export const LCB_CORPORATION_LETTERS=[{page:18,preferred:'“C” corporation',letter:'C'},{page:19,preferred:'“S” corporation',letter:'S'}];
export const LCB_CORPORATION_EVIDENCE_SCOPE='Independently quoted lowercase c/s before a complete corporation/corporations noun receive letter-only case findings. The quote pair and complete noun are intact evidence with original Unicode boundaries; an own one-letter quote is distinguished from an enclosing literal. Strikes, tables, unknown exclusions and damaged noun suffixes remain protected. Known interior heads and margins preserve exact letter selections; unquoted letters, other classifications, name authenticity and semantic status remain manual.';
export function corporationLetterIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 for(const m of source.matchAll(/(?:“([cs])”|"([cs])")(?=\s+corporations?\b)/g)){
  const letter=m[1]||m[2],start=m.index+1,end=start+1,r=LCB_CORPORATION_LETTERS.find(r=>r.letter===letter.toUpperCase());
  const noun=/^\s+corporations?(?![\p{L}\p{N}\p{M}_])/u.exec(source.slice(m.index+m[0].length));if(!noun)continue;
  const evidenceStart=m.index,evidenceEnd=m.index+m[0].length+noun[0].length;
  const blocked=styleEvidenceGuard(doc,{...ctx,literalAt:(a,b)=>ctx.literalRanges.some(q=>q.start<b&&q.end>a&&(q.start!==m.index||q.end!==m.index+m[0].length))});
  if(cutsOriginalStyleWord(doc,evidenceEnd)||blocked(evidenceStart,evidenceEnd))continue;
  if(ctx.at(start)==='Heading'||ctx.tableAt(start))continue;
  if(/^\s+corporations?\s+(?:(?:of|for|the|and|in|on)\s+)?[A-Z][a-z]/.test(source.slice(m.index+m[0].length)))continue;
  // The quote pair around one classification letter is the listed form,
  // but an enclosing literal quotation still protects all source wording.
  if(ctx.literalRanges.some(q=>q.start<end&&q.end>start&&(q.start!==m.index||q.end!==m.index+m[0].length)))continue;
  const message='LCB explicitly lists '+r.preferred+' with a capital classification letter. Only the case of this independently quoted letter before corporation is checked. The quote characters and following noun are preserved; enclosing literal quotations and unknown classifications remain protected.';
  issues.push({start,end,evidenceStart,evidenceEnd,text:doc.text.slice(start,end),suggestion:r.letter,guideId:'lcb',guidePage:r.page,guidePrintedPage:references.lcb.pages[r.page-1].printedPage,rule:'Capitalization examples: Corporation classification letter',category:'Classification capitalization',context:ctx.at(start),checkId:'corporation-letter',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:r.page,guidePrintedPage:references.lcb.pages[r.page-1].printedPage,rule:'Capitalization examples: '+r.preferred,preferred:r.letter,ruleText:message}]});
 }
 return issues;
}
