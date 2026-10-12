// A finite legislative noun vocabulary, with real plural forms. This is
// grammatical evidence, not a general part-of-speech guesser.
const singulars='injury illness symptom treatment examination technician veterinarian act action agreement application area assessment assistance benefit board building business care child class clause committee community contract cost coverage device development district document employee employer entity equipment facility family fee fund funding group guideline household housing individual information institution insurance interest law loan material measure member method notice number organization owner payment person personnel plan policy practice procedure process product program project property provider rate record regulation relationship report requirement resident resource responsibility rule school service standard structure student support system tax technology term training unit utility vehicle worker applicant authority agency activity allocation audit ballot basis bridge budget capacity category certificate claim clinic commission company complaint condition corporation council country court credential curriculum department election event examination exception expenditure expense finding grant highway hospital image inspection instruction investment item job license local mandate meeting obligation operation order ordinance parcel partnership patient period permit position power provision publication purchase quality receipt recommendation research resolution restriction revenue right salary schedule scheme staff state strategy study supply transaction transfer trust value vote witness work'.split(' ');
const irregular={child:'children',person:'persons',business:'businesses',basis:'bases',curriculum:'curricula',staff:'staff',research:'research',personnel:'personnel',equipment:'equipment',information:'information',housing:'housing',assistance:'assistance',care:'care',funding:'funding',insurance:'insurance',support:'support',training:'training',work:'work'};
const plural=n=>irregular[n]||(/[^aeiou]y$/.test(n)?n.slice(0,-1)+'ies':/(?:s|x|z|ch|sh)$/.test(n)?n+'es':n+'s');
export const LEGISLATIVE_NOUN_HEADS=[...new Set(singulars.flatMap(n=>[n,plural(n)]).concat(['people']))];
// Bare direct objects require plural or mass evidence. Do not treat an
// arbitrary singular noun as an object without a determiner.
export const BARE_LEGISLATIVE_OBJECT_HEADS=[...new Set(singulars.map(plural).concat(['people','requests','timing']))];
export const nounHeadPattern=LEGISLATIVE_NOUN_HEADS.sort((a,b)=>b.length-a.length).join('|');
const pattern=new RegExp('^\\s+('+nounHeadPattern+')\\b','i');
export const nounHeadMatch=after=>pattern.exec(after);
const nounPredicate=/^\s+(?:is|are|was|were|shall|must|may|will|apply|applies|qualif(?:y|ies)|means?|includes?|requires?|provides?|receives?|remains?)\b/i;
const nounObject=/\b(?:provide|provides|require|requires|use|uses|maintain|maintains|operate|operates|administer|administers|establish|establishes|support|supports|inspect|inspects|review|reviews|authorize|authorizes|fund|funds|implement|implements|offer|offers)\s+(?:(?:a|an|the|these|those|such|any|all)\s+)?$/i;
export function nounPhraseEvidenceRanges(before,afterHead){
 const ranges=[];
 for(const [side,pattern,text]of [['after',nounPredicate,afterHead],['before',nounObject,before]]){
  const m=pattern.exec(text);if(m)ranges.push({side,start:m.index,end:m.index+m[0].length});
 }
 return ranges;
}
export const nounPhraseEvidence=(before,afterHead)=>nounPredicate.test(afterHead)||nounObject.test(before);
