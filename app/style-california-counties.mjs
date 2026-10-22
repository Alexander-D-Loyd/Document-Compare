import {CALIFORNIA_COUNTIES,CALIFORNIA_COUNTIES_SOURCE} from './data/california-counties.mjs';
import {styleContext,withStyleContext} from './style-context.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
import {styleEvidenceGuard,originalBodyStyleContext} from './style-evidence.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';
import {styleSingleQuoteRanges} from './style-single-quote-ranges.mjs';
import {countyInstitutionCaptionRanges} from './style-lcb-local-source-roles.mjs';
const clean=s=>s.replace(/\s+/gu,' ').trim(),layout=s=>clean(s.replace(/(?<=\p{L})-[ \t]*\n\s*(?=\p{L})/gu,'')),escape=s=>s.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
const byName=new Map(CALIFORNIA_COUNTIES.map(row=>[row.name.toLowerCase(),row]));
const names=CALIFORNIA_COUNTIES.map(row=>row.name.split(' ').map(word=>[...word].map(escape).join('(?:-[ \\t]*\\n\\s*)?')).join('\\s+')).sort((a,b)=>b.length-a.length).join('|');
const knownAt=new RegExp('^(?:'+names+')(?![\\p{L}\\p{N}\\p{M}_])','iu');
const canonicalNames=new RegExp('(?:'+names+')','giu');
const knownBefore=new RegExp('(?:'+names+')\\s+$','iu');
const reverse=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?<name>'+names+')\\s+county(?![\\p{L}\\p{N}\\p{M}_])','giu');
const separator=/^\s*(?:,\s*(?:(?:and|or|&)\s+)?|(?:and|or|&)\s+)/iu;
const nameWord=/^[\p{L}][\p{L}\p{M}'’\-]*/u;
const stopWord=/^(?:and|or|of|the|this|that|those|these|each|any|a|an|shall|must|may|will|would|is|are|was|were|has|have|had|does|do|did|for|from|in|on|under|with|by|to|as|at|which|who|whose|if|unless|including|excluding|participate|subject|their|along|together|except|respectively|namely|such|all|both|other|several|residence|origin|birth|employment|domicile|record|incorporation|location|filing|jurisdiction|applicant|employee|employer|person|client|member|county|counties|city|cities|department|office|board|commission|council|authority|agency|court|school|district|police|sheriff|library|government|code|program|association|committee|foundation|fund|account|etc)$/iu;
const genericWord=/^(?:his|her|their|its|our|your|my|operation|assignment|business|service|services|choice|principal|usual|current|last|first|legal|permanent|temporary)$/iu;
const institutionalTail=/^\s+(?:Fire\s+Department|Superior\s+Court|Public\s+(?:Works|Health|Services|Defender)|Health\s+(?:Care\s+Agency|Services\s+Department)|District\s+Attorney(?:'s|’s)?\s+Office)\b/iu;
const citizensTail=new RegExp('^\\s+'+['Citizens','Redistricting','Commission'].map(word=>[...word].map(escape).join('(?:-[ \\t]*\\n\\s*)?')).join('\\s+')+'(?![\\p{L}\\p{N}\\p{M}_])','iu');
const titleWord='[\\p{Lu}][\\p{L}\\p{M}’\'\\-]*',member=titleWord+'(?:\\s+'+titleWord+'){0,3}',unknownReverse=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?<name>'+member+')\\s+[Cc]ounty(?![\\p{L}\\p{N}\\p{M}_])','gu');
const sep='(?:\\s*,\\s*(?:(?:and|or|&)\\s+)?|\\s+(?:and|or|&)\\s+)',backList=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?<items>'+member+'(?:'+sep+member+')+)\\s+[Cc]ounties(?![\\p{L}\\p{N}\\p{M}_])','gu');
const knownBackList=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?<items>(?:'+names+')(?:'+sep+'(?:'+names+'))+)\\s+counties(?![\\p{L}\\p{N}\\p{M}_])','giu');
const proseLead=value=>{let length=0;for(let n=0;n<4;n++){const m=/^([\p{L}\p{M}]+)\s+/u.exec(value.slice(length));if(!m||(!stopWord.test(m[1])&&!genericWord.test(m[1])))break;length+=m[0].length;}return value.slice(0,length);};
const words=new Set(['county','counties','of',...CALIFORNIA_COUNTIES.flatMap(row=>row.name.toLowerCase().split(' '))]);
export function californiaCountyIssues(doc){
 // Normalization may display body dashes as hyphens. Only printed discretionary
 // hyphens may provide positive word-division evidence for this exact list.
 const eligible={...doc,wrappedWords:(doc.wrappedWords||[]).filter(w=>!w.spans?.slice(0,-1).some(s=>!/^[-\u00ad\u2010]/u.test(doc.text.slice(s.end,s.end+1))))};
 const view=styleWordDivisionView(eligible,{knownWords:words,knownWordsOnly:true,includeLiterals:true,includeTables:true});
 return view?view.restore(withStyleContext(view.doc,()=>countyIssues(view.doc))):countyIssues(doc);
}
function countyIssues(doc){
 const ctx=styleContext(doc),source=ctx.source,original=originalBodyStyleContext(doc)?.source||source;
 const badDivision=(start,end)=>{for(let n=start;n<end;n++)if(/[\u2011-\u2015]/u.test(doc.text[n])&&source[n]==='-'&&/^[ \t]*\n\s*\p{L}/u.test(source.slice(n+1,end)))return true;return false;};
 const printed=(start,end)=>source.slice(start,end).split('').map((c,n)=>c==='-'&&/[\u2011-\u2015]/u.test(doc.text[start+n])?doc.text[start+n]:c).join('');
 // This explicit user reference includes quoted references and table cells.
 const blocked=styleEvidenceGuard(doc,{...ctx,literalAt:ctx.technicalAt,tableAt:()=>false}),singleQuotes=styleSingleQuoteRanges(original),issues=[],covered=[];
 const institutionalCaptions=countyInstitutionCaptionRanges(doc,ctx);
 const boundaryBlocked=(start,end)=>{
  let negative=original;
  // A complete enclosing single quote is punctuation, not a word attachment.
  if(singleQuotes.some(r=>r.start===start-1&&r.end>=end+1)&&/[’']$/u.test(negative.slice(0,start)))negative=negative.slice(0,start-1)+' '+negative.slice(start);
  return entityNameBoundaryBlocked(doc.text,source,negative,start,end);
 };
 const add=(start,end,suggestion,kind,row=null,extra={})=>{
  const evidenceStart=extra.evidenceStart??start,evidenceEnd=extra.evidenceEnd??end;
  if(institutionalCaptions.some(r=>r.start<=start&&r.end>=end))return;
  if(blocked(evidenceStart,evidenceEnd)||boundaryBlocked(start,end))return;
  const text=doc.text.slice(start,end),form=layout(printed(start,end));
  if(suggestion===form)return;
  const rule=kind==='unknown'?'Exact county name':'County reference form',message=suggestion?'“'+form+'” does not exactly match the requested California Counties form. Compare with “'+suggestion+'”.':kind==='unknown'?'“'+form+'” does not identify an exact county name in the supplied California Counties list. Confirm the intended reference; no county name is guessed.':'Confirm the complete county list in “'+form+'” and whether the singular County of or plural Counties of form is intended.';
  issues.push({start,end,text,matchText:form,suggestion,guideId:'california-counties',rule,category:kind==='unknown'?'California County name':'California County form',checkId:'california-counties-'+kind,context:ctx.at(start),conflict:false,reviewSuggested:!suggestion,message,reviewTask:message+' Compare with the supplied list before editing.',countySource:{...CALIFORNIA_COUNTIES_SOURCE,entry:row,...(extra.plural?{plural:true}:{})},references:[{guideId:'california-counties',guideName:'California Counties',rule,preferred:suggestion,ruleText:message}]});
 };
 const parseMember=(start,input=source)=>{
  const known=knownAt.exec(input.slice(start));
  if(known){const end=start+known[0].length,next=/^\s+([\p{Lu}][\p{L}\p{M}'’\-]*)/u.exec(input.slice(end)),duplicate=/^\s+county(?![\p{L}\p{N}\p{M}_])/iu.exec(input.slice(end)),citizens=citizensTail.exec(input.slice(end)),citizensEnd=citizens&&!badDivision(end,end+citizens[0].length)?end+citizens[0].length:null;if(!next||stopWord.test(next[1])||institutionalTail.test(input.slice(end))||citizensEnd)return {start,end:end+(duplicate?.[0].length||0),...(citizensEnd?{evidenceEnd:citizensEnd}:{}),row:badDivision(start,end)?null:byName.get(layout(known[0]).toLowerCase())};}
  const first=nameWord.exec(input.slice(start));if(!first||stopWord.test(first[0])||genericWord.test(first[0]))return null;
  let end=start+first[0].length;
  for(let n=1;n<4;n++){const next=/^\s+([\p{Lu}][\p{L}\p{M}'’\-]*)/u.exec(input.slice(end));if(!next||stopWord.test(next[1]))break;end+=next[0].length;}
  return {start,end,row:byName.get(layout(input.slice(start,end)).toLowerCase())||null};
 };
 for(const m of source.matchAll(/(?<![\p{L}\p{N}\p{M}_])(?<prefix>county|counties)\s+of\s+/giu)){
  // In Orange County of Education, the explicit county reference starts at
  // Orange; the following institutional title is not another county name.
  if(knownBefore.test(source.slice(0,m.index))||knownBefore.test(original.slice(0,m.index)))continue;
  const plural=m.groups.prefix.toLowerCase()==='counties',first=parseMember(m.index+m[0].length);if(!first)continue;
  const members=[first];let cursor=first.end;
  for(let n=1;n<128;n++){const sep=separator.exec(source.slice(cursor));if(!sep)break;const next=parseMember(cursor+sep[0].length);if(!next)break;members.push(next);cursor=next.end;}
  let evidenceEnd=Math.max(...members.map(r=>r.evidenceEnd||r.end));
  // Original text may veto a partial member/list exposed by removed text.
  const negativeFirst=parseMember(m.index+m[0].length,original);
  if(negativeFirst){let end=negativeFirst.end;evidenceEnd=Math.max(evidenceEnd,negativeFirst.evidenceEnd||end);for(let n=1;n<128;n++){const sep=separator.exec(original.slice(end));if(!sep)break;const next=parseMember(end+sep[0].length,original);if(!next)break;end=next.end;evidenceEnd=Math.max(evidenceEnd,next.evidenceEnd||end);}evidenceEnd=Math.max(evidenceEnd,end);}
  if(blocked(m.index,evidenceEnd)||boundaryBlocked(m.index,evidenceEnd))continue;
  covered.push({start:m.index,end:evidenceEnd});
  if(!plural){const r=first;if(members.length===1)add(m.index,r.end,r.row?.preferred||null,r.row?'form':'unknown',r.row,{evidenceStart:m.index,evidenceEnd});else{let tail=source.slice(first.start,members.at(-1).end);for(const item of [...members].reverse())tail=tail.slice(0,item.start-first.start)+(item.row?.name||source.slice(item.start,item.end))+tail.slice(item.end-first.start);const complete=members.every(item=>item.row);add(m.index,members.at(-1).end,complete?'Counties of '+layout(tail):null,complete?'form':'unknown',null,{plural:true,evidenceStart:m.index,evidenceEnd});}continue;}
  if(members.length===1&&first.row){const complete=/^(?:\s*$|\s*[.;!?]|\s+(?:shall|must|may|will|is|was|has|does)\b)/iu.test(source.slice(first.end));add(m.index,first.end,complete?first.row.preferred:null,'form',first.row,{plural:true,evidenceStart:m.index,evidenceEnd});continue;}
  const prefixEnd=m.index+m[0].trimEnd().length;add(m.index,prefixEnd,'Counties of','form',null,{plural:true,evidenceStart:m.index,evidenceEnd});
  for(const r of members)add(r.start,r.end,r.row?.name||null,r.row?'name':'unknown',r.row,{plural:true,evidenceStart:m.index,evidenceEnd});
 }
 // Reversed singular references use complete registered names only. This
 // deliberately does not classify bare city names or unfamiliar name syntax.
 const reverseCovered=[],originalReverse=[...original.matchAll(unknownReverse)].map(m=>({start:m.index+proseLead(m.groups.name).length,end:m.index+m[0].length}));
 for(const m of [...source.matchAll(unknownReverse),...source.matchAll(reverse)]){
  const leading=proseLead(m.groups.name),start=m.index+leading.length,end=m.index+m[0].length;if(covered.some(r=>r.start<=start&&r.end>=end)||reverseCovered.some(r=>r.start<end&&r.end>start))continue;
  // An original separator dash before generic County is a caption boundary;
  // a dash inside a name (River—side County) still requires manual review.
  if(/[\u2013\u2014]/u.test(doc.text[m.index+m.groups.name.length-1]||''))continue;
  if(originalReverse.some(r=>r.start<start&&r.end===end))continue;
  const name=layout(m.groups.name.slice(leading.length));if(stopWord.test(name)||genericWord.test(name))continue;
  reverseCovered.push({start,end});const row=byName.get(name.toLowerCase())||null,exact=row&&!badDivision(start,end);add(start,end,exact?row.preferred:null,exact?'form':'unknown',row);
 }
 // Bounded reversed named lists are eligible only when every member is exact.
 // Unknown title-cased members retain a review-only finding with no substitute.
 const backCovered=[],originalLists=[...original.matchAll(backList)].map(m=>({start:m.index+proseLead(m.groups.items).length,end:m.index+m[0].length}));
 for(const m of [...source.matchAll(backList),...source.matchAll(knownBackList)]){
  const leading=proseLead(m.groups.items),start=m.index+leading.length,end=m.index+m[0].length;if(covered.some(r=>r.start<end&&r.end>start))continue;
  if(originalLists.some(r=>r.start<start&&r.end===end))continue;
  // A known suffix cannot detach from an original preceding list member,
  // including an uncertain lowercase name or a removed separator/member.
  if(/[\p{L}\p{M}’'\-]+(?:\s*,\s*(?:(?:and|or|&)\s+)?|\s+(?:and|or|&)\s+)$/iu.test(original.slice(0,start)))continue;
  if(backCovered.some(r=>r.start<end&&r.end>start))continue;backCovered.push({start,end});
  const items=layout(m.groups.items.slice(leading.length)),parts=items.split(/\s*,\s*(?:(?:and|or|&)\s+)?|\s+(?:and|or|&)\s+/iu),rows=parts.map(name=>byName.get(name.toLowerCase())),complete=rows.every(Boolean)&&!badDivision(start,end);
  const lookup=new Map(parts.map((part,n)=>[part.toLowerCase(),rows[n]?.name])),canonical=complete?items.replace(canonicalNames,name=>lookup.get(layout(name).toLowerCase())||layout(name)):null;
  add(start,end,complete?'Counties of '+canonical:null,complete?'form':'unknown',null,{plural:true});
 }
 return issues.sort((a,b)=>a.start-b.start||a.end-b.end).filter((issue,n,all)=>!all.slice(0,n).some(prior=>prior.start===issue.start&&prior.end===issue.end&&prior.suggestion===issue.suggestion));
}
