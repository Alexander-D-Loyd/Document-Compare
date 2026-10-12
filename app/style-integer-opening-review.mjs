import {styleContext,withStyleContext}from './style-context.mjs';
import {styleEvidenceGuard,originalBodyStyleContext}from './style-evidence.mjs';
import {numericExpressionGuard}from './style-numeric-expression-evidence.mjs';
import {styleWordDivisionView}from './style-word-divisions.mjs';
import {EXACT_INTEGER_TOKEN_PATTERN,exactIntegerParts,exceedsSafeInteger}from './style-exact-integer-digits.mjs';
import {openingQuantityClause,quantityOpeningPrefix,quantitySingleQuoteRanges,quantityPredicateBoundaryBlocked}from './style-opening-quantity-evidence.mjs';
import {numeralIdentifierRanges}from './style-numeral-identifiers.mjs';

export const ORDINARY_INTEGER_OPENING_REVIEW_SCOPE='Unowned complete canonical ordinary integer/ordinal figures, including zero, at source-confirmed openings receive conditional LCB21/GPO12.16 spelling-or-rephrasing guidance, including the first sentence after the actual Digest heading. Existing precise opening corrections retain ownership. A competing nonopening Digest-body disagreement stays suppressed without suppressing the independent agreeing general opening question; no conflicting body replacement is shown. An intact selected finite clause supplies stronger evidence; unfamiliar clauses retain intact opening words and explicitly unresolved sentence/label roles without a word replacement. Exact grouping or nonopening ordinal owners merge with the independent opening question as one stop. Whole source prefixes, numbers and opening words, original/active legal abbreviation citations including Ch./Chs./Stats./H.R./S.R., known statutory heading labels, original unknown content, quotations, names, tables and numeric expressions remain protected. Percentages require an intact finite clause here; dedicated opening/fragment percentage methods retain their selected scope. Source coordinates survive recognized word/page divisions. Actual clause meaning, unfamiliar technical identities, broader percentage roles and general sentence segmentation remain incomplete; this is conditional checking, not whole numeral-rule automation.';
export const ORDINARY_OPENING_MERGE_CHECK_IDS=['quantity-separators','numerals','lcb-unknown-money-review'];
const token=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_.,/⁄$+−-])(?:0|'+EXACT_INTEGER_TOKEN_PATTERN+'(?:st|nd|rd|th)?)(?![\\p{L}\\p{N}\\p{M}_.,/⁄$+−-])','giu');
const word=/^\s+([\p{L}][\p{L}\p{M}]*(?:[’'-][\p{L}\p{M}]+)*)(?![\p{L}\p{N}\p{M}_-])/u;
const structural=new Set('ab sb sec section sections article articles chapter chapters division divisions part parts item items schedule schedules no id model version class type code route highway'.split(' '));
const abbreviation=/(?<![\p{L}\p{N}\p{M}_])(?:Chs?\.|Stats\.|U\.S\.C\.|C\.F\.R\.|H\.R\.|S\.R\.)\s*$/iu;
// An explicit statutory heading label is layout, not a fresh prose sentence.
// SECTION labels are excluded here: their following enactment text is prose.
const headingLabel=/^(?:Article|Chapter|Division|Part|Title)$/iu;
const previousToken=(source,before)=>{let end=before;while(end>0&&/\s/u.test(source[end-1]))end--;let start=end;while(start>0&&!/\s/u.test(source[start-1]))start--;return {start,end,text:source.slice(start,end)};};
function openingLabelBlocked(source,start){
 // Examine only the actual preceding tokens. Repeatedly searching every
 // full document prefix for a suffix would scale poorly on budget bills.
 const number=previousToken(source,start);if(abbreviation.test(number.text))return true;
 if(!/^\d+(?:\.\d+)*\.$/u.test(number.text))return false;const label=previousToken(source,number.start);if(!headingLabel.test(label.text))return false;
 const lineStart=source.lastIndexOf('\n',label.start-1)+1;return !source.slice(lineStart,label.start).trim();
}
function review(doc,refs,existing,protectedRanges){
 const ctx=styleContext(doc),original=originalBodyStyleContext(doc),blocked=styleEvidenceGuard(doc,ctx),numeric=numericExpressionGuard(doc,ctx),singles=[...quantitySingleQuoteRanges(ctx.source),...(original?quantitySingleQuoteRanges(original.source):[])],ids=numeralIdentifierRanges(ctx.source),out=[];
 for(const m of ctx.source.matchAll(token)){
  const parts=m[0]==='0'?{digits:'0',suffix:null}:exactIntegerParts(m[0]);if(!parts||exceedsSafeInteger(parts.digits))continue;const start=m.index,end=start+m[0].length;
  if(quantityOpeningPrefix(ctx,start)||ctx.at(start)==='Heading'||numeric(start,end)||ids.some(r=>r.start<end&&r.end>start)||protectedRanges.some(r=>r.start<end&&r.end>start))continue;
  if([ctx,original].filter(Boolean).some(c=>openingLabelBlocked(c.source,start))||original&&(quantityOpeningPrefix(original,start)||original.literalAt(start,end)||original.tableAt(start)))continue;
  const next=word.exec(ctx.source.slice(end));if(!next||structural.has(next[1].toLowerCase()))continue;const firstEnd=end+next[0].length;if(quantityPredicateBoundaryBlocked(doc,firstEnd)||blocked(start,firstEnd))continue;
  const clause=openingQuantityClause(ctx.source,end,{allowPartitive:true,originalSource:doc.text}),finite=clause&&!quantityPredicateBoundaryBlocked(doc,clause.evidenceEnd)&&!blocked(start,clause.evidenceEnd),evidenceEnd=finite?clause.evidenceEnd:firstEnd;
  if(!finite&&/^percent(?:age)?$/iu.test(next[1])||singles.some(r=>r.start<evidenceEnd&&r.end>start))continue;
  // A Digest body-form disagreement is conditional on a nonopening role.
  // Keep it suppressed; the independent general opening rules agree and
  // can still supply a null-replacement question for this source boundary.
  const owners=existing.filter(i=>i.start<=start&&i.end>=end),digestBodyConflict=i=>i.conflict&&i.checkId==='numerals'&&i.context==='Digest'&&/^Numerals: Digest, item [12]$/u.test(i.rule);
  if(owners.some(i=>i.conflict&&!digestBodyConflict(i)||i.rule==='Numerals, general item 1'||i.references?.some(r=>r.rule==='12.16'&&r.preferred!==null)||!ORDINARY_OPENING_MERGE_CHECK_IDS.includes(i.checkId)))continue;
  out.push({start,end,text:doc.text.slice(start,end),suggestion:null,evidenceStart:start,evidenceEnd,openingClauseText:doc.text.slice(start,evidenceEnd),openingEvidenceKind:finite?'selected-finite-clause':'unresolved-opening-role',exactSourceInteger:parts.digits,guideId:'lcb',guidePage:21,guidePrintedPage:String(refs.lcb.pages[20].printedPage),rule:'Numerals, general item 1',category:'Sentence-opening Number Review',context:ctx.at(start),checkId:'lcb-integer-opening-review',confidence:'Review Suggested',reviewSuggested:true,reviewKind:'ordinary-integer-opening',conflict:false,matchesPrimary:false,message:'Review Suggested: This complete source number appears to begin a sentence or head. LCB and GPO recommend spelling out or rephrasing a sentence-opening number. '+(finite?'An intact selected clause supports the opening. ':'Its clause or label role remains unresolved; confirm the intended context. ')+'Preserve the exact value, ordinal meaning and any unit. No word form or replacement is proposed.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:21,guidePrintedPage:String(refs.lcb.pages[20].printedPage),rule:'Numerals, general item 1',preferred:null,ruleText:'Spell out all numbers when starting sentences.'},{guideId:'gpo',guideName:'GPO Style Manual',guidePage:294,guidePrintedPage:String(refs.gpo.pages[293].printedPage),rule:'12.16',preferred:null,ruleText:'Spell out numbers at the beginning of a sentence or head. Rephrase a sentence or head to avoid beginning with figures.'}]});
 }return out;
}
export function integerOpeningReviewIssues(doc,references,{existingIssues=[],protectedRanges=[]}={}){
 if(!references?.lcb?.pages?.[20]||!references?.gpo?.pages?.[293])return [];const view=styleWordDivisionView(doc),reviewDoc=view?.doc||doc,toView=i=>({...i,start:view.toView(i.start),end:view.toView(i.end)}),prior=view?existingIssues.map(toView):existingIssues,protections=view?protectedRanges.map(toView):protectedRanges,found=withStyleContext(reviewDoc,()=>review(reviewDoc,references,prior,protections));if(!view)return found;
 return view.restore(found).map((i,n)=>{const evidenceStart=view.toSource(found[n].evidenceStart),evidenceEnd=view.toSource(found[n].evidenceEnd,true);return {...i,evidenceStart,evidenceEnd,openingClauseText:doc.text.slice(evidenceStart,evidenceEnd)};});
}
