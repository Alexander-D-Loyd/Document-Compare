import guidePhrases from './data/guide-spelling-phrases.json' with {type:'json'};
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const forms=guidePhrases.phrases.flatMap(({phrase})=>[phrase,phrase[0].toUpperCase()+phrase.slice(1)]);
const pattern=new RegExp('(?<![\\p{L}\\p{N}_])(?:'+forms.map(p=>p.split(' ').map(escape).join('\\s{1,4096}')).join('|')+')(?![\\p{L}\\p{N}_])','gu');

// Preserve all source offsets and text. Only exact complete guide phrases
// supply spelling acceptance, never their isolated words or near matches.
export function guidePhraseSpellingRanges(doc){
 const chars=doc.text.split('');
 const knownHead=b=>b.runningHead||b.ignored&&b.formatting?.headerParts?.length;
 for(const b of doc.blocks){
  const end=knownHead(b)?b.end:b.start+(b.margin?.length||0);
  for(let at=b.start;at<end;at++)if(chars[at]!=='\n')chars[at]=' ';
 }
 const source=chars.join(''),ranges=[];
 for(const m of source.matchAll(pattern)){
  const start=m.index,end=start+m[0].length;
  if((doc.struck||[]).some(r=>r.start<end&&r.end>start))continue;
  if((doc.excluded||[]).some(r=>r.start<=start&&r.end>start||r.start<end&&r.end>=end))continue;
  if(doc.blocks.some(b=>b.ignored&&b.start<end&&b.end>start&&(!knownHead(b)||b.start<=start||b.end>=end)))continue;
  ranges.push({start,end,phrase:m[0].replace(/\s+/g,' ')});
 }
 return ranges;
}
