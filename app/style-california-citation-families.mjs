// These source-form checks never decide which law or edition the author meant.
// Each record supplies its own complete citation evidence to the common guard.
import {hasSupportedCaliforniaLegislativeSession} from './style-california-enactment-forms.mjs';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export const CALIFORNIA_CODE_CITATION_ABBREVIATIONS=Object.freeze(['Bus. & Prof. Code','Cal. U. Com. Code','U. Com. Code','Civ. Code','Code Civ. Proc.','Corp. Code','Ed. Code','Elec. Code','Evid. Code','Fam. Code','Fin. Code','Fish & G. Code','Food & Agr. Code','Gov. Code','Harb. & Nav. Code','Health & Saf. Code','Ins. Code','Lab. Code','Mil. & Vet. Code','Pen. Code','Prob. Code','Pub. Contract Code','Pub. Resources Code','Pub. Util. Code','Rev. & Tax. Code','Sts. & Hy. Code','Unemp. Ins. Code','Veh. Code','Wat. Code','Welf. & Inst. Code']);
export const californiaCodeCitationPattern='(?:'+CALIFORNIA_CODE_CITATION_ABBREVIATIONS.map(escape).join('|')+')';
export function citationParentheticals(source){
 const out=[];let start=-1,depth=0;
 for(let p=0;p<source.length;p++){if(source[p]==='('){if(!depth)start=p;depth++;}else if(source[p]===')'&&depth){if(!--depth){if(p-start<3000)out.push({start,end:p+1,text:source.slice(start,p+1)});start=-1;}}}
 return out;
}
const sectionNumber='\\d+[A-Za-z]*(?:\\.\\d+[A-Za-z]*)*';
const chain='\\([A-Za-z0-9]+\\)(?:\\([A-Za-z0-9]+\\))*';
const listConnector='(?:\\s*,\\s*(?:(?:and|&)\\s*)?|\\s+(?:and|&)\\s+|\\s*[-–]\\s*)';
const editionYear=/^\s*\((?:18|19|20)\d{2}\)/u;
function addedCitationFormCandidates(source){
 const out=[],regions=citationParentheticals(source),enclosing=(start,end)=>regions.find(r=>r.start<=start&&r.end>=end);
 const add=(r,index,text,section,page,reason,suggestion=null)=>out.push({start:r.start+index,end:r.start+index+text.length,evidenceStart:r.start,evidenceEnd:r.end,section,page,reason,suggestion});
 for(const r of regions){
  const head=new RegExp(californiaCodeCitationPattern+'\\s*,?\\s*(?<symbol>§{1,2}|secs?\\.)\\s*'+sectionNumber,'dgu');
  for(const m of r.text.matchAll(head)){
   let end=m.index+m[0].length,count=1;const et=/^\s+et\s+seq\./u.exec(r.text.slice(end));if(et)end+=et[0].length;
   const next=new RegExp('^'+listConnector+sectionNumber+'(?:\\s+et\\s+seq\\.)?','u');let n;
   while((n=next.exec(r.text.slice(end)))){count++;end+=n[0].length;}
   const plural=/^(?:§§|secs\.)$/u.test(m.groups.symbol),clean=/^\s*(?:[,;.)]|$)/u.test(r.text.slice(end));
   if(count>1&&!plural)add(r,m.index,r.text.slice(m.index,end),'§2:6',49,'A parenthetical list or range of separate code sections uses a plural section designation. Confirm the complete enumeration; do not treat the final section as an independent prose count.');
   else if(count===1&&plural&&clean){const text=r.text.slice(m.index,end);add(r,m.index,text,'§2:6',49,et?'A single section followed by et seq. takes one section symbol.':'A single code section uses a singular section designation. Confirm that the complete citation does not omit another intended section; no section number is inferred.',et?text.replace('§§','§').replace('secs.','sec.'):null);}
   const sub=new RegExp('^(?<gap>\\s*,?\\s*)(?<label>subds?\\.|subdivisions?)\\s+(?<first>'+chain+')','du').exec(r.text.slice(end));if(!sub)continue;
   const offset=end,firstLabels=[...sub.groups.first.matchAll(/\(([A-Za-z0-9]+)\)/gu)].map(p=>p[1]),type=s=>/^[a-z]+$/u.test(s)?'lower':/^[A-Z]+$/u.test(s)?'upper':/^\d+$/u.test(s)?'digit':'unknown',rootType=type(firstLabels[0]),innerTypes=firstLabels.slice(1).map(type),parts=[sub.groups.first];let subEnd=end+sub[0].length,and=false,ambiguous=false,roots=1;
   const nextSub=new RegExp('^(?<join>'+listConnector+')(?<part>'+chain+')','u');
   while((n=nextSub.exec(r.text.slice(subEnd)))){and||=/\band\b/u.test(n.groups.join);parts.push(n.groups.part);const labels=[...n.groups.part.matchAll(/\(([A-Za-z0-9]+)\)/gu)].map(p=>p[1]),kind=type(labels[0]);if(labels.length>1||kind===rootType&&!innerTypes.includes(kind))roots++;else if(kind===rootType||!innerTypes.includes(kind))ambiguous=true;subEnd+=n[0].length;}
   const isPlural=/^(?:subds\.|subdivisions)$/u.test(sub.groups.label),reasons=[];
   if(!sub.groups.gap.includes(','))reasons.push('Insert a comma between the section number and the subdivision designation.');
   if(and)reasons.push('Inside parentheses, separate subdivisions with a comma or ampersand rather than and.');
   if(parts.length>1&&!ambiguous&&isPlural!==(roots>1))reasons.push(roots>1?'Use the plural subdivision designation when citing separate subdivisions.':'Use the singular subdivision designation when the listed coordinates are subparts of one subdivision.');
   if(/^\s*,?\s*(?:paragraph|subparagraph|clause|par\.|cl\.)\s*\(/u.test(r.text.slice(subEnd)))reasons.push('Do not infer extra subdivision levels from generic paragraph or clause labels; track the statute’s exact terminology.');
   if(reasons.length)add(r,offset,r.text.slice(offset,subEnd),'§2:7',50,reasons.join(' ')+' Verify the statute’s exact enumeration before editing; no legal identity is inferred.');
  }
  // Each C.F.R. citation owns its own edition evidence. A year after another
  // semicolon-separated authority cannot silently satisfy this requirement.
  const coordinate=sectionNumber+'(?:'+chain+')*',cfr=new RegExp('\\d+\\s+C\\.F\\.R\\.\\s*(?<unit>§{1,2}|parts?|sections?)\\s*'+coordinate+'(?:'+listConnector+coordinate+')*','dgu');
  for(const m of r.text.matchAll(cfr)){
   const tail=r.text.slice(m.index+m[0].length),reasons=[];
   if(!/^§/u.test(m.groups.unit))reasons.push('A parenthetical C.F.R. citation uses the section symbol; federal regulations are designated as parts in prose.');
   if(!editionYear.test(tail))reasons.push('Identify the year of the C.F.R. edition used; a year attached to a different authority does not identify this edition.');
   if(reasons.length)add(r,m.index,m[0],'§2:44',81,reasons.join(' ')+' Verify the title, part and edition against the source; no missing coordinate is supplied.');
  }
 }
 // These prescriptions expressly apply both in prose and in parentheses.
 const courtRuleTitle='(?:(?:Cal\\.|California) Rules of Court|Rules Prof\\. Conduct|(?:State Bar )?Rules of Professional Conduct|Rules Proc\\. of State Bar|Rules of Procedure of the State Bar|State Bar Ct\\. Rules of Prac\\.|State Bar Court Rules of Practice|(?:Super\\. Ct\\.|Superior Court of|Ct\\. App\\.)[^;()]*?, Local Rules(?: of Ct\\.)?)';
 const rules=new RegExp(courtRuleTitle+',?\\s+rules?\\s+'+sectionNumber+'(?:-\\d+)*(?:'+chain+')*\\s*,?\\s*(?:subds?\\.|subdivisions?)\\s+'+chain,'gu');
 const federal=new RegExp('(?:\\d+\\s+U\\.S\\.C\\.(?:A\\.|S\\.)?\\s*§{1,2}\\s*'+sectionNumber+'|(?:title\\s+)?\\d+\\s+United States Code\\s+section\\s+'+sectionNumber+')(?:'+chain+')*\\s*,?\\s*(?:subds?\\.|subdivisions?)\\s+'+chain,'gu');
 for(const [pattern,section,page,reason]of [[rules,'§2:18',61,'California Rules of Court citations do not use subdivision or subd. for subparts, in prose or in parentheses.'],[federal,'§2:37',75,'United States Code citations do not designate subparts as subdivision or subd., in prose or in parentheses.']])for(const m of source.matchAll(pattern)){const r=enclosing(m.index,m.index+m[0].length)||{start:m.index,end:m.index+m[0].length,text:m[0]};add(r,m.index-r.start,m[0],section,page,reason+' Verify the current rule or statute and its precise subpart before editing.');}
 const cfrProse=new RegExp('\\d+\\s+(?:C\\.F\\.R\\.|Code of Federal Regulations)\\s*(?<unit>§{1,2}|parts?|sections?)\\s*'+sectionNumber+'(?:'+chain+')*(?:\\s*\\((?:18|19|20)\\d{2}\\))?','gu');
 for(const m of source.matchAll(cfrProse)){if(enclosing(m.index,m.index+m[0].length))continue;const reasons=[];if(!/^parts?$/u.test(m.groups.unit))reasons.push('Designate a federal regulation as a part in prose; the section symbol belongs in a parenthetical citation.');if(!/\((?:18|19|20)\d{2}\)$/u.test(m[0]))reasons.push('Identify the C.F.R. edition year in parentheses.');if(reasons.length)add({start:m.index,end:m.index+m[0].length},0,m[0],'§2:44',81,reasons.join(' ')+' Verify the title, part and edition; no missing value is inferred.');}
 const jury=/(?<![\p{L}\p{N}\p{M}_])(?:CALJIC|BAJI)\s+(?:(?<label>No:|No\.?|Nos\.?|number|#)\s*)?\d+(?:\.\d+)*(?![\p{L}\p{N}\p{M}_]|\.\d)/gu;
 for(const m of source.matchAll(jury)){if(m.groups.label==='No.')continue;const r=enclosing(m.index,m.index+m[0].length)||{start:m.index,end:m.index+m[0].length};add(r,m.index-r.start,m[0],'§3:5',96,'CALJIC and BAJI instruction citations always use No. for number, both in prose and in parentheses. Instruction identity, applicable version and historical context still require verification.',m[0].replace(/^(CALJIC|BAJI)\s+(?:(?:No:|No\.?|Nos\.?|number|#)\s*)?/u,'$1 No. '));}
 // Only initial reporter locations have this rule. at p./pp. short forms and
 // separately labelled supplement pages retain their own source conventions.
 const secondary=/\((?:18|19|20)\d{2}\)\s+\d+\s+(?:(?<annot>A\.L\.R\.(?:2d|3d|4th|5th|Fed\.)?)|[\p{L}.&’' -]+?\s+(?<journal>L\.Rev\.|L\.J\.|L\.Q\.))\s+(?<label>pp?\.|pages?)\s+\d+/gu;
 for(const m of source.matchAll(secondary)){
  let r=enclosing(m.index,m.index+m[0].length);if(!r&&m.groups.annot){const before=/(?:Annotation|Annot\.)[^;]*$/u.exec(source.slice(0,m.index));if(!before)continue;r={start:before.index,end:m.index+m[0].length};}
  r||={start:m.index,end:m.index+m[0].length};const prefix=source.slice(r.start,m.index).split(';').at(-1);
  if(/\b(?:supra|id\.|ibid\.)/iu.test(prefix)||m.groups.annot&&!/\b(?:Annot\.|Annotation)/u.test(prefix))continue;
  add(r,m.index-r.start,m[0],m.groups.annot?'§3:7[A]':'§3:8[A]',m.groups.annot?99:100,'An initial annotation or law-periodical reporter location gives the inception page without page or p. Verify that this is the initial reporter location; short-reference and supplement-page conventions are different.');
 }
 return out;
}
export function californiaCitationFamilyCandidates(source){
 const result=[],add=(m,r,section,page,reason,suggestion=null)=>result.push({start:m.start+r.index,end:m.start+r.index+r[0].length,evidenceStart:m.start,evidenceEnd:m.end,suggestion,section,page,reason});
 for(const m of citationParentheticals(source)){
  const text=m.text;
  for(const missing of text.matchAll(new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])'+californiaCodeCitationPattern+'(?<gap>\\s*)(?<symbol>§{1,2}|secs?\\.)\\s*\\d+(?:\\.\\d+)*','dgu'))){const [a,b]=missing.indices.groups.gap,[c,e]=missing.indices.groups.symbol;add(m,{0:text.slice(a,b)||text.slice(c,e),index:a===b?c:a},'§2:6',49,'A parenthetical code citation separates the code designation from the section designation with a comma.',a===b?', '+text.slice(c,e):', ');}
  // Context is the complete balanced citation, including nested subdivisions.
  const code=new RegExp(californiaCodeCitationPattern+'\\s*,?\\s*§{1,2}\\s*\\d+[A-Za-z]*(?:\\.\\d+[A-Za-z]*)*','u').exec(text);
  if(code){
   const tail=text.slice(code.index+code[0].length);
   const subdivision=/^\s*,?\s*(?:subdivision|subdivisions)\s+\([A-Za-z0-9]+\)/u.exec(tail);
   if(subdivision)add(m,{...subdivision,index:code.index+code[0].length+subdivision.index},'§2:6–2:7',49,'Within a parenthetical California code citation, use the subdivision abbreviation. Confirm the statute’s exact enumeration; no subdivision identity is inferred.');
   const attached=/^\([A-Za-z0-9]+\)/u.exec(tail);
   if(attached)add(m,{0:code[0]+attached[0],index:code.index},'§2:7',50,'A directly attached parenthetical can confuse a section suffix with a subdivision. Check the statute’s exact designation and any expressly adopted short form before editing.');
   const multiple=new RegExp(californiaCodeCitationPattern+'\\s*,\\s*§(?!§)\\s*\\d+[A-Za-z]*(?:\\.\\d+)*(?:\\s*,\\s*|\\s+(?:and|&)\\s+)\\d+[A-Za-z]*(?:\\.\\d+)*','u').exec(text);
   if(multiple)add(m,multiple,'§2:6',49,'A parenthetical reference to multiple code sections uses the double section symbol. Confirm that these numbers identify separate sections before editing.');
  }
  const constitution=/(?:U\.S\.|Cal\.) Const\.,?\s+arts?\.\s+(\d+)(?![\p{L}\p{N}\p{M}_])/u.exec(text);
  if(constitution)add(m,constitution,'§2:1–2:3',45,'Constitutional article designations use Roman numerals. Confirm the intended article against the cited constitution; no article number is selected.');
  const regs=/Cal\. Code Regs\.,?\s*§{1,2}\s*\d+(?:\.\d+)*/u.exec(text);
  if(regs)add(m,regs,'§2:16[A]',58,'A California regulation citation needs its title number as well as its section number. The title cannot be inferred from the section.');
  const rules=/(?:Cal\.|California) Rules of Court,?\s+rule\s+\d+(?:\.\d+)*\s*,?\s*(?:subd\.|subdivision)\s*\([A-Za-z0-9]+\)/u.exec(text);
  if(rules)add(m,rules,'§2:18',61,'Rules of Court citations attach their subparts without the designation subdivision or subd. Confirm the current rule and exact subpart before editing.');
  const federal=/\d+\s+U\.S\.C\.(?:A\.|S\.)?\s*§{1,2}\s*\d+[A-Za-z]*(?:[-.]\d+)*\s*,?\s*(?:subd\.|subdivision)\s*\([A-Za-z0-9]+\)/u.exec(text);
  if(federal)add(m,federal,'§2:37',75,'Federal code citations do not designate subparts as subdivision or subd. Confirm the federal section and subpart; a California subdivision convention does not establish it.');
  const bill=/(?:Sen\.|Assem\.) Bill No\.\s*\d+/u.exec(text);
  if(bill&&!hasSupportedCaliforniaLegislativeSession(text))add(m,bill,'§2:25[A], [C]',65,'A California bill citation identifies its legislative session. The source uses single-year sessions before 1973 and two-year sessions thereafter. Confirm the session and any cited section; no year or bill identity is inferred.');
  const rest=/(?:Restatement (?:Second|Third) of|Rest\.(?:2d|3d)?)\s+[\p{L}\p{M}, ]+\s*,?\s*§{1,2}\s*\d+(?:\.\d+)*\s*,\s*(?:com\.|comment|illus\.|illustration)\s+[A-Za-z0-9]+/u.exec(text);
  if(rest&&!/\bpp?\.\s*\d/u.test(text.slice(rest.index+rest[0].length)))add(m,rest,'§3:6',98,'A Restatement comment or illustration citation includes its page. Verify the cited edition or draft and page; no page number is guessed.');
  const treatise=/\((?:\d+(?:st|nd|rd|th|d)|rev\.)\s+ed\.\)/u.exec(text);
  if(treatise&&/\b(?:Witkin|Practice Guide|Summary of Cal\. Law|Treatise)\b/u.test(text))add(m,treatise,'§3:1[A]',89,'A treatise citation needs the publication year for the volume cited as well as its edition. Check the title page and volume; the missing year cannot be inferred.');
 }
 return [...result,...addedCitationFormCandidates(source)];
}
