import {styleContext} from './style-context.mjs';
import {constitutionalBodyRanges} from './style-constitutional-context.mjs';
import {styleEvidenceGuard} from './style-evidence.mjs';
// Selected explicit witnesses for the remaining contextual source entries.
// No inference from spelling similarity, a global referent, or a heading.
export function finalLcbContextIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],ranges=constitutionalBodyRanges(doc);
 const blocked=styleEvidenceGuard(doc,ctx),cutsWord=index=>/[\p{L}\p{N}_]$/u.test(doc.text.slice(Math.max(0,index-2),index))&&/^[\p{L}\p{N}_]/u.test(doc.text.slice(index,index+2));
 const add=(m,preferred,page,entry,scope)=>{
  const term=m.groups.term,start=m.index+m[0].indexOf(term),end=start+term.length;
  if(cutsWord(m.index)||cutsWord(m.index+m[0].length)||blocked(m.index,m.index+m[0].length))return;
  if(term.replace(/\s+/g,' ')===preferred||term===term.toUpperCase()||ctx.literalAt(start,end)||ctx.tableAt(start)||ctx.at(start)==='Heading')return;
  const message='LCB lists '+entry+'. '+scope+' The complete original referent or role evidence protects strikes, literals, tables and unknown ignored or excluded wording, with complete Unicode word boundaries. Only this explicit context is checked; other meanings, extended names, quotes, headings and source strikeouts remain protected.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion:preferred,guideId:'lcb',guidePage:page,guidePrintedPage:references.lcb.pages[page-1].printedPage,rule:'Capitalization examples: '+entry,category:'Contextual capitalization',context:ctx.at(start),checkId:'lcb-final-contexts',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:page,guidePrintedPage:references.lcb.pages[page-1].printedPage,rule:entry,preferred,ruleText:message}]});
 };
 for(const m of source.matchAll(/\b(?:the|this)\s+(?<term>budget\s+bill)\s+for\s+(?:the\s+)?(?:\d{4}(?:\s*-\s*\d{2,4})?\s+fiscal\s+year|fiscal\s+year\s+\d{4}(?:\s*-\s*\d{2,4})?)\b/gi)){
  if(ranges.some(r=>m.index>=r.start&&m.index<r.end))continue;
  add(m,'Budget Bill',18,'Budget Bill','A definite determiner and a specified fiscal year identify the named annual Budget Bill outside constitutional body text.');
 }
 for(const [term,page] of [['Controller',18],['Treasurer',20]]){
  const rx=new RegExp('\\bCalifornia\\s+State\\s+(?<term>'+term+')\\s+[A-Z][a-z]+\\s+[A-Z][a-z]+\\s+(?:shall|must|may|will|is|was|has)\\b','g');
  // Case-insensitive matching is restricted to the title, preserving the
  // personal-name and California jurisdiction evidence as written.
  const titlePattern=term.split('').map(c=>'['+c.toLowerCase()+c.toUpperCase()+']').join('');
  for(const m of source.matchAll(new RegExp(rx.source.replace('(?<term>'+term+')','(?<term>'+titlePattern+')'),'g')))add(m,term,page,term+', the (state)','The California State qualifier and adjoining personal name identify this state official title. GPO 3.36 also capitalizes a civil title immediately preceding a personal name.');
 }
 for(const m of source.matchAll(/\b(?:the|this)\s+(?<term>general\s+fund)\s+of\s+the\s+State\s+of\s+California\b/gi))add(m,'General Fund',19,'General Fund (state)','The explicit State of California ownership identifies the state fund, distinct from a county fund or unspecified fund.');
 for(const m of source.matchAll(/\b(?:a|an|any|each|every)\s+(?<term>constitutional\s+clause)\s+(?:shall|must|may|will|is|was|has|prohibits|permits|requires)\b/gi))add(m,'constitutional clause',18,'clause (constitutional clauses)','A nondefinite determiner and predicate identify a generic constitutional clause, rather than a named or quoted clause.');
 for(const m of source.matchAll(/\bthe\s+(?<term>east\s+Los\s+Angeles)\s+portion\s+of\s+the\s+city\b/gi))add(m,'east Los Angeles',18,'east Los Angeles','The explicit portion of the city continuation selects directional east rather than the named East Los Angeles community. GPO 3.23 also lowercases a descriptive direction.');
 for(const m of source.matchAll(/\b(?:a|any|each|every)\s+(?<term>regular\s+session)\s+of\s+the\s+Legislature\s+(?:shall|must|may|will|is|was|has)\b/gi))add(m,'regular session',19,'regular session of the Legislature (without year)','A nondefinite session and predicate identify the unnumbered generic session; dated session titles remain separate.');
 for(const m of source.matchAll(/\b(?:the|each|every)\s+(?<term>member)\s+elected\s+to\s+the\s+California\s+Legislature\s+(?:shall|must|may|will|is|was|has)\b/gi))add(m,'Member',19,'Member (title of a Member of the Legislature)','An explicit elected-to-the-California-Legislature qualifier identifies the legislative Member rather than a board member or member of another body.');
 const constitutional=/^[ \t]*(?:ASSEMBLY|SENATE)\s+CONSTITUTIONAL\s+AMENDMENT\b/im.test(source.slice(0,6000));
 for(const m of source.matchAll(/\bchurch\s+and\s+(?<term>state)(?:\s*(?=[.;,)]|$)|\s+(?:shall|must|may|will|is|are|remain|remains)\b)/gi)){
  const inBody=ranges.some(r=>m.index>=r.start&&m.index<r.end);
  if(inBody)continue; // Constitutional body noun has its own State rule.
  if(constitutional&&ctx.at(m.index)==='Digest')add(m,'state',20,'state (digest of Const. Amdt.)','The explicit church and state expression supplies the generic body-politic sense in a constitutional amendment digest; GPO 3.20 also lowercases this expression.');
  else if(!constitutional&&ctx.at(m.index)==='Bill')add(m,'state',20,'state (appearing alone in bill)','The explicit church and state expression supplies the generic body-politic noun in ordinary bill prose; GPO 3.20 also lowercases this expression.');
 }
 for(const m of source.matchAll(/\b(?<term>state)\s+welfare\s+(?:policies|programs|benefits)\s+(?:shall|must|may|will|are|remain)\b/gi))if(ranges.some(r=>m.index>=r.start&&m.index<r.end))add(m,'state',20,'state (adj., body of Const.)','The explicitly introduced constitutional body and following welfare noun identify this adjective; GPO lists state welfare in lowercase as well.');
 return issues;
}
