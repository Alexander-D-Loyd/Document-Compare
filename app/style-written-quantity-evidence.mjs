import {ones,tens,canonicalWrittenValue} from './style-cardinal-values.mjs';
import {originalBodyStyleContext,cutsOriginalStyleWord,styleEvidenceGuard} from './style-evidence.mjs';
const words=[...ones,...tens.slice(2),'hundred','thousand','million','billion','trillion','and'];
const token=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?:'+words.join('|')+')(?![\\p{L}\\p{N}\\p{M}_])','giu');
// Whole lexical runs are conservative evidence ranges only. Never infer a
// numerical value from them; canonical value checks remain separate.
export function writtenCardinalRuns(source){
 const runs=[];let group=[];
 const flush=()=>{let first=0,last=group.length-1;while(first<=last&&group[first][0].toLowerCase()==='and')first++;while(last>=first&&group[last][0].toLowerCase()==='and')last--;if(first<=last)runs.push({start:group[first].index,end:group[last].index+group[last][0].length});group=[];};
 for(const m of source.matchAll(token)){const last=group.at(-1);if(last&&!/^[\s-]+$/.test(source.slice(last.index+last[0].length,m.index)))flush();group.push(m);}flush();return runs;
}
// Unconjoined adjacent cardinal words are one potential quantity. If that
// whole run is noncanonical, never guess a value from just its prefix/suffix.
// Conjoined lists retain their independent numeral and related-series checks.
export function invalidUnconjoinedCardinalRanges(source,establishedCounts=[]){
 const ranges=[],countsAt=new Map(establishedCounts.map(r=>[r.start,r]));
 for(const run of writtenCardinalRuns(source)){
  // A separately established introduced-list count can precede a numerical
  // modifier (twenty-one two-year programs). Its existing complete grammar
  // distinguishes two quantities; mere adjacency cannot establish this split.
  const found=countsAt.get(run.start),atom=found&&found.end<run.end&&canonicalWrittenValue(source.slice(found.start,found.end))!==null?found:null;
  const start=atom?atom.end+source.slice(atom.end,run.end).search(/\S/):run.start;
  const value=source.slice(start,run.end).toLowerCase().replace(/[\s-]+/g,' ').trim(),parts=value.split(' ');
  if(parts.length>1&&!parts.includes('and')&&canonicalWrittenValue(value)===null)ranges.push({start,end:run.end});
 }
 return ranges;
}
export const UNCONJOINED_CARDINAL_SCOPE=' Complete unconjoined cardinal runs must be canonical before any component receives a numeral correction. Malformed adjacent counts protect their prefixes and suffixes; ordinary and/or series, independent quantities and dedicated ordinal/fraction checks retain their existing roles. Separately established introduced-list counts remain distinct from recognized nested numerical modifiers; adjacency alone cannot justify a split. This protects ambiguous wording rather than repairing its meaning. General numerical semantics, arbitrary vocabulary and whole-rule compliance remain incomplete.';
export const WRITTEN_QUANTITY_EVIDENCE_SCOPE=' Complete written cardinal runs retain every original word and connecting space, including leading/trailing components lost to strikes or exclusions. Conservative original-source evidence never supplies a positive finding or value. Recognized interior page heads preserve complete quantities and selected noun evidence; unknown body gaps, literals, tables and Unicode fragments remain protected. Broader numerical meaning, unfamiliar noun roles, sentence parsing and whole-rule coverage remain incomplete.';
export function writtenQuantityEvidenceGuard(doc,ctx){
 const current=writtenCardinalRuns(ctx.source),evidence=styleEvidenceGuard(doc,ctx);let original=null,prepared=false;
 const extend=(runs,start,end)=>{let lo=0,hi=runs.length;while(lo<hi){const mid=(lo+hi)>>1;if(runs[mid].end<=start)lo=mid+1;else hi=mid;}
  let a=start,b=end;for(let i=lo;i<runs.length&&runs[i].start<end;i++){a=Math.min(a,runs[i].start);b=Math.max(b,runs[i].end);}return {start:a,end:b};};
 return (start,end,evidenceEnd=end)=>{
  if(cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||cutsOriginalStyleWord(doc,evidenceEnd))return true;
  let range=extend(current,start,end);
  if(!prepared){prepared=true;const restored=originalBodyStyleContext(doc);original=restored?writtenCardinalRuns(restored.source):null;}
  if(original){const r=extend(original,start,end);range={start:Math.min(range.start,r.start),end:Math.max(range.end,r.end)};}
  return evidence(range.start,Math.max(range.end,evidenceEnd));
 };
}
