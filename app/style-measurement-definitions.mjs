import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';
import {GPO_ENGLISH_ABBREVIATIONS} from './style-english-abbreviations.mjs';

const plural=name=>name==='foot'?'feet':name==='inch'?'inches':name+'s';
const bare=GPO_ENGLISH_ABBREVIATIONS.map(row=>{
 const names=row.symbol==='mi'?['mile','statute mile']:row.symbol==='t'?['metric ton','tonne']:[row.name];
 return {...row,names:names.flatMap(name=>[name,plural(name)]),rule:'9.58',power:null};
});
const metric=[['km','kilometer'],['hm','hectometer'],['dam','decameter'],['m','meter'],['dm','decimeter'],['cm','centimeter'],['mm','millimeter']].flatMap(([symbol,name])=>[2,3].map(power=>({symbol,names:[(power===2?'square ':'cubic ')+(symbol==='dam'&&power===3?'dekameter':name),(power===2?'square ':'cubic ')+(symbol==='dam'&&power===3?'dekameters':plural(name))],page:251,rule:'9.56',power})));
const english=[['in','inch',2],['in','inch',3],['mi','mile',2],['ft','foot',3]].map(([symbol,name,power])=>({symbol,names:[(power===2?'square ':'cubic ')+name,(power===2?'square ':'cubic ')+plural(name)],page:251,rule:'9.58',power}));
export const GPO_MEASUREMENT_DEFINITIONS=Object.freeze([...bare,...metric,...english].map(row=>Object.freeze({...row,names:Object.freeze(row.names)})));
export const GPO_MEASUREMENT_DEFINITION_SCOPE='Finite explicit unit definitions under GPO 9.56/9.58: all 23 English/time unit names and the 14 metric plus four English square/cubic table forms are checked when a complete quantity or measured/expressed-in/area/volume role precedes the full written name and its parenthesized symbol. Significant symbol case, interletter dots/spaces and appended plural s can be compared without inferring isolated symbol meaning. Powered forms require an explicit 2/3 or superscript equivalent; missing powers and unknown symbols remain manual. Plain and superscript powers are accepted equivalently because PDF text can flatten printed superscripts; no superscript-font certification is asserted. Original cue, name, parentheses and symbol evidence, numbers, source offsets, quotes, bill-local wording, tables, strikes, unknown exclusions, technical endpoints and source-created names are protected. The printed decameter/dekameter spelling distinction is retained. The requested-cc exception, unlisted derived units, ordinary abbreviation punctuation/case without a full-name witness, complex quantities and semantic/typographic interpretation remain manual.';

const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
const word=s=>[...s].map(escape).join('(?:-[ \\t]*\\n\\s*)?');
const namePattern=GPO_MEASUREMENT_DEFINITIONS.flatMap(row=>row.names).sort((a,b)=>b.length-a.length).map(name=>name.split(' ').map(word).join('\\s+')).join('|');
const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?<name>'+namePattern+')(?![\\p{L}\\p{N}\\p{M}_])\\s*\\(\\s*(?<symbol>[A-Za-z23²³.](?:[A-Za-z23²³.\\s]{0,38}[A-Za-z23²³.])?)\\s*\\)','giu');
const number='(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?';
const quantity=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])'+number+'\\s+$','u');
const role=/(?<![\p{L}\p{N}\p{M}_])(?:(?:measured|expressed|specified|reported|calculated)\s+in|(?:area|volume|distance|length|weight|mass|duration|capacity)\s+(?:of|in))\s+$/iu;
const identifier=/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision)\s*$/iu;
const titleTail=/^\s+(?:[\p{Lu}][\p{L}\p{M}]*\s+){0,3}(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board|Association|Foundation|Institute|Program|Company|Corporation|Council|Office|Bureau|Center)(?![\p{L}\p{N}\p{M}_])/u;
const normalizeName=s=>s.replace(/-[ \t]*\n\s*/gu,'').replace(/\s+/gu,' ').toLowerCase();
const byName=new Map(GPO_MEASUREMENT_DEFINITIONS.flatMap(row=>row.names.map(name=>[name,row])));
const bareFamilies=new Set(GPO_ENGLISH_ABBREVIATIONS.map(row=>row.symbol.toLowerCase()));

