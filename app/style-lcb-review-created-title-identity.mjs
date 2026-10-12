import {styleContext,withStyleContext}from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext}from './style-evidence.mjs';
import {styleWordDivisionView}from './style-word-divisions.mjs';
import {lcbCreatedOfficialTitleRecords}from './style-lcb-review-created-titles.mjs';

export const LCB_CREATED_TITLE_IDENTITY_REVIEW_SCOPE='An intact explicitly created, properly capitalized multiword Fund/Account supplies document-local identity evidence. A later complete same-word-count title may receive reader review if its first two whole words and terminal Fund/Account agree exactly apart from case, and exactly one internal nonnumeric lexical word of at least four letters differs by one letter insertion, deletion, substitution or adjacent transposition. Hyphen/apostrophe boundaries remain the same. No replacement, legal identity or spelling error is asserted. Exact/case-only references, separately created near names, ambiguous competing witnesses, renamed/historical names, recognized adjacent larger-name extensions, literal titles, tables, headings, strikes and uncertain source evidence are protected. Complex jurisdictional qualifiers, other title shapes, changes in multiple words, external official names and unfamiliar legal identity remain unresolved.';
const little=new Set('a an and as at by for from in into of on or the to with'.split(' '));
const prefixCues=new Set([...little,...'under through within without via regarding concerning towards toward versus than shall must may will would should can could is are was were be been has have had means called named deposits deposit deposited allocate allocates allocated appropriate appropriates appropriated receive receives received transfer transfers transferred establish establishes established create creates created supports support supported includes include included administer administers administered use uses used'.split(' ')]);
const token="[A-Za-z]+(?:-(?:[ \\t]*\\n\\s*)?[A-Za-z]+|[’'][A-Za-z]+)*";
const fold=s=>s.replace(/[’‘]/g,"'").replace(/[‐‑]/g,'-').replace(/-[ \t]*\n\s*/g,'-').replace(/\s+/g,' ').trim().toLowerCase();
const words=s=>s.trim().split(/\s+/);
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const fixedWord=s=>escape(s).replace(/[’']/g,"[’']").replace(/-/g,'-(?:[ \\t]*\\n\\s*)?');
const lexicalWords=s=>[...s.matchAll(/[A-Za-z0-9]+(?:-(?:[ \t]*\n\s*)?[A-Za-z0-9]+|[’'][A-Za-z0-9]+)*/gu)];
const logicalWord=s=>s.replace(/-[ \t]*\n\s*/g,'-');
const overlaps=(rows,start,end)=>rows.some(r=>r.start<end&&r.end>start);
const signature=s=>words(s).filter(w=>!little.has(w.toLowerCase())).map(w=>w.split('-').map(p=>p[0]).join('-')).join(' ');
const proper=s=>words(s).filter(w=>!little.has(w.toLowerCase())).every(w=>!/[A-Za-z]/.test(w[0])||/[A-Z]/.test(w[0]));
const whole=name=>new RegExp('(?<![\\p{L}\\p{N}\\p{M}_-])'+words(name).map(fixedWord).join('\\s+')+'(?![\\p{L}\\p{N}\\p{M}_-])','giu');
function candidatePattern(name){const parts=words(name);return new RegExp('(?<![\\p{L}\\p{N}\\p{M}_-])'+parts.map((w,n)=>n<2||n===parts.length-1?fixedWord(w):token).join('\\s+')+'(?![\\p{L}\\p{N}\\p{M}_-])','giu');}
function oneLetter(a,b){
 a=a.toLowerCase();b=b.toLowerCase();if(a===b||!/^[a-z]+$/.test(a)||!/^[a-z]+$/.test(b)||Math.abs(a.length-b.length)>1)return false;
 if(a.length===b.length){const changed=[];for(let n=0;n<a.length;n++)if(a[n]!==b[n])changed.push(n);return changed.length===1||changed.length===2&&changed[1]===changed[0]+1&&a[changed[0]]===b[changed[1]]&&a[changed[1]]===b[changed[0]];}
 const shorter=a.length<b.length?a:b,longer=a.length<b.length?b:a;let lo=0,hi=0,skips=0;while(lo<shorter.length&&hi<longer.length){if(shorter[lo]===longer[hi]){lo++;hi++;}else {if(++skips>1)return false;hi++;}}return true;
}
function difference(canonical,actual,start){
 const wanted=words(canonical),locations=lexicalWords(actual),found=locations.map(m=>logicalWord(m[0]));if(wanted.length<4||wanted.length!==found.length||fold(wanted[0])!==fold(found[0])||fold(wanted[1])!==fold(found[1])||fold(wanted.at(-1))!==fold(found.at(-1)))return null;
 const changed=[];for(let n=2;n<wanted.length-1;n++)if(fold(wanted[n])!==fold(found[n]))changed.push(n);if(changed.length!==1)return null;
 const index=changed[0],a=wanted[index],b=found[index];if(a.replace(/[-’']/g,'').length<4||b.replace(/[-’']/g,'').length<4||little.has(a.toLowerCase())||little.has(b.toLowerCase()))return null;
 const aa=a.split(/[-’']/),bb=b.split(/[-’']/);if(aa.length!==bb.length||a.match(/[-’']/g)?.map(fold).join('')!==b.match(/[-’']/g)?.map(fold).join(''))return null;
 const components=aa.map((v,n)=>fold(v)===fold(bb[n])?null:n).filter(n=>n!==null);if(components.length!==1||!oneLetter(aa[components[0]],bb[components[0]]))return null;
 const wordStart=start+locations[index].index;return {canonical:a,actual:b,wordIndex:index,start:wordStart,end:wordStart+locations[index][0].length};
}
const history=/\b(?:(?:previous|prior|former|legacy|old|original)\s+(?:statute|law|title|name|text|wording|definition)[^.?!;]{0,90}|(?:formerly|previously)\s+(?:known|called|named)(?:\s+as)?\s+(?:the\s+)?)$/iu;
function renamed(source,name,blocked){for(const m of source.matchAll(whole(name))){const start=m.index,end=start+m[0].length,before=source.slice(Math.max(0,start-100),start),after=source.slice(end,end+100),right=/^\s+(?:(?:is|was|shall|will|must)\s+(?:be\s+)?)?(?:hereby\s+)?renamed\b/iu.exec(after),left=/\brenamed(?:\s+(?:to|as))?\s+(?:the\s+)?$/iu.exec(before);if((left||right)&&!blocked(left?start-before.length+left.index:start,right?end+right[0].length:end))return true;}return false;}
function caseOrSpellingCorrectionOwns(doc,existing,changed){return existing.some(i=>{if(i.reviewSuggested||typeof i.suggestion!=='string'||i.start!==changed.start||i.end!==changed.end)return false;return fold(i.suggestion)===fold(changed.canonical);});}
function detector(doc,references,existing){
 const ctx=styleContext(doc),source=ctx.source,original=originalBodyStyleContext(doc)?.source||source,blocked=styleEvidenceGuard(doc,ctx),records=lcbCreatedOfficialTitleRecords(doc,references),groups=new Map(),allNames=new Set(records.map(r=>fold(r.name))),quoted=[...source.matchAll(/‘[^’]*’|(?<![\p{L}\p{N}\p{M}_])'[^'\n]*'/gu)].map(m=>({start:m.index,end:m.index+m[0].length})),issues=[],proposals=new Map();
 for(const r of records){const key=fold(r.name);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 const knownLarger=[...groups.values()].flatMap(same=>words(same[0].name).length>=4?[...new Set([source,original])].flatMap(body=>[...body.matchAll(candidatePattern(same[0].name))].map(m=>({start:m.index,end:m.index+m[0].length}))):[]);
 for(const same of groups.values()){
  const canonical=same[0].name;if(words(canonical).length<4||same.some(r=>!proper(r.name))||new Set(same.map(r=>signature(r.name))).size!==1||renamed(source,canonical,blocked))continue;
  const matches=[...source.matchAll(candidatePattern(canonical))],separatelyCreated=new Set();
  for(const m of matches){const suffix=/^\s+(?:is|was|shall\s+be|will\s+be)\s+(?:hereby\s+)?(?:created|established|renamed)\b/iu.exec(source.slice(m.index+m[0].length,m.index+m[0].length+80));if(suffix&&!blocked(m.index,m.index+m[0].length+suffix[0].length))separatelyCreated.add(fold(m[0]));}
  for(const m of matches){
   const start=m.index,end=start+m[0].length,witness=[...same].reverse().find(r=>r.evidenceEnd<=start),changed=difference(canonical,m[0],start);if(!witness||!changed||allNames.has(fold(m[0]))||separatelyCreated.has(fold(m[0]))||renamed(source,m[0],blocked))continue;
   if(knownLarger.some(r=>r.start<=start&&r.end>=end&&(r.start<start||r.end>end))||ctx.at(start)==='Heading'||blocked(start,end)||overlaps(quoted,start,end)||overlaps(records.map(r=>({start:r.evidenceStart,end:r.evidenceEnd})),start,end)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||caseOrSpellingCorrectionOwns(doc,existing,changed))continue;
   const before=original.slice(Math.max(0,start-180),start),after=original.slice(end,end+100),prior=/([\p{L}\p{N}\p{M}]+(?:[-’'][\p{L}\p{N}\p{M}]+)*)\s+$/u.exec(before);if(prior&&!prefixCues.has(prior[1].toLowerCase())||history.test(before)||/^\s+(?:(?:of|for|the|and|in|on)\s+)?[A-Z][a-z]/.test(after)||/^\s+(?:advisory\s+)?(?:committee|commission|board|foundation|association|program)\b/iu.test(after))continue;
   const key=start+':'+end;if(!proposals.has(key))proposals.set(key,[]);proposals.get(key).push({start,end,witness,changed});
  }
 }
 for(const proposalsAt of proposals.values()){
  const witnesses=new Set(proposalsAt.map(p=>fold(p.witness.name)));if(witnesses.size!==1)continue;const {start,end,witness,changed}=proposalsAt[0],titleWitness={name:witness.name,start:witness.start,end:witness.end,text:doc.text.slice(witness.start,witness.end),evidenceStart:witness.evidenceStart,evidenceEnd:witness.evidenceEnd,declarationText:doc.text.slice(witness.evidenceStart,witness.evidenceEnd),evidenceText:witness.evidenceText,sourceKind:'Document-local guarded creation clause'};changed.sourceText=doc.text.slice(changed.start,changed.end);
  issues.push({start,end,text:doc.text.slice(start,end),suggestion:null,guideId:'lcb',guidePage:17,guidePrintedPage:String(references.lcb.pages[16].printedPage),rule:'Capitalization, item 2',category:'Created Title Identity Review',context:ctx.at(start),confidence:'Review Suggested',reviewSuggested:true,reviewKind:'created-title-identity',checkId:'lcb-created-title-identity-review',conflict:false,matchesPrimary:false,titleWitness,titleIdentityEvidence:changed,message:'Review Suggested: This complete later Fund/Account name retains the first two words and final title type of “'+witness.name+'” in an intact creation clause, but one internal word differs by a single letter edit or adjacent transposition. Confirm the intended title and legal reference. The creation is document-local evidence; similar spelling does not establish the same legal entity or a spelling error, and no replacement is asserted.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:17,guidePrintedPage:String(references.lcb.pages[16].printedPage),rule:'Capitalization, item 2',preferred:null,ruleText:'Capitalize official titles of accounts, acts, codes, funds, laws, etc.'}]});
 }
 return issues.sort((a,b)=>a.start-b.start||a.end-b.end);
}
export function lcbCreatedTitleIdentityReviewIssues(doc,references,{existingIssues=[]}={}){
 if(!references?.lcb?.pages?.[16])return [];const view=styleWordDivisionView(doc),reviewDoc=view?.doc||doc,existing=view?existingIssues.map(i=>({...i,start:view.toView(i.start),end:view.toView(i.end)})):existingIssues,found=withStyleContext(reviewDoc,()=>detector(reviewDoc,references,existing));if(!view)return found;
 return view.restore(found).map(i=>{const w=i.titleWitness,start=view.toSource(w.start),end=view.toSource(w.end,true),evidenceStart=view.toSource(w.evidenceStart),evidenceEnd=view.toSource(w.evidenceEnd,true),c=i.titleIdentityEvidence,componentStart=view.toSource(c.start),componentEnd=view.toSource(c.end,true);return {...i,titleIdentityEvidence:{...c,start:componentStart,end:componentEnd,sourceText:doc.text.slice(componentStart,componentEnd)},titleWitness:{...w,start,end,evidenceStart,evidenceEnd,text:doc.text.slice(start,end),declarationText:doc.text.slice(evidenceStart,evidenceEnd)}};});
}
// Protect only an unchanged whole hyphenated source word. A nearby identity
// review is not authority to change any other word or settle legal identity.
export function lcbCreatedTitleIdentityProtectionRanges(doc,references){
 if(!references?.lcb?.pages?.[16])return [];const view=styleWordDivisionView(doc),reviewDoc=view?.doc||doc;
 const ranges=withStyleContext(reviewDoc,()=>{const source=styleContext(reviewDoc).source,found=detector(reviewDoc,references,[]),out=[];for(const issue of found){const canonical=words(issue.titleWitness.name),actual=lexicalWords(source.slice(issue.start,issue.end));for(let n=0;n<canonical.length;n++){if(n===issue.titleIdentityEvidence.wordIndex||!canonical[n].includes('-')||fold(canonical[n])!==fold(actual[n]?.[0]||''))continue;const start=issue.start+actual[n].index,end=start+actual[n][0].length;out.push({start,end,text:reviewDoc.text.slice(start,end),canonicalWord:canonical[n],titleWitness:issue.titleWitness,supersedesCheckIds:['lcb-prefixes'],sourceKind:'Unchanged hyphenated word within guarded document-local title consistency review'});}}return out;});
 if(!view)return ranges;
 return view.restore(ranges).map(i=>{const w=i.titleWitness,start=view.toSource(w.start),end=view.toSource(w.end,true),evidenceStart=view.toSource(w.evidenceStart),evidenceEnd=view.toSource(w.evidenceEnd,true);return {...i,titleWitness:{...w,start,end,evidenceStart,evidenceEnd,text:doc.text.slice(start,end),declarationText:doc.text.slice(evidenceStart,evidenceEnd)}};});
}
