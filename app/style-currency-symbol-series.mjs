import {styleContext,memoizeStyleReview} from './style-context.mjs';
import {styleDocumentType} from './style-document-type.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';

export const GPO_CURRENCY_SYMBOL_SERIES_SCOPE='GPO 10.6, printed $5 to $8 price range: selected complete homogeneous dollar ranges and comma/and/or lists repeat a missing dollar mark at each figure. A complete original finite price/cost/rate cue and at least one attached dollar mark establish monetary meaning. LCB MONEY permits dollar figures only in Digest, explicitly selected opinion or cover-letter contexts here; Bill monetary wording retains priority. Original canonical integer/grouped-decimal strings, connectors and existing marks are preserved without numeric conversion. Complete original cue/list evidence, longer-list boundaries, source offsets, literal and bill-local forms, names, headings, tables, strikes and unknown exclusions are required. Leading-zero or ambiguously spaced comma groups, cents, mixed currencies/units, signed/scientific/fractional/malformed quantities, scaling words, technical attachments, unfamiliar monetary syntax and general currency/table compliance remain manual.';
const number='(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?',atom='\\$?'+number;
const canonical=/^(?:[1-9]\d{0,2}(?:,\d{3})+|0|[1-9]\d*)(?:\.\d+)?$/u;
const boundary='(?<![\\p{L}\\p{N}\\p{M}_$])',listJoin='(?:\\s*,\\s+(?:(?:and|or)\\s+)?|\\s*,\\s*(?:and|or)\\s+|\\s+(?:and|or)\\s+)',rangeJoin='(?:\\s+(?:to|through)\\s+|\\s*-\\s*)';
const rangePattern=new RegExp(boundary+atom+rangeJoin+atom,'giu'),listPattern=new RegExp(boundary+atom+'(?:'+listJoin+atom+')+','giu'),parts=new RegExp('(?<mark>\\$)?(?<value>'+number+')','gu');
const beforeCue=/(?<![\p{L}\p{N}\p{M}_])(?:prices?|costs?|rates?)\s+(?:(?:is|are|was|were|of|from)\s+)?$/iu;
const afterCue=/^\s+(?:prices?|costs?|rates?)(?:\s+ranges?)?(?![\p{L}\p{N}\p{M}_])/iu;
const identifier=/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision|Case)\s*$/iu;
const nameTail=/^\s+(?:[\p{Lu}][\p{L}\p{M}]*\s+){0,3}(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board|Association|Foundation|Institute|Program|Company|Corporation|Council|Office|Bureau|Center)(?![\p{L}\p{N}\p{M}_])/u;
const separatorBefore=/(?:,|(?<![\p{L}\p{N}\p{M}_])(?:and|or|to|through))\s*$/iu;
const signWords=/(?<![\p{L}\p{N}\p{M}_])(?:minus|negative|plus|positive)\s+$/iu;
const numericPrefix=/(?:[-+−/⁄∕*^×÷±$€£¥¢°#]\s*|\d[\d.,]*\s*[eE]\s*[-+−]?\s*|\d\s*[:.,]\s*|\p{N}\s+)$/u;
const tailBlocked=/^\s*(?:[-+−/⁄∕*^×÷±=$€£¥¢°#]|[.,:]\s*\d|(?:and|or|to|through|dollars?|cents?|mills?|percent|degrees?|thousand|million|billion|trillion)(?![\p{L}\p{N}\p{M}_]))/iu;
const creationTail=/^\s*(?:,\s*(?:Inc\.|Corp\.|Incorporated|Corporation),?\s*)?\s+is\s+(?:hereby\s+)?(?:created|established|designated)(?![\p{L}\p{N}\p{M}_])/u;
const ranges=source=>[...[...source.matchAll(rangePattern)].map(m=>({...m,kind:'range'})),...[...source.matchAll(listPattern)].map(m=>({...m,kind:'list'}))].map(m=>({start:m.index,end:m.index+m[0].length,kind:m.kind,members:[...m[0].matchAll(parts)].map(p=>({start:m.index+p.index,valueStart:m.index+p.index+(p.groups.mark?1:0),end:m.index+p.index+p[0].length,value:p.groups.value,mark:p.groups.mark||''}))}));
const extendsRow=(rows,r)=>rows.some(o=>o.start<=r.start&&o.end>=r.end&&(o.start<r.start||o.end>r.end));
const moneyAllowed=(doc,ctx,at)=>ctx.at(at)!=='Heading'&&(styleDocumentType(doc)!=='bill'||ctx.at(at)==='Digest');
const memo=Symbol('complete-currency-series-evidence');

export function currencySeriesEvidence(doc){return memoizeStyleReview(doc,null,memo,()=>{
 const ctx=styleContext(doc),source=ctx.source,originalContext=originalBodyStyleContext(doc)||ctx,original=originalContext.source,raw=ranges(source),originalRows=ranges(original);
 const blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),out=[];
 for(const r of raw){
  if(!r.members.some(p=>p.mark)||r.members.some(p=>!canonical.test(p.value))||extendsRow(raw,r)||extendsRow(originalRows,r))continue;
  // A bare comma before three integral digits could be a damaged thousands
  // separator. An explicit repeated mark or conjunction resolves that boundary.
  if(r.members.some((p,n)=>n&&!p.mark&&/^\d{3}(?:\.\d+)?$/u.test(p.value)&&/^\s*,\s*$/u.test(source.slice(r.members[n-1].end,p.start))))continue;
  const prefix=beforeCue.exec(source.slice(0,r.start)),suffix=afterCue.exec(source.slice(r.end));if(!prefix&&!suffix)continue;
  const evidenceStart=prefix?.index??r.start,evidenceEnd=suffix?r.end+suffix[0].length:r.end;
  if(!moneyAllowed(doc,ctx,evidenceStart)||!moneyAllowed(doc,originalContext,evidenceStart)||!moneyAllowed(doc,ctx,evidenceEnd-1)||!moneyAllowed(doc,originalContext,evidenceEnd-1)||ctx.at(evidenceStart)!==ctx.at(evidenceEnd-1))continue;
  if(blocked(evidenceStart,evidenceEnd)||literal(evidenceStart,evidenceEnd)||quoted({start:evidenceStart,end:evidenceEnd})||[evidenceStart,r.start,r.end,evidenceEnd].some(at=>cutsOriginalStyleWord(doc,at))||entityNameBoundaryBlocked(doc.text,source,original,evidenceStart,evidenceEnd))continue;
  const before=original.slice(0,r.start),after=original.slice(r.end),prior=original.slice(0,evidenceStart),tail=original.slice(evidenceEnd);
  if(identifier.test(before)||identifier.test(prior)||/[.,\p{L}\p{N}\p{M}_$€£¥¢°#]$/u.test(before)||numericPrefix.test(before)||signWords.test(before)||separatorBefore.test(before)||tailBlocked.test(after)||/^\s*,/u.test(after)||nameTail.test(tail)||nameTail.test(after))continue;
  // Unidentified words after the final amount may supply a different unit.
  // Finite price-range continuations are accepted only after the full cue.
  if(!/^\s*(?:[.;!?)]|$)/u.test(tail)&&!(suffix&&/^\s+(?:applies|apply|is|are|was|were)(?![\p{L}\p{N}\p{M}_])/iu.test(tail)))continue;
  if(/(?<![\p{L}\p{N}\p{M}_])[Tt]he\s+$/u.test(prior)&&creationTail.test(tail))continue;
  out.push({...r,evidenceStart,evidenceEnd});
 }
 return out;
});}

export function currencySymbolSeriesIssues(doc,references){
 if(!references?.lcb?.pages?.[22]||!references?.gpo?.pages?.[276])return [];
 const issues=[],source=styleContext(doc).source;
 for(const r of currencySeriesEvidence(doc)){
  if(r.members.every(p=>p.mark))continue;
  // Project only active source characters. Restore original active dashes,
  // then remove layout whitespace; physical highlights retain source offsets.
  let suggestion=[...source.slice(r.start,r.end)].map((ch,n)=>/\S/u.test(ch)?doc.text[r.start+n]:ch).join('');for(const p of [...r.members].reverse())if(!p.mark)suggestion=suggestion.slice(0,p.valueStart-r.start)+'$'+suggestion.slice(p.valueStart-r.start);
  suggestion=suggestion.replace(/\s+/gu,' ').trim();
  const message='GPO 10.6 repeats the dollar mark at every figure in this complete price/cost/rate range or list. LCB MONEY permits dollar figures in this Digest/opinion/cover-letter context. Preserve each original numeric string and connector; Bill monetary forms and uncertain or mixed quantities remain manual.';
  issues.push({start:r.start,end:r.end,evidenceStart:r.evidenceStart,evidenceEnd:r.evidenceEnd,text:doc.text.slice(r.start,r.end),suggestion,guideId:'gpo',guidePage:277,guidePrintedPage:references.gpo.pages[276].printedPage,rule:'10.6',category:'Currency symbol series',context:styleContext(doc).at(r.start),checkId:'gpo-currency-symbol-series',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:277,guidePrintedPage:references.gpo.pages[276].printedPage,rule:'10.6',preferred:suggestion,ruleText:message},{guideId:'lcb',guideName:'LCB Style Manual',guidePage:23,guidePrintedPage:references.lcb.pages[22].printedPage,rule:'MONEY',preferred:suggestion,ruleText:'Digest, opinion and cover-letter examples use dollar figures.'}]});
 }
 return issues;
}
