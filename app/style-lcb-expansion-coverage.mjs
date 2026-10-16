import {LCB_LISTED_BIFURCATION_SCOPE} from './style-lcb-listed-bifurcation.mjs';
import {LCB_FULL_DATE_LAYOUT_SCOPE} from './style-lcb-full-date-layout.mjs';
import {LCB_ANYTIME_ALIAS_SCOPE} from './style-lcb-anytime-alias.mjs';
import {LCB_DIGEST_PERCENT_SCOPE} from './style-lcb-digest-percent.mjs';
import {LCB_INCLUSIVE_RANGE_SCOPE} from './style-lcb-inclusive-ranges.mjs';
import {LCB_DOLLAR_MINIMUM_SCOPE} from './style-lcb-dollar-minimum.mjs';
import {LCB_INCOME_SERIES_SCOPE} from './style-lcb-income-series.mjs';
import {LCB_LISTED_INCLUDING_BOUNDARY_SCOPE} from './style-lcb-listed-including-boundary.mjs';
import {LCB_LISTED_AGENCY_FORM_SCOPE} from './style-lcb-listed-agency-form.mjs';
import {LCB_DATA_SHARING_AGREEMENT_SCOPE} from './style-lcb-data-sharing-agreements.mjs';
import {LCB_LISTED_OPEN_NOUN_ALIAS_SCOPE} from './style-lcb-listed-open-noun-aliases.mjs';
import {LCB_LISTED_ALIAS_SCOPE} from './style-lcb-listed-aliases.mjs';
import {LCB_LISTED_PUNCTUATION_FORMS_SCOPE} from './style-lcb-listed-punctuation-forms.mjs';
import {LCB_MIXED_HALF_SCOPE} from './style-lcb-mixed-halves.mjs';
import {LCB_LISTED_REFERENCE_FORM_SCOPE} from './style-lcb-listed-reference-forms.mjs';
import {LCB_PAGE16_LISTED_MODIFIER_SCOPE} from './style-lcb-page16-listed-modifiers.mjs';
import {LCB_LISTED_SERVICE_NOUN_SCOPE} from './style-lcb-listed-service-noun.mjs';
import {LCB_SELECTED_PREFIX_ROLE_SCOPE} from './style-lcb-selected-prefix-roles.mjs';
import {LCB_STANDALONE_PLURAL_SCOPE} from './style-lcb-standalone-plurals.mjs';
import {LCB_SPECIFIC_CAPITALIZATION_SCOPE} from './style-lcb-specific-capitalization.mjs';
import {LCB_EXPLICIT_CAPITALIZATION_QUALIFIER_SCOPE} from './style-lcb-explicit-capitalization-qualifiers.mjs';
import {LCB_EXPLICIT_MEANING_CONTEXT_SCOPE} from './style-lcb-explicit-meaning-contexts.mjs';
import {LCB_SINGLE_QUOTE_PUNCTUATION_SCOPE} from './style-lcb-single-quote-punctuation.mjs';
import {LCB_OPINION_FORMS_SCOPE} from './style-lcb-opinion-forms.mjs';

