import {OFFLINE_MODIFIERS}from './offline-rules.mjs';
const nominal=r=>['NOUN','PROPN'].includes(r.pos)&&['NN','NNS','NNP','NNPS'].includes(r.tag);
const finite=r=>['VERB','AUX'].includes(r.pos)&&['VBD','VBP','VBZ','MD'].includes(r.tag);
const internalEdges=new Set(['compound','amod','nmod','advmod','npadvmod','poss','case','det','prep','pobj','neg']);
const wordChar=/[\p{L}\p{N}\p{M}_]/u;
// This validates existing exact catalogue candidates; it creates no new
// spelling or grammar inference. The caller must additionally protect all
// original source masks, literals, tables, names and guide exceptions.
export function validateListedModifierWitness(plan,issue,rule=OFFLINE_MODIFIERS.find(r=>r.engineRule===issue?.engineRule)){
 const known=OFFLINE_MODIFIERS.find(r=>r.engineRule===rule?.engineRule);
 if(!known||known.preferred!==rule.preferred||issue?.engineRule!==known.engineRule||issue.engine!=='spaCy'||issue.reviewSuggested!==false||issue.attachmentMethod!=='direct'||issue.suggestion!==known.preferred)return null;
 const e=issue.modifierRoleEvidence,c=e?.components,h=e?.head,p=e?.predicate,text=plan?.text;
 if(typeof text!=='string'||e?.kind!=='exact-listed-attributive'||!Array.isArray(c)||c.length<2||c.length>64||!h||!p||!Array.isArray(p.finiteAuxiliaries))return null;
 if(![issue.start,issue.end,issue.headStart,issue.headEnd,issue.evidenceStart,issue.evidenceEnd].every(Number.isInteger)||issue.evidenceStart<0||issue.evidenceEnd>text.length||issue.start<issue.evidenceStart||issue.end<=issue.start||issue.headStart<issue.end||issue.headEnd<=issue.headStart||issue.headEnd>issue.evidenceEnd)return null;
 const valid=r=>r&&[r.start,r.end,r.headStart,r.headEnd].every(Number.isInteger)&&r.start>=issue.evidenceStart&&r.end<=issue.evidenceEnd&&r.start<r.end&&r.headStart>=issue.evidenceStart&&r.headEnd<=issue.evidenceEnd&&r.headStart<r.headEnd&&typeof r.text==='string'&&/^\S+$/u.test(r.text)&&typeof r.headText==='string'&&/^\S+$/u.test(r.headText)&&text.slice(r.start,r.end)===r.text&&text.slice(r.headStart,r.headEnd)===r.headText;
 const term=text.slice(issue.start,issue.end),normalized=term.replace(/[\s-]+/gu,'-').replaceAll("'",'’').toLowerCase();
 if(normalized!==known.preferred.toLowerCase()||wordChar.test(text[issue.start-1]||'')||wordChar.test(text[issue.end]||'')||text[issue.start-1]==='-'||text[issue.end]==='-')return null;
 if(!valid(h)||!nominal(h)||['compound','nmod'].includes(h.dep)||h.start!==issue.headStart||h.end!==issue.headEnd||h.text!==issue.head||wordChar.test(text[h.end]||'')||!/^\s+$/u.test(text.slice(issue.end,h.start)))return null;
 if(!c.every((r,n)=>valid(r)&&r.start>=issue.start&&r.end<=issue.end&&(n?c[n-1].end<=r.start&&/^\s*$/u.test(text.slice(c[n-1].end,r.start)):r.start===issue.start))||c.at(-1).end!==issue.end)return null;
 const nodes=new Map(c.map(r=>[r.start,r]));if(nodes.size!==c.length)return null;
 for(const first of c){
  if(first.pos==='PUNCT'){if(first.text!=='-')return null;continue;}
  if(!['NOUN','PROPN','ADJ','ADV','ADP','DET','PART','VERB'].includes(first.pos)||['nsubj','nsubjpass','csubj','csubjpass'].includes(first.dep)||first.pos==='VERB'&&(!['VBG','VBN'].includes(first.tag)||first.dep!=='amod'))return null;
  let r=first;const seen=new Set();
  while(r.start!==h.start){
   if(seen.has(r.start)||!internalEdges.has(r.dep))return null;seen.add(r.start);
   const parent=r.headStart===h.start?h:nodes.get(r.headStart);
   if(!parent||parent.end!==r.headEnd||parent.text!==r.headText||parent===h&&!['compound','amod','nmod'].includes(r.dep))return null;r=parent;
  }
 }
 if(!valid(p)||!['VERB','AUX'].includes(p.pos)||p.dep!=='ROOT'||p.headStart!==p.start||p.headEnd!==p.end||p.headText!==p.text||p.start<issue.end&&p.end>issue.start||!p.finiteAuxiliaries.every((r,n)=>valid(r)&&finite(r)&&['aux','auxpass','cop'].includes(r.dep)&&r.headStart===p.start&&r.headEnd===p.end&&r.headText===p.text&&(!n||p.finiteAuxiliaries[n-1].end<=r.start))||!finite(p)&&!p.finiteAuxiliaries.length)return null;
 // No component's relation may name an alternate nominal token instead of
 // the exact head checked above; a cyclic or detached witness fails closed.
 return {kind:e.kind,components:c.map(r=>({...r})),head:{...h},predicate:{...p,finiteAuxiliaries:p.finiteAuxiliaries.map(r=>({...r}))}};
}
