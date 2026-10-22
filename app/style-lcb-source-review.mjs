import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
import {styleSingleQuoteRanges} from './style-single-quote-ranges.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {sourceNameRanges} from './style-source-names.mjs';
import {END_WORD_RULES,OPEN_END_RULES} from './style-compounds.mjs';
import {createBoundedRegistryMatcher} from './bounded-registry-matcher.mjs';
import {settledCanonicalModifierRanges} from './style-lcb-canonical-modifier.mjs';
import {lcbLocalSourceRoleRanges} from './style-lcb-local-source-roles.mjs';
import {originalRoleBoundaryBlocked} from './style-original-role-boundaries.mjs';

// A source form identifies a question, never an automatic grammatical or
// dictionary judgment. In particular, joining a familiar root is not spelling
// authority, and finding a printed modifier does not establish its role.
export const LCB_SOURCE_REVIEW_SCOPE='Compares complete explicitly listed LCB lexical forms and printed page 15 end-word examples. A listed compliant spelling stays quiet, including role-qualified forms. A role-qualified mismatch requires an independently established condition; an unknown grammatical role does not create a warning. Unqualified listed forms with different boundaries or capitalization may receive a source comparison without a guessed replacement. Explicit numbered-reference conditions remain checked. Unlisted roots, productive ending guesses, ordinary noun groups and general sentence structure are outside this checker.';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const fold=s=>s.replace(/[’‘]/gu,"'").replace(/[\u2010\u2011]/gu,'-').replace(/\s+/gu,' ').replace(/\s*-\s*/gu,'-').trim();
// A suspended compound is one complete construction, not alternatives
// licensing its bare first fragment (full- or part-time is not bare full).
const formAlternatives=form=>/-\s+or\s+/u.test(form)?[form]:form.split(/\s+or\s+/u);
const overlaps=(ranges,a,b)=>ranges.some(r=>r.start<b&&r.end>a);
const prefixForms=new Set(['anti','bi','in','multi','non']);
const cache=new WeakMap();
const matcherCache=new WeakMap();
export const isUnconditionalLcbSourceForm=row=>!row.qualified||/\((?:all forms|all uses one word|pref\.|[A-Z][A-Z0-9]*)\)/u.test(row.text);
export function lcbSourceReviewRows(reference){
 if(!reference?.pages)return [];
 if(cache.has(reference))return cache.get(reference);
 const rows=[];
 for(const page of reference.pages)for(const [index,text] of (page.lexicalEntries||[]).entries()){
  const form=text.split(' (')[0].trim();
  // Prefix prescriptions have a separate explicit-boundary generator. A
  // standalone preposition "in" must never become a prefix accusation.
  const prefix=prefixForms.has(form)&&/\(/u.test(text);
  rows.push({id:`lcb-source-${page.page}-${index}`,page:page.page,text,form,qualified:/\(/u.test(text),prefix});
 }
 const page15=reference.pages.find(p=>p.page===15);
 if(page15)for(const r of [...END_WORD_RULES,...OPEN_END_RULES])if(new RegExp('(?<![\\p{L}\\p{M}])'+escape(r.preferred)+'(?![\\p{L}\\p{M}])','u').test(page15.text))rows.push({id:r.id,page:15,text:r.preferred,form:r.preferred,variant:r.variant,qualified:false,prefix:false});
 const frozen=Object.freeze(rows.map(Object.freeze));cache.set(reference,frozen);return frozen;
}
function formPattern(form){
 // Only boundaries actually present in the complete printed form can vary.
 // A single solid word does not authorize arbitrary splitting or root guesses.
 return form.split(/[\s-]+/u).map(piece=>escape(piece).replace(/[’']/gu,"[’']")).join('[\\s\\u2010\\u2011-]*');
}
function records(reference){
 if(matcherCache.has(reference))return matcherCache.get(reference);
 const groups=new Map();
 for(const row of lcbSourceReviewRows(reference)){
  if(row.prefix)continue;
  const forms=[row.form,...(row.variant?[row.variant]:[])];
  for(const form of forms){
   // Alternative printed constructions retain separate complete witnesses.
   for(const alternative of formAlternatives(form)){
    if(!/^[\p{L}\p{M}][\p{L}\p{M}\p{N}\s’',.-]*$/u.test(alternative))continue;
    const pattern=formPattern(alternative),key=pattern.toLowerCase();
    if(!groups.has(key))groups.set(key,{pattern,rows:[]});
    const group=groups.get(key);if(!group.rows.some(r=>r.id===row.id))group.rows.push(row);
   }
  }
 }
 const ordered=[...groups.values()].sort((a,b)=>b.pattern.length-a.pattern.length),byForm=new Map();
 for(const g of ordered)for(const row of g.rows)for(const form of [row.form,row.variant].filter(Boolean).flatMap(formAlternatives)){
  const key=fold(form).toLowerCase().replace(/[\s-]/gu,'');
  const rows=byForm.get(key)||[];if(!rows.some(r=>r.id===row.id))rows.push(row);byForm.set(key,rows);
 }
 const value={byForm,matcher:createBoundedRegistryMatcher(ordered.map(g=>g.pattern),{prefix:'(?<![\\p{L}\\p{N}\\p{M}_-])',suffix:'(?![\\p{L}\\p{N}\\p{M}_-])'})};
 matcherCache.set(reference,value);return value;
}
export function lcbSourceReviewIssues(doc,references,{existingIssues=[],engineIssues=[]}={}){
 if(!references?.lcb?.pages)return [];
 const settled=settledCanonicalModifierRanges(doc,references,engineIssues);
 const view=styleWordDivisionView(doc,{preserveRemainingWords:true}),d=view?.doc||doc;
 const prior=view?existingIssues.map(i=>({...i,start:view.toView(i.start),end:view.toView(i.end)})):existingIssues;
 const settledView=view?settled.map(r=>({...r,start:view.toView(r.start),end:view.toView(r.end)})):settled;
 const result=withStyleContext(d,()=>review(d,references,prior,settledView));
 return view?view.restore(result).map((issue,n)=>Number.isInteger(result[n].evidenceStart)?{...issue,evidenceStart:view.toSource(result[n].evidenceStart),evidenceEnd:view.toSource(result[n].evidenceEnd,true)}:issue):result;
}
function review(doc,references,existingIssues,settledCanonical){
 const ctx=styleContext(doc),source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx);
 const originalSource=originalBodyStyleContext(doc)?.source||source;
 const names=sourceNameRanges(source),single=styleSingleQuoteRanges(source),issues=[],candidates=[];
 const localRoles=lcbLocalSourceRoleRanges(doc,ctx,references);
 const eligible=(start,end)=>!blocked(start,end)&&!literal(start,end)&&!cutsOriginalStyleWord(doc,start)&&!cutsOriginalStyleWord(doc,end)&&ctx.at(start)!=='Heading'&&!ctx.tableAt(start)&&!overlaps(names,start,end)&&!overlaps(single,start,end)&&!quoted({start,end})&&!/[\u2012-\u2015]/u.test(doc.text.slice(start,end));
 const add=(start,end,rows,reason,kind)=>{
  if(settledCanonical.some(r=>r.start===start&&r.end===end))return;
  if(!eligible(start,end)||overlaps(existingIssues,start,end)||overlaps(issues,start,end))return;
  // Names and technical identifiers need their own identity evidence. An
  // ordinary sentence-opening capital remains an eligible body occurrence.
  const term=source.slice(start,end),before=source.slice(0,start),after=source.slice(end);
  if(term===term.toUpperCase()||/[:/\\#@]/u.test(doc.text[start-1]||'')||/[:/\\#@]/u.test(doc.text[end]||''))return;
  // Internal capitals printed in the complete source phrase are evidence,
  // not an unfamiliar name. Preserve arbitrary added capitals and larger
  // names, but do not discard African-American or limited-English variants.
  const signature=s=>s.replace(/[\s\u2010\u2011-]/gu,'');
  if(/\p{Lu}/u.test(term.slice(1))&&!rows.some(r=>r.page>=18||signature(fold(r.form))===signature(fold(term))))return;
  if(/^[A-Z]/u.test(term)&&(/\p{Lu}[\p{L}\p{M}'’.-]*\s+$/u.test(before)||/^\s+(?:(?:of|for|the|and|in|on)\s+)?\p{Lu}[\p{L}\p{M}'’.-]*/u.test(after)))return;
  const cites=rows.map(r=>({guideId:'lcb',guideName:'LCB Style Manual',guidePage:r.page,guidePrintedPage:String(references.lcb.pages.find(p=>p.page===r.page).printedPage),rule:r.text,preferred:null,ruleText:r.text}));
  const first=rows[0];issues.push({start,end,text:doc.text.slice(start,end),matchText:term.replace(/\s+/gu,' '),suggestion:null,guideId:'lcb',guidePage:first.page,guidePrintedPage:cites[0].guidePrintedPage,rule:'LCB source-form review',category:'LCB Context Review',context:ctx.at(start),confidence:'Review Suggested',reviewSuggested:true,reviewKind:kind,checkId:'lcb-source-form-review',conflict:false,matchesPrimary:false,sourceEntryIds:rows.map(r=>r.id),message:'Review Suggested: '+reason+' LCB lists '+rows.map(r=>'“'+r.text+'” (page '+r.page+')').join('; ')+'. Confirm the applicable meaning, grammatical role and any stated exception. This wording may be correct; no replacement has been selected.',references:cites});
 };
 const registry=records(references.lcb);
 for(const m of registry.matcher.matchAll(source)){
  const g={rows:registry.byForm.get(fold(m[0]).toLowerCase().replace(/[\s-]/gu,''))||[]};if(!g.rows.length)continue;
  // Removing every boundary and distinctive internal capital from a name
  // is not evidence that an ordinary medical adjective names the program.
  if(/^[Mm]edical$/u.test(m[0])&&g.rows.every(r=>r.form==='Medi-Cal'))continue;
  const exact=g.rows.filter(r=>formAlternatives(r.form).some(f=>fold(f).toLowerCase()===fold(m[0]).toLowerCase()));
  // Some printed qualifications are directly observable and already settle
  // the form. Do not ask a reader seventy times to confirm a compliant bare
  // "court", or repeatedly question an intact correctly cased Section number.
  const after=source.slice(m.index+m[0].length),term=fold(m[0]);
  if(localRoles.some(r=>r.start<=m.index&&r.end>=m.index+m[0].length))continue;
  if(term==='court'&&exact.some(r=>r.text==='court (appearing alone)')&&!/^\s+of\s+appeals?\b/iu.test(after))continue;
  if(exact.some(r=>r.text==='Section (with number)')){
   const number=/^\s+\d+(?:\.\d+)*(?:\s*\([A-Za-z0-9]+\))*(?![\p{L}\p{N}\p{M}_])/u.exec(after);
   if(term==='Section'&&number&&!blocked(m.index,m.index+m[0].length+number[0].length))continue;
   if(term==='section'&&!/^\s+[\d(]/u.test(after))continue; // LCB17 item 5.
  }
  if(exact.some(r=>r.text==='Schedule (with number)')){
   const pattern=/^\s+(?:\d+(?:\.\d+)*(?:\([A-Za-z0-9]+\))*|\(\d+\)(?:\([A-Za-z0-9]+\))*)(?![\p{L}\p{N}\p{M}_])/u,number=pattern.exec(after),originalNumber=pattern.exec(originalSource.slice(m.index+m[0].length));
   if(term==='Schedule'&&number&&!blocked(m.index,m.index+m[0].length+number[0].length)&&!(originalNumber&&blocked(m.index,m.index+m[0].length+originalNumber[0].length)))continue;
   if(term==='schedule'&&number){
    const start=m.index,end=start+m[0].length,evidenceEnd=end+number[0].length,row=exact.find(r=>r.text==='Schedule (with number)'),pages=references.lcb.pages.filter(p=>p.page===row.page),page=pages[0];
    if(pages.length===1&&page.text?.includes(row.text)&&originalNumber?.[0]===number[0]&&source.slice(start,evidenceEnd)===originalSource.slice(start,evidenceEnd)&&eligible(start,end)&&!blocked(start,evidenceEnd)&&!literal(start,evidenceEnd)&&!originalRoleBoundaryBlocked(originalSource,start,evidenceEnd)&&!overlaps(single,start,evidenceEnd)&&!quoted({start,end:evidenceEnd})&&!overlaps(existingIssues,start,end))issues.push({start,end,evidenceStart:start,evidenceEnd,text:doc.text.slice(start,end),matchText:term,suggestion:'Schedule',guideId:'lcb',guidePage:row.page,guidePrintedPage:String(page.printedPage),rule:row.text,category:'Capitalization',context:ctx.at(start),checkId:'lcb-numbered-schedule',conflict:false,sourceEntryIds:[row.id],message:'LCB explicitly prints Schedule (with number). The intact following number establishes that condition; capitalize only Schedule, retaining the reference digits and subdivisions.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:row.page,guidePrintedPage:String(page.printedPage),rule:row.text,preferred:'Schedule',ruleText:row.text}]});
    continue;
   }
   // The printed condition is a following number. A plain lower-case noun
   // does not need a question about a condition visibly absent from source.
   const cue=/^\s+(?:\d|\(\s*\d)/u;
   if(term==='schedule'&&!cue.test(after)&&!cue.test(originalSource.slice(m.index+m[0].length)))continue;
  }
  const constitutionalDocument=/(?:^|\n)\s*(?:ASSEMBLY|SENATE)\s+CONSTITUTIONAL\s+AMENDMENT\b/iu.test(source.slice(0,2000))||/\b(?:ACA|SCA)[\s_-]*\d/iu.test(doc.name||'');
  if(term==='state'&&ctx.at(m.index)==='Bill'&&exact.some(r=>r.text==='state (appearing alone in bill)')&&!constitutionalDocument)continue;
  // The reader must resolve a stated role/meaning. An exact plain spelling
  // is compliant with that finite source entry and does not need a question.
  const caseQuestion=g.rows.some(r=>/[A-Z]/u.test(r.form)&&fold(r.form)!==fold(m[0])&&formAlternatives(r.form).some(f=>fold(f).toLowerCase()===fold(m[0]).toLowerCase()));
  const numberedCaseMismatch=term==='section'&&/^\s+[\d(]/u.test(after)||term==='schedule'&&/^\s+(?:\d|\(\s*\d)/u.test(after);
  const listedCompliant=exact.some(r=>formAlternatives(r.form).some(f=>fold(f)===term||r.page<18&&f===f.toLowerCase()&&fold(f).toLowerCase()===term.toLowerCase()));
  if(listedCompliant&&!numberedCaseMismatch)continue;
  // A listed unit modifier is conditional on that role. Its open noun use
  // (third party), a preposition followed by a noun (in state statute), or
  // an ordinary member cannot establish the condition merely by matching
  // the letters of an entry. Dedicated checks own observable role evidence.
  const applicable=g.rows.filter(r=>isUnconditionalLcbSourceForm(r)||numberedCaseMismatch&&/^(?:Section|Schedule) \(with number\)$/u.test(r.text));
  if(!applicable.length)continue;
  candidates.push({start:m.index,end:m.index+m[0].length,rows:applicable,reason:caseQuestion?'This occurrence differs from the capitalization of the complete printed form; confirm whether the listed expression is intended.':exact.length?'The listed capitalization condition has been established for this occurrence.':'This occurrence has different word boundaries from the complete printed form.'});
 }
 // Longest complete source phrases own contained lexical questions; never
 // turn an open exception into a warning about a shorter suffix.
 candidates.sort((a,b)=>a.start-b.start||b.end-a.end);
 for(const c of candidates)add(c.start,c.end,c.rows,c.reason,'source-entry-context');
 // General prefix/root and productive-ending guesses do not identify a
 // mismatch to a complete listed form. Dedicated explicit rules run separately.
 return issues.sort((a,b)=>a.start-b.start||a.end-b.end);
}
