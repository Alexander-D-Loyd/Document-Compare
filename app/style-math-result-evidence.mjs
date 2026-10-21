import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';

export const GPO_MATH_RESULT_SCOPE='GPO 10.3 additionally checks the printed “The result is 4×4” construction: an intact The result is cue followed by exactly two canonical unsigned numeric strings and the multiplication sign. Close only the operator spacing, preserving every numeric digit. Complete original cue/operator/operand evidence, Unicode/technical boundaries, names, quotations and bill-local wording, tables, strikes and unknown exclusions are required. Original magnification, breeding and technical continuations remain protected. Other result constructions, longer formulas, letters, signed/scientific/fractional operands and semantic/typographic interpretation remain manual.';
const number='(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?';
const canonical=/^(?:[1-9]\d{0,2}(?:,\d{3})+|0|[1-9]\d*)(?:\.\d+)?$/u;
const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])The\\s+result\\s+is\\s+(?<expr>(?<left>'+number+')\\s*×\\s*(?<right>'+number+'))(?=\\s*(?:[.;,!?]|$))','giu');
const heads='(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board|Association|Foundation|Institute|Program|Company|Corporation|Council|Office|Bureau|Center)';
const nameTail=new RegExp('^\\s+(?:[\\p{Lu}][\\p{L}\\p{M}]*\\s+){0,3}'+heads+'(?![\\p{L}\\p{N}\\p{M}_])','u');
const semanticException=/(?<![\p{L}\p{N}\p{M}_])(?:magnification|breeding|crossed\s+with)(?![\p{L}\p{N}\p{M}_])/iu;
export function mathResultIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,originalContext=originalBodyStyleContext(doc)||ctx,original=originalContext.source;
 const blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),issues=[];
 for(const m of source.matchAll(pattern)){
  const expr=m.groups.expr,start=m.index+m[0].lastIndexOf(expr),end=start+expr.length;
  if(!/\s×|×\s/u.test(expr)||!canonical.test(m.groups.left)||!canonical.test(m.groups.right)||ctx.at(m.index)==='Heading'||blocked(m.index,end)||literal(m.index,end)||quoted({start:m.index,end})||quoted({start,end})||[m.index,start,end].some(at=>cutsOriginalStyleWord(doc,at))||entityNameBoundaryBlocked(doc.text,source,original,m.index,end))continue;
  const after=original.slice(end),before=original.slice(0,m.index),sentence=originalContext.sentenceAt(m.index),context=original.slice(sentence.start,sentence.end);
  if(/^\s*(?:[-+−/⁄∕*^×÷±=]|[.,]\s*\d)/u.test(after)||nameTail.test(after)||/^,\s*(?:Inc\.|Corp\.|Incorporated|Corporation),?\s+is\s+(?:hereby\s+)?(?:created|established|designated)(?![\p{L}\p{N}\p{M}_])/u.test(after)||/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Form|Model|Figure|Table|Item)\s*$/iu.test(before)||semanticException.test(context))continue;
  const suggestion=expr.replace(/\s*×\s*/u,'×'),message='GPO 10.3 prints “The result is 4×4” with the multiplication sign closed against its figures. This complete original result cue and two numeric operands support the selected spacing comparison. Preserve every digit; magnification, breeding, names and more complex expressions remain protected or manual.';
  issues.push({start,end,evidenceStart:m.index,evidenceEnd:end,text:doc.text.slice(start,end),suggestion,guideId:'gpo',guidePage:277,guidePrintedPage:references.gpo.pages[276].printedPage,rule:'10.3',category:'Symbol notation',context:ctx.at(start),checkId:'symbols',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:277,guidePrintedPage:references.gpo.pages[276].printedPage,rule:'10.3',preferred:suggestion,ruleText:message}]});
 }
 return issues;
}
