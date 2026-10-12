import {styleRangeBlocked} from './style-context.mjs';
import {legislativeContext} from './legislative-context.mjs';
import {officeDefinitionContext} from './office-definition-context.mjs';
export const LCB_LOCAL_DESCRIPTIONS=[
 {page:18,preferred:'controller',entryText:'controller (local)'},
 {page:20,preferred:'treasurer',entryText:'treasurer (local)'},
 {page:18,preferred:'court',entryText:'court (appearing alone)'},
];
const predicate='(?:shall|must|may|will|is|are|was|were|has|have|does|do|retains?|issues?|reviews?)';
const localQualifier="(?:(?:city|county|district)(?:[’']s)?|(?:cities|counties|districts)[’']|municipal|municipality[’']s|municipalities[’'])";
const determiner='(?:the|a|an|any|each|every|this|that)';
const localFundsAndCourts=[{page:19,entryText:'general fund (county)'},{page:18,entryText:'court of appeals or courts of appeals (U.S.)'}];
export function localOfficeIssues(doc,references){
 const ctx=legislativeContext(doc),source=ctx.source,issues=[],definitions=officeDefinitionContext(doc,ctx),seen=new Set();
 const safe=(start,end)=>!styleRangeBlocked(doc,start,end)&&!ctx.literalAt(start,end)&&!doc.blocks.some(b=>b.start<end&&b.end>start&&ctx.tableAt(Math.max(start,b.start)));
 const emit=(start,term,row,message,gpoPage)=>{
  const end=start+term.length,preferred=term.toLowerCase(),key=start+':'+end;
  if(term===preferred||term===term.toUpperCase()||ctx.at(start)==='Heading'||definitions.isDefined(term,start)||seen.has(key))return;
  const prefix=source.slice(ctx.sentenceAt(start).start,start).replace(/^[\s“”"’']*(?:\([a-z\d]+\)\s*)*/i,'').trim();if(!prefix)return;
  const cites=[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:row.page,guidePrintedPage:references.lcb.pages[row.page-1].printedPage,rule:row.entryText,preferred,ruleText:message}];
  if(gpoPage)cites.push({guideId:'gpo',guideName:'GPO Style Manual',guidePage:gpoPage,guidePrintedPage:references.gpo.pages[gpoPage-1].printedPage,rule:row.preferred==='court'?'Capitalization examples: Court':'3.37',preferred,ruleText:message});
  seen.add(key);issues.push({start,end,text:doc.text.slice(start,end),suggestion:preferred,guideId:'lcb',guidePage:row.page,guidePrintedPage:references.lcb.pages[row.page-1].printedPage,rule:'Capitalization examples: '+row.entryText,category:'Contextual descriptive capitalization',context:ctx.at(start),checkId:'lcb-local-descriptions',conflict:false,message,references:cites});
 };
 for(const row of LCB_LOCAL_DESCRIPTIONS){
  const pattern=new RegExp('\\b'+row.preferred+'s?\\b','gi');
  for(const m of source.matchAll(pattern)){
   const start=m.index,end=start+m[0].length,before=source.slice(Math.max(0,start-160),start),after=source.slice(end,end+200),finite=new RegExp('^\\s+'+predicate+'\\b','i').exec(after);
   const jurisdiction=new RegExp('\\b'+localQualifier+'\\s+$').exec(before),genericCourt=row.preferred==='court'?/\b(?:a|an|any|each|every)\s+$/i.exec(before):null;
   const standalone=new RegExp('\\b'+determiner+'\\s+$','i').exec(before),postLocal=row.preferred!=='court'&&standalone?new RegExp('^\\s+(?:of|for)\\s+(?:'+determiner+'\\s+)?(?:city|cities|county|counties|municipality|municipalities|district|districts)\\s+'+predicate+'\\b').exec(after):null;
   const witness=finite&&(jurisdiction||genericCourt),evidenceStart=witness?start-before.length+witness.index:postLocal?start-before.length+standalone.index:null,evidenceEnd=finite&&witness?end+finite[0].length:postLocal?end+postLocal[0].length:null;
   if(evidenceStart===null||!safe(evidenceStart,evidenceEnd))continue;
   const message=row.preferred==='court'?'LCB lowercases generic court/courts appearing alone. A nondefinite determiner or explicit lowercase local jurisdiction and finite predicate identify this common noun. Named courts, definite unresolved short titles, literal names and source-defined aliases remain protected.':'LCB lowercases this generic local office noun, including its ordinary plural. An explicit lowercase local qualifier/possessive, or an adjoining of/for jurisdiction complement after a determiner, and finite predicate identify the local role. Personal titles, source-defined aliases, extended names and unresolved state/federal officials remain protected.';
   emit(start,m[0],row,message,row.preferred==='court'?70:52);
  }
 }
 const coordinated=new RegExp('\\b('+localQualifier+')\\s+(Controllers?|Treasurers?)\\s+(?:and|or)\\s+(Controllers?|Treasurers?)\\s+'+predicate+'\\b','gi');
 for(const m of source.matchAll(coordinated)){
  if(m[1]!==m[1].toLowerCase()||!safe(m.index,m.index+m[0].length))continue;
  const first=m.index+m[0].indexOf(m[2],m[1].length),second=m.index+m[0].lastIndexOf(m[3]);
  for(const [start,term]of [[first,m[2]],[second,m[3]]]){
   const row=LCB_LOCAL_DESCRIPTIONS.find(r=>term.toLowerCase().startsWith(r.preferred));
   emit(start,term,row,'LCB lowercases generic local office nouns. The explicitly shared lowercase jurisdiction or possessive, coordinated controller/treasurer roles and finite predicate supply the complete context. Separate determiners, named officers, state/federal qualifiers, source-defined aliases and unfamiliar coordination remain protected.',52);
  }
 }
 for(const row of localFundsAndCourts){
  const pattern=row.page===19?/\bgeneral\s+fund\b/gi:/\bcourts?\s+of\s+appeals\b/gi;
  for(const m of source.matchAll(pattern)){
   const start=m.index,end=start+m[0].length,before=source.slice(Math.max(0,start-80),start),after=source.slice(end,end+150),preferred=m[0].replace(/\s+/g,' ').toLowerCase();
   if(m[0].replace(/\s+/g,' ')===preferred||m[0]===m[0].toUpperCase()||ctx.at(start)==='Heading')continue;
   // Explicit ownership or a nondefinite jurisdiction qualifier resolves
   // the generic sense without rewriting complete official names.
   const qualified=row.page===19?/\b(?:the|a|each|any)\s+county(?:’s|'s)?\s+$/i.exec(before):/\b(?:a|an|any|each|every)\s+federal\s+$/i.exec(before),finite=new RegExp('^\\s+'+predicate+'\\b','i').exec(after);
   if(!qualified||!finite||!safe(start-before.length+qualified.index,end+finite[0].length))continue;
   const message=row.page===19?'LCB lowercases the county general fund. An explicit county ownership qualifier and finite predicate identify this generic fund; state funds, named funds and unresolved ownership remain protected.':'LCB lowercases generic U.S. court of appeals/courts of appeals. A nondefinite determiner, federal qualifier and finite predicate identify a generic court, consistent with GPO generic court-of-appeals examples. Complete court names, circuits and unresolved jurisdictions remain protected.';
   issues.push({start,end,text:doc.text.slice(start,end),suggestion:preferred,guideId:'lcb',guidePage:row.page,guidePrintedPage:references.lcb.pages[row.page-1].printedPage,rule:'Capitalization examples: '+row.entryText,category:'Contextual descriptive capitalization',context:ctx.at(start),checkId:'lcb-local-descriptions',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:row.page,guidePrintedPage:references.lcb.pages[row.page-1].printedPage,rule:row.entryText,preferred,ruleText:message}]});
  }
 }
 return issues.sort((a,b)=>a.start-b.start);
}
