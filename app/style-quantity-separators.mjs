import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,originalBodyStyleContext,cutsOriginalStyleWord}from './style-evidence.mjs';
import {numericExpressionGuard}from './style-numeric-expression-evidence.mjs';
import {groupIntegerDigits}from './style-exact-integer-digits.mjs';
import {quantitySingleQuoteRanges}from './style-opening-quantity-evidence.mjs';
// An explicit count/quantity noun is required: an arbitrary four-digit
// token can be a year, code section, serial, address or table cell.
const nouns='people|persons|patients|applicants|employees|workers|students|pupils|children|residents|households|members|participants|voters|ballots|requests|applications|records|documents|copies|vehicles|units|items|pounds|feet|inches|miles|acres|gallons';
export const EXACT_QUANTITY_GROUPING_SCOPE='Four-digit and larger explicit count/quantity strings receive exact thousands grouping without a fifteen-digit cap or conversion through floating-point numbers. Every original digit is preserved, including existing malformed comma placement. A complete listed quantity noun or population/enrollment/headcount cue is required and independently guarded from strikes, literals, tables, unknown exclusions and Unicode/compound fragments. Intact alternative cues remain usable; known margins/heads preserve original coordinates. Signed/mixed/decimal/exponent expressions, leading-zero codes, original/active identifiers, guarded dates and currency prefixes stay protected. Source-safe whole numeral comparison retains magnitude evidence for related counts, while large sentence openings receive separate conditional spelling/rephrasing guidance. Authentic unlabelled technical identities, unlisted quantity roles and wider numerical meaning remain incomplete; this is a finite grouping method, not universal number classification.';
const quantityHead=new RegExp('^\\s+(?:'+nouns+')(?![\\p{L}\\p{N}\\p{M}_-])','iu'),quantityCue=/(?<![\p{L}\p{N}\p{M}_-])(?:a\s+population|an?\s+(?:enrollment|headcount)|the\s+(?:population|enrollment|headcount))\s+of\s*$/iu;
const identifierBefore=/\b(?:sections?|articles?|chapters?|items?|schedules?|forms?|figures?|tables?|pages?|paragraphs?|subdivisions?|provisions?|No\.?|ID|Model|Version|Class|Type|Post|Route|Highway|Code|year)\s*$/iu,legalBefore=/\b(?:U\.S\.C\.|C\.F\.R\.|Stats\.|Chs?\.)\s*$/iu;
export function quantitySeparatorIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],blocked=styleEvidenceGuard(doc,ctx),numeric=numericExpressionGuard(doc,ctx),original=originalBodyStyleContext(doc),singles=[...quantitySingleQuoteRanges(source),...(original?quantitySingleQuoteRanges(original.source):[])];
 const pattern=/(?<![\w$.,/\-])\d+(?:,\d+)*(?![\d,]|\.\d)/g;
 for(const m of source.matchAll(pattern)){
  const start=m.index,end=start+m[0].length,beforeStart=Math.max(0,start-70),before=source.slice(beforeStart,start),originalBefore=original?.source.slice(beforeStart,start);
  const digits=m[0].replace(/,/g,'');
  if(digits.length<4||/^0/.test(digits)||numeric(start,end)||ctx.at(start)==='Heading')continue;
  const after=source.slice(end);
  const qa=quantityHead.exec(after),qb=quantityCue.exec(before),possible=[...(qa?[{start,end:end+qa[0].length}]:[]),...(qb?[{start:beforeStart+qb.index,end}]:[])],evidence=possible.find(r=>!cutsOriginalStyleWord(doc,r.start)&&!/[\p{L}\p{N}\p{M}_-]/u.test(doc.text.slice(r.end,r.end+1))&&!blocked(r.start,r.end)&&!singles.some(q=>q.start<r.end&&q.end>r.start));
  if(!evidence)continue;
  // A suffix on the same numeral can identify a serial, range, fraction or
  // scientific quantity; never regroup only a fragment of such notation.
  if(/^(?:\s*[-/]|[A-Za-z_])/.test(after))continue;
  if([before,originalBefore].filter(v=>v!==undefined).some(v=>identifierBefore.test(v)||legalBefore.test(v)||/\$\s*$/u.test(v)||/\b(?:in|since|during)\s*$/iu.test(v)&&digits.length===4&&digits>='1800'&&digits<='2099'))continue;
  const suggestion=groupIntegerDigits(digits);if(!suggestion)continue;
  if(m[0]===suggestion)continue;
  const message='GPO 12.14 separates groups of thousands with commas. This is an explicit count or quantity; check the digits against the source before accepting the suggested grouping. Recognized identifiers, dates, decimal fractions, quotations and tables are excluded.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,quantitySeparatorEvidence:{...evidence,text:doc.text.slice(evidence.start,evidence.end)},guideId:'gpo',guidePage:293,guidePrintedPage:references.gpo.pages[292].printedPage,rule:'12.14',category:'Quantity separators',context:ctx.at(start),checkId:'quantity-separators',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:293,guidePrintedPage:references.gpo.pages[292].printedPage,rule:'12.14',preferred:suggestion,ruleText:message}]});
 }
 return issues;
}
