// Bounded grammatical evidence for meaning-dependent spelling pairs. This is
// deliberately a finite subject/auxiliary grammar, not an inferred parse.
const adverbs='(?:(?:not|never|also|only|already|directly|fully|properly|generally|normally|usually|regularly|previously|recently)\\s+){0,3}';
const singular='agency|board|court|department|committee|commission|council|official|person|employer|provider|member|manager|director|owner|contractor|applicant|he|she|it';
const plural='agencies|boards|courts|departments|committees|commissions|councils|officials|persons|people|employers|providers|members|managers|directors|owners|contractors|applicants|staff|personnel|we|they|you|I';
const modal=new RegExp('\\b(?:shall|must|may|should|could|can|will|would|might|to)\\s+'+adverbs+'$','i');
const singleSubject=new RegExp('\\b(?:'+singular+')\\s+'+adverbs+'$','i');
const pluralSubject=new RegExp('\\b(?:'+plural+')\\s+'+adverbs+'$','i');
const perfect=new RegExp('\\b(?:has|have|had)\\s+'+adverbs+'$','i');
const progressive=new RegExp('\\b(?:is|are|was|were|be|been|being)\\s+'+adverbs+'$','i');
const gerund=new RegExp('\\b(?:by|after|before|when|while|without|for)\\s+'+adverbs+'$','i');
const roleAdverbs=new Set('not never also only already directly fully properly generally normally usually regularly previously recently'.split(' '));
export const FINITE_VERB_CUE_SCOPE='Meaning-verb checks retain complete finite subject/auxiliary/modal/gerund cues through actual layout whitespace, without the former 100-character clipping. Reverse lexical discovery preserves the existing subject vocabulary and at most three listed adverbs. A source entry must have an intact whole prefix before supplying imperative evidence; long whitespace cannot convert a preceding noun context into a command. Complete source evidence protects strikes, unknown exclusions, literals, tables and Unicode boundaries. Unfamiliar subjects, longer adverb grammar and intended meaning remain manual.';
export function explicitVerbRange(ctx,start,form){
 const sentence=ctx.sentenceAt(start);let cursor=start,begin=sentence.start;
 for(let n=0;n<=3;n++){
  while(cursor>sentence.start&&/\s/u.test(ctx.source[cursor-1]))cursor--;const end=cursor;
  while(cursor>sentence.start){const size=cursor>sentence.start+1&&/[\uDC00-\uDFFF]/u.test(ctx.source[cursor-1])&&/[\uD800-\uDBFF]/u.test(ctx.source[cursor-2])?2:1;if(!/[\p{L}\p{M}]/u.test(ctx.source.slice(cursor-size,cursor)))break;cursor-=size;}
  begin=cursor;if(!roleAdverbs.has(ctx.source.slice(cursor,end).toLowerCase())||cursor===sentence.start)break;
 }
 const before=ctx.source.slice(begin,start);
 const patterns={base:[modal,pluralSubject],third:[singleSubject],past:[perfect,singleSubject,pluralSubject],'finite-past':[singleSubject,pluralSubject],perfect:[perfect],participle:[progressive,gerund]}[form]||[];
 for(const pattern of patterns){const match=pattern.exec(before);if(match)return {start:begin+match.index,end:start};}
 if(form==='base'&&/^\s*$/.test(ctx.source.slice(sentence.start,start)))return {start:sentence.start,end:start,imperative:true};
 return null;
}
export const explicitVerbEvidence=(ctx,start,form)=>!!explicitVerbRange(ctx,start,form);
