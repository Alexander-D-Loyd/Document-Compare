import {ones,tens,ordinalOnes,ordinalTens,canonicalWrittenValue,spellOrdinal} from './style-cardinal-values.mjs';
import {originalBodyStyleContext,cutsOriginalStyleWord,styleEvidenceGuard} from './style-evidence.mjs';
const scales=['hundred','thousand','million','billion','trillion'],ordinalScale=scales.map(w=>w+'th');
const ordinalToCardinal=new Map([...ordinalOnes.map((w,i)=>[w,ones[i]]),...ordinalTens.slice(2).map((w,i)=>[w,tens[i+2]]),...ordinalScale.map((w,i)=>[w,scales[i]])]);
// Evidence discovery sees Unicode/underscore-attached fragments but excludes
// ordinary ASCII words such as the duration noun seconds. Complete original
// word boundaries are checked before any positive value can be used.
const vocabulary=[...ones,...tens.slice(2),...scales,...ordinalToCardinal.keys(),'and'].sort((a,b)=>b.length-a.length),token=new RegExp('(?<![A-Za-z0-9])(?:'+vocabulary.join('|')+')(?![A-Za-z0-9])','gi');
export function writtenOrdinalRuns(source){
 const runs=[];let group=[];
 const flush=()=>{let first=0,last=group.length-1;while(first<=last&&group[first][0].toLowerCase()==='and')first++;while(last>=first&&group[last][0].toLowerCase()==='and')last--;const selected=group.slice(first,last+1);if(selected.some(m=>ordinalToCardinal.has(m[0].toLowerCase())))runs.push({start:selected[0].index,end:selected.at(-1).index+selected.at(-1)[0].length});group=[];};
 for(const m of source.matchAll(token)){const last=group.at(-1);if(last&&(!/^[\s-]+$/.test(source.slice(last.index+last[0].length,m.index))||m[0].toLowerCase()==='and'&&ordinalToCardinal.has(last[0].toLowerCase())))flush();group.push(m);}flush();return runs;
}
export function canonicalWrittenOrdinalValue(text){
 const words=text.toLowerCase().replace(/[\s-]+/g,' ').trim().split(' '),last=words.at(-1);
 if(!ordinalToCardinal.has(last)||words.slice(0,-1).some(w=>ordinalToCardinal.has(w))||words.some((w,i)=>w==='and'&&(!scales.includes(words[i-1])||!words[i+1]||words[i+1]==='and')))return null;
 const plain=words.filter(w=>w!=='and'),cardinal=[...plain.slice(0,-1),ordinalToCardinal.get(last)].join(' '),value=canonicalWrittenValue(cardinal);
 return value!==null&&spellOrdinal(value).replace(/-/g,' ')===plain.join(' ')?value:null;
}
const heads='amendment|congress|circuit|street|avenue|applicant|child|day|year|anniversary|meeting|session|occurrence|edition|student|participant|position|row|page|chapter|section|sentence|instance|event|payment|installment|month|week|place|floor|step|stage|attempt|round|phase|batch|record|request|candidate|appointment|term|period|occasion|recipient|license|application|provision|paragraph|subdivision|subchapter|division|part';
const rankHead=new RegExp('^\\s+(?:'+heads+')\\b(?:\\s*(?:[.;,:!?)]|$)|\\s+(?:of|is|was|shall|must|may|will|becomes?|applies|qualifies|receives|requires)\\b)','i');
export function ordinalRankEvidenceEnd(source,end){const m=rankHead.exec(source.slice(end));return m?end+m[0].length:null;}
const scalePattern=new RegExp('\\b(?:'+scales.join('|')+'|'+ordinalScale.join('|')+')\\b','i');
const hasScale=text=>scalePattern.test(text);
export const isScaleOrdinalRun=(source,run)=>hasScale(source.slice(run.start,run.end));
export const WHOLE_ORDINAL_EVIDENCE_SCOPE=' Complete canonical scale ordinals have no fixed13-word prefix limit and retain safe-integer values. Every original ordinal component and complete singular-rank cue remains evidence across identified page heads. Masked prefixes, ordinal words, Unicode boundaries, literals, tables and unknown body gaps cannot invent suffix ranks or cardinal fragments. Existing intact plural count-plus-adjective constructions and ordinary ordinal series retain their separate roles. Unknown rank vocabulary, mathematical meanings, general syntax and whole-rule compliance remain incomplete.';
export function writtenOrdinalEvidenceGuard(doc,ctx){
 const current=writtenOrdinalRuns(ctx.source),evidence=styleEvidenceGuard(doc,ctx);let original=null,prepared=false,originalSource=null;
 const extend=(runs,source,start,end)=>{let lo=0,hi=runs.length;while(lo<hi){const mid=(lo+hi)>>1;if(runs[mid].end<=start)lo=mid+1;else hi=mid;}let a=start,b=end,invalid=false;for(let i=lo;i<runs.length&&runs[i].start<end;i++){const r=runs[i],text=source.slice(r.start,r.end);a=Math.min(a,r.start);b=Math.max(b,r.end,ordinalRankEvidenceEnd(source,r.end)||r.end);if(cutsOriginalStyleWord({text:source},r.start)||cutsOriginalStyleWord({text:source},r.end)||isScaleOrdinalRun(source,r)&&(canonicalWrittenOrdinalValue(text)===null||/\b[A-Z][a-z]+[\s-]+[A-Z][a-z]+/.test(text)||text===text.toUpperCase()||/^\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/.test(source.slice(r.end))))invalid=true;}return {start:a,end:b,invalid};};
 return (start,end,evidenceEnd=end)=>{
  if(cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||cutsOriginalStyleWord(doc,evidenceEnd))return true;
  let range=extend(current,ctx.source,start,end);
  if(!prepared){prepared=true;const restored=originalBodyStyleContext(doc);if(restored){originalSource=restored.source;original=writtenOrdinalRuns(originalSource);}}
  if(original){const r=extend(original,originalSource,start,end);range={start:Math.min(range.start,r.start),end:Math.max(range.end,r.end),invalid:range.invalid||r.invalid};}
  return range.invalid||evidence(range.start,Math.max(range.end,evidenceEnd));
 };
}
