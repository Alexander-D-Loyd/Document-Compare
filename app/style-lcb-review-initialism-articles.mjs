import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {localInitialismExpansions,LOCAL_INITIALISM_SCOPE}from './style-local-initialisms.mjs';

export const LCB_INITIALISM_ARTICLE_REVIEW_SCOPE='Unknown explicitly dotted or hyphen-separated uppercase letter groups receive pronunciation review when their article differs from the first letter’s spoken sound. LCB2 item5 and GPO5.16–5.18 agree that pronunciation governs. Findings retain the whole article and initials, explain the conditional letter-by-letter form and assert no replacement. Existing precise article findings take precedence. Known word-pronounced acronyms, identifiers, structural labels, units, headings, tables, literals, strikes, damaged or unknown excluded evidence, and hard breaks within initials remain protected. Dotted spelling alone does not prove pronunciation. '+LOCAL_INITIALISM_SCOPE;
const letters='(?:[A-Z](?:\\.[ \\t]*[A-Z]){1,7}\\.?|[A-Z](?:[-\\u2010\\u2011][A-Z]){1,7})';
const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?<article>[Aa](?:n|N)?)\\s+(?<initials>'+letters+')(?![\\p{L}\\p{N}\\p{M}_-])','gu');
const solidPattern=/(?<![\p{L}\p{N}\p{M}_])(?<article>[Aa](?:n|N)?)\s+(?<initials>[A-Z]{2,10})(?![\p{L}\p{N}\p{M}_-])/gu;
const wordPronounced=new Set('NASA NATO FEMA UNESCO UNICEF OSHA NOAA SARS AIDS HUD SCUBA RADAR LASER'.split(' '));
const structural=/\b(?:parts?|subparts?|articles?|sections?|chapters?|paragraphs?|subparagraphs?|subdivisions?|schedules?|appendix|appendices|attachments?|exhibits?|classes?|categories?|groups?|grades?|types?|forms?|plans?|options?|vitamin|hepatitis|cal\s+grant)\s+$/i;
const unit=/^\s+(?:units?|measurements?|readings?|grades?|coordinates?|ranges?|intervals?|labels?|identifiers?)\b/i;
const overlaps=(rows,start,end)=>rows.some(r=>r.start<end&&r.end>start);

export function lcbInitialismArticleReviewIssues(doc,references,{existingIssues=[],includeLocalExpansions=true}={}){
 if(!references?.lcb?.pages?.[1]||!references?.gpo?.pages?.[107])return [];
 const ctx=styleContext(doc),source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),singleQuotes=[...source.matchAll(/‘[^’]*’|(?<![\p{L}\p{N}\p{M}_])'[^'\n]*'/gu)].map(m=>({start:m.index,end:m.index+m[0].length})),issues=[];
 const expansions=includeLocalExpansions?localInitialismExpansions(doc):[],candidates=[...[...source.matchAll(pattern)].map(m=>({m,witness:null})),...[...source.matchAll(solidPattern)].flatMap(m=>{const witness=[...expansions].reverse().find(r=>r.initials===m.groups.initials&&r.evidenceEnd<=m.index);return witness?[{m,witness}]:[]})];
 for(const {m,witness}of candidates){
  const start=m.index,end=start+m[0].length,initials=m.groups.initials,solid=initials.replace(/[^A-Z]/g,''),expected=/^[AEFHILMNORSX]/.test(solid)?'an':'a';
  if(m.groups.article.toLowerCase()===expected||wordPronounced.has(solid)||ctx.at(start)==='Heading'||blocked(start,end)||overlaps(singleQuotes,start,end)||overlaps(existingIssues,start,end)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end))continue;
  const before=source.slice(Math.max(0,start-120),start),after=source.slice(end,end+120);
  if(structural.test(before)||unit.test(after)||/[\\/@]/u.test(doc.text[start-1]||'')||/[\\/@-\uFFFD]/u.test(doc.text[end]||'')||/^\.*[\\/@\-\u2010\u2011\uFFFD]/u.test(after)||(witness?/^\.[A-Z0-9]/u.test(after):/^\s*(?:\.\s*[A-Z]|[-\u2010\u2011]\s*[A-Z0-9])/u.test(after)))continue;
  const block=doc.blocks.find(b=>b.start<=start&&b.end>=end),visibleLetters=block?.text.replace(/[^\p{L}]/gu,'');
  if(visibleLetters&&visibleLetters===visibleLetters.toUpperCase())continue;
  const original=doc.text.slice(start,end);
  // Unknown exclusions and line breaks may never manufacture separated-letter
  // evidence. Ordinary article-to-initials PDF wrapping remains permitted.
  if(doc.text.slice(end-initials.length,end).replace(/[\u2010-\u2015]/g,'-')!==initials||/[\r\n\uFFFD]/u.test(initials))continue;
  issues.push({start,end,text:original,suggestion:null,guideId:'lcb',guidePage:2,guidePrintedPage:String(references.lcb.pages[1].printedPage),rule:'Spelling and usage, item 5',category:'Initialism Article Review',context:ctx.at(start),confidence:'Review Suggested',reviewSuggested:true,reviewKind:'initialism-pronunciation',checkId:'lcb-initialism-article-review',conflict:false,matchesPrimary:false,pronunciationEvidence:{initials,firstLetter:solid[0],articleIfLettersSpoken:expected,proof:witness?'Earlier matching source expansion; pronunciation remains unconfirmed':'Explicitly separated uppercase letters; pronunciation remains unconfirmed',...(witness?{sourceExpansion:witness}:{})},message:'Review Suggested: Confirm how “'+initials+'” is pronounced here. If its letters are spoken individually, the first letter’s sound takes “'+expected+'”. LCB and GPO choose the article by sound, and a word-pronounced acronym can take a different article. '+(witness?'The earlier expansion supplies matching initial letters but does not establish pronunciation or legal scope.':'Punctuation alone does not establish pronunciation.')+' No replacement is asserted.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:2,guidePrintedPage:String(references.lcb.pages[1].printedPage),rule:'Spelling and usage, item 5',preferred:null,ruleText:'Use an before a group of initials when the first letter begins with a vowel sound.'},{guideId:'gpo',guideName:'GPO Style Manual',guidePage:108,guidePrintedPage:String(references.gpo.pages[107].printedPage),rule:'5.16–5.18',preferred:null,ruleText:'The article follows the vowel or consonant sound. GPO contrasts an H-U-D directive with a HUD directive and lists the spoken sounds of individual initial letters.'}]});
 }
 return issues;
}
