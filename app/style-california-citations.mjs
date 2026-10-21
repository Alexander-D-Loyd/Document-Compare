import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {styleSingleQuoteRanges} from './style-single-quote-ranges.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
import {isOpinionStyleDocument,styleDocumentTypeLabel} from './style-document-type.mjs';

export const CALIFORNIA_CITATION_SOURCE=Object.freeze({title:'California Style Manual',edition:'Fourth edition (2000)',url:'https://sdap.org/wp-content/uploads/downloads/Style-Manual.pdf',sha256:'276be1cfc5284989713edde57466f51309d76d145b8c11b5781983fbf005bfea',scope:'Selected citation forms in explicitly selected Opinions and Cover Letters. No authority validity, publication status, pinpoint accuracy, italics or complete manual certification.'});
const overlap=(rows,a,b)=>rows.some(r=>r.start<b&&r.end>a);
const reporter='(?:Cal\\.\\s*(?:App\\.\\s*)?(?:2d|3d|4th|5th)?|U\\.\\s*S\\.|F\\.\\s*(?:2d|3d|4th)|F\\.\\s*Supp\\.\\s*(?:2d|3d)?)';
const location='\\d+\\s+'+reporter+'\\s+\\d+(?:\\s*,\\s*\\d+(?:[-–]\\d+)?)*';
const caseTitle='[\\p{Lu}][\\p{L}\\p{M}’\'.& -]{0,80}?\\s+v\\.\\s+[\\p{Lu}][\\p{L}\\p{M}’\'.& -]{0,80}?';
const codes='(?:Civ\\. Code|Pen\\. Code|Evid\\. Code|Prob\\. Code|Gov\\. Code|Code Civ\\. Proc\\.)';

export function californiaCitationReview(doc,references){
 const priority=references?.lcb?.pages?.find(p=>p.page===1);
 if(!isOpinionStyleDocument(doc)||!priority?.text.includes('California Style Manual'))return {issues:[],ranges:[]};
 const view=styleWordDivisionView(doc,{preserveRemainingWords:true}),d=view?.doc||doc;
 const result=withStyleContext(d,()=>{
  const ctx=styleContext(d),source=ctx.source,blocked=styleEvidenceGuard(d,ctx),literal=originalStyleLiteralGuard(d,ctx),single=styleSingleQuoteRanges(source),issues=[],ranges=[];
  const safe=(a,b)=>!blocked(a,b)&&!literal(a,b)&&!overlap(single,a,b)&&ctx.at(a)!=='Heading'&&!cutsOriginalStyleWord(d,a)&&!cutsOriginalStyleWord(d,b)&&!/[\p{L}\p{N}\p{M}_/#@-]$/u.test(source.slice(0,a))&&!/^[\p{L}\p{N}\p{M}_/#@-]/u.test(source.slice(b));
  const add=(start,end,suggestion,section,page,reason,evidenceStart=start,evidenceEnd=end)=>{
   if(!safe(evidenceStart,evidenceEnd)||overlap(issues,start,end))return;
   issues.push({start,end,text:d.text.slice(start,end),suggestion,guideId:'lcb',guidePage:1,guidePrintedPage:String(priority.printedPage),rule:'Reference order, item 5',category:'Supplementary Citation Review',context:styleDocumentTypeLabel(d),checkId:'california-citation-form',reviewSuggested:suggestion===null,confidence:suggestion===null?'Review Suggested':'Source form',conflict:false,matchesPrimary:false,evidenceStart,evidenceEnd,supplementarySource:{...CALIFORNIA_CITATION_SOURCE,section,printedPage:page,pdfPage:page+26,reason},message:'California Style Manual '+section+': '+reason+' This supplementary check applies to the selected '+styleDocumentTypeLabel(d).toLowerCase()+' under LCB1 item 5. Citation identity, current authority and supporting pinpoint text have not been verified.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:1,guidePrintedPage:String(priority.printedPage),rule:'Reference order, item 5',preferred:null,ruleText:'LCB selects the California Style Manual for opinion and cover letter citations.'}]});
  };
  // Preserve complete reporter coordinates as citation numbers. This does
  // not establish that a case, reporter series or cited page actually exists.
  for(const m of source.matchAll(new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])'+caseTitle+'\\s*\\((?:[A-Za-z.\\d ]+\\s+)?(?:18|19|20)\\d{2}\\)\\s+'+location,'gu')))if(safe(m.index,m.index+m[0].length))ranges.push({start:m.index,end:m.index+m[0].length,kind:'Complete case citation coordinates'});
  for(const m of source.matchAll(new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])'+location,'gu'))){
   const start=m.index,end=start+m[0].length;
   const r=new RegExp(reporter,'u').exec(m[0]);if(!r)continue;
   const canonical=r[0].replace(/\s+/gu,'');
   // Fifth-series spellings are recognized coordinates; the 2000 source is
   // not used as new authority for their internal abbreviation typography.
   if(r[0]!==canonical&&!/5th/u.test(r[0]))add(start+r.index,start+r.index+r[0].length,canonical,'§1:1[E]',6,'The printed reporter abbreviations have no internal spaces; preserve the surrounding volume and page.',start,end);
  }
  for(const m of source.matchAll(new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])'+caseTitle+'\\s*,\\s*'+location+'\\s*\\((?:18|19|20)\\d{2}\\)','gu')))add(m.index,m.index+m[0].length,null,'§1:1[D]–[E]',5,'A full citation puts the year parenthetical after the case title and before the reporter location. Confirm this citation structure; no reordered title or date is selected.');
  for(const m of source.matchAll(new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])'+codes+'\\s*,?\\s*supra\\s*,?\\s*§{1,2}\\s*\\d+(?:\\.\\d+)*','gu')))add(m.index,m.index+m[0].length,null,'§2:5[B]',48,'Code citations do not use supra. Confirm the intended code and section, including any earlier omission convention.');
  for(const m of source.matchAll(new RegExp('\\(\\s*(?<code>'+codes+')(?<gap>\\s+)§{1,2}\\s*\\d+(?:\\.\\d+)*','dgu'))){const [a,b]=m.indices.groups.gap;add(a,b,', ','§2:6',49,'A parenthetical code citation separates the code designation from the section symbol with a comma.',m.index,m.index+m[0].length);}
  for(const m of source.matchAll(/(?<![\p{L}\p{N}\p{M}_])(?:[Ii]bid\.|[Ii]d\.)(?:\s+at\s+(?:pp?\.|pages?)\s+\d+(?:[-–]\d+)?)?(?![\p{L}\p{N}\p{M}_])/gu))add(m.index,m.index+m[0].length,null,'§1:2[C]; §2:5[B]',7,'Verify that the intended immediately preceding authority is in the same paragraph with no intervening authority, and that the point-page relationship permits this short form. Extracted text alone does not establish the reference chain.');
  return {issues,ranges};
 });
 if(!view)return result;
 return {issues:view.restore(result.issues).map((i,n)=>({...i,evidenceStart:view.toSource(result.issues[n].evidenceStart),evidenceEnd:view.toSource(result.issues[n].evidenceEnd,true)})),ranges:result.ranges.map(r=>({...r,start:view.toSource(r.start),end:view.toSource(r.end,true)}))};
}
