import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {compoundSourceBoundaryBlocked} from './style-compound-source-boundaries.mjs';

export const LCB_IN_KIND_SCOPE='LCB11 explicitly lists in-kind in unit-modifier position. A complete selected nominal construction checks in kind before assistance, support, contribution(s), donation(s), payment(s), benefit(s) or compensation, including an intervening and/or cash, monetary or financial alternative. An intact determiner establishes the bounded noun phrase. Adverbial payment in kind, missing/unknown heads, other coordination, literal or bill-local wording, names, tables, headings, technical identifiers, original Unicode boundaries, strikes and uncertain exclusions remain protected or manual. Only the listed modifier changes; the noun phrase and source text remain intact.';
const word='[\\p{L}\\p{N}\\p{M}_]',pattern=new RegExp('(?<!'+word+')(?<lead>a|an|the|any|other|some|such|this|these|those|its|their)\\s+(?<modifier>in\\s+kind)(?<alternative>\\s+(?:and|or)\\s+(?:cash|monetary|financial))?\\s+(?<head>assistance|support|contributions?|donations?|payments?|benefits?|compensation)(?!'+word+')','giu');
const titleAfter=/^\s+(?:(?:of|for|the|and|in|on)\s+){0,2}[A-Z][\p{L}\p{M}’'-]*|^\s*,?\s*(?:Inc\.|Corp\.|Incorporated|Corporation)(?![\p{L}\p{N}\p{M}_])/u;
const identifierBefore=/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision|Code|ID)\s*$/iu;
const creationAfter=/^\s+(?:(?:program|fund|account|authority|agency|commission|board)\s+)?(?:is|are)\s+(?:hereby\s+)?(?:created|established|designated)\b/iu;
export function lcbInKindIssues(doc,references){
 const page=references.lcb?.pages[10],printed='in-kind (u.m.)',at=page?.text.indexOf(printed);if(!page||at<0)return [];
 const ctx=styleContext(doc),blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),original=originalBodyStyleContext(doc)?.source||ctx.source,issues=[];
 for(const m of ctx.source.matchAll(pattern)){
  const roleStart=m.index,roleEnd=roleStart+m[0].length,start=roleStart+m[0].indexOf(m.groups.modifier),end=start+m.groups.modifier.length;
  if(ctx.at(start)==='Heading'||blocked(roleStart,roleEnd)||literal(roleStart,roleEnd)||quoted({start:roleStart,end:roleEnd})||[roleStart,start,end,roleEnd].some(i=>cutsOriginalStyleWord(doc,i)))continue;
  if(compoundSourceBoundaryBlocked(doc.text,ctx.source,original,roleStart,roleEnd)||compoundSourceBoundaryBlocked(doc.text,ctx.source,original,start,end)||titleAfter.test(original.slice(roleEnd))||creationAfter.test(original.slice(roleEnd))||identifierBefore.test(original.slice(0,roleStart)))continue;
  const sourceRole=original.slice(roleStart,roleEnd);if(sourceRole.replace(/\s+/gu,' ')!==m[0].replace(/\s+/gu,' ')||m.groups.head!==m.groups.head.toLowerCase()||m.groups.modifier===m.groups.modifier.toUpperCase())continue;
  const suggestion=/^[A-Z]/u.test(m.groups.modifier)?'In-kind':'in-kind',message='LCB page 11 lists “in-kind” in unit-modifier position. Here it modifies “'+m.groups.head+'”'+(m.groups.alternative?' in coordination with “'+m.groups.alternative.trim()+'”':'')+'. Keep adverbial “in kind” open; quotations, source names and uncertain noun roles remain protected.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:11,guidePrintedPage:page.printedPage,rule:'Hyphenation: in-kind (u.m.)',category:'Listed modifier hyphenation',context:ctx.at(start),checkId:'lcb-in-kind-modifier',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:11,guidePrintedPage:page.printedPage,rule:'Hyphenation: in-kind (u.m.)',preferred:suggestion,ruleText:message,sourcePassage:{start:at,end:at+printed.length,text:printed}}]});
 }
 return issues;
}
