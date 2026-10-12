import {isCommonLexicalRoot,LCB_PREFIX_LEXICON_SCOPE}from './lcb-prefix-candidates.mjs';
import listed from './data/lcb-spelling-words.json' with {type:'json'};

export const LEXICAL_SUFFIX_FAMILIES=Object.freeze('ship hood wise ful less ness ment dom ish like ward wards fold age ance ence ity al ary ery ory ist ism ize ise ation ion ous ive able ible ed ing ly er est s es'.split(' '));
const sourceForms=new Map(listed.words.map(r=>[r.word.toLowerCase(),r]));
const suffix=LEXICAL_SUFFIX_FAMILIES.toSorted((a,b)=>b.length-a.length).join('|'),tail='based|related|focused|dependent|eligible|required|supporting|certified|oriented';
const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_-])(?<affix>(?<root>[A-Za-z]{3,30})-(?<suffix>'+suffix+')(?<plural>s)?)(?<tail>(?:-(?:'+tail+')){0,3})(?![\\p{L}\\p{N}\\p{M}_-])','giu');
function baseWitness(root){
 if(isCommonLexicalRoot(root))return {base:root,relation:'Direct lexical base'};
 if(isCommonLexicalRoot(root+'e'))return {base:root+'e',relation:'Potential final-e base'};
 if(root.endsWith('i')&&isCommonLexicalRoot(root.slice(0,-1)+'y'))return {base:root.slice(0,-1)+'y',relation:'Potential final-y base'};
 if(/([b-df-hj-np-tv-z])\1$/.test(root)&&isCommonLexicalRoot(root.slice(0,-1)))return {base:root.slice(0,-1),relation:'Potential doubled-consonant base'};
 return null;
}
export function lexicalSuffixCandidates(source){
 const found=[];
 for(const m of source.matchAll(pattern)){
  const root=m.groups.root.toLowerCase(),suffix=m.groups.suffix.toLowerCase(),plural=!!m.groups.plural,closed=root+suffix+(plural?'s':'');
  // Source-list membership does not suppress an unmatched internal hyphen.
  // The caller preserves any actual, more-specific finding. The three LCB
  // prefix exceptions retain their own rules.
  if(['ex','quasi','self'].includes(root)||!isCommonLexicalRoot(closed))continue;
  const witness=baseWitness(root);if(!witness)continue;
  const listedForm=sourceForms.get(closed);
  found.push({m,form:{root,suffix,plural,lexicalWitness:{sourceRoot:root,base:witness.base,relation:witness.relation,closedWord:closed,source:'Bundled offline lexical word list',scope:LCB_PREFIX_LEXICON_SCOPE.scope,...(listedForm?{lcbListedForm:{word:listedForm.word,page:listedForm.page,sourceEntry:listedForm.sourceEntry}}:{})}}});
 }
 return found;
}
export const LEXICAL_SUFFIX_SCOPE='Additional suffix-boundary reader review uses the existing bundled offline lexical index for38 selected derivational/inflectional suffix forms. Both a potential base and the complete closed word must occur in the index; direct, final-e/final-y and doubled-consonant base witnesses supply candidate evidence, not a morphological decision or spelling preference. Selected grammatical compound tails retain their full source span. Actual more-specific LCB findings, existing precise checks and finite suffix cases retain priority. No words are added to the spelling dictionary, and the index is not Merriam-Webster or first-listed authority. Names, literals, tables, headings, source strikes, unknown exclusions, hanging hyphens, rhetorical dashes, URLs/paths and actual PDF divisions remain protected. Unrecognized words, suffixes or spelling transformations and meaning-dependent hyphen exceptions remain unresolved; this is not general dictionary approval or full suffix automation.';
