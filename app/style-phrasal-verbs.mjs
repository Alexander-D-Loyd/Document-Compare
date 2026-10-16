import {styleContext} from './style-context.mjs';
import {NOMINAL_COMPOUNDS} from './style-compounds.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
export const PHRASAL_VERB_EVIDENCE_SCOPE=' Existing finite modal verb checks retain complete original modal/verb words and all connecting spaces. Original Unicode/combining-mark boundaries, source strikes, wrapped literals, every intersecting table and unknown ignored/excluded content cannot invent grammatical evidence. Identified interior page heads preserve exact body selections. This finite grammar does not establish unfamiliar syntax, inflection/meaning roles or full first-listed dictionary authority.';
export const PHRASAL_REQUIRED_TO_SCOPE=' Only the eleven existing compound pairs with an actual printed LCB separate-word (v.) entry extend to intact is/are/was/were required to or a listed modal plus be required to. Their exact solid and hyphenated base aliases are compared with that printed verb. Hyphenated aliases also use the existing direct-modal cue. This does not classify arbitrary to as an infinitive, infer unprinted verbs from noun entries, add inflections or expand the 75-modifier catalogue. Complete original cue/term evidence, word boundaries, literal enclosures, bill-local quoted wording, tables, headings, technical identifiers, body dashes and apparent continued titles stay protected.';
const word='[\\p{L}\\p{N}\\p{M}_]',modal='(?:shall|must|should|will|would|could|can|may)',escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

// A finite source list plus a modal is evidence of a verb. Do not classify
// every occurrence of "to" as an infinitive: "access to backup equipment"
// is a noun phrase. Quotations and names must retain their source wording.
export function phrasalVerbIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const blocked=styleEvidenceGuard(doc,ctx);
 const literal=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 for(const [open,solid,page] of NOMINAL_COMPOUNDS){
  for(const m of source.matchAll(new RegExp('\\b(?:shall|must|should|will|would|could|can|may)\\s+('+solid+')\\b','gi'))){
   const start=m.index+m[0].length-m[1].length,end=start+m[1].length;
   if(cutsOriginalStyleWord(doc,m.index)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||blocked(m.index,end))continue;
   if(ctx.at(start)==='Heading'||ctx.tableAt(start)||literal.some(r=>r.start<end&&r.end>start)||m[1]===m[1].toUpperCase())continue;
   // A capitalized continuation can be a quoted/defined product or title.
   if(/^[A-Z]/.test(m[1])||/^\s+[A-Z][a-z]/.test(source.slice(end)))continue;
   const suggestion=open;
   issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:page,guidePrintedPage:references.lcb.pages[page-1].printedPage,rule:'Hyphenation: Noun and verb forms',category:'Compound form',context:ctx.at(start),checkId:'phrasal-verbs',conflict:false,message:'This listed compound follows a modal verb. LCB distinguishes its solid noun or unit-modifier form from its separate-word verb form.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:page,guidePrintedPage:references.lcb.pages[page-1].printedPage,rule:'Hyphenation examples',preferred:suggestion,ruleText:'LCB lists “'+solid+'” as a noun or unit modifier and “'+open+'” as a verb.'}]});
  }
 }
 // The source's explicit (v.) label supplies lexical authority. The required-to
 // cluster supplies only the selected base-verb role, retaining the complete
 // finite cue rather than treating every prepositional "to" as an infinitive.
 const original=originalBodyStyleContext(doc)?.source||source,originalLiteral=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx);
 const titleAfter=/^\s+(?:(?:of|for|the|and|in|on)\s+){0,2}[A-Z][\p{L}\p{M}’'-]*/u;
 const identifierBefore=/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision|Code|ID)\s*$/iu;
 for(const [open,solid,page] of NOMINAL_COMPOUNDS){
  const entry=references.lcb?.pages[page-1]?.lexicalEntries?.find(e=>e.replace(/\s+/gu,' ').trim()===open+' (v.)');if(!entry)continue;
  const hyphen=open.replaceAll(' ','-'),variants=[...new Set([solid,hyphen,open.replaceAll(' ','')])],variantPattern=variants.map(v=>v.split('-').map(escape).join('\\s*-\\s*')).join('|');
  const required=new RegExp('(?<!'+word+')(?<cue>(?:(?:is|are|was|were)|'+modal+'\\s+be)\\s+required\\s+to)\\s+(?<term>'+variantPattern+')(?!'+word+')','giu');
  const direct=hyphen===solid?null:new RegExp('(?<!'+word+')(?<cue>'+modal+')\\s+(?<term>'+hyphen.split('-').map(escape).join('\\s*-\\s*')+')(?!'+word+')','giu');
  for(const [cueKind,pattern] of [['required-to',required],['modal-hyphen',direct]]){
   if(!pattern)continue;
   for(const m of source.matchAll(pattern)){
    const end=m.index+m[0].length,start=end-m.groups.term.length;
    if(ctx.at(start)==='Heading'||blocked(m.index,end)||originalLiteral(m.index,end)||cutsOriginalStyleWord(doc,m.index)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||m.groups.term!==m.groups.term.toLowerCase())continue;
    if(/[-\u2010-\u2015/:\\#@]/u.test(doc.text[m.index-1]||'')||/^[-\u2010-\u2015/:\\#@]|^\.\d|^[’'][\p{L}\p{N}\p{M}_]/u.test(original.slice(end))||titleAfter.test(original.slice(end))||identifierBefore.test(original.slice(0,m.index)))continue;
    if([...doc.text.slice(start,end).matchAll(/[\u2012-\u2015]/gu)].some(d=>source[start+d.index]==='-')||quoted({start,end})||quoted({start:m.index,end:start}))continue;
    if(issues.some(i=>i.start===start&&i.end===end))continue;
    const message='LCB explicitly prints “'+open+' (v.)”. This exact base form follows '+(cueKind==='required-to'?'a complete finite required-to construction':'a direct modal')+'; compare its separate-word spelling. This does not infer another inflection, a noun role or an unfamiliar grammatical construction.';
    issues.push({start,end,evidenceStart:m.index,evidenceEnd:end,text:doc.text.slice(start,end),suggestion:open,guideId:'lcb',guidePage:page,guidePrintedPage:references.lcb.pages[page-1].printedPage,rule:'Hyphenation: Noun and verb forms',category:'Compound form',context:ctx.at(start),checkId:'phrasal-verbs',phrasalVerbCue:cueKind,conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:page,guidePrintedPage:references.lcb.pages[page-1].printedPage,rule:'Hyphenation examples',preferred:open,ruleText:entry}]});
   }
  }
 }
 return issues;
}
