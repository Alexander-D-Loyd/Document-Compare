import {styleContext,memoizeStyleReview} from './style-context.mjs';
import {dimensionMarkParts} from './style-dimension-marks.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';

export const GPO_PERCENT_SERIES_SCOPE='GPO 10.5: complete homogeneous lists of two or more repeated percent values in Bill prose retain the final percent and remove earlier repetitions. Original canonical integer/grouped-decimal strings and comma/and/or connectors are preserved, without numeric conversion or added serial commas. The complete original list, word and connector evidence is required; quotes, bill-local terms, names, tables, removed or unknown text, Unicode/technical endpoints and original longer-list continuations are protected. LCB Digest percentage symbols retain priority. Labels, distinct clauses, signed/scientific/fractional or malformed quantities, mixed words/symbols and uncertain list boundaries remain manual.';
export const GPO_DIMENSION_SERIES_SCOPE='GPO 10.6: complete same-unit physical-dimension lists and existing two-endpoint ranges repeat a missing prime/inch mark at each figure. An explicit final mark and recognized physical continuation establish the selected unit meaning. Plain canonical integer/decimal strings, original connectors and existing equivalent marks are preserved. The same complete document-aware evidence protects list figures from isolated count-word replacements. Original list boundaries, quotations, bill-local forms, names, tables, strikes, unknown exclusions and Unicode/technical attachments are required. Mixed-unit lists, grouped or malformed dimension quantities, scientific/fractional/signed quantities, coordinates, chemistry, currency/temperature series and uncertain meanings remain manual.';
const number='(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?',plain='\\d+(?:\\.\\d+)?';
const canonical=/^(?:[1-9]\d{0,2}(?:,\d{3})+|0|[1-9]\d*)(?:\.\d+)?$/u;
const canonicalPlain=/^(?:0|[1-9]\d*)(?:\.\d+)?$/u;
const boundary='(?<![\\p{L}\\p{N}\\p{M}_])',sep='(?:\\s*,\\s*(?:(?:and|or)\\s+)?|\\s+(?:and|or)\\s+)';
const percentAtom=number+'\\s+percent(?![\\p{L}\\p{N}\\p{M}_])';
const percentPattern=new RegExp(boundary+percentAtom+'(?:'+sep+percentAtom+')+','giu');
const percentParts=new RegExp('('+number+')(?<gap>\\s+)percent(?![\\p{L}\\p{N}\\p{M}_])','giu');
const mark="(?:''|″|′|'|\")",dimAtom=plain+'\\s*(?:'+mark+')?';
const tail='(?:\\s*-\\s*|\\s+)(?:wide|long|tall|high|deep|thick|diameter|boards?|pipes?|plates?|panels?|strips?|openings?|tubes?|rods?|slabs?)(?![\\p{L}\\p{N}\\p{M}_])';
const dimensionPattern=new RegExp(boundary+'(?<items>'+dimAtom+'(?:'+sep+dimAtom+')+)(?<tail>'+tail+')','giu');
const dimensionParts=new RegExp('('+plain+')(?<gap>\\s*)(?<mark>'+mark+')?','gu');
const identifier=/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision)\s*$/iu;
const nameTail=/^\s+(?:[\p{Lu}][\p{L}\p{M}]*\s+){0,3}(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board|Association|Foundation|Institute|Program|Company|Corporation|Council|Office|Bureau|Center)(?![\p{L}\p{N}\p{M}_])/u;
const separatorBefore=/(?:,|(?<![\p{L}\p{N}\p{M}_])(?:and|or|to|through))\s*$/iu;
const separatorAfter=new RegExp('^'+sep,'iu');
const family=value=>/^(?:′|')$/u.test(value)?'foot':/^(?:″|"|'')$/u.test(value)?'inch':null;
const clean=s=>s.replace(/\s+/gu,' ').trim();
function contextFor(doc){const ctx=styleContext(doc),originalContext=originalBodyStyleContext(doc)||ctx;return {ctx,source:ctx.source,original:originalContext.source,originalContext,blocked:styleEvidenceGuard(doc,ctx),literal:originalStyleLiteralGuard(doc,ctx),quoted:billQuotedTermProtection(doc,ctx)};}
function safe(doc,c,start,end,evidenceEnd=end){
 const before=c.original.slice(0,start),after=c.original.slice(evidenceEnd);
 if(c.ctx.at(start)==='Heading'||c.blocked(start,evidenceEnd)||c.literal(start,evidenceEnd)||c.quoted({start,end:evidenceEnd})||[start,end,evidenceEnd].some(at=>cutsOriginalStyleWord(doc,at))||entityNameBoundaryBlocked(doc.text,c.source,c.original,start,evidenceEnd))return false;
 if(identifier.test(before)||/[.,\p{L}\p{N}\p{M}_]$/u.test(before)||/(?:[-+−/⁄∕*^×÷±]\s*|\d[\d.,]*\s*[eE]\s*[-+−]?\s*|\d\s*[.,]\s*)$/u.test(before)||separatorBefore.test(before)||nameTail.test(after))return false;
 if(/^\s*(?:[-+−±×÷/^*=]|(?:to|through)(?![\p{L}\p{N}\p{M}_]))/u.test(after))return false;
 if(/(?<![\p{L}\p{N}\p{M}_])[Tt]he\s+$/u.test(before)&&/^\s*(?:,\s*(?:Inc\.|Corp\.|Incorporated|Corporation),?\s*)?\s+is\s+(?:hereby\s+)?(?:created|established|designated)(?![\p{L}\p{N}\p{M}_])/u.test(after))return false;
 return true;
}
function rawPercent(source){return [...source.matchAll(percentPattern)].map(m=>({start:m.index,end:m.index+m[0].length,members:[...m[0].matchAll(percentParts)].map(p=>({start:m.index+p.index,value:p[1],valueEnd:m.index+p.index+p[1].length,end:m.index+p.index+p[0].length}))}));}
function rawDimensions(source){return [...source.matchAll(dimensionPattern)].map(m=>{const start=m.index,end=start+m.groups.items.trimEnd().length;return {start,end,evidenceEnd:start+m[0].length,members:[...m.groups.items.matchAll(dimensionParts)].map(p=>({start:start+p.index,value:p[1],valueEnd:start+p.index+p[1].length,mark:p.groups.mark||''})).filter(p=>p.start<end)};});}
const extendsRange=(ranges,row)=>ranges.some(r=>r.start<=row.start&&r.end>=row.end&&(r.start<row.start||r.end>row.end));
const seriesMemo=Symbol('complete-dimension-series-evidence');
export function dimensionSeriesEvidence(doc){return memoizeStyleReview(doc,null,seriesMemo,()=>{
 const c=contextFor(doc),raw=rawDimensions(c.source),original=rawDimensions(c.original);
 return raw.filter(r=>{const last=r.members.at(-1),unit=family(last?.mark);return r.members.length>=2&&unit&&r.members.every(p=>canonicalPlain.test(p.value)&&(!p.mark||family(p.mark)===unit))&&!extendsRange(original,r)&&safe(doc,c,r.start,r.end,r.evidenceEnd);});
});}
function issue(doc,references,row,suggestion,rule,message){return {start:row.start,end:row.end,evidenceStart:row.start,evidenceEnd:row.evidenceEnd??row.end,text:doc.text.slice(row.start,row.end),suggestion,guideId:'gpo',guidePage:277,guidePrintedPage:references.gpo.pages[276].printedPage,rule,category:'Symbol notation',context:styleContext(doc).at(row.start),checkId:'symbols',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:277,guidePrintedPage:references.gpo.pages[276].printedPage,rule,preferred:suggestion,ruleText:message}]};}
export function symbolSeriesIssues(doc,references){
 const c=contextFor(doc),issues=[],originalPercent=rawPercent(c.original);
 for(const r of rawPercent(c.source)){
  if(c.ctx.at(r.start)!=='Bill'||c.originalContext.at(r.start)!=='Bill'||r.members.some(p=>!canonical.test(p.value))||extendsRange(originalPercent,r)||!safe(doc,c,r.start,r.end)||separatorAfter.test(c.original.slice(r.end)))continue;
  let text=c.source.slice(r.start,r.end);for(const p of r.members.slice(0,-1).reverse())text=text.slice(0,p.valueEnd-r.start)+text.slice(p.end-r.start);
  issues.push(issue(doc,references,r,clean(text),'10.5','GPO 10.5 retains percent after the final value in this complete bare percentage list. Preserve every figure and connector; distinct labels/clauses, uncertain source text and the LCB Digest symbol form remain protected.'));
 }
 const raw=rawDimensions(c.source),original=rawDimensions(c.original);
 for(const r of dimensionSeriesEvidence(doc)){
  if(r.members.every(p=>p.mark))continue;
  let text=c.source.slice(r.start,r.end),unit=r.members.at(-1).mark;for(const p of [...r.members].reverse())if(!p.mark)text=text.slice(0,p.valueEnd-r.start)+unit+text.slice(p.valueEnd-r.start);
  issues.push(issue(doc,references,r,clean(text),'10.6','GPO 10.6 repeats the shared physical unit mark at every figure in this complete dimension list. The final mark and physical continuation identify the selected unit; values, connectors and existing marks remain unchanged.'));
 }
 for(const r of dimensionMarkParts(c.source)){
  if(!r.missingFirstMark||!canonicalPlain.test(r.first)||!canonicalPlain.test(r.last)||raw.some(p=>p.start<=r.start&&p.end>=r.end)||original.some(p=>p.start<=r.start&&p.end>=r.end)||!safe(doc,c,r.start,r.end,r.evidenceEnd))continue;
  const originalJoin=doc.text.slice(r.joinStart,r.joinStart+r.bridge.length),bridge=[...r.bridge].map((ch,n)=>/\S/u.test(ch)?originalJoin[n]:ch).join('');
  const suggestion=clean(r.first+r.lastMark+r.firstGap+bridge+r.last+r.lastGap+r.lastMark);
  issues.push(issue(doc,references,r,suggestion,'10.6','GPO 10.6 repeats the physical unit mark at both ends of this complete range. Original values and connector are preserved; fractional/scientific quantities, mixed units and uncertain source evidence remain manual.'));
 }
 return issues.sort((a,b)=>a.start-b.start||a.end-b.end);
}
