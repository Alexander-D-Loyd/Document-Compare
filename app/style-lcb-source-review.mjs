import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
import {styleSingleQuoteRanges} from './style-single-quote-ranges.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {sourceNameRanges} from './style-source-names.mjs';
import {END_WORD_RULES,OPEN_END_RULES} from './style-compounds.mjs';
import {createBoundedRegistryMatcher} from './bounded-registry-matcher.mjs';

// A source form identifies a question, never an automatic grammatical or
// dictionary judgment. In particular, joining a familiar root is not spelling
// authority, and finding a printed modifier does not establish its role.
export const LCB_SOURCE_REVIEW_SCOPE='Source-driven reader review supplements precise checks for every lexical table entry on LCB pages 3–5, 9–14 and 18–20, the printed page 15 end-word examples and exceptions, explicitly separated prefix candidates, and the four productive page 16 endings. It compares printed word boundaries and case and asks about stated meanings/roles without selecting a replacement. Exact unqualified compliant forms stay quiet. An unfamiliar noun head does not suppress a source-form question. Protected source and existing precise findings take precedence. This does not prove semantic accuracy, recognize arbitrary misspellings or certify complete dictionary/entity authority or every application of the general prose rules.';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const fold=s=>s.replace(/[’‘]/gu,"'").replace(/[\u2010\u2011]/gu,'-').replace(/\s+/gu,' ').replace(/\s*-\s*/gu,'-').trim();
const overlaps=(ranges,a,b)=>ranges.some(r=>r.start<b&&r.end>a);
const prefixForms=new Set(['anti','bi','in','multi','non']);
const cache=new WeakMap();
const matcherCache=new WeakMap();
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
   for(const alternative of form.split(/\s+or\s+/u)){
    if(!/^[\p{L}\p{M}][\p{L}\p{M}\p{N}\s’',.-]*$/u.test(alternative))continue;
    const pattern=formPattern(alternative),key=pattern.toLowerCase();
    if(!groups.has(key))groups.set(key,{pattern,rows:[]});
    const group=groups.get(key);if(!group.rows.some(r=>r.id===row.id))group.rows.push(row);
   }
  }
 }
 const ordered=[...groups.values()].sort((a,b)=>b.pattern.length-a.pattern.length),byForm=new Map();
 for(const g of ordered)for(const row of g.rows)for(const form of [row.form,row.variant].filter(Boolean).flatMap(f=>f.split(/\s+or\s+/u))){
  const key=fold(form).toLowerCase().replace(/[\s-]/gu,'');
  const rows=byForm.get(key)||[];if(!rows.some(r=>r.id===row.id))rows.push(row);byForm.set(key,rows);
 }
 const value={byForm,matcher:createBoundedRegistryMatcher(ordered.map(g=>g.pattern),{prefix:'(?<![\\p{L}\\p{N}\\p{M}_-])',suffix:'(?![\\p{L}\\p{N}\\p{M}_-])'})};
 matcherCache.set(reference,value);return value;
}
export function lcbSourceReviewIssues(doc,references,{existingIssues=[]}={}){
 if(!references?.lcb?.pages)return [];
 const view=styleWordDivisionView(doc,{preserveRemainingWords:true}),d=view?.doc||doc;
 const prior=view?existingIssues.map(i=>({...i,start:view.toView(i.start),end:view.toView(i.end)})):existingIssues;
 const result=withStyleContext(d,()=>review(d,references,prior));
 return view?view.restore(result):result;
}
function review(doc,references,existingIssues){
 const ctx=styleContext(doc),source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx);
 const names=sourceNameRanges(source),single=styleSingleQuoteRanges(source),issues=[],candidates=[];
 const eligible=(start,end)=>!blocked(start,end)&&!literal(start,end)&&!cutsOriginalStyleWord(doc,start)&&!cutsOriginalStyleWord(doc,end)&&ctx.at(start)!=='Heading'&&!ctx.tableAt(start)&&!overlaps(names,start,end)&&!overlaps(single,start,end)&&!quoted({start,end})&&!/[\u2012-\u2015]/u.test(doc.text.slice(start,end));
 const add=(start,end,rows,reason,kind)=>{
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
  const exact=g.rows.filter(r=>fold(r.form).toLowerCase()===fold(m[0]).toLowerCase());
  // Some printed qualifications are directly observable and already settle
  // the form. Do not ask a reader seventy times to confirm a compliant bare
  // "court", or repeatedly question an intact correctly cased Section number.
  const after=source.slice(m.index+m[0].length),term=fold(m[0]);
  if(term==='court'&&exact.some(r=>r.text==='court (appearing alone)')&&!/^\s+of\s+appeals?\b/iu.test(after))continue;
  if(exact.some(r=>r.text==='Section (with number)')){
   const number=/^\s+\d+(?:\.\d+)*(?:\s*\([A-Za-z0-9]+\))*(?![\p{L}\p{N}\p{M}_])/u.exec(after);
   if(term==='Section'&&number&&!blocked(m.index,m.index+m[0].length+number[0].length))continue;
   if(term==='section'&&!/^\s+[\d(]/u.test(after))continue; // LCB17 item 5.
  }
  const constitutionalDocument=/(?:^|\n)\s*(?:ASSEMBLY|SENATE)\s+CONSTITUTIONAL\s+AMENDMENT\b/iu.test(source.slice(0,2000))||/\b(?:ACA|SCA)[\s_-]*\d/iu.test(doc.name||'');
  if(term==='state'&&ctx.at(m.index)==='Bill'&&exact.some(r=>r.text==='state (appearing alone in bill)')&&!constitutionalDocument)continue;
  // The reader must resolve a stated role/meaning. An exact plain spelling
  // is compliant with that finite source entry and does not need a question.
  const roles=g.rows.filter(r=>r.qualified),caseQuestion=g.rows.some(r=>/[A-Z]/u.test(r.form)&&fold(r.form)!==fold(m[0])&&fold(r.form).toLowerCase()===fold(m[0]).toLowerCase());
  if(exact.length&&!roles.length&&!caseQuestion)continue;
  candidates.push({start:m.index,end:m.index+m[0].length,rows:g.rows,reason:caseQuestion?'This occurrence differs from the capitalization of the complete printed form; confirm whether the listed expression is intended.':exact.length?'The listed meaning, role or capitalization condition has not been established for this occurrence.':'This occurrence has different word boundaries from the complete printed form; the appropriate role has not been established.'});
 }
 // Longest complete source phrases own contained lexical questions; never
 // turn an open exception into a warning about a shorter suffix.
 candidates.sort((a,b)=>a.start-b.start||b.end-a.end);
 for(const c of candidates)add(c.start,c.end,c.rows,c.reason,'source-entry-context');
 for(const m of source.matchAll(/(?<![\p{L}\p{N}\p{M}_-])(anti|bi|in|multi|non|ex|quasi|self)(?:[\u2010\u2011-]|\s+(?!(?:in)\b))([\p{Ll}][\p{Ll}\p{M}]+)(?![\p{L}\p{N}\p{M}_-])/gu)){
  const prefix=m[1];if(prefix==='in'&&!/[\u2010\u2011-]/u.test(m[0]))continue;
  if(prefix==='non'&&/^non\s+sequiturs?$/u.test(m[0])||prefix==='multi'&&/^multi\s+(?:ply|plies)$/u.test(m[0]))continue;
  if(['ex','quasi','self'].includes(prefix)&&/[\u2010\u2011-]/u.test(m[0]))continue;
  const row=lcbSourceReviewRows(references.lcb).find(r=>r.prefix&&r.form===prefix);
  const page8=references.lcb.pages.find(p=>p.page===8);
  const witness=row||(['ex','quasi','self'].includes(prefix)&&page8?.text.includes('quasi')?{id:'lcb-prefix-exceptions',page:8,text:page8.text.replace(/\s+/gu,' ').trim(),form:prefix}:null);
  if(witness)add(m.index,m.index+m[0].length,[witness],'An explicitly separated potential prefix needs review; root recognition cannot establish the spelling or meaning of the complete word.','prefix-context');
 }
 const page16=references.lcb.pages.find(p=>p.page===16);
 if(page16?.text.includes('unit modifier'))for(const m of source.matchAll(/(?<![\p{L}\p{N}\p{M}_-])\p{Ll}[\p{Ll}\p{M}]*(?:[\u2010\u2011-]|\s+)(adopted|approved|based|related)(?![\p{L}\p{N}\p{M}_-])/gu)){
  if(!page16.text.includes('-'+m[1]))continue;
  if(/^(?:the|a|an|this|that|these|those|each|any|all|some|is|are|was|were|be|been|being|has|have|had|may|shall|must|can|will|would|could|should|to|of|for|by|as|and|or|nor|not)\s/iu.test(m[0]))continue;
  add(m.index,m.index+m[0].length,[{id:'lcb-page16-'+m[1],page:16,text:'Use a hyphen when -'+m[1]+' is in the unit modifier position.',form:m[1]}],'The productive ending is present, but modifier position versus a finite verb or following phrase has not been established.','productive-ending-context');
 }
 return issues.sort((a,b)=>a.start-b.start||a.end-b.end);
}
