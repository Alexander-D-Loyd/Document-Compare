import {lcbListedNumericModifierIssues,lcbListedNumericModifierProtectionRanges,restoreListedNumericModifierEvidence} from './style-lcb-listed-numeric-modifiers.mjs';
import {lcbListedPunctuationNameIssues} from './style-lcb-listed-punctuation-names.mjs';
import {applyLcbGuidePriority} from './style-guide-priority.mjs';
import {authorityPreferenceIssues}from './offline-authority.mjs';
import {styleFindingPolicy,styleNameProtected} from './style-finding-policy.mjs';
import {attachGuideEvidence} from './style-guide-evidence.mjs';
import {restoreMixedCountListEvidence}from './style-mixed-count-lists.mjs';
import {consolidateStyleFindings}from './finding-presentation.mjs';
import {restoreCountCoordinationEvidence}from './style-coordinated-number-relations.mjs';
import {restorePostnominalEvidence}from './style-postnominal-compounds.mjs';
import {restorePredicateCompoundEvidence}from './style-parsed-predicate-compounds.mjs';
import {restoreNounSequenceEvidence}from './offline-noun-sequences.mjs';
import {restoreCreatedEntityNameEvidence}from './style-created-entity-name-consistency.mjs';
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
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {OFFLINE_MODIFIERS,GENERAL_MODIFIER_REVIEW_RULE}from './offline-rules.mjs';
import {lcbSemanticReviewIssues}from './style-lcb-review-meanings.mjs';
import {lcbUnknownMoneyReviewIssues}from './style-lcb-review-money-context.mjs';
import {lcbNumberRelationReviewIssues}from './style-lcb-review-number-relations.mjs';
import {restoreRepeatedCountEvidence}from './style-repeated-count-phrases.mjs';
import {lcbReferenceChainIssues,lcbReferenceIdentityProtectionRanges,lcbConstitutionalReferenceReviewIssues,lcbStructuralReferenceReviewIssues,lcbCoordinatedReferenceReviewIssues}from './style-lcb-review-reference-chains.mjs';
import {lcbTableCellIssues}from './style-lcb-review-table-cells.mjs';
import {lcbUnfamiliarSeriesReviewIssues}from './style-lcb-review-series-punctuation.mjs';
import {introducedSeriesReviewIssues,restoreIntroducedSeriesEvidence}from './style-introduced-series-review.mjs';
import {lcbCreatedOfficialTitleReviewIssues,lcbCreatedOfficialTitleProtectionRanges}from './style-lcb-review-created-titles.mjs';
import {lcbCreatedTitleReferenceReviewIssues,lcbCreatedTitleReferenceProtectionRanges}from './style-lcb-review-title-references.mjs';
import {lcbCreatedTitleIdentityProtectionRanges}from './style-lcb-review-created-title-identity.mjs';
import {designatedTitleCreationIssues,designatedTitleReferenceIssues,designatedTitleProtectionRanges}from './style-designated-titles.mjs';
import {lcbInitialismArticleReviewIssues}from './style-lcb-review-initialism-articles.mjs';
import {lcbFreshDefinitionQuoteReviewIssues}from './style-lcb-review-quote-ownership.mjs';
import {freshDefinitionTermIssues}from './style-fresh-definition-terms.mjs';
import {timePossessiveReviewIssues,restoreTimePossessiveEvidence}from './style-time-possessive-review.mjs';
import {groupedSemicolonReviewIssues,restoreGroupedSeriesEvidence}from './style-grouped-semicolon-review.mjs';
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
  return consolidateStyleFindings(view?view.restore(issues.map(i=>mapReviewEvidence(i,view.toSource,doc.text))):issues).map(i=>attachGuideEvidence(i,references));
}
function mapReviewEvidence(issue,map,text=null){
 const result={...issue};
 if(issue.modifierRoleEvidence){
  const role=r=>{const start=map(r.start),end=map(r.end,true);return {...r,start,end,headStart:map(r.headStart),headEnd:map(r.headEnd,true),...(text!==null?{sourceText:text.slice(start,end)}:{})};};
  const e=issue.modifierRoleEvidence;result.modifierRoleEvidence={...e,components:e.components.map(role),head:role(e.head),predicate:{...role(e.predicate),finiteAuxiliaries:e.predicate.finiteAuxiliaries.map(role)}};
 }
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
 if(issue.numericModifierEvidence&&text!==null)result.numericModifierEvidence=restoreListedNumericModifierEvidence(issue.numericModifierEvidence,map,text);
 if(issue.listedNameEvidence){const e=issue.listedNameEvidence,start=map(e.start),end=map(e.end,true);result.listedNameEvidence={...e,start,end,...(text!==null?{sourceText:text.slice(start,end)}:{})};}
 if(issue.titleCaseEvidence)result.titleCaseEvidence=issue.titleCaseEvidence.map(c=>({...c,start:map(c.start),end:map(c.end,true)}));
 if(issue.titleIdentityEvidence){const c=issue.titleIdentityEvidence,start=map(c.start),end=map(c.end,true);result.titleIdentityEvidence={...c,start,end,...(text!==null?{sourceText:text.slice(start,end)}:{})};}
  if(issue.definitionEvidence){const e=issue.definitionEvidence,start=map(e.start),end=map(e.end,true),evidenceStart=map(e.evidenceStart),evidenceEnd=map(e.evidenceEnd,true),verbStart=map(e.definitionVerb.start),verbEnd=map(e.definitionVerb.end,true);result.definitionEvidence={...e,start,end,quoteStart:map(e.quoteStart),quoteEnd:map(e.quoteEnd,true),evidenceStart,evidenceEnd,...(text!==null?{text:text.slice(start,end),clauseText:text.slice(evidenceStart,evidenceEnd)}:{}),definitionVerb:{...e.definitionVerb,start:verbStart,end:verbEnd,...(text!==null?{text:text.slice(verbStart,verbEnd)}:{})}};}
  if(issue.pronunciationEvidence?.sourceExpansion){const e=issue.pronunciationEvidence.sourceExpansion,start=map(e.start),end=map(e.end,true),evidenceStart=map(e.evidenceStart),evidenceEnd=map(e.evidenceEnd,true);result.pronunciationEvidence={...issue.pronunciationEvidence,sourceExpansion:{...e,start,end,evidenceStart,evidenceEnd,...(text!==null?{text:text.slice(start,end),clauseText:text.slice(evidenceStart,evidenceEnd)}:{})}};}
 if(issue.sourceWordDivisions)result.sourceWordDivisions=issue.sourceWordDivisions.map(w=>({...w,start:map(w.start),end:map(w.end,true),spans:w.spans.map(s=>({...s,start:map(s.start),end:map(s.end,true)}))}));
 return result;
}
function reviewStylisticIssues(doc,references,engineIssues=[],includeReviewSuggestions=false,includeDefinitionReview=true,includeLexicalSuffixReview=true,includeLocalInitialismReview=true,includeCreatedPublicEntities=true,includeOfficialHeadReview=true,includeNounSequenceReview=true,includeQualifiedNounPrefixReview=true,includeParsedPredicateReview=true,includeProductiveLikeReview=true,includeCreatedEntityNameReview=true,includeCreatedTitleNameReview=true,includeDecimalOpeningReview=true,includeFractionOpeningReview=true,includeLargeIntegerOpeningReview=true,includeIntegerOpeningReview=true,authority=null){
  const combined=[];
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
  for(const issue of combined.filter(i=>i.guideId==='gpo')){
    const shared={'6.20':['Hyphenation, item 3',8,'LCB says not to hyphenate an adjective phrase containing an adverb ending in -ly.'],'6.34':['Hyphenation, item 5',8,'LCB lists ex-, quasi-, and self- as exceptions to its general rule against prefix hyphens.'],'6.15':['Hyphenation, item 1',8,'LCB generally hyphenates a unit modifier immediately before the word modified.']}[issue.rule];
    if(shared){issue.references.unshift(citation('lcb',shared[0],shared[1],issue.suggestion,shared[2],references.lcb));issue.guideId='lcb';issue.rule=shared[0];issue.guidePage=shared[1];issue.guidePrintedPage=String(shared[1]);issue.message='LCB and GPO agree on this form; LCB is the primary reference.';}
  }
  for(const issue of [...lcbContextualIssues(doc,references),...compoundIssues(doc,references),...capitalizationIssues(doc,references),...lcbListedPunctuationNameIssues(doc,references),...numeralIssues(doc,references),...largeOrdinalIssues(doc,references),...compoundCardinalIssues(doc,references),...localOfficeIssues(doc,references),...finalLcbContextIssues(doc,references),...merriamSpellingIssues(doc,references),...contextualPunctuationIssues(doc,references),...monetaryPairIssues(doc,references),...fractionIssues(doc,references),...measurementIssues(doc,references),...moneyFormIssues(doc,references),...referenceIssues(doc,references),...ratioIssues(doc,references),...wordChoiceIssues(doc,references),...officeTitleIssues(doc,references),...inProportionIssues(doc,references),...openingMeasureIssues(doc,references),...lcbExpressionIssues(doc,references),...contextualNameIssues(doc,references),...constitutionalStateIssues(doc,references),...constitutionalBudgetIssues(doc,references),...corporationLetterIssues(doc,references)]){for(let i=combined.length-1;i>=0;i--)if(combined[i].start<issue.end&&combined[i].end>issue.start){const prior=combined[i];if(prior.suggestion===issue.suggestion){for(const ref of prior.references)if(!issue.references.some(r=>r.guideId===ref.guideId&&r.rule===ref.rule))issue.references.push(ref);if(prior.conflict){issue.conflict=true;issue.matchesPrimary=prior.matchesPrimary;issue.conflictNote=prior.conflictNote;issue.message=prior.message;}}combined.splice(i,1);}combined.push(issue);}
  // The complete known shared expression owns its component corrections,
  // including a missing final unit hyphen. Do not require repeated review
  // passes to first fix the final modifier and then its suspended prefix.
  for(const issue of sharedModifierIssues(doc,references)){
   for(let n=combined.length-1;n>=0;n--)if(combined[n].start>=issue.start&&combined[n].end<=issue.end)combined.splice(n,1);
   if(!combined.some(i=>i.start<issue.end&&i.end>issue.start))combined.push(issue);
  }
  for(const issue of [...calendarIssues(doc,references),...verbEndingIssues(doc,references),...listedNounIssues(doc,references),...calendarAbbreviationIssues(doc,references),...quantitySeparatorIssues(doc,references),...symbolIssues(doc,references),...editorialNotationIssues(doc,references),...tableFigureIssues(doc,references),...compoundPluralIssues(doc,references),...geologicNameIssues(doc,references),...modifierPositionIssues(doc,references),...semicolonSeriesIssues(doc,references),...serialCommaIssues(doc,references),...reflexivePronounIssues(doc,references),...phrasalVerbIssues(doc,references),...phrasalInflectionIssues(doc,references),...nominalPluralIssues(doc,references),...gpoNominalIssues(doc,references),...metricDefinitionIssues(doc,references),...numberArticleIssues(doc,references),...suffixSpellingIssues(doc,references),...lcbRoleFormIssues(doc,references),...contractionIssues(doc,references),...lcbSpellingIssues(doc,references),...lcbPrefixIssues(doc,references)]){if(!combined.some(i=>i.start<issue.end&&i.end>issue.start))combined.push(issue);}
  // Existing source rules retain precedence and their original citations.
  // Only add parser findings after every local rule has been considered.
  const referenceProtections=lcbReferenceIdentityProtectionRanges(doc,references);
  for(let n=combined.length-1;n>=0;n--)if(referenceProtections.some(r=>r.supersedesCheckIds?.includes(combined[n].checkId)&&r.start<combined[n].end&&r.end>combined[n].start))combined.splice(n,1);
  const createdTitleProtections=[...lcbCreatedOfficialTitleProtectionRanges(doc,references),...lcbCreatedTitleReferenceProtectionRanges(doc,references),...lcbCreatedTitleIdentityProtectionRanges(doc,references),...designatedTitleProtectionRanges(doc,references),...(includeCreatedPublicEntities?createdPublicEntityProtectionRanges(doc,references):[])];
  for(let n=combined.length-1;n>=0;n--)if(styleNameProtected(combined[n],createdTitleProtections,source))combined.splice(n,1);
  combined.push(...lcbReferenceChainIssues(doc,references,{existingIssues:combined}));
  combined.push(...lcbTableCellIssues(doc,references,{existingIssues:combined}).filter(i=>includeReviewSuggestions||!i.reviewSuggested));
  for(const candidate of engineIssues){
    // Generic parser guesses cannot own a range or displace a printed rule.
    if(candidate.engineRule===GENERAL_MODIFIER_REVIEW_RULE||candidate.engineRule==='LCB_DATA_SHARING_MODIFIER')continue;
    if(styleNameProtected(candidate,createdTitleProtections,source))continue;
    const rule=OFFLINE_MODIFIERS.find(r=>r.engineRule===candidate.engineRule);
    if(!rule)continue;
    if(candidate.reviewSuggested!==false||candidate.attachmentMethod!=='direct'||candidate.modifierRoleEvidence?.kind!=='exact-listed-attributive')continue;
    // An explicit complete listed modifier outranks a generic prefix guess
    // inside it (non work -> nonwork within non-work-related, for example).
    if(rule.page!==8)for(let n=combined.length-1;n>=0;n--){const older=combined[n];if(older.checkId==='lcb-prefixes'&&older.start>=candidate.start&&older.end<=candidate.end)combined.splice(n,1);}
    if(combined.some(i=>i.start<candidate.end&&i.end>candidate.start))continue;
    const cites=[citation('lcb',rule.rule,rule.page,rule.preferred,rule.page===8?'LCB generally hyphenates a unit modifier immediately preceding the word modified, especially when an element is a participle.':'LCB explicitly lists “'+rule.preferred+'” as a unit modifier.',references.lcb),citation('gpo','6.15',114,rule.preferred,'GPO generally hyphenates the words of a unit modifier immediately preceding the word modified.',references.gpo)];
    combined.push({...candidate,guideId:'lcb',guidePage:rule.page,guidePrintedPage:String(rule.page),rule:cites[0].rule,category:'Modifier hyphenation',context:styleContext(doc).at(candidate.start),references:cites,conflict:false,checkId:rule.checkId,message:candidate.reviewSuggested?'Review Suggested: Check whether “'+candidate.matchText+'” is a unit modifier of “'+candidate.head+'”. LCB lists “'+rule.preferred+'” for that use.':'“'+candidate.matchText+'” modifies “'+candidate.head+'”. LCB recommends “'+candidate.suggestion+'” in this position.'});
  }
  // LCB is the primary guide; supported numbered-reference case is checked.
  // Independent reference-spacing checks retain ownership of complete phrases.
  const names=sourceNameRanges(source),context=styleContext(doc);
  const entities=californiaEntityReview(doc,references);
  // Preserve listed proper-name wording from generic spelling/compound
  // corrections. Authoritative complete-name case checks replace fragments.
  for(let n=combined.length-1;n>=0;n--)if(entities.ranges.some(r=>r.start<combined[n].end&&r.end>combined[n].start))combined.splice(n,1);
  combined.push(...entities.issues);
  // The desktop enables the reader-assisted layer. Existing correction APIs
  // can still request their established precise-only result set explicitly.
  if(includeReviewSuggestions){

   combined.push(...lcbCreatedOfficialTitleReviewIssues(doc,references,{existingIssues:combined}));
   combined.push(...lcbCreatedTitleReferenceReviewIssues(doc,references,{existingIssues:combined}));

   combined.push(...designatedTitleCreationIssues(doc,references,{existingIssues:combined}));
   combined.push(...designatedTitleReferenceIssues(doc,references,{existingIssues:combined}));
   if(includeCreatedPublicEntities){combined.push(...createdPublicEntityCreationIssues(doc,references,{existingIssues:combined}));combined.push(...createdPublicEntityReferenceIssues(doc,references,{existingIssues:combined}));}
   if(includeOfficialHeadReview)combined.push(...officialHeadTitleReviewIssues(doc,references,{existingIssues:combined}));

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
   // Legacy option keys cannot re-enable unsupported generator families.
  }
  // An exact printed modifier in unknown document context cannot be owned by
  // an incorrect generic fraction/count conversion. Its review stays manual.
  for(const range of lcbListedNumericModifierProtectionRanges(doc))for(let n=combined.length-1;n>=0;n--){
   const issue=combined[n];
   if(issue.start>=range.start&&issue.end<=range.end&&(range.supersedesCheckIds.includes(issue.checkId)||range.supersedesRules.includes(issue.rule)))combined.splice(n,1);
  }
  // A complete printed numeric modifier owns its contained partial value/unit
  // edits, so a single review covers the whole source construction.
  for(const issue of lcbListedNumericModifierIssues(doc,references)){
   for(let n=combined.length-1;n>=0;n--)if(combined[n].start>=issue.start&&combined[n].end<=issue.end)combined.splice(n,1);
   if(!combined.some(i=>i.start<issue.end&&i.end>issue.start))combined.push(issue);
  }
  combined.push(...authorityPreferenceIssues(doc,references,authority,{existingIssues:combined}));
  // Complete supplied entity case is independent of generic compound-word
  // conventions within that name: this check does not change its wording.
  // Every check uses the same newly recognized wrapped literal context.
  // Corrections to quote-boundary punctuation remain independently active.
  const permitted=styleFindingPolicy(doc,{context,names:[...names,...createdTitleProtections]});
  const prioritized=applyLcbGuidePriority(doc,references,combined,{names:[...names,...createdTitleProtections,...entities.ranges]});
  return prioritized.filter(permitted).sort((a,b)=>a.start-b.start||a.end-b.end).map((i,id)=>({...i,id,matchText:source.slice(i.start,i.end).replace(/-[ \t]*\n\s*/g,'-').replace(/\s+/g,' ').trim()}));
}

