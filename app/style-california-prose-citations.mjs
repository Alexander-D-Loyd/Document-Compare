import {CALIFORNIA_CODES} from './data/california-codes.mjs';
import {californiaCodeCitationPattern} from './style-california-citation-families.mjs';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),name=s=>s.split(' ').map(escape).join('\\s+');
const fullCodes='(?:'+[...CALIFORNIA_CODES.map(e=>e.name),'California Uniform Commercial Code','Uniform Commercial Code'].sort((a,b)=>b.length-a.length).map(name).join('|')+')';
const number='\\d+[A-Za-z]*(?:[.-]\\d+[A-Za-z]*)*(?:\\([A-Za-z0-9]+\\))*';
const enumeration=number+'(?:\\s*(?:,\\s*(?:(?:and|or)\\s+)?|\\s+(?:and|or|to|through)\\s+)'+number+')*';
const subparts='(?:\\s*,\\s*subdivisions?\\s+(?:\\([A-Za-z0-9]+\\))+(?:(?:\\s*,\\s*|\\s+(?:and|or)\\s+)(?:\\([A-Za-z0-9]+\\))+)*'+')?';
const party="\\p{Lu}[\\p{L}\\p{M}’'.&-]*(?:\\s+(?:(?:of|the|and|&|ex\\.?|rel\\.?)\\s+)?\\p{Lu}[\\p{L}\\p{M}’'.&-]*){0,18}";
export const CITATION_CASE_TITLE='(?:'+party+'\\s+v\\.\\s+'+party+'|(?:In re|Adoption of|Estate of|Conservatorship of|Guardianship of|Matter of)\\s+'+party+')(?:\\s+\\('+party+'\\))?';
const knownReporter='(?:Cal\\.(?:\\s*(?:App\\.|Rptr\\.))?(?:\\s*(?:2d|3d|4th|5th))?(?:\\s+Supp\\.)?|U\\.\\s*S\\.|S\\.Ct\\.|L\\.Ed\\.(?:2d)?|Fed\\.|F\\.\\s*(?:2d|3d|4th)|F\\.\\s*Supp\\.(?:\\s*(?:2d|3d))?|F\\.R\\.D\\.|B\\.R\\.|P\\.(?:2d|3d)|N\\.E\\.(?:2d|3d)?|N\\.W\\.(?:2d)?|S\\.E\\.(?:2d)?|S\\.W\\.(?:2d|3d)?|So\\.(?:2d|3d)?|N\\.L\\.R\\.B\\.|F\\.T\\.C\\.|F\\.C\\.C\\.|I\\.C\\.C\\.|S\\.E\\.C\\.|All\\s+E\\.R\\.|Eng\\.Rep\\.|Q\\.B\\.|A\\.C\\.|I\\.C\\.J\\.|E\\.C\\.R\\.|S\\.C\\.R\\.)';
const genericReporter='(?:'+knownReporter+'|[A-Z][A-Za-z]*\\.(?:[A-Za-z.]*)(?:\\d+(?:d|th))?(?:\\s+[A-Z][A-Za-z.]+){0,3})';
const administrativeReporter='(?:Cal\\.\\s+(?:P\\.U\\.C\\.|Comp\\.Cases|State\\s+Bar\\s+Ct\\.\\s+Rptr\\.)|Ops\\.Cal\\.Atty\\.Gen\\.)';
const pinpoint='(?:\\d+|_+)(?:\\s*[-–]\\s*\\d+)?',pointPages=pinpoint+'(?:\\s*,\\s*'+pinpoint+')*';
const caseLocation='(?:\\d+|_+)\\s+'+genericReporter+'\\s+(?:(?:at\\s+(?:pp?\\.|pages?)\\s+)?'+pointPages+')';
export const CITATION_CASE_LOCATION=caseLocation;
const year='[12]\\d{3}',caseYear='\\((?:[^()]{0,90}?\\s+)?'+year+'\\)';
const federalCode='\\d+\\s+U\\.S\\.C\\.(?:A\\.|S\\.)?\\s*(?:sections?\\s+|§{1,2}\\s*)'+enumeration;
const patterns=[
 CITATION_CASE_TITLE+'\\s*'+caseYear+'\\s+'+caseLocation,
 CITATION_CASE_TITLE+'\\s*,?\\s+'+caseLocation+'(?:\\s*'+caseYear+')?',
 CITATION_CASE_TITLE+'\\s*\\((?=[^()]{0,240}\\b(?:No\\.|Nos\\.)\\s*[A-Za-z0-9-])(?=[^()]{0,240}'+year+')[^()]{1,240}\\)',
 CITATION_CASE_TITLE+'\\s*'+caseYear,
 party+'\\s*'+caseYear+'\\s+(?:\\d+|_+)\\s+'+administrativeReporter+'\\s+'+pointPages,
 '(?:'+CITATION_CASE_TITLE+'|'+party+'),\\s*supra,?\\s+'+caseLocation,
 '(?:'+CITATION_CASE_TITLE+'|'+party+'),\\s*supra,?\\s+(?:at\\s+)?(?:pp?\\.|pages?)\\s+'+pointPages,
 CITATION_CASE_TITLE+'\\s*'+caseYear+'\\s+(?:(?:No\\.|Nos\\.)\\s+[A-Za-z0-9-]+(?:,\\s*)?)?(?:'+year+'\\s+(?:WL|[A-Za-z. ]{0,30}LEXIS)\\s+\\d+)',
 '(?:\\d+|_+)\\s+(?:'+knownReporter+'|'+administrativeReporter+')\\s+'+pointPages+'(?:\\s+\\('+year+'\\))?',
 fullCodes+'\\s+(?:former\\s+)?sections?\\s+'+enumeration+subparts,
 '(?:[Ss]ections?\\s+'+enumeration+subparts+'\\s+of\\s+the\\s+'+fullCodes+')',
 californiaCodeCitationPattern+'\\s+(?:sections?\\s+|§{1,2}\\s*)'+enumeration+subparts,
 '(?:'+CALIFORNIA_CODES.map(e=>escape(e.shorthand)).join('|')+')\\s*§{1,2}\\s*'+enumeration,
 '(?:[Aa]rticles?\\s+(?:[IVXLCDM]+|\\d+)(?:\\s*,\\s*sections?\\s+'+enumeration+')?\\s+of\\s+the\\s+(?:California|United States|state|federal)\\s+Constitution)',
 '(?:U\\.S\\.|Cal\\.)\\s+Const\\.,?\\s+(?:arts?\\.|amends?\\.)\\s+(?:[IVXLCDM]+|\\d+)(?:\\s*,\\s*(?:§{1,2}\\s*|sections?\\s+)'+enumeration+')?',
 '(?:California|United States|state|federal)\\s+Constitution,?\\s+articles?\\s+(?:[IVXLCDM]+|\\d+)(?:\\s*,\\s*sections?\\s+'+enumeration+')?',
 'California\\s+Code\\s+of\\s+Regulations,?\\s+title\\s+\\d+,?\\s+sections?\\s+'+enumeration+subparts,
 'Cal\\.\\s+Code\\s+Regs\\.,?\\s+(?:tit\\.|title)\\s+\\d+,?\\s*(?:§{1,2}\\s*|sections?\\s+)'+enumeration+subparts,
 'Cal\\.\\s+Code\\s+Regs\\.,?\\s*§{1,2}\\s*'+enumeration,
 'California\\s+Rules\\s+of\\s+Court,?\\s+rules?\\s+'+enumeration,
 'Cal\\.\\s+Rules\\s+of\\s+Court,?\\s+rules?\\s+'+enumeration,
 federalCode,
 '(?:Title\\s+)?\\d+\\s+United\\s+States\\s+Code\\s+sections?\\s+'+enumeration,
 '(?:[Ss]ections?\\s+'+enumeration+'\\s+of\\s+title\\s+\\d+\\s+of\\s+the\\s+United\\s+States\\s+Code)',
 '\\d+\\s+Code\\s+of\\s+Federal\\s+Regulations\\s+parts?\\s+'+enumeration+'(?:\\s+\\((?:18|19|20)\\d{2}\\))?',
 '\\d+\\s+C\\.F\\.R\\.\\s*(?:§{1,2}\\s*|parts?\\s+)'+enumeration+'(?:\\s+\\('+year+'\\))?',
 '(?:Sen\\.|Assem\\.)\\s+Bill\\s+No\\.\\s*\\d+(?:\\s*\\(\\d{4}(?:[-–]\\d{4})?\\s+(?:Reg\\.|\\d+(?:st|nd|rd|th|d)\\s+Ex\\.)\\s+Sess\\.\\))?(?:\\s+(?:sections?\\s+|§{1,2}\\s*)'+enumeration+')?',
 '(?:Fed\\.\\s+Rules?\\s+(?:Civ\\.Proc\\.|Crim\\.Proc\\.|Evid\\.|App\\.Proc\\.)|Fed\\.R\\.(?:Civ|Crim|App)\\.P\\.|Fed\\.R\\.Evid\\.),?\\s*(?:rules?\\s+)?'+enumeration,
 '(?:CALJIC|BAJI|CACI|CALCRIM)\\s+(?:No\\.\\s*)?'+enumeration+'(?:\\s*\\((?:[^()]{0,40}\\s+)?'+year+'\\))?',
 '(?:Senate|Assembly)\\s+Bill\\s+(?:No\\.\\s*)?\\d+\\s*\\(\\d{4}(?:[-–]\\d{4})?\\s+(?:Reg\\.|Regular|\\d+(?:st|nd|rd|th|d)\\s+Ex\\.)\\s+Sess(?:ion|\\.)\\)(?:\\s+sections?\\s+'+enumeration+')?',
 '\\d+\\s+Witkin(?:\\s+and\\s+[A-Z][a-z]+)?,\\s+[A-Z][\\p{L}\\p{M} \'’,-]{1,90}\\s+\\((?:\\d+(?:st|nd|rd|th|d)\\s+ed\\.\\s+)?(?:18|19|20)\\d{2}\\)\\s+sections?\\s+'+enumeration+'(?:,\\s+pages?\\s+\\d+(?:[-–]\\d+)?)?'
].map(p=>new RegExp('(?<![\\p{L}\\p{N}\\p{M}_/#@-])'+p+'(?![\\p{L}\\p{N}\\p{M}_/#@-])','gu'));
export function proseCitationRegions(source,enclosed=[]){
 const found=[];
 for(const pattern of patterns)for(const m of source.matchAll(pattern)){
  const r={start:m.index,end:m.index+m[0].length,text:m[0]};
  if(enclosed.some(p=>p.start<=r.start&&p.end>=r.end))continue;
  found.push(r);
 }
 return found.sort((a,b)=>a.start-b.start||b.end-a.end).filter((r,n,all)=>!all.some((p,j)=>j<n&&p.start<=r.start&&p.end>=r.end));
}
export function citationNumberCoordinates(region){
 const out=[],add=(a,b)=>out.push({start:region.start+a,end:region.start+b,kind:'Source-labelled citation coordinates'}),text=region.text;
 // The same complete structural witnesses apply inside a parenthetical.
 // In particular a federal trial reporter must not expose its volume/page
 // simply because the original California-only reporter recognizer missed it.
 for(const r of proseCitationRegions(text))add(r.start,r.end);
 // These are explicit locators and bibliographic dates/editions, not all
 // numbers in a citation-bearing passage. Explanatory prose stays checkable.
 const coordinate='[A-Z]?\\d+[A-Za-z]*(?:[.:-]\\d+[A-Za-z]*)*(?:\\([A-Za-z0-9]+\\))*',list=coordinate+'(?:\\s*(?:,\\s*|(?:and|&)\\s+)'+coordinate+')*';
 const labels=[new RegExp('§{1,2}\\s*'+list+'(?=\\s*(?:[,.;)\\]]|$))','gu'),new RegExp('\\b(?:pp?\\.|pages?|fns?\\.|footnotes?|tit\\.|arts?\\.|rules?|Nos?\\.|secs?\\.|sections?|parts?|chs?\\.|chapters?|pars?\\.|paragraphs?|apps?\\.|appendices|appen\\.)\\s*'+list+'(?=\\s*(?:[,.;)\\]]|$))','gu'),/\(\s*(?:\d+(?:st|nd|rd|th|d)\s+ed\.\s+)?[12]\d{3}(?:[-–]\d{4})?\s*\)/gu,/\(\s*\d+(?:st|nd|rd|th|d)\s+ed\.\s*\)/gu];
 for(const pattern of labels)for(const m of text.matchAll(pattern))add(m.index,m.index+m[0].length);
 // A bibliographic work title is source wording, not an ordinary quantity.
 // This bounded author/title/edition witness preserves it without asserting
 // the title or edition is authentic; the accompanying task asks for that.
 for(const m of text.matchAll(/(?<![\p{L}\p{N}\p{M}_])\d+\s+Witkin(?:\s+(?:and|&)\s+[A-Z][a-z]+)?,\s*[^()]{1,240}\(\s*(?:\d+(?:st|nd|rd|th|d)\s+ed\.\s+)?(?:18|19|20)\d{2}\s*\)/gu))add(m.index,m.index+m[0].length);
 for(const m of text.matchAll(/(?<![\p{L}\p{N}\p{M}_])(?<volume>\d+)\s+(?:Witkin|Cal\.Jur\.|Am\.Jur\.|C\.J\.S\.)/dgu)){const [a,b]=m.indices.groups.volume;add(a,b);}
 for(const m of text.matchAll(/(?<![\p{L}\p{N}\p{M}_])\d+\s+(?:U\.S\.C\.(?:A\.|S\.)?|C\.F\.R\.|Fed\.Reg\.|A\.L\.R\.(?:2d|3d|4th|5th|Fed\.)?)(?![\p{L}\p{N}\p{M}_])/gu))add(m.index,m.index+m[0].length);
 return out;
}
