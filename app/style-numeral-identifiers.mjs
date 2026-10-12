import {nounHeadPattern} from './style-noun-heads.mjs';
import {dividedCalendarDates} from './style-calendar-dates.mjs';
// Scope a complete legal serial number instead of protecting its leading
// digits while rewriting a trailing r-8 component as an ordinary count.
const identifier=String.raw`\d+(?:\.\d+)*[a-z]*(?:\s*-\s*\d+(?:\.\d+)*[a-z]*)*(?:\s*\([a-z\d]+\))*`;
export const COUNTED_CLAUSE_END=String.raw`(?=\s*(?:[,;:.)]|$)|\s+(?:and|or|under|pursuant|with|without|of|in|for|is|are|was|were|shall|must|may|will|can|could|should|would|have|has|do|does|did|remain|remains|apply|applies|complete|completes|submit|submits|file|files|receive|receives|perform|performs|serve|serves|participate|participates|attend|attends|qualify|qualifies)\b)`;
const quantity=String.raw`(?:${nounHeadPattern}|technicians?|veterinarians?|days?|weeks?|months?|years?|hours?|minutes?|seconds?|feet|foot|inches?|meters?|miles?|pounds?)`;
const citationEnd=String.raw`(?!\s+(?:(?:licensed|registered|public|private|qualified|eligible|additional|full-time|part-time)\s+)*${quantity}\b${COUNTED_CLAUSE_END})`;
const series=identifier+String.raw`(?:\s*(?:,\s*(?:(?:and|or)\s*)?|(?:and|or|to|through)\s+)${identifier}${citationEnd})*`;
const named=new RegExp(String.raw`\b(?:Sections?|Subsections?|Secs?\.?|Articles?|Chapters?|Paragraphs?|Subparagraphs?|Subdivisions?|Clauses?)\s+${series}`,'gi');
const federal=String.raw`(?:U\.?\s*S\.?\s*C\.?|C\.?\s*F\.?\s*R\.?)`,section=String.raw`(?:§\s*|(?:Sections?|Secs?\.?)\s+)?`;
const federalReference=new RegExp(String.raw`\b(?:\d+\s+)?${federal}\s+${section}${series}`,'gi');
const year=String.raw`\d{4}\s*-\s*\d{2,4}`,yearSeries=year+String.raw`(?:\s*(?:,\s*(?:(?:and|or)\s*)?|(?:and|or|to|through)\s+)${year})*`;
const yearLabel=String.raw`(?:(?:fiscal|rate|school|academic|calendar|tax)\s+years?|Regular\s+Sessions?)`;
const yearPatterns=[new RegExp(String.raw`\b${yearSeries}\s+${yearLabel}\b`,'gi'),new RegExp(String.raw`\b${yearLabel}\s+${yearSeries}\b`,'gi')];
const virus=/\b(?:SARS\s*-\s*CoV\s*-\s*[12]|COVID\s*-\s*19)(?![\p{L}\p{N}_])/giu;
const letters=/\bAll\s+Plan\s+Letter\s+\d{2}\s*-\s*\d{3}(?![\p{L}\p{N}_-])/giu;
const orders=/\bExecutive\s+Order\s+(?:No\.?\s*)?[A-Z]\s*-\s*\d{1,3}\s*-\s*\d{2,4}(?![\p{L}\p{N}_-])/giu;
// Explicit form and roadway labels establish serial identifiers. Keep the
// complete code, including its zero-leading suffix, distinct from a nearby
// quantity. A bare capitalized acronym does not establish a form identifier.
const formCodes=/\bforms?\s+(?:No\.?\s*)?[A-Z]{1,8}\s*-\s*\d+(?:\s*-\s*\d+)*(?![\p{L}\p{N}_-])/giu;
// A following explicit form label establishes the same serial role, including
// separated-letter prefixes. It does not protect an unlabelled acronym/count.
const labelledFormSuffix=/\b(?:[A-Z](?:\.[A-Z]){1,7}\.?|[A-Z]{1,8})(?:\s*-\s*[A-Z]{1,8}){0,7}\s*-\s*\d+(?:\s*-\s*\d+)*(?![\p{L}\p{N}_-])\s+forms?\b/gu;
const roadways=/\b(?:Interstate|(?:State|U\.?\s*S\.?)\s+(?:Route|Highway))\s+\d+(?![\p{L}\p{N}_-])/gu;
const system=String.raw`(?:California\s+Longitudinal\s+Pupil\s+Achievement\s+Data\s+System|CALPADS)`;
const education=[
 new RegExp(String.raw`\b${system}(?:\s+as\s+of\s+the(?:\s+\d{4}\s*-\s*\d{2,4})?)?\s+Fall\s+1\b`,'g'),
 new RegExp(String.raw`\bFall\s+1\s+census\s+day\s+pupil\s+data\s+submitted\s+through\s+the\s+${system}\b`,'g'),
 /\bFirst\s+5\s+county\s+commissions?\b/g,
 /\bPK\s*-\s*3\s+early\s+childhood\s+education\s+specialist\s+instruction\s+credential\b/g,
];
export function numeralIdentifierRanges(source){
 return [...[named,federalReference,...yearPatterns,virus,letters,orders,formCodes,labelledFormSuffix,roadways,...education].flatMap(pattern=>[...source.matchAll(pattern)].map(m=>({start:m.index,end:m.index+m[0].length}))),...dividedCalendarDates(source).map(({start,end})=>({start,end}))];
}
