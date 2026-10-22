import {canonicalLcbModifierForm} from './style-lcb-canonical-modifier.mjs';
const finite=t=>['VERB','AUX'].includes(t.pos)&&['VBD','VBP','VBZ','MD'].includes(t.tag);
export const NOUN_SEQUENCE_SCOPE='Offline reader review of complete contiguous parsed noun prefixes before a nominal head, without a fixed component-count limit. Every selected component must carry a source-validated noun role and a compound/nmod attachment path to the same complete head in a clause with an explicit finite predicate. Complete component, graph, predicate and auxiliary source spans survive recognized word/page divisions. Attachment paths are validated iteratively with memoization. Source strikes, unknown gaps, literals, headings, tables, named/title evidence, precise owners, known guide conflicts and explicitly open LCB/GPO exceptions remain protected. No noun segmentation, lexical compound meaning or required hyphenation is asserted; GPO6.16 readability remains a reader decision. Missing or mistaken parser roles, adjective/verb interruptions, noncontiguous modifiers, chunk edges and unfamiliar meanings remain incomplete. This is a broader checking method, not full unit-modifier automation or measured office accuracy.';
export function mapNounSequenceEvidence(doc,plan,issue){
 const proof=issue.nounRoleEvidence,c=proof?.components,p=proof?.predicate;if(!Array.isArray(c)||c.length<2||!p||!Array.isArray(p.finiteAuxiliaries))return null;
 const qualified=issue.reviewVariant==='qualified-noun-prefix';
 if(qualified&&(c[0]?.pos!=='ADJ'||!c.some(r=>r?.pos==='NOUN')))return null;
 // Validate source grammar independently of a mistaken nominal parse.
 // These complete connectors introduce a following relation, rather than
 // supplying the final noun of the adjective-led prefix under review.
 if(qualified&&/^(?:pursuant|according|owing|due|subject)\s+to\b/iu.test(plan.text.slice(issue.headStart,issue.evidenceEnd)))return null;
 const valid=r=>r&&[r.start,r.end].every(Number.isInteger)&&r.start>=issue.evidenceStart&&r.end<=issue.evidenceEnd&&r.start<r.end&&typeof r.text==='string'&&plan.text.slice(r.start,r.end)===r.text;
 if(!c.every((r,n)=>valid(r)&&(r.pos==='NOUN'&&['compound','nmod'].includes(r.dep)||qualified&&r.pos==='ADJ'&&r.dep==='amod')&&[r.headStart,r.headEnd].every(Number.isInteger)&&r.headStart>=issue.evidenceStart&&r.headEnd<=issue.evidenceEnd&&r.headStart<r.headEnd&&plan.text.slice(r.headStart,r.headEnd)===r.headText&&(n?c[n-1].end<r.start&&/^\s+$/u.test(plan.text.slice(c[n-1].end,r.start)):r.start===issue.start))||c.at(-1).end!==issue.end||!valid(p)||!p.finiteAuxiliaries.every(a=>valid(a)&&finite(a)&&['aux','auxpass','cop'].includes(a.dep))||!(finite(p)||p.finiteAuxiliaries.length))return null;
 const byStart=new Map(c.map(r=>[r.start,r])),resolved=new Set();
 if(qualified&&c.some(r=>r.pos==='ADJ'&&byStart.get(r.headStart)?.pos!=='NOUN'))return null;
 for(const first of c){let r=first;const seen=new Set(),path=[];while(!resolved.has(r.start)){if(seen.has(r.start))return null;seen.add(r.start);path.push(r.start);if(r.headStart===issue.headStart&&r.headEnd===issue.headEnd&&r.headText===issue.head)break;const next=byStart.get(r.headStart);if(!next||next.end!==r.headEnd||next.text!==r.headText)return null;r=next;}for(const start of path)resolved.add(start);}
 const mapped=c.map(r=>{const selected=plan.range(r.start,r.end),head=plan.range(r.headStart,r.headEnd);return selected&&head?{...r,...selected,text:doc.text.slice(selected.start,selected.end),parsedText:r.text,headStart:head.start,headEnd:head.end,headText:doc.text.slice(head.start,head.end),parsedHead:r.headText}:null;});
 const predicate=plan.range(p.start,p.end),auxiliaries=p.finiteAuxiliaries.map(a=>{const selected=plan.range(a.start,a.end);return selected?{...a,...selected,text:doc.text.slice(selected.start,selected.end),parsedText:a.text}:null;});if(mapped.some(r=>!r)||!predicate||auxiliaries.some(r=>!r))return null;
 return {components:mapped,predicate:{...p,...predicate,text:doc.text.slice(predicate.start,predicate.end),parsedText:p.text,finiteAuxiliaries:auxiliaries},head:issue.head,scope:'Direct parsed noun attachments in a clause with explicit finite predicate evidence; compound meaning remains for reader confirmation.'};
}
export function restoreNounSequenceEvidence(e,map,text=null){
 const restore=r=>{const start=map(r.start),end=map(r.end,true);return {...r,start,end,...(text!==null?{text:text.slice(start,end)}:{})};};return {...e,components:e.components.map(r=>{const headStart=map(r.headStart),headEnd=map(r.headEnd,true);return {...restore(r),headStart,headEnd,...(text!==null?{headText:text.slice(headStart,headEnd)}:{})};}),predicate:{...restore(e.predicate),finiteAuxiliaries:e.predicate.finiteAuxiliaries.map(restore)}};
}
export function listedOpenNounModifier(candidate,references){
 if(!isNounPrefixReview(candidate))return null;
 const canonical=canonicalLcbModifierForm(candidate,references);if(canonical)return canonical;
 const words=candidate.matchText.toLowerCase().split(/\s+/u);
 for(const page of references?.lcb?.pages||[])for(const entry of page.lexicalEntries||[]){if(!/\bu\.m\./u.test(entry))continue;const form=entry.split('(')[0].trim();if(form.includes('-')||!form.includes(' '))continue;const known=form.toLowerCase().split(/\s+/u);for(let at=0;at<=words.length-known.length;at++)if(known.every((w,n)=>words[at+n]===w))return {form,page:page.page,entry};}
 // Exact complete examples in GPO6.16 take precedence over a general
 // unit-modifier question. Do not extend them to unseen heads or meanings.
 const page=references?.gpo?.pages?.find(p=>p.page===115),block=page?.text?.match(/atomic energy power\n([\s\S]*?)\nbut no-hyphen rule/u)?.[0];
 if(block){const phrase=[...words,candidate.head.toLowerCase()].join(' ');for(const entry of block.split('\n').slice(0,-1)){const form=entry.trim().replace(/\s+/gu,' ');if(form.toLowerCase()===phrase)return {form,page:115,entry,guideId:'gpo',rule:'6.16'};}}
 return null;
}
export const isNounPrefixReview=c=>['noun-sequence','qualified-noun-prefix'].includes(c.reviewVariant);
export const QUALIFIED_NOUN_PREFIX_SCOPE='Offline reader review of a complete adjective-led noun prefix when each adjective is parsed as modifying an interior noun and the full prefix attaches to one complete nominal head in a finite clause. Component and predicate source witnesses are independently checked and restored across recognized word/page divisions without a component-count cap. A separate source check protects complete pursuant to, according to, owing to, due to and subject to connectors from mistaken noun-head parses. Direct adjectives of the final head, other missing or mistaken parser roles, adverb/verb interruptions, noncontiguous modifiers and chunk edges remain incomplete. Known open guide examples, guide conflicts, names, literals, struck text and precise corrections remain protected. Clear open combinations may be valid under GPO6.16; compound meaning, grouping, readability and any hyphenation remain reader decisions. This does not establish full unit-modifier automation or office accuracy.';
