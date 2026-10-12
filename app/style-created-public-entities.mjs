import {styleContext,withStyleContext}from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord}from './style-evidence.mjs';
import {styleWordDivisionView}from './style-word-divisions.mjs';
import {lcbCreatedTitleReferenceReviewIssues}from './style-lcb-review-title-references.mjs';
import {OFFLINE_MODIFIERS,GENERAL_MODIFIER_REVIEW_RULE}from './offline-rules.mjs';

const types='(?:Department|Bureau|Agency|Commission|Board|Council|Authority|Office)',token="[A-Za-z0-9]+(?:(?:-(?:[ \\t]*\\n\\s*)?|[’'])[A-Za-z0-9]+)*",word='(?!(?:shall|must|may|will|would|should|could|is|are|was|were|has|have|had|that|which|receives?|provides?|provided|declares?|requires?|notes|confirms|acknowledges|specifies|states?|says|quotes?|reads?|called|named|before|after|unless|until|whether|where)\\b)'+token;
const name='(?:'+word+'(?:\\s+'+word+'){0,11}\\s+'+types+'|'+types+'\\s+of\\s+'+word+'(?:\\s+'+word+'){1,11})',parent=name;
const boundary='(?<![\\p{L}\\p{N}\\p{M}_-])',create='(?:hereby\\s+)?(?:created|established)',ending='(?=\\s*[.;!?]|$)';
const patterns=[
 new RegExp(boundary+'The\\s+(?<name>'+name+')\\s+is\\s+'+create+'(?:\\s+(?:in|within)\\s+the\\s+'+parent+')?'+ending,'giu'),
 new RegExp(boundary+'There\\s+is\\s+'+create+'\\s+the\\s+(?<name>'+name+')(?:\\s+(?:in|within)\\s+the\\s+'+parent+')?'+ending,'giu'),
 new RegExp(boundary+'There\\s+is\\s+'+create+'\\s*,?\\s*(?:in|within)\\s+the\\s+'+parent+'\\s*,\\s*the\\s+(?<name>'+name+')'+ending,'giu')
];
const little=new Set('a an and as at by for from in into of on or the to with'.split(' ')),logical=s=>s.replace(/-[ \t]*\n\s*(?=[A-Za-z0-9])/g,'-').replace(/\s+/g,' ').trim(),intersect=(rows,start,end)=>rows.some(r=>r.start<end&&r.end>start);
const generic=/^(?:(?:new|special|separate|additional|advisory|local|state|federal|regional|municipal|county|city|public|private|governing|review|oversight|planning|administrative|executive|independent)\s+){1,3}(?:department|bureau|agency|commission|board|council|authority|office)$/i;
const historical=/\b(?:(?:previous|prior|former|legacy|old|original|existing)\s+(?:statute|law|text|wording|definition)|(?:report|example|letter|amendment)\s+(?:states?|says|quotes?|reads?|provides?)|(?:insert|strike|delete|replace)(?:\s+with)?|if|unless|provided\s+that)\b[^.;!?]{0,100}$/iu;
const checkIds=['lcb-prefixes',...OFFLINE_MODIFIERS.map(r=>r.checkId),'lcb-general-unit-modifier-review'],engineRules=[...OFFLINE_MODIFIERS.map(r=>r.engineRule),GENERAL_MODIFIER_REVIEW_RULE];
function records(doc){
 const ctx=styleContext(doc),source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),singles=[...source.matchAll(/‘[^’]*’|(?<![\p{L}\p{N}\p{M}_])'[^'\n]*'(?![\p{L}\p{N}\p{M}_])/gu)].map(m=>({start:m.index,end:m.index+m[0].length})),out=[];
 for(const pattern of patterns)for(const m of source.matchAll(pattern)){
  const start=m.index+m[0].lastIndexOf(m.groups.name),end=start+m.groups.name.length,evidenceStart=m.index,evidenceEnd=m.index+m[0].length,title=logical(m.groups.name);
  if(ctx.at(evidenceStart)!=='Bill'||generic.test(title)||blocked(evidenceStart,evidenceEnd)||intersect(singles,evidenceStart,evidenceEnd)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||historical.test(source.slice(Math.max(0,evidenceStart-180),evidenceStart))||out.some(r=>r.start<end&&r.end>start))continue;
  out.push({name:title,start,end,text:doc.text.slice(start,end),evidenceStart,evidenceEnd,declarationText:doc.text.slice(evidenceStart,evidenceEnd),evidenceText:logical(m[0]),sourceKind:'Document-local public-entity creation',supersedesCheckIds:checkIds,supersedesEngineRules:engineRules});
 }
 return out.sort((a,b)=>a.start-b.start);
}
export function createdPublicEntityRecords(doc){
 const view=styleWordDivisionView(doc),reviewDoc=view?.doc||doc,found=withStyleContext(reviewDoc,()=>records(reviewDoc));if(!view)return found;
 return view.restore(found).map((r,n)=>{const evidenceStart=view.toSource(found[n].evidenceStart),evidenceEnd=view.toSource(found[n].evidenceEnd,true);return {...r,evidenceStart,evidenceEnd,text:doc.text.slice(r.start,r.end),declarationText:doc.text.slice(evidenceStart,evidenceEnd)};});
}
const rule='Capitalization, item 1',ruleText='Capitalize the complete names of departments, bureaus, agencies, etc. Capitalize their heads when used as a part of the official title.';
const options={recordProvider:createdPublicEntityRecords,checkId:'lcb-created-public-entity-reference-review',category:'Created Public Entity Reference Review',referenceMessage:w=>'Review Suggested: This later complete name has the same words and hyphen boundaries as “'+w.name+'” in an earlier intact public-entity creation clause, but an important word/component begins in lowercase. Confirm the intended entity and full official name. The creating clause supplies document-local evidence, not registry authority or a legal identity decision; no replacement is asserted.'};
export function createdPublicEntityReferenceIssues(doc,references,extra={}){
 return lcbCreatedTitleReferenceReviewIssues(doc,references,{...options,...extra}).map(i=>({...i,rule,references:i.references.map(r=>({...r,rule,ruleText}))}));
}
export function createdPublicEntityCreationIssues(doc,references,{existingIssues=[]}={}){
 if(!references?.lcb?.pages?.[16])return [];
 return createdPublicEntityRecords(doc).filter(r=>r.name.split(/\s+/).flatMap(w=>w.split('-')).some(w=>!little.has(w.toLowerCase())&&/^[a-z]/.test(w))&&!intersect(existingIssues.filter(i=>!checkIds.includes(i.checkId)),r.start,r.end)).map(r=>({...r,titleWitness:r,text:doc.text.slice(r.start,r.end),suggestion:null,guideId:'lcb',guidePage:17,guidePrintedPage:String(references.lcb.pages[16].printedPage),rule,category:'Created Public Entity Review',context:'Bill',confidence:'Review Suggested',reviewSuggested:true,reviewKind:'created-public-entity',checkId:'lcb-created-public-entity-creation-review',conflict:false,matchesPrimary:false,message:'Review Suggested: This intact creation clause appears to establish a public entity, but an important name word is lowercase. LCB capitalizes complete department, bureau and agency names. Confirm its full formal name; no replacement or registry authority is asserted.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:17,guidePrintedPage:String(references.lcb.pages[16].printedPage),rule,preferred:null,ruleText}]}));
}
export function createdPublicEntityProtectionRanges(doc,references){
 return [...createdPublicEntityRecords(doc),...lcbCreatedTitleReferenceReviewIssues(doc,references,{...options,protectionOnly:true})].map(r=>({...r,supersedesCheckIds:checkIds,supersedesEngineRules:engineRules}));
}
export const CREATED_PUBLIC_ENTITY_SCOPE='Document-local LCB17 item1 review for complete multiword Department/Bureau/Agency/Commission/Board/Council/Authority/Office names in intact explicit present-tense creation clauses. Prefix-of and name-ending forms, including a comma-delimited within-parent clause, establish a source witness. Important lowercase words in that creation or later exact same-word/hyphen complete references receive full-name reader review with no asserted replacement. The source creation and every changed component remain in original PDF coordinates, including guarded word divisions. Generic bodies, potential/past/historical/conditional creations, digest reports, literal quotations, headings, tables, strikes and unknown exclusions do not establish a witness. Known registry corrections and independent precise capitalization retain priority; lexical prefix and parser modifier guesses wholly within established names are protected. Earlier or larger/different/renamed references, conflicting source capitalizations, unknown creation syntax, entity heads and broader legal identity remain unresolved. These records do not update the California Entities registry or establish every agency name.';
