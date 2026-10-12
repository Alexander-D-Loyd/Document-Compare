// GPO2.25 closes a reference chain, permits division after an element in
// parentheses without a hyphen, and shows spaced shared-prefix alternatives.
// Retain an existing shared gap; do not guess a missing abbreviation boundary.
const pattern=/\b(sections?|paragraphs?|subdivisions?|subparagraphs?|subsections?)\s+(\d+(?:\.\d+)*|[a-z]|\([a-z\d]+\))((?:(?:\s*|(?<=\))-[ \t]*\n\s*)\([a-z\d]+\)){1,32})(?=\s|[,.;:!?)]|$)/gi;
export function referenceNotationParts(source){
 const parts=[];
 for(const m of source.matchAll(pattern)){
  const start=m.index,end=start+m[0].length,groups=[...m[3].matchAll(/(\s*|-[ \t]*\n\s*)(\([a-z\d]+\))/gi)],shared=/^\s+(?:and|or|nor)\s+\([a-z\d]+\)(?=\s|[,.;:!?)]|$)/i.exec(source.slice(end));
  let prior=m[2],changed=false,suggestion=m[1]+' '+m[2];
  for(const [i,g]of groups.entries()){
   const gap=g[1],preservedShared=!!shared&&i===groups.length-1&&!!gap&&!gap.includes('-'),permittedDivision=gap.includes('\n')&&prior.endsWith(')')&&!gap.includes('-');
   if(gap&&!preservedShared&&!permittedDivision)changed=true;
   suggestion+=(preservedShared?' ':'')+g[2];prior=g[2];
  }
  if(changed)parts.push({start,end,evidenceEnd:end+(shared?.[0].length||0),text:m[0],suggestion,shared:!!shared});
 }
 return parts;
}
