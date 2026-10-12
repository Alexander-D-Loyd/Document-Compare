// Discover complete introduced list candidates with one forward merge of
// lexical runs and introducers. Source wrapping has no arbitrary length cap.
// The existing finite item grammar rejects embedded introducer verbs/clauses,
// so only the last introducer within a run can establish its complete suffix.
// This also avoids repeatedly copying a long run of nested failed clauses.
export function* introducedListRanges(source,introducers,{semicolons=false}={}){
 // Numerical punctuation belongs to a complete token. Preserve decimals,
 // fractions, colon pairs and percentages through wrapping; unfamiliar mixed
 // structures remain whole for the stricter punctuation-item validator.
 const figure='[+−]?(?:\\d+(?:,\\d{3})*(?:\\.\\d+)*|\\.\\d+)(?:\\s*[:/⁄]\\s*\\d+(?:,\\d{3})*)*(?:[ \\t]*%)?';
 const runs=source.matchAll(new RegExp('(?:'+figure+'|[a-z,'+(semicolons?';':'')+'\\s-])+','gi')),intro=source.matchAll(new RegExp('\\b(?:'+introducers+')\\s+','gi'));
 let current=intro.next();
 for(const run of runs){
  const end=run.index+run[0].length;let last=null;
  while(!current.done&&current.value.index<end){const m=current.value;if(m.index>=run.index&&m.index+m[0].length<end)last=m;current=intro.next();}
  if(!last||end<source.length&&!(semicolons?/[.!?]/:/[.;:!?)]/).test(source[end]))continue;
  yield {start:last.index,listStart:last.index+last[0].length,end};
 }
}
export const cutsOriginalSourceWord=(doc,index)=>/[\p{L}\p{N}_]$/u.test(doc.text.slice(Math.max(0,index-2),index))&&/^[\p{L}\p{N}_]/u.test(doc.text.slice(index,index+2));
