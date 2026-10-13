import {nounHeadPattern,nounPhraseEvidenceRanges} from './style-noun-heads.mjs';
import {styleContext,styleRangeBlocked} from './style-context.mjs';
const sources='board|county|city|state|school|community|family|employer|employee|worker|government|department|agency|taxpayer|contractor|manufacturer|operator|provider|university|student|industry';
const participles='funded|owned|operated|managed|controlled|sponsored|supported|financed|driven|led|tested|provided|maintained|directed|administered|regulated|licensed|chartered|certified';
const heads=nounHeadPattern;
const pattern=new RegExp('\\b((?:'+sources+')\\s+(?:'+participles+'))\\s+('+heads+')\\b','gi');
export function participleModifierIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const safe=(start,end)=>!styleRangeBlocked(doc,start,end)&&!ctx.literalAt(start,end)&&!doc.blocks.some(b=>b.start<end&&b.end>start&&ctx.tableAt(Math.max(b.start,start)));
 for(const m of source.matchAll(pattern)){
  const start=m.index,end=start+m[1].length,beforeStart=Math.max(0,start-65),headEnd=start+m[0].length,before=source.slice(beforeStart,start),after=source.slice(headEnd);
  if(ctx.at(start)==='Heading'||!safe(start,headEnd)||m[1]===m[1].toUpperCase()||/^[A-Z]/.test(m[2]))continue;
  // Do not turn the subject/verb/object statement "the county owned
  // properties" into an adjective. Require independent phrase evidence.
  const cue=nounPhraseEvidenceRanges(before,after).find(c=>safe(c.side==='before'?beforeStart+c.start:start,c.side==='after'?headEnd+c.end:headEnd));
  if(!cue)continue;
  const suggestion=m[1].replace(/\s+/g,'-');
  const message='LCB hyphenation item 1 generally joins a unit modifier before its noun, especially a participle. Here the phrase has '+(cue.side==='before'?'an explicit preceding object-introducing verb':'a separate following predicate')+'. The complete source/participle/noun and exact cue protect strikes, quotations, table rows and unknown ignored content; identified interior page heads retain body ranges. An ordinary subject/verb/object statement and open predicate phrases are preserved; unfamiliar heads and ambiguous clauses remain manual.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:8,guidePrintedPage:references.lcb.pages[7].printedPage,rule:'Hyphenation, item 1',category:'Participle modifier',context:ctx.at(start),checkId:'participle-modifiers',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:8,guidePrintedPage:references.lcb.pages[7].printedPage,rule:'Hyphenation, item 1',preferred:suggestion,ruleText:'LCB generally hyphenates words combined as a unit modifier immediately before the word modified, especially when one element is a present or past participle.'}]});
 }
 return issues;
}
