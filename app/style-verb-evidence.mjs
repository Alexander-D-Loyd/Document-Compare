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
export function explicitVerbRange(ctx,start,form){
 const sentence=ctx.sentenceAt(start),begin=Math.max(sentence.start,start-100),before=ctx.source.slice(begin,start);
 const patterns={base:[modal,pluralSubject],third:[singleSubject],past:[perfect,singleSubject,pluralSubject],'finite-past':[singleSubject,pluralSubject],perfect:[perfect],participle:[progressive,gerund]}[form]||[];
 for(const pattern of patterns){const match=pattern.exec(before);if(match)return {start:begin+match.index,end:start};}
 if(form==='base'&&/^\s*$/.test(before))return {start,end:start};
 return null;
}
export const explicitVerbEvidence=(ctx,start,form)=>!!explicitVerbRange(ctx,start,form);
