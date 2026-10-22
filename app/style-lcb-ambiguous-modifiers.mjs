import {styleContext} from './style-context.mjs';
export const AMBIGUOUS_MODIFIER_RULE='LCB_AMBIGUOUS_MODIFIER_HEAD_REVIEW';
const fields=['start','end','text','pos','tag','dep','headStart','headEnd','headText'];
export function mapAmbiguousModifier(doc,plan,i,selected,evidence){
 const proof=i.ambiguousModifierRoleEvidence,tokens=proof?.tokens,c=proof?.components,h=proof?.head,p=proof?.predicate;
 if(!Array.isArray(tokens)||!tokens.length||!Array.isArray(c)||c.length<2||!h||!p||![proof.chosenScore,proof.alternativeScore,proof.margin].every(Number.isFinite)||proof.margin<0||proof.margin>5||Math.abs(proof.chosenScore-proof.alternativeScore-proof.margin)>1e-5)return null;
 const valid=r=>r&&[r.start,r.end,r.headStart,r.headEnd].every(Number.isInteger)&&r.start>=i.evidenceStart&&r.end<=i.evidenceEnd&&r.start<r.end&&r.headStart>=i.evidenceStart&&r.headEnd<=i.evidenceEnd&&r.headStart<r.headEnd&&plan.text.slice(r.start,r.end)===r.text&&plan.text.slice(r.headStart,r.headEnd)===r.headText;
 let cursor=i.evidenceStart;const byStart=new Map();
 for(const token of tokens){if(!valid(token)||token.start<cursor||!/^\s*$/u.test(plan.text.slice(cursor,token.start))||byStart.has(token.start))return null;byStart.set(token.start,token);cursor=token.end;}
 if(!/^\s*$/u.test(plan.text.slice(cursor,i.evidenceEnd))||tokens.some(t=>{const parent=byStart.get(t.headStart);return !parent||parent.end!==t.headEnd||parent.text!==t.headText;}))return null;
 const identical=r=>valid(r)&&byStart.has(r.start)&&fields.every(k=>r[k]===byStart.get(r.start)[k]);
 if(!identical(h)||h.pos!=='VERB'||!['VBZ','VBP'].includes(h.tag)||h.dep!=='ccomp'||h.start!==i.headStart||h.end!==i.headEnd||h.text!==i.head||proof.chosenTag!==h.tag||proof.alternativeTag!==(h.tag==='VBZ'?'NNS':'NN')||!identical(p)||!['VERB','AUX'].includes(p.pos)||!['VBD','VBP','VBZ','MD'].includes(p.tag)||p.dep!=='ROOT'||p.headStart!==p.start||p.headEnd!==p.end||h.headStart!==p.start||h.headEnd!==p.end)return null;
 if(tokens.some(t=>t.headStart===h.start&&['dobj','obj','iobj','ccomp','xcomp','attr','acomp','oprd','mark','aux','auxpass'].includes(t.dep))||tokens.some(t=>t.start>=h.end&&!['PUNCT','SPACE'].includes(t.pos)))return null;
 if(!c.every((r,n)=>identical(r)&&['NOUN','ADJ','ADV'].includes(r.pos)&&/^\p{Ll}[\p{Ll}\p{M}]*$/u.test(r.text)&&(!n||c[n-1].end<r.start&&/^\s+$/u.test(plan.text.slice(c[n-1].end,r.start))))||c.filter(r=>r.pos==='NOUN').length<2||c[0].start!==i.start||c.at(-1).end!==i.end||!/^\s+$/u.test(plan.text.slice(i.end,h.start))||!['nsubj','dobj','obj'].includes(c.at(-1).dep)||![p.start,h.start].includes(c.at(-1).headStart))return null;
 const head=plan.range(h.start,h.end);if(!head)return null;
 return {...selected,text:doc.text.slice(selected.start,selected.end),matchText:plan.text.slice(i.start,i.end),suggestion:null,engine:'spaCy',engineRule:AMBIGUOUS_MODIFIER_RULE,evidenceStart:evidence.start,evidenceEnd:evidence.end,head:h.text,headStart:head.start,headEnd:head.end,reviewSuggested:true,ambiguousModifierSourceValidated:true,parserAlternatives:{chosenTag:proof.chosenTag,alternativeTag:proof.alternativeTag,margin:proof.margin,meaningResolved:false}};
}
export function ambiguousModifierIssues(doc,references,engineIssues,{existingIssues=[]}={}){
 const page=references?.lcb?.pages?.find(p=>p.page===8);if(!page)return [];
 const ctx=styleContext(doc),issues=[];
 for(const c of engineIssues){if(c.engineRule!==AMBIGUOUS_MODIFIER_RULE||!c.ambiguousModifierSourceValidated||[...existingIssues,...issues].some(i=>i.start<c.end&&i.end>c.start))continue;
  issues.push({...c,guideId:'lcb',guidePage:8,guidePrintedPage:String(page.printedPage),rule:'Hyphenation, item 1',category:'Unresolved Parser Role',context:ctx.at(c.start),checkId:'lcb-ambiguous-modifier-review',reviewSuggested:true,confidence:'Review Suggested',conflict:false,matchesPrimary:false,message:'Review Suggested: The parser treated “'+c.head+'” as a verb, but its tagger also supplied a competing noun analysis after “'+c.matchText+'”. Confirm whether the passage is a clause or a noun phrase, and whether these preceding words form a unit modifier under LCB8 item1. Neither analysis establishes the intended structure or an error. No replacement has been selected.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:8,guidePrintedPage:String(page.printedPage),rule:'Hyphenation, item 1',preferred:null,ruleText:'Generally use a hyphen between words combined to form a unit modifier immediately preceding the word modified.'}]});
 }
 return issues;
}
