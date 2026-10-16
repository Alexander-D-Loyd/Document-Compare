import {styleContext} from './style-context.mjs';
import {legislativeContext} from './legislative-context.mjs';
import {styleEvidenceGuard,originalBodyStyleContext,cutsOriginalStyleWord} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {compoundSourceBoundaryBlocked} from './style-compound-source-boundaries.mjs';

// A mention in the newly enacted body does not identify the code being amended.
// Keep the existing codified-section role, then require the actual finite
// operative target and its full original source evidence independently.
const unit='(?:Section|Sections|Article|Chapter|Part|Division)';
const id='(?:[0-9]+(?:\\.[0-9]+)*(?:\\([A-Za-z0-9]+\\))*|[IVXLCDM]+|[A-Za-z])';
const ids=id+'(?:\\s*(?:,|and|to|through)\\s*'+id+')*';
const reference=unit+'\\s+'+ids+'(?:\\s*\\(commencing\\s+with\\s+Section\\s+'+id+'\\))?';
const chain=reference+'(?:\\s+of\\s+'+reference+')*';
const code='the\\s+Commercial\\s+Code';
const immediately='(?:,?\\s*immediately\\s+(?:following|preceding)\\s+'+reference+')?';
const patterns=[
 new RegExp('^'+chain+'\\s+of\\s+'+code+'\\s+(?:is|are)\\s+(?:amended|repealed\\s+and\\s+added|repealed\\s+and\\s+reenacted)\\s+to\\s+read\\s*:','iu'),
 new RegExp('^'+chain+'\\s+(?:is|are)\\s+added\\s+to\\s+(?:'+chain+'\\s+of\\s+)?'+code+immediately+',?\\s+to\\s+read\\s*:','iu'),
];
const labels=source=>[...source.matchAll(/^[ \t]*(?:SECTION|SEC\.)\s+\d+(?:\.\d+)?\.\s*/gm)].map(m=>({start:m.index+m[0].search(/\S/u),bodyStart:m.index+m[0].length}));
function introduction(source,label,limit){
 const raw=source.slice(label.bodyStart,limit);
 for(const pattern of patterns){const m=pattern.exec(raw);if(m)return {start:label.start,end:label.bodyStart+m[0].length};}
 return null;
}
export function commercialCodeSectionWitnesses(doc,ctx=styleContext(doc)){
 const source=ctx.source,originalContext=originalBodyStyleContext(doc),original=originalContext?.source||source,blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),originalLabels=labels(original),sourceLabels=labels(source),codified=legislativeContext(doc).sections.filter(s=>s.kind==='Codified'),out=[];
 for(let index=0;index<sourceLabels.length;index++){
  const label=sourceLabels[index],section=codified.find(s=>s.start<=label.start&&s.end>label.start);if(!section)continue;
  const originalIndex=originalLabels.findIndex(r=>r.start===label.start&&r.bodyStart===label.bodyStart);if(originalIndex<0)continue;
  const end=Math.min(section.end,sourceLabels[index+1]?.start??source.length,originalLabels[originalIndex+1]?.start??source.length),intro=introduction(source,label,end),prior=introduction(original,originalLabels[originalIndex],end);
  if(!intro||!prior||intro.start!==prior.start||intro.end!==prior.end||ctx.at(intro.start)==='Heading'||blocked(intro.start,intro.end)||literal(intro.start,intro.end)||originalContext?.literalAt(intro.start,intro.end)||cutsOriginalStyleWord(doc,intro.start)||cutsOriginalStyleWord(doc,intro.end)||compoundSourceBoundaryBlocked(doc.text,source,original,intro.start,intro.end))continue;
  out.push({start:label.start,end,sectionContext:{start:intro.start,end:intro.end,kind:'operative-code-target',code:'Commercial Code'}});
 }
 return out;
}
