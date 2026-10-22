import {selectedEntityAuthority} from './style-selected-entity-authority.mjs';
import {californiaEntityReview} from './style-california-entities.mjs';
import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {styleSingleQuoteRanges} from './style-single-quote-ranges.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const overlap=(rows,a,b)=>rows.some(r=>r.start<b&&r.end>a);
const pattern=name=>name.split(/\s+/u).map(s=>escape(s).replace(/[’']/gu,"[’']")).join('\\s+');
const fold=s=>s.replace(/\s+/gu,' ').replace(/[’']/gu,"'").trim();

// Ineligible registry entries cannot supply an automatic replacement. A
// concrete multiword title can still witness a case difference, but exact
// names, index syntax, region templates and absent names are not errors.
export function lcbEntitySourceReviewIssues(doc,references,{existingIssues=[],entityAuthority=null}={}){
 if(!references?.lcb?.pages?.find(p=>p.page===17))return [];
 const selected=selectedEntityAuthority(entityAuthority),view=styleWordDivisionView(doc,{preserveRemainingWords:true}),d=view?.doc||doc;
 const prior=view?existingIssues.map(i=>({...i,start:view.toView(i.start),end:view.toView(i.end)})):existingIssues;
 const issues=withStyleContext(d,()=>review(d,references,selected,prior,entityAuthority));
 return view?view.restore(issues):issues;
}
function review(doc,references,selected,existingIssues,entityAuthority){
 const ctx=styleContext(doc),source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),single=styleSingleQuoteRanges(source),registered=californiaEntityReview(doc,references,{entityAuthority}).ranges,issues=[];
 const eligible=(a,b)=>!blocked(a,b)&&!literal(a,b)&&!quoted({start:a,end:b})&&!cutsOriginalStyleWord(doc,a)&&!cutsOriginalStyleWord(doc,b)&&ctx.at(a)!=='Heading'&&!overlap(single,a,b)&&!overlap(existingIssues,a,b)&&!overlap(registered,a,b)&&!overlap(issues,a,b);
 for(const entry of selected.entries.filter(e=>!e.checkEligible)){
  // Single generic office nouns do not establish the named office, and
  // punctuation/templates are not complete prose titles to reconstruct.
  if(!/^[\p{L}\p{M}’'-]+(?:\s+[\p{L}\p{M}’'-]+)+$/u.test(entry.name))continue;
  const regex=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_-])'+pattern(entry.name)+'(?![\\p{L}\\p{N}\\p{M}_-])','giu');
  for(const m of source.matchAll(regex)){
   const start=m.index,end=start+m[0].length;
   if(fold(m[0])===fold(entry.name)||m[0]===m[0].toUpperCase()||!eligible(start,end))continue;
   issues.push({start,end,text:doc.text.slice(start,end),matchText:source.slice(start,end).replace(/\s+/gu,' '),suggestion:null,guideId:'lcb',guidePage:17,guidePrintedPage:String(references.lcb.pages.find(p=>p.page===17).printedPage),rule:'Capitalization, item 7: entity source review',category:'Entity Source Review',context:ctx.at(start),confidence:'Review Suggested',reviewSuggested:true,reviewKind:'ineligible-entity-entry',checkId:'lcb-entity-source-review',conflict:false,matchesPrimary:false,entitySource:{file:selected.source.file||selected.source.inputFile,sha256:selected.source.sha256||selected.source.datasetId,sourceName:entry.name,citation:entry.citation||'',annotation:entry.annotation||'',checkEligible:false},message:'Review Suggested: This complete wording differs in capitalization from the selected California Entities source entry “'+entry.name+'”'+(entry.citation?' ('+entry.citation+')':'')+'. The entry is not eligible for automatic correction. Confirm that the named office is intended before applying its capitalization. An unlisted or different name is not an error. No replacement has been selected.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:17,guidePrintedPage:String(references.lcb.pages.find(p=>p.page===17).printedPage),rule:'Capitalization, items 1 and 7',preferred:null,ruleText:'Capitalize the complete title of an agency and verify entities with the California Entities list on the OLC Intranet.'}]});
  }
 }
 return issues.sort((a,b)=>a.start-b.start||a.end-b.end);
}
