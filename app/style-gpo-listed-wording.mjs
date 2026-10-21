import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {compoundSourceBoundaryBlocked} from './style-compound-source-boundaries.mjs';

export const GPO_LISTED_WORDING_SCOPE='GPO 6.33 checks only the three printed duplicated-prefix forms re-redirect, sub-subcommittee and super-superlative in finite complete verb, nominal or adjective/noun roles. No new prefix/root or inflection is generated; rereferred, rereviewed and ordinary LCB subcommittee remain unchanged. GPO 8.16 checks only the complete printed for goodness’ sake, for conscience’ sake, for acquaintance’ sake and for old times’ sake phrases before an intact closing punctuation mark or source end. Missing apostrophes or redundant apostrophe-s are compared without changing source words or number. Straight apostrophes and ordinary layout whitespace are accepted equivalently. Complete original term, role cues and continuations are required; names, source-created titles, bill-local terms, quotations, tables, headings, removed or unknown text, Unicode/technical endpoints and rhetorical body dashes remain protected. Recognized interior running heads retain physical selections. Other duplicated prefixes, possessors, personal names, inflections, phrase meanings and authentic title identity remain manual.';
const word='[\\p{L}\\p{N}\\p{M}_]';
const boundary='(?<!'+word+')',endWord='(?!'+word+')';
const titleHead='(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board|Association|Foundation|Institute|Program|Company|Corporation|Council|Office|Bureau|Center)';
const nameTail=new RegExp('^\\s+(?:(?:[\\p{Lu}][\\p{L}\\p{M}]*\\s+){0,3})'+titleHead+'(?:'+endWord+')','u');
const immediateName=new RegExp('^\\s+'+titleHead+endWord,'iu');
const incorporatedName=/^\s*,\s*(?:Inc\.|Corp\.|Incorporated|Corporation),?\s+is\s+(?:hereby\s+)?(?:created|established|designated)(?![\p{L}\p{N}\p{M}_])/u;
const createdName=new RegExp('^\\s+(?:[\\p{L}\\p{M}]+\\s+){0,3}'+titleHead+'\\s+is\\s+(?:hereby\\s+)?(?:created|established|designated)'+endWord,'iu');
const logical=s=>s.replace(/-\s*\n\s*/gu,'-').replace(/\s+/gu,' ');

