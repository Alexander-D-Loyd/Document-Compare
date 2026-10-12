import {styleContext}from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord}from './style-evidence.mjs';
import {sourceNameRanges}from './style-source-names.mjs';
import {lexicalSuffixCandidates,LEXICAL_SUFFIX_SCOPE}from './style-lexical-suffixes.mjs';
import {productiveLikeCandidates,PRODUCTIVE_LIKE_SCOPE}from './style-productive-like-suffixes.mjs';

// These finite root/suffix pairs identify a morphological review cue, not a
// dictionary's preferred spelling or a determination of the author's meaning.
export const LCB_SUFFIX_REVIEW_FAMILIES={
 ship:'citizen member partner owner leader fellow friend kin relation steward trustee apprentice author scholar hard guardian reader sponsor sportsman craftsman workman',
 hood:'child adult parent person brother sister neighbor mother father woman man state',
 wise:'length width clock counterclock other like cost budget percentage case policy edge cross',
 ful:'care use help fear hope harm thought meaning power respect spoon',
 less:'care home hope fear harm power meaning use help thought meat',
 ness:'aware fair kind dark calm rough smooth fit ill weak rich great',
 ment:'govern employ develop require manage agree establish pay assign adjust arrange assess commit enact invest retire treat',
};
export const LCB_SUFFIX_REVIEW_SCOPE='A finite set of intact root plus ship/hood/wise/ful/less/ness/ment forms receives reader review for a visible internal suffix hyphen. Selected based/related/focused/dependent/eligible/required/supporting/certified/oriented compound continuations retain their complete source span and outer grammatical hyphens. LCB8 item5 and GPO6.30 supply the general closed-affix method; no dictionary spelling, legal meaning or replacement is asserted. '+LEXICAL_SUFFIX_SCOPE+' '+PRODUCTIVE_LIKE_SCOPE;
const forms=new Map();
for(const [suffix,roots]of Object.entries(LCB_SUFFIX_REVIEW_FAMILIES))for(const root of roots.split(' ')){
 forms.set(root+'-'+suffix,{root,suffix,plural:false});
 if(['ship','hood','ment'].includes(suffix))forms.set(root+'-'+suffix+'s',{root,suffix,plural:true});
}
const compoundTail='based|related|focused|dependent|eligible|required|supporting|certified|oriented';
const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_-])(?<affix>'+[...forms.keys()].sort((a,b)=>b.length-a.length).join('|')+')(?<tail>(?:-(?:'+compoundTail+')){0,3})(?![\\p{L}\\p{N}\\p{M}_-])','giu');
const intersects=(rows,start,end)=>rows.some(r=>r.start<end&&r.end>start);

