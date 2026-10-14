import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {styleSingleQuoteRanges} from './style-single-quote-ranges.mjs';

// These complete names are printed on LCB7. Matching the same word tokens
// establishes a source-form check, never a different institution's identity.
const printedNames=['Public Employees’ Retirement System','State Teachers’ Retirement System','County Employees Retirement Law of 1937'];
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
const patterns=printedNames.map(name=>({name,words:name.split(' '),pattern:new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])'+name.split(' ').map(w=>escape(w.replace('’',''))+(w.includes('’')||name==='County Employees Retirement Law of 1937'&&w==='Employees'?"[’']?":'')).join('\\s+')+'(?![\\p{L}\\p{N}\\p{M}_])','giu')}));
const capitalExtension=/^\s+(?:(?:of|for|the|and|in|on)\s+){0,2}[A-Z][\p{L}\p{M}’'-]*/u;
const institutionExtension=/^\s+(?:code|law|fund|account|authority|department|agency|commission|board|association|foundation|institute|trust)s?\b/iu;
// In these exact source names an Employees/Teachers plural possessive is
// internal punctuation. Mask only that apostrophe while finding conservative
// outer single-quote enclosures, retaining every source coordinate.
const namedSingleQuotes=source=>styleSingleQuoteRanges(source.replace(/\b(?:Employees|Teachers)[’'](?=\s+Retirement\b)/giu,m=>m.slice(0,-1)+'\u0000'));
const normalizeName=s=>s.replace(/\s+/gu,' ').trim();
function singleQuotedNamedForms(doc,ctx){
 const blocked=styleEvidenceGuard(doc,{...ctx,literalAt:()=>false,tableAt:()=>false}),forms=[];
 for(const listed of patterns)for(const m of ctx.source.matchAll(listed.pattern)){
  const start=m.index,end=start+m[0].length,open=ctx.source[start-1],close=ctx.source[end];
  if(!((open==='‘'&&close==='’')||(open==="'"&&close==="'"))||blocked(start-1,end+1))continue;
  forms.push(normalizeName(m[0]));
 }
 return forms;
}
const initialCaseEquivalent=(a,b)=>a.slice(1)===b.slice(1)&&a[0]?.toLowerCase()===b[0]?.toLowerCase();
export const LCB_LISTED_PUNCTUATION_NAME_SCOPE='Only exact word-token variants of the Public Employees’ Retirement System, State Teachers’ Retirement System and County Employees Retirement Law of 1937 names printed on LCB7 receive selected case and printed-apostrophe checks. The County law requires the complete printed of 1937 qualifier; no other law year is inferred. Whole printed names and connecting source spaces are evidence. Unknown word changes, institution identity, extended title names, headings/tables, literal or bill-local quoted forms, source strikes and uncertain exclusions remain protected; no registry resemblance or legal identity is inferred.';

export function lcbListedPunctuationNameIssues(doc,references){
 const ctx=styleContext(doc),blocked=styleEvidenceGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),originalContext=originalBodyStyleContext(doc),original=originalContext?.source||ctx.source,singleQuotes=[...namedSingleQuotes(ctx.source),...(originalContext?namedSingleQuotes(original):[])],singleQuotedForms=singleQuotedNamedForms(doc,ctx),issues=[];
 for(const listed of patterns)for(const m of ctx.source.matchAll(listed.pattern)){
  const start=m.index,end=start+m[0].length,before=original.slice(Math.max(0,start-180),start),after=original.slice(end);
  // A plural possessive inside this complete printed name can resemble the
  // closing mark of a single quotation. Its actual outer name enclosure is
  // still literal source evidence, never permission to remove that mark.
  if((original[start-1]==='‘'&&original[end]==='’')||(original[start-1]==="'"&&original[end]==="'"))continue;
  if(singleQuotes.some(r=>r.start<end&&r.end>start))continue;
  if(singleQuotedForms.some(form=>initialCaseEquivalent(form,normalizeName(m[0]))))continue;
  if(ctx.at(start)==='Heading'||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||blocked(start,end)||originalContext?.literalAt(start,end)||m[0]===m[0].toUpperCase()||/[-\u2010-\u2015/:\\#@]/u.test(doc.text[start-1]||'')||/[-\u2010-\u2015/:\\#@]/u.test(doc.text[end]||'')||/^\.\d/u.test(doc.text.slice(end)))continue;
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
   const issue={start:a,end:b,text:doc.text.slice(a,b),suggestion:preferred,evidenceStart:start,evidenceEnd:end,guideId:'lcb',guidePage:7,guidePrintedPage:references.lcb.pages[6].printedPage,rule:'Punctuation: Printed named forms',category:'Printed LCB Name Form',context:ctx.at(a),checkId:'lcb-listed-punctuation-name',reviewSuggested:false,conflict:false,listedNameEvidence:{start,end,sourceText:doc.text.slice(start,end),printedName:listed.name,sourcePage:7,wordIndex:n},message:'LCB page7 prints “'+listed.name+'”. This selected word differs only in case or the presence of an apostrophe; verify the complete printed name before editing. No institution identity or substituted name is inferred.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:7,guidePrintedPage:references.lcb.pages[6].printedPage,rule:'Punctuation: Printed named forms',preferred,ruleText:listed.name}]};
   if(!quoted(issue))issues.push(issue);
  }
 }
 return issues;
}
