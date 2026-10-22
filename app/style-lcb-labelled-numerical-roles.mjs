import {styleContext} from './style-context.mjs';
import {originalBodyStyleContext,styleEvidenceGuard} from './style-evidence.mjs';

// A printed label can establish that a hyphenated figure is a reference rather
// than an unresolved quantity. It does not establish the reference's accuracy.
// Keep the evidence separate from the selected coordinates: neither a nearby
// count nor all the remaining numbers in a Budget document inherit this role.
const left='(?<![\\p{L}\\p{N}\\p{M}_-])',right='(?![\\p{L}\\p{N}\\p{M}_-]|\\.(?=[\\p{L}\\p{N}]))';
const item='\\d{4}\\s*-\\s*\\d{3}(?:\\s*-\\s*\\d{4})?';
const year='[12]\\d{3}\\s*-\\s*\\d{2}(?:\\d{2})?';
const list=value=>value+'(?:\\s*(?:,\\s*(?:(?:and|or)\\s+)?|(?:and|or)\\s+)'+value+')*';
const patterns=[
 ['item',new RegExp(left+'Items?\\s+(?<values>'+list(item)+')'+right,'giu')],
 ['public-law',new RegExp(left+'(?:P\\.\\s*L\\.|Pub\\.\\s*L\\.|Public\\s+Law)\\s*(?:No\\.\\s*)?(?<values>\\d+\\s*-\\s*\\d+)'+right,'giu')],
 ['year',new RegExp(left+'(?:fiscal|school|academic|calendar|tax)\\s+years?\\s+(?<values>'+list(year)+')'+right,'giu')],
 ['year',new RegExp(left+'(?<values>'+list(year)+')\\s+(?:(?:fiscal|school|academic|calendar|tax)\\s+years?|Regular\\s+Session|(?:[1-9]\\d*(?:st|nd|rd|th)\\s+)?Ex\\.\\s*Sess\\.|Governor[’\u0027]s\\s+Budget|May\\s+Revision)'+right,'giu')],
 ['grade',new RegExp(left+'grades?\\s+(?<values>K\\s*-\\s*12)'+right,'giu')],
 ['phone',new RegExp(left+'(?<values>2\\s*-\\s*1\\s*-\\s*1)\\s+(?:dialing|telephone\\s+(?:number|service)|information\\s+and\\s+referral(?:\\s+response)?\\s+system)'+right,'giu')],
 ['phone',new RegExp(left+'(?:dial(?:ing)?|telephone\\s+(?:number|service))\\s+(?<values>2\\s*-\\s*1\\s*-\\s*1)'+right,'giu')]
];
const valuesFor={item:new RegExp(item,'gu'),'public-law':/\d+\s*-\s*\d+/gu,year:new RegExp(year,'gu'),grade:/K\s*-\s*12/giu,phone:/2\s*-\s*1\s*-\s*1/gu};
function supportedYear(value){
 const [first,last]=value.split(/\s*-\s*/u),next=String(Number(first)+1);
 return last.length===2?next.slice(-2)===last:next===last;
}
export function labelledNumericalRoleWitnesses(source){
 const out=[];
 for(const [role,pattern]of patterns)for(const m of source.matchAll(pattern)){
  const values=m.groups.values,valueAt=m.index+m[0].indexOf(values),coordinates=[...values.matchAll(valuesFor[role])];
  // An unfamiliar or malformed labelled period still needs the whole-expression
  // question. No calendar period or missing digit is inferred from its prefix.
  if(role==='year'&&coordinates.some(v=>!supportedYear(v[0])))continue;
  for(const v of coordinates)out.push({role,start:valueAt+v.index,end:valueAt+v.index+v[0].length,evidenceStart:m.index,evidenceEnd:m.index+m[0].length});
 }
 return out;
}
export function labelledNumericalRoleRanges(doc,ctx=styleContext(doc)){
 const current=labelledNumericalRoleWitnesses(ctx.source),original=labelledNumericalRoleWitnesses(originalBodyStyleContext(doc)?.source||ctx.source),blocked=styleEvidenceGuard(doc,ctx);
 return current.filter(r=>!blocked(r.evidenceStart,r.evidenceEnd)&&original.some(o=>o.role===r.role&&o.start===r.start&&o.end===r.end&&o.evidenceStart===r.evidenceStart&&o.evidenceEnd===r.evidenceEnd));
}
