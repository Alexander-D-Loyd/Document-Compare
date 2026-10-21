import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';
export const EDITORIAL_NOTATION_SCOPE='Exact bracketed underscore supplied annotations and the uppercase V. connector after a finite case/decision/holding cue receive selected GPO checks. The complete original brackets, wording, legal cue and simple surname pair are required. Sentence-opening cues and recognized physical layout divisions retain exact highlights. Quoted wording, names, technical attachments, tables, strikeouts and arbitrary excluded content remain protected. The four printed emphasis annotations remain unchanged. Italic typography, legal case identity, complex names, unbracketed annotations and broader editorial meaning require manual review.';
export function editorialNotationIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),original=originalBodyStyleContext(doc)?.source||source;
 const add=(start,end,suggestion,rule,page,message,evidenceStart=start,evidenceEnd=end)=>{
  if(ctx.at(evidenceStart)==='Heading'||blocked(evidenceStart,evidenceEnd)||literal(evidenceStart,evidenceEnd)||[start,end,evidenceStart,evidenceEnd].some(i=>cutsOriginalStyleWord(doc,i))||entityNameBoundaryBlocked(doc.text,source,original,evidenceStart,evidenceEnd))return;
  if(original[evidenceStart-1]==='['||original[evidenceEnd]===']')return;
  issues.push({start,end,evidenceStart,evidenceEnd,text:doc.text.slice(start,end),suggestion,guideId:'gpo',guidePage:page,guidePrintedPage:references.gpo.pages[page-1].printedPage,rule,category:'Editorial notation',context:ctx.at(start),checkId:'editorial-notation',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:page,guidePrintedPage:references.gpo.pages[page-1].printedPage,rule,preferred:suggestion,ruleText:message}]});
 };
 for(const m of source.matchAll(/\[underscore\s+supplied\]/gi)){
  const start=m.index+1,end=m.index+m[0].length-1;
  let suggestion='italic supplied';if(/^[A-Z]/.test(m[0][1]))suggestion='Italic supplied';
  add(start,end,suggestion,'11.4',283,'GPO 11.4 changes the editorial annotation “underscore supplied” to “italic supplied,” while retaining emphasis in original/supplied/added/ours. This only checks the exact bracketed annotation, not the typography of the quoted passage.',m.index,m.index+m[0].length);
 }
 // An explicit case cue distinguishes the versus connector from a middle
 // initial or a Roman-numeral title. This checks only uppercase V., leaving
 // authentic names and roman/italic court-case treatment for manual review.
 const surname="[A-Z][a-z]+(?:[’'][A-Z]?[a-z]+)?";
 const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?:[Cc]ase\\s+of|[Dd]ecision\\s+in|[Hh]olding\\s+in)\\s+'+surname+'\\s+(?<term>V\\.)\\s+'+surname+'(?![\\p{L}\\p{N}\\p{M}_])','gu');
 for(const m of source.matchAll(pattern)){
  const start=m.index+m[0].indexOf(m.groups.term),end=start+2;
  add(start,end,'v.','11.8',284,'GPO 11.8 sets the versus connector in a legal case name in lowercase. This check requires an explicit case/decision/holding cue; names, italics and unfamiliar case references still need review.',m.index,m.index+m[0].length);
 }
 return issues;
}
