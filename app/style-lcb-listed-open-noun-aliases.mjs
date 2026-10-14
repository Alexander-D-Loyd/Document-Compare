import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {styleSingleQuoteRanges} from './style-single-quote-ranges.mjs';

export const LCB_LISTED_OPEN_NOUN_ALIAS_SCOPE='Five exact hyphen-boundary variants of printed LCB nouns are checked: bill-room, floor-plan, home-buyer, motor-home and school-year. An intact a/an/the/this/that/its/their/our/your article or determiner and an immediate selected complete nominal predicate establish the noun role. The selected predicates are is/was or modal be plus required/provided/retained/approved/reviewed/submitted/prepared/available/recorded/displayed/described/eligible/operative; home buyer additionally supports an eligible person/buyer predicate, motor home a vehicle predicate, and school year a begins/starts/ends plus named-month temporal predicate. Every complete article, noun, predicate and connecting source space is evidence. Only the noun is selected, using its exact printed open form. Unit modifiers such as school-year calendar and floor-plan review, unfamiliar predicates/meanings, proper or extended names, headings/tables, quoted bill-local words, technical identifiers, original quoted enclosures, source strikes/unknown exclusions and Unicode fragments remain protected. No new arbitrary compound, spelling or semantic interpretation is supplied.';
export const LCB_LISTED_OPEN_NOUN_ALIASES=[
 {variant:'bill-room',preferred:'bill room',page:9},
 {variant:'floor-plan',preferred:'floor plan',page:10},
 {variant:'home-buyer',preferred:'home buyer',page:11},
 {variant:'motor-home',preferred:'motor home',page:12},
 {variant:'school-year',preferred:'school year',page:13}
];
const forms=new Map(LCB_LISTED_OPEN_NOUN_ALIASES.map(r=>[r.variant,r]));
const pattern=/(?<![\p{L}\p{N}\p{M}_])(?:bill-room|floor-plan|home-buyer|motor-home|school-year)(?![\p{L}\p{N}\p{M}_])/gu;
const article=/\b(?:a|an|the|this|that|its|their|our|your)\s+$/iu;
const nominal=/^\s+(?:is|was|(?:shall|must|may|will)\s+be)\s+(?:required|provided|retained|approved|reviewed|submitted|prepared|available|recorded|displayed|described|eligible|operative)(?![\p{L}\p{N}\p{M}_])/u;
const person=/^\s+(?:is|was|(?:shall|must|may|will)\s+be)\s+(?:an?\s+)?(?:eligible\s+)?(?:person|buyer)(?![\p{L}\p{N}\p{M}_])/u;
const vehicle=/^\s+(?:is|was|(?:shall|must|may|will)\s+be)\s+(?:a|the)\s+vehicle(?![\p{L}\p{N}\p{M}_])/u;
const temporal=/^\s+(?:begins|starts|ends)\s+in\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)(?![\p{L}\p{N}\p{M}_])/u;
const stop=/^\s*(?:[.;!?)]|$)|^\s+(?:for|of|under|with|without|in|by|from|and|or|but|because|when|after|before)\b/u;
const attached=/[-\u2010-\u2015/:\\#@]/u;
export function lcbListedOpenNounAliasIssues(doc,references){
 const ctx=styleContext(doc),blocked=styleEvidenceGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),originalContext=originalBodyStyleContext(doc),original=originalContext?.source||ctx.source,singleQuotes=[...styleSingleQuoteRanges(ctx.source),...(originalContext?styleSingleQuoteRanges(original):[])],issues=[];
 for(const m of ctx.source.matchAll(pattern)){
  const r=forms.get(m[0]),start=m.index,end=start+m[0].length,before=ctx.source.slice(Math.max(0,start-180),start),a=article.exec(before);if(!a||!references?.lcb?.pages?.[r.page-1])continue;
  const evidenceStart=start-before.length+a.index,after=ctx.source.slice(end),p=nominal.exec(after)||(r.preferred==='home buyer'?person.exec(after):r.preferred==='motor home'?vehicle.exec(after):r.preferred==='school year'?temporal.exec(after):null);if(!p)continue;
  const predicateEnd=end+p[0].length,s=stop.exec(ctx.source.slice(predicateEnd));if(!s)continue;const evidenceEnd=predicateEnd+s[0].length;
  if(ctx.at(start)==='Heading'||cutsOriginalStyleWord(doc,evidenceStart)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||cutsOriginalStyleWord(doc,predicateEnd)||cutsOriginalStyleWord(doc,evidenceEnd)||blocked(evidenceStart,evidenceEnd)||originalContext?.literalAt(evidenceStart,evidenceEnd)||singleQuotes.some(q=>q.start<evidenceEnd&&q.end>evidenceStart))continue;
  const prefix=original.slice(Math.max(0,evidenceStart-180),evidenceStart),suffix=original.slice(predicateEnd),digestBoundary=ctx.at(start)==='Digest'&&/LEGISLATIVE\s+COUNSEL[’']S\s+DIGEST\s*$/iu.test(prefix);
  if(/[A-Z][\p{L}\p{M}’'-]*\s+$/u.test(prefix)&&!/[.!?]\s*$/u.test(prefix)&&!digestBoundary||/^\s+(?:(?:of|for|the|and|in|on)\s+){0,2}[A-Z][\p{L}\p{M}’'-]*/u.test(suffix)||attached.test(doc.text[start-1]||'')||attached.test(doc.text[end]||'')||/^\.\d/u.test(doc.text.slice(end))||attached.test(doc.text[evidenceStart-1]||''))continue;
  // Visible rhetorical dashes are not the source-listed hyphen boundary.
  if([...doc.text.slice(start,end)].some((c,n)=>/[\u2012-\u2015]/u.test(c)&&/\S/u.test(ctx.source[start+n])))continue;
  const issue={start,end,text:doc.text.slice(start,end),suggestion:r.preferred,evidenceStart,evidenceEnd,guideId:'lcb',guidePage:r.page,guidePrintedPage:references.lcb.pages[r.page-1].printedPage,rule:'Printed LCB noun: '+r.preferred,category:'Listed noun form',context:ctx.at(start),checkId:'lcb-listed-open-noun-aliases',reviewSuggested:false,conflict:false,openNounAliasEvidence:{evidenceStart,evidenceEnd,articleStart:evidenceStart,articleEnd:start,nounStart:start,nounEnd:end,predicateStart:end,predicateEnd,sourceText:doc.text.slice(evidenceStart,evidenceEnd),printedForm:r.preferred,sourcePage:r.page,role:'determiner plus selected complete nominal predicate'},message:'LCB page'+r.page+' prints “'+r.preferred+'”. This intact expression has an article/determiner and an immediate selected nominal predicate. Compare its printed open noun form; unit modifiers, unfamiliar meanings and named/literal forms remain protected.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:r.page,guidePrintedPage:references.lcb.pages[r.page-1].printedPage,rule:'Printed LCB noun: '+r.preferred,preferred:r.preferred,ruleText:r.preferred}]};
  if(!quoted(issue))issues.push(issue);
 }
 return issues;
}
export function restoreListedOpenNounAliasEvidence(issue,toSource,sourceText){
 const e=issue.openNounAliasEvidence;if(!e)return issue;const restored={...e};for(const key of ['evidenceStart','articleStart','nounStart','predicateStart'])restored[key]=toSource(e[key]);for(const key of ['evidenceEnd','articleEnd','nounEnd','predicateEnd'])restored[key]=toSource(e[key],true);
 if(typeof sourceText==='string')restored.sourceText=sourceText.slice(restored.evidenceStart,restored.evidenceEnd);
 return {...issue,evidenceStart:restored.evidenceStart,evidenceEnd:restored.evidenceEnd,openNounAliasEvidence:restored};
}
