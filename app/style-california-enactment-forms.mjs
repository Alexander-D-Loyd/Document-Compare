// Observable citation fields from CSM chapter 2. Missing fields request source
// verification; they never establish an enactment, jurisdiction, date or value.
const session=/^\((?<first>[12]\d{3})(?:[-–](?<last>[12]\d{3}))?\s+(?:Reg\.|\d+(?:st|nd|rd|th|d)\s+Ex\.)\s+Sess\.\)$/u;
export function supportedCaliforniaLegislativeSession(text){
 const m=session.exec(text);if(!m)return false;const first=Number(m.groups.first),last=m.groups.last&&Number(m.groups.last);
 return last===undefined?first<1973:first>=1973&&first%2===1&&last===first+1;
}
export function hasSupportedCaliforniaLegislativeSession(text){
 return [...text.matchAll(/\([12]\d{3}(?:[-–][12]\d{3})?\s+(?:Reg\.|\d+(?:st|nd|rd|th|d)\s+Ex\.)\s+Sess\.\)/gu)].some(m=>supportedCaliforniaLegislativeSession(m[0]));
}
function enclosures(source){
 const rows=[];let start=-1,depth=0;for(let p=0;p<source.length;p++){if(source[p]==='('){if(depth++===0)start=p;}else if(source[p]===')'&&depth&&--depth===0)rows.push({start,end:p+1,text:source.slice(start,p+1)});}return rows;
}
function authorities(region){
 const rows=[];let start=1,depth=0;for(let p=1;p<region.text.length-1;p++){const c=region.text[p];if(c==='(')depth++;else if(c===')')depth--;else if(c===';'&&!depth){rows.push({start,end:p,text:region.text.slice(start,p)});start=p+1;}}rows.push({start,end:region.text.length-1,text:region.text.slice(start,-1)});return rows;
}
const date=/\b(?:Jan(?:uary)?\.?|Feb(?:ruary)?\.?|Mar(?:ch)?\.?|Apr(?:il)?\.?|May|June?|July?|Aug(?:ust)?\.?|Sept?(?:ember)?\.?|Oct(?:ober)?\.?|Nov(?:ember)?\.?|Dec(?:ember)?\.?)\s+\d{1,2}\s*,?\s+[12]\d{3}\b/u;
// A four-digit report/provision identifier is not publication-date evidence.
const year={test:text=>date.test(text)||/\(\s*(?:\d+(?:st|nd|rd|th|d)\s+ed\.\s+)?[12]\d{3}(?:\s+(?:supp\.|rev\.|new|ed\.))?\s*\)/u.test(text)||/(?:^|[,;(])\s*[12]\d{3}\s+U\.S\.\s+Code\s+Cong\./u.test(text)};
const page=/\b(?:pp?\.|pages?)\s+[A-Za-z]?\d+(?:[.-]\d+)*|\b(?:pp?\.|pages?)\s+[ivxlcdm]+\b/iu;
const short=/\b(?:supra|ibid\.|id\.)/iu;
const fieldText=text=>text.replaceAll('United States Code Congressional and Administrative News','U.S. Code Cong. & Admin. News').replaceAll('Statutes at Large','Stat.').replaceAll('Statutes','Stats.').replaceAll('Code of Federal Regulations','C.F.R.').replaceAll('Federal Register','Fed.Reg.').replaceAll('Public Law','Pub.L.').replaceAll('Executive Order','Exec. Order').replaceAll('Presidential Proclamation','Pres. Proclamation').replace(/\b(Senate|Assembly) (Joint |Concurrent )?Resolution\b/gu,(_,house,kind)=>(house==='Senate'?'Sen.':'Assem.')+' '+(kind==='Concurrent '?'Conc. ':kind||'')+'Res.').replace(/\b(Senate|Assembly) Constitutional Amendment\b/gu,(_,house)=>(house==='Senate'?'Sen.':'Assem.')+' Const. Amend.');
const federalMeasure=/(?:H\.R\.|Sen\.|H\.Res\.|Sen\.Res\.|H\.Con\.Res\.|Sen\.Con\.Res\.|H\.J\.Res\.|Sen\.J\.Res\.)\s+No\.\s*\d+(?![\p{L}\p{N}\p{M}_])/u;
const congress=/\b\d+(?:st|nd|rd|th|d)\s+Cong\./u,congressSession=/\b\d+(?:st|nd|rd|th|d)(?:\s+(?:and|&)\s+\d+(?:st|nd|rd|th|d))?\s+Sess\./u;
const stat=/\b\d+\s+Stat\.\s+\d+(?:[-–]\d+)?/u;
const check=(id,section,pageNumber,cue,read)=>({id,section,page:pageNumber,cue,read});
const checks=[
 check('statutes-coordinate-fields','§2:10–2:11',54,/\bStats\.\s*(?:[12]\d{3}\b|,?\s*(?:ch\.|chapter)(?![\p{L}\p{N}\p{M}_]))/u,text=>{
  const reasons=[];if(!/\bStats\.\s+[12]\d{3}\b/u.test(text))reasons.push('The cited Statutes reference does not supply its enactment year.');if(!/\b(?:ch\.|chapter)\s+\d+[A-Za-z]?\b/u.test(text)&&!/^.*?\bStats\.\s+[12]\d{3},?\s+p\.\s+[ivxlcdm]+\b/iu.test(text))reasons.push('For a chaptered session law, identify the chapter rather than substituting an ordinary page number; an uncodified initiative has a different source convention.');return reasons;
 }),
 check('annotated-commentary-fields','§2:9',53,/(?:West[’']s|Deering[’']s)\s+Ann\.[^;]*?Code/u,text=>{if(!/\b(?:Notes\b|note\b|com\.|Comments\b)/u.test(text))return [];const reasons=[];if(!year.test(text))reasons.push('Identify the publication or supplement year of the annotated-code volume used for this publisher-added material.');if(!page.test(text))reasons.push('Identify the publisher-added material’s page, separately from the statute’s own section.');return reasons;}),
 check('advance-service-fields','§2:10',54,/(?:Deering[’']s\s+Adv\.\s+Legis\.\s+Service|West[’']s\s+Cal\.\s+Legis\.\s+Service)/u,text=>{const reasons=[];if(!/\bNo\.\s*\d+/u.test(text))reasons.push('Identify the advance legislative-service pamphlet number.');if(!page.test(text))reasons.push('Identify the pamphlet page for the enactment; the service is temporary rather than a permanent Statutes citation.');return reasons;}),
 check('uncodified-collection-reference','§2:13',56,/(?:Wat\.-Uncod\.\s+Acts|Uncodified\s+(?:Initiative\s+Measures\s+and\s+)?Statutes)/u,text=>/\bStats\.\s+[12]\d{3}\b/u.test(text)?[]:['Verify both the session-law reference and the independently published uncodified collection. A publisher’s act or chapter number alone does not establish the original enactment.']),
 check('notice-register-fields','§2:16[B]',59,/\bCal\.\s+Reg\.\s+Notice\s+Register\b/u,text=>{
  const reasons=[];if(!/\bRegister\s+\d{2}(?:\d{2})?\b/u.test(text))reasons.push('Identify the notice-register year.');if(!/\bNo\.\s*\d+(?:-Z)?\b/u.test(text))reasons.push('Identify the notice-register issue number.');if(!page.test(text))reasons.push('Identify the page carrying the notice.');return reasons;
 }),
 check('california-resolution-session','§2:26',66,/(?:Sen\.|Assem\.)\s+(?:(?:Conc?\.|Joint)\s+)?Res\.\s+No\.\s*\d+/u,text=>hasSupportedCaliforniaLegislativeSession(text)?[]:['Identify the legislative session for the California resolution; historical single-year sessions and supported two-year sessions have distinct forms. The session is not inferred from the resolution number.']),
 check('california-amendment-session','§2:27',67,/(?:Sen\.|Assem\.)\s+Const\.\s+Amend\.\s+No\.\s*\d+/u,text=>hasSupportedCaliforniaLegislativeSession(text)?[]:['Identify the legislative session for the proposed constitutional amendment. An amendment proposed by a different body follows a different convention; no adoption or chapter status is inferred.']),
 check('legislative-counsel-opinion-fields','§2:29[A]',69,/\bOps\.\s+Cal\.\s+Legis\.\s+Counsel\b/u,text=>{const reasons=[];if(!/\bNo\.\s*\d+/u.test(text))reasons.push('Identify the Legislative Counsel opinion number.');if(!date.test(text))reasons.push('Identify the opinion date.');return reasons;}),
 check('ballot-pamphlet-fields','§2:34[A]',72,/\bBallot\s+Pamp\./u,text=>{const reasons=[];if(!/\b(?:Primary|Gen\.|General|Special)\s+Elec(?:\.|tion)(?![\p{L}\p{N}\p{M}_])/u.test(text))reasons.push('Identify the type of state election represented by the ballot pamphlet.');if(!date.test(text))reasons.push('Identify the election date; an unrelated publication year does not identify the election.');return reasons;}),
 check('public-law-fields','§2:38',76,/\bPub\.\s*L\.\s+No\.\s*\d+-\d+\b/u,text=>{const reasons=[];if(!date.test(text))reasons.push('Identify the full enactment date for the Public Law.');if(!stat.test(text))reasons.push('Supply the Statutes at Large volume and inception page, or verify the applicable slip-law/source circumstances.');return reasons;}),
 check('congressional-measure-fields','§2:41',77,federalMeasure,text=>{const reasons=[];if(!congress.test(text))reasons.push('Identify the Congress for the federal bill or resolution.');if(!congressSession.test(text))reasons.push('Identify the congressional session.');if(!year.test(text))reasons.push('Identify the year.');return reasons;}),
 check('congressional-report-fields','§2:42[A]',78,/\b(?:H\.R\.|Sen\.)\s*Rep\.\s+No\.\s*(?<number>\d+(?:-\d+)?)\b/u,(text,m)=>{const reasons=[],embedded=/^(\d+)-\d+$/u.exec(m.groups.number);if(!congress.test(text)&&!(embedded&&Number(embedded[1])>=91))reasons.push('Identify the Congress; in the source’s post-1969 report form the Congress can be part of the report number.');if(!congressSession.test(text))reasons.push('Identify the congressional session for this report.');if(!year.test(text))reasons.push('Identify the report year.');return reasons;}),
 check('congressional-document-fields','§2:42[B]',79,/\b(?:H\.R\.|Sen\.)\s*Doc\.\s+No\.\s*\d+\b/u,text=>{const reasons=[];if(!congress.test(text))reasons.push('Identify the Congress for the congressional document.');if(!congressSession.test(text))reasons.push('Identify the congressional session.');if(!year.test(text))reasons.push('Identify the document year.');return reasons;}),
 check('federal-register-date','§2:44',81,/\b\d+\s+Fed\.Reg\.\s+\d+(?:[-–]\d+)?\b/u,text=>date.test(text)?[]:['Identify the date of the Federal Register edition carrying this material; a bare volume/page or year does not establish that date.']),
 check('federal-rule-title','§2:46',82,/\bFed\.\s+Rules?\s+(?:Civ\.Proc\.|Crim\.Proc\.|App\.Proc\.|Evid\.)\s*,?\s+rules?\s+\d+/u,text=>/\b\d+\s+U\.S\.C\./u.test(text)?[]:['Identify the United States Code title accompanying this federal rule-set citation. Local federal rules have a different court-identification requirement; no title number is guessed.']),
 check('compilation-year','§2:47',83,/\bU\.S\.\s+Code\s+Cong\.\s*&\s*Adm(?:in)?\.\s+News\b/u,text=>year.test(text)?[]:['Identify the year of the United States Code Congressional and Administrative News source. The advance pamphlet and bound volume can have different locators; verify which was used.']),
 check('federal-executive-fields','§2:48',83,/\b(?:Exec\.\s+Order|Pres\.\s+(?:Proc\.|Proclamation))\s+No\.\s*\d+\b/u,text=>{const reasons=[];if(!date.test(text))reasons.push('Identify the document date for this executive order or presidential proclamation.');if(!/\b\d+\s+Fed\.Reg\.\s+\d+|\b3\s+C\.F\.R\./u.test(text))reasons.push('Verify the Federal Register publication or title 3 C.F.R. citation for this executive document.');if(/\b3\s+C\.F\.R\./u.test(text)&&!/(?:\b3\s+C\.F\.R\.\s*\d+\s*\([12]\d{3}\)|\b3\s+C\.F\.R\.\s*\([12]\d{3}\))/u.test(text))reasons.push('Identify the C.F.R. edition year separately from the document date.');return reasons;}),
 check('model-commentary-fields','§2:49',84,/\bModel\s+Pen\.\s+Code\s*&\s*Commentaries\b/u,text=>{const reasons=[];if(!/\b(?:com\.|commentary\b|note\b|fn\.)/u.test(text))reasons.push('Identify the type of material cited from the Code and Commentaries.');if(!/§\s*\d+/u.test(text))reasons.push('Identify the model-code section to which the commentary refers.');if(!page.test(text))reasons.push('Identify the commentary page; the commentary and enacted text must not be treated as the same authority.');return reasons;}),
 check('aba-opinion-fields','§2:50',84,/\bABA\b[^;]*?\b(?:opn\.|opinion)\s+No\.\s*\d+(?:-\d+)?/u,text=>{const reasons=[];if(!year.test(text))reasons.push('Identify the ABA opinion date.');if(!page.test(text))reasons.push('Identify the opinion page.');return reasons;}),
 check('aba-standard-date','§2:50',84,/\bABA\s+(?:Project\s+on\s+)?Stds\./u,text=>year.test(text)?[]:['Identify the date or edition of the ABA standards. A precise provision may locate standard text; commentary pages and unpaginated sources require separate verification.'])
];
const coordinate='[A-Za-z]?\\d+(?:[.\u2013-]\\d+[A-Za-z]?)*(?:\\([A-Za-z0-9]+\\))*';
const months='(?:Jan(?:uary)?\\.?|Feb(?:ruary)?\\.?|Mar(?:ch)?\\.?|Apr(?:il)?\\.?|May|June?|July?|Aug(?:ust)?\\.?|Sept?(?:ember)?\\.?|Oct(?:ober)?\\.?|Nov(?:ember)?\\.?|Dec(?:ember)?\\.?)';
const fullDate=months+'\\s+\\d{1,2}\\s*,?\\s+[12]\\d{3}';
const sessionBody='[12]\\d{3}(?:[-–][12]\\d{3})?\\s+(?:Reg\\.|\\d+(?:st|nd|rd|th|d)\\s+Ex\\.)\\s+Sess\\.';
const sourceYear='[12]\\d{3}(?:\\s+(?:supp\\.|ed\\.|rev\\.))?';
const locator='(?:§{1,2}|sections?|pp?\\.|pages?|ch\\.|chapter|res\\.\\s+ch\\.|resolution\\s+chapter|rule|std\\.|standard|No\\.)\\s*'+coordinate;
const publication='(?:\\d+\\s+(?:Fed\\.Reg\\.|Federal Register|Stat\\.|Statutes at Large)\\s+'+coordinate+'|3\\s+(?:C\\.F\\.R\\.|Code of Federal Regulations)(?:\\s+'+coordinate+')?|[12]\\d{3}\\s+(?:U\\.S\\. Code Cong\\. & Adm(?:in)?\\. News|United States Code Congressional and Administrative News))';
const metadata=new RegExp('^(?:\\s*\\((?:'+fullDate+'|'+sessionBody+'|'+sourceYear+'|\\d+(?:st|nd|rd|th|d)\\s+ed\\.\\s+[12]\\d{3})\\)|\\s*,?\\s*(?:'+publication+'|'+locator+'|(?:as amended\\s+)?'+fullDate+'))','u');
const prosePatterns=[
 '(?:Statutes|Stats\\.)\\s+[12]\\d{3}',
 '(?:Senate|Assembly)\\s+(?:(?:Joint|Concurrent)\\s+)?(?:Bill|Resolution|Constitutional Amendment)\\s+No\\.\\s*\\d+[A-Za-z]?',
 '(?:Sen\\.|Assem\\.)\\s+(?:(?:Conc?\\.|Joint)\\s+)?(?:Bill|Res\\.|Const\\.\\s+Amend\\.)\\s+No\\.\\s*\\d+[A-Za-z]?',
 '(?:Pub\\.\\s*L\\.|Public Law)\\s+No\\.\\s*\\d+-\\d+',
 '(?:H\\.R\\.|Sen\\.|H\\.Res\\.|Sen\\.Res\\.|H\\.Con\\.Res\\.|Sen\\.Con\\.Res\\.|H\\.J\\.Res\\.|Sen\\.J\\.Res\\.)\\s+No\\.\\s*\\d+',
 '(?:Executive Order|Exec\\. Order|Presidential Proclamation|Pres\\. (?:Proc\\.|Proclamation))\\s+No\\.\\s*\\d+',
 '(?:Governor[’\']s (?:Executive|Exec\\.) Order)\\s+No\\.\\s*[A-Z]-\\d+-\\d+',
 '(?:[12]\\d{3}\\s+)?(?:United States Code Congressional and Administrative News|U\\.S\\. Code Cong\\. & Adm(?:in)?\\. News)',
 'Ballot Pamp\\.,?\\s+(?:Primary|Gen\\.|General|Special)\\s+Elec(?:\\.|tion)',
 '(?:Rules of Professional Conduct|Rules of Procedure of the State Bar|State Bar Court Rules of Practice),?\\s+rule\\s+'+coordinate,
 '(?:Rules Prof\\. Conduct|Rules Proc\\. of State Bar|State Bar Ct\\. Rules of Prac\\.),?\\s+rule\\s+'+coordinate,
 '(?:Super\\. Ct\\.|Superior Court of|Ct\\. App\\.)[^;()\\n]*?, Local Rules(?: of Ct\\.)?,?\\s+rule\\s+'+coordinate,
 '(?:Model Penal Code|Model Pen\\. Code|ABA Model Rules Prof\\. Conduct|ABA Model Code Prof\\. Responsibility),?\\s+(?:section|§|rule|DR)\\s+'+coordinate,
 '(?:[\\p{Lu}][\\p{L}\\p{M}.]*\\s+)+(?:Ordinance|Resolution|Charter)(?:\\s+No\\.\\s*|\\s+section\\s+)'+coordinate,
].map(p=>new RegExp('(?<![\\p{L}\\p{N}\\p{M}_/#@-])'+p+'(?![\\p{L}\\p{N}\\p{M}_/#@-])','gu'));
const chapter2Cue=/\b(?:Const\.|Constitution|Code|Regs\.|Regulations|Statutes|Stats\.|Charter|Ord\.|Ordinance|Rules|Counsel|Law Revision|Ballot Pamp\.|Legis\.|Assem\.|Sen\.|Senate|Assembly|H\.R\.|House|Pub\.\s*L\.|Fed\.Reg\.|C\.F\.R\.|Treaty|U\.S\.T\.|T\.I\.A\.S\.|Executive Order|Exec\. Order|Pres\. Proc\.|Model|Uniform|ABA|United States Code|U\.S\. Code)/u;
function coordinates(region){
 const ranges=[],text=region.text,add=(a,b)=>ranges.push({start:region.start+a,end:region.start+b});
 for(const pattern of prosePatterns)for(const m of text.matchAll(pattern)){let end=m.index+m[0].length,tail;while((tail=metadata.exec(text.slice(end))))end+=tail[0].length;add(m.index,end);}
 for(const pattern of [new RegExp(locator,'gu'),new RegExp(publication,'gu'),new RegExp('\\((?:'+sessionBody+'|'+sourceYear+'|\\d+(?:st|nd|rd|th|d)\\s+ed\\.\\s+[12]\\d{3})\\)','gu'),new RegExp(fullDate,'gu'),/\b\d+(?:st|nd|rd|th|d)\s+(?:Cong\.|Sess\.)/gu,/\b(?:Register|Cong\.\s*Rec\.|Cong\.\s*Globe|Sen\.\s*J\.|Assem\.\s*J\.)\s+\d+(?:[-–]\d+)?/gu,/\b\d+[A-Z]?\s+(?:West[’']s|Deering[’']s|ABA|Cal\.\s+Law\s+Revision\s+Com\.\s+Rep\.|Sen\.\s*J\.|Assem\.\s*J\.)/gu])for(const m of text.matchAll(pattern))add(m.index,m.index+m[0].length);
 return ranges;
}
export function californiaEnactmentSourceRegions(source){
 const enclosed=enclosures(source),found=enclosed.filter(r=>chapter2Cue.test(r.text)&&/(?:\d|§|\bsupra\b)/u.test(r.text));
 for(const pattern of prosePatterns)for(const m of source.matchAll(pattern)){
  if(enclosed.some(r=>r.start<=m.index&&r.end>=m.index+m[0].length))continue;
  let end=m.index+m[0].length,tail;while((tail=metadata.exec(source.slice(end))))end+=tail[0].length;
  found.push({start:m.index,end,text:source.slice(m.index,end)});
 }
 return found.sort((a,b)=>a.start-b.start||b.end-a.end).filter((r,n,all)=>!all.slice(0,n).some(p=>p.start<=r.start&&p.end>=r.end)).map(r=>({...r,coordinateRanges:coordinates(r)}));
}
export function californiaEnactmentCandidates(source){
 const out=[],regions=enclosures(source);
 const add=(region,part,row,reasons)=>{if(!reasons.length)return;const lead=part.text.search(/\S/u);if(lead<0)return;const text=part.text.trim(),start=region.start+part.start+lead;out.push({start,end:start+text.length,evidenceStart:region.start,evidenceEnd:region.end,section:row.section,page:row.page,suggestion:null,checkId:row.id,reason:reasons.join(' ')+' This is a source-field verification question, not a finding that the authority is invalid. Check any full/short citation convention and the original source; no missing identity, date or locator is supplied.'});};
 for(const region of regions)for(const part of authorities(region))for(const row of checks){const fields=fieldText(part.text),m=row.cue.exec(fields);if(m&&!short.test(fields))add(region,part,row,row.read(fields,m));}
 for(const region of californiaEnactmentSourceRegions(source).filter(r=>source[r.start]!=='('))for(const row of checks){const fields=fieldText(region.text),m=row.cue.exec(fields);if(m&&!short.test(fields))add(region,{start:0,text:region.text},row,row.read(fields,m));}
 // Local enactment short citations retain the prohibition on supra. This is
 // deliberately distinct from books and other works that allow that signal.
 for(const region of regions)for(const part of authorities(region))if(/\b(?:Mun\.|Municipal|County|Planning)\s+Code\b|\b(?:City|County)\s+Charter\b/u.test(part.text)&&/\bsupra\b/u.test(part.text))add(region,part,{section:'§2:17',page:60,id:'local-enactment-supra'},['Local code, ordinance and charter citations do not use supra; verify the named enactment and the intended short reference.']);
 const localNumber=/(?<![\p{L}\p{N}\p{M}_])(?:Ord\.|Ordinance)\s*(?:(?<label>No\.?|number|#)\s*)?[A-Z]*-?\d+(?:[-.]\d+)*(?![\p{L}\p{N}\p{M}_]|\.\d)/gu;
 for(const m of source.matchAll(localNumber)){if(m.groups.label==='No.')continue;const region=regions.find(r=>r.start<=m.index&&r.end>=m.index+m[0].length)||{start:m.index,end:m.index+m[0].length};out.push({start:m.index,end:m.index+m[0].length,evidenceStart:region.start,evidenceEnd:region.end,section:'§2:17',page:60,suggestion:null,checkId:'local-enactment-number',reason:'Local ordinance citations use No. for number. Verify the enactment’s exact designation and locality; no ordinance number or legal identity is inferred.'});}
 return out;
}
