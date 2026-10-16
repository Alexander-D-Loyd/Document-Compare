import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {originalRoleBoundaryBlocked} from './style-original-role-boundaries.mjs';
const word='[\\p{L}\\p{N}\\p{M}_]',pattern=new RegExp('(?<!'+word+')non[\\s-]*civil[\\s-]*service(?!'+word+')','giu');
const prep=/(?<![\p{L}\p{N}\p{M}_])(?:in|within|without|outside|of|from)\s+(?:(?:the|this|that|any)\s+)?$/iu;
const determiner=/(?<![\p{L}\p{N}\p{M}_])(?:the|this|that|any)\s+$/iu;
const predicate=/^\s+(?:is|was|shall|must|may|will|remains?|continues?|exists?)(?![\p{L}\p{N}\p{M}_])/iu;
const terminal=/^\s*(?:[.;!?)]|$)/u;
const titleAfter=/^\s+(?:Act|Code|Law|Program|Fund|Account|Authority|Department|Agency|Commission|Board|Institute|Association)(?![\p{L}\p{N}\p{M}_])/u;
export const LCB_LISTED_SERVICE_NOUN_SCOPE='Only the complete printed LCB12 non-civil service form receives a selected nonmodifier noun comparison. An intact in/within/without/outside/of/from cue plus an immediate clause boundary, or a determiner plus finite predicate, establishes the selected noun use. Complete prefix/base components are corrected as one phrase. The paired non-civil-service unit modifier before employees and other nouns remains protected; no generic non-prefix joining or service identity is inferred. Original cue/phrase evidence, body dashes, Unicode, quotations and bill-local quoted wording, titles, tables, unknown exclusions and strikes remain protected; known layout divisions preserve exact offsets.';
export function lcbListedServiceNounIssues(doc,references,{existingIssues=[]}={}){
 const ctx=styleContext(doc),blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),original=originalBodyStyleContext(doc)?.source||ctx.source,page=references.lcb?.pages[11],issues=[];if(!page)return issues;
 const printed='non-civil service',sourceAt=page.text.indexOf(printed);if(sourceAt<0)return issues;
 const valid=(start,end)=>!blocked(start,end)&&!literal(start,end)&&!cutsOriginalStyleWord(doc,start)&&!cutsOriginalStyleWord(doc,end)&&!originalRoleBoundaryBlocked(original,start,end);
 for(const m of ctx.source.matchAll(pattern)){
  const start=m.index,end=start+m[0].length,clean=m[0].replace(/\s+/gu,' ');if(clean.toLowerCase()===printed||ctx.at(start)==='Heading'||!valid(start,end)||existingIssues.some(i=>i.start<end&&i.end>start))continue;
  if(clean!==clean.toLowerCase()&&clean!==clean[0].toUpperCase()+clean.slice(1).toLowerCase())continue;
  if([...doc.text.slice(start,end).matchAll(/[\u2012-\u2015]/gu)].some(d=>ctx.source[start+d.index]==='-')||/[-\u2010-\u2015/:\\#@]/u.test(doc.text[start-1]||'')||/^[-\u2010-\u2015/:\\#@]|^\.\d|^[’'][\p{L}\p{N}\p{M}_]/u.test(original.slice(end))||titleAfter.test(original.slice(end))||quoted({start,end}))continue;
  const beforeStart=ctx.sentenceAt(start).start,before=ctx.source.slice(beforeStart,start),after=ctx.source.slice(end),p=prep.exec(before),d=determiner.exec(before),finite=predicate.exec(after),ending=terminal.exec(after);
  const paths=[];if(p&&ending)paths.push({start:beforeStart+p.index,end:end+ending[0].length,kind:'preposition-and-boundary'});if(d&&finite)paths.push({start:beforeStart+d.index,end:end+finite[0].length,kind:'determiner-and-predicate'});
  const role=paths.find(r=>valid(r.start,r.end));if(!role)continue;
  const suggestion=/^[A-Z]/u.test(m[0])?'Non-civil service':printed;
  issues.push({start,end,evidenceStart:role.start,evidenceEnd:role.end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:12,guidePrintedPage:String(page.printedPage),rule:'Hyphenation examples: non-civil service',category:'Listed noun form',context:ctx.at(start),checkId:'lcb-listed-service-noun',conflict:false,message:'LCB12 prints “non-civil service” separately from “non-civil-service (u.m.)”. This complete source phrase has an independently established nonmodifier noun role; compare the printed prefix hyphen and open service component. Unresolved roles remain protected.',listedServiceEvidence:{start:role.start,end:role.end,sourceText:doc.text.slice(role.start,role.end),construction:role.kind,phrase:{start,end,text:doc.text.slice(start,end)},printedForm:printed},references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:12,guidePrintedPage:String(page.printedPage),rule:'Hyphenation examples',preferred:printed,ruleText:printed+'; non-civil-service (u.m.).',sourcePassage:{start:sourceAt,end:sourceAt+printed.length,text:printed}}]});
 }
 return issues;
}
export function restoreListedServiceEvidence(e,map,text){const start=map(e.start),end=map(e.end,true),a=map(e.phrase.start),b=map(e.phrase.end,true);return{...e,start,end,sourceText:text.slice(start,end),phrase:{...e.phrase,start:a,end:b,text:text.slice(a,b)}};}
