import {legislativeContext} from './legislative-context.mjs';
export function officeTitleIssues(doc,references){
 const ctx=legislativeContext(doc),source=ctx.source,issues=[];
 const quoted=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const definitions=new Set([...source.matchAll(/(?:“([^”]+)”|"([^"\n]+)")\s+means\b/g)].map(m=>m[1]||m[2]));
 const publicSuperintendent=/(?:“superintendent”|"superintendent"|\bsuperintendent)\s+means\s+(?:the\s+)?Superintendent\s+of\s+Public\s+Instruction\b/i.test(source);
 const add=(start,term,suggestion,rule,message)=>{
  const end=start+term.length;if(ctx.at(start)==='Heading'||ctx.tableAt(start)||term===term.toUpperCase()||[...(doc.struck||[]),...doc.blocks.filter(b=>b.ignored).map(b=>({start:b.start,end:b.end})),...quoted].some(r=>r.start<end&&r.end>start))return;
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:17,guidePrintedPage:'17',rule,category:'Contextual office capitalization',context:ctx.at(start),checkId:'office-titles',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:17,guidePrintedPage:references.lcb.pages[16].printedPage,rule,preferred:suggestion,ruleText:message}]});
 };
 for(const m of source.matchAll(/\b(?:the|a|an|each|every|any|this|that)\s+(Authority|Board\s+of\s+Supervisors|Commission|Department|Director|Trustee)(?=\s+(?:shall|must|may|will|would|could|can|is|are|was|were|has|have|does|do|and|or)\b|\s*[.,;:)])/gi)){
  const term=m[1];if(term===term.toLowerCase()||definitions.has(term.replace(/\s+/g,' ')))continue;
  const start=m.index+m[0].lastIndexOf(term),sentence=ctx.sentenceAt(start),before=source.slice(sentence.start,start).trim();if(!before)continue;
  add(start,term,term.toLowerCase().replace(/\s+/g,' '),'Capitalization, item 3','LCB lowercases standalone office/entity words. A following verb or clause boundary makes this a standalone use; complete names and explicitly defined quoted terms are protected.');
 }
 for(const m of source.matchAll(/\b(?:the|a|an|each|every|any|this|that)\s+(superintendent)(?=\s+(?:shall|must|may|will|is|has|does)\b)/gi)){
  if(!publicSuperintendent||m[1]!==m[1].toLowerCase())continue;
  const start=m.index+m[0].lastIndexOf(m[1]),section=ctx.sections.find(s=>s.start<=start&&s.end>start);
  if(!section||section.kind!=='Codified'||!section.intro.includes('Education Code'))continue;
  add(start,m[1],'Superintendent','Capitalization, item 3: Education Code exception','LCB capitalizes Superintendent in an Education Code provision when it refers to the Superintendent of Public Instruction. This document explicitly defines that referent. County/district modifiers and unknown referents are not inferred.');
 }
 return issues.sort((a,b)=>a.start-b.start);
}
