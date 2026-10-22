// Conservative source boundaries for resource-limited parser chunks. A printed
// abbreviation is not proof that the surrounding grammatical sentence ended.
const abbreviation=/(?:\b(?:SEC|Sec|No|Nos|Mr|Mrs|Ms|Dr|St|Prof|Jr|Sr|Cal|App|Supp|Fed|Civ|Crim|Proc|Pen|Gov|Regs|tit|art|arts|sec|secs|subd|subds|para|paras|ch|chs|vol|vols|pp|p|fn|fns|ed|eds|rev|Reg|Sess|Sen|Assem|Cong|Com|Rep|Res|Const|Dept|Inc|Co|Corp|Ltd|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec|vs|etc|U|S|a|m|e|g|i)\.|(?:\b[A-Z]\.){2,})$/u;
export function offlineSentenceEndings(text){
 const endings=[];
 for(let at=0;at<text.length;at++){
  if(!/[.!?]/u.test(text[at]))continue;
  if(text[at]==='.'&&((/\d/u.test(text[at-1]||'')&&/\d/u.test(text[at+1]||''))||abbreviation.test(text.slice(Math.max(0,at-32),at+1))))continue;
  if(at+1===text.length||/\s/u.test(text[at+1]))endings.push(at+1);
 }
 return endings;
}
