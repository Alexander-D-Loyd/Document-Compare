import {styleContext,styleRangeBlocked} from './style-context.mjs';
import {extendedFractionParts,extendedFractionWords} from './extended-fraction-forms.mjs';
import {numericExpressionGuard} from './style-numeric-expression-evidence.mjs';
const numerators=['','one','two','three','four','five','six','seven','eight','nine'];
const denominators={2:'half',3:'third',4:'fourth',5:'fifth',6:'sixth',7:'seventh',8:'eighth',9:'ninth',10:'tenth',11:'eleventh',12:'twelfth',13:'thirteenth',14:'fourteenth',15:'fifteenth',16:'sixteenth',17:'seventeenth',18:'eighteenth',19:'nineteenth',20:'twentieth'};
export function fractionIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const incompleteNumeric=numericExpressionGuard(doc,ctx);
 const literal=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const add=(m,suggestion,message,conflict=false)=>{
  if(/[\d¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/.test(m[0])&&incompleteNumeric(m.index,m.index+m[0].length))return;
  // A complete directly quoted fraction may wrap in the printed PDF. This
  // narrow guard does not pair unrelated inch marks across the document.
  if(source[m.index-1]==='"'&&source[m.index+m[0].length]==='"')return;
  if(ctx.at(m.index)==='Heading'||ctx.tableAt(m.index)||styleRangeBlocked(doc,m.index,m.index+m[0].length)||literal.some(r=>r.start<m.index+m[0].length&&r.end>m.index))return;
  const prefix=source.slice(ctx.sentenceAt(m.index).start,m.index);
  if(/^[\s”"’']*(?:\([a-z\d]+\)\s*)*$/i.test(prefix)&&/^[a-z]/.test(suggestion))suggestion=suggestion[0].toUpperCase()+suggestion.slice(1);
  const rule='Numerals: Simple fractions';issues.push({start:m.index,end:m.index+m[0].length,text:doc.text.slice(m.index,m.index+m[0].length),suggestion,guideId:'lcb',guidePage:21,guidePrintedPage:'21',rule,category:'Fraction form',context:ctx.at(m.index),checkId:'fractions',conflict,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',rule,guidePage:21,guidePrintedPage:references.lcb.pages[20].printedPage,preferred:suggestion,ruleText:'LCB bill numeral rule 1 spells out fractions; digest rules use figures. Specialized examples on pages 22–23 require separate treatment.'}]});
  if(references.gpo&&message.includes('GPO 6.38'))issues.at(-1).references.push({guideId:'gpo',guideName:'U.S. Government Publishing Office Style Manual',guidePage:121,guidePrintedPage:references.gpo.pages[120].printedPage,rule:'6.38',preferred:suggestion,ruleText:'A written fraction uses a numerator–denominator hyphen unless either element already contains a hyphen. Selected simple proper fractions and recognized extended partitive forms are checked; unfamiliar roles and typography remain manual.'});
 };
 const glyphs=new Map([['¼',[1,4]],['½',[1,2]],['¾',[3,4]],['⅐',[1,7]],['⅑',[1,9]],['⅒',[1,10]],['⅓',[1,3]],['⅔',[2,3]],['⅕',[1,5]],['⅖',[2,5]],['⅗',[3,5]],['⅘',[4,5]],['⅙',[1,6]],['⅚',[5,6]],['⅛',[1,8]],['⅜',[3,8]],['⅝',[5,8]],['⅞',[7,8]]]);
 for(const m of source.matchAll(/[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g)){
  if(ctx.at(m.index)!=='Bill')continue;
  const before=source.slice(Math.max(0,m.index-60),m.index),after=source.slice(m.index+1);
  if(/[\p{L}\p{N}_]$/u.test(before)||/^[\p{L}\p{N}_]/u.test(after)||/[\d\/⁄]\s*$/.test(before)||/\b(?:Sections?|Articles?|No\.?|Items?|Schedules?|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s+and)?\s*$/i.test(before)||/^\s*(?:[\/⁄]\s*\d|(?:percent|degrees?|years?\s+of\s+age)\b|%)/i.test(after))continue;
  const [n,d]=glyphs.get(m[0]),name=denominators[d]+(n>1?'s':'');
  add(m,numerators[n]+'-'+name,'LCB bill text spells out this standalone fraction glyph. Mixed values, technical quantities, identifiers and literal quotations are preserved.',/^\s*[-–]\s*[a-z]/i.test(after));
 }
 for(const m of source.matchAll(/\b([1-9])\s*[\/⁄]\s*(2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20)\b/g)){
  if(ctx.at(m.index)!=='Bill')continue;
  const before=source.slice(Math.max(0,m.index-45),m.index),after=source.slice(m.index+m[0].length);
  // Exclude dates, serials, mixed fractions and percent/ratio examples.
  if(Number(m[1])>=Number(m[2])||/[\d\/]\s*$/.test(before)||/\b(?:Sections?|Articles?|No\.?|Items?|Schedules?|one|two|three|four|five|six|seven|eight|nine|ten)\s*$/i.test(before)||/^\s*(?:[\/⁄]\s*\d|(?:percent|degrees?|years?\s+of\s+age)\b|%)/i.test(after))continue;
  const denominator=Number(m[2]),name=denominators[denominator],word=denominator===2&&Number(m[1])>1?'halves':name+(Number(m[1])>1?'s':'');
  add(m,numerators[Number(m[1])]+'-'+word,'LCB bill text spells out this standalone simple fraction. Dates, identifiers and specialized numerical contexts are excluded.',/^\s*[-–]\s*[a-z]/i.test(after));
 }
 const names='half|thirds?|quarters?|fourths?|fifths?|sixths?|sevenths?|eighths?|ninths?|tenths?|elevenths?|twelfths?|thirteenths?|fourteenths?|fifteenths?|sixteenths?|seventeenths?|eighteenths?|nineteenths?|twentieths?';
 for(const m of source.matchAll(new RegExp('\\b(one|two|three|four|five|six|seven|eight|nine)([\\s-]+)('+names+')\\b','gi'))){
  const after=source.slice(m.index+m[0].length),before=source.slice(Math.max(0,m.index-25),m.index);
  if(/^quarters?$/i.test(m[3])&&!/^\s+of\b|^-[a-z]/i.test(after))continue;
  if(/^quarters?$/i.test(m[3])&&/\b(?:first|last|next|previous|preceding|following)\s+$/i.test(before)&&/^\s+of\s+(?:the\s+)?(?:(?:current|past|next|prior|previous|preceding|following)\s+)?(?:(?:fiscal|calendar)\s+)?year\b/i.test(after))continue;
  if(/\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand)\s+and\s*$/i.test(before)||/^\s+(?:party|parties)\b/i.test(after))continue;
  const n=numerators.indexOf(m[1].toLowerCase()),d={half:2,third:3,quarter:4,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9,tenth:10,eleventh:11,twelfth:12,thirteenth:13,fourteenth:14,fifteenth:15,sixteenth:16,seventeenth:17,eighteenth:18,nineteenth:19,twentieth:20}[m[3].toLowerCase().replace(/s$/,'')];
  if(!d||n>=d)continue;
  if(ctx.at(m.index)==='Digest')add(m,n+'⁄'+d,'LCB digest text uses figures for this simple fraction.',!/^\s*[-–]\s*[a-z]/i.test(after));
  else if(m[2]!=='-'&&!/^-[ \t]*\n\s*$/.test(m[2]))add(m,m[1]+'-'+m[3],'Use the hyphenated written fraction shown in LCB examples and GPO 6.38.');
 }

 // LCB page 23 distinguishes mixed time quantities below ten in bills
 // from digit forms in digests and quantities of ten or more.
 const wordNumber={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12};
 const units='hours?|minutes?|days?|weeks?|months?|years?';
 for(const m of source.matchAll(new RegExp('\\b(\\d+)\\s+([1-9])\\s*[\\/⁄]\\s*(2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20)(?=\\s+(?:'+units+')\\b)','g'))){
  const whole=Number(m[1]),n=Number(m[2]),d=Number(m[3]);
  if(ctx.at(m.index)!=='Bill'||whole<1||whole>9||n>=d)continue;
  const fraction=numerators[n]+'-'+denominators[d]+(n>1?'s':'');
  add(m,numerators[whole]+' and '+fraction,'LCB page 23 spells out mixed durations below ten in bill text, for example “three and one-half hours.”',true);
 }
 for(const m of source.matchAll(new RegExp('\\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\\s+and\\s+(one|two|three|four|five|six|seven|eight|nine)[\\s-]+(half|thirds?|quarters?|fourths?|fifths?|sixths?|sevenths?|eighths?|ninths?|tenths?|elevenths?|twelfths?|thirteenths?|fourteenths?|fifteenths?|sixteenths?|seventeenths?|eighteenths?|nineteenths?|twentieths?)(?=\\s+(?:'+units+')\\b)','gi'))){
  const whole=wordNumber[m[1].toLowerCase()],n=wordNumber[m[2].toLowerCase()],d={half:2,third:3,quarter:4,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9,tenth:10,eleventh:11,twelfth:12,thirteenth:13,fourteenth:14,fifteenth:15,sixteenth:16,seventeenth:17,eighteenth:18,nineteenth:19,twentieth:20}[m[3].toLowerCase().replace(/s$/,'')];
  if(!d||n>=d)continue;
  if(ctx.at(m.index)==='Digest'||whole>=10)add(m,whole+' '+n+'⁄'+d,'LCB page 23 uses figures for mixed durations in digests and for bill quantities of ten or more.');
  else if(!m[0].includes('-'))add(m,m[1]+' and '+m[2]+'-'+m[3],'LCB hyphenates the written fraction in a mixed bill duration.',true);
 }
 for(const part of extendedFractionParts(source)){
  const kind=ctx.at(part.start),words=extendedFractionWords(part.n,part.d);
  if(kind==='Heading')continue;
  let suggestion=kind==='Digest'?part.n+'⁄'+part.d:words;
  if(kind==='Bill'&&/^[A-Z]/.test(part.text))suggestion=suggestion[0].toUpperCase()+suggestion.slice(1);
  if(part.figure&&kind==='Digest'||part.text.replace(/\s+/g,' ')===suggestion)continue;
  add({index:part.start,0:doc.text.slice(part.start,part.end)},suggestion,'LCB spells out bill fractions. This larger denominator has an explicit “of” continuation. GPO 6.38 omits the numerator/denominator joining hyphen when either already contains a hyphen.',kind==='Digest');
 }
 return issues;
}