export function measurementDefinitionIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,originalContext=originalBodyStyleContext(doc)||ctx,original=originalContext.source;
 const blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),issues=[];
 for(const m of source.matchAll(pattern)){
  const row=byName.get(normalizeName(m.groups.name));if(!row)continue;
  const nameStart=m.index,end=m.index+m[0].length,before=source.slice(0,nameStart),cue=quantity.exec(before)||role.exec(before);if(!cue)continue;
  const evidenceStart=cue.index,symbolStart=m.index+m[0].lastIndexOf(m.groups.symbol),symbolEnd=symbolStart+m.groups.symbol.length;
  if(ctx.at(evidenceStart)==='Heading'||blocked(evidenceStart,end)||literal(evidenceStart,end)||quoted({start:evidenceStart,end})||[evidenceStart,nameStart,end].some(i=>cutsOriginalStyleWord(doc,i))||entityNameBoundaryBlocked(doc.text,source,original,evidenceStart,end))continue;
  // Only a printed discretionary hyphen can join a divided positive word.
  if([...source.slice(evidenceStart,end)].some((c,n)=>c==='-'&&/[\u2011-\u2015]/u.test(doc.text[evidenceStart+n])))continue;
  const prior=original.slice(0,evidenceStart),after=original.slice(end);
  if(/^\s*[*^+\u2212±×÷=]/u.test(after))continue;
  if(identifier.test(prior)||/[.,\p{L}\p{N}\p{M}_]$/u.test(prior)||/(?:[-+\u2212/\u2044\u2215*^×÷±]\s*|\d[\d.,]*\s*[eE]\s*[-+\u2212]?\s*|\d\s*[.,]\s*)$/u.test(prior)||titleTail.test(after)||/(?<![\p{L}\p{N}\p{M}_])[Tt]he\s+$/u.test(prior)&&/^\s*(?:,\s*(?:Inc\.|Corp\.|Incorporated|Corporation),?\s*)?\s+is\s+(?:hereby\s+)?(?:created|established|designated)(?![\p{L}\p{N}\p{M}_])/u.test(after))continue;
  // Time seconds and weight pounds do not establish angle/currency meaning.
  const sentence=original.slice(originalContext.sentenceAt(evidenceStart).start,originalContext.sentenceAt(end-1).end);
  if(row.symbol==='s'&&/(?<![\p{L}\p{N}\p{M}_])(?:arc|angle|latitude|longitude)(?![\p{L}\p{N}\p{M}_])/iu.test(sentence)||row.symbol==='lb'&&/(?<![\p{L}\p{N}\p{M}_])(?:sterling|currency|pence|British\s+pounds?)(?![\p{L}\p{N}\p{M}_])/iu.test(sentence))continue;
  const actual=m.groups.symbol,compact=actual.replace(/[.\s]/gu,''),parsed=/^([A-Za-z]+?)([23²³])?(s)?$/iu.exec(compact);if(!parsed)continue;
  let family=parsed[1].toLowerCase(),power=parsed[2];
  // A trailing s can belong to a bare family (seconds) or be a plural suffix.
  if(!row.power&&!bareFamilies.has(family)&&family.endsWith('s')&&bareFamilies.has(family.slice(0,-1)))family=family.slice(0,-1);
  if(row.power){if(!power||family!==row.symbol.toLowerCase())continue;}
  else if(power||family!==row.symbol.toLowerCase())continue;
  const exponent=row.power?(/[²³]/u.test(power)?row.power===2?'²':'³':String(row.power)):'';
  const suggestion=row.symbol+exponent;if(actual===suggestion)continue;
  const message='GPO '+row.rule+' lists this written unit with “'+row.symbol+(row.power?(row.power===2?'²':'³'):'')+'”. The complete quantity or measurement-role cue and written name identify the parenthesized symbol; compare its case, punctuation, plural and explicit power without changing the quantity.';
  const firstPage=row.rule==='9.56'?250:251,cite=(page,rule)=>({guideId:'gpo',guideName:'GPO Style Manual',guidePage:page,guidePrintedPage:references.gpo.pages[page-1].printedPage,rule,preferred:suggestion,ruleText:message});
  issues.push({start:symbolStart,end:symbolEnd,text:doc.text.slice(symbolStart,symbolEnd),suggestion,guideId:'gpo',guidePage:row.page,guidePrintedPage:references.gpo.pages[row.page-1].printedPage,rule:row.rule,category:'Measurement definition',context:ctx.at(nameStart),checkId:'gpo-measurement-definitions',conflict:false,message,measurementDefinitionEvidence:{name:normalizeName(m.groups.name),symbol:row.symbol,power:row.power,evidenceStart,evidenceEnd:end},references:[cite(firstPage,row.rule),...(row.page!==firstPage?[cite(row.page,row.rule+' (table continuation)')]:[])]});
 }
 return issues;
}
