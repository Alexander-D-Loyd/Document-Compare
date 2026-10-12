import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
import {sourceNameRanges} from './style-source-names.mjs';

export const LCB_CREATED_TITLE_REVIEW_SCOPE='Unfamiliar multiword Fund/Account titles in intact explicit creation or establishment clauses tied to the State Treasury or General Fund receive reader review when important title words remain lowercase. Known-as/named clauses tied to that same creation can identify an unquoted formal name. Whole titles and complete establishing clauses are source evidence. Correct capitalization, generic short fund types, merely possible or continued funds, quotations, headings, tables, strikes, unknown exclusions and known guide conflicts remain protected. No replacement or general title identity is asserted. Other accounts, acts, codes, funds and laws, quoted naming clauses and arbitrary title/creation syntax remain partial.';
const token="[A-Za-z0-9]+(?:(?:-(?:[ \\t]*\\n\\s*)?|[’'])[A-Za-z0-9]+)*";
const logical=s=>s.replace(/-[ \t]*\n\s*(?=[A-Za-z0-9])/g,'-').replace(/\s+/g,' ').trim();
const titleWord='(?!(?:shall|must|may|will|would|should|can|could|is|are|was|were|has|have|had|that|which|after|before|unless|until|whether|where|receives?|provides?|declares?|requires?|notes|confirms|acknowledges|specifies)\\b)'+token;
const name=titleWord+'(?:\\s+'+titleWord+')+\\s+(?:fund|account)';
const destination='(?:in|within)\\s+the\\s+(?:State\\s+Treasury|General\\s+Fund)';
const create='is\\s+(?:hereby\\s+)?(?:created|established)(?:\\s+as\\s+a\\s+(?:(?:special|trust|revolving)\\s+)?fund)?\\s+'+destination;
const declarations=new RegExp('\\bthe\\s+(?<name>'+name+')\\s+'+create+'\\b','giu');
const named=new RegExp('\\ba\\s+(?:fund|account)\\s+'+create+'\\s*(?:,\\s*)?(?:and\\s+)?(?:shall\\s+be|is)\\s+(?:known\\s+as|named)\\s+(?:the\\s+)?(?<name>'+name+')(?=\\s*[,.;:!?)]|$)','giu');
const little=new Set('a an and as at by for from in into of on or the to with'.split(' '));
const generic=/^(?:(?:new|special|separate|additional|revolving|trust|reserve|endowment|revenue|savings|escrow|deposit|interest-bearing|general|operating|sinking)\s+){1,3}(?:fund|account)$/i;
// GPO explicitly supplies these lowercase fund forms; preserve the user's
// policy to ignore guide conflicts rather than assert an LCB-only correction.
const conflicting=/^(?:civil service retirement|highway trust|mutual security|national service life insurance|revolving) fund$/i;
const overlaps=(ranges,start,end)=>ranges.some(r=>r.start<end&&r.end>start);
function review(doc,references,existing,rangesOnly=false){
 const ctx=styleContext(doc),source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),names=sourceNameRanges(source),quoted=[...source.matchAll(/‘[^’]*’|(?<![\p{L}\p{N}\p{M}_])'[^'\n]*'/gu)].map(m=>({start:m.index,end:m.index+m[0].length})),found=[];
 for(const pattern of [declarations,named])for(const m of source.matchAll(pattern)){
  const start=m.index+m[0].lastIndexOf(m.groups.name),end=start+m.groups.name.length,evidenceStart=m.index,evidenceEnd=m.index+m[0].length,title=logical(m.groups.name);
  if(ctx.at(start)==='Heading'||generic.test(title)||conflicting.test(title)||blocked(evidenceStart,evidenceEnd)||overlaps(quoted,evidenceStart,evidenceEnd)||overlaps(names,start,end)||overlaps(existing.filter(i=>i.checkId!=='lcb-prefixes'),start,end)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||found.some(i=>i.start<end&&i.end>start))continue;
  if(rangesOnly){found.push({start,end,evidenceStart,evidenceEnd,name:title,evidenceText:logical(m[0]),supersedesCheckIds:['lcb-prefixes']});continue;}
  const important=title.split(/\s+/).filter(w=>!little.has(w.toLowerCase()));
  if(!important.some(w=>/^[a-z]/.test(w)))continue;
  found.push({start,end,text:doc.text.slice(start,end),suggestion:null,guideId:'lcb',guidePage:17,guidePrintedPage:String(references.lcb.pages[16].printedPage),rule:'Capitalization, item 2',category:'Created Official Title Review',context:ctx.at(start),checkId:'lcb-created-official-title-review',confidence:'Review Suggested',reviewSuggested:true,reviewKind:'created-title',evidenceStart,evidenceEnd,conflict:false,matchesPrimary:false,message:'Review Suggested: This creation clause may establish an official Fund or Account title whose important words are lowercase. LCB capitalizes official account and fund titles. Confirm the exact formal title rather than changing a generic description. No replacement is asserted.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:17,guidePrintedPage:String(references.lcb.pages[16].printedPage),rule:'Capitalization, item 2',preferred:null,ruleText:'Capitalize official titles of accounts, acts, codes, funds, laws, etc.'}]});
 }
 return found.sort((a,b)=>a.start-b.start||a.end-b.end);
}
function run(doc,references,existingIssues,rangesOnly){
 if(!references?.lcb?.pages)return [];
 const view=styleWordDivisionView(doc),reviewDoc=view?.doc||doc,prior=view?existingIssues.map(i=>({...i,start:view.toView(i.start),end:view.toView(i.end)})):existingIssues;
 const found=withStyleContext(reviewDoc,()=>review(reviewDoc,references,prior,rangesOnly));
 return view?view.restore(found).map((i,n)=>({...i,evidenceStart:view.toSource(found[n].evidenceStart),evidenceEnd:view.toSource(found[n].evidenceEnd,true)})):found;
}
export function lcbCreatedOfficialTitleReviewIssues(doc,references,{existingIssues=[]}={}){return run(doc,references,existingIssues,false);}
export function lcbCreatedOfficialTitleProtectionRanges(doc,references){return run(doc,references,[],true);}
// These are document-local witnesses, not a permanent official-name registry.
// Consumers retain the exact source title and the complete guarded creation.
export function lcbCreatedOfficialTitleRecords(doc,references){return run(doc,references,[],true).map(r=>({...r,text:doc.text.slice(r.start,r.end),declarationText:doc.text.slice(r.evidenceStart,r.evidenceEnd)}));}
