// Complete, selected source examples are role evidence for coordination. Their
// individual checker retains its own source references and noun restrictions.
export const LCB_PREDICATE_EXAMPLES=['cost-effective','hearing-impaired','hands-free','age-appropriate','high-quality','tax-exempt','well-known'];
export const PREDICATE_EXAMPLES=[...LCB_PREDICATE_EXAMPLES,'crystal-clear','fire-tested'];
export function predicateBodyDash(raw,source,m){return raw.slice(m.index,m.index+m[0].length).split('').some((c,i)=>/[‒–—―]/u.test(c)&&/\S/u.test(source[m.index+i]));}
export function listedPredicateCandidates(source,raw=source){
 return PREDICATE_EXAMPLES.flatMap(form=>[...source.matchAll(new RegExp('(?<![\\p{L}\\p{N}_-])'+form.split('-').join('\\s*-\\s*')+'(?![\\p{L}\\p{N}_-])','giu'))].map(m=>({m,form}))).filter(({m})=>!/[A-Z]/.test(m[0].slice(1))&&!predicateBodyDash(raw,source,m)).sort((a,b)=>a.m.index-b.m.index);
}