export function lcbSuffixBoundaryReviewIssues(doc,references,options={}){
 if(!references?.lcb?.pages?.[7]||!references?.gpo?.pages?.[118])return [];
 const ctx=styleContext(doc),source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),existing=options.existingIssues||[],names=sourceNameRanges(source),identifiers=[...source.matchAll(/(?:https?:\/\/|www\.)[^\s<>"'“”]+/giu)].map(m=>({start:m.index,end:m.index+m[0].length})),singleQuotes=[...source.matchAll(/‘[^’]*’|(?<![\p{L}\p{N}\p{M}_])'[^'\n]*'/gu)].map(m=>({start:m.index,end:m.index+m[0].length})),issues=[];
 const candidates=[...[...source.matchAll(pattern)].map(m=>({m,form:forms.get(m.groups.affix.toLowerCase())})),...(options.includeLexical===false?[]:lexicalSuffixCandidates(source)),...(options.includeProductiveLike===false?[]:productiveLikeCandidates(source,references))];
 for(const {m,form}of candidates){
  const start=m.index,end=start+m[0].length;if(!form||issues.some(i=>i.start<end&&i.end>start))continue;
  const original=doc.text.slice(start,end),join=original[form.root.length],before=source.slice(Math.max(0,start-180),start),after=source.slice(end,end+100);
  if(ctx.at(start)==='Heading'||blocked(start,end)||intersects(names,start,end)||intersects(identifiers,start,end)||intersects(singleQuotes,start,end)||intersects(existing,start,end)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||/[\\/@]/u.test(doc.text[start-1]||'')||/[\\/@]/u.test(doc.text[end]||''))continue;
  // Masking a compound separator or tail cannot manufacture a shorter
  // suffix word at an otherwise intact prefix. Inspect original adjacency.
  if(/[-\u2010-\u2015]/u.test(doc.text[start-1]||'')||/[-\u2010-\u2015]/u.test(doc.text[end]||''))continue;
  // Actual glyph evidence distinguishes an affix separator from a rhetorical
  // dash. PDF line/page divisions and larger compound bases are not suffix
  // errors and cannot manufacture a small interior replacement.
  if(!/[-\u2010\u2011]/u.test(join)||/-\s*$/u.test(before)||/^\s*-/u.test(after)||/-[ \t]*\n/u.test(original)||/[-\u00ad]\s*\n/u.test(original)||/-\s*,?\s*(?:and|or)\s*$/i.test(before))continue;
  if(/^[A-Z]/.test(original)&&!/^(?:\s*|[\s\S]*[.!?:]\s*)$/.test(before)||/[A-Z]/.test(original.slice(1))||/^\s+(?:(?:of|for|the|and|in|on)\s+)?[A-Z][a-z]/.test(after))continue;
  const message='Review Suggested: The internal hyphen separates a bounded '+form.suffix+' suffix candidate from its root. LCB hyphenation item5 generally closes prefixes and suffixes, and GPO6.30 agrees. '+(form.lexicalWitness?'The bundled word list recognizes a possible base and the complete closed word; this supplies only lexical review evidence. ':'')+(form.productiveWitness?'GPO6.31 specifically closes words ending in like, with proper-name and triple-consonant exceptions. The root is recognized but the whole closed form is not in the bundled index; the rule supplies a productive review cue, not a valid-word or dictionary preference decision. ':'')+(m.groups.tail?'The remaining compound hyphens have a separate grammatical role and are retained in this full source selection. ':'')+'Confirm the complete word against the office spelling authority and its intended meaning before changing it; a hyphen can be justified by a more-specific compound, official name, pronunciation or ambiguity exception. No spelling or replacement has been selected.';
  issues.push({start,end,text:original,suggestion:null,guideId:'lcb',guidePage:8,guidePrintedPage:String(references.lcb.pages[7].printedPage),rule:'Hyphenation, item 5: Suffix boundaries',category:'Suffix Boundary Review',context:ctx.at(start),confidence:'Review Suggested',reviewSuggested:true,reviewKind:'suffix-boundary',checkId:'lcb-suffix-boundary-review',conflict:false,matchesPrimary:false,message,affixEvidence:{root:form.root,suffix:form.suffix,plural:form.plural,separator:join,compoundTail:m.groups.tail,scope:form.productiveWitness?'Productive -like rule with recognized root; complete spelling remains unverified':form.lexicalWitness?'Word-list-supported morphological review cue; not dictionary approval':'Finite morphological review cue; not dictionary approval',...(form.lexicalWitness?{lexicalWitness:form.lexicalWitness}:{}),...(form.productiveWitness?{productiveWitness:form.productiveWitness}:{})},references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:8,guidePrintedPage:String(references.lcb.pages[7].printedPage),rule:'Hyphenation, item 5',preferred:null,ruleText:'In general, do not use hyphens to set off a prefix or a suffix. The exceptions for prefixes are ex-, quasi-, and self-. See also END WORDS.'},{guideId:'gpo',guideName:'GPO Style Manual',guidePage:119,guidePrintedPage:String(references.gpo.pages[118].printedPage),rule:'6.30',preferred:null,ruleText:'Print solid combining forms and suffixes, except as indicated elsewhere.'},...(form.productiveWitness?[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:119,guidePrintedPage:String(references.gpo.pages[118].printedPage),rule:'6.31',preferred:null,ruleText:'Print solid words ending in like, but use a hyphen to avoid tripling a consonant or when the first element is a proper name.'}]:[])]});
 }
 return issues.sort((a,b)=>a.start-b.start||a.end-b.end);
}
