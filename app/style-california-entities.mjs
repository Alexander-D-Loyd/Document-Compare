import {createBoundedRegistryMatcher}from './bounded-registry-matcher.mjs';
import {CALIFORNIA_ENTITIES} from './data/california-entities.mjs';
import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {selectedEntityAuthority}from './style-selected-entity-authority.mjs';
import {entityNameBoundaryBlocked}from './style-entity-name-boundaries.mjs';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const fold=s=>s.replace(/[’‘]/g,"'").replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim();
export {CALIFORNIA_ENTITIES};
// Match both a genuine compound hyphen retained at a line ending and a
// discretionary word division. The complete registry token sequence decides
// which reading is eligible; no source text or authoritative spelling changes.
function nameSources(source,doc){
 const gaps=[...source.matchAll(/(?<=\p{L})-[ \t]*\n\s*(?=\p{L})/gu)].filter(m=>!(doc.struck||[]).some(r=>r.start<m.index+m[0].length&&r.end>m.index));
 if(!gaps.length)return [{text:source,offset:i=>i}];
 return [true,false].map(keepHyphen=>{
  const chunks=[],shifts=[];let cursor=0,length=0,removed=0;
  for(const m of gaps){const chunk=source.slice(cursor,m.index)+(keepHyphen?'-':'');chunks.push(chunk);length+=chunk.length;removed+=m[0].length-(keepHyphen?1:0);shifts.push({at:length,removed});cursor=m.index+m[0].length;}
  chunks.push(source.slice(cursor));
  const offset=(index,end=false)=>{let lo=0,hi=shifts.length;while(lo<hi){const mid=(lo+hi)>>1;if(end?shifts[mid].at<index:shifts[mid].at<=index)lo=mid+1;else hi=mid;}return index+(lo?shifts[lo-1].removed:0);};
  return {text:chunks.join(''),offset};
 });
}
export function californiaEntityReview(doc,references,{entityAuthority=null}={}){
 const selected=selectedEntityAuthority(entityAuthority),entries=selected.entries.filter(e=>e.checkEligible).sort((a,b)=>b.name.length-a.name.length);
 if(!entries.length)return {issues:[],ranges:[]};
 const byName=new Map(entries.map(e=>[fold(e.name).toLowerCase(),e])),matcher=createBoundedRegistryMatcher(entries.map(e=>fold(e.name).split(/\s+/).map(w=>escape(w).replace(/'/g,"[’']")).join('\\s+')),{prefix:'(?<![\\p{L}\\p{N}_])',suffix:'(?![\\p{L}\\p{N}_])'});
 const ctx=styleContext(doc),source=ctx.source,original=originalBodyStyleContext(doc)?.source||source,issues=[],ranges=[];
 // A registry identity requires the entire original body name. Masked source
 // content is not evidence of whitespace: only printed margin prefixes and
 // explicitly identified, wholly interior running heads may be bridged.
 const evidenceBlocked=styleEvidenceGuard(doc,ctx);
 const candidates=[];
 for(const view of nameSources(source,doc))for(const m of matcher.matchAll(view.text))candidates.push({m,start:view.offset(m.index),end:view.offset(m.index+m[0].length,true)});
 candidates.sort((a,b)=>a.start-b.start||b.end-a.end);
 for(const {m,start,end} of candidates){
  if(ranges.some(r=>r.start<end&&r.end>start))continue;
  const e=byName.get(fold(m[0]).toLowerCase()),after=source.slice(end,end+250).replace(/(?<=\p{L})-[ \t]*\n\s*(?=\p{L})/gu,'');
  if(!e||evidenceBlocked(start,end)||ctx.literalAt(start,end)||ctx.at(start)==='Heading'||m[0]===m[0].toUpperCase())continue;
  // Masking a source affix cannot turn a technical identifier into a complete
  // official name. Check the negative original evidence at both endpoints.
  if(cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||entityNameBoundaryBlocked(doc.text,source,original,start,end))continue;
  // An adjoining title word may mean this is a longer, different name.
  if(/^\s+(?:(?:of|for|the|and|in|on)\s+)?[A-Z][a-z]/.test(after))continue;
  if(/^\s+(?:advisory\s+)?(?:committee|commission|board|foundation|association|program)\b/.test(after))continue;
  ranges.push({start,end,name:e.name});
  if(fold(m[0])===fold(e.name))continue;
  const suggestion=e.name.replace(/[’‘']/g,m[0].includes('’')?'’':"'");
  const message='LCB page 17 item 7 requires checking the California Entities list. This complete token sequence matches the user-supplied export, whose listed capitalization is '+e.name+'. '+(e.citation?'Source citation: '+e.citation+'. ':'')+'Only capitalization of identified complete names is checked. Unlisted names, substantive wording differences, short office titles, templates, longer names and changes in legal status require review; absence from this snapshot is not an error.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:17,guidePrintedPage:references.lcb.pages[16].printedPage,rule:'Capitalization, item 7: California Entities',category:'Official entity name',context:ctx.at(start),checkId:'california-entities',conflict:false,message,entitySource:{...(selected.kind==='imported'?selected.source:{file:selected.source.file,sha256:selected.source.sha256}),category:e.category,citation:e.citation},references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:17,guidePrintedPage:references.lcb.pages[16].printedPage,rule:'Capitalization, item 7',preferred:e.name,ruleText:message}]});
 }
 return {issues,ranges};
}
