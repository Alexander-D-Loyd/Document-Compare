import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
import {GPO_LISTED_COMPOUND_FORMS,GPO_LISTED_COMPOUND_SOURCE_PAGES} from './data/gpo-listed-compound-forms.mjs';

export const GPO_LISTED_COMPOUND_SCOPE='Finite original GPO2016 chapter7 table rows reconstructed from all80 physical pages127–206: actual four-column order, bold headword font, indentation, # spacemarks, lexical hyphens, continuation heads and printed role labels. Only individually unqualified forms and selected explicit n./n.,u.m. rows enter this registry. Every finding additionally requires an intact original determiner + same-letter listed form + explicit nominal continuation; no bare adjacent-word, unit-modifier or generic English-compound rule is applied. Source7.6/7.8 literal/nonliteral cautions, conflicting printed forms, role/subject qualifiers, prefix generators, ambiguous layout, existing particle-noun checks and all finite LCB lexical source choices remain separately recorded. Whole original cue/word/boundary evidence, quotations/bill-local forms, source names, headings, tables, technical attachments, strikes and unknown exclusions remain protected; spelling, plural generation and meaning are not inferred.';
const byKey=new Map(GPO_LISTED_COMPOUND_FORMS.map(r=>[r.key,r]));
const expectedPages=new Map(GPO_LISTED_COMPOUND_SOURCE_PAGES.map(p=>[p.page,p.text]));
const knownWords=new Set(GPO_LISTED_COMPOUND_FORMS.flatMap(r=>r.preferred.split(/[ -]/u)));
const compact=s=>s.replace(/[\s-]/gu,'');
const cue=/(?<![\p{L}\p{N}\p{M}_])(?<lead>a|an|the|this|that|each|every|its|their|our|your)\s+/giu;
const words=/^[a-z]+(?:[\s-]+[a-z]+){0,5}/iu;
const continuation=/^\s+(?<tail>of|is|are|was|were|shall|must)(?![\p{L}\p{N}\p{M}_])/iu;
const creationTail=/^\s+is\s+(?:hereby\s+)?(?:created|established|designated)(?![\p{L}\p{N}\p{M}_])/u;
const identifier=/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision)\s*$/iu;
function listedIssues(doc,references){
 const supplied=references?.gpo?.pages||[],pages=new Map(),pageCounts=new Map();
 for(const page of supplied){pages.set(page.page,page);pageCounts.set(page.page,(pageCounts.get(page.page)||0)+1);}
 if(![125,126].every(page=>pageCounts.get(page)===1&&pages.get(page)?.text===expectedPages.get(page)))return [];
 const ctx=styleContext(doc),source=ctx.source,original=originalBodyStyleContext(doc)?.source||source;
 const blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),issues=[],validPages=new Map();
 const validPage=page=>{if(!validPages.has(page))validPages.set(page,pageCounts.get(page)===1&&pages.get(page)?.text===expectedPages.get(page));return validPages.get(page);};
 for(const m of source.matchAll(cue)){
  const start=m.index+m[0].length,span=words.exec(source.slice(start));if(!span)continue;
  // At most six token endpoints per original determiner: one text scan and
  // constant dictionary lookups, including listed forms containing of/is.
  for(const token of span[0].matchAll(/[a-z]+/giu)){
  const end=start+token.index+token[0].length,variant=source.slice(start,end),tail=continuation.exec(source.slice(end));if(!tail)continue;
  // Separate finite table identity from typography and arbitrary separators.
  // Capitalized names, narrative dashes and unsupported spaced operators do
  // not become lower-case compound spelling corrections.
  if(!/^[a-z]+(?:\s+[a-z]+|-[a-z]+)*$/u.test(variant))continue;
  const row=byKey.get(compact(variant));if(!row||variant.replace(/\s+/gu,' ')===row.preferred)continue;
  if(!row.sourcePassages.every(p=>validPage(p.page)))continue;
  const evidenceStart=m.index,evidenceEnd=end+tail[0].length;
  // A source-created title cannot be exposed by masking its boundaries.
  if(ctx.at(evidenceStart)==='Heading'||blocked(evidenceStart,evidenceEnd)||literal(evidenceStart,evidenceEnd)||quoted({start,end})||quoted({start:evidenceStart,end:evidenceEnd})||[evidenceStart,start,end,evidenceEnd].some(at=>cutsOriginalStyleWord(doc,at))||entityNameBoundaryBlocked(doc.text,source,original,evidenceStart,evidenceEnd)||entityNameBoundaryBlocked(doc.text,source,original,start,end)||identifier.test(original.slice(0,evidenceStart))||creationTail.test(original.slice(end)))continue;
  if([...variant.matchAll(/-/gu)].some(h=>! /[-\u2010\u2011]/u.test(doc.text[start+h.index]||''))||/-[ \t]*\n/u.test(doc.text.slice(start,end)))continue;
  const message='GPO’s explicit compounding table prints “'+row.preferred+'”'+(row.kind==='explicit-nominal'?' as a noun':' without a role/meaning qualifier')+'. This complete original determiner and nominal-continuation pattern supplies bounded noun evidence for the listed same-letter form. The check does not infer compound modifiers, generate new compounds or decide literal/nonliteral meanings; separately qualified/conflicting source forms remain manual.';
  const citations=row.sourcePassages.map(p=>({guideId:'gpo',guideName:'GPO Style Manual',guidePage:p.page,guidePrintedPage:pages.get(p.page).printedPage,rule:'7. Compounding Examples',preferred:row.preferred,ruleText:message,sourcePassage:{...p}}));
  issues.push({start,end,evidenceStart,evidenceEnd,text:doc.text.slice(start,end),suggestion:row.preferred,guideId:'gpo',guidePage:row.page,guidePrintedPage:row.printedPage,rule:'7. Compounding Examples',category:'Explicit listed compound noun',context:ctx.at(start),checkId:'gpo-listed-compounds',conflict:false,message,listedCompoundEvidence:{sourceRow:row.id,kind:row.kind,head:row.head,raw:row.raw,nominalLead:m.groups.lead,nominalContinuation:tail.groups.tail},references:citations});
  break;
  }
 }
 return issues;
}
export function gpoListedCompoundIssues(doc,references){
 const view=styleWordDivisionView(doc,{knownWords,knownWordsOnly:true,preserveRemainingWords:true});
 if(!view)return withStyleContext(doc,()=>listedIssues(doc,references));
 const issues=withStyleContext(view.doc,()=>listedIssues(view.doc,references));
 return view.restore(issues).map((issue,n)=>({...issue,evidenceStart:view.toSource(issues[n].evidenceStart),evidenceEnd:view.toSource(issues[n].evidenceEnd,true)}));
}
