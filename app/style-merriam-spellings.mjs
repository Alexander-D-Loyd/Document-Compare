import {styleContext} from './style-context.mjs';
// User-selected authority: Merriam-Webster. These small, source-verified
// preference records are bundled; document review never performs a lookup.
// Both spellings are valid English. This is an office preference under LCB
// page 2, not a spelling-error claim or a complete dictionary installation.
export const MERRIAM_FIRST_SPELLINGS={
 authority:'Merriam-Webster.com Dictionary',verified:'2026-10-09',
 sourceUrl:'https://www.merriam-webster.com/dictionary/gray',
 forms:[['grey','gray'],['greyed','grayed'],['greying','graying'],['greys','grays']],
 scope:'Only explicit color/paint/fabric/background/hair adjective or hair-color verb contexts. Names, quoted spellings, scientific units, tables, headings and unknown meanings remain protected.'
};
export function merriamSpellingIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 for(const [variant,preferred] of MERRIAM_FIRST_SPELLINGS.forms)for(const m of source.matchAll(new RegExp('\\b'+variant+'\\b','g'))){
  const start=m.index,end=start+m[0].length,before=source.slice(Math.max(0,start-60),start),after=source.slice(end,end+70);
  if(ctx.at(start)==='Heading'||ctx.literalAt(start,end)||ctx.tableAt(start))continue;
  const adjective=variant==='grey'&&/^\s+(?:color|colour|paint|fabric|background|hair)\b/.test(after);
  const verb=variant!=='grey'&&(/\bhair\s+(?:is|was|has|had|are|were)\s+$/.test(before)||/\bhair\s+$/.test(before));
  if(!adjective&&!verb)continue;
  const message='LCB page 2 prefers the first-listed spelling when the selected dictionary is the authority. Merriam-Webster lists gray first and grey as a less common variant; its verb forms put grayed/graying/grays first. This explicit color or hair context uses that bundled preference. Grey remains valid English; this is a style preference. The verified subset is not the complete dictionary. No online lookup occurs during document review.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion:preferred,guideId:'lcb',guidePage:2,guidePrintedPage:references.lcb.pages[1].printedPage,rule:'Spelling and usage, item 2: Merriam-Webster first spelling',category:'Dictionary spelling preference',context:ctx.at(start),checkId:'merriam-first-spelling',conflict:false,message,dictionarySource:MERRIAM_FIRST_SPELLINGS,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:2,guidePrintedPage:references.lcb.pages[1].printedPage,rule:'Spelling and usage, item 2',preferred,ruleText:message+' Verified dictionary entry: '+MERRIAM_FIRST_SPELLINGS.sourceUrl}]});
 }
 return issues;
}
