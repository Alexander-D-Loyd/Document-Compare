import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
import {numericExpressionGuard} from './style-numeric-expression-evidence.mjs';
import {writtenQuantityEvidenceGuard} from './style-written-quantity-evidence.mjs';
import {andCardinalParts} from './style-compound-cardinals.mjs';
import {ones,tens,canonicalWrittenValue} from './style-cardinal-values.mjs';
const cardinalWord='(?:'+[...ones,...tens.slice(2),'hundred','thousand','million','billion','trillion'].join('|')+')';
const writtenStart=new RegExp('^'+cardinalWord+'(?:[\\s-]+'+cardinalWord+')*(?![\\p{L}\\p{N}\\p{M}_])','iu');
const labels=/(?<![\p{L}\p{N}\p{M}_])(?<label>Sections?|Articles?|Chapters?|Parts?|Divisions?|Paragraphs?|Subparagraphs?|Subdivisions?)\s+/giu;
const join=/^\s*(?:,\s*(?:(?:and|or)\s+)?|(?:and|or|to|through)\s+)/i;
const terminal=/^\s*(?:[,;.)]|$)|^\s+(?:of|in|under|pursuant|apply|applies|provide|provides|govern|governs|shall|must|may|will|are|is|as|that|which|have|has|relating|commencing|above|below|inclusive|et\s+seq)\b/i;
const constitution=/^\s+of\s+(?:the\s+)?(?:(?:California|United\s+States|federal|state)\s+)?Constitution(?:\s+of\s+(?:the\s+)?State\s+of\s+California)?\b/i;
const intersects=(rows,start,end)=>rows.some(r=>r.start<end&&r.end>start);
export const LCB_REFERENCE_CHAIN_SCOPE='Complete source-anchored legal-reference chains check canonical written serial numbers after Section, Chapter, Part, Division, Paragraph and related structural labels, including mixed figure/word lists, direct ranges and parenthesized suffixes. Every connecting source word and label is intact evidence; each changed number retains its exact original selection. Existing precise checks retain precedence. Ordinary quantities, unresolved terminal nouns, malformed numerical expressions, source strikes, literals, tables, headings, unknown exclusions and Unicode fragments are protected. Explicit constitutional Article references receive identity review rather than an asserted Arabic replacement; existing Roman forms remain clear. LCB’s exact Fourteenth Amendment example has a precise figure-ordinal check. This checks notation and source-listed examples, not legal cross-reference validity or general constitutional identity.';

