// Registry callers supply ordered, escaped, noncapturing name alternatives.
// Contiguous chunks retain the exact original alternative order. No shared
// registry state, source rewriting, fuzzy identity or authority merge occurs.
export const REGISTRY_PATTERN_SOURCE_BUDGET=32768;
export const REGISTRY_CHUNK_SOURCE_BUDGET=4096;
export function createBoundedRegistryMatcher(alternatives,{prefix='',suffix='',flags='giu',maxSourceCharacters=REGISTRY_PATTERN_SOURCE_BUDGET}={}){
 if(!Array.isArray(alternatives)||alternatives.some(branch=>typeof branch!=='string'||!branch.length)||typeof prefix!=='string'||typeof suffix!=='string'||!['g','gu','gi','giu'].includes(flags)||!Number.isSafeInteger(maxSourceCharacters)||maxSourceCharacters<1)throw Error('Invalid bounded registry pattern configuration.');
 const fixed=prefix.length+suffix.length+4,total=alternatives.reduce((sum,branch)=>sum+branch.length,Math.max(0,alternatives.length-1))+fixed,largest=alternatives.reduce((length,branch)=>Math.max(length,branch.length),0);
 // Preserve the default small-list union. Once that union is oversized,
 // smaller chunks avoid expensive compilation of very long common prefixes.
 const budget=total<=maxSourceCharacters?maxSourceCharacters:Math.min(maxSourceCharacters,Math.max(REGISTRY_CHUNK_SOURCE_BUDGET,fixed+largest)),chunks=[];let branches=[],length=fixed;
 for(const branch of alternatives){
  if(fixed+branch.length>maxSourceCharacters)throw Error('A registry name exceeds the bounded pattern source budget.');
  if(branches.length&&length+1+branch.length>budget){chunks.push(prefix+'(?:'+branches.join('|')+')'+suffix);branches=[];length=fixed;}
  length+=(branches.length?1:0)+branch.length;branches.push(branch);
 }if(branches.length)chunks.push(prefix+'(?:'+branches.join('|')+')'+suffix);
 const patterns=chunks.map(source=>new RegExp(source,flags)),unicode=flags.includes('u');
 function* matchAll(source){
  if(typeof source!=='string')throw Error('Registry matching requires source text.');
  if(patterns.length===1){yield* source.matchAll(patterns[0]);return;}
  if(!patterns.length)return;
  // Each iterator owns fresh cursors. Cached matches are only the next exec
  // from each chunk, not precollected globally nonoverlapping match lists.
  const active=patterns.map(pattern=>new RegExp(pattern.source,pattern.flags)),next=active.map(pattern=>pattern.exec(source));
  for(;;){
   let selected=-1;for(let n=0;n<next.length;n++)if(next[n]&&(selected<0||next[n].index<next[selected].index))selected=n;
   if(selected<0)return;
   const found=next[selected];
   // Registry names are nonempty; this also preserves matchAll advancement
   // for a zero-width test branch, including a complete Unicode code point.
   let cursor=found.index+found[0].length;
   if(!found[0].length)cursor+=unicode&&source.codePointAt(found.index)>0xffff?2:1;
   // Capture advancement before exposing the mutable native match array.
   // Search remains lazy until the caller requests the next result.
   yield found;
   for(let n=0;n<next.length;n++)if(n===selected||next[n]&&next[n].index<cursor){
    active[n].lastIndex=cursor;next[n]=active[n].exec(source);
   }
  }
 }
 return Object.freeze({patternCount:patterns.length,sourceLengths:Object.freeze(chunks.map(source=>source.length)),matchAll});
}
