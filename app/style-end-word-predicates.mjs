import {isCommonLexicalRoot} from './lcb-prefix-candidates.mjs';
import {predicateCompoundMatches,predicateRangeKey} from './style-predicate-evidence.mjs';
import {LISTED_NOUN_RULES} from './style-listed-nouns.mjs';
import {LCB_EXPRESSION_FORMS} from './style-lcb-expressions.mjs';
import {LCB_ROLE_FORMS} from './style-lcb-role-forms.mjs';

// Predicate position opens the final participle boundary, not every hyphen in
// the noun base. Only complete, explicitly listed base forms supply spelling
// authority. Unknown multiword bases retain their printed internal punctuation.
const baseKey=s=>s.replace(/[\s-]+/g,'').toLowerCase();
const listedBases=new Map([
 ...LISTED_NOUN_RULES,
 ...LCB_EXPRESSION_FORMS.filter(r=>r.role==='noun'||r.preferred==='attorney-in-fact'),
 ...LCB_ROLE_FORMS.filter(r=>r.role==='noun'||r.role==='noun or modifier'||r.preferred==='public health'),
].map(r=>[baseKey(r.variant),r]));
// These familiar open bases already have whole-phrase modifier checks. Their
// lexical sense still requires review; this is not a general word-joining rule.
const openBases=new Map([['mentalhealth','mental health'],['datasharing','data sharing']]);
export const listedNominalBase=base=>listedBases.get(baseKey(base));
function baseForm(m){
 const words=m[0].split(/\s*-\s*/),ending=words.pop(),printed=words.join('-'),listed=listedNominalBase(printed);
 let preferred=listed?.preferred||openBases.get(baseKey(printed))||printed;
 if(/^[A-Z]/.test(printed))preferred=preferred[0].toUpperCase()+preferred.slice(1);
 return {words,ending,preferred,listed};
}

// Match the complete compound, including its lexical base. The boundary must
// not permit a suffix-only correction inside an unfamiliar larger compound.
const pattern=/(?<![\p{L}\p{N}_-])[a-z]{1,30}(?:\s*-\s*[a-z]{1,30})+(?![\p{L}\p{N}_-])/giu;
export function productiveEndWordCandidates(source){
 return [...source.matchAll(pattern)].filter(m=>{
  if(/[A-Z]/.test(m[0].slice(1)))return false;
  const {words,ending,listed}=baseForm(m);
  if(!/^(?:adopted|approved|based|related)$/.test(ending))return false;
  return !!listed||words.every(root=>isCommonLexicalRoot(root.toLowerCase()));
 });
}
export function productiveEndWordPredicates(source,extra=[],candidates=productiveEndWordCandidates(source)){
 const found=predicateCompoundMatches(source,[...candidates,...extra]);
 return candidates.filter(m=>found.has(predicateRangeKey(m))).map(m=>{const {preferred,ending,listed}=baseForm(m);return {m,suggestion:preferred+' '+ending,baseReference:listed};});
}
