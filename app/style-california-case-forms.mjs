import {citationParentheticals} from './style-california-citation-families.mjs';
import {CITATION_CASE_TITLE,CITATION_CASE_LOCATION} from './style-california-prose-citations.mjs';

// Observable forms from chapter 1 of the reviewed Fourth Edition. Every
// candidate retains the complete citation as evidence. These comparisons do
// not identify an opinion, verify its support, or establish current citability.
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const stateForms=Object.freeze({Alabama:'Ala.',Arizona:'Ariz.',Arkansas:'Ark.',California:'Cal.',Colorado:'Colo.',Connecticut:'Conn.',Delaware:'Del.','District of Columbia':'D.C.',Florida:'Fla.',Georgia:'Ga.',Illinois:'Ill.',Indiana:'Ind.',Kansas:'Kan.',Kentucky:'Ky.',Louisiana:'La.',Maine:'Me.',Maryland:'Md.',Massachusetts:'Mass.',Michigan:'Mich.',Minnesota:'Minn.',Mississippi:'Miss.',Missouri:'Mo.',Montana:'Mont.',Nebraska:'Neb.',Nevada:'Nev.','New Hampshire':'N.H.','New Jersey':'N.J.','New Mexico':'N.M.','New York':'N.Y.','North Carolina':'N.C.','North Dakota':'N.D.',Oklahoma:'Okla.',Oregon:'Or.',Pennsylvania:'Pa.','Puerto Rico':'P.R.','Rhode Island':'R.I.','South Carolina':'S.C.','South Dakota':'S.D.',Tennessee:'Tenn.',Texas:'Tex.',Vermont:'Vt.',Virginia:'Va.',Washington:'Wash.','West Virginia':'W.Va.',Wisconsin:'Wis.',Wyoming:'Wyo.'});
const regional=['A.','A.2d','N.Y.S.','N.Y.S.2d','N.E.','N.E.2d','N.W.','N.W.2d','P.','P.2d','S.E.','S.E.2d','So.','So.2d','S.W.','S.W.2d'];
const flexibleReporter=s=>s.split('.').map(escape).join('\\.\\s*');
const regionalPattern='(?:'+regional.toSorted((a,b)=>b.length-a.length).map(flexibleReporter).join('|')+')';
const regionalCanonical=new Set(regional);
const states=Object.keys(stateForms).toSorted((a,b)=>b.length-a.length).map(escape).join('|');
const spacedRegionalLocation='(?:\\d+|_+)\\s+'+regionalPattern+'\\s+(?:(?:at\\s+(?:pp?\\.|pages?)\\s+)?(?:\\d+|_+)(?:[-–]\\d+)?(?:\\s*,\\s*\\d+(?:[-–]\\d+)?)*)';
const caseLocation='(?:'+CITATION_CASE_LOCATION+'|'+spacedRegionalLocation+')';
const fullPattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_/#@-])'+CITATION_CASE_TITLE+'\\s*\\((?<court>[^()]{0,120}?)(?<year>[12]\\d{3})\\)\\s+(?<location>'+caseLocation+')(?![\\p{L}\\p{N}\\p{M}_/#@-])','dgu');
const coordinate=/^(?<volume>\d+|_+)\s+(?<reporter>.+?)\s+(?:(?<label>at\s+(?:pp?\.|pages?))\s+)?(?<first>\d+|_+)(?<points>(?:\s*[-–]\s*\d+)?(?:\s*,\s*(?:\d+|_+)(?:\s*[-–]\s*\d+)?)*)$/du;
const federalAppeal=/^(?:Fed\.|F\.(?:2d|3d))$/u;
const federalTrial=/^(?:F\.Supp\.|F\.R\.D\.|Fed\.Cl\.|B\.R\.)$/u;
const regionalOnly=new RegExp('^'+regionalPattern+'$','u');
const specialDescription=/^\s*(?:(?:dis\.|conc\.|plur\.|lead|maj\.)\s+(?:&\s*(?:dis\.|conc\.)\s+)?opn\.|hereafter\b|hereinafter\b|nonpub\.\s+opn\.|filed\s+opn\.|(?:at\s+)?pp?\.\s*\d|(?:\d+|_+)\s+[A-Z])/u;
const parallelCoordinate=text=>specialDescription.test(text)||/^\s*Cal\.\s*Tax\s+Rptr\.\s*\((?:CCH|BNA|West)\)\s*[¶§]\s*\d/u.test(text);
function balancedGroup(source,start,open,close){
 if(source[start]!==open)return null;let depth=0;
 for(let at=start;at<source.length;at++){
  if(source[at]===open)depth++;
  else if(source[at]===close&&!--depth)return {start,end:at+1,text:source.slice(start+1,at)};
 }
 return null;
}
function postCitation(source,end){
 let at=end;const extensions=[];
 for(let n=0;n<5;n++){
  const tail=source.slice(at),foot=/^\s*(?:(?<join>,|&|and)\s+)?(?<label>fn\.|footnote|appen\.|appendix)(?:\s+\d+(?:[-–]\d+)?)?(?![\p{L}\p{N}\p{M}_])/du.exec(tail);
  if(foot){extensions.push({kind:'locator',start:at,end:at+foot[0].length,match:foot});at+=foot[0].length;continue;}
  const gap=/^\s*/u.exec(tail)[0].length,begin=at+gap;
  const group=balancedGroup(source,begin,'[',']')||balancedGroup(source,begin,'(',')');
  if(!group)break;
  extensions.push({...group,kind:source[begin]==='['?'brackets':'parentheses'});at=group.end;
 }
 return {end:at,extensions};
}
const titleWord="\\p{Lu}[\\p{L}\\p{M}’'.,&/-]*",title=titleWord+'(?:\\s+(?:(?:of|the|and|&|ex|rel\\.?|re)\\s+)?'+titleWord+'){0,35}';
const titleOrCase='(?:'+CITATION_CASE_TITLE+'|'+title+')',year='\\((?:[^()]{0,100}?\\s+)?[12]\\d{3}\\)',points='(?:\\d+|_+)(?:[-–]\\d+)?(?:\\s*,\\s*(?:\\d+|_+)(?:[-–]\\d+)?)*';
const administrative='(?:Cal\\.\\s*Comp\\.\\s*Cases|I\\.\\s*A\\.\\s*C\\.|C\\.\\s*R\\.\\s*C\\.|Cal\\.\\s*P\\.\\s*U\\.\\s*C\\.(?:\\s*2d)?|Cal\\.\\s*Workers[’\']\\s*Comp\\.\\s*Rptr\\.|Cal\\.\\s*State\\s+Bar\\s+Ct\\.\\s*Rptr\\.|N\\.?\\s*L\\.?\\s*R\\.?\\s*B\\.?|F\\.\\s*T\\.\\s*C\\.|F\\.\\s*C\\.\\s*C\\.|I\\.\\s*C\\.\\s*C\\.|S\\.\\s*E\\.\\s*C\\.|Eng\\.\\s*Rep\\.)';
const sourcePatterns=[
 titleOrCase+'\\s*'+year+'\\s+'+caseLocation,
 titleOrCase+'\\s*'+year+'\\s+(?:[A-Z]{2,4}\\s+\\d+[A-Za-z-]*(?:\\s*,\\s*\\d+)*\\s*,\\s*)?(?:\\d+|_+)\\s+'+administrative+'\\s+'+points,
 titleOrCase+'\\s*'+year+'\\s+(?:\\d+\\s+ALRB\\s+No\\.\\s*\\d+|PERB\\s*Dec\\.\\s*No\\.\\s*[A-Za-z\\d-]+)(?:\\s*,\\s*pp?\\.\\s*'+points+')?',
 titleOrCase+'\\s*'+year+'\\s+No\\.\\s*[A-Za-z\\d-]+,\\s*FEHC\\s+Precedential\\s+Decs\\.\\s*(?:[12]\\d{3}[-–][12]\\d{3}|_+),\\s*CEB\\s+(?:\\d+|_+)(?:,\\s*p\\.\\s*'+points+')?',
 titleOrCase+'\\s*'+year+'\\s+\\d+\\s+SBE\\s*\\d+',
 '(?:'+title+',?\\s+)?(?:\\d+|_+)\\s+Ops\\.\\s*Cal\\.\\s*Atty\\.\\s*Gen\\.\\s+'+points+'\\s*\\((?:[^()]{0,60}?\\s+)?[12]\\d{3}\\)',
 titleOrCase+'\\s*'+year+'\\s+(?:Cal\\.\\s*P\\.\\s*U\\.\\s*C\\.\\s*)?Dec\\.\\s*No\\.\\s*[A-Za-z\\d-]+',
 titleOrCase+'\\s*'+year+'\\s*(?:\\[[^\\[\\]]{1,50}Transfer Binder\\]\\s*)?(?:\\d+(?:-\\d+)?\\s+)?(?:Fair\\s+Empl\\.\\s*Prac\\.\\s*Cas\\.|Lab\\.\\s*Arb\\.\\s*Rep\\.|Fed\\.\\s*Sec\\.\\s*L\\.\\s*Rep\\.|Trade\\s+Cas\\.|U\\.S\\.\\s*Tax\\s+Cas\\.)\\s*\\((?:CCH|BNA|West)\\)\\s*(?:[¶§]\\s*)?'+points+'(?:,\\s*pp?\\.\\s*'+points+')?',
 CITATION_CASE_TITLE+'\\s*'+year+'\\s+\\d+\\s+(?:[A-Z][\\p{L}’\']*|F\\.Cas\\.)\\s+'+points+'(?:\\s*\\(No\\.\\s*\\d+(?:,\\d+)*\\))?',
 titleOrCase+'\\s*'+year+'\\s+\\d+\\s+(?:Coffey[’\']s\\s+Prob\\.\\s*Dec\\.|Labatt)\\s+'+points,
 titleOrCase+'\\s*'+year+'\\s*(?:Myrick[’\']s\\s+Prob\\.\\s*Rep\\.|App\\.\\s*Cas\\.|Ont\\.\\s*Lexis|D\\.\\s*Jur\\.)\\s+'+points,
 CITATION_CASE_TITLE+'\\s*,\\s*[12]\\d{3}\\s+N\\.D\\.(?:App\\.)?\\s+\\d+(?:\\s*,\\s*¶\\s*\\d+)?',
 'Cal\\.\\s*Atty\\.\\s*Gen\\.,\\s*Indexed Letter,\\s*No\\.\\s*IL\\s+[\\d-]+\\s*\\([^()]{1,80}[12]\\d{3}\\)'
].map(p=>new RegExp('(?<![\\p{L}\\p{N}\\p{M}_/#@-])'+p+'(?![\\p{L}\\p{N}\\p{M}_/#@-])','gu'));
export function californiaCaseSourceRegions(source){
 const regions=[],parents=citationParentheticals(source);
 for(const pattern of sourcePatterns)for(const m of source.matchAll(pattern)){
  // An author-comma article with a topical publication label is not a
  // title-only case. Its secondary-source owner keeps narrative quantities
  // outside the actual publication/page coordinates.
  if(pattern===sourcePatterns[0]&&/^[^()]*,/u.test(m[0])&&/\bL\.\s*(?:Rptr|Rep)\./u.test(m[0])&&!new RegExp(CITATION_CASE_TITLE,'u').test(m[0]))continue;
  let end=m.index+m[0].length;const tail=postCitation(source,end);
  for(const part of tail.extensions){if(part.kind==='locator'||part.kind==='brackets'&&parallelCoordinate(part.text))end=part.end;else break;}
  const outer=parents.find(p=>p.start<=m.index&&p.end>=end);
  const region=outer||{start:m.index,end,text:source.slice(m.index,end)};
  const matched=source.slice(m.index,end),caseSourceFamilies=[];
  if(/\b(?:Coffey[’']s\s+Prob\.\s*Dec\.|Myrick[’']s\s+Prob\.\s*Rep\.|Labatt)\s+\d/u.test(matched))caseSourceFamilies.push('case-california');
  if(/\b(?:Cowen|Blackford)\s+\d/u.test(matched))caseSourceFamilies.push('case-other-state');
  regions.push({...region,text:source.slice(region.start,region.end),caseCitation:true,caseSourceKind:'Chapter 1 case or administrative citation',caseSourceFamilies,coordinateRanges:[{start:m.index,end}]});
 }
 const owners=[];
 for(const region of regions.sort((a,b)=>a.start-b.start||b.end-a.end)){
  const owner=owners.find(p=>p.start<=region.start&&p.end>=region.end);
  if(owner){owner.coordinateRanges.push(...region.coordinateRanges);owner.caseSourceFamilies=[...new Set([...owner.caseSourceFamilies,...region.caseSourceFamilies])];}else owners.push(region);
 }
 for(const owner of owners)owner.coordinateRanges=owner.coordinateRanges.sort((a,b)=>a.start-b.start||b.end-a.end).filter((r,n,all)=>!all.some((p,j)=>j<n&&p.start<=r.start&&p.end>=r.end));
 return owners;
}
export function californiaCaseFormCandidates(source){
 const out=[],enclosed=citationParentheticals(source),cases=[];
 const add=(start,end,evidence,section,page,reason,suggestion=null)=>{
  if(start<evidence.start||end>evidence.end||start>=end)return;
  out.push({start,end,evidenceStart:evidence.start,evidenceEnd:evidence.end,section,page,reason,suggestion});
 };
 for(const m of source.matchAll(fullPattern)){
  const parsed=coordinate.exec(m.groups.location);if(!parsed)continue;
  const tail=postCitation(source,m.index+m[0].length),misplacedSupplement=/^\s+Supp\./u.exec(source.slice(m.index+m[0].length));
  if(misplacedSupplement)tail.end=Math.max(tail.end,m.index+m[0].length+misplacedSupplement[0].length);
  const outer=enclosed.find(r=>r.start<=m.index&&r.end>=tail.end),evidence=outer||{start:m.index,end:tail.end};
  cases.push({start:m.index,end:tail.end,outer});
  const locationStart=m.indices.groups.location[0],reporterStart=locationStart+parsed.indices.groups.reporter[0],reporter=parsed.groups.reporter,canonical=reporter.replace(/\s+/gu,''),court=m.groups.court.trim(),courtStart=m.indices.groups.court[0];
  if(parsed.groups.label){const [a,b]=parsed.indices.groups.label;add(locationStart+a,locationStart+b,evidence,'§1:1[E]',6,'A full title-and-year citation gives the reporter’s inception page directly. The at-page convention belongs to subsequent references. Verify whether this is an initial citation and supply the actual inception and point pages from the opinion; no page number or reordering is inferred.');}
  if(/^Cal\.App\.(?:2d|3d|4th|5th)?$/u.test(canonical)&&misplacedSupplement)add(m.index+m[0].length,m.index+m[0].length+misplacedSupplement[0].length,evidence,'§1:15',18,'An appellate-division Supplement designation precedes the page number. Verify the deciding division and actual supplement pagination before moving the label; no page or court identity is inferred.');
  if((federalAppeal.test(canonical)||federalTrial.test(canonical))&&!court)add(m.indices.groups.year[0],m.indices.groups.year[1],evidence,federalAppeal.test(canonical)?'§1:33[A]':'§1:34[A]–[D]',federalAppeal.test(canonical)?34:35,'This reporter does not by itself identify the deciding federal court. A full citation includes the circuit, district or appropriate specialized court before the year. Verify that court from the opinion; the missing designation cannot be inferred.');
  if(regionalOnly.test(reporter)){
   if(!court)add(m.indices.groups.year[0],m.indices.groups.year[1],evidence,'§1:1[D]; §1:29',5,'A regional reporter alone does not identify the state and deciding court. When the citation does not also provide a state reporter that identifies them, include the jurisdiction and any required lower-court designation before the year. Verify the source; no jurisdiction is inferred.');
   const state=new RegExp('^(?<state>'+states+')(?=\\s|$|[,.])','du').exec(court);
   if(state){const [a,b]=state.indices.groups.state,leading=m.groups.court.indexOf(court);add(courtStart+leading+a,courtStart+leading+b,evidence,'§1:30[A]',31,'The reviewed citation table supplies this state or territory abbreviation for a citation parenthetical. Preserve the actual jurisdiction and any separately required lower-court designation.',stateForms[state.groups.state]);}
  }
  // Source-unprinted third/fourth/newer series are deliberately not assigned
  // a canonical spelling by the 2000 edition.
  if(regionalCanonical.has(canonical)&&reporter!==canonical)add(reporterStart,reporterStart+reporter.length,evidence,'§1:30[B]',31,'The reviewed regional-reporter table prints this abbreviation without internal spaces. Preserve the volume, series and page; reporter identity still requires verification.',canonical);
  if(federalTrial.test(canonical)&&court){
   // A complete ordinary district abbreviation is observable. Other court
   // names and specialized court conventions retain their reader task.
   const district=/^(?<district>(?:(?:N|S|E|W|C|M)\.\s*)?D\.\s*(?:[A-Z][a-z]*\.\s*){1,3})(?:,\s*)?$/du.exec(court);
   if(district){const text=district.groups.district.trimEnd(),compact=text.replace(/\s+/gu,''),leading=m.groups.court.indexOf(court);if(text!==compact)add(courtStart+leading,courtStart+leading+text.length,evidence,'§1:34[A]',35,'Federal trial-court abbreviations omit spaces following periods. This comparison only closes spaces within the complete district abbreviation; verify the district and state against the opinion.',compact);}
  }
  if(federalAppeal.test(canonical)&&court){const compact=court.replace(/\s+/gu,'');if(['Temp.Emer.Ct.App.','Ct.Cl.','CCPA'].includes(compact)&&compact!==court){const leading=m.groups.court.indexOf(court);add(courtStart+leading,courtStart+leading+court.length,evidence,'§1:33[B]',35,'The reviewed specialized federal appellate-court abbreviations omit internal spaces. This comparison only closes spaces within the existing abbreviation; verify the historical deciding court instead of substituting the modern Federal Circuit.',compact);}}
  for(const extension of tail.extensions){
   if(extension.kind==='locator'){
    const {label,join}=extension.match.groups,inside=!!outer,footnote=label==='fn.'||label==='footnote',reasons=[];
    if(footnote&&inside&&label==='footnote')reasons.push('Within a parenthetical case citation, abbreviate footnote as fn.');
    if(footnote&&!inside&&label==='fn.')reasons.push('In a prose case citation, spell out footnote.');
    if(!footnote&&inside&&label==='appendix')reasons.push('Within a parenthetical case citation, abbreviate appendix as appen.');
    if(!footnote&&!inside&&label==='appen.')reasons.push('In a prose case citation, spell out appendix.');
    if(footnote&&inside&&join==='and')reasons.push('Use the ampersand when referring to both the page text and its footnote inside parentheses.');
    if(footnote&&!inside&&join==='&')reasons.push('Use and when referring to both the page text and its footnote in prose.');
    if(reasons.length)add(extension.start,extension.end,evidence,footnote?'§1:8':'§1:9',footnote?12:13,reasons.join(' ')+' Verify the actual page and note or appendix in the opinion; its location is not inferred.');
    continue;
   }
   if(specialDescription.test(extension.text)||!/^\s*\p{Ll}/u.test(extension.text))continue;
   if(outer&&extension.kind==='parentheses')add(extension.start,extension.end,evidence,'§1:6',11,'An explanatory description accompanying a citation inside parentheses uses brackets. Distinguish it from an adopted short title and from a separate-opinion identification, which retain their own parentheses. The relationship to the cited opinion still requires verification.');
   else if(!outer&&extension.kind==='brackets')add(extension.start,extension.end,evidence,'§1:6',11,'An explanatory description accompanying a prose citation uses parentheses. Distinguish it from parallel reporters, temporary filed-opinion page locators and other specially bracketed material before editing.');
  }
 }
 for(const r of enclosed){
  const members=cases.filter(c=>c.outer===r);
  for(let n=1;n<members.length;n++)if(/^\s*,\s*(?:and\s+)?$/u.test(source.slice(members[n-1].end,members[n].start)))add(r.start,r.end,r,'§1:7',12,'Distinct case citations within parentheses are separated by semicolons. Opinions dealing with the same cause instead use commas; verify that relationship before changing the separator.');
 }
 // Attorney General opinions have a deliberate exception to the ordinary
 // case-year position. No title or opinion number is manufactured here.
 const ag=/(?<![\p{L}\p{N}\p{M}_])\((?<year>[12]\d{3})\)\s+(?:\d+|_+)\s+Ops\.\s*Cal\.\s*Atty\.\s*Gen\.\s+(?:\d+|_+)(?:\s*,\s*\d+)*/dgu;
 for(const m of source.matchAll(ag)){
  const evidence=enclosed.find(r=>r.start<m.index&&r.end>=m.index+m[0].length)||{start:m.index,end:m.index+m[0].length};
  add(m.index,m.index+m[0].length,evidence,'§1:23',25,'An Attorney General opinion citation places the year in parentheses after the page reference, unlike an ordinary case citation. Verify the volume, page and year; no rearranged citation or opinion identity is supplied.');
 }
 return out;
}
