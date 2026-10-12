import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard} from './style-evidence.mjs';
import {GPO_NOMINAL_FORMS} from './gpo-nominal-forms.mjs';
const byVariant=new Map(GPO_NOMINAL_FORMS.map(r=>[r.variant,r]));
const endings=new Map();
for(const r of GPO_NOMINAL_FORMS){const [first,last]=r.variant.split(' ');if(!endings.has(first))endings.set(first,[]);endings.get(first).push(last);}
const pattern=new RegExp('\\b(?:'+[...endings].map(([first,last])=>first+'[\\s-]+(?:'+last.sort((a,b)=>b.length-a.length).join('|')+')').join('|')+')\\b','gi');

// Only explicitly labeled nouns are considered. A determiner immediately
// before the phrase and an explicit nominal boundary are both required.
// Do not join phrases after modal verbs or treat "drive in a car" as drive-in.
export function gpoNominalIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const blocked=styleEvidenceGuard(doc,ctx),cutsWord=index=>/[\p{L}\p{N}_]$/u.test(doc.text.slice(Math.max(0,index-2),index))&&/^[\p{L}\p{N}_]/u.test(doc.text.slice(index,index+2));
 const literal=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
  for(const m of source.matchAll(pattern)){
   const rule=byVariant.get(m[0].toLowerCase().replace(/[\s-]+/g,' '));if(!rule)continue;
   const start=m.index,end=start+m[0].length;
   if(m[0].replace(/\s+/g,' ').toLowerCase()===rule.preferred||ctx.at(start)==='Heading'||ctx.tableAt(start)||literal.some(r=>r.start<end&&r.end>start)||/[\p{L}\p{N}-]/u.test(source[start-1]||''))continue;
   if(m[0]===m[0].toUpperCase()||/^[A-Z]/.test(m[0])||/-[ \t]*\n/.test(m[0]))continue;
   const before=source.slice(Math.max(0,start-35),start),after=source.slice(end);
   const determiner=/\b(?:a|an|the|this|that|each|every|its|their|our|your)\s+$/i.exec(before),continuation=/^\s+(?:of|is|are|was|were|shall|must)(?![\p{L}\p{N}_])/iu.exec(after);
   if(!determiner||!continuation)continue;
   const evidenceStart=Math.max(0,start-35)+determiner.index,evidenceEnd=end+continuation[0].length;
   if(cutsWord(start)||cutsWord(end)||cutsWord(evidenceStart)||cutsWord(evidenceEnd)||blocked(evidenceStart,evidenceEnd))continue;
   const suggestion=rule.preferred,message='GPO explicitly lists “'+suggestion+'” as a noun. This phrase has a determiner and a nominal continuation; confirm that it names the compound rather than an unusual literal construction. Verb uses are preserved.';
   issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'gpo',guidePage:rule.page,guidePrintedPage:rule.printedPage,rule:'7. Compounding Examples',category:'Compound noun form',context:ctx.at(start),checkId:'gpo-nominals',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:rule.page,guidePrintedPage:rule.printedPage,rule:'7. Compounding Examples',preferred:suggestion,ruleText:'Column-preserved source entry: '+rule.raw+'. GPO 7.10 distinguishes noun/adjective compounds from separate-word verbs.'}]});
  }
 return issues;
}
