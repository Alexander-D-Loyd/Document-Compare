import {isCommonLexicalRoot,LCB_PREFIX_LEXICON_SCOPE}from './lcb-prefix-candidates.mjs';

export const PRODUCTIVE_LIKE_SCOPE='Unlisted intact common-root plus -like compounds receive reader review under LCB8 item5 and GPO6.31 even when the closed whole word is absent from the bundled lexical index. The exact root must be recognized, with no inferred spelling transformation. GPO proper-name and tripled-consonant exceptions remain protected; the index does not prove that a root is a noun, that the intended compound is valid or that an ordered dictionary prefers the closed form. Selected grammatical compound tails remain part of the whole selection. Arbitrary roots, complex bases, plural-like forms, source word divisions, names, quotations, tables, strikes and unknown exclusions stay protected. No replacement is asserted. This is a productive candidate method with reader judgment, not full compound semantics or dictionary authority.';
const pattern=/(?<![\p{L}\p{N}\p{M}_-])(?<affix>(?<root>[A-Za-z]{3,30})-like)(?<tail>(?:-(?:based|related|focused|dependent|eligible|required|supporting|certified|oriented)){0,3})(?![\p{L}\p{N}\p{M}_-])/giu;
export function productiveLikeCandidates(source,references){
 const gpo=references?.gpo?.pages?.find(p=>p.page===119),lcb=references?.lcb?.pages?.find(p=>p.page===8);
 if(!gpo||!lcb||!/(?:6\.31\.)[\s\S]*?Print solid words ending in like/u.test(gpo.flowText||gpo.text)||!lcb.text.includes('a prefix or a suffix'))return [];
 const found=[];for(const m of source.matchAll(pattern)){
  const root=m.groups.root.toLowerCase();
  // The like suffix begins with l. A base ending ll would create lll;
  // GPO explicitly keeps its hyphen. Proper-name cues are checked by the
  // shared source guard, and case-internal names cannot be a common base.
  if(root.endsWith('ll')||/[A-Z]/u.test(m.groups.root.slice(1))||!isCommonLexicalRoot(root)||isCommonLexicalRoot(root+'like'))continue;
  found.push({m,form:{root,suffix:'like',plural:false,productiveWitness:{base:root,closedWord:root+'like',closedWordInIndex:false,source:'GPO6.31 productive suffix rule and bundled common-root index',scope:LCB_PREFIX_LEXICON_SCOPE.scope,rule:'6.31',page:119}}});
 }return found;
}
