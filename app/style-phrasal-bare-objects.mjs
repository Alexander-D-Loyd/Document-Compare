import {BARE_LEGISLATIVE_OBJECT_HEADS} from './style-noun-heads.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
export const PHRASAL_BARE_OBJECT_SCOPE=' Selected plural and mass bare objects, including recognized modifiers and coordinated objects, establish derived phrasal verb roles without a determiner on the object. A complete determiner plus recognized finite subject, or explicit personal pronoun, and a complete object ending are required. Selected non-base-identical auxiliary inflections also accept those objects; ambiguous has runoff reports and had setoff records remain protected as nominal possession. Every original subject, modifier, conjunction, object and connecting space retains Unicode boundaries, source strikes, paired single/double literals, tables and unknown excluded/ignored content. Identified page heads preserve exact verb fragments; no preceding-character cutoff is used. Finite noun vocabulary and modifier/coordination grammar do not establish unrestricted sentence meaning or first-listed dictionary authority. Unfamiliar objects, capitalized names, singular bare nouns, object predicates, possessive meanings and broader syntax remain manual.';
const modifiers=new Set('planned proposed scheduled current future other additional required specified permitted authorized documented reported repeated separate timely necessary suitable'.split(' '));
const heads=new Set(BARE_LEGISLATIVE_OBJECT_HEADS);
const tokenAt=(source,start)=>{const m=/^\s+([^\s.,;:!?()]+)(?![\p{L}\p{N}\p{M}_])/u.exec(source.slice(start));return m?{start:start+m[0].length-m[1].length,end:start+m[0].length,word:m[1]}:null;};
const tokenBefore=(source,end)=>{let at=end;while(at>0&&/\s/.test(source[at-1]))at--;const finish=at;while(at>0&&!/\s/.test(source[at-1]))at--;return {start:at,end:finish,word:source.slice(at,finish)};};
export function createBarePhrasalObjectReader(doc,ctx){
 const source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),singleLiterals=[...source.matchAll(/(?<![\p{L}\p{N}\p{M}_])(?:‘[^’]*’|'[^']*')/gu)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const valid=r=>r&&!cutsOriginalStyleWord(doc,r.start)&&!cutsOriginalStyleWord(doc,r.end)&&!blocked(r.start,r.end)&&!singleLiterals.some(q=>q.start<r.end&&q.end>r.start);
 const noun=at=>{let t=tokenAt(source,at);while(t&&modifiers.has(t.word)){at=t.end;t=tokenAt(source,at);}return t&&heads.has(t.word)?t:null;};
 const objectEnd=end=>{
  let t=noun(end);if(!t)return null;let at=t.end,needsConjunction=false;
  for(;;){
   const tail=source.slice(at),close=/^\s*(?:[.;!?)]|$)/u.exec(tail);if(close&&!needsConjunction)return at+close[0].length;
   const conjunction=/^\s*(?:,\s*)?(?:and|or)(?![\p{L}\p{N}\p{M}_])/u.exec(tail);
   if(conjunction){t=noun(at+conjunction[0].length);if(!t)return null;at=t.end;needsConjunction=false;
    // A final conjunction closes the list; a second conjunction without a
    // new grouped structure cannot manufacture a larger direct object.
    const final=/^\s*(?:[.;!?)]|$)/u.exec(source.slice(at));return final?at+final[0].length:null;
   }
   const comma=/^\s*,/u.exec(tail);if(!comma)return null;t=noun(at+comma[0].length);if(!t)return null;at=t.end;needsConjunction=true;
  }
 };
 return ({start,end,cueStart,before,finite,auxiliary,baseIdentical})=>{
  const finish=objectEnd(end);if(finish===null)return null;
  if(finite){
   const subject=/^([^\s]+)\s/u.exec(before);if(!subject)return null;let from=cueStart;
   if(!/^(?:he|she|it|we|they|you|I)$/i.test(subject[1])){const article=tokenBefore(source,cueStart);if(!/^(?:the|this|that|these|those)$/i.test(article.word))return null;from=article.start;}
   const evidence={start:from,end:finish};if(valid(evidence))return evidence;
  }
  if(auxiliary&&!baseIdentical){const evidence={start:cueStart,end:finish};if(valid(evidence))return evidence;}
  return null;
 };
}
