import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {sourceNameRanges} from './style-source-names.mjs';

const word='[\\p{L}\\p{N}\\p{M}_]';
const definitions={
 'ordinance-ordnance':{page:4,entries:['ordinance (a law set forth by a governmental authority)','ordnance (military supplies, including weapons)']},
 'tenant-tenet':{page:5,entries:['tenant (occupant)','tenet (doctrine)']}
};
const rules=[
 {id:'governmental-adoption',family:'ordinance-ordnance',preferred:'ordinance',pattern:'[Tt]he\\s+(?:(?:city|county|town)\\s+council|board\\s+of\\s+supervisors)\\s+(?:adopts|adopted|enacts|enacted)\\s+(?:an?|the)\\s+(?<term>ordnance|ordinance)',role:'a city/county/town council or board of supervisors adopting or enacting the stated item',question:'If the intended item is a governmental law, compare ordinance with ordnance.'},
 {id:'military-supplies',family:'ordinance-ordnance',preferred:'ordnance',pattern:'[Tt]he\\s+(?<term>ordinance|ordnance)\\s+consists\\s+of\\s+military\\s+supplies,\\s+including\\s+weapons',role:'an explicit consists-of military supplies, including weapons description',question:'If the intended subject is those military supplies, compare ordnance with ordinance.'},
 {id:'dwelling-occupant',family:'tenant-tenet',preferred:'tenant',pattern:'[Tt]he\\s+(?<term>tenet|tenant)\\s+occupies\\s+(?:the|a)\\s+(?:dwelling|apartment|rental\\s+unit|premises)',role:'an explicit occupies-the-dwelling/apartment/rental-unit/premises clause',question:'If this subject is the occupant, compare tenant with tenet.'},
 {id:'doctrinal-principle',family:'tenant-tenet',preferred:'tenet',pattern:'[Aa]\\s+fundamental\\s+(?<term>tenant|tenet)\\s+of\\s+the\\s+(?:doctrine|faith|belief)\\s+(?:applies|governs)',role:'a fundamental principle of a stated doctrine, faith or belief',question:'If this item is a doctrinal principle, compare tenet with tenant.'}
].map(r=>({...r,pattern:new RegExp('(?<!'+word+')'+r.pattern+'(?!'+word+')','gu')}));
const intersects=(ranges,start,end)=>ranges.some(r=>r.start<end&&r.end>start);
const edge=/[-\u2010-\u2015/:\\#@]/u;
export const LCB_EXPLICIT_MEANING_CONTEXT_SCOPE='Four complete finite source-context constructions refine LCB4 ordinance/ordnance and LCB5 tenant/tenet review: inflected governmental council/board adoption, an explicit military-supplies-including-weapons definition, dwelling occupancy, and a fundamental doctrinal principle. A mismatched form receives conditional reader guidance with no automatic replacement. The supported matching form supplies protection only from the same-family generic meaning question, not from precise or other-family checks. Every complete clause, terminal boundary and original adjacent character retains source, Unicode, literal/bill-local quote, title/name, table and masked-content protections. Clauses may bridge only identified PDF margins and interior heads. Truth, legal identity, unknown meanings, negated or unfamiliar syntax and general English classification remain unresolved.';

function sourceWitnesses(references,family){
 const definition=definitions[family],page=references?.lcb?.pages?.[definition.page-1];if(!page)return null;
 const witnesses=definition.entries.map(entry=>{const escaped=entry.split(/\s+/u).map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s+'),m=new RegExp(escaped,'u').exec(page.text);return m?{page:definition.page,sourceEntry:entry,start:m.index,end:m.index+m[0].length,text:m[0]}:null;});
 return witnesses.every(Boolean)?witnesses:null;
}
function eligible(doc,references,existingIssues){
 const ctx=styleContext(doc),source=ctx.source,originalContext=originalBodyStyleContext(doc),original=originalContext?.source||source,blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),names=[...sourceNameRanges(source),...(originalContext?sourceNameRanges(original):[])],out=[];
 for(const rule of rules){const witnesses=sourceWitnesses(references,rule.family);if(!witnesses)continue;
  for(const m of source.matchAll(rule.pattern)){
   const evidenceStart=m.index,clauseEnd=evidenceStart+m[0].length,terminal=/^\s*(?:[.;!?)]|$)/u.exec(source.slice(clauseEnd));if(!terminal)continue;
   const evidenceEnd=clauseEnd+terminal[0].length,start=evidenceStart+m[0].indexOf(m.groups.term),end=start+m.groups.term.length,sentence=(originalContext||ctx).sentenceAt(evidenceStart),prefix=original.slice(sentence.start,evidenceStart);
   // A complete visible clause is the positive witness. Restored original
   // content only protects deleted qualifiers, name fragments and boundaries.
   if(!/^(?:\s*\([a-z\d]+\))*\s*$/u.test(prefix)||ctx.at(evidenceStart)==='Heading'||blocked(evidenceStart,evidenceEnd)||literal(evidenceStart,evidenceEnd)||intersects(names,evidenceStart,clauseEnd)||cutsOriginalStyleWord(doc,evidenceStart)||cutsOriginalStyleWord(doc,clauseEnd)||cutsOriginalStyleWord(doc,evidenceEnd)||edge.test(doc.text[evidenceStart-1]||'')||edge.test(doc.text[clauseEnd]||'')||/\.\d/u.test(original.slice(clauseEnd,clauseEnd+2))||intersects(existingIssues.filter(i=>!i.reviewSuggested),start,end)||quoted({start,end}))continue;
   const selection={start,end,text:doc.text.slice(start,end)},boundary={start:clauseEnd,end:evidenceEnd,text:doc.text.slice(clauseEnd,evidenceEnd)},evidence={kind:rule.id,family:rule.family,start:evidenceStart,end:evidenceEnd,sourceText:doc.text.slice(evidenceStart,evidenceEnd),selection,boundary,role:rule.role,preferred:rule.preferred,sourceWitnesses:witnesses};
   out.push({rule,start,end,evidenceStart,evidenceEnd,evidence,context:ctx.at(start),matching:m.groups.term===rule.preferred});
  }
 }return out;
}

export function lcbExplicitMeaningContextReviewIssues(doc,references,{existingIssues=[]}={}){
 return eligible(doc,references,existingIssues).filter(r=>!r.matching).map(r=>({start:r.start,end:r.end,text:doc.text.slice(r.start,r.end),suggestion:null,conditionalSuggestion:r.rule.preferred,evidenceStart:r.evidenceStart,evidenceEnd:r.evidenceEnd,guideId:'lcb',guidePage:definitions[r.rule.family].page,guidePrintedPage:String(references.lcb.pages[definitions[r.rule.family].page-1].printedPage),rule:'Spelling and usage meanings: '+r.rule.family,category:'Explicit Meaning Review',context:r.context,confidence:'Review Suggested',reviewSuggested:true,reviewKind:'explicit-meaning-context',checkId:'lcb-explicit-meaning-context-review',conflict:false,matchesPrimary:false,meaningFamily:r.rule.family,supersedesCheckIds:['lcb-semantic-review:'+r.rule.family],meaningContextEvidence:r.evidence,message:'Review Suggested: This complete source clause supplies '+r.rule.role+'. LCB distinguishes '+definitions[r.rule.family].entries.map(e=>'“'+e+'”').join(' and ')+'. '+r.rule.question+' The alternative is conditional; no replacement or legal meaning has been selected.',references:r.evidence.sourceWitnesses.map(w=>({guideId:'lcb',guideName:'LCB Style Manual',guidePage:w.page,guidePrintedPage:String(references.lcb.pages[w.page-1].printedPage),rule:w.sourceEntry,preferred:null,ruleText:w.text,sourcePassage:{start:w.start,end:w.end,text:w.text}}))}));
}

export function lcbExplicitMeaningContextProtectionRanges(doc,references,{existingIssues=[]}={}){
 return eligible(doc,references,existingIssues).filter(r=>r.matching).map(r=>({start:r.start,end:r.end,text:doc.text.slice(r.start,r.end),family:r.rule.family,supersedesCheckIds:['lcb-semantic-review:'+r.rule.family],meaningContextEvidence:r.evidence}));
}

export function restoreExplicitMeaningContextEvidence(e,map,text){
 const restore=r=>{const start=map(r.start),end=map(r.end,true);return {...r,start,end,text:text.slice(start,end)};},start=map(e.start),end=map(e.end,true);
 return {...e,start,end,sourceText:text.slice(start,end),selection:restore(e.selection),boundary:restore(e.boundary)};
}
