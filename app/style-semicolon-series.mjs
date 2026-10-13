import {styleContext,styleRangeBlocked} from './style-context.mjs';
import {styleEvidenceGuard} from './style-evidence.mjs';
import {introducedListRanges,cutsOriginalSourceWord} from './style-introduced-lists.mjs';
import {punctuationListNounPhrase as listNounPhrase,splitListCommas,PUNCTUATION_LIST_INTRODUCERS as LIST_INTRODUCERS} from './style-list-phrases.mjs';
// Require an explicitly introduced list, existing semicolon grouping, and
// comma-separated groups of known nouns or complete figures. General clause meaning stays manual.
export function semicolonSeriesIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const blocked=styleEvidenceGuard(doc,ctx);
 const valid=group=>{const words=splitListCommas(group.trim());return words.length>=2&&words.every(w=>listNounPhrase(w,references.lcb));};
 for(const range of introducedListRanges(source,LIST_INTRODUCERS,{semicolons:true})){
  const start=range.listStart,end=range.end-source.slice(start,range.end).match(/\s*$/)[0].length,text=source.slice(start,end);
  if(ctx.at(range.start)==='Heading'||ctx.at(start)==='Heading'||cutsOriginalSourceWord(doc,range.start)||cutsOriginalSourceWord(doc,end)||styleRangeBlocked(doc,range.start,end)||blocked(range.start,end))continue;
  const groups=text.split(';');if(groups.length<2)continue;
  const last=groups.at(-1),conjunction=/\s+and\s+/.exec(last);if(!conjunction)continue;
  const left=last.slice(0,conjunction.index),right=last.slice(conjunction.index+conjunction[0].length);
  if(!groups.slice(0,-1).every(valid)||!valid(left)||!valid(right))continue;
  const at=text.length-last.length+conjunction.index;
  const issueStart=start+at+conjunction[0].indexOf('and'),issueEnd=issueStart+3,suggestion='; and';
  const message='LCB places the final semicolon before the final “and” in grouped series containing commas. This explicitly introduced list already separates comparable item groups with semicolons; its final comma-containing group needs the same separator.';
  issues.push({start:issueStart,end:issueEnd,text:doc.text.slice(issueStart,issueEnd),suggestion,guideId:'lcb',guidePage:6,guidePrintedPage:references.lcb.pages[5].printedPage,rule:'Punctuation: Semicolons',category:'Grouped series',context:ctx.at(start),checkId:'semicolon-series',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:6,guidePrintedPage:references.lcb.pages[5].printedPage,rule:'Punctuation: Semicolons',preferred:suggestion,ruleText:message},{guideId:'gpo',guideName:'GPO Style Manual',guidePage:233,guidePrintedPage:references.gpo.pages[232].printedPage,rule:'8.148',preferred:suggestion,ruleText:'GPO 8.148 uses semicolons to separate clauses containing commas; its grouped example places a semicolon before the final and.'}]});
 }
 return issues;
}
