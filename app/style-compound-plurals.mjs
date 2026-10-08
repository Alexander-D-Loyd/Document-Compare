import {styleContext} from './style-context.mjs';
// Exact plural variants of the source examples. Never infer a plural from a
// singular title alone, or apply a general -s movement to arbitrary names.
export const COMPOUND_PLURAL_RULES=[
 ['5.6','hanger-ons','hangers-on'],['5.6','passer-bys','passers-by'],['5.6','looker-ons','lookers-on'],['5.6','listener-ins','listeners-in'],['5.6','filler-ins','fillers-in'],['5.6','marker-ups','markers-up'],
 ['5.8','adjutant generals','adjutants general'],['5.8','ambassador at larges','ambassadors at large'],['5.8','attorney at laws','attorneys at law'],['5.8','chief of staffs','chiefs of staff'],['5.8','comptroller generals','comptrollers general'],['5.8','consul generals','consuls general'],['5.8','governor generals','governors general'],['5.8','postmaster generals','postmasters general'],['5.8','secretary generals','secretaries general'],['5.8','sergeant majors','sergeants major'],['5.8','solicitor generals','solicitors general'],['5.8','surgeon generals','surgeons general'],
 ['5.8','brother-in-laws','brothers-in-law'],['5.8','daughter-in-laws','daughters-in-law'],['5.8','mother-in-laws','mothers-in-law'],['5.8','grant-in-aids','grants-in-aid'],['5.8','heir at laws','heirs at law'],['5.8','pilot-in-commands','pilots-in-command'],['5.8','prisoner of wars','prisoners of war'],['5.8','reduction in forces','reductions in force'],['5.8','president-elects','presidents-elect'],['5.8','minister-designates','ministers-designate']
].map(([rule,variant,preferred])=>({rule,variant,preferred}));
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function compoundPluralIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const quoted=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 for(const r of COMPOUND_PLURAL_RULES){
  const pattern=r.variant.split(/[ -]/).map(escape).join('[\\s-]+');
  for(const m of source.matchAll(new RegExp('\\b'+pattern+'\\b','gi'))){
   const start=m.index,end=start+m[0].length,after=source.slice(end),before=source.slice(Math.max(0,start-40),start);
   if(ctx.at(start)==='Heading'||ctx.tableAt(start)||quoted.some(q=>q.start<end&&q.end>start)||m[0]===m[0].toUpperCase()||/-[ \t]*\n/.test(m[0]))continue;
   if(/^[A-Z]/.test(m[0])&&(/^\s+(?:Association|Council|Board|Fund|Act|Law|Program|Institute|Office|Department)\b/.test(after)||/\b[A-Z][a-z]+\s+[A-Z][a-z]+/.test(m[0])))continue;
   // An unhyphenated of/at phrase can genuinely describe several staffs,
   // wars or forces. Require evidence that the whole expression is plural.
   if(/\b(?:of|at|in)\b/.test(r.variant)&&!/^\s+(?:are|were|have|remain)\b/i.test(after)&&!/\b(?:two|three|four|five|six|seven|eight|nine|ten|several|many|multiple|\d+)\s*$/i.test(before))continue;
   let suggestion=r.preferred;if(/^[A-Z]/.test(m[0]))suggestion=suggestion[0].toUpperCase()+suggestion.slice(1);
   const message='GPO '+r.rule+' places the plural ending on the significant noun; its source example is “'+r.preferred+'”. This check covers an explicit listed variant. Literal names and quoted source wording are preserved.';
   issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'gpo',guidePage:103,guidePrintedPage:references.gpo.pages[102].printedPage,rule:r.rule,category:'Compound plural',context:ctx.at(start),checkId:'compound-plurals',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:103,guidePrintedPage:references.gpo.pages[102].printedPage,rule:r.rule,preferred:suggestion,ruleText:message}]});
  }
 }
 return issues.sort((a,b)=>a.start-b.start);
}
