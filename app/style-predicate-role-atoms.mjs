import {PREDICATE_EXAMPLES} from './style-predicate-examples.mjs';

// These selected ordinary adjective forms and source-listed open phrases are
// grammatical cues, not independent corrections or a general POS dictionary.
// The caller still requires an explicit copula, a complete coordination and a
// confirmed predicate boundary. Unknown words and noun continuations stay out.
const adjectives=['accessible','accurate','adequate','affordable','appropriate','available','clear','complete','consistent','durable','effective','efficient','eligible','equitable','feasible','flexible','necessary','practical','ready','reasonable','reliable','safe','secure','sufficient','valid'];
const pattern=new RegExp('(?<![\\p{L}\\p{N}_-])(?:'+[...PREDICATE_EXAMPLES.map(form=>form.split('-').join('\\s+')),...adjectives].join('|')+')(?![\\p{L}\\p{N}_-])','giu');
export function predicateRoleAtoms(source,candidates){
 if(!candidates.length)return [];
 const ranges=candidates.map(m=>({start:m.index,end:m.index+m[0].length})).sort((a,b)=>a.start-b.start);
 let cursor=0;
 return [...source.matchAll(pattern)].filter(m=>{
  while(ranges[cursor]&&ranges[cursor].end<=m.index)cursor++;
  if(ranges[cursor]&&ranges[cursor].start<m.index+m[0].length)return false;
  return !/[A-Z]/.test(m[0]);
 });
}
