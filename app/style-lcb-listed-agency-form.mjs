import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';

export const LCB_LISTED_AGENCY_FORM_SCOPE='The exact printed Cal-OSHA form on LCB9 receives selected word-boundary and case checks only before intact lowercase program/programs or requirement/requirements heads. Whole agency form and establishing head are source evidence. This finite source-form comparison does not identify unfamiliar organizations, arbitrary Cal-initialisms or extended names. Complete original Unicode boundaries, quoted bill-local wording, literals, technical identifiers, headings/tables, source strikes, uncertain exclusions and original adjoining name extensions remain protected.';
const agency=/(?<![\p{L}\p{N}\p{M}_])Cal(?:\s+|-\s*)?OSHA(?![\p{L}\p{N}\p{M}_])/giu;
const head=/^\s+(?:programs?|requirements?)(?![\p{L}\p{N}\p{M}_])/u;
const extension=/^\s+(?:(?:of|for|the|and|in|on)\s+){0,2}[A-Z][\p{L}\p{M}’'-]*/u;
const institutional=/^\s+(?:code|law|fund|account|authority|department|agency|commission|board|association|foundation|institute|trust)s?\b/iu;
const attachedBefore=/[-\u2010-\u2015/:\\#@]/u,attachedAfter=/^[-\u2010-\u2015/:\\#@]|^\.\d/u;

export function lcbListedAgencyFormIssues(doc,references){
 if(!references?.lcb?.pages?.[8])return [];
 const ctx=styleContext(doc),blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),originalContext=originalBodyStyleContext(doc),original=originalContext?.source||ctx.source,issues=[];
 for(const m of ctx.source.matchAll(agency)){
  const start=m.index,end=start+m[0].length,h=head.exec(ctx.source.slice(end));if(!h)continue;
  const evidenceEnd=end+h[0].length,before=original.slice(Math.max(0,start-180),start),after=original.slice(evidenceEnd),originalHead=head.exec(original.slice(end));
  if(!originalHead||end+originalHead[0].length!==evidenceEnd||ctx.at(start)==='Heading'||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||cutsOriginalStyleWord(doc,evidenceEnd)||blocked(start,evidenceEnd)||literal(start,evidenceEnd)||attachedBefore.test(doc.text[start-1]||'')||attachedAfter.test(doc.text.slice(end))||attachedAfter.test(doc.text.slice(evidenceEnd)))continue;
  if(extension.test(after)||institutional.test(after))continue;
  const prior=/\b([\p{L}\p{M}][\p{L}\p{M}’'-]*)\s+$/u.exec(before);
  if(prior&&/^[A-Z]/u.test(prior[1])&&!['The','A','An','California'].includes(prior[1]))continue;
  // styleSource normalizes real body dashes; a rhetorical dash is not a
  // source-supported word boundary. Reader-masked running heads may bridge.
  if([...doc.text.slice(start,end)].some((c,n)=>/[\u2012-\u2015]/u.test(c)&&/\S/u.test(ctx.source[start+n])))continue;
  if(m[0]==='Cal-OSHA'||m[0]===m[0].toUpperCase())continue;
  const issue={start,end,text:doc.text.slice(start,end),suggestion:'Cal-OSHA',evidenceStart:start,evidenceEnd,guideId:'lcb',guidePage:9,guidePrintedPage:references.lcb.pages[8].printedPage,rule:'Printed LCB agency form: Cal-OSHA',category:'Printed LCB Name Form',context:ctx.at(start),checkId:'lcb-listed-agency-form',reviewSuggested:false,conflict:false,listedNameEvidence:{start,end:evidenceEnd,sourceText:doc.text.slice(start,evidenceEnd),printedName:'Cal-OSHA',sourcePage:9,agencyEnd:end,headStart:end,headEnd:evidenceEnd},message:'LCB page9 prints “Cal-OSHA”. This complete agency form appears immediately before a recognized program or requirements noun. Compare its printed case and hyphen; unfamiliar organizations and longer names are protected.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:9,guidePrintedPage:references.lcb.pages[8].printedPage,rule:'Printed LCB agency form: Cal-OSHA',preferred:'Cal-OSHA',ruleText:'Cal-OSHA'}]};
  if(!quoted(issue))issues.push(issue);
 }
 return issues;
}