function referenceChains(doc,ctx){
 const source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),numeric=numericExpressionGuard(doc,ctx),written=writtenQuantityEvidenceGuard(doc,ctx),scales=new Map(andCardinalParts(source).map(r=>[r.start,r])),chains=[];
 const atomAt=at=>{
  const gap=/^\s*/.exec(source.slice(at))[0].length,start=at+gap;
  const f=/^\d+(?:\.\d+)*(?![\p{L}\p{N}\p{M}_])/u.exec(source.slice(start));
  let numberEnd,value,figure;
  if(f){numberEnd=start+f[0].length;value=Number(f[0]);figure=true;if(numeric(start,numberEnd))return null;}
  else{
   const scale=scales.get(start),m=scale?null:writtenStart.exec(source.slice(start));
   if(scale){if(scale.value===null)return null;numberEnd=scale.end;value=scale.value;}
   else{if(!m)return null;numberEnd=start+m[0].length;value=canonicalWrittenValue(m[0]);}
   figure=false;if(value===null||written(start,numberEnd))return null;
  }
  const suffix=/^(?:\s*\([A-Za-z0-9]+\))*/.exec(source.slice(numberEnd))[0];
  const end=numberEnd+suffix.length;
  if(cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,numberEnd)||blocked(start,end))return null;
  return {start,end,numberEnd,value,figure,text:doc.text.slice(start,numberEnd)};
 };
 for(const m of source.matchAll(labels)){
  let atom=atomAt(m.index+m[0].length);if(!atom)continue;
  const members=[atom],connectors=[];let end=atom.end;
  while(true){const connector=join.exec(source.slice(end));if(!connector)break;const next=atomAt(end+connector[0].length);if(!next)break;connectors.push(connector[0]);members.push(next);end=next.end;}
  // Constitutional Articles may have an independently spaced letter suffix.
  const letter=/^\s+[A-Z](?![\p{L}\p{N}\p{M}_])/u.exec(source.slice(end)),extended=end+(letter?.[0].length||0),constitutional=m.groups.label.toLowerCase().replace(/s$/,'')==='article'&&constitution.exec(source.slice(extended));
  const evidenceEnd=constitutional?extended+constitutional[0].length:end;
  if(!constitutional&&!terminal.test(source.slice(end)))continue;
  if(ctx.at(m.index)==='Heading'||cutsOriginalStyleWord(doc,m.index)||blocked(m.index,evidenceEnd))continue;
  chains.push({start:m.index,end:evidenceEnd,label:m.groups.label,members,connectors,constitutional:!!constitutional,suffix:letter?.[0].trim()||null});
 }
 return chains;
}
function review(doc,references,existingIssues,kind){
 const ctx=styleContext(doc),issues=[],chains=referenceChains(doc,ctx);
 for(const chain of chains)for(const member of chain.members){
  const {start,numberEnd:end}=member;
  if(kind==='precise'){
   if(chain.constitutional||/^(?:subdivisions?|subparagraphs?)$/i.test(chain.label)||member.figure||!Number.isSafeInteger(member.value)||intersects(existingIssues,start,end))continue;
   const suggestion=String(member.value);
   const message='LCB uses figures for numbered Code references. This written number belongs to the same explicitly labelled reference chain; preserve its structural suffix and change only the number.';
   issues.push({start,end,text:doc.text.slice(start,end),suggestion,rule:'Numerals: Code Sections and Constitution',guideId:'lcb',guidePage:22,guidePrintedPage:'22',category:'Reference Numeral Form',context:ctx.at(start),confidence:'Rule check',reviewSuggested:false,checkId:'lcb-reference-chain',conflict:false,matchesPrimary:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',rule:'Numerals: Code Sections and Constitution',guidePage:22,guidePrintedPage:String(references.lcb.pages[21].printedPage),preferred:suggestion,ruleText:'Sections 123 and 124; Section 123 or 124; Sections 123 to 130, inclusive.'},{guideId:'gpo',guideName:'GPO Style Manual',rule:'12.7',guidePage:288,guidePrintedPage:String(references.gpo.pages[287].printedPage),preferred:suggestion,ruleText:'Figures are used for serial numbers.'}]});
  }else if(kind==='structural'&&!member.figure&&/^(?:subdivisions?|subparagraphs?)$/i.test(chain.label)){
   issues.push({start,end,text:doc.text.slice(start,end),suggestion:null,rule:'Numerals: Code Sections and Constitution',guideId:'lcb',guidePage:22,guidePrintedPage:'22',category:'Reference Identity Review',context:ctx.at(start),confidence:'Review Suggested',reviewSuggested:true,reviewKind:'reference-identity',checkId:'lcb-reference-identity-review',supersedesCheckIds:['numerals'],conflict:false,matchesPrimary:false,message:'Review Suggested: This written number is a structural reference. Verify the identifier and any required parenthesized or letter notation against the cited provision. LCB’s figure examples do not establish the correct subdivision identifier. No replacement has been selected.',references:[{guideId:'lcb',guideName:'LCB Style Manual',rule:'Numerals: Code Sections and Constitution',guidePage:22,guidePrintedPage:String(references.lcb.pages[21].printedPage),preferred:null,ruleText:'Sections 123 and 124; Section 123 or 124; Sections 123 to 130, inclusive.'}]});
  }else if(kind==='constitutional'&&chain.constitutional){
   const message='Review Suggested: Verify this constitutional Article identifier against the cited Constitution. LCB displays “Article XIII B”; constitutional identifiers may require Roman notation and a letter suffix. An Arabic conversion alone does not establish the correct legal identifier. No replacement has been selected.';
   issues.push({start,end,text:doc.text.slice(start,end),suggestion:null,rule:'Numerals: Code Sections and Constitution',guideId:'lcb',guidePage:22,guidePrintedPage:'22',category:'Constitutional Reference Review',context:ctx.at(start),confidence:'Review Suggested',reviewSuggested:true,reviewKind:'constitutional-reference',checkId:'lcb-constitutional-reference-review',supersedesCheckIds:['numerals'],conflict:false,matchesPrimary:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',rule:'Numerals: Code Sections and Constitution',guidePage:22,guidePrintedPage:String(references.lcb.pages[21].printedPage),preferred:null,ruleText:'Article XIII B.'}]});
  }
 }
 if(kind==='plural')for(const chain of chains){
  if(/s$/i.test(chain.label)||chain.members.length<2||!chain.connectors.some(c=>/\b(?:and|to|through)\b/i.test(c)))continue;
  const start=chain.start,end=start+chain.label.length;if(intersects(existingIssues,start,end))continue;
  issues.push({start,end,text:doc.text.slice(start,end),suggestion:null,conditionalSuggestion:chain.label+'s',rule:'Numerals: Code Sections and Constitution',guideId:'lcb',guidePage:22,guidePrintedPage:'22',category:'Coordinated Reference Review',context:ctx.at(start),confidence:'Review Suggested',reviewSuggested:true,reviewKind:'reference-number-agreement',checkId:'lcb-reference-number-agreement-review',conflict:false,matchesPrimary:false,message:'Review Suggested: A singular structural label introduces multiple identifiers joined by “and” or a range. LCB distinguishes “Sections 123 and 124” and “Sections 123 to 130” from the permitted alternative “Section 123 or 124”. Verify whether this coordinated reference requires a plural label; no replacement has been selected.',references:[{guideId:'lcb',guideName:'LCB Style Manual',rule:'Numerals: Code Sections and Constitution',guidePage:22,guidePrintedPage:String(references.lcb.pages[21].printedPage),preferred:null,ruleText:'Sections 123 and 124; Section 123 or 124; Sections 123 to 130, inclusive.'}]});
 }
 if(kind==='precise')for(const m of ctx.source.matchAll(/(?<![\p{L}\p{N}\p{M}_])(?<term>14th)\s+Amendment\s+to\s+the\s+United\s+States\s+Constitution\b/giu)){
  const start=m.index,end=start+m.groups.term.length,blocked=styleEvidenceGuard(doc,ctx);
  if(ctx.at(start)==='Heading'||cutsOriginalStyleWord(doc,start)||blocked(m.index,m.index+m[0].length)||intersects(existingIssues,start,end))continue;
  issues.push({start,end,text:doc.text.slice(start,end),suggestion:'Fourteenth',rule:'Numerals: Code Sections and Constitution',guideId:'lcb',guidePage:22,guidePrintedPage:'22',category:'Named Constitutional Amendment',context:ctx.at(start),confidence:'Rule check',checkId:'lcb-named-amendment',conflict:false,matchesPrimary:false,message:'LCB explicitly lists “Fourteenth Amendment to the United States Constitution”. Preserve the named amendment’s written ordinal.',references:[{guideId:'lcb',guideName:'LCB Style Manual',rule:'Numerals: Code Sections and Constitution',guidePage:22,guidePrintedPage:'22',preferred:'Fourteenth',ruleText:'Fourteenth Amendment to the United States Constitution.'},{guideId:'gpo',guideName:'GPO Style Manual',rule:'12.19',guidePage:295,guidePrintedPage:String(references.gpo.pages[294].printedPage),preferred:'Fourteenth',ruleText:'Numbers appearing as part of proper names or in connection with serious and dignified subjects and formal writing are spelled out.'}]});
 }
 return issues.sort((a,b)=>a.start-b.start||a.end-b.end);
}
function run(doc,references,options,kind){
 if(!references?.lcb?.pages||!references?.gpo?.pages)return [];
 const view=styleWordDivisionView(doc),reviewDoc=view?.doc||doc,existing=options.existingIssues||[],prior=view?existing.map(i=>({...i,start:view.toView(i.start),end:view.toView(i.end)})):existing;
 const issues=withStyleContext(reviewDoc,()=>review(reviewDoc,references,prior,kind));return view?view.restore(issues):issues;
}
export const lcbReferenceChainIssues=(doc,references,options={})=>run(doc,references,options,'precise');
export const lcbConstitutionalReferenceReviewIssues=(doc,references,options={})=>run(doc,references,options,'constitutional');
export const lcbStructuralReferenceReviewIssues=(doc,references,options={})=>run(doc,references,options,'structural');
export const lcbCoordinatedReferenceReviewIssues=(doc,references,options={})=>run(doc,references,options,'plural');
// These source-bound protection ranges apply even when reader-review suggestions are hidden.
export const lcbReferenceIdentityProtectionRanges=(doc,references)=>[...lcbConstitutionalReferenceReviewIssues(doc,references),...lcbStructuralReferenceReviewIssues(doc,references)].map(({start,end,supersedesCheckIds})=>({start,end,supersedesCheckIds}));
