import {styleContext} from './style-context.mjs';
import {listedOpenNounModifier} from './offline-noun-sequences.mjs';
export const UNRESOLVED_STRUCTURE_RULE='LCB_UNRESOLVED_MODIFIER_STRUCTURE_REVIEW';
const fields=['start','end','text','pos','tag','dep','headStart','headEnd','headText'];
const finite=t=>['VERB','AUX'].includes(t.pos)&&['VBD','VBP','VBZ','MD'].includes(t.tag);
const word=t=>/^\p{Ll}[\p{Ll}\p{M}]*$/u.test(t.text)&&['NOUN','ADJ','ADV','VERB'].includes(t.pos)&&(t.pos!=='VERB'||['VBG','VBN'].includes(t.tag));
export function mapUnresolvedStructure(doc,plan,i,selected,evidence){
 const proof=i.unresolvedModifierEvidence,tokens=proof?.tokens,c=proof?.components,h=proof?.head;
 if(!['nominal-fragment','coordinated-fragment','infinitival-ambiguity','interrupted-coordination','post-head-ambiguity'].includes(proof?.mode)||!Array.isArray(tokens)||!tokens.length||!Array.isArray(c)||c.length<2||!h)return null;
 const valid=r=>r&&[r.start,r.end,r.headStart,r.headEnd].every(Number.isInteger)&&r.start>=i.evidenceStart&&r.end<=i.evidenceEnd&&r.start<r.end&&r.headStart>=i.evidenceStart&&r.headEnd<=i.evidenceEnd&&r.headStart<r.headEnd&&plan.text.slice(r.start,r.end)===r.text&&plan.text.slice(r.headStart,r.headEnd)===r.headText;
 const byStart=new Map();let cursor=i.evidenceStart;
 for(const t of tokens){if(!valid(t)||t.start<cursor||!/^\s*$/u.test(plan.text.slice(cursor,t.start))||byStart.has(t.start))return null;byStart.set(t.start,t);cursor=t.end;}
 if(!/^\s*$/u.test(plan.text.slice(cursor,i.evidenceEnd))||tokens.some(t=>{const p=byStart.get(t.headStart);return !p||p.end!==t.headEnd||p.text!==t.headText;}))return null;
 const same=t=>valid(t)&&byStart.has(t.start)&&fields.every(k=>t[k]===byStart.get(t.start)[k]);
 const adjacent=(a,b)=>a.end<b.start&&/^\s+$/u.test(plan.text.slice(a.end,b.start));
 const fragmentGap=(a,b)=>a.end<b.start&&/^(?:\s+|\s*-\s*)$/u.test(plan.text.slice(a.end,b.start));
 if(!same(h)||h.pos!=='NOUN'||!['NN','NNS'].includes(h.tag)||h.start!==i.headStart||h.end!==i.headEnd||h.text!==i.head||!c.every(same)||c[0].start!==i.start||c.at(-1).end!==i.end)return null;
 if(proof.mode==='post-head-ambiguity'?h.end>=i.start:!adjacent(c.at(-1),h))return null;
 const before=tokens.filter(t=>t.end<=h.start&&!(t.pos==='PUNCT'&&t.text==='-')),after=tokens.filter(t=>t.start>=h.end);
 if(proof.mode==='nominal-fragment'){
  if(h.dep!=='ROOT'||h.headStart!==h.start||h.headEnd!==h.end||tokens.some(finite)||after.some(t=>t.pos!=='PUNCT'||!['.','!','?'].includes(t.text)))return null;
  const prefix=before[0]?.pos==='DET'?before.slice(1):before;if(prefix.length!==c.length||!prefix.every((t,n)=>t.start===c[n].start)||!(c.some(t=>c.some(p=>p.start===t.headStart))||c.some(t=>['VBG','VBN'].includes(t.tag))))return null;
  for(let n=0;n<c.length;n++){
   const t=c[n],initial=n===0&&t.start===tokens[0].start&&/^\p{Lu}\p{Ll}+$/u.test(t.text);
   if(!(word(t)||initial&&word({...t,text:t.text.toLowerCase()}))||n&&!fragmentGap(c[n-1],t))return null;
   let node=t;const seen=new Set();while(node.start!==h.start){if(seen.has(node.start)||!c.some(t=>t.start===node.start)||!['compound','amod','nmod','advmod','npadvmod'].includes(node.dep))return null;seen.add(node.start);node=byStart.get(node.headStart);if(!node)return null;}
  }
 }else if(proof.mode==='coordinated-fragment'){
  const connector=proof.connector,prefix=before[0]?.pos==='DET'?before.slice(1):before;
  if(!same(connector)||connector.pos!=='CCONJ'||!['and','or'].includes(connector.text)||h.dep!=='ROOT'||h.headStart!==h.start||tokens.some(finite)||after.some(t=>t.pos!=='PUNCT'||!['.','!','?'].includes(t.text))||prefix.length!==c.length+1||!prefix.filter(t=>t.start!==connector.start).every((t,n)=>t.start===c[n].start))return null;
  const groups=[c.filter(t=>t.end<=connector.start),c.filter(t=>t.start>=connector.end)];
  if(groups.some(g=>g.length<2||!['ADJ','VERB'].includes(g.at(-1).pos)||g.some(t=>!(word(t)||t.start===tokens[0].start&&/^\p{Lu}\p{Ll}+$/u.test(t.text)&&word({...t,text:t.text.toLowerCase()})))))return null;
  for(let n=1;n<prefix.length;n++)if(!fragmentGap(prefix[n-1],prefix[n]))return null;
 }else if(proof.mode==='infinitival-ambiguity'){
  if(c.length!==3||!c.every((t,n)=>!n||adjacent(c[n-1],t)))return null;
  const [a,to,v]=c,p=proof.predicate;
  let base=a;const seen=new Set();while(base.dep==='conj'){if(seen.has(base.start))return null;seen.add(base.start);base=byStart.get(base.headStart);if(!base||base.pos!=='ADJ')return null;}
  if(!same(p)||!finite(p)||['be','am','is','are','was','were','remain','remains','remained','become','becomes','became','seem','seems','seemed','appear','appears','appeared'].includes(p.text.toLowerCase())||!word(a)||!['ADJ','ADV'].includes(a.pos)||!['acomp','advmod'].includes(base.dep)||base.headStart!==p.start||base.headEnd!==p.end||to.text!=='to'||to.pos!=='PART'||to.dep!=='aux'||to.headStart!==v.start||v.pos!=='VERB'||v.tag!=='VB'||v.dep!=='xcomp'||![a.start,p.start].includes(v.headStart)||v.headStart===p.start&&(base!==a||!['acomp','advmod'].includes(base.dep))||!['dobj','obj'].includes(h.dep)||h.headStart!==v.start)return null;
  const alternative=proof.adverbAlternative;
  if(a.pos==='ADV'){if(a.tag!=='RB'||!alternative||alternative.chosenTag!=='RB'||alternative.alternativeTag!=='JJ'||![alternative.chosenScore,alternative.alternativeScore,alternative.margin].every(Number.isFinite)||alternative.margin<0||Math.abs(alternative.chosenScore-alternative.alternativeScore-alternative.margin)>1e-5)return null;}else if(alternative)return null;
  if(tokens.some(t=>t.headStart===v.start&&['aux','auxpass','nsubj','nsubjpass'].includes(t.dep)&&t.start!==to.start)||tokens.some(t=>t.headStart===h.start&&['det','poss'].includes(t.dep))||tokens.some(t=>t.headStart===p.start&&['dobj','obj','expl'].includes(t.dep)&&t.text.toLowerCase()==='it'))return null;
 }else if(proof.mode==='interrupted-coordination'){
  const {left,right,aside,separators}=proof;
  if(![left,right,aside,separators].every(Array.isArray)||left.length<2||right.length<2||!aside.length||separators.length!==3||![...left,...right,...aside,...separators].every(same)||!tokens.some(finite))return null;
  if(![...left,...right].every(word)||!['ADJ','VERB'].includes(left.at(-1).pos)||!['ADJ','VERB'].includes(right.at(-1).pos)||['compound','nmod'].includes(h.dep)||c.length!==left.length+right.length||!c.every((t,n)=>t.start===[...left,...right][n].start))return null;
  const prepositional=aside[0].pos==='ADP'&&aside.every(t=>/^\p{Ll}[\p{Ll}\p{M}]*$/u.test(t.text)&&['ADP','DET','NOUN','ADJ','ADV','NUM','PRON'].includes(t.pos));
  const reduced=aside.length>1&&aside[0].text==='when'&&aside[0].pos==='SCONJ'&&aside.slice(1).every(t=>/^\p{Ll}[\p{Ll}\p{M}]*$/u.test(t.text)&&['ADJ','ADV'].includes(t.pos));if(!prepositional&&!reduced)return null;
  const [conjunction,open,close]=separators;
  if(!['and','or'].includes(conjunction.text)||conjunction.pos!=='CCONJ'||open.text!==','||open.pos!=='PUNCT'||close.text!==','||close.pos!=='PUNCT')return null;
  const sequence=[...left,conjunction,open,...aside,close,...right,h];
  for(let n=1;n<sequence.length;n++){const a=sequence[n-1],b=sequence[n];if(a.end>b.start||!/^\s*$/u.test(plan.text.slice(a.end,b.start)))return null;}
  const interval=tokens.filter(t=>t.start>=i.start&&t.end<=h.end);if(interval.length!==sequence.length||!interval.every((t,n)=>t.start===sequence[n].start))return null;
 }else{
  if(!/^\p{Ll}+(?:\s*-\s*\p{Ll}+)+$/u.test(plan.text.slice(i.start,i.end))||/^(?:ex|quasi|self)\s*-/iu.test(plan.text.slice(i.start,i.end))||!tokens.some(finite)||!c.every((t,n)=>/^\p{Ll}+$/u.test(t.text)&&['NOUN','ADJ','ADV','VERB'].includes(t.pos)&&(!n||/^\s*-\s*$/u.test(plan.text.slice(c[n-1].end,t.start)))))return null;
  const last=c.at(-1);let node=last;const seen=new Set();while(node.dep==='conj'){if(seen.has(node.start))return null;seen.add(node.start);node=byStart.get(node.headStart);if(!node)return null;}
  const nominalCoordination=node.pos==='NOUN'&&node.start<i.start&&last!==node&&['VBN','VBG'].includes(last.tag);
  if(!nominalCoordination&&!['acomp','attr','oprd','ccomp','advcl','acl','amod','relcl','ROOT'].includes(node.dep))return null;
  const parent=byStart.get(node.headStart);
  if(['acl','amod','relcl'].includes(node.dep)&&(!['NOUN','PROPN'].includes(parent.pos)||parent.start>=i.start))return null;
  if(node.dep==='ROOT'&&!(tokens.some(t=>t.headStart===node.start&&['nsubj','nsubjpass'].includes(t.dep))&&tokens.some(t=>t.headStart===node.start&&t.dep==='auxpass')))return null;
  for(const first of c.slice(0,-1)){let t=first;const trail=new Set();while(t.start!==last.start){if(trail.has(t.start)||!c.some(r=>r.start===t.start)||!['compound','amod','advmod','npadvmod','nmod'].includes(t.dep))return null;trail.add(t.start);t=byStart.get(t.headStart);if(!t)return null;}}
  const anchor=tokens.filter(t=>t.start<i.start&&t.pos==='NOUN'&&['NN','NNS'].includes(t.tag)&&/^\p{Ll}+$/u.test(t.text)&&!['compound','amod','nmod','npadvmod'].includes(t.dep)).at(-1);if(!anchor||anchor.start!==h.start)return null;
 }
 if(c[0].pos==='ADV'&&c[0].text.endsWith('ly')&&!plan.text.slice(i.start,i.end).includes('-'))return null;
 if(/[\u2012-\u2015]/u.test(doc.text.slice(selected.start,selected.end)))return null;
 const head=plan.range(h.start,h.end);if(!head)return null;
 return {...selected,text:doc.text.slice(selected.start,selected.end),matchText:plan.text.slice(i.start,i.end),suggestion:null,engine:'spaCy',engineRule:UNRESOLVED_STRUCTURE_RULE,evidenceStart:evidence.start,evidenceEnd:evidence.end,head:h.text,headStart:head.start,headEnd:head.end,reviewSuggested:true,unresolvedStructureValidated:true,unresolvedStructureMode:proof.mode,firstAdverbLy:c[0].pos==='ADV'&&c[0].text.toLowerCase().endsWith('ly'),...(proof.adverbAlternative?{unresolvedAdverbAlternative:{chosenTag:'RB',alternativeTag:'JJ',meaningResolved:false}}:{})};
}
export function unresolvedStructureIssues(doc,references,engineIssues,{existingIssues=[]}={}){
 const page=references?.lcb?.pages?.find(p=>p.page===8);if(!page)return [];
 const ctx=styleContext(doc),issues=[];
 const reasons={
  'nominal-fragment':'This nominal fragment has no finite-clause witness, so the normal sentence-based modifier check cannot establish its role.',
  'coordinated-fragment':'This coordinated nominal fragment has no finite-clause witness; the parser cannot establish whether the groups share a head or have independent roles.',
  'infinitival-ambiguity':'The adjective and infinitive permit competing noun-phrase and clause readings; the parser has not established which meaning was intended.',
  'interrupted-coordination':'The parenthetical interruption prevents the adjacent-group check from establishing whether the groups share the following noun or have independent roles.',
  'post-head-ambiguity':'The parser proposes a complement or following phrase outside the established adjacent-role checks. Its verbal, adjectival or adverbial meaning and the word modified remain unresolved.'
 };
 for(const c of engineIssues){
  if(c.engineRule!==UNRESOLVED_STRUCTURE_RULE||!c.unresolvedStructureValidated||[...existingIssues,...issues].some(i=>i.start<=c.start&&i.end>=c.end))continue;
  if(c.unresolvedStructureMode==='post-head-ambiguity'&&references.lcb.pages.some(p=>(p.lexicalEntries||[]).some(entry=>entry.split('(')[0].trim().toLowerCase()===c.matchText.toLowerCase().replace(/\s*-\s*/gu,'-')&&/\(n\./u.test(entry))))continue;
  const open=listedOpenNounModifier({...c,reviewVariant:'noun-sequence'},references);if(open&&(open.guideId==='gpo'||open.form.toLowerCase()===c.matchText.toLowerCase()))continue;
  const following=c.unresolvedStructureMode==='post-head-ambiguity',rule=following?'Hyphenation, item 2':'Hyphenation, item 1';
  issues.push({...c,guideId:'lcb',guidePage:8,guidePrintedPage:String(page.printedPage),rule,category:'Unresolved Modifier Structure',context:ctx.at(c.start),checkId:'lcb-unresolved-modifier-structure-review',confidence:'Review Suggested',conflict:false,matchesPrimary:false,message:'Review Suggested: '+reasons[c.unresolvedStructureMode]+(following?' The compound “'+c.matchText+'” occurs after the nominal source anchor “'+c.head+'”; that anchor is a locator, not an asserted modified noun. Review LCB8 item 2 and any lexical or verbal exception.':' Review “'+c.matchText+'” with “'+c.head+'” under LCB8 item 1. Confirm whether a unit modifier precedes the word modified, whether a printed open form or another exception applies, or whether the wording forms a different structure.')+' The wording may be correct. No grammatical interpretation, hyphenation or replacement has been selected.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:8,guidePrintedPage:String(page.printedPage),rule,preferred:null,ruleText:following?'Hyphens are not used with adjective or adverbial phrases when they follow the word modified.':'Generally use a hyphen between words combined to form a unit modifier immediately preceding the word modified.'}]});
  if(c.unresolvedAdverbAlternative)issues.at(-1).message=issues.at(-1).message.replace(reasons[c.unresolvedStructureMode],'The parser treated the first component as an adverb, while its tagger also supplied a competing adjective analysis. Neither establishes whether this is a modifier or a clause.');
  if(c.firstAdverbLy){issues.at(-1).message+=' LCB8 item 3 supplies the no-hyphen exception for adjective phrases containing an adverb ending in ly; confirm that adverbial role before editing.';issues.at(-1).references.push({guideId:'lcb',guideName:'LCB Style Manual',guidePage:8,guidePrintedPage:String(page.printedPage),rule:'Hyphenation, item 3',preferred:null,ruleText:'Do not hyphenate adjective phrases containing an adverb ending in ly.'});}
 }
 return issues;
}
