import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';

// The complete bare-symbol table in GPO 9.58 (PDF 251–252, printed 237–238).
// Area/volume exponents are source examples, not additional bare symbols.
// ds/hs also denote prefixed seconds: bare figures cannot establish malformed
// plurals of d/h. GPO's tera prefix is uppercase T, so lower-case ts remains
// eligible as a malformed plural of t (metric ton); accepted Ts is untouched.
export const GPO_ENGLISH_ABBREVIATIONS=Object.freeze([
 ['in','inch',251],['ft','foot',251],['yd','yard',251],['mi','mile (statute)',251],
 ['yr','year',252],['mo','month',252],['d','day',252],['h','hour',252],['min','minute',252],['s','second',252],
 ['gr','grain',252],['dr','dram',252],['oz','ounce',252],['lb','pound',252],['cwt','hundredweight',252],['dwt','pennyweight',252],['t','metric ton (tonne)',252],
 ['pt','pint',252],['qt','quart',252],['gal','gallon',252],['pk','peck',252],['bu','bushel',252],['bbl','barrel',252]
].map(([symbol,name,page])=>Object.freeze({symbol,name,page,pluralVariant:symbol+'s',checkPlural:!['d','h'].includes(symbol)})));
export const GPO_ENGLISH_ABBREVIATION_SCOPE='GPO 9.58: the 23 bare English-weight/measure/time symbols from the printed table are recorded, with numeric appended-s checks for 21 unambiguous symbol variants. Symbols retain the same form for singular and plural. Original figures, source ranges and existing figure/unit separation are preserved. Unqualified ds and hs remain protected because they are also prefixed-second symbols. The source tera prefix is uppercase T, so lowercase ts receives the metric-ton plural check while Ts is preserved. Gill and ton(s) are explicitly not abbreviated. Accepted s seconds, squared/cubed units, scientific or fractional/operator quantities, technical identifiers, source-created names, quoted or bill-local wording, tables, strikeouts and unknown exclusions remain protected. Reader-identified interior page heads preserve exact highlights. Full-table semantic identification, ambiguous unit meanings, abbreviation punctuation/case, exponents and other measurement styles remain manual.';
const rows=GPO_ENGLISH_ABBREVIATIONS.filter(r=>r.checkPlural),byVariant=new Map(rows.map(r=>[r.pluralVariant,r]));
const number='(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?';
const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])('+number+')(\\s*)('+rows.map(r=>r.pluralVariant).sort((a,b)=>b.length-a.length).join('|')+')(?![\\p{L}\\p{N}\\p{M}_])','gu');
const identifier=/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision)\s*$/iu;
const nameTail=/^\s+(?:[\p{Lu}][\p{L}\p{M}]*\s+){0,3}(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board|Association|Foundation|Institute|Program|Company|Corporation|Council|Office|Bureau|Center)(?![\p{L}\p{N}\p{M}_])/u;
export function englishUnitAbbreviationIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,original=originalBodyStyleContext(doc)?.source||source;
 const blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),issues=[];
 for(const m of source.matchAll(pattern)){
  const start=m.index,end=start+m[0].length,unitStart=end-m[3].length,row=byVariant.get(m[3]);
  if(ctx.at(start)==='Heading'||blocked(start,end)||literal(start,end)||quoted({start,end})||quoted({start:unitStart,end})||[start,end].some(i=>cutsOriginalStyleWord(doc,i))||entityNameBoundaryBlocked(doc.text,source,original,start,end))continue;
  // Do not trim a malformed grouped/decimal/scientific quantity to a suffix.
  const before=original.slice(Math.max(0,start-60),start),after=original.slice(end);
  if(/[.,\p{L}\p{N}\p{M}_]$/u.test(before)||/(?:[-+\u2212/\u2044\u2215*^×÷±]\s*|\d[\d.,]*\s*[eE]\s*[-+\u2212]?\s*|\d[.,]\s*)$/u.test(before)||identifier.test(before)||nameTail.test(after))continue;
  const suggestion=m[1]+(m[2]?' ':'')+row.symbol;
  const message='GPO 9.58 lists “'+row.symbol+'” for '+row.name+' and uses that same abbreviation for singular and plural. Remove the appended s; the figure and unit meaning are not converted.';
  const cite=(page,rule)=>({guideId:'gpo',guideName:'GPO Style Manual',guidePage:page,guidePrintedPage:references.gpo.pages[page-1].printedPage,rule,preferred:row.symbol,ruleText:message});
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'gpo',guidePage:row.page,guidePrintedPage:references.gpo.pages[row.page-1].printedPage,rule:'9.58',category:'Measurement notation',context:ctx.at(start),checkId:'gpo-measures',conflict:false,message,englishUnitEvidence:{symbol:row.symbol,name:row.name,tablePage:row.page,quantity:m[1]},references:[cite(251,'9.58'),...(row.page===252?[cite(252,'9.58 (table continuation)')]:[])]});
 }
 return issues;
}
