import lexicon from './data/lcb-prefix-roots.json' with {type:'json'};
const common=new Set(lexicon.commonRoots),proper=new Set([...lexicon.properRoots,...lexicon.listedProperRoots.map(r=>r.root)]);
const foreignNon=new Set(lexicon.foreignExpressionRoots.flatMap(r=>[r.root,r.root==='sequitur'?'sequiturs':r.root]));
const page={anti:9,bi:9,multi:12,non:12};
// A root can be the first part of a compound base. Do not join just that
// fragment: the GPO ambiguity examples and these explicit corpus phrases
// need whole-base review. This protection is not a spelling whitelist.
const compoundBases=new Map([
 ['non:civil',/^[\s-]+service\b/i],['non:tumor',/^[\s-]+bearing\b/i],
 ['non:life',/^[\s-]+threatening\b/i],['non:revenue',/^[\s-]+producing\b/i],
 ['anti:hog',/^[\s-]+cholera\b/i],['anti:money',/^[\s-]+laundering\b/i],
]);
const pattern=/(?<![\p{L}\p{N}_])(?<prefix>anti|bi|multi|non)(?<join>[\s-]+)(?<root>[\p{L}]{3,30})(?![\p{L}\p{N}_])/giu;
const antiSolid=/(?<![\p{L}\p{N}_])(?<prefix>anti|Anti)(?<root>i[a-z]{2,29}|[A-Z][a-z]{2,29})(?![\p{L}\p{N}_])/gu;
export const LCB_PREFIX_LEXICON_SCOPE={commonRoots:common.size,properRoots:proper.size,scope:lexicon.scope,foreignExceptions:lexicon.foreignExpressionRoots};
// Other explicitly productive compound-format rules can use the same offline
// roots. This still supplies no approval of a complete compound's spelling.
export const isCommonLexicalRoot=root=>common.has(root);
export function lexicalPrefixCandidates(source){
 const candidates=[];
 for(const m of [...source.matchAll(pattern),...source.matchAll(antiSolid)]){
  const prefix=m.groups.prefix.toLowerCase(),root=m.groups.root,join=m.groups.join||'',lower=root.toLowerCase();
  // Non is also a Latin word; these expressions are not ordinary prefixes.
  if(prefix==='non'&&foreignNon.has(lower))continue;
  // GPO 6.32 explicitly distinguishes multi-ply from multiply. Preserve the
  // user's conflict exclusion rather than joining this homograph blindly.
  if(prefix==='multi'&&/^(?:ply|plies)$/.test(lower))continue;
  // Duplicated prefixes and compound bases have their own exceptions.
  if(lower.startsWith(prefix)||/^\s*-[a-z]/i.test(source.slice(m.index+m[0].length)))continue;
  if(compoundBases.get(prefix+':'+lower)?.test(source.slice(m.index+m[0].length)))continue;
  const properRoot=proper.has(root);
  if(/^[A-Z]/.test(root)){if(prefix!=='anti'||!properRoot)continue;}
  else if(!common.has(root))continue;
  const hyphen=prefix==='anti'&&(properRoot||lower.startsWith('i'));
  const preferred=prefix+(hyphen?'-':'')+root;
  if(m[0].replace(/\s+/g,' ').toLowerCase()===preferred.toLowerCase())continue;
  if(!join&&!hyphen)continue;
  candidates.push({m,r:{page:page[prefix],prefix,root,preferred,hyphen,lexical:true,properRoot}});
 }
 return candidates;
}
