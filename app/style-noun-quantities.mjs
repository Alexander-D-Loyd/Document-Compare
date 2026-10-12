import {canonicalWrittenValue} from './style-cardinal-values.mjs';
import {originalBodyStyleContext,cutsOriginalStyleWord} from './style-evidence.mjs';
const cardinalWords=new Set('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion trillion'.split(' '));
const quantifiers=new Set(['several','many','multiple','both','few']);
const connectors=new Set(['and','or','to','through']);
const vulgar='¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞';
const numericLexeme=new RegExp('^[+−-]?[\\d.,/⁄'+vulgar+']*$','u');
const integer='(?:\\d{1,3}(?:,\\d{3})+|\\d+)',decimal='(?:'+integer+'(?:\\.\\d+)?|\\.\\d+)';
const singleNumber=new RegExp('^[+−-]?\\s*'+decimal+'$','u');
const fraction=new RegExp('^[+−-]?\\s*('+integer+')\\s*[/⁄]\\s*('+integer+')$','u');
const mixed=new RegExp('^[+−-]?\\s*('+integer+')\\s+('+integer+')\\s*[/⁄]\\s*('+integer+')$','u');
const vulgarNumber=new RegExp('^[+−-]?\\s*(?:'+integer+'\\s*)?['+vulgar+']$','u');
const digits=s=>s.replace(/,/g,'').replace(/^0+(?=\d)/,'');
const nonzero=s=>/[^0,]/.test(s),less=(a,b)=>{a=digits(a);b=digits(b);return a.length<b.length||a.length===b.length&&a<b;};
function scalar(text){
 if(singleNumber.test(text)||vulgarNumber.test(text))return true;
 const f=fraction.exec(text);if(f)return nonzero(f[2]);const m=mixed.exec(text);if(m)return nonzero(m[3])&&less(m[2],m[3]);
 if(canonicalWrittenValue(text)!==null)return true;
 // A recognized complete hundred/scale-and-remainder count is still a
 // quantity even when its written form has an independent style issue.
 const words=text.toLowerCase().replace(/[\s-]+/g,' ');return /\b(?:hundred|thousand|million|billion|trillion) and\b/.test(words)&&canonicalWrittenValue(words.replace(/\band\s+/g,''))!==null;
}
const allowed=token=>!!token&&(numericLexeme.test(token)||quantifiers.has(token.toLowerCase())||connectors.has(token.toLowerCase())||token.toLowerCase().split('-').every(w=>cardinalWords.has(w)));
function quantityRun(source,end){
 let at=end;while(at>0&&/\s/.test(source[at-1]))at--;const valueEnd=at;let start=at,first=true;
 while(at>0){const tokenEnd=at;while(at>0&&!/\s/.test(source[at-1]))at--;let token=source.slice(at,tokenEnd);const open=token.match(/^[([]+/)?.[0].length||0;token=token.slice(open);
  if(!allowed(token)||!first&&/[.,]$/.test(token))break;start=at+open;first=false;if(open)break;while(at>0&&/\s/.test(source[at-1]))at--;
 }
 if(first)return null;
 // A leading conjunction belongs to the preceding clause; it is not a
 // piece of a mixed fraction or canonical written count.
 let text=source.slice(start,valueEnd);const leading=/^(?:(?:and|or|to|through)\s+)+/i.exec(text);if(leading){start+=leading[0].length;text=text.slice(leading[0].length);}
 const valid=quantifiers.has(text.toLowerCase())||scalar(text)||(()=>{const parts=text.split(/\s+(?:and|or|to|through)\s+/i);return parts.length>1&&parts.every(scalar);})();
 return {start,end,valueEnd,text,valid};
}
const identifier=/\b(?:sections?|articles?|chapters?|parts?|paragraphs?|subdivisions?|clauses?|items?|schedules?|lines?|pages?|figures?|tables?|forms?|model|version|No\.?|ID|route|highway|grade|level|tier)\s*$/i;
const priorToken=(source,start)=>{let end=start;while(end>0&&/\s/.test(source[end-1]))end--;let begin=end;while(begin>0&&!/\s/.test(source[begin-1]))begin--;return source.slice(begin,start);};
export const NOUN_QUANTITY_SCOPE=' Complete adjacent integer/grouped, decimal, fraction, proper mixed, vulgar-fraction, signed and canonical written quantity cues establish selected plural noun roles. Whole original quantity components and spaces remain evidence, even if masking would leave a valid suffix. Explicit known identifier labels stay protective in original text. Quantity-role recognition does not decide numerical meaning, figure/spelled-out styling, unfamiliar notation or whole-rule compliance.';
export function createNounQuantityReader(doc,ctx){
 let original=null,prepared=false;
 return end=>{
  const run=quantityRun(ctx.source,end);if(!run?.valid||cutsOriginalStyleWord(doc,run.start)||cutsOriginalStyleWord(doc,run.valueEnd))return null;
  if(!prepared){prepared=true;original=originalBodyStyleContext(doc);}
  const prior=original&&quantityRun(original.source,end),start=prior?Math.min(run.start,prior.start):run.start;
  if(identifier.test(priorToken(ctx.source,run.start))||original&&identifier.test(priorToken(original.source,prior?.start??run.start)))return null;
  // A masked numeric prefix adjoining a decimal/fraction suffix is not an
  // independent complete quantity, even when the suffix parses by itself.
  if(/[\d.,/⁄:+−-]/u.test(doc.text[start-1]||''))return null;
  return {start,end};
 };
}
