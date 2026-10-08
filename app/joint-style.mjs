import {semicolonSeriesIssues} from './style-semicolon-series.mjs';
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
import {styleSource,styleContext} from './style-context.mjs';
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
  for(const [variant,preferred] of [['advisor','adviser'],['judgement','judgment'],['marshall','marshal'],['monies','moneys'],['wilful','willful'],['an historical','a historical']])add(variant,preferred,'Spelling and usage',2,'Preferred spelling');
  for(const [variant,preferred,page] of [
    ['mobile home','mobilehome',12],['mobile homes','mobilehomes',4],['healthcare','health care',11],
    ['by-laws','bylaws',9],['co-payment','copayment',10],['co-worker','coworker',10],['data base','database',10],
    ['day care','daycare',10],['down payment','downpayment',10],['high rise','highrise',11],
    ['in-service','inservice',11],['in service','inservice',11],['non-profit','nonprofit',12],
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
export function jointStylisticIssues(doc,references){
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
  const source=sourceText(doc),protectedRanges=[...doc.struck,...doc.blocks.filter(b=>b.ignored).map(b=>({start:b.start,end:b.end}))];
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
    {pattern:/\bfederal\s+government\b/gi,lcb:'federal government',gpo:'Federal Government',lcbRule:'Capitalization examples',lcbPage:19,gpoRule:'3.20',gpoPage:46,lcbText:'LCB lists “federal government” in lowercase. Item 4 on page 17 also says not to capitalize descriptive “federal” unless part of an act or law title.',gpoText:'GPO 3.20 lists “Federal, Federal Government” when referring specifically to the United States government.',skip:(m,s)=>m[0]===m[0].toUpperCase()||/^\s+(?:Act|Code|Law)\b/.test(s.slice(m.index+m[0].length))},
    {pattern:/\bhealth[\s-]*care\b/gi,lcb:'health care',gpo:'healthcare',lcbRule:'Hyphenation examples',lcbPage:11,gpoRule:'7. Compounding Examples',gpoPage:157,lcbText:'LCB lists “health care” as two words.',gpoText:'GPO’s compounding list on printed page 143 lists “healthcare” as one word.'},
    {pattern:/\bAfrican[\s-]+American(?=\s+program\b)/gi,lcb:'African American',gpo:'African-American',lcbRule:'Hyphenation examples',lcbPage:9,gpoRule:'6.21',gpoPage:116,lcbText:'LCB lists “African American” without a hyphen.',gpoText:'GPO 6.21 gives “African-American program” as a hyphenated modifier.'},
    {pattern:/\bcollective[\s-]+bargaining(?=\s+(?:talks|agreements?|process|rights|units?)\b)/gi,lcb:'collective bargaining',gpo:'collective-bargaining',lcbRule:'Hyphenation examples',lcbPage:9,gpoRule:'6.15',gpoPage:114,lcbText:'LCB lists “collective bargaining (n., u.m.)” without a hyphen in either noun or unit-modifier position.',gpoText:'GPO 6.15 gives “collective-bargaining talks” as a hyphenated modifier before a noun.'},
    {pattern:/\bground[\s-]*water\b/gi,lcb:'groundwater',gpo:'ground water',lcbRule:'End words: water',lcbPage:15,gpoRule:'7. Compounding Examples',gpoPage:154,lcbText:'LCB’s end-word examples list “groundwater” as one word.',gpoText:'GPO printed page 140 lists ground with #water; the # marks the space in “ground water”.'},
    {pattern:/\bwild[\s-]*land\b/gi,lcb:'wildland',gpo:'wild land',lcbRule:'End words: land',lcbPage:15,gpoRule:'7. Compounding Examples',gpoPage:204,lcbText:'LCB’s end-word examples list “wildland” as one word.',gpoText:'GPO printed page 190 lists wild with #land; the # marks the space in “wild land”.'}
  ];
  for(const conflict of conflicts)for(const match of source.matchAll(conflict.pattern)){
    const start=match.index,end=start+match[0].length;
    ignoredConflictRanges.push({start,end});
    if(protectedRanges.some(r=>r.start<end&&r.end>start)||conflict.skip?.(match,source))continue;
    const text=fold(match[0]),forms=conflict.forms?.(match)||conflict;
    let preferred=forms.lcb;if(/^[A-Z]/.test(text)&&!['federal government'].includes(preferred))preferred=preferred[0].toUpperCase()+preferred.slice(1);
    const matchesPrimary=text===preferred||text.toLowerCase()===preferred.toLowerCase()&&conflict.lcb!=='federal government';
    const cites=[citation('lcb',conflict.lcbRule,conflict.lcbPage,forms.lcb,conflict.lcbText,references.lcb),citation('gpo',conflict.gpoRule,conflict.gpoPage,forms.gpo,conflict.gpoText,references.gpo)];
    for(let i=combined.length-1;i>=0;i--)if(combined[i].start<end&&combined[i].end>start)combined.splice(i,1);
    combined.push({start,end,text,suggestion:preferred,rule:conflict.lcbRule,category:'Guide conflict',guideId:'lcb',guidePage:conflict.lcbPage,guidePrintedPage:String(conflict.lcbPage),conflict:true,matchesPrimary,references:cites,message:matchesPrimary?'Current wording follows LCB; no LCB correction is suggested. GPO uses a different form.':'LCB’s form is recommended; GPO gives a different form.',conflictNote:'The guides differ for this context. LCB takes priority, as specified on page 1 of the LCB manual. This location remains highlighted for review.'});
  }
  for(const issue of [...lcbContextualIssues(doc,references),...compoundIssues(doc,references),...capitalizationIssues(doc,references),...numeralIssues(doc,references),...contextualPunctuationIssues(doc,references),...monetaryPairIssues(doc,references),...fractionIssues(doc,references),...measurementIssues(doc,references),...moneyFormIssues(doc,references),...referenceIssues(doc,references),...ratioIssues(doc,references),...wordChoiceIssues(doc,references),...officeTitleIssues(doc,references)]){for(let i=combined.length-1;i>=0;i--)if(combined[i].start<issue.end&&combined[i].end>issue.start){const prior=combined[i];if(prior.suggestion===issue.suggestion){for(const ref of prior.references)if(!issue.references.some(r=>r.guideId===ref.guideId&&r.rule===ref.rule))issue.references.push(ref);if(prior.conflict){issue.conflict=true;issue.matchesPrimary=prior.matchesPrimary;issue.conflictNote=prior.conflictNote;issue.message=prior.message;}}combined.splice(i,1);}combined.push(issue);}
  for(const issue of [...calendarIssues(doc,references),...verbEndingIssues(doc,references),...listedNounIssues(doc,references),...calendarAbbreviationIssues(doc,references),...quantitySeparatorIssues(doc,references),...symbolIssues(doc,references),...editorialNotationIssues(doc,references),...tableFigureIssues(doc,references),...compoundPluralIssues(doc,references),...geologicNameIssues(doc,references),...modifierPositionIssues(doc,references),...semicolonSeriesIssues(doc,references)]){if(!combined.some(i=>i.start<issue.end&&i.end>issue.start))combined.push(issue);}
  // Numbered-reference capitalization differs between the guides and is ignored.
  // Independent reference-spacing checks remain active.
  const names=sourceNameRanges(source),context=styleContext(doc);
  return combined.filter(i=>!i.conflict&&!ignoredConflictRanges.some(r=>r.start<i.end&&r.end>i.start)&&!names.some(r=>r.start<i.end&&r.end>i.start)&&(i.checkId==='table-figures'||!context.tableAt(i.start))).sort((a,b)=>a.start-b.start||a.end-b.end).map((i,id)=>({...i,id,matchText:source.slice(i.start,i.end).replace(/-[ \t]*\n\s*/g,'-').replace(/\s+/g,' ').trim()}));
}

