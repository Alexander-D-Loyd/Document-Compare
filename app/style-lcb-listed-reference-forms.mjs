import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';

const word='[\\p{L}\\p{N}\\p{M}_]',pattern=new RegExp('(?<!'+word+')(?<label>Article)\\s+(?<identifier>XIIIB|XIII-B)(?!'+word+')(?<continuation>\\s+of\\s+the\\s+California\\s+Constitution)(?!'+word+')','gu');
const attachedBefore=/[-\u2010-\u2015/:\\#@]/u,attachedAfter=/^[-\u2010-\u2015/:\\#@]|^\.\d|^[’'][\p{L}\p{N}\p{M}_]/u;
const titleExtension=/^\s+(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board|Institute|Association|Foundation|Trust|Project|Program)\b/u;
const identifierLead=/(?<![\p{L}\p{N}\p{M}_])(?:Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Code|ID)\s*$/iu;
export const LCB_LISTED_REFERENCE_FORM_SCOPE='Only the exact XIIIB and ASCII-hyphenated XIII-B aliases after Article, with the complete intact of the California Constitution continuation, are compared with LCB22’s printed Article XIII B. The whole Article expression receives one spacing suggestion; no source text, numeral value or legal identity is rewritten or inferred. Other Roman articles, Arabic identifiers, case variants and generic suffixes retain their existing owners or manual review. Complete source/continuation evidence, original Unicode boundaries, visible body dashes, technical identifiers, extended names, tables/headings, source strikes/exclusions, restored original quotation enclosures and bill-local quoted forms remain protected; identified PDF margins and interior running heads retain physical offsets.';

export function lcbListedReferenceFormIssues(doc,references){
 const page=references?.lcb?.pages?.[21],sourceExample=page&&/Article\s+XIII\s+B(?![\p{L}\p{N}\p{M}_])/u.exec(page.text);if(!sourceExample)return [];
 const ctx=styleContext(doc),source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),original=originalBodyStyleContext(doc)?.source||source,issues=[];
 for(const m of source.matchAll(pattern)){
  const start=m.index,evidenceEnd=start+m[0].length,end=evidenceEnd-m.groups.continuation.length,identifierStart=end-m.groups.identifier.length,before=original.slice(Math.max(0,start-180),start),after=original.slice(evidenceEnd),prior=/(?<![\p{L}\p{N}\p{M}_])([\p{L}\p{M}][\p{L}\p{M}’'-]*)\s+$/u.exec(before);
  if(ctx.at(start)==='Heading'||blocked(start,evidenceEnd)||literal(start,evidenceEnd)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||cutsOriginalStyleWord(doc,evidenceEnd)||attachedBefore.test(doc.text[start-1]||'')||attachedAfter.test(original.slice(end))||attachedAfter.test(after)||titleExtension.test(after)||identifierLead.test(before)||prior&&/^[A-Z]/u.test(prior[1])&&!['The','Under','See'].includes(prior[1]))continue;
  // An analysis-view dash can stand for a visible body em/en dash. Only the
  // actual ASCII spelling printed in this finite alias is eligible; a real
  // end-of-line division or reader-identified head must not become a typo.
  if(doc.text.slice(identifierStart,end)!==m.groups.identifier)continue;
  const selection={start,end,text:doc.text.slice(start,end)},identifier={start:identifierStart,end,text:doc.text.slice(identifierStart,end)},continuation={start:end,end:evidenceEnd,text:doc.text.slice(end,evidenceEnd)};
  if(quoted(selection)||quoted(identifier)||quoted(continuation))continue;
  const example={guideId:'lcb',guidePage:22,start:sourceExample.index,end:sourceExample.index+sourceExample[0].length,text:sourceExample[0]};
  issues.push({start,end,text:selection.text,suggestion:'Article XIII B',evidenceStart:start,evidenceEnd,checkId:'lcb-listed-reference-form',guideId:'lcb',guidePage:22,guidePrintedPage:String(page.printedPage),rule:'Numerals: Code Sections and Constitution',category:'Printed Constitutional Reference Form',context:ctx.at(start),reviewSuggested:false,conflict:false,listedReferenceEvidence:{kind:'printed-lcb-article-form',start,end:evidenceEnd,sourceText:doc.text.slice(start,evidenceEnd),printedForm:'Article XIII B',selection,identifier,continuation,sourceExample:example},message:'LCB22 prints “Article XIII B”. This complete California Constitution reference uses the exact XIIIB or XIII-B alias; compare its identifier boundary with the printed form. The suggestion changes spacing only and does not establish the cited provision’s legal identity.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:22,guidePrintedPage:String(page.printedPage),rule:'Numerals: Code Sections and Constitution',preferred:'Article XIII B',ruleText:sourceExample[0],sourcePassage:{start:example.start,end:example.end,text:example.text}}]});
 }return issues;
}

export function restoreListedReferenceEvidence(e,map,text){
 const restore=r=>{const start=map(r.start),end=map(r.end,true);return {...r,start,end,text:text.slice(start,end)};},start=map(e.start),end=map(e.end,true);
 return {...e,start,end,sourceText:text.slice(start,end),selection:restore(e.selection),identifier:restore(e.identifier),continuation:restore(e.continuation)};
}
