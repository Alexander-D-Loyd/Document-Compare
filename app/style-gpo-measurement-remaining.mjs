import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';

// GPO 9.53, PDF250 / printed236. Only the six explicit full-name rows are
// used here; abs/API and unidentified bare symbols cannot supply meaning.
export const GPO_TEMPERATURE_GRAVITY_DEFINITIONS=Object.freeze([
 {name:'degree Celsius',names:['degree Celsius','degrees Celsius'],symbol:'°C',family:'c',quantityRequired:true,kind:'temperature'},
 {name:'degree Fahrenheit',names:['degree Fahrenheit','degrees Fahrenheit'],symbol:'°F',family:'f',quantityRequired:true,kind:'temperature'},
 {name:'degree Rankine',names:['degree Rankine','degrees Rankine'],symbol:'°R',family:'r',kind:'temperature'},
 {name:'kelvin',names:['kelvin','kelvins'],symbol:'K',family:'k',kind:'temperature'},
 {name:'Baumé',names:['Baumé'],symbol:'Bé',family:'be',kind:'gravity'},
 {name:'Twaddell',names:['Twaddell'],symbol:'Twad',family:'twad',kind:'gravity'}
].map(row=>Object.freeze({...row,names:Object.freeze(row.names)})));
export const GPO_TEMPERATURE_GRAVITY_DEFINITION_SCOPE='GPO 9.53: finite explicit definitions for degree Celsius, degree Fahrenheit, degree Rankine, kelvin, Baumé and Twaddell compare their printed parenthesized symbols °C, °F, °R, K, Bé and Twad. A complete original quantity or finite temperature/gravity measurement-role witness and full name establish the unit meaning. Celsius/Fahrenheit require preceding figures under the printed footnote; unquantified standalone °C/°F remain manual. Only same-family symbol case, interletter punctuation/spacing, the printed accent and degree-mark differences are compared; values are never converted. Kelvin scale remains separate from the kelvin unit. Original quantity/cue/name/parenthesis/symbol evidence, source ranges, literal and bill-local forms, headings, tables, strikes, unknown exclusions, technical/Unicode endpoints and source-created names are protected. LCB centigrade wording remains accepted and is not changed to Celsius. Abs, API/°API, unidentified symbols, unknown aliases, signed/scientific/fractional quantities, scale identity, typography and complete temperature/gravity compliance remain manual.';

const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&'),word=s=>[...s].map(escape).join('(?:-[ \\t]*\\n\\s*)?');
const names=GPO_TEMPERATURE_GRAVITY_DEFINITIONS.flatMap(row=>row.names).sort((a,b)=>b.length-a.length).map(name=>name.split(' ').map(word).join('\\s+')).join('|');
const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?<name>'+names+')(?![\\p{L}\\p{N}\\p{M}_])\\s*\\(\\s*(?<symbol>[°A-Za-zÉé.](?:[°A-Za-zÉé.\\s]{0,38}[°A-Za-zÉé.])?)\\s*\\)','giu');
const number='(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?';
const quantity=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])'+number+'\\s+$','u');
const temperatureRole=/(?<![\p{L}\p{N}\p{M}_])(?:(?:temperature|temperatures)\s+(?:(?:is|are|was|were)\s+)?(?:measured|expressed|specified|reported|calculated)\s+in|(?:temperature|temperatures)\s+(?:of|in))\s+$/iu;
const gravityRole=/(?<![\p{L}\p{N}\p{M}_])(?:(?:gravity|density)\s+(?:(?:is|was)\s+)?(?:measured|expressed|specified|reported|calculated)\s+in|(?:gravity|density)\s+(?:of|in))\s+$/iu;
const identifier=/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision|Case)\s*$/iu;
const titleTail=/^\s+(?:[\p{Lu}][\p{L}\p{M}]*\s+){0,3}(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board|Association|Foundation|Institute|Program|Company|Corporation|Council|Office|Bureau|Center)(?![\p{L}\p{N}\p{M}_])/u;
const creationTail=/^\s*(?:,\s*(?:Inc\.|Corp\.|Incorporated|Corporation),?\s*)?\s+is\s+(?:hereby\s+)?(?:created|established|designated)(?![\p{L}\p{N}\p{M}_])/u;
const normalizeName=s=>s.replace(/-[ \t]*\n\s*/gu,'').replace(/\s+/gu,' ').toLowerCase();
const byName=new Map(GPO_TEMPERATURE_GRAVITY_DEFINITIONS.flatMap(row=>row.names.map(name=>[name.toLowerCase(),row])));

export function gpoRemainingMeasurementIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,originalContext=originalBodyStyleContext(doc)||ctx,original=originalContext.source;
 const blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),issues=[];
 for(const m of source.matchAll(pattern)){
  const row=byName.get(normalizeName(m.groups.name));if(!row)continue;
  const nameStart=m.index,end=m.index+m[0].length,before=source.slice(0,nameStart),q=quantity.exec(before),cue=q||(row.quantityRequired?null:(row.kind==='temperature'?temperatureRole:gravityRole).exec(before));if(!cue)continue;
  const evidenceStart=cue.index,start=m.index+m[0].lastIndexOf(m.groups.symbol),symbolEnd=start+m.groups.symbol.length;
  if(ctx.at(evidenceStart)==='Heading'||blocked(evidenceStart,end)||literal(evidenceStart,end)||quoted({start:evidenceStart,end})||[evidenceStart,nameStart,end].some(at=>cutsOriginalStyleWord(doc,at))||entityNameBoundaryBlocked(doc.text,source,original,evidenceStart,end))continue;
  // Normalized body dashes cannot turn an uncertain scale word into a name.
  if([...source.slice(evidenceStart,end)].some((c,n)=>c==='-'&&/[\u2011-\u2015]/u.test(doc.text[evidenceStart+n])))continue;
  const prior=original.slice(0,evidenceStart),after=original.slice(end);
  if(identifier.test(prior)||/[.,\p{L}\p{N}\p{M}_]$/u.test(prior)||/(?<![\p{L}\p{N}\p{M}_])(?:minus|negative|plus|positive)\s+$/iu.test(prior)||/(?:[-+\u2212/\u2044\u2215*^×÷±]\s*|\d[\d.,]*\s*[eE]\s*[-+\u2212]?\s*|\d\s*[:.,]\s*|\p{N}\s+)$/u.test(prior)||/^\s*[-+\u2212/\u2044\u2215*^±×÷=]/u.test(after)||titleTail.test(after)||/(?<![\p{L}\p{N}\p{M}_])[Tt]he\s+$/u.test(prior)&&creationTail.test(after))continue;
  const actual=m.groups.symbol,compact=actual.replace(/[.\s]/gu,''),family=compact.replace(/^°/u,'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
  // Missing or extra scale letters cannot authorize a different unit name.
  if(family!==row.family||!/^°?[A-Za-zÉé]+$/u.test(compact))continue;
  if(actual===row.symbol)continue;
  const message='GPO 9.53 explicitly lists “'+row.symbol+'” for '+row.name+'. The complete original quantity/measurement-role cue and written name establish this parenthesized symbol. Compare the printed case, punctuation, accent and degree mark; the value and scale name are not converted.';
  const cite=(page,rule)=>({guideId:'gpo',guideName:'GPO Style Manual',guidePage:page,guidePrintedPage:references.gpo.pages[page-1].printedPage,rule,preferred:row.symbol,ruleText:message});
  issues.push({start,end:symbolEnd,text:doc.text.slice(start,symbolEnd),suggestion:row.symbol,guideId:'gpo',guidePage:250,guidePrintedPage:references.gpo.pages[249].printedPage,rule:'9.53',category:'Temperature/gravity definition',context:ctx.at(nameStart),checkId:'gpo-temperature-gravity-definitions',conflict:false,message,temperatureGravityEvidence:{name:row.name,symbol:row.symbol,kind:row.kind,evidenceStart,evidenceEnd:end,quantity:q?.[0].trim()||null},references:[cite(249,'9.53'),cite(250,'9.53 (table continuation)')]});
 }
 return issues;
}
