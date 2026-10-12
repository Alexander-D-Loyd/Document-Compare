import {styleContext} from './style-context.mjs';
// Identify only an explicitly introduced California constitutional provision.
// A bill merely mentioning the Constitution is not constitutional body text.
export function constitutionalBodyRanges(doc){
 const ctx=styleContext(doc),source=ctx.source;
 const header=/^[ \t]*(?:ASSEMBLY|SENATE)\s+CONSTITUTIONAL\s+AMENDMENT(?:\s+(?:No\.?\s*)?\d+)?[ \t]*(?:\n|$)/im.exec(source.slice(0,6000));
 if(!header||ctx.literalAt(header.index,header.index+header[0].length))return [];
 const labels=[...source.matchAll(/^[ \t]*(?:SECTION|SEC\.)\s+\d+(?:\.\d+)?\.\s*/gm)],ranges=[];
 for(let n=0;n<labels.length;n++){
  const label=labels[n],end=labels[n+1]?.index??source.length,intro=source.slice(label.index,Math.min(end,label.index+1200));
  const m=/\b(?:California\s+Constitution|Constitution\s+of\s+(?:the\s+State\s+of\s+)?California)\s+is\s+(?:amended|added)\s+to\s+read\s*:/i.exec(intro);
  if(!m||ctx.literalAt(label.index+m.index,label.index+m.index+m[0].length))continue;
  ranges.push({start:label.index+m.index+m[0].length,end});
 }
 return ranges;
}
export function constitutionalStateIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,ranges=constitutionalBodyRanges(doc),issues=[];
 if(!ranges.length)return issues;
 for(const m of source.matchAll(/\b(?:the|this|that)\s+(?<term>state)(?=\s+(?:shall|must|may|will|is|was|has|does|can)\b)/gi)){
  const start=m.index+m[0].lastIndexOf(m.groups.term),end=start+m.groups.term.length;
  if(m.groups.term!=='state'||!ranges.some(r=>r.start<=start&&r.end>=end)||ctx.literalAt(start,end)||ctx.tableAt(start))continue;
  const message='LCB page 20 capitalizes State as a noun in the body of the Constitution. This source is explicitly headed as a constitutional amendment and this section introduces California constitutional text to read. A determiner and following finite verb identify the noun. GPO 3.20 agrees for a definite state as a political subdivision. Digest text, adjective uses, ordinary bills and unresolved provision boundaries remain protected.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion:'State',guideId:'lcb',guidePage:20,guidePrintedPage:references.lcb.pages[19].printedPage,rule:'Capitalization examples: Constitutional body noun',category:'Constitutional capitalization',context:'Constitution',checkId:'constitutional-state',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:20,guidePrintedPage:references.lcb.pages[19].printedPage,rule:'Capitalization examples: State (n., body of Const.)',preferred:'State',ruleText:message},{guideId:'gpo',guideName:'GPO Style Manual',guidePage:46,guidePrintedPage:references.gpo.pages[45].printedPage,rule:'3.20',preferred:'State',ruleText:'GPO capitalizes State for a definite political subdivision of first rank.'}]});
 }
 return issues;
}
export function constitutionalBudgetIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,ranges=constitutionalBodyRanges(doc),issues=[];
 if(!ranges.length)return issues;
 for(const m of source.matchAll(/\b(?:a|an|any|each|every)\s+(?<term>budget\s+bill)(?=\s+(?:shall|must|may|will|is|was|has)\b)/gi)){
  const start=m.index+m[0].lastIndexOf(m.groups.term),end=start+m.groups.term.length;
  if(m.groups.term.replace(/\s+/g,' ')==='budget bill'||m.groups.term===m.groups.term.toUpperCase()||!ranges.some(r=>r.start<=start&&r.end>=end)||ctx.literalAt(start,end)||ctx.tableAt(start))continue;
  const message='LCB explicitly uses budget bill in lowercase in constitutional text. This occurrence is inside an expressly introduced California constitutional provision; a nondefinite determiner and finite predicate identify a generic legislative instrument rather than a specific named bill. GPO common-noun/proper-name distinctions agree for this generic use. Ordinary bills, digest text, named Budget Bill references and unresolved sections remain protected.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion:'budget bill',guideId:'lcb',guidePage:18,guidePrintedPage:references.lcb.pages[17].printedPage,rule:'Capitalization examples: budget bill (Const.)',category:'Constitutional capitalization',context:'Constitution',checkId:'constitutional-budget',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:18,guidePrintedPage:references.lcb.pages[17].printedPage,rule:'budget bill (Const.)',preferred:'budget bill',ruleText:message},{guideId:'gpo',guideName:'GPO Style Manual',guidePage:42,guidePrintedPage:references.gpo.pages[41].printedPage,rule:'3.6 / 3.8',preferred:'budget bill',ruleText:'Common nouns are distinct from proper names and well-known short names of specific things. This check identifies only the generic constitutional instrument.'}]});
 }
 return issues;
}
