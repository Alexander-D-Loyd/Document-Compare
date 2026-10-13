import {styleContext,styleRangeBlocked} from './style-context.mjs';
export function legislativeContext(doc){
 const ctx=styleContext(doc),source=ctx.source;
 const resolution=/\b(?:ASSEMBLY|SENATE)\s+(?:(?:CONCURRENT|JOINT)\s+)?RESOLUTION\b/.test(source.slice(0,6000));
 const labels=[...source.matchAll(/^[ \t]*(?:SECTION|SEC\.)\s+\d+(?:\.\d+)?\.\s*/gm)];
 const sections=labels.map((m,index)=>{
  const start=m.index,end=labels[index+1]?.index??source.length,intro=source.slice(start+m[0].length,Math.min(end,start+m[0].length+700)).replace(/\s+/g,' ');
  const afterLabel=start+m[0].length,raw=source.slice(afterLabel,Math.min(end,afterLabel+1600));
  // A common introduction places "is added" before its target code. Keep
  // the complete explicit to-read directive as the evidence; a code mention
  // or an added nonstatutory program section is insufficient.
  const added=/^(?:Section|Sections|Article|Chapter|Part|Division)\b[\s\S]{0,350}?\b(?:is|are)\s+added\s+to\b[\s\S]{0,800}?\bCode(?:\s+of\s+Civil\s+Procedure)?\s*(?:,\s*immediately\s+(?:following|preceding)\s+(?:Section|Article|Chapter|Part|Division)\s+\d+(?:\.\d+)*(?:\([A-Za-z0-9]+\))*\s*)?,?\s*to\s+read\s*:/i.exec(raw);
  const addedEnd=added?afterLabel+added[0].length:afterLabel;
  const validAdded=added&&!styleRangeBlocked(doc,afterLabel,addedEnd)&&!ctx.literalAt(afterLabel,addedEnd)&&!doc.blocks.some(b=>b.start<addedEnd&&b.end>afterLabel&&ctx.tableAt(Math.max(b.start,afterLabel)));
  const codified=validAdded||/^(?:Section|Sections|Article|Chapter|Part|Division)\b.{0,350}?\b(?:of|to)\s+the\s+.{0,100}?\bCode\b.{0,120}?\b(?:amended|added|repealed)\b/.test(intro);
  const findingDirective=/^\s*(?:\([A-Za-z0-9]+\)\s*)*(?:The\s+)?Legislature\s+(?:hereby\s+)?finds\s+and\s+declares\b/i.exec(raw),findingEnd=findingDirective?afterLabel+findingDirective[0].length:afterLabel;
  const findings=findingDirective&&!styleRangeBlocked(doc,afterLabel,findingEnd)&&!ctx.literalAt(afterLabel,findingEnd)&&!doc.blocks.some(b=>b.start<findingEnd&&b.end>afterLabel&&ctx.tableAt(Math.max(b.start,afterLabel)));
  return {start,end,kind:codified?'Codified':findings?'UncodifiedFindings':'Unknown',intro};
 });
 return {...ctx,sections,moneyAt(offset){
  const base=ctx.at(offset);if(base==='Heading'||base==='Digest')return base;
  if(resolution)return 'Resolution';
  let lo=0,hi=sections.length;while(lo<hi){const mid=(lo+hi)>>1;if(sections[mid].start<=offset)lo=mid+1;else hi=mid;}
  const section=sections[lo-1];return section&&section.end>offset?section.kind:'Unknown';
 }};
}
