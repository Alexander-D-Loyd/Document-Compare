import {styleContext,styleRangeBlocked} from './style-context.mjs';

// The finite three-point compass combinations apply GPO6.14's printed rule.
// Context establishes directional use; these are not proper-name rewrites.
const triples=[['north','north','east'],['east','north','east'],['east','south','east'],['south','south','east'],['south','south','west'],['west','south','west'],['west','north','west'],['north','north','west']];
const patterns=triples.map(parts=>({parts,pattern:new RegExp('(?<![\\p{L}\\p{N}_])'+parts.join('[\\s-]{0,300}')+'(?![\\p{L}\\p{N}_])','giu')}));
const beforeCue=/\b(?:turns?|flows?|faces?|points?|runs?|moves?|extends?|heads?|toward|towards)\s+(?:the\s+)?$/i;
const afterCue=/^\s+(?:bearing|direction|heading|orientation|course)\b/i;
export function threePointCompassCandidates(source){
 const candidates=[];
 for(const {parts,pattern}of patterns)for(const m of source.matchAll(pattern))candidates.push({start:m.index,end:m.index+m[0].length,value:m[0],preferred:parts[0]+'-'+parts.slice(1).join('')});
 return candidates.sort((a,b)=>a.start-b.start||b.end-a.end);
}
export function threePointCompassIssues(doc,reference){
 const ctx=styleContext(doc),source=ctx.source,issues=[],page=reference.pages.find(p=>/(?:^|\s)6\.14\.(?:\s|$)/.test(p.text));if(!page)return issues;
 const intact=(start,end)=>!styleRangeBlocked(doc,start,end)&&!ctx.literalAt(start,end)&&!doc.blocks.some(b=>b.start<end&&b.end>start&&ctx.tableAt(Math.max(b.start,start)));
 for(const c of threePointCompassCandidates(source)){
  if(ctx.at(c.start)==='Heading'||/[A-Z]/.test(c.value.slice(1)))continue;
  // More adjacent cardinal points make an unfamiliar expression. A suffix
  // cannot establish the intended compass bearing of the complete wording.
  if(/\b(?:north|south|east|west)[\s-]{1,300}$/i.test(source.slice(Math.max(0,c.start-320),c.start))||/^[\s-]{1,300}(?:north|south|east|west)\b/i.test(source.slice(c.end,c.end+320)))continue;
  // Preserve punctuation that may separate clauses rather than compass points.
  if(doc.blocks.some(b=>b.start<c.end&&b.end>c.start&&!b.ignored&&/[\u2012-\u2015]/.test(doc.text.slice(Math.max(b.start,c.start),Math.min(b.end,c.end)))))continue;
  const beginning=Math.max(0,c.start-120),before=beforeCue.exec(source.slice(beginning,c.start)),after=afterCue.exec(source.slice(c.end,c.end+400));
  const cues=[];if(before)cues.push({start:beginning+before.index,end:c.end});if(after)cues.push({start:c.start,end:c.end+after[0].length});
  if(!cues.some(r=>intact(r.start,r.end)))continue;
  const normalized=c.value.replace(/-[ \t]*\n\s*/g,'-').replace(/\s+/g,' ').trim();if(normalized.toLowerCase()===c.preferred)continue;
  const suggestion=/^[A-Z]/.test(c.value)?c.preferred[0].toUpperCase()+c.preferred.slice(1):c.preferred;
  issues.push({start:c.start,end:c.end,text:doc.text.slice(c.start,c.end),suggestion,rule:'6.14',category:'Compass compounding',message:'GPO closes the two-point component and places a hyphen after the first point in a three-point compass direction. The selected surrounding wording establishes directional use; confirm the intended bearing.',guidePage:page.page,guidePrintedPage:page.printedPage,checkId:'compass-directions'});
 }
 return issues;
}
