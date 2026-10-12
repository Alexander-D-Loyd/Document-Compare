import {styleContext,styleRangeBlocked} from './style-context.mjs';
import {openIncomeQualifierBefore} from './style-income-qualifiers.mjs';
import {styleEvidenceGuard} from './style-evidence.mjs';

// These shared elements have explicit LCB forms. Do not infer suspension
// from every adjective/conjunction: 'young and part-time workers' is valid.
const families=[
 {first:'full|half|part',last:'full|half|part',base:'time',heads:'employees?|workers?|staff|personnel|students?|positions?|employment|jobs?|work|equivalents?',page:10},
 {first:'long|short',last:'long|short',base:'term',heads:'money\\s+rates?|loans?|agreements?|contracts?|plans?|planning|financing|investments?|rates?|obligations?|benefits?|effects?|care|goals?|strategies',page:11},
 {first:'low',last:'moderate',base:'income',heads:'households?|families|residents?|individuals?|persons?|housing',page:11},
 {first:'moss|ivy',last:'moss|ivy',base:'covered',heads:'walls?',page:8},
];

export function sharedModifierIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const blocked=styleEvidenceGuard(doc,ctx),cutsWord=index=>/[\p{L}\p{N}\p{M}_]$/u.test(doc.text.slice(Math.max(0,index-2),index))&&/^[\p{L}\p{N}\p{M}_]/u.test(doc.text.slice(index,index+2));
 for(const family of families){
  const re=new RegExp('\\b((?:'+family.first+')-?(?:,\\s+(?:'+family.first+')-?)*)(\\s*(?:,\\s*)?(?:and|or)\\s+)('+family.last+')([\\s-]+)('+family.base+')(?=(\\s+(?:'+family.heads+')(?![\\p{L}\\p{N}\\p{M}_])))','giu');
  for(const matched of source.matchAll(re)){
   const m=[...matched];m.index=matched.index;
   // LCB page 7 keeps extremely low and very low open even in the longer
   // income series. Do not start a suspended-hyphen suggestion inside them.
   // A later bare low can still need its own hyphen; retain exact offsets.
   if(family.base==='income'&&openIncomeQualifierBefore(source,m.index)){
    const first=/^low-?,\s+/i.exec(m[1]);if(!first)continue;
    m.index+=first[0].length;m[0]=m[0].slice(first[0].length);m[1]=m[1].slice(first[0].length);
   }
   const start=m.index,end=start+m[0].length,headEnd=matched.index+matched[0].length+matched[6].length;
   const firstCorrect=m[1].split(/,\s*/).every(t=>t.endsWith('-')),lastCorrect=(m[3]+m[4]+m[5]).replace(/-[ \t]*\n\s*/g,'-').replace(/\s+/g,' ').toLowerCase()===(m[3]+'-'+family.base).toLowerCase();
   if(firstCorrect&&lastCorrect||m[1].toLowerCase()===m[3].toLowerCase()||ctx.at(start)==='Heading'||styleRangeBlocked(doc,matched.index,headEnd)||blocked(matched.index,headEnd)||cutsWord(matched.index)||cutsWord(headEnd))continue;
   if(/[\p{L}\p{N}-]/u.test(source[start-1]||'')||m[0]===m[0].toUpperCase())continue;
   if(/^[A-Z]/.test(m[3])&&/^\s+[A-Z]/.test(source.slice(end,end+35)))continue;
   const suggestion=(m[1].split(/,\s*/).map(t=>t.replace(/-$/,'')+'-').join(', ')+m[2]+m[3]+'-'+family.base).replace(/\s+/g,' ');
   const message='The recognized modifiers share “'+family.base+'” before a noun. Retain a hyphen where that ending is omitted and hyphenate the complete final unit modifier; do not add the omitted word. This is one correction for the whole shared expression.';
   issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:family.page,guidePrintedPage:references.lcb.pages[family.page-1].printedPage,rule:'Hyphenation: Shared elements',category:'Modifier hyphenation',context:ctx.at(start),checkId:'shared-modifiers',conflict:false,message,references:[
    {guideId:'lcb',guideName:'LCB Style Manual',guidePage:family.page,guidePrintedPage:references.lcb.pages[family.page-1].printedPage,rule:'Hyphenation examples',preferred:suggestion,ruleText:family.base==='covered'?'LCB generally hyphenates unit modifiers immediately before the word modified, especially with a present or past participle.':family.base==='time'?'LCB lists “full- or part-time” as a unit modifier. Its half-time and part-time examples also retain the hyphen.':family.base==='income'?'LCB page 11 lists “low- and moderate-income” as a unit modifier; page 7 gives “low-, and moderate-income households” within a longer series.':'LCB lists long-term and short-term as unit modifiers. Page 11 also illustrates retention of an omitted shared ending with “low- and moderate-income”.'},
    {guideId:'gpo',guideName:'GPO Style Manual',guidePage:117,guidePrintedPage:references.gpo.pages[116].printedPage,rule:'6.23',preferred:suggestion,ruleText:'GPO 6.23 retains hyphens when hyphenated compounds share an element omitted in all but the last term; it illustrates “long- and short-term money rates”.'}
   ]});
  }
 }
 return issues;
}
