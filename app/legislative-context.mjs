import {styleContext} from './style-context.mjs';
export function legislativeContext(doc){
 const ctx=styleContext(doc),source=ctx.source;
 const resolution=/\b(?:ASSEMBLY|SENATE)\s+(?:(?:CONCURRENT|JOINT)\s+)?RESOLUTION\b/.test(source.slice(0,6000));
 const labels=[...source.matchAll(/^[ \t]*(?:SECTION|SEC\.)\s+\d+(?:\.\d+)?\.\s*/gm)];
 const sections=labels.map((m,index)=>{
  const start=m.index,end=labels[index+1]?.index??source.length,intro=source.slice(start+m[0].length,Math.min(end,start+m[0].length+700)).replace(/\s+/g,' ');
  const codified=/^(?:Section|Sections|Article|Chapter|Part|Division)\b.{0,350}?\b(?:of|to)\s+the\s+.{0,100}?\bCode\b.{0,120}?\b(?:amended|added|repealed)\b/.test(intro);
  const findings=/^(?:The\s+)?Legislature\s+(?:hereby\s+)?finds\s+and\s+declares\b/i.test(intro);
  return {start,end,kind:codified?'Codified':findings?'UncodifiedFindings':'Unknown',intro};
 });
 return {...ctx,sections,moneyAt(offset){
  const base=ctx.at(offset);if(base==='Heading'||base==='Digest')return base;
  if(resolution)return 'Resolution';
  let lo=0,hi=sections.length;while(lo<hi){const mid=(lo+hi)>>1;if(sections[mid].start<=offset)lo=mid+1;else hi=mid;}
  const section=sections[lo-1];return section&&section.end>offset?section.kind:'Unknown';
 }};
}
