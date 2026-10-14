import {LCB_DIGEST_PERCENT_SCOPE} from './style-lcb-digest-percent.mjs';
import {LCB_INCLUSIVE_RANGE_SCOPE} from './style-lcb-inclusive-ranges.mjs';
import {LCB_DOLLAR_MINIMUM_SCOPE} from './style-lcb-dollar-minimum.mjs';
import {LCB_INCOME_SERIES_SCOPE} from './style-lcb-income-series.mjs';
import {LCB_LISTED_INCLUDING_BOUNDARY_SCOPE} from './style-lcb-listed-including-boundary.mjs';
import {LCB_LISTED_AGENCY_FORM_SCOPE} from './style-lcb-listed-agency-form.mjs';
import {LCB_DATA_SHARING_AGREEMENT_SCOPE} from './style-lcb-data-sharing-agreements.mjs';
import {LCB_LISTED_OPEN_NOUN_ALIAS_SCOPE} from './style-lcb-listed-open-noun-aliases.mjs';
import {LCB_LISTED_ALIAS_SCOPE} from './style-lcb-listed-aliases.mjs';

const checks=[
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