// Shared only by the two finite additions in this batch. Original context is
// negative evidence; it can prevent a finding but cannot create a role witness.
export function listedWordingContext(doc){
 const ctx=styleContext(doc),source=ctx.source,original=originalBodyStyleContext(doc)?.source||source,blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx);
 const namedAfter=at=>immediateName.test(original.slice(at))||nameTail.test(original.slice(at))||incorporatedName.test(original.slice(at));
 return {ctx,source,original,guard(start,end,evidenceStart=start,evidenceEnd=end){
  // A role noun can itself continue into a title. Closing sentence punctuation
  // keeps an independent following sentence outside this negative name check.
  const roleTail=original.slice(evidenceEnd),continuedName=namedAfter(end)||(evidenceEnd!==end&&/[\p{L}\p{N}\p{M}_]$/u.test(original.slice(0,evidenceEnd))&&(nameTail.test(roleTail)||incorporatedName.test(roleTail)||createdName.test(roleTail)));
  return ctx.at(start)==='Heading'||blocked(evidenceStart,evidenceEnd)||literal(evidenceStart,evidenceEnd)||quoted({start,end})||quoted({start:evidenceStart,end:evidenceEnd})||cutsOriginalStyleWord(doc,evidenceStart)||cutsOriginalStyleWord(doc,evidenceEnd)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||compoundSourceBoundaryBlocked(doc.text,source,original,start,end)||compoundSourceBoundaryBlocked(doc.text,source,original,evidenceStart,evidenceEnd)||continuedName||[...doc.text.slice(start,end).matchAll(/[\u2012-\u2015]/gu)].some(m=>source[start+m.index]==='-');
 }};
}
const prefixRules=[
 {pattern:new RegExp(boundary+'(?<cue>(?:shall|may|must|can|will|should|to)\\s+)(?<term>re[\\s-]*redirect)\\s+the\\s+(?:payment|funds|money|request|application|report|notice)'+endWord,'giu'),split:2,preferred:'re-redirect',role:'a complete finite modal/infinitive and a selected direct object'},
 {pattern:new RegExp(boundary+'(?<cue>(?:the|a|an|each|this|that)\\s+)(?<term>sub[\\s-]*subcommittee)\\s+(?:is|was|shall|must|may|will|has)'+endWord,'giu'),split:3,preferred:'sub-subcommittee',role:'a complete determiner and nominal predicate'},
 {pattern:new RegExp(boundary+'(?<cue>(?:the|a|an)\\s+)(?<term>super[\\s-]*superlative)\\s+(?:description|expression|form|example)'+endWord,'giu'),split:5,preferred:'super-superlative',role:'a complete determiner and selected following noun'}
];
export function gpoListedWordingIssues(doc,references){
 const view=listedWordingContext(doc),{source,ctx}=view,issues=[];
 const push=(start,end,evidenceStart,evidenceEnd,suggestion,rule,page,message,kind)=>{
  const printed=references.gpo.pages[page-1];
  issues.push({start,end,evidenceStart,evidenceEnd,text:doc.text.slice(start,end),suggestion,guideId:'gpo',guidePage:page,guidePrintedPage:printed.printedPage,rule,category:'Printed wording',checkId:'gpo-listed-wording',context:ctx.at(start),conflict:false,message,listedWordingEvidence:{kind,start:evidenceStart,end:evidenceEnd,sourceText:doc.text.slice(evidenceStart,evidenceEnd)},references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:page,guidePrintedPage:printed.printedPage,rule,preferred:suggestion,ruleText:message}]});
 };
 for(const r of prefixRules)for(const m of source.matchAll(r.pattern)){
  const term=m.groups.term,start=m.index+m.groups.cue.length,end=start+term.length,evidenceEnd=m.index+m[0].length,letters=term.replace(/[\s-]/gu,''),suggestion=letters.slice(0,r.split)+'-'+letters.slice(r.split);
  if(logical(term)===suggestion||/[A-Z]/u.test(letters)||view.guard(start,end,m.index,evidenceEnd))continue;
  push(start,end,m.index,evidenceEnd,suggestion,'6.33',119,'GPO 6.33 prints “'+r.preferred+'”. This selected occurrence has '+r.role+'. Compare only the duplicated-prefix boundary; no new word, inflection or meaning is inferred.','printed-duplicated-prefix');
 }
 const sake=new RegExp(boundary+'(?<term>(?<lead>for\\s+)(?<noun>goodness|conscience|acquaintance|old\\s+times)(?<poss>[’\']s|[’\'])?(?<bridge>\\s+)(?<sake>sake))(?<ending>\\s*[,.;!?]|$)','giu');
 for(const m of source.matchAll(sake)){
  const start=m.index,end=start+m.groups.term.length,evidenceEnd=m.index+m[0].length,mark=m.groups.poss?.[0]||'’',suggestion=logical(m.groups.lead)+logical(m.groups.noun)+mark+' '+m.groups.sake;
  if(logical(m.groups.term).replace(/'/gu,'’')===suggestion.replace(/'/gu,'’')||/[A-Z]/u.test(m.groups.noun+m.groups.sake)||view.guard(start,end,start,evidenceEnd))continue;
  push(start,end,start,evidenceEnd,suggestion,'8.16',211,'GPO 8.16 prints the complete phrase “'+logical(m.groups.lead)+logical(m.groups.noun)+'’ '+m.groups.sake+'”. Compare this finite phrase with “'+suggestion+'”; its words and singular/plural number are retained. Other possessors and personal names require review.','printed-for-sake');
 }
 return issues.sort((a,b)=>a.start-b.start);
}
