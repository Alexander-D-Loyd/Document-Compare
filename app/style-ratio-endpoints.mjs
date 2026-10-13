import {ones,tens,canonicalWrittenValue}from './style-cardinal-values.mjs';
import {groupIntegerDigits}from './style-exact-integer-digits.mjs';
const words=new Set([...ones,...tens.slice(2),'hundred','thousand','million','billion','trillion','and']);
const scales=new Set(['hundred','thousand','million','billion','trillion']);
const letters=/^[\p{L}\p{M}]+/u,wordChar=/[\p{L}\p{N}\p{M}_]/u;
const skip=(source,at)=>{while(at<source.length&&/\s/u.test(source[at]))at++;return at;};
const suffixBlocked=(source,end)=>wordChar.test(source[end]||'')||/^(?:[.,]\s*\d|[\/⁄_\u00AD-])/u.test(source.slice(end));
// An endpoint is a complete quantity, never a parseable prefix of damaged
// numeric text. Actual figures stay strings to preserve their exact value.
export function ratioEndpoint(source,at,{first=false}={}){
 const start=skip(source,at),figure=/^\d+(?:,\d{3})*(?:\.\d+)?/u.exec(source.slice(start));
 if(figure){
  const raw=figure[0],end=start+raw.length;if(suffixBlocked(source,end)||raw.includes(',')&&!/^[1-9]\d{0,2}(?:,\d{3})+(?:\.\d+)?$/u.test(raw))return null;
  return {start,end,raw,figure:true,formatted:raw};
 }
 const tokens=[];let cursor=start,hyphen=false;
 for(;;){const token=letters.exec(source.slice(cursor));if(!token||!words.has(token[0].toLowerCase())){if(token&&(hyphen||tokens.length&&[...words].some(w=>w!=='and'&&token[0].toLowerCase().startsWith(w))))return null;break;}tokens.push({text:token[0].toLowerCase(),end:cursor+token[0].length});const gap=/^[\s-]+/u.exec(source.slice(tokens.at(-1).end));if(!gap)break;hyphen=gap[0].includes('-');cursor=tokens.at(-1).end+gap[0].length;}
 while(tokens.at(-1)?.text==='and')tokens.pop();if(!tokens.length)return null;
 // A non-scale conjunction belongs to ratio coordination, not one cardinal.
 // Only the second endpoint can end before that connector; a first operand
 // must continue immediately to its ratio separator.
 const coordinate=tokens.findIndex((t,n)=>t.text==='and'&&!scales.has(tokens[n-1]?.text));
 if(coordinate>=0){if(first)return null;tokens.length=coordinate;}
 if(!tokens.length)return null;
 if(tokens.some((t,n)=>t.text==='and'&&(!scales.has(tokens[n-1]?.text)||!tokens[n+1]||tokens[n+1].text==='and')))return null;
 const end=tokens.at(-1).end,raw=source.slice(start,end),plain=tokens.filter(t=>t.text!=='and').map(t=>t.text).join(' '),value=canonicalWrittenValue(plain);
 if(value===null||suffixBlocked(source,end))return null;
 // "one to one hundred and five to seven" admits two incompatible parses.
 // Do not guess whether and belongs to a remainder or another ratio.
 if(!first&&tokens.some(t=>t.text==='and')&&/^\s*(?:to(?![\p{L}\p{N}\p{M}_])|:)/u.test(source.slice(end)))return null;
 return {start,end,raw,figure:false,formatted:groupIntegerDigits(String(value))};
}
