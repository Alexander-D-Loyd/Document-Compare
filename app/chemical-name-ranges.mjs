// A bounded lexical recognizer for locants inside selected chemical names.
// This preserves identifier digits; it neither validates a chemical identity
// nor accepts its spelling. IUPAC locant definition: https://goldbook.iupac.org/terms/view/09014
const root=/methyl|ethyl|propyl|butyl|pentyl|hexyl|phenyl|phenanthr|benz|naphth|napthal|indol|pyrrol|piperidin|morpholin|adamant|cannabino|tetrahydro|fluoro|chloro|bromo|chromen|chroman|hydroxy|methoxy|ethoxy|bicyclo/i;
const prefix=/(?<![\p{L}\p{N}_])(?:[\p{L}][\p{L}()[\]′’']*-)?(?:\d+[a-zA-Z]?[′’']?(?:\s*,\s*\d+[a-zA-Z]?[′’']?)*|[NOS](?:\s*,\s*[NOS])*)\s*-\s*/gu;
const atom=/[\p{L}\p{N}()[\],+−′’'-]/u;
// Selected chemical stems split in the source AB 8 PDFs. A space is joined
// only when the two complete fragments form one of these stems, rather than
// extending an identifier into the next ordinary prose word.
const dividedStems=new Set(['trimethyl','phenanthridin','benzoxazin']);
export function chemicalNameRanges(source){
 const ranges=[];
 for(const m of source.matchAll(prefix)){
  if(m.index<(ranges.at(-1)?.end||0))continue;
  let end=m.index+m[0].length,depth=0;
  for(;end<source.length&&end-m.index<2048;){
   const c=source[end];
   if(atom.test(c)){if(c==='('||c==='[')depth++;if(c===')'||c===']')depth=Math.max(0,depth-1);end++;continue;}
   // Bracketed bicyclic bridge descriptors, such as bicyclo[3.1.1], use
   // internal periods. A sentence-ending period must still end the name.
   if(c==='.'&&depth>0&&/\d/.test(source[end-1]||'')&&/\d/.test(source[end+1]||'')){end++;continue;}
   if(!/\s/u.test(c))break;
   const gap=/^\s+/.exec(source.slice(end))?.[0]||'',next=source.slice(end+gap.length),prior=source.slice(m.index,end).trimEnd();
   const nextWord=/^[\p{L}\p{N}]+/u.exec(next)?.[0]||'',lastWord=/[\p{L}\p{N}]+$/u.exec(prior)?.[0]||'';
   const punctuation=/^[-()[\],+−]/.test(next)||/[-([,+−]$/.test(prior);
   const tracked=nextWord.length===1&&lastWord.length===1;
   const divided=[...dividedStems].some(stem=>(lastWord+nextWord).toLowerCase().endsWith(stem)&&!nextWord.toLowerCase().endsWith(stem));
   // Only a broken, still-open chemical expression may join a newline.
   // Ordinary whitespace before another prose word ends the identifier.
   if(!punctuation&&!tracked&&!divided&&!(gap.includes('\n')&&depth>0))break;
   end+=gap.length;
  }
  const name=source.slice(m.index,end).replace(/\s/g,'');
  if(root.test(name))ranges.push({start:m.index,end});
 }
 for(const m of source.matchAll(/\bdelta\s*[- ]\s*\d+\s*[- ]\s*tetrahydrocannabinol\b/gi))ranges.push({start:m.index,end:m.index+m[0].length});
 // Selected research-code families printed in the AB 8 controlled-substance
 // list are serial identifiers. Unknown code prefixes remain reviewable.
 for(const m of source.matchAll(/\b(?:AB|AKB|AM|JWH|STS|RCS|CP|HU|URB|UR|WIN)\s*[- ]\s*\d+(?:[,-]\d+)*\b/g))ranges.push({start:m.index,end:m.index+m[0].length});
 for(const m of source.matchAll(/\b\d+-position\s+of\s+the\s+(?:phenolic|indene|indole|benzene|phenyl)\s+ring\b/gi))ranges.push({start:m.index,end:m.index+m[0].length});
 return ranges.sort((a,b)=>a.start-b.start);
}
