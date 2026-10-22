import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {styleSingleQuoteRanges} from './style-single-quote-ranges.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
import {isOpinionStyleDocument,styleDocumentTypeLabel} from './style-document-type.mjs';
import {californiaCodeCitationPattern,californiaCitationFamilyCandidates,citationParentheticals} from './style-california-citation-families.mjs';
import {citationContextReviewRegions,citationSectionLabel} from './style-california-citation-review-catalog.mjs';
import {proseCitationRegions,citationNumberCoordinates,CITATION_CASE_TITLE,CITATION_CASE_LOCATION} from './style-california-prose-citations.mjs';
import {citationRecoveryRegions,citationRecoveryCoordinates} from './style-california-citation-recovery.mjs';
import {californiaCaseFormCandidates,californiaCaseSourceRegions} from './style-california-case-forms.mjs';
import {californiaEnactmentCandidates,californiaEnactmentSourceRegions} from './style-california-enactment-forms.mjs';
import {californiaSecondarySourceCandidates,californiaSecondarySourceRegions,SECONDARY_ANGLE_URL_PATTERN} from './style-california-secondary-forms.mjs';
import {citationProvisionChecks} from './style-california-citation-reader-tasks.mjs';

export const CALIFORNIA_CITATION_SOURCE=Object.freeze({title:'California Style Manual',edition:'Fourth edition (2000)',url:'https://sdap.org/wp-content/uploads/downloads/Style-Manual.pdf',sha256:'276be1cfc5284989713edde57466f51309d76d145b8c11b5781983fbf005bfea',scope:'Source-form checks and reader tasks for recognized citation families in explicitly selected Opinions and Cover Letters. Authority identity, current publication status, supporting pinpoint text and original typography require verification. Unrecognized and protected forms are not certified.'});
const overlap=(rows,a,b)=>rows.some(r=>r.start<b&&r.end>a);
const reporter='(?:Cal\\.(?:\\s*App\\.)?(?:\\s*(?:2d|3d|4th|5th))?|U\\.\\s*S\\.|Fed\\.|F\\.\\s*(?:2d|3d|4th)|F\\.\\s*Supp\\.(?:\\s*(?:2d|3d))?)';
const sourcePrintedReporter=/^(?:Cal\.(?:App\.)?(?:2d|3d|4th)?|U\.S\.|Fed\.|F\.(?:2d|3d)|F\.Supp\.)$/u;
const location='\\d+\\s+'+reporter+'\\s+\\d+(?:\\s*,\\s*\\d+(?:[-–]\\d+)?)*';
const caseTitle=CITATION_CASE_TITLE;
const codes=californiaCodeCitationPattern;
const formCandidates=source=>[...californiaCitationFamilyCandidates(source),...californiaCaseFormCandidates(source),...californiaEnactmentCandidates(source),...californiaSecondarySourceCandidates(source)];
const structuredSourceRegions=source=>[...californiaCaseSourceRegions(source),...californiaEnactmentSourceRegions(source),...californiaSecondarySourceRegions(source)];

