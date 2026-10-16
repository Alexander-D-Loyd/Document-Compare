import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard} from './style-evidence.mjs';
export const LCB_CONTEXTUAL_IDENTITY_SCOPE=' Complete original selected words and establishing noun/qualifier/predicate/serial evidence reject Unicode letters, digits and combining-mark fragments, masked adjacent characters, source strikes including spaces, tables, literals and unknown ignored/excluded content. Identified interior heads/margins retain exact body offsets; preceding qualifiers remain bounded to 300 characters. Independent intact alternatives remain eligible. Historical checks validate an intact definite name and unquoted World War I/II cue, preserve unrelated intervening quoted titles, and reject intervening unknown/struck/table content. Unencoded identities and semantic roles remain manual.';
// A source form alone does not identify its meaning. Bind these ambiguous
// color/ethnic words to recognized demographic heads, not arbitrary matches.
export const LCB_DEMOGRAPHIC_NAMES=[
 {page:18,preferred:'Asian',gpoPage:62},
 {page:18,preferred:'Black',gpoPage:63},
 {page:19,preferred:'Hispanic',gpoPage:78},
 {page:19,preferred:'Latino',gpoPage:80},
 {page:20,preferred:'White',gpoPage:94},
];
export const LCB_QUALIFIED_NAMES=[
 {page:18,preferred:'Constitution',scope:'Complete United States Constitution / Constitution of the United States names and explicit U.S. qualifiers retain their checks. The singular LCB18 entry also checks Constitution with the complete of the State of California qualifier and a selected finite constitutional predicate. Standalone short forms, other state/national identities and legal effect remain manual.'},
 {page:19,preferred:'Senator',scope:'Capitalization requires an explicit United States/U.S. senator qualifier or a recognizable personal name followed by a predicate. Standalone state-senator choices differ under GPO and are left protected.'},
 {page:19,preferred:'Representative',scope:'The title requires an adjoining explicit United States Congress or United States House of Representatives qualifier. Generic agents, country representatives, state offices and unresolved standalone titles remain manual.'},
 {page:19,preferred:'Executive Order No. 34',scope:'Selected named Executive Order No. plus an explicit number is checked as a title, including the listed No. 34 witness. Generic executive orders and unresolved titles remain protected.'},
 {page:18,preferred:'Allies',scope:'The named Allies require a definite the and an explicit unquoted World War I/II temporal relation in the same sentence. Our allies and unknown periods remain protected.'},
 {page:18,preferred:'Allied force',scope:'The historical Allied force requires a definite the and an explicit unquoted World War I/II temporal relation in the same sentence. Other forces and names remain manual.'},
 {page:18,preferred:'Armed Forces',scope:'The explicitly listed U.S. military name requires an adjoining United States/U.S. qualifier. Foreign or unresolved military forces remain manual.'},
 {page:18,preferred:'Congress',scope:'Only the complete United States Congress name is checked. Generic congress uses and unresolved bodies remain manual.'},
 {page:19,preferred:'Legislature',scope:'Only the complete California Legislature name is checked. The generic state-legislature short form is preserved under the guide-conflict policy.'},
].map(r=>({...r,scope:r.scope+LCB_CONTEXTUAL_IDENTITY_SCOPE}));
export const LCB_CONTEXTUAL_DESCRIPTIONS=[
 {page:18,preferred:'bay area',scope:'Only the generic phrase immediately after the, with a finite predicate or lowercase geographic/prepositional continuation, is checked. The complete San Francisco Bay name, extended institutional titles, source quotations and unresolved labels remain protected.'},
 {page:18,preferred:'diabetes',scope:'Only the disease word adjoining an explicit type I/II cue is checked for lowercase. Unknown uses, named programs and the choice of Roman versus Arabic type identifiers remain manual.'},
 {page:19,preferred:'people',scope:'Only the common count noun after an explicit numerical count and before a recognized predicate/relative clause is checked for lowercase. Legal party names, constitutional personifications and unresolved senses remain protected.'},
].map(r=>({...r,scope:r.scope+LCB_CONTEXTUAL_IDENTITY_SCOPE}));
const peopleHeads='people|persons|residents|students|workers|applicants|voters|children|adults|patients|communities|households|families';
const peoplePattern=new RegExp('\\b('+LCB_DEMOGRAPHIC_NAMES.map(r=>r.preferred).join('|')+')(?=\\s+(?:'+peopleHeads+')\\b)','gi');
const peopleLookup=new Map(LCB_DEMOGRAPHIC_NAMES.map(r=>[r.preferred.toLowerCase(),r]));
export function contextualNameIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],blocked=styleEvidenceGuard(doc,ctx);
 // Identity comes from complete source cues, not whitespace manufactured by
 // masking unknown letters. Keep a finite preceding window while allowing
 // reader-identified interior page labels to separate intact body fragments.
 const cutsWord=index=>/[\p{L}\p{N}\p{M}_]$/u.test(doc.text.slice(Math.max(0,index-2),index))&&/^[\p{L}\p{N}\p{M}_]/u.test(doc.text.slice(index,index+2));
 const continuityBlocked=styleEvidenceGuard(doc,{...ctx,literalAt:()=>false});
 const valid=r=>r&&!cutsWord(r.start)&&!cutsWord(r.end)&&!(r.continuity?continuityBlocked:blocked)(r.start,r.end);
 const preceding=(m,pattern)=>{const begin=Math.max(0,m.index-300),match=pattern.exec(source.slice(begin,m.index));return match?{start:begin+match.index,end:m.index+m[0].length}:null;};
 const following=(m,pattern)=>{const end=m.index+m[0].length,match=pattern.exec(source.slice(end));return match?{start:m.index,end:end+match[0].length}:null;};
 const establish=(m,...ranges)=>{m.evidence=ranges.filter(Boolean);};
 const add=(m,preferred,page,rule,message,gpoPage,qualified=false,category='Contextual name capitalization',gpoRule='Capitalization examples')=>{
  const start=m.index,end=start+m[0].length,after=source.slice(end);
  if(!valid({start,end})||!(m.evidence||[{start,end}]).some(valid))return;
  if(m[0].replace(/\s+/g,' ')===preferred||ctx.at(start)==='Heading'||ctx.tableAt(start)||ctx.literalAt(start,end)||m[0]===m[0].toUpperCase())return;
  // Protect extended institutional names and headings in mixed case.
  if(!qualified&&/[A-Z][a-z]+\s+[A-Z][a-z]+/.test(m[0])||/^[A-Z]/.test(m[0])&&/^\s+(?:(?:of|for|the|and|in|on)\s+)?[A-Z][a-z]/.test(after))return;
  const refs=[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:page,guidePrintedPage:references.lcb.pages[page-1].printedPage,rule,preferred,ruleText:message}];
  if(gpoPage)refs.push({guideId:'gpo',guideName:'GPO Style Manual',guidePage:gpoPage,guidePrintedPage:references.gpo.pages[gpoPage-1].printedPage,rule:gpoRule,preferred,ruleText:gpoRule==='3.32'?'GPO 3.32 generally leaves disease names lowercase and explicitly lists diabetes. Names honoring a person or geographic location remain exceptions requiring their own source context.':'The GPO capitalization examples list '+preferred+' for this stated use.'});
  issues.push({start,end,text:doc.text.slice(start,end),suggestion:preferred,guideId:'lcb',guidePage:page,guidePrintedPage:references.lcb.pages[page-1].printedPage,rule,category,context:ctx.at(start),checkId:'lcb-contextual-names',conflict:false,message,references:refs});
 };
 for(const m of source.matchAll(peoplePattern)){
  const r=peopleLookup.get(m[1].toLowerCase());
  // Require an ordinary lowercase demographic head; a named White House
  // or Black Students Association cannot be classified by this check.
  establish(m,following(m,new RegExp('^\\s+(?:'+peopleHeads+')\\b')));
  add(m,r.preferred,r.page,'Capitalization examples: '+r.preferred,'LCB lists '+r.preferred+' with this capitalization. A recognized demographic noun supplies the race/ethnicity context. Color descriptions, literal names and unfamiliar senses remain protected.',r.gpoPage);
 }
 for(const m of source.matchAll(/\bspanish(?=\s+(?:language|speakers|translation|translations|interpreters)\b)/gi)){
  establish(m,following(m,/^\s+(?:language|speakers|translation|translations|interpreters)\b/));
  add(m,'Spanish',20,'Capitalization examples: Spanish','LCB lists Spanish with a capital. This check requires an explicit language, translation or interpreter cue. Unfamiliar uses and literal titles remain protected.');
 }
 for(const m of source.matchAll(/\bdiabetes\b/gi)){
  establish(m,preceding(m,/\btype\s+I{1,2}\s+$/i),following(m,/^\s+(?:\(\s*)?type\s+I{1,2}\b/i));
  add(m,'diabetes',18,'Capitalization examples: diabetes','LCB lists diabetes with lowercase for type I or II; GPO 3.32 likewise lists diabetes as a lowercase disease. This occurrence supplies an explicit type I/II cue. The type identifier itself is preserved, as are named programs, literal source wording and unresolved meanings.',50,false,'Contextual name capitalization','3.32');
 }
 for(const m of source.matchAll(/\bbay\s+area\b/gi)){
  const after=source.slice(m.index+m[0].length),beforeRole=preceding(m,/\bthe\s+$/i),afterRole=following(m,/^\s+(?:is|was|has|shall|must|may|will|of|in|with|for|during|near|within)\b/);
  if(!beforeRole||!afterRole)continue;
  establish(m,{start:beforeRole.start,end:afterRole.end});
  if(/^\s+(?:of|in|with|for)\s+(?:the\s+)?[A-Z][a-z]+/.test(after))continue;
  add(m,'bay area',18,'Capitalization examples: Generic bay area','LCB lists bay area in lowercase. GPO also lists the generic bay area in lowercase, distinct from the complete San Francisco Bay name. An immediate the and a finite predicate or lowercase geographic/prepositional continuation identify this descriptive phrase; extended institutional names and literal wording remain protected.',63,true);
 }
 for(const m of source.matchAll(/\bsenator\b/gi)){
  establish(m,preceding(m,/\b(?:United\s+States|U\.?\s*S\.?)\s+$/i),following(m,/^\s+[A-Z][a-z]+(?:\s+[A-Z]\.)?\s+[A-Z][a-z]+(?:[-’'][A-Z]?[a-z]+)?\s+(?:shall|must|may|will|is|was|has|does)\b/));
  add(m,'Senator',19,'Capitalization examples: Qualified Senator title','LCB lists Senator with a capital. GPO agrees for a United States Senator or a senator immediately preceding a personal name. This check requires that country qualifier or a recognizable personal name and predicate; standalone state-senator case choices remain protected.',88);
 }
 for(const m of source.matchAll(/\bpeople(?=\s+(?:are|were|shall|must|may|will|who|whose|with|of)\b)/gi)){
  const beforeRole=preceding(m,/\b(?:two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\s+$/i),afterRole=following(m,/^\s+(?:are|were|shall|must|may|will|who|whose|with|of)\b/i);
  if(!beforeRole||!afterRole)continue;
  establish(m,{start:beforeRole.start,end:afterRole.end});
  add(m,'people',19,'Capitalization examples: people','LCB lists people in lowercase. An explicit numerical count and predicate/relative continuation identify the common noun. Legal party names, constitutional personifications, literal source wording and extended names remain protected.');
 }
 for(const m of source.matchAll(/\brepresentative\b/gi)){
  establish(m,preceding(m,/\b(?:United\s+States|U\.?\s*S\.?)\s+Congressional\s+$/i),following(m,/^\s+(?:of|in)\s+(?:the\s+)?(?:United\s+States|U\.?\s*S\.?)\s+(?:Congress|House\s+of\s+Representatives)\b/i));
  add(m,'Representative',19,'Capitalization examples: Representative of the United States Congress','LCB capitalizes Representative as a title of a member of the United States Congress. GPO lists Representative for that Congress as well. An explicit adjoining Congress or House name supplies the referent; generic agents and unresolved representatives remain protected.',86,true);
 }
 for(const m of source.matchAll(/\bcosumnes(?=\s+(?:River|College)\b)/gi)){
  establish(m,following(m,/^\s+(?:River|College)\b/));
  add(m,'Cosumnes',3,'Spelling examples: Cosumnes','LCB explicitly lists Cosumnes for River or College. This check requires that stated name head; unrelated uses and literal extended titles remain protected.');
 }
 for(const [pattern,preferred,page] of [[/\bUnited\s+States\s+Congress\b/gi,'United States Congress',18],[/\bCalifornia\s+Legislature\b/gi,'California Legislature',19]]){
  for(const m of source.matchAll(pattern))add(m,preferred,page,'Capitalization examples: Qualified body name','LCB lists the body name with this capital. This occurrence supplies the explicit country/state qualifier, identifying the complete name. Generic short forms, unresolved entities and literal source names remain protected.',undefined,true);
 }
 for(const [pattern,preferred] of [[/\bUnited\s+States\s+Constitution\b/gi,'United States Constitution'],[/\bConstitution\s+of\s+the\s+United\s+States\b/gi,'Constitution of the United States']]){
  for(const m of source.matchAll(pattern)){
   if(/^\s+(?:(?:of|for|the|and|in|on)\s+)?[A-Z][a-z]/.test(source.slice(m.index+m[0].length)))continue;
   add(m,preferred,18,'Capitalization examples: United States Constitution','LCB lists Constitution capitalized; GPO 3.40 agrees for the Constitution of the United States. The complete country name identifies this national document. Standalone short forms, state constitutions and literal extended names remain protected.',undefined,true);
  }
 }
 for(const m of source.matchAll(/\bconstitution\b/gi)){
  establish(m,preceding(m,/\bU\.?\s*S\.?\s+$/i));
  if(/^\s+(?:(?:of|for|the|and|in|on)\s+)?[A-Z][a-z]/.test(source.slice(m.index+m[0].length)))continue;
  add(m,'Constitution',18,'Capitalization examples: U.S. Constitution','LCB lists Constitution capitalized; GPO 3.40 agrees for the national United States Constitution. The explicit U.S. qualifier selects this referent; state and unresolved short forms remain protected.');
 }
 for(const m of source.matchAll(/\bexecutive\s+order\s+no\.(?=\s+\d+\b)/gi)){
  establish(m,following(m,/^\s+\d+\b/));
  if(/^\s+\d+\s+(?:(?:of|for|the|and|in|on)\s+)?[A-Z][a-z]/.test(source.slice(m.index+m[0].length)))continue;
  add(m,'Executive Order No.',19,'Capitalization examples: Numbered executive order title','LCB lists Executive Order No. 34 for state and federal usage; GPO 3.40 likewise capitalizes a numbered executive order title. A literal No. and number identify this title. Generic unnumbered executive orders remain lowercase.',undefined,true);
 }
 for(const m of source.matchAll(/\barmed\s+forces\b/gi)){
  establish(m,preceding(m,/\b(?:United\s+States|U\.?\s*S\.?)\s+$/i),following(m,/^\s+of\s+(?:the\s+)?(?:United\s+States\b|U\.?\s*S\.?(?=\s|[.;,]|$))/i));
  add(m,'Armed Forces',18,'Capitalization examples: Armed Forces','LCB capitalizes Armed Forces when referring to the U.S. military. The GPO examples agree for the overall U.S. Military Establishment. An adjoining U.S./United States qualifier supplies that referent.',61);
 }
 for(const m of source.matchAll(/\ballies\b|\ballied\s+force\b/gi)){
  const definite=preceding(m,/\bthe\s+$/i);if(!valid(definite))continue;
  const sentence=ctx.sentenceAt(m.index),text=source.slice(sentence.start,sentence.end),times=[...text.matchAll(/\b(?:during|in|of|from)\s+(?:World\s+Wars?\s+(?:II|I|2|1)|WWII|WWI|(?:First|Second)\s+World\s+War)\b/gi)];
  // An unrelated quoted report between the intact name and intact unquoted
  // time cue does not erase a historical referent. Both used pieces still
  // require literal-free evidence, and all intervening unknown/struck/table
  // content is rejected; preserve independent valid temporal alternatives.
  const timeRanges=times.map(t=>({start:sentence.start+t.index,end:sentence.start+t.index+t[0].length})).filter(valid);
  establish(m,...timeRanges.map(t=>({start:Math.min(definite.start,t.start),end:Math.max(definite.end,t.end),continuity:true})));
  const preferred=/^allies$/i.test(m[0])?'Allies':'Allied force';
  add(m,preferred,18,'Capitalization examples: World War I/II referent','LCB lists '+preferred+' for World War I and II. The definite article and an explicit unquoted historical-period relation in this sentence identify that use. Our allies, unfamiliar periods and extended titles remain protected.');
 }
 // LCB's explicit shared English-speaking form has more than one omitted
 // component. Correct the entire modifier, preserving the noun outside it.
 for(const m of source.matchAll(/(?<![\p{L}\p{N}\p{M}_])limited-?\s+and\s+non[\s-]+english[\s-]+speaking(?=(\s+(?:people|persons|residents|students|workers|applicants|children|adults|patients|households|families)(?![\p{L}\p{N}\p{M}_])))/giu)){
  const evidenceEnd=m.index+m[0].length+m[1].length;
  establish(m,{start:m.index,end:evidenceEnd});
  const wanted=/^[A-Z]/.test(m[0])?'Limited- and non-English-speaking':'limited- and non-English-speaking';
  if(m[0].replace(/-[ \t]*\n\s*/g,'-').replace(/\s+/g,' ')===wanted)continue;
  add(m,wanted,11,'Hyphenation examples: limited- and non-English-speaking','LCB explicitly lists limited- and non-English-speaking as a unit modifier. Retain the shared ending hyphen, capitalize English and hyphenate the complete non-English-speaking modifier before a recognized noun. The suggestion includes the whole modifier and preserves printed word divisions in its source selection. Complete original expression and noun evidence protects Unicode tokens, strikes including spaces, literals, tables and unknown excluded content; unfamiliar heads and independent predicates remain protected.',undefined,false,'Modifier hyphenation');
 }
 return issues;
}
