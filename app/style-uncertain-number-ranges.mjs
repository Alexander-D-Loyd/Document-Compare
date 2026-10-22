// Recognition and negative source evidence only. These ranges never supply a
// calculated value or authorize a replacement of an unfamiliar expression.
const cardinal='(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion|quadrillion|quintillion|sextillion|septillion|octillion|nonillion|decillion)';
const left='(?<![\\p{L}\\p{N}\\p{M}_./⁄-])',right='(?![\\p{L}\\p{N}\\p{M}_/⁄-]|\\.\\d)';
const mantissa='(?:\\d+(?:\\.\\d+)?|\\.\\d+)';
const patterns=[
 ['spoken-decimal',new RegExp(left+'(?:(?:'+cardinal+')(?:[\\s-]+(?:'+cardinal+'|and))*\\s+)?point\\s+'+cardinal+'(?:[\\s-]+'+cardinal+')*'+right,'giu')],
 ['exponent',new RegExp(left+'[+−-]?'+mantissa+'[eE][+−-]?\\d+'+right,'gu')],
 ['exponent',new RegExp(left+'[+−-]?'+mantissa+'[ \\t]*(?:×|[x*])[ \\t]*10(?:[ \\t]*(?:\\^|\\*\\*)[ \\t]*[+−-]?\\d+|[⁺⁻]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)'+right,'gu')],
 ['space-grouped-figure',new RegExp(left+'\\d{1,3}(?:[ \\t\\u00a0\\u202f]\\d{3})+'+right,'gu')],
 ['signed-integer',new RegExp(left+'[+−-][ \\t]*\\d+(?:,\\d{3})*'+right,'gu')],
 ['dash-expression',new RegExp(left+'[+−-]?'+mantissa+'(?:[ \\t]*[–−-][ \\t]*[+−-]?'+mantissa+')+'+right,'gu')],
 ['technical-number',new RegExp(left+'(?:0[xX][\\da-fA-F]+|0[bB][01]+|0[oO][0-7]+|'+mantissa+'[⁺⁻]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)'+right,'gu')],
];
export function uncertainNumberRanges(source){
 const found=[];
 for(const [kind,pattern]of patterns)for(const m of source.matchAll(pattern))found.push({start:m.index,end:m.index+m[0].length,kind});
 // Consume the maximal exponent-like token, including malformed signs and
 // decimal separators. Optional-sign backtracking must not expose a prefix
 // of an identifier such as 1.2e+3word as an incomplete exponent.
 for(const m of source.matchAll(new RegExp(left+'[+−-]?(?:\\d|\\.\\d)[\\d.,eE+−-]*(?![\\p{L}\\p{N}\\p{M}_+−/⁄-]|\\.\\d)','gu'))){const text=m[0].replace(/[.,]+$/,'');if(/[eE]/u.test(text))found.push({start:m.index,end:m.index+text.length,kind:'exponent'});}
 for(const m of source.matchAll(new RegExp(left+'[+−-]?[\\p{Nd}]+(?:[.,٫٬][\\p{Nd}]+)*'+right,'gu')))if(/[٫٬]/u.test(m[0])||[...m[0]].some(c=>/\p{Nd}/u.test(c)&&!/[0-9]/u.test(c)))found.push({start:m.index,end:m.index+m[0].length,kind:'unicode-figure'});
 // Whole malformed figure runs are retained, including all separators. Valid
 // decimals, grouped integers, ordinary fractions and dotted legal references
 // do not acquire a question merely because they contain punctuation.
 for(const m of source.matchAll(/(?<![\p{L}\p{N}\p{M}_./⁄-])[+−-]?\d[\d.,/⁄]*(?![\p{L}\p{N}\p{M}_/⁄-])/gu)){
  const text=m[0].replace(/[.,]+$/,'');if(!text)continue;
  const n=text.replace(/^[+−-]/,'');
  const malformed=/\.\./.test(n)||/,/.test(n)&&!/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(n)||/[/⁄]{2}/.test(n)||/[/⁄]0+$/.test(n);
  if(malformed)found.push({start:m.index,end:m.index+text.length,kind:'unresolved-figure'});
 }
 // Prefer a whole expression over an overlapping shorter interpretation.
 const sorted=found.sort((a,b)=>a.start-b.start||b.end-a.end),out=[];
 for(const r of sorted){const last=out.at(-1);if(last&&r.start<last.end){if(r.end>last.end)last.end=r.end;continue;}out.push({...r});}
 return out;
}
// Alphanumeric source tokens supply negative evidence only. Their digit tail
// is not an independent prose count, even when a dash precedes that tail.
export function numericTokenIdentifierRanges(source){
 const ranges=[];for(const m of source.matchAll(/(?<![\p{L}\p{N}\p{M}_])[\p{L}_][\p{L}\p{N}\p{M}_]*(?:[.+−-][\p{L}\p{N}\p{M}_]+)+(?![\p{L}\p{N}\p{M}_])/gu)){
  // A printed number-duration modifier supplies its ordinary numeral role;
  // a preceding hyphenated word does not turn report-3-year into a serial.
  if(/(?:^|-)\d+-(?:year|month|week|day|hour|minute|second)(?:-old)?$/iu.test(m[0]))continue;
  if(/\p{Nd}/u.test(m[0]))ranges.push({start:m.index,end:m.index+m[0].length});
 }return ranges;
}
