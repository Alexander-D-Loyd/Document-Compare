import {styleContext,withStyleContext}from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord}from './style-evidence.mjs';
import {styleWordDivisionView}from './style-word-divisions.mjs';
import {lcbCreatedTitleReferenceReviewIssues}from './style-lcb-review-title-references.mjs';
import {OFFLINE_MODIFIERS,GENERAL_MODIFIER_REVIEW_RULE}from './offline-rules.mjs';

export const DESIGNATED_TITLE_SCOPE='Document-local LCB official-title capitalization review for intact self-designations of this act, chapter, part, division, article, title, law or code as a multiword Act, Code or Law, optionally of a four-digit year. Known-as and known-and-may-be-cited-as clauses establish the source witness. Balanced double quotation marks may enclose only the title; quoted/example clauses, digest declarations, historical or possible designations, source strikes, tables, headings and unknown exclusions do not establish it. Important lowercase words in the naming clause and later same-word/same-year references receive full-title reader review, without an asserted replacement or legal identity. Explicit source wording protects matching names from generic prefix and parser modifier changes; precise capitalization outside those lexical changes remains eligible. Different years, abbreviations, renamed/historical names, competing capitalizations, unknown designation syntax and broader legal identity remain unresolved.';
const token="[A-Za-z0-9]+(?:(?:-(?:[ \\t]*\\n\\s*)?|[’'])[A-Za-z0-9]+)*";
const word='(?!(?:shall|must|may|will|would|should|can|could|is|are|was|were|has|have|had|that|which|unless|until|whether|where)\\b)'+token;
const title=word+'(?:\\s+'+word+')*?\\s+(?:Act|Code|Law)(?:\\s+of\\s+\\d{4})?';
const prefix='(?<![\\p{L}\\p{N}\\p{M}_-])This\\s+(?:act|chapter|part|division|article|title|law|code)\\s+(?:shall\\s+be|is)\\s+known\\s*(?:,\\s*)?(?:and\\s+(?:may|shall)\\s+be\\s+cited\\s*(?:,\\s*)?)?as\\s+(?:the\\s+)?';
const patterns=[new RegExp(prefix+'(?<open>[“"])\\s*(?<name>'+title+')\\s*[.,]?\\s*(?<close>[”"])','giu'),new RegExp(prefix+'(?<name>'+title+')(?=\\s*[,.;:!?()]|$)','giu')];
const little=new Set('a an and as at by for from in into of on or the to with'.split(' '));
const logical=text=>text.replace(/-[ \t]*\n\s*(?=[A-Za-z0-9])/g,'-').replace(/\s+/g,' ').trim();
const intersect=(rows,start,end)=>rows.some(r=>r.start<end&&r.end>start);
const engineRules=[...OFFLINE_MODIFIERS.map(r=>r.engineRule),GENERAL_MODIFIER_REVIEW_RULE],checkIds=['lcb-prefixes',...OFFLINE_MODIFIERS.map(r=>r.checkId),'lcb-general-unit-modifier-review'];

