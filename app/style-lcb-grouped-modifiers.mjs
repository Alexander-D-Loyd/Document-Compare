import {listedOpenNounModifier} from './offline-noun-sequences.mjs';
import {styleContext} from './style-context.mjs';
export const GROUPED_MODIFIER_RULE='LCB_GROUPED_MODIFIER_REVIEW';
export function mapGroupedModifier(doc,plan,i,selected,evidence){
 const proof=i.groupedModifierRoleEvidence,groups=proof?.groups,h=proof?.head,p=proof?.predicate,separators=proof?.separators;
 if(!['coordinated','stacked'].includes(proof?.mode)||!Array.isArray(groups)||groups.length<2||!Number.isInteger(proof.selectedGroup)||!groups[proof.selectedGroup]||!Array.isArray(separators)||!h||!p||!Array.isArray(p.finiteAuxiliaries))return null;
 const valid=r=>r&&[r.start,r.end,r.headStart,r.headEnd].every(Number.isInteger)&&r.start>=i.evidenceStart&&r.end<=i.evidenceEnd&&r.start<r.end&&r.headStart>=i.evidenceStart&&r.headEnd<=i.evidenceEnd&&r.headStart<r.headEnd&&plan.text.slice(r.start,r.end)===r.text&&plan.text.slice(r.headStart,r.headEnd)===r.headText;
 const finite=r=>['VERB','AUX'].includes(r.pos)&&['VBD','VBP','VBZ','MD'].includes(r.tag);
 if(!valid(h)||h.pos!=='NOUN'||!['NN','NNS'].includes(h.tag)||['compound','nmod'].includes(h.dep)||h.start!==i.headStart||h.end!==i.headEnd||h.text!==i.head||!valid(p)||p.dep!=='ROOT'||p.headStart!==p.start||p.headEnd!==p.end||!p.finiteAuxiliaries.every(a=>valid(a)&&finite(a)&&['aux','auxpass','cop'].includes(a.dep)&&a.headStart===p.start&&a.headEnd===p.end)||!(finite(p)||p.finiteAuxiliaries.length))return null;
 for(const group of groups){const c=group?.components;if(!Array.isArray(c)||c.length<1||!c.every((r,n)=>valid(r)&&/^\p{Ll}[\p{Ll}\p{M}]*$/u.test(r.text)&&['NOUN','ADJ','ADV','VERB'].includes(r.pos)&&(r.pos!=='VERB'||['VBG','VBN'].includes(r.tag)||r.tag==='VB'&&c[n+1]&&['VBG','VBN'].includes(c[n+1].tag)&&r.dep==='amod')&&(!n||c[n-1].end<r.start&&/^[\s-]+$/u.test(plan.text.slice(c[n-1].end,r.start)))))return null;
  if(group.root&&(!valid(group.root)||!c.some(r=>['start','end','text','pos','tag','dep','headStart','headEnd','headText'].every(k=>r[k]===group.root[k]))))return null;
 }
 const selectedGroup=groups[proof.selectedGroup].components;if(selectedGroup.length<2||selectedGroup[0].start!==i.start||selectedGroup.at(-1).end!==i.end||groups.at(-1).components.at(-1).end>=h.start||!/^\s+$/u.test(plan.text.slice(groups.at(-1).components.at(-1).end,h.start)))return null;
 if(separators.some(s=>!valid(s)||!(s.text===','&&s.pos==='PUNCT'||['and','or'].includes(s.text)&&s.pos==='CCONJ'&&s.tag==='CC')))return null;
 const used=new Set();
 for(let n=1;n<groups.length;n++){
  const a=groups[n-1].components.at(-1).end,b=groups[n].components[0].start;if(a>=b)return null;
  const marks=separators.filter(s=>s.start>=a&&s.end<=b).sort((a,b)=>a.start-b.start);let at=a;
  for(const s of marks){if(used.has(s)||s.start<at||!/^[\s]*$/u.test(plan.text.slice(at,s.start)))return null;used.add(s);at=s.end;}
  if(!/^\s*$/u.test(plan.text.slice(at,b))||proof.mode==='stacked'&&marks.length)return null;
 }
 if(used.size!==separators.length)return null;
 if(proof.mode==='coordinated'&&(!separators.some(s=>['and','or'].includes(s.text))||!groups[0].root||!['compound','amod','nmod','advcl'].includes(groups[0].root.dep)))return null;
 if(proof.mode==='stacked'&&(separators.length||groups.some(g=>!g.root||!['compound','amod','nmod'].includes(g.root.dep)||g.root.headStart!==h.start||g.root.headEnd!==h.end)))return null;
 const block=plan.range(groups[0].components[0].start,h.end);if(!block)return null;
 const body=styleContext(doc).source;
 if([...doc.text.slice(block.start,block.end).matchAll(/[\u2012-\u2015]/gu)].some(m=>body[block.start+m.index]!==' '))return null;
 const term=plan.text.slice(i.start,i.end),ly=selectedGroup[0].pos==='ADV'&&selectedGroup[0].text.endsWith('ly');if(ly&&!term.includes('-'))return null;
 const head=plan.range(h.start,h.end);if(!head)return null;
 return {...selected,text:doc.text.slice(selected.start,selected.end),matchText:term,suggestion:null,engine:'spaCy',engineRule:GROUPED_MODIFIER_RULE,evidenceStart:evidence.start,evidenceEnd:evidence.end,head:h.text,headStart:head.start,headEnd:head.end,reviewSuggested:true,groupedModifierSourceValidated:true,groupedModifierMode:proof.mode,firstAdverbLy:ly};
}
export function groupedModifierIssues(doc,references,engineIssues,{existingIssues=[]}={}){
 const page=references?.lcb?.pages?.find(p=>p.page===8);if(!page)return [];
 const ctx=styleContext(doc),issues=[];
 for(const c of engineIssues){
  if(c.engineRule!==GROUPED_MODIFIER_RULE||!c.groupedModifierSourceValidated||[...existingIssues,...issues].some(i=>i.start<c.end&&i.end>c.start))continue;
  const open=listedOpenNounModifier({...c,reviewVariant:'noun-sequence'},references);if(open&&(open.guideId==='gpo'||open.form.toLowerCase()===c.matchText.toLowerCase()))continue;
  const ly=c.firstAdverbLy,rule=ly?'Hyphenation, item 3':'Hyphenation, item 1';
  issues.push({...c,guideId:'lcb',guidePage:8,guidePrintedPage:String(page.printedPage),rule,category:'Modifier Grouping Review',context:ctx.at(c.start),checkId:'lcb-grouped-modifier-review',reviewSuggested:true,confidence:'Review Suggested',conflict:false,matchesPrimary:false,message:'Review Suggested: “'+c.matchText+'” appears in '+c.groupedModifierMode+' wording before “'+c.head+'”. Confirm whether it is a unit modifier sharing that head, has its own head, or forms a different structure. '+(ly?'The first component is parsed as an -ly adverb; LCB8 item3 supplies the no-hyphen exception.':'LCB8 item1 generally hyphenates a unit modifier before the word modified; check printed open forms and other exceptions.')+' The grouping has not been established, and this wording may be correct. No replacement has been selected.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:8,guidePrintedPage:String(page.printedPage),rule,preferred:null,ruleText:ly?'Do not hyphenate adjective phrases containing an adverb ending in ly.':'Generally use a hyphen between words combined to form a unit modifier immediately preceding the word modified.'}]});
 }
 return issues;
}
