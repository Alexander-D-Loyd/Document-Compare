import {withStyleContext} from './style-context.mjs';
import {listedWordingContext} from './style-gpo-listed-wording.mjs';
import {originalRoleBoundaryBlocked} from './style-original-role-boundaries.mjs';
import {GPO_PRINTED_FULL_NAMES} from './data/gpo-printed-full-name-definitions.mjs';

export const GPO_PRINTED_FULL_NAMES_SCOPE='134 complete contiguous printed multiword names from GPO 2016 chapter 4 PDF pages 59–94, selected after all 36 pages were read and visually inspected. Only case is compared across the whole literal name; punctuation, words, digits and source whitespace are retained. Source row passages are verified before use. No inherited heading, inverted entry or uncertain source word gap is reconstructed. Quotations, bill-local quoted or explicitly defined forms, extended/local names, headings/tables, removed evidence, unknown gaps, technical endpoints, and overlapping LCB/California Entities findings retain their owners. The page audit explicitly retains the conditional/manual remainder. Geographic or federal identity, generic/standing-alone offices, live officeholders, document meanings, historical/current facts and all other chapter-wide capitalization remain manual or with existing checks. This is finite printed-name case coverage, not full semantic capitalization automation.';
const normalize=s=>s.replace(/\s+/gu,' ');
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const expression=name=>name.split(/\s+/u).map(escape).join('\\s+');
const rows=[...GPO_PRINTED_FULL_NAMES].sort((a,b)=>b.name.length-a.name.length);
const index=new Map(rows.map(r=>[r.id,r]));
const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?:'+rows.map(r=>expression(r.name)).join('|')+')(?![\\p{L}\\p{N}\\p{M}_])','giu');
const identifier=/(?<![\p{L}\p{N}\p{M}_])(?:identifier|keyword|token|variable|parameter|symbol|serial|filename|file|path|url)\s*(?:[:=]\s*)?$/iu;
const declared=/(?:means|shall\s+mean|is\s+defined\s+as)(?![\p{L}\p{N}\p{M}_])/u;
const previousCapital=/(?:^|[^\p{L}\p{N}\p{M}_])([\p{Lu}][\p{L}\p{M}]+)\s+$/u;
const proseLeads=new Set(['The','A','An','For','By','From','To','Under','In','Of','At','And','Or','Use','Visit','Contact','See']);
function suggestionFor(actual,name){
 const sourceWords=actual.match(/\S+/gu)||[],words=name.split(/\s+/u);if(sourceWords.length!==words.length)return null;
 if(sourceWords.some((s,n)=>s.toLowerCase()!==words[n].toLowerCase()))return null;
 let n=0;return actual.replace(/\S+/gu,()=>words[n++]);
}
function trustedRow(row,references){
 const matches=references?.gpo?.pages?.filter(p=>p.page===row.sourcePage)||[];if(matches.length!==1)return false;
 const p=matches[0],s=row.sourcePassage;
 return p&&p.printedPage===row.printedPage&&p.text?.slice(s.start,s.end)===s.text&&normalize(s.text)===row.name;
}
function definedLocally(original,name){
 const r=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])'+expression(name)+'\\s+(?:'+declared.source+')','giu');return r.test(original);
}
export function gpoPrintedFullNameIssues(doc,references,{existingIssues=[]}={}){
 return withStyleContext(doc,()=>{
  const view=listedWordingContext(doc),issues=[],valid=rows.filter(r=>trustedRow(r,references)),local=new Map(),byName=new Map(valid.map(r=>[r.name.toLowerCase(),r]));
  for(const m of view.source.matchAll(pattern)){
   const start=m.index,end=start+m[0].length,row=byName.get(normalize(m[0]).toLowerCase());if(!row)continue;
   const actual=doc.text.slice(start,end),suggestion=suggestionFor(actual,row.name);if(!suggestion||actual===suggestion)continue;
   if(!local.has(row.id))local.set(row.id,definedLocally(view.original,row.name));
   const prior=previousCapital.exec(view.original.slice(0,start));
   if(view.guard(start,end)||originalRoleBoundaryBlocked(view.original,start,end)||identifier.test(view.original.slice(0,start))||prior&&!proseLeads.has(prior[1])||local.get(row.id)||existingIssues.some(i=>(i.guideId==='lcb'||i.checkId==='california-entities')&&i.start<end&&i.end>start))continue;
   const message='GPO prints the complete name “'+row.name+'”. Compare only its capitalization; the source words, punctuation, digits and layout whitespace remain unchanged. No generic title, entity identity or current/historical fact is inferred.';
   issues.push({start,end,evidenceStart:start,evidenceEnd:end,text:actual,suggestion,guideId:'gpo',guidePage:row.sourcePage,guidePrintedPage:row.printedPage,rule:'4: printed complete name',category:'Printed name capitalization',checkId:'gpo-printed-full-name',context:view.ctx.at(start),conflict:false,message,listedNameEvidence:{rowId:row.id,sourcePage:row.sourcePage,printedName:row.name,start,end,sourceText:actual},references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:row.sourcePage,guidePrintedPage:row.printedPage,rule:'4: printed complete name',preferred:row.name,ruleText:message,sourcePassage:{...row.sourcePassage}}]});
  }
  return issues;
 });
}
// The final name-protection gate may admit this exact witness only. A citation
// or a substring alone does not establish the complete printed name condition.
export function validGpoPrintedFullNameWitness(issue,source){
 const e=issue?.listedNameEvidence,row=index.get(e?.rowId);if(!row||issue.checkId!=='gpo-printed-full-name'||issue.guideId!=='gpo'||issue.guidePage!==row.sourcePage||e.sourcePage!==row.sourcePage||e.printedName!==row.name||e.start!==issue.start||e.end!==issue.end||!Number.isInteger(e.start)||!Number.isInteger(e.end)||e.start<0||e.end<=e.start||typeof e.sourceText!=='string'||source!==null&&(typeof source!=='string'||e.end>source.length||source.slice(e.start,e.end)!==e.sourceText))return false;
 const wanted=suggestionFor(e.sourceText,row.name);if(!wanted||wanted===e.sourceText||issue.suggestion!==wanted)return false;
 return issue.references?.some(r=>r.guideId==='gpo'&&r.guidePage===row.sourcePage&&r.guidePrintedPage===row.printedPage&&r.sourcePassage?.page===row.sourcePage&&r.sourcePassage.start===row.sourcePassage.start&&r.sourcePassage.end===row.sourcePassage.end&&r.sourcePassage.text===row.sourcePassage.text)===true;
}
