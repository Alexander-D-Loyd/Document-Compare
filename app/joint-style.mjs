import {authorityPreferenceIssues}from './offline-authority.mjs';
import {mixedCountListReviewIssues,restoreMixedCountListEvidence}from './style-mixed-count-lists.mjs';
import {internalBillReferenceIssues}from './style-internal-bill-references.mjs';
import {consolidateStyleFindings}from './finding-presentation.mjs';
import {coordinatedNumberRelationReviewIssues,restoreCountCoordinationEvidence}from './style-coordinated-number-relations.mjs';
import {postnominalCompoundIssues,restorePostnominalEvidence}from './style-postnominal-compounds.mjs';
import {parsedPredicateCompoundIssues,restorePredicateCompoundEvidence}from './style-parsed-predicate-compounds.mjs';
import {listedOpenNounModifier,restoreNounSequenceEvidence,isNounPrefixReview}from './offline-noun-sequences.mjs';
import {createdEntityNameConsistencyIssues,restoreCreatedEntityNameEvidence}from './style-created-entity-name-consistency.mjs';
import {createdTitleNameConsistencyIssues}from './style-created-title-name-consistency.mjs';
import {decimalOpeningReviewIssues}from './style-decimal-openings.mjs';
import {fractionOpeningReviewIssues}from './style-fraction-openings.mjs';
import {largeIntegerOpeningReviewIssues,LARGE_OPENING_MERGE_CHECK_IDS}from './style-large-integer-openings.mjs';
import {integerOpeningReviewIssues,ORDINARY_OPENING_MERGE_CHECK_IDS}from './style-integer-opening-review.mjs';
import {officialHeadTitleReviewIssues,restoreOfficialHeadEvidence}from './style-official-head-titles.mjs';
import {createdPublicEntityCreationIssues,createdPublicEntityReferenceIssues,createdPublicEntityProtectionRanges}from './style-created-public-entities.mjs';
import {phrasalInflectionIssues} from './style-phrasal-inflections.mjs';
import {nominalPluralIssues} from './style-nominal-plurals.mjs';
import {largeOrdinalIssues} from './style-large-ordinals.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
import {OFFLINE_MODIFIERS,GENERAL_MODIFIER_REVIEW_RULE}from './offline-rules.mjs';
import {lcbSemanticReviewIssues}from './style-lcb-review-meanings.mjs';
import {lcbUnknownMoneyReviewIssues}from './style-lcb-review-money-context.mjs';
import {lcbNumberRelationReviewIssues}from './style-lcb-review-number-relations.mjs';
import {parsedNumberRelationReviewIssues}from './style-parsed-number-relations.mjs';
import {repeatedCountPhraseReviewIssues,restoreRepeatedCountEvidence}from './style-repeated-count-phrases.mjs';
import {lcbReferenceChainIssues,lcbReferenceIdentityProtectionRanges,lcbConstitutionalReferenceReviewIssues,lcbStructuralReferenceReviewIssues,lcbCoordinatedReferenceReviewIssues}from './style-lcb-review-reference-chains.mjs';
import {lcbTableCellIssues}from './style-lcb-review-table-cells.mjs';
import {lcbUnfamiliarSeriesReviewIssues}from './style-lcb-review-series-punctuation.mjs';
import {introducedSeriesReviewIssues,restoreIntroducedSeriesEvidence}from './style-introduced-series-review.mjs';
import {lcbEntityIdentityReviewIssues}from './style-lcb-review-entity-identity.mjs';
import {lcbCreatedOfficialTitleReviewIssues,lcbCreatedOfficialTitleProtectionRanges}from './style-lcb-review-created-titles.mjs';
import {lcbCreatedTitleReferenceReviewIssues,lcbCreatedTitleReferenceProtectionRanges}from './style-lcb-review-title-references.mjs';
import {lcbCreatedTitleIdentityReviewIssues,lcbCreatedTitleIdentityProtectionRanges}from './style-lcb-review-created-title-identity.mjs';
import {designatedTitleCreationIssues,designatedTitleReferenceIssues,designatedTitleProtectionRanges}from './style-designated-titles.mjs';
import {lcbSuffixBoundaryReviewIssues}from './style-lcb-review-affix-boundaries.mjs';
import {lcbInitialismArticleReviewIssues}from './style-lcb-review-initialism-articles.mjs';
import {lcbFreshDefinitionQuoteReviewIssues}from './style-lcb-review-quote-ownership.mjs';
import {freshDefinitionTermIssues}from './style-fresh-definition-terms.mjs';
import {timePossessiveReviewIssues,restoreTimePossessiveEvidence}from './style-time-possessive-review.mjs';
import {groupedSemicolonReviewIssues,restoreGroupedSeriesEvidence}from './style-grouped-semicolon-review.mjs';
import {entryModifierIssues} from './style-entry-modifiers.mjs';
import {compoundCardinalIssues} from './style-compound-cardinals.mjs';
import {localOfficeIssues} from './style-local-offices.mjs';
import {finalLcbContextIssues} from './style-lcb-final-contexts.mjs';
import {merriamSpellingIssues} from './style-merriam-spellings.mjs';
import {californiaEntityReview} from './style-california-entities.mjs';
import {constitutionalStateIssues,constitutionalBudgetIssues} from './style-constitutional-context.mjs';
import {corporationLetterIssues} from './style-corporation-letters.mjs';
import {contextualNameIssues} from './style-lcb-contextual-names.mjs';
import {lcbExpressionIssues} from './style-lcb-expressions.mjs';
import {lcbPrefixIssues} from './style-lcb-prefixes.mjs';
import {semicolonSeriesIssues} from './style-semicolon-series.mjs';
import {phrasalVerbIssues} from './style-phrasal-verbs.mjs';
import {gpoNominalIssues} from './style-gpo-nominals.mjs';
import {metricDefinitionIssues} from './style-metric-definitions.mjs';
import {openingMeasureIssues} from './style-opening-measures.mjs';
import {numberArticleIssues} from './style-number-articles.mjs';
import {suffixSpellingIssues} from './style-suffix-spelling.mjs';
import {lcbRoleFormIssues} from './style-lcb-role-forms.mjs';
import {inProportionIssues} from './style-in-proportions.mjs';
import {contractionIssues} from './style-contractions.mjs';
import {lcbSpellingIssues} from './style-lcb-spellings.mjs';
import {participleModifierIssues} from './style-participle-modifiers.mjs';
import {sharedModifierIssues} from './style-shared-modifiers.mjs';
import {serialCommaIssues} from './style-serial-commas.mjs';
import {reflexivePronounIssues} from './style-reflexive-pronouns.mjs';
import {STYLE_RULES,stylisticIssues} from './gpo-style.mjs';
import {guideById} from './style-guides.mjs';
import {numeralIssues} from './style-numerals.mjs';
import {contextualPunctuationIssues} from './style-punctuation.mjs';
import {lcbContextualIssues} from './lcb-contextual.mjs';
import {moneyFormIssues} from './style-money-forms.mjs';
import {monetaryPairIssues} from './style-money.mjs';
import {fractionIssues} from './style-fractions.mjs';
import {compoundIssues} from './style-compounds.mjs';
import {officeTitleIssues} from './style-office-titles.mjs';
import {wordChoiceIssues} from './style-word-choice.mjs';
import {ratioIssues} from './style-ratios.mjs';
import {referenceIssues} from './style-references.mjs';
import {measurementIssues} from './style-measures.mjs';
import {capitalizationIssues} from './style-capitalization.mjs';
import {calendarIssues} from './style-calendar.mjs';
import {verbEndingIssues} from './style-verb-endings.mjs';
import {styleSource,styleContext,withStyleContext} from './style-context.mjs';
import {sourceNameRanges} from './style-source-names.mjs';
import {listedNounIssues} from './style-listed-nouns.mjs';
import {tableFigureIssues} from './style-table-figures.mjs';
import {compoundPluralIssues} from './style-compound-plurals.mjs';
import {geologicNameIssues} from './style-geologic-names.mjs';
import {modifierPositionIssues} from './style-modifier-positions.mjs';
import {editorialNotationIssues} from './style-editorial-notation.mjs';
import {symbolIssues} from './style-symbols.mjs';
import {quantitySeparatorIssues} from './style-quantity-separators.mjs';
import {calendarAbbreviationIssues} from './style-calendar-abbreviations.mjs';
const fold=s=>s.normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim();
const sourceText=styleSource;
export function lcbRules(reference){
  const rules=[];
  for(const rule of STYLE_RULES.filter(r=>r.category==='Preferred spelling')){
    const page=reference.pages.slice(2,5).find(p=>p.text.split('\n').some(line=>line.trim().toLowerCase()===rule.preferred.toLowerCase()||line.trim().toLowerCase().startsWith(rule.preferred.toLowerCase()+' (')));
    if(page)rules.push({...rule,rule:'Spelling examples',guidePage:page.page,message:'Compare this spelling with LCB’s office style.'});
  }
  const add=(variant,preferred,rule,guidePage,category='Compounding',message='Compare this form with LCB’s listed office style.')=>rules.push({variant,preferred,rule,guidePage,category,message});
  for(const [variant,preferred] of [['advisor','adviser'],['advisors','advisers'],['judgement','judgment'],['judgements','judgments'],['marshall','marshal'],['monies','moneys'],['wilful','willful'],['an historical','a historical']]){
    add(variant,preferred,'Spelling and usage',2,'Preferred spelling');
    if(['advisors','judgements'].includes(variant))rules.at(-1).protectFormalNameTail=true;
  }
  for(const [variant,preferred,page] of [
    ['mobile home','mobilehome',12],['mobile homes','mobilehomes',4],['healthcare','health care',11],
    ['by-laws','bylaws',9],['co-payment','copayment',10],['co-worker','coworker',10],['data base','database',10],
    ['day care','daycare',10],['down payment','downpayment',10],['high rise','highrise',11],
    ['non-profit','nonprofit',12],
    ['on-going','ongoing',12],['post-secondary','postsecondary',13],['record keeping','recordkeeping',13],
    ['school bus','schoolbus',13],['school buses','schoolbuses',13],['seat belt','seatbelt',13],['seat belts','seatbelts',13],
    ['sewer line','sewerline',13],['time frame','timeframe',13],['time line','timeline',13],['web site','website',14],
    ['work force','workforce',14],['year end','yearend',14],['license holder','licenseholder',15],
    ['permit holder','permitholder',15],['decision maker','decisionmaker',15],['policy maker','policymaker',15],
    ['off-site','offsite',15],['on-site','onsite',15],['ground water','groundwater',15],
    ['storm water','stormwater',15],['waste water','wastewater',15],['state-wide','statewide',15],['county-wide','countywide',15]
  ])add(variant,preferred,'Hyphenation examples',page);
  for(const [variant,preferred] of [['don’t','do not'],["don't",'do not'],['doesn’t','does not'],["doesn't",'does not'],['isn’t','is not'],["isn't",'is not'],['aren’t','are not'],["aren't",'are not'],['can’t','cannot'],["can't",'cannot'],['won’t','will not'],["won't",'will not']])add(variant,preferred,'Spelling and usage, item 3',2,'Contractions','LCB does not use contractions; confirm the wording in context.');
  add('and/or','or','Spelling and usage, item 4',2,'Usage','LCB uses “x or y” instead of “and/or”; confirm the intended alternatives.');
  const contractions=[['couldn’t','could not'],['shouldn’t','should not'],['wouldn’t','would not'],['mustn’t','must not'],['hasn’t','has not'],['haven’t','have not'],['hadn’t','had not'],['wasn’t','was not'],['weren’t','were not'],['didn’t','did not'],['needn’t','need not'],['mightn’t','might not'],['you’re','you are'],['we’re','we are'],['they’re','they are'],['I’m','I am'],['I’ve','I have'],['you’ve','you have'],['we’ve','we have'],['they’ve','they have'],['could’ve','could have'],['should’ve','should have'],['would’ve','would have'],['must’ve','must have'],['I’ll','I will'],['you’ll','you will'],['we’ll','we will'],['they’ll','they will'],['it’ll','it will'],['let’s','let us']];
  for(const [variant,preferred] of contractions)for(const apostrophe of ['’',"'"])add(variant.replace('’',apostrophe),preferred,'Spelling and usage, item 3',2,'Contractions','LCB does not use contractions; expand the wording.');
  for(const name of ['Vehicle Code','Education Code','Government Code','Civil Code','Penal Code','Insurance Code','Health and Safety Code','Welfare and Institutions Code','Public Resources Code','Code of Civil Procedure'])rules.push({variant:name.toLowerCase(),preferred:name,rule:'Capitalization, item 2',guidePage:17,category:'Capitalization',caseSensitive:true,message:'LCB capitalizes official titles of codes; confirm this refers to the official title.'});
  return rules;
}
const ruleText=(reference,rule,page)=>{
  const record=reference.pages[page-1];if(!record)return '';
  if(reference.title.startsWith('GPO')){
    const source=record.flowText||record.text;const start=source.indexOf(rule+'.');
    if(start>=0){const text=source.slice(start),next=text.slice(rule.length+1).search(/\n\s*\d+\.\d+\.\s/);return text.slice(0,next>=0?rule.length+1+next:850).replace(/\s+/g,' ').trim();}
  }
  return record.text.replace(/\s+/g,' ').trim().slice(0,850);
};
const citation=(id,rule,page,preferred,text,reference)=>({guideId:id,guideName:guideById(id).name,rule,guidePage:page,guidePrintedPage:reference.pages[page-1].printedPage,preferred,ruleText:text||ruleText(reference,rule,page)});
export function jointStylisticIssues(doc,references,{engineIssues=[],includeReviewSuggestions=false,includeDefinitionReview=true,includeLexicalSuffixReview=true,includeLocalInitialismReview=true,includeCreatedPublicEntities=true,includeOfficialHeadReview=true,includeNounSequenceReview=true,includeQualifiedNounPrefixReview=true,includeParsedPredicateReview=true,includeProductiveLikeReview=true,includeCreatedEntityNameReview=true,includeCreatedTitleNameReview=true,includeDecimalOpeningReview=true,includeFractionOpeningReview=true,includeLargeIntegerOpeningReview=true,includeIntegerOpeningReview=true,authority=null}={}){
  const view=styleWordDivisionView(doc,{preserveRemainingWords:true}),reviewDoc=view?.doc||doc;
  const candidates=view?engineIssues.map(i=>({...mapReviewEvidence(i,view.toView,reviewDoc.text),start:view.toView(i.start),end:view.toView(i.end)})):engineIssues;
  const issues=withStyleContext(reviewDoc,()=>reviewStylisticIssues(reviewDoc,references,candidates,includeReviewSuggestions,includeDefinitionReview,includeLexicalSuffixReview,includeLocalInitialismReview,includeCreatedPublicEntities,includeOfficialHeadReview,includeNounSequenceReview,includeQualifiedNounPrefixReview,includeParsedPredicateReview,includeProductiveLikeReview,includeCreatedEntityNameReview,includeCreatedTitleNameReview,includeDecimalOpeningReview,includeFractionOpeningReview,includeLargeIntegerOpeningReview,includeIntegerOpeningReview,authority));
  return consolidateStyleFindings(view?view.restore(issues.map(i=>mapReviewEvidence(i,view.toSource,doc.text))):issues);
}
function mapReviewEvidence(issue,map,text=null){
 const result={...issue};
 if(Number.isInteger(issue.evidenceStart))result.evidenceStart=map(issue.evidenceStart);
 if(Number.isInteger(issue.sentenceEvidenceStart))result.sentenceEvidenceStart=map(issue.sentenceEvidenceStart);
 if(Number.isInteger(issue.sentenceEvidenceEnd))result.sentenceEvidenceEnd=map(issue.sentenceEvidenceEnd,true);
 if(Number.isInteger(issue.evidenceEnd))result.evidenceEnd=map(issue.evidenceEnd,true);
 if(typeof issue.openingClauseText==='string'&&text!==null&&Number.isInteger(result.evidenceStart)&&Number.isInteger(result.evidenceEnd))result.openingClauseText=text.slice(result.evidenceStart,result.evidenceEnd);
 if(issue.quantitySeparatorEvidence){const e=issue.quantitySeparatorEvidence,start=map(e.start),end=map(e.end,true);result.quantitySeparatorEvidence={...e,start,end,...(text!==null?{text:text.slice(start,end)}:{})};}
 if(issue.sectionContext)result.sectionContext={...issue.sectionContext,start:map(issue.sectionContext.start),end:map(issue.sectionContext.end,true)};
 if(issue.relationshipEvidence)result.relationshipEvidence={...issue.relationshipEvidence,start:map(issue.relationshipEvidence.start),end:map(issue.relationshipEvidence.end,true),members:issue.relationshipEvidence.members.map(m=>{const start=map(m.start),end=map(m.end,true);return {...m,start,end,...(Number.isInteger(m.headStart)?{headStart:map(m.headStart),headEnd:map(m.headEnd,true)}:{}),...(m.sourceText!==undefined&&text!==null?{sourceText:text.slice(start,end)}:{})};})};
 if(issue.coordinationEvidence&&text!==null)result.coordinationEvidence=restoreCountCoordinationEvidence(issue.coordinationEvidence,map,text);
 if(issue.mixedCountListEvidence&&text!==null)result.mixedCountListEvidence=restoreMixedCountListEvidence(issue.mixedCountListEvidence,map,text);
 if(issue.quoteEvidence){const q=issue.quoteEvidence,verbStart=map(q.definitionVerb.start),verbEnd=map(q.definitionVerb.end,true);result.quoteEvidence={...q,punctuationStart:map(q.punctuationStart),punctuationEnd:map(q.punctuationEnd,true),evidenceStart:map(q.evidenceStart),evidenceEnd:map(q.evidenceEnd,true),definitionVerb:{...q.definitionVerb,start:verbStart,end:verbEnd,...(text!==null?{text:text.slice(verbStart,verbEnd)}:{})}};}
 if(issue.timePossessiveEvidence&&text!==null)result.timePossessiveEvidence=restoreTimePossessiveEvidence(issue.timePossessiveEvidence,map,text);
 if(issue.groupedSeriesEvidence&&text!==null)result.groupedSeriesEvidence=restoreGroupedSeriesEvidence(issue.groupedSeriesEvidence,map,text);
 if(issue.introducedSeriesEvidence&&text!==null)result.introducedSeriesEvidence=restoreIntroducedSeriesEvidence(issue.introducedSeriesEvidence,map,text);
 if(issue.repeatedCountEvidence&&text!==null)result.repeatedCountEvidence=restoreRepeatedCountEvidence(issue.repeatedCountEvidence,map,text);
 if(issue.predicateRoleEvidence&&text!==null)result.predicateRoleEvidence=restorePredicateCompoundEvidence(issue.predicateRoleEvidence,map,text);
 if(issue.postnominalRoleEvidence&&text!==null)result.postnominalRoleEvidence=restorePostnominalEvidence(issue.postnominalRoleEvidence,map,text);
 if(issue.nounRoleEvidence)result.nounRoleEvidence=restoreNounSequenceEvidence(issue.nounRoleEvidence,map,text);
 if(issue.entityNameEvidence)result.entityNameEvidence=restoreCreatedEntityNameEvidence(issue.entityNameEvidence,map,text);
 if(issue.officialHeadEvidence&&text!==null)result.officialHeadEvidence=restoreOfficialHeadEvidence(issue.officialHeadEvidence,map,text);
 if(issue.titleWitness){const w=issue.titleWitness,start=map(w.start),end=map(w.end,true),evidenceStart=map(w.evidenceStart),evidenceEnd=map(w.evidenceEnd,true);result.titleWitness={...w,start,end,evidenceStart,evidenceEnd,...(text!==null?{text:text.slice(start,end),declarationText:text.slice(evidenceStart,evidenceEnd)}:{})};}
 if(issue.titleCaseEvidence)result.titleCaseEvidence=issue.titleCaseEvidence.map(c=>({...c,start:map(c.start),end:map(c.end,true)}));
 if(issue.titleIdentityEvidence){const c=issue.titleIdentityEvidence,start=map(c.start),end=map(c.end,true);result.titleIdentityEvidence={...c,start,end,...(text!==null?{sourceText:text.slice(start,end)}:{})};}
  if(issue.definitionEvidence){const e=issue.definitionEvidence,start=map(e.start),end=map(e.end,true),evidenceStart=map(e.evidenceStart),evidenceEnd=map(e.evidenceEnd,true),verbStart=map(e.definitionVerb.start),verbEnd=map(e.definitionVerb.end,true);result.definitionEvidence={...e,start,end,quoteStart:map(e.quoteStart),quoteEnd:map(e.quoteEnd,true),evidenceStart,evidenceEnd,...(text!==null?{text:text.slice(start,end),clauseText:text.slice(evidenceStart,evidenceEnd)}:{}),definitionVerb:{...e.definitionVerb,start:verbStart,end:verbEnd,...(text!==null?{text:text.slice(verbStart,verbEnd)}:{})}};}
  if(issue.pronunciationEvidence?.sourceExpansion){const e=issue.pronunciationEvidence.sourceExpansion,start=map(e.start),end=map(e.end,true),evidenceStart=map(e.evidenceStart),evidenceEnd=map(e.evidenceEnd,true);result.pronunciationEvidence={...issue.pronunciationEvidence,sourceExpansion:{...e,start,end,evidenceStart,evidenceEnd,...(text!==null?{text:text.slice(start,end),clauseText:text.slice(evidenceStart,evidenceEnd)}:{})}};}
 if(issue.sourceWordDivisions)result.sourceWordDivisions=issue.sourceWordDivisions.map(w=>({...w,start:map(w.start),end:map(w.end,true),spans:w.spans.map(s=>({...s,start:map(s.start),end:map(s.end,true)}))}));
 return result;
}
function reviewStylisticIssues(doc,references,engineIssues=[],includeReviewSuggestions=false,includeDefinitionReview=true,includeLexicalSuffixReview=true,includeLocalInitialismReview=true,includeCreatedPublicEntities=true,includeOfficialHeadReview=true,includeNounSequenceReview=true,includeQualifiedNounPrefixReview=true,includeParsedPredicateReview=true,includeProductiveLikeReview=true,includeCreatedEntityNameReview=true,includeCreatedTitleNameReview=true,includeDecimalOpeningReview=true,includeFractionOpeningReview=true,includeLargeIntegerOpeningReview=true,includeIntegerOpeningReview=true,authority=null){
  const combined=[],ignoredConflictRanges=[];
  for(const id of ['lcb','gpo']){
    const reference=references[id],issues=id==='gpo'?stylisticIssues(doc,reference):stylisticIssues(doc,reference,lcbRules(reference),{dynamic:false});
    for(const issue of issues){
      const cite=citation(id,issue.rule,issue.guidePage,issue.suggestion,null,reference);
      const existing=combined.find(i=>i.start===issue.start&&i.end===issue.end);
      if(existing){existing.references.push(cite);continue;}
      combined.push({...issue,guideId:id,references:[cite],conflict:false});
    }
  }
  const source=sourceText(doc),protectedRanges=[...styleContext(doc).literalRanges,...doc.struck,...doc.blocks.filter(b=>b.ignored).map(b=>({start:b.start,end:b.end}))];
  // Noun + participle directly modifying a following noun. Keep the noun
  // context explicit so ordinary references to "data sharing" stay accepted.
  for(const match of source.matchAll(/\bdata\s+sharing(?=\s+agreements?\b)/gi)){
    const start=match.index,end=start+match[0].length;if(protectedRanges.some(r=>r.start<end&&r.end>start))continue;
    const text=fold(match[0]),suggestion=text.replace(/\s+/g,'-');
    const cites=[citation('lcb','Hyphenation, item 1',8,suggestion,'LCB generally hyphenates words forming a unit modifier immediately before the word modified, especially when an element is a present or past participle.',references.lcb),citation('gpo','6.15',114,suggestion,'GPO 6.15 generally hyphenates the words in a unit modifier immediately preceding the word modified.',references.gpo)];
    combined.push({start,end,text,suggestion,guideId:'lcb',guidePage:8,guidePrintedPage:'8',rule:cites[0].rule,category:'Modifier hyphenation',references:cites,conflict:false,message:'“Data sharing” modifies “agreement”; LCB recommends “data-sharing” in this position.'});
  }
  for(const issue of combined.filter(i=>i.guideId==='gpo')){
    const shared={'6.20':['Hyphenation, item 3',8,'LCB says not to hyphenate an adjective phrase containing an adverb ending in -ly.'],'6.34':['Hyphenation, item 5',8,'LCB lists ex-, quasi-, and self- as exceptions to its general rule against prefix hyphens.'],'6.15':['Hyphenation, item 1',8,'LCB generally hyphenates a unit modifier immediately before the word modified.']}[issue.rule];
    if(shared){issue.references.unshift(citation('lcb',shared[0],shared[1],issue.suggestion,shared[2],references.lcb));issue.guideId='lcb';issue.rule=shared[0];issue.guidePage=shared[1];issue.guidePrintedPage=String(shared[1]);issue.message='LCB and GPO agree on this form; LCB is the primary reference.';}
  }
  const conflicts=[
    {pattern:/\bcentral\s+valley\b/gi,lcb:'central valley',gpo:'Central Valley',lcbRule:'Capitalization examples: central valley',lcbPage:18,gpoRule:'3.22',gpoPage:47,lcbText:'LCB lists central valley in lowercase.',gpoText:'GPO 3.22 capitalizes a descriptive term denoting a definite region. This conflicts with the LCB form when referring to California’s Central Valley.',skip:(m,s)=>!/^\s+of\s+California\b/i.test(s.slice(m.index+m[0].length))&&!/\bCalifornia(?:’s|\x27s)\s+$/i.test(s.slice(Math.max(0,m.index-25),m.index))},
    {pattern:/\bsubchapter\s+(?:\d+(?:\.\d+)*|[IVX]+)\b/gi,lcb:'Subchapter',gpo:'subchapter',lcbRule:'Capitalization examples: Numbered Subchapter',lcbPage:20,gpoRule:'3.10',gpoPage:43,lcbText:'LCB capitalizes a numbered Subchapter in California regulations and federal usage.',gpoText:'GPO 3.10 lowercases common nouns used with a number merely for reference. The generic numbered-reference capitalization choice is excluded.',skip:(m,s)=>!/(?:California\s+Code\s+of\s+Regulations|Cal\.\s+Code\s+Regs\.|Code\s+of\s+Federal\s+Regulations|C\.?F\.?R\.?).{0,50}$/i.test(s.slice(Math.max(0,m.index-120),m.index))&&!/^\s+of\s+(?:the\s+)?(?:California\s+Code\s+of\s+Regulations|Code\s+of\s+Federal\s+Regulations)\b/i.test(s.slice(m.index+m[0].length))},
    {pattern:/\b\d{4}\s*-\s*\d{2,4}\s+regular\s+session(?:\s+of\s+the\s+Legislature)?\b/gi,lcb:'Regular Session',gpo:'regular session',lcbRule:'Capitalization examples: Regular Session with year',lcbPage:19,gpoRule:'3.10',gpoPage:43,lcbText:'LCB capitalizes Regular Session when a year is given; page 22 supplies dated examples.',gpoText:'GPO 3.10 lowercases a common noun used with a date merely to denote time. This generic dated-session capitalization choice is excluded; official quoted titles remain protected.'},
    {pattern:/\bstate\s+government\b/gi,lcb:'state government',gpo:'State government',lcbRule:'Capitalization examples: state government',lcbPage:20,gpoRule:'3.20 / Capitalization examples',gpoPage:89,lcbText:'LCB explicitly lists state government in lowercase.',gpoText:'GPO lists State government for a State political division; LCB and GPO differ on that initial capital. This choice is excluded under the user policy.'},
    {pattern:/\bbefore[\s-]+and[\s-]+after[\s-]+school(?=\s+(?:programs?|services?|care|activities|instruction)\b)/gi,lcb:'before and after school',gpo:'before- and after-school',lcbRule:'Hyphenation examples: before and after school (u.m.)',lcbPage:9,gpoRule:'6.15 / 6.23',gpoPage:117,lcbText:'LCB explicitly lists before and after school as an open unit modifier.',gpoText:'GPO 6.15 hyphenates unit modifiers and 6.23 retains the shared-element hyphen in coordinated compounds. The resulting hyphenated modifier differs from the explicit LCB open form.'},
    {pattern:/\b(?:(?:California|state)\s+(?:secretary\s+of\s+state|attorney\s+general)|(?:secretary\s+of\s+state|attorney\s+general)\s+of\s+(?:the\s+state\s+of\s+)?California|(?:secretary\s+of\s+state|attorney\s+general)\s+(?:in|of)\s+(?:that|this|each|the)\s+state)\b/gi,lcb:'Secretary of State / Attorney General',gpo:'secretary of state / attorney general',lcbRule:'Capitalization examples: State officers',lcbPage:19,gpoRule:'3.37',gpoPage:52,lcbText:'LCB lists Secretary of State (page 19) and Attorney General (page 18) capitalized for these office titles.',gpoText:'GPO 3.37 explicitly leaves secretary of state of Idaho and attorney general of Maine lowercase, unlike the federal Secretary of State. The state-office choice differs from LCB.',skip:(m,s)=>/^\s+(?:(?:Mr|Ms|Dr)\.\s+)?[A-Z][a-z]+\s+[A-Z][a-z]+/.test(s.slice(m.index+m[0].length))},
    {pattern:/\bhorse[\s-]*races?\b/gi,lcb:'horse race',gpo:'horserace',lcbRule:'Hyphenation examples',lcbPage:11,gpoRule:'7. Compounding Examples',gpoPage:159,lcbText:'LCB lists horse race (all forms) as separate words.',gpoText:'The physical GPO compounding column lists horse followed by race without a hyphen or open-space marker, giving horserace.'},
    {pattern:/\bfederal\s+government\b/gi,lcb:'federal government',gpo:'Federal Government',lcbRule:'Capitalization examples',lcbPage:19,gpoRule:'3.20',gpoPage:46,lcbText:'LCB lists “federal government” in lowercase. Item 4 on page 17 also says not to capitalize descriptive “federal” unless part of an act or law title.',gpoText:'GPO 3.20 lists “Federal, Federal Government” when referring specifically to the United States government.',skip:(m,s)=>m[0]===m[0].toUpperCase()||/^\s+(?:Act|Code|Law)\b/.test(s.slice(m.index+m[0].length))},
    {pattern:/\bhealth[\s-]*care\b/gi,lcb:'health care',gpo:'healthcare',lcbRule:'Hyphenation examples',lcbPage:11,gpoRule:'7. Compounding Examples',gpoPage:157,lcbText:'LCB lists “health care” as two words.',gpoText:'GPO’s compounding list on printed page 143 lists “healthcare” as one word.'},
    {pattern:/\bAfrican[\s-]+American(?=\s+program\b)/gi,lcb:'African American',gpo:'African-American',lcbRule:'Hyphenation examples',lcbPage:9,gpoRule:'6.21',gpoPage:116,lcbText:'LCB lists “African American” without a hyphen.',gpoText:'GPO 6.21 gives “African-American program” as a hyphenated modifier.'},
    {pattern:/\bcollective[\s-]+bargaining(?=\s+(?:talks|agreements?|process|rights|units?)\b)/gi,lcb:'collective bargaining',gpo:'collective-bargaining',lcbRule:'Hyphenation examples',lcbPage:9,gpoRule:'6.15',gpoPage:114,lcbText:'LCB lists “collective bargaining (n., u.m.)” without a hyphen in either noun or unit-modifier position.',gpoText:'GPO 6.15 gives “collective-bargaining talks” as a hyphenated modifier before a noun.'},
    {pattern:/(?<![\p{L}\p{N}\p{M}_])ground[\s-]*waters?(?![\p{L}\p{N}\p{M}_])/giu,lcb:'groundwater',gpo:'ground water',lcbRule:'End words: water',lcbPage:15,gpoRule:'7. Compounding Examples',gpoPage:154,lcbText:'LCB’s end-word examples list “groundwater” as one word.',gpoText:'GPO printed page 140 lists ground with #water; the # marks the space in “ground water”.'},
    {pattern:/(?<![\p{L}\p{N}\p{M}_])wild[\s-]*lands?(?![\p{L}\p{N}\p{M}_])/giu,lcb:'wildland',gpo:'wild land',lcbRule:'End words: land',lcbPage:15,gpoRule:'7. Compounding Examples',gpoPage:204,lcbText:'LCB’s end-word examples list “wildland” as one word.',gpoText:'GPO printed page 190 lists wild with #land; the # marks the space in “wild land”.'}
  ];
  for(const conflict of conflicts)for(const match of source.matchAll(conflict.pattern)){
    const start=match.index,end=start+match[0].length;
    if(protectedRanges.some(r=>r.start<end&&r.end>start)||conflict.skip?.(match,source))continue;
    ignoredConflictRanges.push({start,end});
    const text=fold(match[0]),forms=conflict.forms?.(match)||conflict;
    let preferred=forms.lcb;if(/^[A-Z]/.test(text)&&!['federal government'].includes(preferred))preferred=preferred[0].toUpperCase()+preferred.slice(1);
    const matchesPrimary=text===preferred||text.toLowerCase()===preferred.toLowerCase()&&conflict.lcb!=='federal government';
    const cites=[citation('lcb',conflict.lcbRule,conflict.lcbPage,forms.lcb,conflict.lcbText,references.lcb),citation('gpo',conflict.gpoRule,conflict.gpoPage,forms.gpo,conflict.gpoText,references.gpo)];
    for(let i=combined.length-1;i>=0;i--)if(combined[i].start<end&&combined[i].end>start)combined.splice(i,1);
    combined.push({start,end,text,suggestion:preferred,rule:conflict.lcbRule,category:'Guide conflict',guideId:'lcb',guidePage:conflict.lcbPage,guidePrintedPage:String(conflict.lcbPage),conflict:true,matchesPrimary,references:cites,message:matchesPrimary?'Current wording follows LCB; no LCB correction is suggested. GPO uses a different form.':'LCB’s form is recommended; GPO gives a different form.',conflictNote:'The guides differ for this context. LCB takes priority, as specified on page 1 of the LCB manual. This location remains highlighted for review.'});
  }
  for(const issue of [...lcbContextualIssues(doc,references),...entryModifierIssues(doc,references),...compoundIssues(doc,references),...capitalizationIssues(doc,references),...numeralIssues(doc,references),...largeOrdinalIssues(doc,references),...compoundCardinalIssues(doc,references),...localOfficeIssues(doc,references),...finalLcbContextIssues(doc,references),...merriamSpellingIssues(doc,references),...contextualPunctuationIssues(doc,references),...monetaryPairIssues(doc,references),...fractionIssues(doc,references),...measurementIssues(doc,references),...moneyFormIssues(doc,references),...referenceIssues(doc,references),...ratioIssues(doc,references),...wordChoiceIssues(doc,references),...officeTitleIssues(doc,references),...inProportionIssues(doc,references),...openingMeasureIssues(doc,references),...lcbExpressionIssues(doc,references),...contextualNameIssues(doc,references),...constitutionalStateIssues(doc,references),...constitutionalBudgetIssues(doc,references),...corporationLetterIssues(doc,references)]){for(let i=combined.length-1;i>=0;i--)if(combined[i].start<issue.end&&combined[i].end>issue.start){const prior=combined[i];if(prior.suggestion===issue.suggestion){for(const ref of prior.references)if(!issue.references.some(r=>r.guideId===ref.guideId&&r.rule===ref.rule))issue.references.push(ref);if(prior.conflict){issue.conflict=true;issue.matchesPrimary=prior.matchesPrimary;issue.conflictNote=prior.conflictNote;issue.message=prior.message;}}combined.splice(i,1);}combined.push(issue);}
  // The complete known shared expression owns its component corrections,
  // including a missing final unit hyphen. Do not require repeated review
  // passes to first fix the final modifier and then its suspended prefix.
  for(const issue of sharedModifierIssues(doc,references)){
   for(let n=combined.length-1;n>=0;n--)if(combined[n].start>=issue.start&&combined[n].end<=issue.end)combined.splice(n,1);
   if(!combined.some(i=>i.start<issue.end&&i.end>issue.start))combined.push(issue);
  }
  for(const issue of [...calendarIssues(doc,references),...verbEndingIssues(doc,references),...listedNounIssues(doc,references),...calendarAbbreviationIssues(doc,references),...quantitySeparatorIssues(doc,references),...symbolIssues(doc,references),...editorialNotationIssues(doc,references),...tableFigureIssues(doc,references),...compoundPluralIssues(doc,references),...geologicNameIssues(doc,references),...modifierPositionIssues(doc,references),...semicolonSeriesIssues(doc,references),...serialCommaIssues(doc,references),...reflexivePronounIssues(doc,references),...phrasalVerbIssues(doc,references),...phrasalInflectionIssues(doc,references),...nominalPluralIssues(doc,references),...gpoNominalIssues(doc,references),...metricDefinitionIssues(doc,references),...numberArticleIssues(doc,references),...suffixSpellingIssues(doc,references),...lcbRoleFormIssues(doc,references),...contractionIssues(doc,references),...participleModifierIssues(doc,references),...lcbSpellingIssues(doc,references),...lcbPrefixIssues(doc,references)]){if(!combined.some(i=>i.start<issue.end&&i.end>issue.start))combined.push(issue);}
  // Existing source rules retain precedence and their original citations.
  // Only add parser findings after every local rule has been considered.
  const referenceProtections=lcbReferenceIdentityProtectionRanges(doc,references);
  for(let n=combined.length-1;n>=0;n--)if(referenceProtections.some(r=>r.supersedesCheckIds?.includes(combined[n].checkId)&&r.start<combined[n].end&&r.end>combined[n].start))combined.splice(n,1);
  const createdTitleProtections=[...lcbCreatedOfficialTitleProtectionRanges(doc,references),...lcbCreatedTitleReferenceProtectionRanges(doc,references),...lcbCreatedTitleIdentityProtectionRanges(doc,references),...designatedTitleProtectionRanges(doc,references),...(includeCreatedPublicEntities?createdPublicEntityProtectionRanges(doc,references):[])];
  for(let n=combined.length-1;n>=0;n--)if(createdTitleProtections.some(r=>r.supersedesCheckIds?.includes(combined[n].checkId)&&r.start<=combined[n].start&&r.end>=combined[n].end))combined.splice(n,1);
  combined.push(...lcbReferenceChainIssues(doc,references,{existingIssues:combined}));
  combined.push(...lcbTableCellIssues(doc,references,{existingIssues:combined}).filter(i=>includeReviewSuggestions||!i.reviewSuggested));
  const addGeneralModifier=candidate=>{
     if(isNounPrefixReview(candidate)&&((candidate.reviewVariant==='noun-sequence'?!includeNounSequenceReview:!includeQualifiedNounPrefixReview)||listedOpenNounModifier(candidate,references)))return;
     if(!candidate.reviewSuggested||candidate.suggestion!==null||!['open-modifier','ly-hyphen','noun-sequence','qualified-noun-prefix'].includes(candidate.reviewVariant)||combined.some(i=>i.start<candidate.end&&i.end>candidate.start&&!(isNounPrefixReview(candidate)&&['lcb-introduced-series-review','lcb-grouped-semicolon-review'].includes(i.checkId))&&!(isNounPrefixReview(candidate)&&i.checkId==='lcb-general-unit-modifier-review'&&i.reviewVariant!==candidate.reviewVariant&&(i.start!==candidate.start||i.end!==candidate.end))))return;
     const ly=candidate.reviewVariant==='ly-hyphen',lcbRule='Hyphenation, item '+(ly?'3':'1'),gpoRule=ly?'6.20':'6.15';
     const cites=[citation('lcb',lcbRule,8,null,ly?'LCB says not to hyphenate an adjective phrase containing an adverb ending in -ly.':'LCB generally hyphenates words forming a unit modifier immediately before the word modified, especially when an element is a present or past participle.',references.lcb),citation('gpo',gpoRule,ly?116:114,null,ly?'GPO omits hyphens in unit modifiers with adverbs ending in -ly.':'GPO generally hyphenates the words of a unit modifier immediately preceding the word modified.',references.gpo)];
     if(isNounPrefixReview(candidate))cites.push(citation('gpo','6.16',115,null,'GPO allows an open temporary compound when its meaning is clear and a hyphen does not aid readability. Confirm whether this exception applies before editing.',references.gpo));
     combined.push({...candidate,guideId:'lcb',guidePage:8,guidePrintedPage:'8',rule:lcbRule,category:'Unit Modifier Review',context:styleContext(doc).at(candidate.start),confidence:'Review Suggested',references:cites,conflict:false,checkId:'lcb-general-unit-modifier-review',message:'Review Suggested: Check whether “'+candidate.matchText+'” modifies “'+candidate.head+'”. '+(candidate.reviewVariant==='qualified-noun-prefix'?'The parser attaches an adjective to an interior noun in this complete prefix. Check that grouping and whether a hyphen would aid readability; a clear open compound may remain open under GPO6.16. No replacement is asserted.':ly?'LCB omits the hyphen when an adverb ending in -ly is part of the adjective phrase. Confirm the grammatical role.':'LCB generally hyphenates a unit modifier before its noun, especially when a component is a participle. Confirm that these words form a unit modifier. No replacement is asserted.')});
  };
  for(const candidate of engineIssues){
    if(createdTitleProtections.some(r=>r.supersedesEngineRules?.includes(candidate.engineRule)&&r.start<=candidate.start&&r.end>=candidate.end))continue;
    if(candidate.engineRule===GENERAL_MODIFIER_REVIEW_RULE){
     if(!isNounPrefixReview(candidate))addGeneralModifier(candidate);
     continue;
    }
    const rule=OFFLINE_MODIFIERS.find(r=>r.engineRule===candidate.engineRule);
    if(!rule)continue;
    // An explicit complete listed modifier outranks a generic prefix guess
    // inside it (non work -> nonwork within non-work-related, for example).
    if(rule.page!==8)for(let n=combined.length-1;n>=0;n--){const older=combined[n];if(older.checkId==='lcb-prefixes'&&older.start>=candidate.start&&older.end<=candidate.end)combined.splice(n,1);}
    if(combined.some(i=>i.start<candidate.end&&i.end>candidate.start))continue;
    const cites=[citation('lcb',rule.rule,rule.page,rule.preferred,rule.page===8?'LCB generally hyphenates a unit modifier immediately preceding the word modified, especially when an element is a participle.':'LCB explicitly lists “'+rule.preferred+'” as a unit modifier.',references.lcb),citation('gpo','6.15',114,rule.preferred,'GPO generally hyphenates the words of a unit modifier immediately preceding the word modified.',references.gpo)];
    combined.push({...candidate,guideId:'lcb',guidePage:rule.page,guidePrintedPage:String(rule.page),rule:cites[0].rule,category:'Modifier hyphenation',context:styleContext(doc).at(candidate.start),references:cites,conflict:false,checkId:rule.checkId,message:candidate.reviewSuggested?'Review Suggested: Check whether “'+candidate.matchText+'” is a unit modifier of “'+candidate.head+'”. LCB lists “'+rule.preferred+'” for that use.':'“'+candidate.matchText+'” modifies “'+candidate.head+'”. LCB recommends “'+candidate.suggestion+'” in this position.'});
  }
  // Numbered-reference capitalization differs between the guides and is ignored.
  // Independent reference-spacing checks remain active.
  const names=sourceNameRanges(source),context=styleContext(doc);
  const entities=californiaEntityReview(doc,references);
  // Preserve listed proper-name wording from generic spelling/compound
  // corrections. Authoritative complete-name case checks replace fragments.
  for(let n=combined.length-1;n>=0;n--)if(entities.ranges.some(r=>r.start<combined[n].end&&r.end>combined[n].start))combined.splice(n,1);
  combined.push(...entities.issues);
  // The desktop enables the reader-assisted layer. Existing correction APIs
  // can still request their established precise-only result set explicitly.
  if(includeReviewSuggestions){
   combined.push(...lcbEntityIdentityReviewIssues(doc,references,{existingIssues:combined}));
   combined.push(...lcbCreatedOfficialTitleReviewIssues(doc,references,{existingIssues:combined}));
   combined.push(...lcbCreatedTitleReferenceReviewIssues(doc,references,{existingIssues:combined}));
   combined.push(...lcbCreatedTitleIdentityReviewIssues(doc,references,{existingIssues:combined}));
   combined.push(...designatedTitleCreationIssues(doc,references,{existingIssues:combined}));
   combined.push(...designatedTitleReferenceIssues(doc,references,{existingIssues:combined}));
   if(includeCreatedPublicEntities){combined.push(...createdPublicEntityCreationIssues(doc,references,{existingIssues:combined}));combined.push(...createdPublicEntityReferenceIssues(doc,references,{existingIssues:combined}));}
   if(includeOfficialHeadReview)combined.push(...officialHeadTitleReviewIssues(doc,references,{existingIssues:combined}));
   combined.push(...lcbSuffixBoundaryReviewIssues(doc,references,{existingIssues:combined,includeLexical:includeLexicalSuffixReview,includeProductiveLike:includeProductiveLikeReview}));
   combined.push(...lcbInitialismArticleReviewIssues(doc,references,{existingIssues:combined,includeLocalExpansions:includeLocalInitialismReview}));
   combined.push(...lcbFreshDefinitionQuoteReviewIssues(doc,references,{existingIssues:combined}));
   combined.push(...timePossessiveReviewIssues(doc,references,{existingIssues:combined}));
   if(includeDefinitionReview)combined.push(...freshDefinitionTermIssues(doc,references,{existingIssues:combined,candidateProvider:d=>jointStylisticIssues(d,references,{includeReviewSuggestions:true,includeDefinitionReview:false,includeLexicalSuffixReview,includeLocalInitialismReview,includeCreatedPublicEntities,includeOfficialHeadReview,includeNounSequenceReview,includeQualifiedNounPrefixReview,includeParsedPredicateReview,includeProductiveLikeReview,includeCreatedEntityNameReview,includeCreatedTitleNameReview,includeDecimalOpeningReview,includeFractionOpeningReview,includeLargeIntegerOpeningReview,includeIntegerOpeningReview})}));
   combined.push(...lcbConstitutionalReferenceReviewIssues(doc,references));
   combined.push(...lcbStructuralReferenceReviewIssues(doc,references));
   combined.push(...lcbCoordinatedReferenceReviewIssues(doc,references));
   combined.push(...lcbSemanticReviewIssues(doc,references,{existingIssues:combined}));
   combined.push(...lcbUnknownMoneyReviewIssues(doc,references,{existingIssues:combined}));
   combined.push(...lcbNumberRelationReviewIssues(doc,references,{existingIssues:combined}));
   combined.push(...parsedNumberRelationReviewIssues(engineIssues,doc,references,{existingIssues:combined}));
   combined.push(...repeatedCountPhraseReviewIssues(doc,references,{existingIssues:combined}));
   combined.push(...lcbUnfamiliarSeriesReviewIssues(doc,references,{existingIssues:combined}));
   for(const finding of introducedSeriesReviewIssues(doc,references,{existingIssues:combined})){
    const witness=finding.ownedByPunctuationReview,owner=witness&&combined.find(i=>i.checkId===witness.checkId&&i.start===witness.start&&i.end===witness.end&&i.reviewSuggested&&i.suggestion===null);
    if(owner){owner.introducedSeriesEvidence=finding.introducedSeriesEvidence;owner.evidenceStart=finding.evidenceStart;owner.evidenceEnd=finding.evidenceEnd;owner.hasIntroducedSeriesReview=true;owner.introducedSeriesMessage=finding.message;owner.message+=' '+finding.message;owner.references=[...owner.references,...finding.references.filter(r=>!owner.references.some(e=>e.guideId===r.guideId&&e.rule===r.rule&&e.guidePage===r.guidePage))];}
    else combined.push(finding);
   }
   for(const finding of groupedSemicolonReviewIssues(doc,references,{existingIssues:combined})){
    const witness=finding.ownedByPunctuationReview,owner=witness&&combined.find(i=>i.checkId===witness.checkId&&i.start===witness.start&&i.end===witness.end&&i.reviewSuggested&&i.suggestion===null);
    if(owner){owner.groupedSeriesEvidence=finding.groupedSeriesEvidence;owner.evidenceStart=finding.evidenceStart;owner.evidenceEnd=finding.evidenceEnd;owner.hasGroupedSemicolonReview=true;owner.groupedSemicolonMessage=finding.message;owner.message+=' '+finding.message;owner.references=[...owner.references,...finding.references.filter(r=>!owner.references.some(e=>e.guideId===r.guideId&&e.rule===r.rule&&e.guidePage===r.guidePage))];}
    else combined.push(finding);
   }
   if(includeDecimalOpeningReview)combined.push(...decimalOpeningReviewIssues(doc,references,{existingIssues:combined}));
   if(includeFractionOpeningReview)combined.push(...fractionOpeningReviewIssues(doc,references,{existingIssues:combined}));
   if(includeIntegerOpeningReview)for(const finding of integerOpeningReviewIssues(doc,references,{existingIssues:combined,protectedRanges:[...names,...createdTitleProtections]})){
    const owner=combined.find(i=>!i.conflict&&i.start===finding.start&&i.end===finding.end&&ORDINARY_OPENING_MERGE_CHECK_IDS.includes(i.checkId));
    if(owner){owner.evidenceStart=finding.evidenceStart;owner.evidenceEnd=finding.evidenceEnd;owner.openingClauseText=finding.openingClauseText;owner.openingEvidenceKind=finding.openingEvidenceKind;owner.exactSourceInteger=finding.exactSourceInteger;owner.hasIntegerOpeningReview=true;owner.integerOpeningMessage=finding.message;owner.message+=' '+finding.message;owner.references=[...owner.references,...finding.references.filter(r=>!owner.references.some(e=>e.guideId===r.guideId&&e.rule===r.rule&&e.guidePage===r.guidePage))];}
    else combined.push(finding);
   }
   if(includeLargeIntegerOpeningReview)for(const finding of largeIntegerOpeningReviewIssues(doc,references,{existingIssues:combined})){
    const owner=combined.find(i=>i.start===finding.start&&i.end===finding.end&&LARGE_OPENING_MERGE_CHECK_IDS.includes(i.checkId));
    if(owner){owner.evidenceStart=finding.evidenceStart;owner.evidenceEnd=finding.evidenceEnd;owner.openingClauseText=finding.openingClauseText;owner.openingEvidenceKind=finding.openingEvidenceKind;owner.exactSourceInteger=finding.exactSourceInteger;owner.hasLargeIntegerOpeningReview=true;owner.largeIntegerOpeningMessage=finding.message;owner.message+=' '+finding.message;owner.references=[...owner.references,...finding.references.filter(r=>!owner.references.some(e=>e.guideId===r.guideId&&e.rule===r.rule&&e.guidePage===r.guidePage))];}
    else combined.push(finding);
   }
   // New broad reader questions cannot suppress established semantic,
   // quantity, reference or punctuation findings on the same source words.
   for(const variant of ['noun-sequence','qualified-noun-prefix'])for(const candidate of engineIssues)if(candidate.engineRule===GENERAL_MODIFIER_REVIEW_RULE&&candidate.reviewVariant===variant&&!createdTitleProtections.some(r=>r.supersedesEngineRules?.includes(candidate.engineRule)&&r.start<=candidate.start&&r.end>=candidate.end))addGeneralModifier(candidate);
   if(includeCreatedTitleNameReview)for(const finding of createdTitleNameConsistencyIssues(doc,references,{existingIssues:combined})){
    const existing=combined.find(i=>i.start===finding.start&&i.end===finding.end&&['lcb-created-title-identity-review','lcb-entity-identity-review'].includes(i.checkId)&&i.reviewSuggested&&i.suggestion===null);
    if(existing){existing.entityNameEvidence=finding.entityNameEvidence;existing.sourceNameKind=finding.sourceNameKind;existing.titleWitness=finding.titleWitness;existing.sourceTitleNameMessage=finding.message;existing.message+=' '+finding.message;existing.references=[...existing.references,...finding.references.filter(r=>!existing.references.some(e=>e.guideId===r.guideId&&e.guidePage===r.guidePage&&e.rule===r.rule))];}
    else combined.push(finding);
   }
   if(includeCreatedPublicEntities&&includeCreatedEntityNameReview)for(const finding of createdEntityNameConsistencyIssues(doc,references,{existingIssues:combined})){
    // A near registry name and a name created by this bill can concern the
    // same complete words. Keep one question and both independent witnesses.
    // Preserve the registry finding's identity, coordinates and priority.
    const existing=combined.find(i=>i.start===finding.start&&i.end===finding.end&&i.checkId==='lcb-entity-identity-review'&&i.reviewSuggested&&i.suggestion===null&&i.entityMatches?.length);
    if(existing){existing.entityNameEvidence=finding.entityNameEvidence;existing.titleWitness=finding.titleWitness;existing.sourceEntityNameMessage=finding.message;existing.message+=' '+finding.message;existing.references=[...existing.references,...finding.references.filter(r=>!existing.references.some(e=>e.guideId===r.guideId&&e.guidePage===r.guidePage&&e.rule===r.rule))];}
    else combined.push(finding);
   }
  }
  if(includeReviewSuggestions&&includeParsedPredicateReview)combined.push(...parsedPredicateCompoundIssues(doc,references,engineIssues,{existingIssues:combined}));
  if(includeReviewSuggestions&&includeParsedPredicateReview)combined.push(...postnominalCompoundIssues(doc,references,engineIssues,{existingIssues:combined}));
  if(includeReviewSuggestions)combined.push(...coordinatedNumberRelationReviewIssues(engineIssues,doc,references,{existingIssues:combined}));
  if(includeReviewSuggestions)combined.push(...mixedCountListReviewIssues(engineIssues,doc,references,{existingIssues:combined}));
  if(includeReviewSuggestions)combined.push(...internalBillReferenceIssues(doc,references));
  combined.push(...authorityPreferenceIssues(doc,references,authority,{existingIssues:combined}));
  // Complete supplied entity case is independent of generic compound-word
  // conventions within that name: this check does not change its wording.
  // Every check uses the same newly recognized wrapped literal context.
  // Corrections to quote-boundary punctuation remain independently active.
  const wrappedLiteralBlocks=i=>!['Punctuation: Quotation Marks','8.120'].includes(i.rule)&&context.wrappedLiteralRanges.some(r=>r.start<i.end&&r.end>i.start);
  return combined.filter(i=>!i.conflict&&!context.technicalAt(i.start,i.end)&&(!wrappedLiteralBlocks(i)||['lcb-designated-title-creation-review','lcb-fresh-definition-term-review'].includes(i.checkId))&&(i.checkId==='california-entities'||!ignoredConflictRanges.some(r=>r.start<i.end&&r.end>i.start)&&(['lcb-created-title-reference-review','lcb-created-title-identity-review','lcb-designated-title-reference-review','lcb-designated-title-creation-review'].includes(i.checkId)||!names.some(r=>r.start<i.end&&r.end>i.start)))&&(['table-figures','lcb-table-cell-figures','lcb-table-cell-review'].includes(i.checkId)||!context.tableAt(i.start))).sort((a,b)=>a.start-b.start||a.end-b.end).map((i,id)=>({...i,id,matchText:source.slice(i.start,i.end).replace(/-[ \t]*\n\s*/g,'-').replace(/\s+/g,' ').trim()}));
}

