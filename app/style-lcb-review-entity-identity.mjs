import {CALIFORNIA_ENTITIES}from './data/california-entities.mjs';
import {styleContext,withStyleContext}from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord}from './style-evidence.mjs';
import {styleWordDivisionView}from './style-word-divisions.mjs';
import {californiaEntityReview}from './style-california-entities.mjs';

export const LCB_ENTITY_IDENTITY_REVIEW_SCOPE='Bounded institutional names receive reader review only when a close complete wording sequence is supported by the bundled California Entities snapshot. Exact registered names retain their existing capitalization method. At most two token edits, including no more than one content-word edit or one adjacent transposition, establish a candidate; at least two nonparticle source words and a distinctive word must match a listed name, except an otherwise-identical singular/plural identity. A proper-name capitalization cue is required for fuzzy wording review. Missing/substituted particles, singular/plural tokens and similarly bounded wording differences are review candidates, never forced replacements or established identity errors. Longer/subordinate names, explicit creation/rename/definition evidence, literal names, tables, headings, source strikes, unknown exclusions and partial original words are protected. Registry absence is not an error; current legal identity, unlisted entities, wholly lowercase unfamiliar wording, large/nonadjacent wording differences, short titles and complex registry annotations remain unresolved.';
const fold=s=>s.replace(/[’‘]/g,"'").replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim().toLowerCase();
const words=s=>[...fold(s).matchAll(/[\p{L}\p{M}]+(?:'[\p{L}\p{M}]+)*/gu)].map(m=>m[0]);
const particles=new Set('of for the and on in at to a an with from by'.split(' '));
const institutions=new Set('department commission commissioner board agency authority council committee office bureau university college academy center institute district hospital bank conservancy foundation trust corporation director secretary superintendent governor administrator controller system fund patrol'.split(' '));
for(const word of [...institutions])institutions.add(word+'s');
const genericAnchors=new Set([...institutions,'california','state','public','services','service','general']);
const predicates=new Set('shall must may will would should can could is are was were be been means mean refers include includes including retain retains retained submit submits act acts provide provides provided receive receives received establish establishes established establishesthe create creates created renamed renames rename hereby pursuant under within responsible contain contains containing administer administers adopt adopts'.split(' '));
const entries=CALIFORNIA_ENTITIES.entries.filter(e=>e.checkEligible&&!/[,[\]]/.test(e.name)).map(e=>({...e,words:words(e.name)})).filter(e=>e.words.length>=3&&e.words.length<=14&&e.words.some(w=>institutions.has(w)));
const firstWords=new Set(entries.map(e=>e.words[0])),lastWords=new Set(entries.map(e=>e.words.at(-1))),byWord=new Map();
for(const entry of entries)for(const w of new Set(entry.words.filter(w=>!particles.has(w)))){if(!byWord.has(w))byWord.set(w,new Set());byWord.get(w).add(entry);}
const registeredKeys=new Set(CALIFORNIA_ENTITIES.entries.filter(e=>e.checkEligible).map(e=>words(e.name).join(' ')));
const intersects=(rows,start,end)=>rows.some(r=>r.start<end&&r.end>start);
function distance(source,target){
 const rows=Array.from({length:source.length+1},()=>Array(target.length+1).fill(null));rows[0][0]={edits:0,content:0};
 const best=(...options)=>options.filter(Boolean).sort((a,b)=>(a.content*3+a.edits)-(b.content*3+b.edits)||a.edits-b.edits)[0];
 const next=(old,edits,content)=>old&&({edits:old.edits+edits,content:old.content+content});
 for(let i=0;i<=source.length;i++)for(let j=0;j<=target.length;j++){
  if(!i&&!j)continue;
  const match=i&&j&&source[i-1]===target[j-1],sub=i&&j?next(rows[i-1][j-1],match?0:1,match||particles.has(source[i-1])&&particles.has(target[j-1])?0:1):null;
  const swap=i>1&&j>1&&source[i-1]===target[j-2]&&source[i-2]===target[j-1]?next(rows[i-2][j-2],1,0):null;
  rows[i][j]=best(sub,i?next(rows[i-1][j],1,particles.has(source[i-1])?0:1):null,j?next(rows[i][j-1],1,particles.has(target[j-1])?0:1):null,swap);
 }
 return rows[source.length][target.length];
}
function boundedNames(doc,ctx){
 const tokens=[...ctx.source.matchAll(/[\p{L}\p{M}]+(?:[’'][\p{L}\p{M}]+)*/gu)].map(m=>({start:m.index,end:m.index+m[0].length,text:m[0],word:fold(m[0])})),rows=[];
 for(let index=0;index<tokens.length;index++){
  const first=tokens[index];if(particles.has(first.word)||!firstWords.has(first.word)&&!institutions.has(first.word))continue;
  const previous=tokens[index-1],gap=previous?ctx.source.slice(previous.end,first.start):'';
  if(previous&&/^[\s\u2010-\u2015-]+$/.test(gap)&&!particles.has(previous.word)&&!predicates.has(previous.word)&&/^\p{Lu}/u.test(previous.text))continue;
  const selected=[first];
  for(let n=index+1;n<tokens.length&&selected.length<15;n++){
   const token=tokens[n],between=ctx.source.slice(selected.at(-1).end,token.start);if(!/^[\s\u2010-\u2015-]+$/.test(between)||predicates.has(token.word))break;
   let following=n+1;while(tokens[following]&&particles.has(tokens[following].word))following++;
   if(selected.length>=3&&lastWords.has(selected.at(-1).word)&&particles.has(token.word)&&tokens[following]&&!/^\p{Lu}/u.test(tokens[following].text))break;
   selected.push(token);
  }
  if(selected.length<3||!selected.some(t=>institutions.has(t.word)))continue;
  const start=first.start,end=selected.at(-1).end,sequence=selected.map(t=>t.word);
  if(!selected.some(t=>!particles.has(t.word)&&/^\p{Lu}/u.test(t.text)&&(institutions.has(t.word)||!genericAnchors.has(t.word))))continue;
  // A complete registry prefix followed by additional prose or a longer name
  // is not evidence that the registered identity itself is misspelled.
  if(sequence.some((_,n)=>registeredKeys.has(sequence.slice(0,n+1).join(' '))))continue;
  if(cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||/^[-\u00ad]\s*\n/.test(ctx.source.slice(end))||/[-\u00ad]\s*\n\s*$/.test(ctx.source.slice(Math.max(0,start-180),start)))continue;
  rows.push({start,end,words:sequence,key:sequence.join(' ')});
 }
 return rows;
}
function definitionWitnesses(doc,ctx,candidates){
 const blocked=styleEvidenceGuard(doc,{...ctx,literalAt:()=>false}),names=new Set();
 for(const candidate of candidates){
  const before=ctx.source.slice(Math.max(0,candidate.start-160),candidate.start),after=ctx.source.slice(candidate.end,candidate.end+200);
  const prefix=/\b(?:establish(?:ed|es|ing)?|creat(?:e|ed|es|ing)|form(?:ed|s|ing)?|renam(?:e|ed|es|ing)|named|called|known\s+as)\s+(?:(?:a|an|the|to|as)\s+)?$/i.exec(before);
  const suffix=/^[”"’']?\s*,?\s*(?:(?:(?:is|are|shall|must|would|will)\s+(?:be\s+)?)?(?:hereby\s+)?(?:established|created|formed|renamed|defined|known\s+as)|means|refers\s+to)\b/i.exec(after);
  const begin=prefix?candidate.start-before.length+prefix.index:candidate.start,end=suffix?candidate.end+suffix[0].length:candidate.end;
  if((prefix||suffix)&&!blocked(begin,end))names.add(candidate.key);
 }
 return names;
}
function detector(doc,references,options){
 const ctx=styleContext(doc),blocked=styleEvidenceGuard(doc,ctx),candidates=boundedNames(doc,ctx),defined=definitionWitnesses(doc,ctx,candidates),existing=options.existingIssues||[],registered=californiaEntityReview(doc,references).ranges,singleQuotes=[...ctx.source.matchAll(/‘[^’]*’|(?<![\p{L}\p{N}\p{M}_])'[^'\n]*'/gu)].map(m=>({start:m.index,end:m.index+m[0].length})),issues=[];
 for(const candidate of candidates){
  const {start,end}=candidate;if(ctx.at(start)==='Heading'||blocked(start,end)||intersects(registered,start,end)||intersects(singleQuotes,start,end)||defined.has(candidate.key)||intersects(existing,start,end)||issues.some(i=>i.start<end&&i.end>start))continue;
  const possible=new Set(candidate.words.filter(w=>!particles.has(w)).flatMap(w=>[...(byWord.get(w)||[])])),matches=[];
  for(const entry of possible){
   if(Math.abs(entry.words.length-candidate.words.length)>2||candidate.words.filter(w=>institutions.has(w)).length!==entry.words.filter(w=>institutions.has(w)).length)continue;
   const shared=new Set(candidate.words.filter(w=>!particles.has(w)&&entry.words.includes(w))),pluralOnly=candidate.words.length===entry.words.length&&candidate.words.every((w,n)=>w===entry.words[n]||w+'s'===entry.words[n]||w===entry.words[n]+'s');if(shared.size<2||![...shared].some(w=>!genericAnchors.has(w))&&!pluralOnly)continue;
   const diff=distance(candidate.words,entry.words);if(diff.edits>2||diff.content>1||!diff.edits)continue;
   matches.push({entry,diff,score:diff.content*3+diff.edits});
  }
  matches.sort((a,b)=>a.score-b.score||a.diff.edits-b.diff.edits||b.entry.words.length-a.entry.words.length);
  const best=matches.filter(m=>m.score===matches[0]?.score).slice(0,3);if(!best.length)continue;
  const witnesses=best.map(({entry,diff})=>({name:entry.name,category:entry.category,citation:entry.citation,annotation:entry.annotation,paragraph:entry.paragraph,tokenEdits:diff.edits,contentWordEdits:diff.content}));
  issues.push({start,end,text:doc.text.slice(start,end),suggestion:null,guideId:'lcb',guidePage:17,guidePrintedPage:String(references.lcb.pages[16].printedPage),rule:'Capitalization, item 7: California Entities',category:'Official Entity Identity Review',context:ctx.at(start),confidence:'Review Suggested',reviewSuggested:true,reviewKind:'entity-identity',checkId:'lcb-entity-identity-review',conflict:false,matchesPrimary:false,message:'Review Suggested: This bounded institutional name has wording close to '+witnesses.map(w=>'“'+w.name+'”').join(' or ')+' in the supplied California Entities export. Confirm whether it identifies that listed institution or a different/new entity. The snapshot can include historical names; absence or differing wording does not establish an error. No replacement has been selected.',entityMatches:witnesses,entitySource:{file:CALIFORNIA_ENTITIES.source.file,sha256:CALIFORNIA_ENTITIES.source.sha256,imported:CALIFORNIA_ENTITIES.source.imported,limitations:CALIFORNIA_ENTITIES.source.limitations},references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:17,guidePrintedPage:String(references.lcb.pages[16].printedPage),rule:'Capitalization, item 7',preferred:null,ruleText:'Verify entities with the California Entities list on the OLC Intranet.'}]});
 }
 return issues.sort((a,b)=>a.start-b.start||a.end-b.end);
}
export function lcbEntityIdentityReviewIssues(doc,references,options={}){
 if(!references?.lcb?.pages?.[16])return [];
 const knownWords=new Set(entries.flatMap(e=>e.words)),view=styleWordDivisionView(doc,{knownWords}),reviewDoc=view?.doc||doc,existing=options.existingIssues||[],prior=view?existing.map(i=>({...i,start:view.toView(i.start),end:view.toView(i.end)})):existing;
 const found=withStyleContext(reviewDoc,()=>detector(reviewDoc,references,{...options,existingIssues:prior}));return view?view.restore(found):found;
}
