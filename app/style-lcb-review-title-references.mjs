import {styleContext,withStyleContext}from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext}from './style-evidence.mjs';
import {styleWordDivisionView}from './style-word-divisions.mjs';
import {lcbCreatedOfficialTitleRecords}from './style-lcb-review-created-titles.mjs';

export const LCB_CREATED_TITLE_REFERENCE_REVIEW_SCOPE='After an intact explicit creation of a correctly capitalized multiword Fund/Account in the State Treasury or General Fund, later exact complete title references can receive reader review when an important source word/component begins in lowercase despite its creation witness. Whole spelling, word identity and hyphen boundaries must agree; only first-letter case is checked. Grammatical hyphens survive intact line wrapping with original component coordinates. The document-local creation clause is evidence, not an official-name registry or a replacement. Generic/short/different titles, recognized adjacent larger-name extensions, earlier references, conflicting creation capitalization, same-title renaming, historical provenance, literal titles, headings, tables, source strikes and uncertain exclusions are protected. Complex jurisdictional qualifiers, other titles, uncreated names, broader references and legal identity changes remain unresolved.';
const little=new Set('a an and as at by for from in into of on or the to with'.split(' '));
const prefixCues=new Set([...little,...'under through within without via regarding concerning towards toward versus than shall must may will would should can could is are was were be been has have had means called named deposits deposit deposited allocate allocates allocated appropriate appropriates appropriated receive receives received transfer transfers transferred establish establishes established create creates created supports support supported includes include included administer administers administered use uses used'.split(' ')]);
const logical=s=>s.replace(/[’‘]/g,"'").replace(/[‐‑]/g,'-').replace(/-[ \t]*\n\s*/g,'-').replace(/\s+/g,' ');
const fold=s=>logical(s).trim().toLowerCase();
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const intersect=(rows,start,end)=>rows.some(r=>r.start<end&&r.end>start);
const titleTokens=s=>s.trim().split(/\s+/);
const fixedWord=s=>escape(s).replace(/[’']/g,"[’']").replace(/-/g,'-(?:[ \\t]*\\n\\s*)?');
const lexicalWords=s=>[...s.matchAll(/[A-Za-z0-9]+(?:-(?:[ \t]*\n\s*)?[A-Za-z0-9]+|[’'][A-Za-z0-9]+)*/gu)];
const caseSignature=s=>titleTokens(s).filter(w=>!little.has(w.toLowerCase())).map(w=>w.split('-').map(p=>p[0]).join('-')).join(' ');
const correctlyCapitalized=s=>titleTokens(s).filter(w=>!little.has(w.toLowerCase())).every(w=>!/[A-Za-z]/.test(w[0])||/[A-Z]/.test(w[0]));
const titlePattern=name=>new RegExp('(?<![\\p{L}\\p{N}\\p{M}_-])'+titleTokens(logical(name)).map(fixedWord).join('\\s+')+'(?![\\p{L}\\p{N}\\p{M}_-])','giu');
const provenance=/\b(?:(?:previous|prior|former|legacy|old|original)\s+(?:statute|law|title|name|text|wording|definition)[^.?!;]{0,90}|(?:formerly|previously)\s+(?:known|called|named)(?:\s+as)?\s+(?:the\s+)?)$/iu;

function renamed(doc,ctx,name,blocked){
 for(const m of ctx.source.matchAll(titlePattern(name))){
  const start=m.index,end=start+m[0].length,before=ctx.source.slice(Math.max(0,start-100),start),after=ctx.source.slice(end,end+120),suffix=/^\s+(?:(?:is|was|shall|will|must)\s+(?:be\s+)?)?(?:hereby\s+)?renamed\b/iu.exec(after),prefix=/\brenamed(?:\s+(?:to|as))?\s+(?:the\s+)?$/iu.exec(before);
  const evidenceStart=prefix?start-before.length+prefix.index:start,evidenceEnd=suffix?end+suffix[0].length:end;
  if((prefix||suffix)&&!blocked(evidenceStart,evidenceEnd))return true;
 }
 return false;
}
function firstLetterDifferences(canonical,actual,start){
 const wanted=titleTokens(canonical),sourceWords=lexicalWords(actual),found=sourceWords.map(m=>logical(m[0])),changed=[];
 if(wanted.length!==found.length)return [];
 for(let n=0;n<wanted.length;n++){
  if(little.has(wanted[n].toLowerCase()))continue;
  const a=wanted[n].split('-'),b=found[n].split('-');if(a.length!==b.length)return [];
  const sourceComponents=[...sourceWords[n][0].matchAll(/[A-Za-z0-9]+(?:[’'][A-Za-z0-9]+)*/gu)];
  for(let p=0;p<a.length;p++)if(/[A-Z]/.test(a[p][0]||'')&&/[a-z]/.test(b[p][0]||'')){const componentStart=start+sourceWords[n].index+sourceComponents[p].index;changed.push({canonical:a[p],actual:b[p],wordIndex:n,componentIndex:p,start:componentStart,end:componentStart+b[p].length});}
 }
 return changed;
}
function caseCorrectionOwns(source,existing,component){
 return existing.some(i=>{if(typeof i.suggestion!=='string'||i.reviewSuggested||i.start>component.start||i.end<=component.start)return false;const raw=source.slice(i.start,i.end),index=logical(raw.slice(0,component.start-i.start)).length;return fold(raw)===fold(i.suggestion)&&logical(i.suggestion)[index]===component.canonical[0];});
}
function detector(doc,references,options){
 const ctx=styleContext(doc),source=ctx.source,original=originalBodyStyleContext(doc)?.source||source,blocked=styleEvidenceGuard(doc,ctx),existing=options.existingIssues||[],records=(options.recordProvider||lcbCreatedOfficialTitleRecords)(doc,references),groups=new Map(),singleQuotes=[...source.matchAll(/‘[^’]*’|(?<![\p{L}\p{N}\p{M}_])'[^'\n]*'/gu)].map(m=>({start:m.index,end:m.index+m[0].length})),issues=[];
 for(const record of records){const key=fold(record.name);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(record);}
 // Original body text supplies only negative containment evidence. Damage to
 // a longer title's prefix cannot turn its intact suffix into another title.
 const knownTitleMatches=[...groups.values()].flatMap(same=>[...new Set([source,original])].flatMap(body=>[...body.matchAll(titlePattern(same[0].name))].map(m=>({start:m.index,end:m.index+m[0].length}))));
 for(const same of groups.values()){
  if(same.some(r=>!correctlyCapitalized(r.name))||new Set(same.map(r=>caseSignature(r.name))).size!==1)continue;
  const canonical=same[0].name;if(renamed(doc,ctx,canonical,blocked))continue;
  for(const m of source.matchAll(titlePattern(canonical))){
   const start=m.index,end=start+m[0].length,witness=[...same].reverse().find(r=>r.evidenceEnd<=start);if(!witness)continue;
   if(knownTitleMatches.some(r=>r.start<=start&&r.end>=end&&(r.start<start||r.end>end))||ctx.at(start)==='Heading'||blocked(start,end)||intersect(singleQuotes,start,end)||intersect(records.map(r=>({start:r.evidenceStart,end:r.evidenceEnd})),start,end)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||issues.some(i=>i.start<end&&i.end>start))continue;
   const before=original.slice(Math.max(0,start-180),start),after=original.slice(end,end+100),prior=/([\p{L}\p{N}\p{M}]+(?:[-’'][\p{L}\p{N}\p{M}]+)*)\s+$/u.exec(before);
   // No title suffix may be taken from a larger name, including lowercase
   // extra words. An intact ordinary preposition/article/verb separates the
   // exact reference from preceding prose; punctuation is also a boundary.
   if(prior&&!prefixCues.has(prior[1].toLowerCase())||provenance.test(before)||/^\s+(?:(?:of|for|the|and|in|on)\s+)?[A-Z][a-z]/.test(after)||/^\s+(?:advisory\s+)?(?:committee|commission|board|foundation|association|program)\b/iu.test(after))continue;
   const titleWitness={name:witness.name,start:witness.start,end:witness.end,text:doc.text.slice(witness.start,witness.end),evidenceStart:witness.evidenceStart,evidenceEnd:witness.evidenceEnd,declarationText:doc.text.slice(witness.evidenceStart,witness.evidenceEnd),evidenceText:witness.evidenceText,sourceKind:witness.sourceKind||'Document-local guarded creation clause'};
   if(options.protectionOnly){issues.push({start,end,text:doc.text.slice(start,end),titleWitness,supersedesCheckIds:['lcb-prefixes']});continue;}
   const changed=firstLetterDifferences(canonical,m[0],start).filter(component=>!caseCorrectionOwns(source,existing,component));if(!changed.length)continue;
   issues.push({start,end,text:doc.text.slice(start,end),suggestion:null,guideId:'lcb',guidePage:17,guidePrintedPage:String(references.lcb.pages[16].printedPage),rule:'Capitalization, item 2',category:options.category||'Created Title Reference Review',context:ctx.at(start),confidence:'Review Suggested',reviewSuggested:true,reviewKind:'created-title-reference',checkId:options.checkId||'lcb-created-title-reference-review',conflict:false,matchesPrimary:false,titleWitness,titleCaseEvidence:changed,message:options.referenceMessage?options.referenceMessage(witness):'Review Suggested: This later complete title has the same words and hyphen boundaries as “'+witness.name+'” in an earlier intact creation clause, but an important word/component now begins in lowercase. LCB capitalizes official account and fund titles. Confirm that this reference denotes that same official title and retains its intended spelling. The creation is document-local evidence, not a legal identity decision or permanent registry; no replacement is asserted.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:17,guidePrintedPage:String(references.lcb.pages[16].printedPage),rule:'Capitalization, item 2',preferred:null,ruleText:'Capitalize official titles of accounts, acts, codes, funds, laws, etc.'}]});
  }
 }
 return issues.sort((a,b)=>a.start-b.start||a.end-b.end);
}
function sourceResults(doc,references,options={}){
 if(!references?.lcb?.pages?.[16])return [];
 const view=styleWordDivisionView(doc),reviewDoc=view?.doc||doc,existing=options.existingIssues||[],prior=view?existing.map(i=>({...i,start:view.toView(i.start),end:view.toView(i.end)})):existing,found=withStyleContext(reviewDoc,()=>detector(reviewDoc,references,{...options,existingIssues:prior}));
 if(!view)return found;
 return view.restore(found).map(i=>{const w=i.titleWitness,start=view.toSource(w.start),end=view.toSource(w.end,true),evidenceStart=view.toSource(w.evidenceStart),evidenceEnd=view.toSource(w.evidenceEnd,true);return {...i,...(i.titleCaseEvidence?{titleCaseEvidence:i.titleCaseEvidence.map(c=>({...c,start:view.toSource(c.start),end:view.toSource(c.end,true)}))}:{}),titleWitness:{...w,start,end,evidenceStart,evidenceEnd,text:doc.text.slice(start,end),declarationText:doc.text.slice(evidenceStart,evidenceEnd)}};});
}
export function lcbCreatedTitleReferenceReviewIssues(doc,references,options={}){return sourceResults(doc,references,options);}
export function lcbCreatedTitleReferenceProtectionRanges(doc,references){return sourceResults(doc,references,{protectionOnly:true});}
