// Shared whole-cardinal recognition has no dependency on style checks.
// Keep one canonical spelling/parser for numeral and grammatical-role uses.
export const ones=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
export const tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
export const numbers=new Map([...ones.map((w,i)=>[w,i]),...tens.slice(2).map((w,i)=>[w,(i+2)*10])]);
export const ordinalOnes=['zeroth','first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth','sixteenth','seventeenth','eighteenth','nineteenth'];
export const ordinalTens=['','','twentieth','thirtieth','fortieth','fiftieth','sixtieth','seventieth','eightieth','ninetieth'];
export function spellOrdinal(n){
 if(n<20)return ordinalOnes[n];
 if(n<100)return n%10?tens[Math.floor(n/10)]+'-'+ordinalOnes[n%10]:ordinalTens[Math.floor(n/10)];
 for(const [scale,name] of [[1e12,'trillion'],[1e9,'billion'],[1e6,'million'],[1000,'thousand'],[100,'hundred']])if(n>=scale)return spellNumber(Math.floor(n/scale))+' '+name+(n%scale?' '+spellOrdinal(n%scale):'th');
 return String(n);
}
export function spellNumber(n){
 if(n<20)return ones[n];if(n<100)return tens[Math.floor(n/10)]+(n%10?'-'+ones[n%10]:'');
 if(n<1000)return ones[Math.floor(n/100)]+' hundred'+(n%100?' '+spellNumber(n%100):'');
 for(const [scale,name] of [[1e12,'trillion'],[1e9,'billion'],[1e6,'million'],[1000,'thousand']])if(n>=scale)return spellNumber(Math.floor(n/scale))+' '+name+(n%scale?' '+spellNumber(n%scale):'');
 return String(n);
}
export function wordValue(words){let total=0,part=0;for(const w of words){if(numbers.has(w))part+=numbers.get(w);else if(w==='hundred')part=(part||1)*100;else{const scale={thousand:1000,million:1e6,billion:1e9,trillion:1e12}[w];if(!scale)return null;total+=(part||1)*scale;part=0;}}return total+part;}
export function canonicalWrittenValue(text){
 const normalized=text.toLowerCase().replace(/[\s-]+/g,' ').trim(),value=wordValue(normalized.split(' '));
 return value!==null&&Number.isSafeInteger(value)&&spellNumber(value).replace(/-/g,' ')===normalized?value:null;
}
