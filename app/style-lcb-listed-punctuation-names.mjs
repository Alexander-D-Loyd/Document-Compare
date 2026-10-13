import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';

// These complete names are printed on LCB7. Matching the same word tokens
// establishes a source-form check, never a different institution's identity.
const printedNames=['Public Employees’ Retirement System','State Teachers’ Retirement System'];
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
const patterns=printedNames.map(name=>({name,words:name.split(' '),pattern:new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])'+name.split(' ').map(w=>escape(w.replace('’',''))+(w.includes('’')?"[’']?":'')).join('\\s+')+'(?![\\p{L}\\p{N}\\p{M}_])','giu')}));
const capitalExtension=/^\s+(?:(?:of|for|the|and|in|on)\s+){0,2}[A-Z][\p{L}\p{M}’'-]*/u;
const institutionExtension=/^\s+(?:code|law|fund|account|authority|department|agency|commission|board|association|foundation|institute|trust)s?\b/iu;
export const LCB_LISTED_PUNCTUATION_NAME_SCOPE='Only exact word-token variants of the Public Employees’ Retirement System and State Teachers’ Retirement System names printed on LCB7 receive selected case and missing-apostrophe checks. Whole printed names and connecting source spaces are evidence. Unknown word changes, institution identity, extended title names, headings/tables, literal or bill-local quoted forms, source strikes and uncertain exclusions remain protected; no registry resemblance or legal identity is inferred.';

export function lcbListedPunctuationNameIssues(doc,references){
 const ctx=styleContext(doc),blocked=styleEvidenceGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),original=originalBodyStyleContext(doc)?.source||ctx.source,issues=[];
 for(const listed of patterns)for(const m of ctx.source.matchAll(listed.pattern)){
  const start=m.index,end=start+m[0].length,before=original.slice(Math.max(0,start-180),start),after=original.slice(end);
  if(ctx.at(start)==='Heading'||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||blocked(start,end)||m[0]===m[0].toUpperCase()||/[-\u2010-\u2015]/u.test(doc.text[start-1]||'')||/[-\u2010-\u2015]/u.test(doc.text[end]||''))continue;
  // A longer mixed-case institutional name cannot be identified by matching
  // only its contained source example. Original adjacent body text is used
  // only for this negative protection: deleting a jurisdiction or agency
  // extension must not manufacture an eligible shorter name. Ordinary
  // sentence determiners and the
  // explicit California qualifier remain compatible with this printed name.
  if(capitalExtension.test(after)||institutionExtension.test(after))continue;
  const prior=/\b([\p{L}\p{M}][\p{L}\p{M}’'-]*)\s+$/u.exec(before);
  if(prior&&/^[A-Z]/u.test(prior[1])&&!['The','A','An','California'].includes(prior[1]))continue;
  const words=[...m[0].matchAll(/\S+/gu)];if(words.length!==listed.words.length)continue;
  for(const [n,w]of words.entries()){
   const preferred=listed.words[n],text=w[0];if(text.replaceAll("'",'’')===preferred)continue;
   const a=start+w.index,b=a+text.length;
   const issue={start:a,end:b,text:doc.text.slice(a,b),suggestion:preferred,evidenceStart:start,evidenceEnd:end,guideId:'lcb',guidePage:7,guidePrintedPage:references.lcb.pages[6].printedPage,rule:'Punctuation: Printed named forms',category:'Printed LCB Name Form',context:ctx.at(a),checkId:'lcb-listed-punctuation-name',reviewSuggested:false,conflict:false,listedNameEvidence:{start,end,sourceText:doc.text.slice(start,end),printedName:listed.name,sourcePage:7,wordIndex:n},message:'LCB page7 prints “'+listed.name+'”. This selected word differs only in case or the listed possessive apostrophe; verify the complete source name before editing. No institution identity or substituted name is inferred.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:7,guidePrintedPage:references.lcb.pages[6].printedPage,rule:'Punctuation: Printed named forms',preferred,ruleText:listed.name}]};
   if(!quoted(issue))issues.push(issue);
  }
 }
 return issues;
}
