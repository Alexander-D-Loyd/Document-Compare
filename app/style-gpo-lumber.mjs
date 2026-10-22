import {styleContext,memoizeStyleReview} from './style-context.mjs';
import {listedWordingContext} from './style-gpo-listed-wording.mjs';
import {originalBodyStyleContext} from './style-evidence.mjs';
export const GPO_LUMBER_SCOPE='Only the complete source-listed 2 by 4 / 2 x 4 lumber designation is recognized. GPO PDF290/printed276 explicitly rejects the multiplication sign in this lumber form; only that sign is compared, preserving both figures and their whitespace. The complete lumber witness owns its figures, so they do not become unrelated ordinary counts or sentence numerical relationships. LCB sentence-opening duties remain a whole-designation review without a guessed word replacement. Fully written measures such as a two-inch board, other dimensions, unlabelled x expressions, technical or extended identifiers, names, quotations, local terms, tables and removed/uncertain evidence retain their independent handling. No lumber size, engineering meaning or general x/× policy is inferred.';
const anchor='2 by 4 or 2 x 4 (lumber) (not 2/H115034)';
const pattern=/(?<![\p{L}\p{N}\p{M}_.,/⁄:+−-])(?<expr>2(?<left>\s*)(?<operator>x|×|by)(?<right>\s*)4)(?<cue>\s+lumber|\s*\(\s*lumber\s*\))(?![\p{L}\p{N}\p{M}_])/giu;
const ownersKey=Symbol('exact-source-listed-lumber');
function authority(references){
 const candidates=references?.gpo?.pages?.filter(p=>p.page===290)||[];
 if(candidates.length!==1)return null;const page=candidates[0],start=page.text.indexOf(anchor);
 return start<0?null:{page,passage:{page:290,start,end:start+anchor.length,text:anchor}};
}
function owners(doc,ctx){
 return memoizeStyleReview(doc,ctx,ownersKey,()=>{
  const view=listedWordingContext(doc),original=originalBodyStyleContext(doc)?.source||ctx.source,result=[];
  for(const m of original.matchAll(pattern)){
   const start=m.index,exprEnd=start+m.groups.expr.length,evidenceEnd=start+m[0].length,operatorStart=start+1+m.groups.left.length,operatorEnd=operatorStart+m.groups.operator.length;
   const sentence=ctx.sentenceAt(start),prefix=ctx.source.slice(sentence.start,start).replace(/^[\s”"’']*(?:\([a-z\d]+\)\s*)*/iu,'').trim(),opening=!prefix;
   const positive=ctx.source.slice(start,evidenceEnd)===original.slice(start,evidenceEnd)&&!view.guard(start,exprEnd,start,evidenceEnd);
   result.push({start,end:exprEnd,evidenceStart:start,evidenceEnd,operatorStart,operatorEnd,operator:m.groups.operator,opening,positive});
  }
  return result;
 });
}
// Original witnesses can veto a component-only repair, never create a finding.
// When an opening's lumber evidence was removed, keep its independent opening
// duty; intact positive openings are handled as one whole expression below.
export function lumberProtectionRanges(doc,references,ctx=styleContext(doc)){
 if(!authority(references))return [];
 return owners(doc,ctx).map(r=>({start:r.opening&&!r.positive?r.start+1:r.start,end:r.end}));
}
export function gpoLumberIssues(doc,references){
 const source=authority(references);if(!source)return [];
 const ctx=styleContext(doc),issues=[];
 for(const r of owners(doc,ctx)){
  if(!r.positive)continue;
  const citation={guideId:'gpo',guideName:'GPO Style Manual',guidePage:290,guidePrintedPage:source.page.printedPage,rule:'12.9(j)',preferred:r.operator==='×'?'x':null,ruleText:'2 by 4 or 2 x 4 (lumber) (not 2×4).',sourcePassage:source.passage};
  if(r.opening){
   const lcb=references?.lcb?.pages?.find(p=>p.page===21),gpo=references.gpo.pages.find(p=>p.page===294);
   if(!lcb||!gpo)continue;
   issues.push({start:r.start,end:r.end,evidenceStart:r.evidenceStart,evidenceEnd:r.evidenceEnd,text:doc.text.slice(r.start,r.end),suggestion:null,guideId:'lcb',guidePage:21,guidePrintedPage:lcb.printedPage,rule:'Numerals, general item 1',category:'Sentence-opening lumber designation',checkId:'gpo-lumber-opening-review',reviewSuggested:true,confidence:'Review Suggested',context:ctx.at(r.start),conflict:false,message:'LCB requires spelling out or rephrasing a sentence-opening number. Rephrase this complete source-listed lumber designation rather than changing an isolated figure. GPO prints 2 by 4 or 2 x 4 for lumber.'+(r.operator==='×'?' Its printed lumber exception also rejects ×; use x in that designation.':''),references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:21,guidePrintedPage:lcb.printedPage,rule:'Numerals, general item 1',preferred:null,ruleText:'Spell out all numbers when starting sentences.'},citation,{guideId:'gpo',guideName:'GPO Style Manual',guidePage:294,guidePrintedPage:gpo.printedPage,rule:'12.16',preferred:null,ruleText:'Spell out numbers at the beginning of a sentence or head; rephrase to avoid beginning with figures.'}]});
  }else if(r.operator==='×'){
   issues.push({start:r.operatorStart,end:r.operatorEnd,evidenceStart:r.evidenceStart,evidenceEnd:r.evidenceEnd,text:doc.text.slice(r.operatorStart,r.operatorEnd),suggestion:'x',guideId:'gpo',guidePage:290,guidePrintedPage:source.page.printedPage,rule:'12.9(j)',category:'Printed lumber designation',checkId:'gpo-lumber-source-form',context:ctx.at(r.start),conflict:false,message:'GPO explicitly prints 2 by 4 or 2 x 4 for lumber and rejects 2×4. Compare only the multiplication sign with the printed x; both original figures and their spacing are retained. This does not apply to other measurements or arithmetic.',references:[citation]});
  }
 }
 return issues;
}
