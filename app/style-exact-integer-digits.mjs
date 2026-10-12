const positive='(?:[1-9]\\d{0,2}(?:,\\d{3})+|[1-9]\\d*)',whole=new RegExp('^('+positive+')(st|nd|rd|th)?$','iu');
export const EXACT_INTEGER_TOKEN_PATTERN=positive;
export function exactIntegerParts(text){
 if(typeof text!=='string')return null;const m=whole.exec(text);return m?{digits:m[1].replaceAll(',',''),suffix:m[2]?.toLowerCase()||null}:null;
}
export const exceedsSafeInteger=digits=>typeof digits==='string'&&/^\d+$/u.test(digits)&&(digits.length>16||digits.length===16&&digits>'9007199254740991');
export function groupIntegerDigits(digits){
 if(typeof digits!=='string'||!/^(?:0|[1-9]\d*)$/u.test(digits))return null;
 // Linear grouping keeps unusually long source strings bounded by length.
 const first=digits.length%3||3,groups=[digits.slice(0,first)];for(let at=first;at<digits.length;at+=3)groups.push(digits.slice(at,at+3));return groups.join(',');
}
export function exactOrdinalSuffix(digits){
 if(typeof digits!=='string'||!/^(?:0|[1-9]\d*)$/u.test(digits))return null;
 return ['11','12','13'].includes(digits.slice(-2))?'th':({1:'st',2:'nd',3:'rd'}[digits.at(-1)]||'th');
}
export function exactFigureOrdinal(text){const p=exactIntegerParts(text);return p?.suffix?groupIntegerDigits(p.digits)+exactOrdinalSuffix(p.digits):null;}
