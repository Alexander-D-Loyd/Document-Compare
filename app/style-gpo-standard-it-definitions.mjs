import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';
import {originalTemporalNameBlocked} from './style-time-abbreviations-next.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
import {GPO_STANDARD_IT_DEFINITIONS} from './data/gpo-standard-it-definitions.mjs';

export const GPO_STANDARD_IT_DEFINITION_SCOPE='Finite, physically verified GPO 2016 standard (9.61, PDF252–261) and IT (9.64, PDF270–275) definition pairs. An intact complete listed written name immediately followed by a parenthesized same-letter/same-structural-symbol abbreviation establishes identity. Compare only the abbreviation’s printed case, dots and spacing, retaining all printed alternatives and original structural dash glyphs. Expansion case is ignored and no expansion wording/spelling is suggested. Unknown abbreviations, bare acronyms, changed agency identities, optional/conditional/ambiguous source rows and every individually recorded source-layout exclusion remain manual. Whole original name/separator/parenthesis/abbreviation evidence, literal and bill-local forms, name boundaries, headings, tables, technical attachments, strikes and unknown exclusions remain protected.';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
const dash=s=>s.replace(/[\u2010-\u2015]/gu,'-');
const nameKey=s=>dash(s).replace(/\s+/gu,' ').trim().toLowerCase();
const symbolKey=s=>dash(s).replace(/[.\s]/gu,'').toLowerCase();
const byName=new Map();
for(const row of GPO_STANDARD_IT_DEFINITIONS){const key=nameKey(row.name),values=byName.get(key)||[];values.push(row);byName.set(key,values);}
const knownWords=new Set(GPO_STANDARD_IT_DEFINITIONS.flatMap(row=>(row.name.match(/\p{L}+/gu)||[]).map(w=>w.toLowerCase())));
const names=[...byName.keys()].sort((a,b)=>b.length-a.length).map(name=>name.split(' ').map(escape).join('\\s+')).join('|');
const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?<name>'+names+')(?![\\p{L}\\p{N}\\p{M}_])\\s*\\(\\s*(?<symbol>[A-Za-z0-9](?:[A-Za-z0-9.&/_+\\-\\s]{0,100}[A-Za-z0-9.&/_+\\-])?)\\s*\\)','giu');
const identifier=/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision)\s*$/iu;
const directCreation=/^\s*(?:,\s*(?:Inc\.|Corp\.|Incorporated|Corporation),?\s*)?\s+is\s+(?:hereby\s+)?(?:created|established|designated)(?![\p{L}\p{N}\p{M}_])/u;
function sourceAuthority(references,family){
 const pages=new Map((references?.gpo?.pages||[]).map(p=>[p.page,p]));
 const standard=pages.get(252)?.text,it=pages.get(270)?.text;
 const enabled={standard:typeof standard==='string'&&/9\.61\.\s+For a more complete list of Government acronyms visit/u.test(standard)&&standard.includes('Use these forms if abbreviations'),it:typeof it==='string'&&/9\.64\.\s+Use these forms, if abbreviations are required:/u.test(it)};
 const authority=new Map();
 for(const row of GPO_STANDARD_IT_DEFINITIONS){
  if(family&&row.family!==family||!enabled[row.family])continue;const page=pages.get(row.page);
  if(typeof page?.text!=='string')continue;
  const matches=[];for(let at=page.text.indexOf(row.sourceText);at>=0;at=page.text.indexOf(row.sourceText,at+1))if((at===0||page.text[at-1]==='\n')&&(at+row.sourceText.length===page.text.length||page.text[at+row.sourceText.length]==='\n'))matches.push(at);
  if(matches.length!==1)continue;const start=matches[0];
  authority.set(row.id,{row,page,sourcePassage:{start,end:start+row.sourceText.length,text:row.sourceText,page:row.page}});
 }
 return authority;
}
// Dashes/solid structural marks establish abbreviation identity but are never
// rewritten by this case/dot/spacing check. Preserve each source glyph in situ.
function preserveStructuralGlyphs(form,actual){
 const glyphs=[...actual].filter(c=>!/[A-Za-z0-9.\s]/u.test(c));let index=0;
 return [...form].map(c=>!/[A-Za-z0-9.\s]/u.test(c)?glyphs[index++]??c:c).join('');
}
function definitionIssues(doc,references,family){
 const authority=sourceAuthority(references,family);if(!authority.size)return [];
 const ctx=styleContext(doc),source=ctx.source,original=originalBodyStyleContext(doc)?.source||source;
 const blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),issues=[];
 for(const m of source.matchAll(pattern)){
  const evidenceStart=m.index,evidenceEnd=m.index+m[0].length,start=m.index+m[0].lastIndexOf(m.groups.symbol),end=start+m.groups.symbol.length;
  const actual=doc.text.slice(start,end),key=symbolKey(m.groups.symbol);
  const candidates=(byName.get(nameKey(m.groups.name))||[]).map(row=>authority.get(row.id)).filter(Boolean).flatMap(a=>a.row.forms.filter(form=>symbolKey(form)===key).map(form=>({...a,form:preserveStructuralGlyphs(form,actual)})));
  if(!candidates.length||candidates.some(c=>c.form===actual))continue;
  const forms=[...new Set(candidates.map(c=>c.form))];if(forms.length!==1)continue;
  // A narrative dash in an expanded name is not a lexical hyphen witness.
  if([...m.groups.name.matchAll(/-/gu)].some(h=>! /[-\u2010\u2011]/u.test(doc.text[evidenceStart+h.index]||'')))continue;
  if(ctx.at(evidenceStart)==='Heading'||blocked(evidenceStart,evidenceEnd)||literal(evidenceStart,evidenceEnd)||quoted({start,end})||quoted({start:evidenceStart,end:evidenceEnd})||cutsOriginalStyleWord(doc,evidenceStart)||cutsOriginalStyleWord(doc,evidenceEnd)||entityNameBoundaryBlocked(doc.text,source,original,evidenceStart,evidenceEnd)||originalTemporalNameBlocked(original,evidenceStart,evidenceEnd)||identifier.test(original.slice(0,evidenceStart))||/(?<![\p{L}\p{N}\p{M}_])[Tt]he\s+$/u.test(original.slice(0,evidenceStart))&&directCreation.test(original.slice(evidenceEnd)))continue;
  const suggestion=forms[0],first=candidates[0],row=first.row;
  const message='GPO '+row.rule+' explicitly lists '+row.forms.join(' or ')+' for the complete written name '+row.name+'. This same-letter parenthesized definition establishes the abbreviation. Preserve the table’s case, dots and spacing; expanded-name wording/case, bare acronym meaning and current entity identity are not inferred.';
  const referencesForIssue=[...new Map(candidates.map(c=>[c.row.id,{guideId:'gpo',guideName:'GPO Style Manual',guidePage:c.row.page,guidePrintedPage:c.page.printedPage,rule:c.row.rule,preferred:c.form,ruleText:message,sourcePassage:c.sourcePassage}])).values()];
  issues.push({start,end,evidenceStart,evidenceEnd,text:actual,suggestion,guideId:'gpo',guidePage:row.page,guidePrintedPage:first.page.printedPage,rule:row.rule,category:row.family==='it'?'IT abbreviation definition':'Standard abbreviation definition',checkId:row.family==='it'?'gpo-it-abbreviation-definitions':'gpo-standard-abbreviation-definitions',conflict:false,context:ctx.at(start),message,definitionEvidence:{fullName:row.name,families:[...new Set(candidates.map(c=>c.row.family))],sourceRows:[...new Set(candidates.map(c=>c.row.id))],acceptedForms:[...new Set(candidates.flatMap(c=>c.row.forms))]},references:referencesForIssue});
 }
 return issues;
}
function review(doc,references,family){
 const view=styleWordDivisionView(doc,{knownWords,knownWordsOnly:true,preserveRemainingWords:true});
 if(!view)return withStyleContext(doc,()=>definitionIssues(doc,references,family));
 const issues=withStyleContext(view.doc,()=>definitionIssues(view.doc,references,family));
 return view.restore(issues).map((issue,n)=>({...issue,evidenceStart:view.toSource(issues[n].evidenceStart),evidenceEnd:view.toSource(issues[n].evidenceEnd,true)}));
}
export const gpoStandardItDefinitionIssues=(doc,references)=>review(doc,references);
export const gpoStandardAbbreviationDefinitionIssues=(doc,references)=>review(doc,references,'standard');
export const gpoItAbbreviationDefinitionIssues=(doc,references)=>review(doc,references,'it');