const checks=[
 ['listed-bifurcation','Printed bifurcation noun form',3,/bifurcation/u,LCB_LISTED_BIFURCATION_SCOPE],
 ['full-date-layout','Complete temporal full-date punctuation and spacing',7,/April\s+1,\s+2001,/u,LCB_FULL_DATE_LAYOUT_SCOPE],
 ['anytime-alias','Printed any time noun and anytime adverb aliases',3,/any\s+time\s+\(n\.\)[\s\S]*?anytime\s+\(adv\.\)/u,LCB_ANYTIME_ALIAS_SCOPE],
 ['page16-listed-modifier-roles','Printed modifiers with textbook and instructional-material roles',16,/state-adopted/u,LCB_PAGE16_LISTED_MODIFIER_SCOPE],
 ['listed-service-noun','Printed non-civil service noun form',12,/non-civil\s+service/u,LCB_LISTED_SERVICE_NOUN_SCOPE],
 ['selected-prefix-ex-quasi','Selected ex- and quasi- role boundaries',8,/The\s+exceptions\s+for\s+prefixes\s+are\s+“ex-,”\s+“quasi-,”\s+and\s+“self-\.”/u,LCB_SELECTED_PREFIX_ROLE_SCOPE],
 ['selected-prefix-self','Selected self- role boundaries',13,/self-\s+\(all\s+words\s+hyphenated\)/u,LCB_SELECTED_PREFIX_ROLE_SCOPE],
 ['standalone-office-plurals','Standalone entity and office plurals',17,/Do\s+not\s+capitalize\s+words\s+such\s+as\s+authority,[\s\S]*?when\s+standing\s+alone\./u,LCB_STANDALONE_PLURAL_SCOPE],
 ['standalone-reference-plurals','Standalone reference-word plurals',17,/Do\s+not\s+capitalize\s+act,\s+article,\s+chapter,\s+division,\s+or\s+section\s+when\s+standing\s+alone\./u,LCB_STANDALONE_PLURAL_SCOPE],
 ['specific-person-office','Selected person possessive office roles',17,/“Office”\s+is\s+always\s+lower\s+case\s+when\s+referring\s+to\s+a\s+person’s\s+office/u,LCB_SPECIFIC_CAPITALIZATION_SCOPE],
 ['specific-member-qualifier','Complete California Legislature Member role',19,/Member\s+of\s+the\s+Legislature/u,LCB_SPECIFIC_CAPITALIZATION_SCOPE],
 ['qualified-state-court','Explicit state Supreme Court qualifiers',20,/Supreme\s+Court\s+\(U\.S\.\s+and\s+state\)/u,LCB_EXPLICIT_CAPITALIZATION_QUALIFIER_SCOPE],
 ['qualified-black-race','Explicit human Black race qualifiers',18,/Black\s+\(race\)/u,LCB_EXPLICIT_CAPITALIZATION_QUALIFIER_SCOPE],
 ['qualified-white-race','Explicit human White race qualifiers',20,/White\s+\(race\)/u,LCB_EXPLICIT_CAPITALIZATION_QUALIFIER_SCOPE],
 ['meaning-governmental-law','Explicit ordinance and ordnance context review',4,/ordinance\s+\(a\s+law\s+set\s+forth\s+by\s+a\s+governmental\s+authority\)/u,LCB_EXPLICIT_MEANING_CONTEXT_SCOPE],
 ['meaning-occupant-doctrine','Explicit tenant and tenet context review',5,/tenant\s+\(occupant\)/u,LCB_EXPLICIT_MEANING_CONTEXT_SCOPE],
 ['single-quote-boundaries','Supported single-quote comma and period boundaries',6,/Periods\s+and\s+commas\s+are\s+always\s+placed\s+within\s+quotation\s+marks;/u,LCB_SINGLE_QUOTE_PUNCTUATION_SCOPE],
 ['opinion-bill-numeral-base','Explicit Opinion and cover-letter numeral base',21,/Opinions\s+and\s+Cover\s+letters\s+follow\s+the\s+same\s+rules\s+as\s+bills,\s+except\s+when\s+referring\s+to\s+money\s+\(see\s+MONEY\s+in\s+this\s+section\)\./u,LCB_OPINION_FORMS_SCOPE],
 ['opinion-money','Explicit Opinion and cover-letter monetary forms',23,/\$10\s+\(digest,\s+opinion,\s+and\s+cover\s+letter\)/u,LCB_OPINION_FORMS_SCOPE],
 ['opinion-reference','Explicit Opinion and cover-letter and following notation',22,/Section\s+123\s+and\s+following\s+\(opinion\s+and\s+cover\s+letter\)/u,LCB_OPINION_FORMS_SCOPE],
 ['opinion-constitutions','Explicit Opinion Constitution wording',20,/state\s+and\s+federal\s+Constitutions\s+\(opinions\)/u,LCB_OPINION_FORMS_SCOPE],
 ['listed-article-reference','Printed California Constitution article form',22,/Article\s+XIII\s+B/u,LCB_LISTED_REFERENCE_FORM_SCOPE],
 ['listed-punctuation-city-series','Printed city/county series',7,/city,\s+county,\s+or\s+city\s+and\s+county/u,LCB_LISTED_PUNCTUATION_FORMS_SCOPE],
 ['listed-punctuation-duration','Printed different-duration series',7,/16\s+months,\s+or\s+two\s+or\s+three\s+years/u,LCB_LISTED_PUNCTUATION_FORMS_SCOPE],
 ['listed-punctuation-license','Printed real estate license forms',7,/real\s+estate\s+broker\s+license/u,LCB_LISTED_PUNCTUATION_FORMS_SCOPE],
 ['listed-punctuation-control','Printed United States control form',7,/United\s+States\s+control/u,LCB_LISTED_PUNCTUATION_FORMS_SCOPE],
 ['mixed-half-ages','Whole mixed-half age quantities',22,/701⁄2\s+years\s+of\s+age/u,LCB_MIXED_HALF_SCOPE],
 ['mixed-half-time','Whole mixed-half duration quantities',23,/101⁄2\s+hours\s+\(bill,\s+digest\)/u,LCB_MIXED_HALF_SCOPE],
 ['digest-percent','Digest fractional percentages',23,/1⁄2\s+of\s+1%\s+or\s+0\.5%\s+\(digest\)/u,LCB_DIGEST_PERCENT_SCOPE],
 ['inclusive-range','Explicit inclusive reference ranges',22,/Sections\s+123\s+to\s+130,\s+inclusive,/u,LCB_INCLUSIVE_RANGE_SCOPE],
 ['dollar-minimum','Printed dollar minimum modifier',23,/two-hundred-dollar\s+\(\$200\)\s+minimum\s+\(bill\)/u,LCB_DOLLAR_MINIMUM_SCOPE],
 ['income-series','Printed four-category income series',7,/extremely\s+low,\s+very\s+low,\s+low-,\s+and\s+moderate-income\s+households/u,LCB_INCOME_SERIES_SCOPE],
 ['including-boundary','Printed including phrase boundary',7,/,\s+including,\s+but\s+not\s+limited\s+to,/u,LCB_LISTED_INCLUDING_BOUNDARY_SCOPE],
 ['agency-form','Printed Cal-OSHA form',9,/Cal-OSHA/u,LCB_LISTED_AGENCY_FORM_SCOPE],
 ['data-sharing-agreement','Data-sharing agreement construction',8,/Generally,\s+use\s+a\s+hyphen[\s\S]*?present\s+or\s+past\s+participle\./u,LCB_DATA_SHARING_AGREEMENT_SCOPE],
 ['county-retirement-name','Printed County retirement law name',7,/County\s+Employees\s+Retirement\s+Law\s+of\s+1937/u,'The complete printed County Employees Retirement Law of 1937 receives word-case and Employees apostrophe checks. Complete year and name tokens are required. Different laws, extended names, quoted bill-local forms, literals, headings/tables, strikes and uncertain original source remain protected. This compares a printed source form; it does not determine legal identity.'],
 ...[['bill-room','bill room',9],['floor-plan','floor plan',10],['home-buyer','home buyer',11],['motor-home','motor home',12],['school-year','school year',13]].map(([variant,form,page])=>['open-noun-'+variant,'Listed open noun: '+form,page,new RegExp(form.replaceAll(' ','\\s+'),'u'),LCB_LISTED_OPEN_NOUN_ALIAS_SCOPE]),
 ['medi-cal-alias','Printed Medi-Cal program form',11,/Medi-Cal/u,LCB_LISTED_ALIAS_SCOPE],
 ['phasein-alias','Printed phase in verb form',12,/phase\s+in\s+\(v\.\)/u,LCB_LISTED_ALIAS_SCOPE],
];
export const LCB_EXPLICIT_CHECK_COVERAGE=checks.map(([key,title,page,,scope])=>({id:'lcb-explicit-'+key,title,status:'Selected explicit LCB conditions',guide:'lcb',page,text:scope}));
export function lcbExpansionSourceInventory(references){
 return checks.map(([key,title,page,pattern,scope])=>{
  const source=references.lcb.pages.find(p=>p.page===page)?.text||'',m=pattern.exec(source);
  if(!m)throw Error('Missing LCB source passage for '+key);
  return {id:'lcb-explicit-'+key,title:'LCB · '+title,guide:'lcb',page,status:'Partially automated',text:m[0],sourceStart:m.index,sourceEnd:m.index+m[0].length,scope};
 });
}
