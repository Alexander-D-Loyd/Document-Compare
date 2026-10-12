import {mapPredicateCompound}from './style-parsed-predicate-compounds.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext}from './style-evidence.mjs';
const same=(a,b)=>['start','end','text','pos','tag','dep','headStart','headEnd','headText'].every(k=>a[k]===b[k]);
// An intact explicit relative clause can supply a reader question even when
// separate sentence text is struck. Unknown exclusions remain sentence-wide.
// Complete subtree witnesses keep this from becoming selected-word-only QA.
export function mapIntactRelativePredicate(doc,plan,issue,selected,evidence,ctx){
 if(!doc.struck?.some(r=>r.start<evidence.end&&r.end>evidence.start)||styleEvidenceGuard({...doc,struck:[]},{...ctx,literalAt:()=>false})(evidence.start,evidence.end))return null;
 const mapped=mapPredicateCompound(doc,plan,issue,selected,evidence);if(!mapped)return null;
 const proof=issue.predicateRoleEvidence,r=proof.relativeClause,a=r?.antecedent,m=r?.members,p=proof.predicate,s=proof.subject;
 if(!r||!Array.isArray(m)||!m.length||p.dep!=='relcl'||s.pos!=='PRON'||!['WDT','WP'].includes(s.tag)||!['that','which','who'].includes(s.text.toLowerCase()))return null;
 const valid=n=>n&&[n.start,n.end,n.headStart,n.headEnd].every(Number.isInteger)&&n.start>=issue.evidenceStart&&n.end<=issue.evidenceEnd&&n.start<n.end&&n.headStart>=issue.evidenceStart&&n.headEnd<=issue.evidenceEnd&&n.headStart<n.headEnd&&plan.text.slice(n.start,n.end)===n.text&&plan.text.slice(n.headStart,n.headEnd)===n.headText;
 if(!valid(a)||!['NOUN','PROPN','PRON'].includes(a.pos)||!m.every(valid)||!Number.isInteger(r.start)||!Number.isInteger(r.end)||r.start!==a.start||r.end!==m.at(-1)?.end||r.end<issue.end||a.end>m[0].start||!same(m[0],s)||p.headStart!==a.start||p.headEnd!==a.end||p.headText!==a.text)return null;
 if(!/^(?:\s+|\s*,\s+)$/u.test(plan.text.slice(a.end,m[0].start)))return null;
 for(let n=1;n<m.length;n++)if(m[n-1].end>m[n].start||!/^\s*$/u.test(plan.text.slice(m[n-1].end,m[n].start)))return null;
 const byStart=new Map(m.map(n=>[n.start,n]));if(byStart.size!==m.length)return null;
 for(const n of [...proof.components,...proof.attachmentPath,...proof.coordinationMarkers,...proof.preModifiers,s,p,...p.finiteAuxiliaries])if(!byStart.has(n.start)||!same(n,byStart.get(n.start)))return null;
 const resolved=new Set([p.start]);for(const first of m){let n=first;const seen=new Set(),trace=[];while(!resolved.has(n.start)){if(seen.has(n.start))return null;seen.add(n.start);trace.push(n.start);const next=byStart.get(n.headStart);if(!next||n.headEnd!==next.end||n.headText!==next.text)return null;n=next;}for(const start of trace)resolved.add(start);}
 const local=plan.range(r.start,r.end),antecedentRange=plan.range(a.start,a.end),blocked=styleEvidenceGuard(doc,ctx);if(!local||!antecedentRange||local.start<evidence.start||local.end>evidence.end||blocked(local.start,local.end)||cutsOriginalStyleWord(doc,antecedentRange.start)||cutsOriginalStyleWord(doc,antecedentRange.end))return null;
 // A masked trailing word can fall outside the parser's apparent subtree.
 // Inspect the next original body character so a struck complement/adverb
 // cannot masquerade as a completed local clause. Layout remains masked.
 const original=originalBodyStyleContext(doc),next=original&&/\S/u.exec(original.source.slice(local.end,evidence.end));if(next&&blocked(local.end+next.index,local.end+next.index+next[0].length))return null;
 const map=n=>{const span=plan.range(n.start,n.end),head=plan.range(n.headStart,n.headEnd);if(!span||!head||blocked(span.start,span.end)||blocked(head.start,head.end))return null;return {...n,...span,text:doc.text.slice(span.start,span.end),parsedText:n.text,headStart:head.start,headEnd:head.end,headText:doc.text.slice(head.start,head.end),parsedHead:n.headText};};
 const antecedent=map(a),members=m.map(map);if(!antecedent||members.some(n=>!n))return null;
 return {...mapped,evidenceStart:local.start,evidenceEnd:local.end,sentenceEvidenceStart:evidence.start,sentenceEvidenceEnd:evidence.end,attachmentMethod:'intact-relative-clause-review',predicateRoleEvidence:{...mapped.predicateRoleEvidence,relativeClause:{...local,text:doc.text.slice(local.start,local.end),antecedent,members}},relativeClauseReview:true};
}
