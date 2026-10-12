import {styleContext,styleRangeBlocked} from './style-context.mjs';
import {styleEvidenceGuard} from './style-evidence.mjs';
import {introducedListRanges,cutsOriginalSourceWord} from './style-introduced-lists.mjs';

import {punctuationListItemPhrase as listItemPhrase,splitListCommas,PUNCTUATION_LIST_INTRODUCERS as LIST_INTRODUCERS} from './style-list-phrases.mjs';

export function serialCommaIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const blocked=styleEvidenceGuard(doc,ctx);
 for(const range of introducedListRanges(source,LIST_INTRODUCERS+'|(?:required|eligible|covered)\\s+(?:documents|items|persons|entities|letters|figures|values|labels)\\s+are')){
  const list=source.slice(range.listStart,range.end).trimEnd(),offset=range.listStart;
  if(ctx.at(range.start)==='Heading'||ctx.at(offset)==='Heading'||cutsOriginalSourceWord(doc,range.start)||cutsOriginalSourceWord(doc,offset+list.length)||styleRangeBlocked(doc,range.start,offset+list.length)||blocked(range.start,offset+list.length))continue;
  const groups=splitListCommas(list);if(groups.length<2||groups.slice(0,-1).some(g=>!listItemPhrase(g,references.lcb)))continue;
  const last=groups.at(-1),joins=[...last.matchAll(/\s+(and|or|nor)\s+/g)].filter(join=>listItemPhrase(last.slice(0,join.index),references.lcb)&&listItemPhrase(last.slice(join.index+join[0].length),references.lcb));
  const geographic=joins.filter(join=>last.slice(join.index+join[0].length).trim()==='city and county');
  if(geographic.length===1)joins.splice(0,joins.length,geographic[0]);
  if(joins.length!==1)continue;
  const join=joins[0];
  const start=offset+list.length-last.length+join.index+join[0].indexOf(join[1]),end=start+join[1].length;
  const suggestion=', '+join[1];
  const message='LCB and GPO require a comma before the last conjunction in a series of at least three items. This explicitly introduced series contains recognized items; insert a comma before “'+join[1]+'”.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:6,guidePrintedPage:references.lcb.pages[5].printedPage,rule:'Punctuation: Commas',category:'Serial comma',context:ctx.at(start),checkId:'serial-commas',conflict:false,message,references:[
   {guideId:'lcb',guideName:'LCB Style Manual',guidePage:6,guidePrintedPage:references.lcb.pages[5].printedPage,rule:'Punctuation: Commas',preferred:suggestion,ruleText:'LCB uses a comma before and, or, or nor when these conjunctions precede the last of a series of three or more words, phrases, letters, or figures.'},
   {guideId:'gpo',guideName:'GPO Style Manual',guidePage:216,guidePrintedPage:references.gpo.pages[215].printedPage,rule:'8.46',preferred:suggestion,ruleText:'GPO 8.46 uses a comma after each member in a series of three or more words, phrases, letters, or figures used with and, or, or nor.'}
  ]});
 }
 return issues;
}
