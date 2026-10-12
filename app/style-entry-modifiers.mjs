import {styleContext,styleRangeBlocked} from './style-context.mjs';
import {lcbModifierForms} from './lcb-contextual.mjs';
import {modifierChainHeadMatcher} from './style-listed-modifier-heads.mjs';
import {participialModifierEvidenceRanges} from './style-participial-modifier-evidence.mjs';
// Independently observed SB79 housing wording supplies a selected nominal
// interpretation of entry level. This applies the general modifier principle,
// not a claim that either manual lists entry-level as a dictionary spelling.
const heads=/^(?:jobs?|positions?|employees?|workers?|personnel|staff|housing|programs?|training|requirements?|salaries|salary)$/i;
const qualifiedPreposition=/\b(?:for|of|with|in|within)\s+(?:(?:attached|detached|affordable|residential)\s+)?$/i;
export function entryModifierIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,matchHead=modifierChainHeadMatcher(lcbModifierForms(references.lcb)),issues=[];
 const safe=(start,end)=>!styleRangeBlocked(doc,start,end)&&!ctx.literalAt(start,end)&&!doc.blocks.some(b=>b.start<end&&b.end>start&&ctx.tableAt(Math.max(b.start,start)));
 for(const m of source.matchAll(/\bentry[\s-]{1,300}level\b/gi)){
  const end=m.index+m[0].length,head=matchHead(source.slice(end));if(!head||!heads.test(head.head))continue;
  const headEnd=end+head[0].length,beforeStart=Math.max(0,m.index-300),before=source.slice(beforeStart,m.index);
  if(ctx.at(m.index)==='Heading'||m[0]===m[0].toUpperCase()||/\b[A-Z][a-z]+[\s-]+[A-Z][a-z]+/.test(source.slice(m.index,headEnd))||!safe(m.index,headEnd))continue;
  // Preserve ordinary clause dashes; identified page heads are already masked.
  if(doc.blocks.some(b=>!b.ignored&&b.start<end&&b.end>m.index&&/[\u2012-\u2015]/.test(doc.text.slice(Math.max(m.index,b.start),Math.min(end,b.end)))))continue;
  const cues=participialModifierEvidenceRanges(before,source.slice(headEnd)),qualified=qualifiedPreposition.exec(before);
  if(qualified)cues.push({side:'before',start:qualified.index,end:qualified.index+qualified[0].length});
  if(!cues.some(c=>safe(c.side==='before'?beforeStart+c.start:m.index,c.side==='after'?headEnd+c.end:headEnd)))continue;
  if(m[0].replace(/-[ \t]*\n\s*/g,'-').replace(/\s+/g,' ').toLowerCase()==='entry-level')continue;
  const suggestion=/^[A-Z]/.test(m[0])?'Entry-level':'entry-level';
  const refs=[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:8,guidePrintedPage:'8',rule:'Hyphenation, item 1',preferred:suggestion,ruleText:'LCB generally hyphenates words combined as a unit modifier immediately before the word modified.'},{guideId:'gpo',guideName:'GPO Style Manual',guidePage:114,guidePrintedPage:'100',rule:'6.15',preferred:suggestion,ruleText:'GPO generally hyphenates a unit modifier immediately before the word modified;6.16 cautions against unnecessary combinations.'}];
  issues.push({start:m.index,end,text:doc.text.slice(m.index,end),suggestion,guideId:'lcb',guidePage:8,guidePrintedPage:'8',rule:refs[0].rule,category:'Modifier hyphenation',context:ctx.at(m.index),checkId:'entry-modifier',conflict:false,references:refs,message:'“Entry level” modifies a selected employment, training or housing noun, directly or through up to two source-listed modifiers. Review “entry-level” under the shared unit-modifier principle. Unfamiliar meanings and official names remain manual.'});
 }
 return issues;
}
