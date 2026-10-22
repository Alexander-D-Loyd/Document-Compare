import {mapNounSequenceEvidence,listedOpenNounModifier} from './offline-noun-sequences.mjs';
import {mapPredicateCompound,parsedPredicateCompoundIssues,PARSED_PREDICATE_COMPOUND_RULE} from './style-parsed-predicate-compounds.mjs';
import {mapPostnominalCompound,postnominalCompoundIssues,POSTNOMINAL_COMPOUND_RULE} from './style-postnominal-compounds.mjs';
import {styleContext} from './style-context.mjs';
import {styleFindingPolicy} from './style-finding-policy.mjs';
import {sourceNameRanges} from './style-source-names.mjs';
import {GROUPED_MODIFIER_RULE,mapGroupedModifier,groupedModifierIssues} from './style-lcb-grouped-modifiers.mjs';
import {AMBIGUOUS_MODIFIER_RULE,mapAmbiguousModifier,ambiguousModifierIssues} from './style-lcb-ambiguous-modifiers.mjs';
import {UNRESOLVED_STRUCTURE_RULE,mapUnresolvedStructure,unresolvedStructureIssues} from './style-lcb-unresolved-structure.mjs';
const nounRule='LCB_GENERAL_UNIT_MODIFIER_REVIEW';
const attributiveRule='LCB_ATTRIBUTIVE_PHRASE_REVIEW';
export const isLcbReaderCandidate=i=>i?.engine==='spaCy'&&i.reviewSuggested===true&&i.suggestion===null&&[nounRule,attributiveRule,GROUPED_MODIFIER_RULE,AMBIGUOUS_MODIFIER_RULE,UNRESOLVED_STRUCTURE_RULE,PARSED_PREDICATE_COMPOUND_RULE,POSTNOMINAL_COMPOUND_RULE].includes(i.engineRule);
export function mapLcbReaderCandidate(doc,plan,issue,selected,evidence){
 if(!isLcbReaderCandidate(issue))return null;
 if(issue.engineRule===UNRESOLVED_STRUCTURE_RULE)return mapUnresolvedStructure(doc,plan,issue,selected,evidence);
 if(issue.engineRule===GROUPED_MODIFIER_RULE)return mapGroupedModifier(doc,plan,issue,selected,evidence);
 if(issue.engineRule===AMBIGUOUS_MODIFIER_RULE)return mapAmbiguousModifier(doc,plan,issue,selected,evidence);
 if(issue.engineRule===PARSED_PREDICATE_COMPOUND_RULE)return mapPredicateCompound(doc,plan,issue,selected,evidence);
 if(issue.engineRule===POSTNOMINAL_COMPOUND_RULE)return mapPostnominalCompound(doc,plan,issue,selected,evidence);
 if(issue.engineRule===attributiveRule)return mapAttributive(doc,plan,issue,selected,evidence);
 if(!['noun-sequence','qualified-noun-prefix'].includes(issue.reviewVariant))return null;
 const h=issue.nounRoleEvidence?.head;
 if(!h||!['NOUN','PROPN'].includes(h.pos)||!['NN','NNS','NNP','NNPS'].includes(h.tag)||['compound','nmod'].includes(h.dep)||h.start!==issue.headStart||h.end!==issue.headEnd||h.text!==issue.head||plan.text.slice(h.start,h.end)!==h.text||!Number.isInteger(h.headStart)||!Number.isInteger(h.headEnd)||plan.text.slice(h.headStart,h.headEnd)!==h.headText||h.headStart<issue.evidenceStart||h.headEnd>issue.evidenceEnd||!/^\s+$/u.test(plan.text.slice(issue.end,h.start)))return null;
 const head=plan.range(h.start,h.end);if(!head||head.start<selected.end||head.end>evidence.end)return null;
 const proof=mapNounSequenceEvidence(doc,plan,issue);if(!proof)return null;
 return {...selected,text:doc.text.slice(selected.start,selected.end),matchText:plan.text.slice(issue.start,issue.end),suggestion:null,evidenceStart:evidence.start,evidenceEnd:evidence.end,engine:'spaCy',engineRule:nounRule,head:issue.head,headStart:head.start,headEnd:head.end,reviewSuggested:true,reviewVariant:issue.reviewVariant,nounRoleEvidence:proof,reviewKind:'parsed-modifier-context'};
}
function mapAttributive(doc,plan,i,selected,evidence){
 const proof=i.attributiveRoleEvidence,c=proof?.components,h=proof?.head,p=proof?.predicate;
 if(!Array.isArray(c)||c.length<2||!h||!p||!Array.isArray(p.finiteAuxiliaries))return null;
 const valid=r=>r&&[r.start,r.end,r.headStart,r.headEnd].every(Number.isInteger)&&r.start>=i.evidenceStart&&r.end<=i.evidenceEnd&&r.start<r.end&&r.headStart>=i.evidenceStart&&r.headEnd<=i.evidenceEnd&&r.headStart<r.headEnd&&plan.text.slice(r.start,r.end)===r.text&&plan.text.slice(r.headStart,r.headEnd)===r.headText;
 const finite=r=>['VERB','AUX'].includes(r.pos)&&['VBD','VBP','VBZ','MD'].includes(r.tag);
 if(!valid(h)||h.pos!=='NOUN'||!['NN','NNS'].includes(h.tag)||['compound','nmod'].includes(h.dep)||h.start!==i.headStart||h.end!==i.headEnd||h.text!==i.head||!/^\s+$/u.test(plan.text.slice(i.end,h.start)))return null;
 if(!valid(p)||p.dep!=='ROOT'||p.headStart!==p.start||p.headEnd!==p.end||!p.finiteAuxiliaries.every(a=>valid(a)&&finite(a)&&['aux','auxpass','cop'].includes(a.dep)&&a.headStart===p.start&&a.headEnd===p.end)||!(finite(p)||p.finiteAuxiliaries.length))return null;
 if(!c.every((r,n)=>valid(r)&&/^\p{Ll}[\p{Ll}\p{M}]*$/u.test(r.text)&&['NOUN','ADJ','ADV','VERB'].includes(r.pos)&&(r.pos!=='VERB'||['VBG','VBN'].includes(r.tag))&&(n?c[n-1].end<r.start&&/^[\s-]+$/u.test(plan.text.slice(c[n-1].end,r.start)):r.start===i.start))||c.at(-1).end!==i.end)return null;
 const nodes=new Map([...c,h].map(r=>[r.start,r])),allowed=new Set(['compound','amod','nmod','advmod','npadvmod']),resolved=new Set([h.start]);
 for(const first of c){let r=first;const seen=new Set(),trace=[];while(!resolved.has(r.start)){if(seen.has(r.start)||!allowed.has(r.dep))return null;seen.add(r.start);trace.push(r.start);const next=nodes.get(r.headStart);if(!next||next.end!==r.headEnd||next.text!==r.headText||next===h&&!['compound','amod','nmod'].includes(r.dep))return null;r=next;}for(const n of trace)resolved.add(n);}
 const matchText=plan.text.slice(i.start,i.end);
 if(c[0].pos==='ADV'&&c[0].text.endsWith('ly')&&!matchText.includes('-'))return null;
 if(/[\u2012-\u2015]/u.test(doc.text.slice(selected.start,selected.end)))return null;
 const head=plan.range(h.start,h.end);if(!head)return null;
 return {...selected,text:doc.text.slice(selected.start,selected.end),matchText,suggestion:null,evidenceStart:evidence.start,evidenceEnd:evidence.end,engine:'spaCy',engineRule:attributiveRule,head:i.head,headStart:head.start,headEnd:head.end,reviewSuggested:true,reviewKind:'parsed-attributive-context',attributiveSourceValidated:true,firstAdverbLy:c[0].pos==='ADV'&&c[0].text.endsWith('ly')};
}
export function lcbParserReviewIssues(doc,references,{engineIssues=[],existingIssues=[]}={}){
 if(!references?.lcb?.pages?.find(p=>p.page===8)||!references?.gpo?.pages)return [];
 const ctx=styleContext(doc),issues=[];
 for(const candidate of engineIssues){
  if(!(candidate.engineRule===nounRule&&candidate.nounRoleEvidence||candidate.engineRule===attributiveRule&&candidate.attributiveSourceValidated)||existingIssues.some(i=>i.start<candidate.end&&i.end>candidate.start))continue;
  const open=listedOpenNounModifier({...candidate,reviewVariant:'noun-sequence'},references);
  if(open&&(open.guideId==='gpo'||open.form.toLowerCase()===candidate.matchText.toLowerCase()))continue;
  issues.push({...candidate,guideId:'lcb',guidePage:8,guidePrintedPage:String(references.lcb.pages.find(p=>p.page===8).printedPage),rule:'Hyphenation, item 1',category:'Modifier Role Review',context:ctx.at(candidate.start),confidence:'Review Suggested',checkId:'lcb-parser-modifier-review',conflict:false,message:'Review Suggested: The parser proposes “'+candidate.matchText+'” as a modifier of “'+candidate.head+'”. LCB generally hyphenates a unit modifier before the word modified. Confirm whether these words form one modifier, whether an open spelling or source exception applies, and whether the parser identified the intended structure. No hyphenation or replacement has been selected.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:8,guidePrintedPage:String(references.lcb.pages.find(p=>p.page===8).printedPage),rule:'Hyphenation, item 1',preferred:null,ruleText:'Generally hyphenate a unit modifier when it precedes the word modified.'}]});
  if(open){const issue=issues.at(-1);issue.message+=' Preserve the printed open component “'+open.form+'”; this question concerns the larger grouping.';issue.references.push({guideId:'lcb',guideName:'LCB Style Manual',guidePage:open.page,guidePrintedPage:String(references.lcb.pages.find(p=>p.page===open.page).printedPage),rule:open.entry,preferred:null,ruleText:open.entry});}
  if(candidate.firstAdverbLy){const issue=issues.at(-1);issue.message+=' The first component is parsed as an adverb ending in -ly; confirm the explicit no-hyphen exception in LCB8 item 3.';issue.references.push({guideId:'lcb',guideName:'LCB Style Manual',guidePage:8,guidePrintedPage:String(references.lcb.pages.find(p=>p.page===8).printedPage),rule:'Hyphenation, item 3',preferred:null,ruleText:'Do not use a hyphen in an adjective phrase containing an adverb ending in ly.'});}
 }
 issues.push(...parsedPredicateCompoundIssues(doc,references,engineIssues,{existingIssues:[...existingIssues,...issues]}));
 issues.push(...postnominalCompoundIssues(doc,references,engineIssues,{existingIssues:[...existingIssues,...issues]}));
 issues.push(...groupedModifierIssues(doc,references,engineIssues,{existingIssues:[...existingIssues,...issues]}));
 issues.push(...ambiguousModifierIssues(doc,references,engineIssues,{existingIssues:[...existingIssues,...issues]}));
 issues.push(...unresolvedStructureIssues(doc,references,engineIssues,{existingIssues:[...existingIssues,...issues]}));
 return issues.filter(styleFindingPolicy(doc,{context:ctx,names:sourceNameRanges(ctx.source)}));
}
