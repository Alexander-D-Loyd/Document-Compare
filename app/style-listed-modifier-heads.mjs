import {nounHeadMatch} from './style-noun-heads.mjs';
import {qualifiedDescriptorHeadMatch} from './style-qualified-descriptor-heads.mjs';

// Selected noun roles independently observed in bill text. This vocabulary is
// grammatical evidence, not a spelling authority or unrestricted adjective
// parser. Keep the entire recognized phrase for subsequent participle guards.
const selectedHead=/^\s+(?:workloads?|adjustments?|learning)\b/i;
const qualifiedHead=/^\s+(?:professional\s+(?:learning|training|development|services?|standards?|practices?)|residential\s+(?:projects?|developments?|propert(?:y|ies)|units?|buildings?|facilit(?:y|ies)|housing))\b/i;
// LCB explicitly prints full-time equivalent student. These selected noun
// phrases are also observed in bills; do not promote "equivalent" alone to
// a universal noun or infer an unfamiliar qualification.
const timeEquivalentHead=/^\s+equivalent\s+(?:(?:certificated|classified|nonmanagement)\s+)?(?:students?|employees?|staff|veterinarians?)\b/i;

export function listedModifierHeadMatch(after,form) {
  // The existing complete full-time-equivalent word-choice rule owns that
  // phrase; do not generate a competing partial full-time finding here.
  return nounHeadMatch(after)||selectedHead.exec(after)||qualifiedHead.exec(after)||qualifiedDescriptorHeadMatch(after)||(/^(?:part|half)-time$/.test(form||'')?timeEquivalentHead.exec(after):null);
}

// A modifier can precede another explicitly listed unit modifier. Retain the
// entire chain as evidence, rather than treating its first word as a noun.
// Two intervening modifiers is the deliberate limit; unfamiliar/open phrases
// and arbitrary adjective runs do not become new grammar by this route.
export function modifierChainHeadMatcher(forms){
 const patterns=forms.map(({form})=>{const body=form.split('-').map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/[’']/g,"[’']")).join('[\\s-]{1,300}');return {form,pattern:new RegExp('^\\s+'+body+'\\b','i'),ending:new RegExp('\\b'+body+'\\s+$','i')};}).sort((a,b)=>b.form.length-a.form.length);
 const match=(after,form,depth=0)=>{
  let startsModifier=false;
  for(const item of patterns){
   const prefix=item.pattern.exec(after);if(!prefix)continue;
   startsModifier=true;if(depth>=2)return null;
   const tail=match(after.slice(prefix[0].length),item.form,depth+1);
   if(tail)return Object.assign([prefix[0]+tail[0]],{chain:[item.form,...(tail.chain||[])],head:tail.head});
  }
  if(startsModifier)return null;
  const noun=listedModifierHeadMatch(after,form);
  return noun?Object.assign([...noun],{chain:[],head:noun.nounHead||noun[0].trim(),requiresEvidence:!!noun.requiresEvidence}):null;
 };
 const endings=patterns.map(item=>item.ending);
 match.prefixStart=(source,start)=>{
  for(let n=0;n<2;n++){
   const base=Math.max(0,start-300),before=source.slice(base,start),found=endings.map(p=>p.exec(before)).filter(Boolean).sort((a,b)=>a.index-b.index)[0];
   if(!found)break;start=base+found.index;
  }
  return start;
 };
 return match;
}
