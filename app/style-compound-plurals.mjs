import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,originalBodyStyleContext,cutsOriginalStyleWord} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';
import {GPO_58_REMAINDER_VARIANTS} from './data/gpo-compound-plural-source.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
// Exact plural variants of the source examples. Never infer a plural from a
// singular title alone, or apply a general -s movement to arbitrary names.
export const GPO_COMPOUND_PLURAL_SCOPE='All nine exact printed GPO 5.6 noun/preposition plural examples have controlled malformed-variant checks, alongside selected 5.8 compound plurals. The complete 55-example 5.8 source table is recorded with first/middle/last-word identity; 15 additional finite malformed variants cover the remaining selected first/middle examples without changing correct last-word forms such as provost marshal generals or judge advocate generals. Complete original matched and plural-role evidence preserves Unicode boundaries, literal names, quoted wording, table contexts, source strikes, unknown exclusions and recognized interior page heads. This is finite source-example coverage, not a general plural-generation rule or whole-rule certification. Unlisted forms, authentic names, ambiguous ownership and unfamiliar grammatical or semantic roles require manual review.';
export const COMPOUND_PLURAL_RULES=[
 ['5.6','coming-ins','comings-in'],['5.6','going-ons','goings-on'],['5.6','swearer-ins','swearers-in'],
 ['5.6','hanger-ons','hangers-on'],['5.6','passer-bys','passers-by'],['5.6','looker-ons','lookers-on'],['5.6','listener-ins','listeners-in'],['5.6','filler-ins','fillers-in'],['5.6','marker-ups','markers-up'],
 ['5.8','adjutant generals','adjutants general'],['5.8','ambassador at larges','ambassadors at large'],['5.8','attorney at laws','attorneys at law'],['5.8','chief of staffs','chiefs of staff'],['5.8','comptroller generals','comptrollers general'],['5.8','consul generals','consuls general'],['5.8','governor generals','governors general'],['5.8','postmaster generals','postmasters general'],['5.8','secretary generals','secretaries general'],['5.8','sergeant majors','sergeants major'],['5.8','solicitor generals','solicitors general'],['5.8','surgeon generals','surgeons general'],
 ['5.8','brother-in-laws','brothers-in-law'],['5.8','daughter-in-laws','daughters-in-law'],['5.8','mother-in-laws','mothers-in-law'],['5.8','grant-in-aids','grants-in-aid'],['5.8','heir at laws','heirs at law'],['5.8','pilot-in-commands','pilots-in-command'],['5.8','prisoner of wars','prisoners of war'],['5.8','reduction in forces','reductions in force'],['5.8','president-elects','presidents-elect'],['5.8','minister-designates','ministers-designate']
].map(([rule,variant,preferred])=>({rule,variant,preferred})).concat(GPO_58_REMAINDER_VARIANTS);
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const patternFor=r=>r.variant.split(/[ -]/).map(part=>escape(part).replace(/[’']/gu,"[’']")).join('[\\s-]+');
export function compoundPluralParentRanges(doc,ctx=styleContext(doc)){
 const original=originalBodyStyleContext(doc)?.source||ctx.source;
 return GPO_58_REMAINDER_VARIANTS.flatMap(r=>[...original.matchAll(new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])'+patternFor(r)+'(?![\\p{L}\\p{N}\\p{M}_])','giu'))].map(m=>({start:m.index,end:m.index+m[0].length})));
}
export function compoundPluralIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),original=originalBodyStyleContext(doc)?.source||source;
 const quoted=billQuotedTermProtection(doc,ctx),parents=compoundPluralParentRanges(doc,ctx);
 const namedContinuation=/^\s+(?:Association|Council|Board|Fund|Act|Law|Program|Institute|Office|Department)(?![\p{L}\p{N}\p{M}_])/u;
 for(const r of COMPOUND_PLURAL_RULES){
  const pattern=patternFor(r);
  for(const m of source.matchAll(new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])'+pattern+'(?![\\p{L}\\p{N}\\p{M}_])','giu'))){
   const start=m.index,end=start+m[0].length,after=source.slice(end),before=source.slice(Math.max(0,start-40),start);
   if(parents.some(p=>p.start<=start&&p.end>=end&&(p.start<start||p.end>end)))continue;
   if(ctx.at(start)==='Heading'||blocked(start,end)||literal(start,end)||quoted({start,end})||entityNameBoundaryBlocked(doc.text,source,original,start,end)||m[0]===m[0].toUpperCase()||/-[ \t]*\n/.test(m[0])||[...doc.text.slice(start,end).matchAll(/[\u2012-\u2015]/gu)].some(d=>source[start+d.index]==='-'))continue;
   if(namedContinuation.test(original.slice(end))||/[-\s][A-Z]/u.test(m[0]))continue;
   // An unhyphenated of/at phrase can genuinely describe several staffs,
   // wars or forces. Require evidence that the whole expression is plural.
   let evidenceStart=start,evidenceEnd=end;
   if(r.requiresPlural||/\b(?:of|at|in)\b/.test(r.variant)){
    const following=/^\s+(?:are|were|have|remain)(?![\p{L}\p{N}\p{M}_])/iu.exec(after),preceding=/(?<![\p{L}\p{N}\p{M}_])(?:two|three|four|five|six|seven|eight|nine|ten|several|many|multiple|\d+)\s*$/iu.exec(before);
    const followingEnd=end+(following?.[0].length||0),precedingStart=start-before.length+(preceding?.index||0);
    if(following&&!cutsOriginalStyleWord(doc,followingEnd)&&!blocked(start,followingEnd)&&!literal(start,followingEnd))evidenceEnd=followingEnd;
    else if(preceding&&!cutsOriginalStyleWord(doc,precedingStart)&&!blocked(precedingStart,end)&&!literal(precedingStart,end))evidenceStart=precedingStart;
    else continue;
   }
   let suggestion=r.preferred;if(/^[A-Z]/.test(m[0]))suggestion=suggestion[0].toUpperCase()+suggestion.slice(1);if(m[0].includes("'"))suggestion=suggestion.replaceAll('’',"'");
   const message='GPO '+r.rule+' places the plural ending on the significant noun; its source example is “'+r.preferred+'”. This check covers an explicit listed variant. Literal names and quoted source wording are preserved.';
   issues.push({start,end,evidenceStart,evidenceEnd,text:doc.text.slice(start,end),suggestion,guideId:'gpo',guidePage:103,guidePrintedPage:references.gpo.pages[102].printedPage,rule:r.rule,category:'Compound plural',context:ctx.at(start),checkId:'compound-plurals',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:103,guidePrintedPage:references.gpo.pages[102].printedPage,rule:r.rule,preferred:suggestion,ruleText:message}]});
  }
 }
 // A complete assistant title owns an overlapping inner phrase from the
 // same finite table. Keep one physical selection for the complete example.
 return issues.sort((a,b)=>a.start-b.start||b.end-a.end).filter((issue,index,all)=>!all.slice(0,index).some(parent=>parent.start<=issue.start&&parent.end>=issue.end));
}