function records(doc){
 const ctx=styleContext(doc),source=ctx.source,withoutLiterals=styleEvidenceGuard(doc,{...ctx,literalAt:()=>false}),normal=styleEvidenceGuard(doc,ctx),singles=[...source.matchAll(/‘[^’]*’|(?<![\p{L}\p{N}\p{M}_])'[^'\n]*'(?![\p{L}\p{N}\p{M}_])/gu)].map(m=>({start:m.index,end:m.index+m[0].length})),out=[];
 for(const pattern of patterns)for(const m of source.matchAll(pattern)){
  const start=m.index+m[0].lastIndexOf(m.groups.name),end=start+m.groups.name.length,evidenceStart=m.index,evidenceEnd=m.index+m[0].length;
  if(ctx.at(evidenceStart)!=='Bill'||withoutLiterals(evidenceStart,evidenceEnd)||intersect(singles,evidenceStart,evidenceEnd)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||out.some(r=>r.start<end&&r.end>start))continue;
  if(m.groups.open){
   const open=m.groups.open,close=m.groups.close;if(open==='“'?close!=='”':close!=='"')continue;
   const quoteStart=start-source.slice(evidenceStart,start).match(/[“"]\s*$/u)[0].length,quoteEnd=evidenceEnd;
   if(!ctx.literalRanges.some(r=>r.start===quoteStart&&r.end===quoteEnd)||ctx.literalRanges.some(r=>r.start<evidenceEnd&&r.end>evidenceStart&&(r.start!==quoteStart||r.end!==quoteEnd)))continue;
  }else if(normal(evidenceStart,evidenceEnd))continue;
  const name=logical(m.groups.name);out.push({name,start,end,text:doc.text.slice(start,end),evidenceStart,evidenceEnd,declarationText:doc.text.slice(evidenceStart,evidenceEnd),evidenceText:logical(m[0]),sourceKind:'Document-local intact self-designation',supersedesCheckIds:checkIds,supersedesEngineRules:engineRules});
 }
 return out.sort((a,b)=>a.start-b.start);
}

function runRecords(doc){
 const view=styleWordDivisionView(doc),reviewDoc=view?.doc||doc,found=withStyleContext(reviewDoc,()=>records(reviewDoc));if(!view)return found;
 return view.restore(found).map((r,n)=>{const original=found[n],evidenceStart=view.toSource(original.evidenceStart),evidenceEnd=view.toSource(original.evidenceEnd,true);return {...r,evidenceStart,evidenceEnd,text:doc.text.slice(r.start,r.end),declarationText:doc.text.slice(evidenceStart,evidenceEnd)};});
}
export function designatedOfficialTitleRecords(doc){return runRecords(doc);}
const options={recordProvider:designatedOfficialTitleRecords,checkId:'lcb-designated-title-reference-review',category:'Designated Title Reference Review',referenceMessage:w=>'Review Suggested: This later title has the same words and year as “'+w.name+'” in an earlier intact self-designation, but an important word/component begins in lowercase. LCB capitalizes official act, code and law titles. Confirm the intended title and legal reference. The naming clause is document-local evidence; no replacement is asserted.'};
export function designatedTitleReferenceIssues(doc,references,extra={}){return lcbCreatedTitleReferenceReviewIssues(doc,references,{...options,...extra});}
export function designatedTitleProtectionRanges(doc,references){
 const found=lcbCreatedTitleReferenceReviewIssues(doc,references,{...options,protectionOnly:true});
 return [...designatedOfficialTitleRecords(doc),...found].map(r=>({...r,supersedesCheckIds:checkIds,supersedesEngineRules:engineRules}));
}
export function designatedTitleCreationIssues(doc,references,{existingIssues=[]}={}){
 if(!references?.lcb?.pages?.[16])return [];
 return designatedOfficialTitleRecords(doc).filter(r=>r.name.split(/\s+/).some(w=>!little.has(w.toLowerCase())&&/^[a-z]/.test(w))&&!intersect(existingIssues.filter(i=>!checkIds.includes(i.checkId)),r.start,r.end)).map(r=>({...r,titleWitness:r,text:doc.text.slice(r.start,r.end),suggestion:null,guideId:'lcb',guidePage:17,guidePrintedPage:String(references.lcb.pages[16].printedPage),rule:'Capitalization, item 2',category:'Self-designated Official Title Review',context:'Bill',confidence:'Review Suggested',reviewSuggested:true,reviewKind:'designated-title',checkId:'lcb-designated-title-creation-review',conflict:false,matchesPrimary:false,message:'Review Suggested: This self-designation appears to name an official Act, Code or Law, but an important title word begins in lowercase. LCB capitalizes official titles. Confirm that this is the intended formal name; no replacement is asserted.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:17,guidePrintedPage:String(references.lcb.pages[16].printedPage),rule:'Capitalization, item 2',preferred:null,ruleText:'Capitalize official titles of accounts, acts, codes, funds, laws, etc.'}]}));
}
