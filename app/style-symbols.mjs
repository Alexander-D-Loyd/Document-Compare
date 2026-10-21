import {currencySymbolSeriesIssues} from './style-currency-symbol-series.mjs';
import {mathResultIssues,GPO_MATH_RESULT_SCOPE} from './style-math-result-evidence.mjs';
import {styleContext} from './style-context.mjs';
import {symbolSeriesIssues} from './style-symbol-series.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
export const GPO_MATH_SYMBOL_SPACING_SCOPE='GPO 10.3 checks selected forms of the five printed arithmetic operators after an explicit equation/formula/expression cue, with two to six single-letter or numeric operands. Plain and canonical comma-grouped numeric strings, including decimals, retain every original digit without numeric conversion. Complete original cue, operand, operator and whitespace evidence, Unicode/technical endpoints, literal and bill-local quoted forms, finite name continuations, tables, strikes and unknown exclusions are protected. Recognized interior page heads preserve exact source selections. Explicit adjacent magnification/breeding descriptions and original preceding exception language protect the multiplication sign. Malformed number continuations, technical suffixes, unsupported algebra, scientific notation, unfamiliar contexts and typographic/semantic interpretation remain manual; this does not certify the whole mathematical rule.'+' '+GPO_MATH_RESULT_SCOPE;
export function symbolIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const literal=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const add=(start,end,suggestion,rule,message,evidence=null)=>{
  if(ctx.at(start)==='Heading'||ctx.tableAt(start)||literal.some(r=>r.start<end&&r.end>start))return;
  issues.push({start,end,...(evidence||{}),text:doc.text.slice(start,end),suggestion,guideId:'gpo',guidePage:277,guidePrintedPage:references.gpo.pages[276].printedPage,rule,category:'Symbol notation',context:ctx.at(start),checkId:'symbols',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:277,guidePrintedPage:references.gpo.pages[276].printedPage,rule,preferred:suggestion,ruleText:message}]});
 };
 // The printed source separates equation examples from magnification and
 // breeding examples into two columns. Only numeric or one-letter arithmetic
 // after an explicit prose cue establishes this selected spacing question.
 const number='(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?',atom='(?:'+number+'|[A-Za-z])',op='[+−±×÷]';
 const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?:equation|formula|expression)\\s+(?<expr>'+atom+'(?:\\s*'+op+'\\s*'+atom+'){1,5})(?=\\s*(?:[.;,:)]|=|\\bis\\b|$))','giu');
 let mathGuards=null;
 for(const m of source.matchAll(pattern)){
  const expr=m.groups.expr;if(!/\s[+−±×÷]|[+−±×÷]\s/u.test(expr))continue;
  mathGuards??={blocked:styleEvidenceGuard(doc,ctx),literal:originalStyleLiteralGuard(doc,ctx),quoted:billQuotedTermProtection(doc,ctx),originalContext:originalBodyStyleContext(doc)||ctx};
  const start=m.index+m[0].lastIndexOf(expr),end=start+expr.length,original=mathGuards.originalContext.source;
  if(ctx.at(m.index)==='Heading'||mathGuards.blocked(m.index,end)||mathGuards.literal(m.index,end)||mathGuards.quoted({start,end})||mathGuards.quoted({start:m.index,end}))continue;
  if([m.index,start,end].some(i=>cutsOriginalStyleWord(doc,i))||entityNameBoundaryBlocked(doc.text,source,original,m.index,end))continue;
  // A sentence period/comma may terminate an expression; a decimal/grouping
  // or technical continuation cannot make a partial operand eligible. Check
  // both current and negative original suffixes, including masked characters.
  if([source,original].some(text=>/^\s*[.,]\s*\d/u.test(text.slice(end))))continue;
  const tail=original.slice(end),before=original.slice(Math.max(0,m.index-10),m.index);
  if(/^\s+(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board|Association|Foundation|Institute|Program|Company|Council)(?![\p{L}\p{N}\p{M}_])/u.test(tail)||/(?<![\p{L}\p{N}\p{M}_])[Tt]he\s+$/u.test(before)&&/^\s+is\s+(?:hereby\s+)?(?:created|established|designated)(?![\p{L}\p{N}\p{M}_])/u.test(tail))continue;
  // A complete original incorporation/creation suffix supplies negative
  // name evidence. Removing it must not expose the printed title as arithmetic.
  if(/(?<![\p{L}\p{N}\p{M}_])[Tt]he\s+$/u.test(before)&&/^,\s*(?:Inc\.|Corp\.|Incorporated|Corporation),?\s+is\s+(?:hereby\s+)?(?:created|established|designated)(?![\p{L}\p{N}\p{M}_])/u.test(tail))continue;
  if(expr.includes('×')){
   const sentenceStart=mathGuards.originalContext.sentenceAt(m.index).start,prior=original.slice(sentenceStart,m.index);
   const exception=/^\s*(?:\(\s*)?(?:(?:is|are|indicates?|represents?|denotes?)(?![\p{L}\p{N}\p{M}_])\s+(?:(?:a|an|the)\s+)?)?(?:used\s+(?:for|in)\s+)?(?:magnification|(?:(?:plant|animal)[-\s]+)?breeding|crossed\s+with)(?![\p{L}\p{N}\p{M}_])/iu;
   if(/(?<![\p{L}\p{N}\p{M}_])(?:magnification|breeding|crossed\s+with)(?![\p{L}\p{N}\p{M}_])/iu.test(prior)||exception.test(tail))continue;
  }
  add(start,end,expr.replace(/\s*([+−±×÷])\s*/gu,'$1'),'10.3','GPO 10.3 closes the printed arithmetic operators against figures and symbols. This complete original mathematical cue and its simple operands establish a selected spacing comparison. Numeric strings are preserved; explicit breeding/magnification meanings, malformed or technical continuations and unfamiliar mathematical contexts remain protected or manual.',{evidenceStart:m.index,evidenceEnd:end});
 }
 issues.push(...symbolSeriesIssues(doc,references),...mathResultIssues(doc,references),...currencySymbolSeriesIssues(doc,references));
 return issues;
}