export function californiaCitationReview(doc,references,{includeContextReview=false}={}){
 const priority=references?.lcb?.pages?.find(p=>p.page===1);
 if(!isOpinionStyleDocument(doc)||!priority?.text.includes('California Style Manual'))return {issues:[],ranges:[]};
 const view=styleWordDivisionView(doc,{preserveRemainingWords:true}),d=view?.doc||doc;
 const result=withStyleContext(d,()=>{
  const ctx=styleContext(d),source=ctx.source,blocked=styleEvidenceGuard(d,ctx),literal=originalStyleLiteralGuard(d,ctx),single=styleSingleQuoteRanges(source),issues=[],ranges=[];
  const originalContext=originalBodyStyleContext(d),originalEnclosed=originalContext?citationParentheticals(originalContext.source):[],originalRegions=originalContext?[...originalEnclosed,...proseCitationRegions(originalContext.source,originalEnclosed)]:[];
  // A removed decimal/suffix in an originally complete form cannot expose
  // a shorter jury instruction, rule or subdivision as fresh prose evidence.
  if(originalContext)originalRegions.push(...formCandidates(originalContext.source).map(r=>({start:r.evidenceStart,end:r.evidenceEnd})),...structuredSourceRegions(originalContext.source));
  if(originalContext)originalRegions.push(...citationRecoveryRegions(originalContext.source));
  const incomplete=citationRecoveryRegions(source).filter(r=>r.recoveryKind!=='unknown-family'),reviewedRegions=[];
  const boundarySafe=(a,b)=>ctx.at(a)!=='Heading'&&!cutsOriginalStyleWord(d,a)&&!cutsOriginalStyleWord(d,b)&&!/[\p{L}\p{N}\p{M}_/#@-]$/u.test(source.slice(0,a))&&!/^[\p{L}\p{N}\p{M}_/#@-]/u.test(source.slice(b));
  const originalOwnerBlocked=(a,b)=>originalRegions.some(r=>r.start<=a&&r.end>=b&&blocked(r.start,r.end));
  const safeSource=(a,b)=>(!blocked(a,b)&&!literal(a,b)||safeCongressionalDocument(a,b))&&!overlap(single,a,b)&&boundarySafe(a,b)&&!originalOwnerBlocked(a,b);
  const safe=(a,b)=>safeSource(a,b)&&!overlap(incomplete,a,b);
  const citationBlocked=styleEvidenceGuard(d,{...ctx,literalAt:(a,b)=>overlap(ctx.literalRanges,a,b)});
  const safeCongressionalDocument=(a,b)=>{
   // H.R.Doc is also a possible filename suffix. Only its complete printed
   // congressional number plus date/Congress witness can settle that role.
   const text=source.slice(a,b),approved=[...text.matchAll(/(?<![\p{L}\p{N}\p{M}_/#@.-])H\.R\.Doc(?=\.\s+No\.\s*\d+)/gu)].map(m=>({start:a+m.index,end:a+m.index+m[0].length}));
   if(!approved.length||!/(?:\b[12]\d{3}\b|\b\d+(?:st|nd|rd|th|d)\s+Cong\.)/u.test(text)||citationBlocked(a,b)||overlap(ctx.literalRanges,a,b))return false;
   const allowed=r=>approved.some(p=>p.start===r.start&&p.end===r.end);
   if(!ctx.technicalRanges.filter(r=>r.start<b&&r.end>a).every(allowed))return false;
   if(originalContext&&(overlap(originalContext.literalRanges,a,b)||overlap(styleSingleQuoteRanges(originalContext.source),a,b)||!originalContext.technicalRanges.filter(r=>r.start<b&&r.end>a).every(allowed)))return false;
   return true;
  };
  const safeUrlContext=(a,b,allowIncomplete=false)=>{
   const text=source.slice(a,b),urls=[...text.matchAll(new RegExp(SECONDARY_ANGLE_URL_PATTERN,'gu'))].map(m=>({start:a+m.index,end:a+m.index+m[0].length})),outside=text.replace(new RegExp(SECONDARY_ANGLE_URL_PATTERN,'gu'),'');
   if(!urls.length||!/[12]\d{3}/u.test(outside)||!/[\p{L}][\p{L}\p{M}]+[ ,]+[\p{L}]/u.test(outside)||citationBlocked(a,b)||literal(a,b)||overlap(single,a,b)||!boundarySafe(a,b)||originalOwnerBlocked(a,b)||!allowIncomplete&&overlap(incomplete,a,b))return false;
   // Only complete angle-bracket URLs inside bibliographic context receive
   // a reader task. No URL characters are corrected, fetched or opened.
   return ctx.technicalRanges.filter(r=>r.start<b&&r.end>a).every(r=>urls.some(u=>r.start>u.start&&r.end<u.end));
  };
  const add=(start,end,suggestion,section,page,reason,evidenceStart=start,evidenceEnd=end,allowUrlContext=false,allowIncomplete=false)=>{
   if(!((allowIncomplete?safeSource(evidenceStart,evidenceEnd):safe(evidenceStart,evidenceEnd))||allowUrlContext&&safeUrlContext(evidenceStart,evidenceEnd,allowIncomplete)))return;
   const owner=issues.find(i=>i.start<end&&i.end>start);
   if(owner){
    if(owner.supplementarySource.section!==section||owner.supplementarySource.reason!==reason){
     owner.citationFormChecks||=[];
     if(!owner.citationFormChecks.some(c=>c.section===section&&c.reason===reason))owner.citationFormChecks.push({section,printedPage:page,pdfPage:page+26,reason,preferred:suggestion});
     owner.additionalReviewSuggested=true;
    }
    return;
   }
   issues.push({start,end,text:d.text.slice(start,end),suggestion,guideId:'lcb',guidePage:1,guidePrintedPage:String(priority.printedPage),rule:'Reference order, item 5',category:'Supplementary Citation Review',context:styleDocumentTypeLabel(d),checkId:'california-citation-form',reviewSuggested:suggestion===null,confidence:suggestion===null?'Review Suggested':'Source form',conflict:false,matchesPrimary:false,evidenceStart,evidenceEnd,supplementarySource:{...CALIFORNIA_CITATION_SOURCE,section,printedPage:page,pdfPage:page+26,reason},message:'California Style Manual '+section+': '+reason+' This supplementary check applies to the selected '+styleDocumentTypeLabel(d).toLowerCase()+' under LCB1 item 5. Citation identity, current authority and supporting pinpoint text have not been verified.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:1,guidePrintedPage:String(priority.printedPage),rule:'Reference order, item 5',preferred:null,ruleText:'LCB selects the California Style Manual for opinion and cover letter citations.'}]});
  };
  // Preserve complete reporter coordinates as citation numbers. This does
  // not establish that a case, reporter series or cited page actually exists.
  for(const m of source.matchAll(new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])'+caseTitle+'\\s*\\((?:[A-Za-z.\\d ]+\\s+)?(?:18|19|20)\\d{2}\\)\\s+'+location,'gu')))if(safe(m.index,m.index+m[0].length))ranges.push({start:m.index,end:m.index+m[0].length,kind:'Complete case citation coordinates'});
  for(const m of source.matchAll(new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])'+location,'gu'))){
   const start=m.index,end=start+m[0].length;
   const r=new RegExp(reporter,'u').exec(m[0]);if(!r)continue;
   const canonical=r[0].replace(/\s+/gu,'');
   // Recognizing coordinates is not typography authority. Compare only
   // reporter forms actually printed in the reviewed source; unfamiliar
   // series retain reader tasks rather than inheriting a guessed spelling.
   if(r[0]!==canonical&&sourcePrintedReporter.test(canonical))add(start+r.index,start+r.index+r[0].length,canonical,'§1:1[E]',6,'The printed reporter abbreviations have no internal spaces; preserve the surrounding volume and page.',start,end);
  }
  for(const m of source.matchAll(new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])'+caseTitle+'\\s*,\\s*'+CITATION_CASE_LOCATION+'\\s*\\([12]\\d{3}\\)','gu')))add(m.index,m.index+m[0].length,null,'§1:1[D]–[E]',5,'A full citation puts the year parenthetical after the case title and before the reporter location. Confirm this citation structure; no reordered title or date is selected.');
  for(const m of source.matchAll(new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])'+codes+'\\s*,?\\s*supra\\s*,?\\s*§{1,2}\\s*\\d+(?:\\.\\d+)*','gu')))add(m.index,m.index+m[0].length,null,'§2:5[B]',48,'Code citations do not use supra. Confirm the intended code and section, including any earlier omission convention.');
  for(const m of source.matchAll(/(?<![\p{L}\p{N}\p{M}_])(?:[Ii]bid\.|[Ii]d\.)(?:\s+at\s+(?:pp?\.|pages?)\s+\d+(?:[-–]\d+)?)?(?![\p{L}\p{N}\p{M}_])/gu))add(m.index,m.index+m[0].length,null,'§1:2[C]; §2:5[B]',7,'Verify that the intended immediately preceding authority is in the same paragraph with no intervening authority, and that the point-page relationship permits this short form. Extracted text alone does not establish the reference chain.');
  for(const r of formCandidates(source))add(r.start,r.end,r.suggestion,r.section,r.page,r.reason,r.evidenceStart,r.evidenceEnd,r.allowUrlContext===true);
  for(const region of citationParentheticals(source)){
   const full=new RegExp(caseTitle+'\\s*\\((?:[A-Za-z.\\d ]+\\s+)?(?:18|19|20)\\d{2}\\)\\s+'+location,'gu'),cases=[...region.text.matchAll(full)];
   if(!cases.length)continue;
   for(let n=1;n<cases.length;n++){
    const prior=cases[n-1],next=cases[n],gap=region.text.slice(prior.index+prior[0].length,next.index);
    if(/^\s*,\s*$/u.test(gap))add(region.start,region.end,null,'§1:7',12,'Separate distinct case citations inside parentheses with semicolons. A comma can apply to opinions in the same cause; confirm that relationship before changing the separator.');
   }
   const separate=/\[(?:(?:dis\.|conc\.|plur\.|lead)\s+(?:&\s*(?:dis\.|conc\.)\s+)?opn\.)[^\]\n]*\]/u.exec(region.text);
   if(separate)add(region.start+separate.index,region.start+separate.index+separate[0].length,null,'§1:10',13,'The identification of a separate opinion uses parentheses even inside a parenthetical citation. Verify the opinion’s role and author; brackets used for parallel reporters have a different purpose.',region.start,region.end);
   const parallel=/,\s*\d+\s+(?:Cal\.Rptr\.(?:2d|3d)?|P\.(?:2d|3d)|S\.Ct\.|L\.Ed\.(?:2d)?)\s+\d+/u.exec(region.text);
   if(parallel)add(region.start+parallel.index,region.start+parallel.index+parallel[0].length,null,'§1:1[F]',6,'Parallel reporter locations follow the primary citation in brackets. Verify that these reporters describe the same opinion before changing punctuation.',region.start,region.end);
   const history=/\b(?:unpublished|not (?:certified|ordered) (?:for )?publication|review granted|opn\. (?:mod\.|superseded)|judg\. vacated|revd\.|disapproved)(?![\p{L}\p{M}])/u.exec(region.text);
   if(history)add(region.start+history.index,region.start+history.index+history[0].length,null,'§1:11; §1:25–1:27',14,'Publication status or subsequent history affects how this authority may be used. Verify the current record, the point relied on and applicable citation rules. The 2000 manual does not establish current citability or the effect of a later grant of review.',region.start,region.end);
  }
  const enclosed=includeContextReview?citationParentheticals(source):[],prose=includeContextReview?proseCitationRegions(source,enclosed):[];
  // A court/year parenthetical belongs to its complete prose citation. It
  // must not become a separate California-source task merely because the
  // district designation contains Cal. followed by a year.
  const combined=[];
  if(includeContextReview)for(const r of [...enclosed,...prose,...structuredSourceRegions(source)]){
   const prior=combined.find(p=>p.start===r.start&&p.end===r.end);
   if(prior){prior.caseCitation||=r.caseCitation===true;for(const key of ['caseSourceFamilies','citationSourceFamilies','coordinateRanges'])prior[key]=[...(prior[key]||[]),...(r[key]||[])];}
   else combined.push({...r,coordinateRanges:[...(r.coordinateRanges||[])]});
  }
  const contexts=combined.filter((r,n,all)=>!all.some((p,j)=>j!==n&&p.start<=r.start&&p.end>=r.end&&(p.start<r.start||p.end>r.end||j<n)));
  if(includeContextReview)for(const region of citationContextReviewRegions(source,contexts,ranges)){
   if(originalRegions.some(r=>r.start<=region.start&&r.end>=region.end&&blocked(r.start,r.end)))continue;
   if(!safe(region.start,region.end)&&!safeUrlContext(region.start,region.end))continue;
   reviewedRegions.push(region);
   ranges.push(...citationNumberCoordinates(region));
   ranges.push(...(region.coordinateRanges||[]).filter(r=>Number.isInteger(r.start)&&Number.isInteger(r.end)&&r.start>=region.start&&r.end<=region.end&&r.end>r.start));
   if(prose.some(p=>p.start===region.start&&p.end===region.end))ranges.push({start:region.start,end:region.end,kind:'Complete prose citation coordinates'});
   const checks=region.families.map(f=>{const provisionChecks=citationProvisionChecks(f);return {id:f.id,sections:f.sections.map(n=>f.chapter+':'+n),sectionLabel:citationSectionLabel(f),printedPage:f.page,pdfPage:f.page+26,provisionChecks,tasks:provisionChecks.length?provisionChecks.flatMap(p=>p.tasks.map(t=>'§'+p.section+': '+t)):[...f.checks]};});
   const prior=issues.filter(i=>i.start<region.end&&i.end>region.start);
   if(prior.length){
    // One passage owns its form finding and the additional unresolved tasks.
    // Do not add a second generic question covering the same citation.
    if(safe(region.start,region.end)||safeUrlContext(region.start,region.end)){prior[0].citationContextReview=checks;prior[0].additionalReviewSuggested=true;}
    continue;
   }
   const first=region.families[0];
   add(region.start,region.end,null,'§'+first.chapter+':'+first.sections[0],first.page,'The citation family is recognized, but extracted text does not establish all applicable source requirements. Complete the source-specific checks below; this is a verification question, not an assertion that the citation is wrong.',region.start,region.end,true);
   const issue=issues.find(i=>i.start===region.start&&i.end===region.end);
   if(issue){issue.checkId='california-citation-context-review';issue.citationContextReview=checks;issue.reviewKind='citation-source-context';}
  }
  if(includeContextReview){
   const owned=[...reviewedRegions,...issues.map(i=>({start:i.evidenceStart,end:i.evidenceEnd}))];
   for(const region of citationRecoveryRegions(source,owned)){
    if(!safeSource(region.start,region.end)&&!safeUrlContext(region.start,region.end,true))continue;
    ranges.push(...citationNumberCoordinates(region),...citationRecoveryCoordinates(region));
    const tasks=['Identify the source and the applicable citation chapter before deciding its form.','Verify the exact authority or work, cited version/date, locator and supporting text against the source.','Check any abbreviation, short-reference chain and original typography after the source is identified.'];
    if(region.recoveryKind!=='unknown-family')tasks.unshift('Resolve the incomplete or oversized citation boundaries before applying checks to internal fragments.');
    add(region.start,region.end,null,'Citation structure and source identification (chapters 1–3)',4,region.reason+' No authority, source family, error or replacement has been inferred.',region.start,region.end,true,true);
    const issue=issues.find(i=>i.start===region.start&&i.end===region.end);if(!issue)continue;
    issue.checkId='california-citation-unresolved-review';issue.reviewKind='unresolved-citation-source';issue.citationRecoveryKind=region.recoveryKind;
    issue.citationContextReview=[{id:'unclassified-citation',sections:[],sectionLabel:'Chapters 1–3 · source classification required',chapterRange:true,printedPage:4,pdfPage:30,tasks}];
   }
  }
  // Restoring body text is negative evidence only. Damaging another part of
  // a citation must not turn its intact volume/edition/year into prose counts.
  // Discard every finding from this view; retain only coordinate protection.
  if(originalContext){
   const originalDoc={...d,text:originalContext.source,struck:[],excluded:[]};
   const original=californiaCitationReview(originalDoc,references,{includeContextReview:true});
   ranges.push(...original.ranges.map(r=>({...r,kind:'Original citation boundary protection'})));
  }
  return {issues,ranges};
 });
 if(!view)return result;
 return {issues:view.restore(result.issues).map((i,n)=>({...i,evidenceStart:view.toSource(result.issues[n].evidenceStart),evidenceEnd:view.toSource(result.issues[n].evidenceEnd,true)})),ranges:result.ranges.map(r=>({...r,start:view.toSource(r.start),end:view.toSource(r.end,true)}))};
}
