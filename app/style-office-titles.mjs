import {legislativeContext} from './legislative-context.mjs';
import {officeDefinitionContext} from './office-definition-context.mjs';
import {styleRangeBlocked} from './style-context.mjs';
export function officeTitleIssues(doc,references){
 const ctx=legislativeContext(doc),source=ctx.source,issues=[];
 const definitions=officeDefinitionContext(doc,ctx);
 const safe=(start,end)=>!styleRangeBlocked(doc,start,end)&&!ctx.literalAt(start,end)&&!doc.blocks.some(b=>b.start<end&&b.end>start&&ctx.tableAt(Math.max(b.start,start)));
 const add=(start,term,suggestion,rule,message)=>{
  const end=start+term.length;if(ctx.at(start)==='Heading'||term===term.toUpperCase()||!safe(start,end))return;
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:17,guidePrintedPage:'17',rule,category:'Contextual office capitalization',context:ctx.at(start),checkId:'office-titles',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:17,guidePrintedPage:references.lcb.pages[16].printedPage,rule,preferred:suggestion,ruleText:message}]});
 };
 for(const m of source.matchAll(/\b(?:the|a|an|each|every|any|this|that)\s+(Authority|Board\s+of\s+Supervisors|Commission|Department|Director|Trustee)(?=\s+(?:shall|must|may|will|would|could|can|is|are|was|were|has|have|does|do|and|or)\b|\s*[.,;:)])/gi)){
  const cue=/^\s*(?:(?:shall|must|may|will|would|could|can|is|are|was|were|has|have|does|do|and|or)\b|[.,;:)])/.exec(source.slice(m.index+m[0].length));if(!cue||!safe(m.index,m.index+m[0].length+cue[0].length))continue;
  const term=m[1],start=m.index+m[0].lastIndexOf(term);if(term===term.toLowerCase()||definitions.isDefined(term,start))continue;
  const sentence=ctx.sentenceAt(start),before=source.slice(sentence.start,start).trim();if(!before)continue;
  add(start,term,term.toLowerCase().replace(/\s+/g,' '),'Capitalization, item 3','LCB lowercases standalone office/entity words. A following verb or clause boundary makes this a standalone use; complete names and explicitly defined quoted terms are protected.');
 }
 for(const m of source.matchAll(/\b(?:the|a|an|each|every|any|this|that)\s+(superintendent)(?=\s+(?:shall|must|may|will|is|has|does)\b)/gi)){
  const cue=/^\s+(?:shall|must|may|will|is|has|does)\b/.exec(source.slice(m.index+m[0].length));if(!cue||!safe(m.index,m.index+m[0].length+cue[0].length))continue;
  if(m[1]!==m[1].toLowerCase())continue;
  const start=m.index+m[0].lastIndexOf(m[1]),section=ctx.sections.find(s=>s.start<=start&&s.end>start);
  if(!section||section.kind!=='Codified'||!definitions.isPublicSuperintendent(start))continue;
  add(start,m[1],'Superintendent','Capitalization, item 3: Education Code exception','LCB capitalizes Superintendent in an Education Code provision when it refers to the Superintendent of Public Instruction. An intact definition in this amended section, or an adjoining explicit this-code definition for the Education Code, establishes that referent. Local conflicting definitions, unresolved wider scopes, other codes, county/district modifiers and unknown referents are not inferred.');
 }
 return issues.sort((a,b)=>a.start-b.start);
}
