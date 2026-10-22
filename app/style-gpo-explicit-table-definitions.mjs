import {GPO_EXPLICIT_DEFINITION_TABLES as authority} from './data/gpo-explicit-table-definitions.mjs';
import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';

export const GPO_EXPLICIT_TABLE_DEFINITION_SCOPE=authority.scope+' All original definition characters and any unit cue are required evidence. Quotes, local defined wording, names, technical attachments, headings, tables, struck or uncertain exclusions and incomplete endpoints are protected. Plain and superscript 2/3 are accepted equivalently; no font judgment is made. No general word, acronym, chemical identity or current-currency inference is made.';
export {GPO_EXPLICIT_DEFINITION_TABLES} from './data/gpo-explicit-table-definitions.mjs';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
const fold=s=>s.replace(/\s+/gu,' ').trim().toLowerCase();
const byName=new Map();for(const row of authority.rows){const key=fold(row.name);if(!byName.has(key))byName.set(key,[]);byName.get(key).push(row);}
const names=authority.rows.map(r=>r.name).sort((a,b)=>b.length-a.length).map(n=>n.split(/\s+/u).map(escape).join('\\s+'));
const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?<name>'+names.join('|')+')(?![\\p{L}\\p{N}\\p{M}_])\\s*\\(\\s*(?<symbol>[^()]{1,70}?(?:\\([^()]{1,30}\\)[^()]{0,30})?)\\s*\\)','giu');
const numeric='(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?';
const quantity=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])'+numeric+'\\s+$','u');
const role=/(?<![\p{L}\p{N}\p{M}_])(?:(?:measured|expressed|specified|reported|calculated)\s+in|(?:area|volume|distance|length|weight|mass|duration|capacity|frequency|pressure|energy|power|current|voltage|temperature)\s+(?:of|in))\s+$/iu;
const identifier=/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision)\s*$/iu;
const titleTail=/^\s+(?:[\p{Lu}][\p{L}\p{M}]*\s+){0,3}(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board|Association|Foundation|Institute|Program|Company|Corporation|Council|Office|Bureau|Center)(?![\p{L}\p{N}\p{M}_])/u;
const compact=s=>s.replace(/[.\s]/gu,'').replace(/[²₂]/gu,'2').replace(/[³₃]/gu,'3').toLowerCase();
const fingerprint=s=>{let n=2166136261;for(let i=0;i<s.length;i++)n=Math.imul(n^s.charCodeAt(i),16777619);return(n>>>0).toString(16);};
const knownWords=new Set(authority.rows.flatMap(r=>r.name.match(/\p{L}+/gu)||[]).map(x=>x.toLowerCase()));

