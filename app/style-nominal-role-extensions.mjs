import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {nounHeadPattern} from './style-noun-heads.mjs';
export const NOMINAL_ROLE_EXTENSION_SCOPE=' Selected complete plural noun roles accept intervening finite modifiers, explicit existential There are/were or There will be predicates, and a regular plural possessive apostrophe before a recognized noun head or timing. Possessive corrections retain the original apostrophe and include it in the full selected term. Complete original modifier/count/predicate/possessive evidence, connectors and Unicode boundaries protect strikes, paired single/double literals, tables and unknown ignored/excluded content while retaining identified page continuations. An independently intact nominal cue remains eligible. Reverse lexical discovery has no fixed preceding-character limit; modifiers and grammatical roles are finite. Unfamiliar modifiers, names, possessive heads, sentence meanings and full first-listed dictionary authority remain manual.';
const modifiers=new Set('planned proposed scheduled current future other additional required specified permitted authorized documented reported repeated separate timely necessary suitable'.split(' '));
const tokenBefore=(source,end)=>{let at=end;while(at>0&&/\s/.test(source[at-1]))at--;const finish=at;while(at>0&&!/\s/.test(source[at-1]))at--;return {start:at,end,word:source.slice(at,finish)};};
const article=/^(?:the|these|those|all|any|their|its|our|your)$/i;
const object=/^(?:requires?|provides?|reviews?|records?|documents?|includes?|reports?|authorizes?|allows?|permits?)$/i;
const ending=/^\s*(?:[.;,:!?)]|$)|^\s+(?:of|for|with|without|under|in|during|are|were|have|shall|must|may|will|include|require|receive|remain|apply)(?![\p{L}\p{N}\p{M}_])/iu;
const objectEnd=/^\s*(?:[.;,:!?)]|$)|^\s+(?:of|for|with|without|under|in|during)(?![\p{L}\p{N}\p{M}_])/iu;
const pluralPredicate=/^\s+(?:are|were|have|shall|must|may|will|include|require|receive|remain|apply)(?![\p{L}\p{N}\p{M}_])/iu;
const possessive=new RegExp("^(['’])\\s+((?:"+nounHeadPattern+'|timing))(?![\\p{L}\\p{N}\\p{M}_])','iu');
export function createExtendedPluralRoleReader(doc,ctx,quantity){
 const source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),singleQuotes=[...source.matchAll(/(?<![\p{L}\p{N}\p{M}_])(?:‘[^’]*’|'[^']*')/gu)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const valid=r=>r&&!cutsOriginalStyleWord(doc,r.start)&&!cutsOriginalStyleWord(doc,r.end)&&!blocked(r.start,r.end)&&!singleQuotes.some(q=>q.start<r.end&&q.end>r.start);
 const read=(start,end)=>{
  const after=source.slice(end),nounEnd=ending.exec(after),objectBoundary=objectEnd.exec(after),evidence=[];let phraseStart=start;
  for(;;){const t=tokenBefore(source,phraseStart);if(!modifiers.has(t.word)||t.start===phraseStart)break;phraseStart=t.start;}
  const left=tokenBefore(source,phraseStart),count=quantity(phraseStart);
  if(nounEnd&&article.test(left.word))evidence.push({start:left.start,end:end+nounEnd[0].length});
  if(nounEnd&&count)evidence.push({start:count.start,end:end+nounEnd[0].length});
  if(objectBoundary&&object.test(left.word))evidence.push({start:left.start,end:end+objectBoundary[0].length});
  const sentence=ctx.sentenceAt(start),opening=/(?:^|[;:])\s*(?:\([a-z\d]+\)\s*)*$/i.exec(source.slice(sentence.start,phraseStart)),predicate=pluralPredicate.exec(after);
  if(opening&&predicate)evidence.push({start:sentence.start+opening.index,end:end+predicate[0].length});
  // Read the whole explicit existential predicate before the count/modifiers.
  const last=tokenBefore(source,count?.start??phraseStart);
  if(nounEnd&&/^(?:are|were)$/i.test(last.word)){const there=tokenBefore(source,last.start);if(/^there$/i.test(there.word))evidence.push({start:there.start,end:end+nounEnd[0].length});}
  if(nounEnd&&/^be$/i.test(last.word)){const will=tokenBefore(source,last.start),there=tokenBefore(source,will.start);if(/^will$/i.test(will.word)&&/^there$/i.test(there.word))evidence.push({start:there.start,end:end+nounEnd[0].length});}
  const poss=possessive.exec(after),possEvidence=poss&&{start,end:end+poss[0].length};
  if(poss&&/^[a-z]/.test(poss[2])&&!/^\s+[A-Z][a-z]/.test(source.slice(possEvidence.end))&&valid(possEvidence))return {end:end+poss[1].length,apostrophe:poss[1],kind:'possessive',evidence:possEvidence};
  const selected=evidence.find(valid);return selected?{end,apostrophe:'',kind:phraseStart<start?'modified noun':'explicit noun',evidence:selected}:null;
 };
 // Apply paired single-literal protection to existing nominal paths too;
 // otherwise an older article+predicate cue could bypass the new reader.
 read.literalAt=(start,end)=>singleQuotes.some(q=>q.start<end&&q.end>start);
 return read;
}
