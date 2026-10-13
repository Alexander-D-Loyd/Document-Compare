import {styleContext,styleRangeBlocked} from './style-context.mjs';
import {METRIC_UNITS,METRIC_SYMBOLS,LCB_LISTED_UNIT_DEFINITIONS} from './metric-units.mjs';
const units=new Map([...METRIC_UNITS,...LCB_LISTED_UNIT_DEFINITIONS].flatMap(r=>[[r.name,r],[r.plural||r.name+'s',r]]));
const knownSymbols=new Set(METRIC_SYMBOLS.map(s=>s.toLowerCase()));
const pattern=new RegExp('\\b('+[...units.keys()].sort((a,b)=>b.length-a.length).join('|')+')\\s*\\(\\s*([A-Za-zμµ](?:[.\\s]*[A-Za-zμµ]){0,4}\\.?)\\s*\\)','gi');
export function metricDefinitionIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const safe=(start,end)=>!styleRangeBlocked(doc,start,end)&&!ctx.literalAt(start,end)&&!doc.blocks.some(b=>b.start<end&&b.end>start&&ctx.tableAt(Math.max(start,b.start)));
 for(const m of source.matchAll(pattern)){
  // Masked removed letters cannot turn the tail of a source word into an
  // independently written unit (for example kilo<former>grams -> grams).
  if(m.index>0&&/[\p{L}\p{N}_]/u.test(doc.text[m.index-1]))continue;
  const unit=units.get(m[1].toLowerCase()),wanted=unit.symbol,actual=m[2];
  const compact=actual.replace(/[.\s]/g,'').replace(/µ/g,'μ'),recognized=knownSymbols.has(compact.toLowerCase())||/s$/i.test(compact)&&knownSymbols.has(compact.slice(0,-1).toLowerCase());
  if(!recognized||ctx.at(m.index)==='Heading'||!safe(m.index,m.index+m[0].length))continue;
  const guideId=unit.guideId||'gpo';if(!references[guideId])continue;
  const message='The written unit name determines this symbol. '+(guideId==='lcb'?'LCB page 19 explicitly lists this name/symbol pair.':'GPO '+unit.rule+' supplies this recognized unit/prefix form.')+' Preserve the complete symbol and prefix case, without interletter spaces, dots or a plural s. Unknown abbreviations and isolated ambiguous symbols remain manual.';
  const cites=[{guideId,guideName:guideId==='lcb'?'LCB Style Manual':'GPO Style Manual',guidePage:unit.page,guidePrintedPage:references[guideId].pages[unit.page-1].printedPage,rule:unit.rule,preferred:wanted,ruleText:message}];
  if(unit.gpoPage)cites.push({guideId:'gpo',guideName:'GPO Style Manual',guidePage:unit.gpoPage,guidePrintedPage:references.gpo.pages[unit.gpoPage-1].printedPage,rule:unit.gpoRule,preferred:wanted,ruleText:'The GPO source table also explicitly lists '+unit.symbol+' for '+unit.name+'.'});
  // Only selected explicit quantity-role witnesses establish LCB word case.
  // An apparent name, caption or sentence-opening unit remains unresolved.
  if(guideId==='lcb'&&m[1]!==m[1].toLowerCase()&&m[1]!==m[1].toUpperCase()){
   const before=source.slice(Math.max(0,m.index-100),m.index),role=/\b(?:(?:measured|expressed|specified|reported|calculated)\s+in|(?:capacity|power|energy|storage|memory|size|amount|quantity|output)\s+(?:of|in))\s+$/i.exec(before);
   if(role&&safe(m.index-before.length+role.index,m.index+m[0].length)){
    const start=m.index,end=start+m[1].length,suggestion=m[1].toLowerCase(),caseMessage='LCB page19 lists '+unit.name+' in lowercase. An explicit measured/expressed quantity or capacity/output context identifies the unit word here. Sentence openings, apparent names, all-capital typography and other grammatical roles remain manual.';
    issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:19,guidePrintedPage:references.lcb.pages[18].printedPage,rule:unit.rule,category:'Unit name capitalization',context:ctx.at(start),checkId:'metric-definitions',conflict:false,message:caseMessage,references:[{...cites[0],preferred:suggestion,ruleText:caseMessage}]});
   }
  }
  if(actual.replace(/µ/g,'μ')!==wanted){
   const start=m.index+m[0].lastIndexOf(actual),end=start+actual.length;
   issues.push({start,end,text:doc.text.slice(start,end),suggestion:wanted,guideId,guidePage:unit.page,guidePrintedPage:references[guideId].pages[unit.page-1].printedPage,rule:unit.rule,category:'Unit definition',context:ctx.at(start),checkId:'metric-definitions',conflict:false,message,references:cites});
  }
 }
 return issues;
}