function issuesInView(doc,references){
 const ctx=styleContext(doc),source=ctx.source,originalContext=originalBodyStyleContext(doc)||ctx,original=originalContext.source;
 const blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),issues=[];
 const validPages=new Map(authority.sourcePages.map(p=>{const candidates=references?.gpo?.pages?.filter(x=>x.page===p.page)||[],page=candidates.length===1?candidates[0]:null;return[p.page,page&&typeof page.text==='string'&&page.text.length===p.length&&fingerprint(page.text)===p.fingerprint?page:null]}));
 for(const m of source.matchAll(pattern)){
  const candidates=byName.get(fold(m.groups.name));if(!candidates)continue;
  const actual=m.groups.symbol.trim(),choices=candidates.flatMap(row=>row.symbols.filter(s=>compact(s)===compact(actual)).map(symbol=>({row,symbol})));if(new Set(choices.map(c=>c.symbol)).size!==1)continue;
  const {row,symbol:canonical}=choices.find(c=>c.row.group==='currency')||choices[0],suggestion=canonical.replace(/2/gu,actual.includes('²')?'²':actual.includes('₂')?'₂':'2').replace(/3/gu,actual.includes('³')?'³':actual.includes('₃')?'₃':'3');
  if(actual===suggestion)continue;
  let evidenceStart=m.index;const evidenceEnd=m.index+m[0].length;
  if(row.group==='unit'){const cue=quantity.exec(source.slice(0,m.index))||role.exec(source.slice(0,m.index));if(!cue)continue;evidenceStart=cue.index;}
  const witness=row.witnesses.find(w=>{const p=validPages.get(w.page);return w.symbols.includes(canonical)&&p&&p.text.slice(w.start,w.end)===w.text;});if(!witness)continue;
  const page=validPages.get(witness.page),prior=original.slice(0,evidenceStart),after=original.slice(evidenceEnd);
  if(ctx.at(evidenceStart)==='Heading'||originalContext.at(evidenceStart)==='Heading'||blocked(evidenceStart,evidenceEnd)||literal(evidenceStart,evidenceEnd)||quoted({start:evidenceStart,end:evidenceEnd})||[evidenceStart,m.index,evidenceEnd].some(i=>cutsOriginalStyleWord(doc,i))||entityNameBoundaryBlocked(doc.text,source,original,evidenceStart,evidenceEnd)||identifier.test(prior)||titleTail.test(after))continue;
  if(/(?<![\p{L}\p{N}\p{M}_])[Tt]he\s+$/u.test(prior)&&/^\s*(?:,\s*(?:Inc\.|Corp\.|Incorporated|Corporation),?\s*)?\s+is\s+(?:hereby\s+)?(?:created|established|designated)(?![\p{L}\p{N}\p{M}_])/u.test(after))continue;
  // A masked number/operator or a name continuation cannot manufacture a
  // complete measurement. Preserve all quantities and technical expressions.
  if(/[\p{L}\p{N}\p{M}_.,]$/u.test(prior)||/(?:[-+−/⁄∕*^×÷±]\s*|\d[\d.,]*\s*[eE]\s*[-+−]?\s*|\d\s*[:.,]\s*)$/u.test(prior)||/^\s*[*^+−±×÷=]/u.test(after))continue;
  if(row.group==='unit'&&(/(?<![\p{L}\p{N}\p{M}_])(?:minus|negative|plus|positive)\s+$/iu.test(prior)||/\p{N}\s+$/u.test(prior)))continue;
  // styleSource folds narrative dashes; only printed compound hyphens can
  // provide positive full-name evidence. Do not convert a narrative dash.
  if([...m.groups.name.matchAll(/-/gu)].some(h=>! /[-\u2010\u2011]/u.test(doc.text[m.index+h.index]||'')))continue;
  const start=m.index+m[0].lastIndexOf(actual),end=start+actual.length;
  const groupLabel={unit:'Unit',latin:'Latin abbreviation',chemical:'Element symbol',currency:'Currency code'}[row.group];
  const message=row.group==='currency'?(page.page===252?'GPO 9.60 prints “':'The fixed GPO July 2016 currency table prints “')+canonical+'” for the complete name “'+row.name+'”. Compare only this explicit same-letter parenthesized form. This is not a check of current currency validity, geography, amounts or conversions.':'GPO '+row.rule+' explicitly lists “'+canonical+'” for “'+row.name+'”. The complete name'+(row.group==='unit'?' and measurement cue':'')+' establishes this same-letter parenthesized form; preserve the printed case and punctuation. No isolated symbol meaning is inferred.';
  const rule=row.group==='currency'&&page.page===252?'9.60':row.rule;
  const citation={guideId:'gpo',guideName:'GPO Style Manual',guidePage:page.page,guidePrintedPage:page.printedPage,rule,preferred:suggestion,ruleText:message,sourcePassage:witness};
  issues.push({start,end,evidenceStart,evidenceEnd,text:doc.text.slice(start,end),suggestion,guideId:'gpo',guidePage:page.page,guidePrintedPage:page.printedPage,rule,category:groupLabel+' definition',context:ctx.at(start),checkId:'gpo-explicit-table-definitions',conflict:false,message,explicitTableDefinitionEvidence:{group:row.group,name:row.name,symbol:canonical,evidenceStart,evidenceEnd,sourcePageSHA256:authority.sourcePages.find(p=>p.page===page.page).sha256},references:[citation]});
 }
 return issues;
}
export function gpoExplicitTableDefinitionIssues(doc,references){
 const view=styleWordDivisionView(doc,{knownWords,knownWordsOnly:true,preserveRemainingWords:true});
 if(!view)return withStyleContext(doc,()=>issuesInView(doc,references));
 const found=withStyleContext(view.doc,()=>issuesInView(view.doc,references));
 return view.restore(found).map((issue,n)=>{const evidenceStart=view.toSource(found[n].evidenceStart),evidenceEnd=view.toSource(found[n].evidenceEnd,true);return {...issue,evidenceStart,evidenceEnd,explicitTableDefinitionEvidence:{...issue.explicitTableDefinitionEvidence,evidenceStart,evidenceEnd}}});
}
