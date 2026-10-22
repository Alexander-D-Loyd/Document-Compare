// Applicability routes for the citation chapters of the reviewed fourth edition.
// A route is a reader task, not evidence that an authority exists or supports text.
import {CALIFORNIA_CODES} from './data/california-codes.mjs';
import {CALIFORNIA_CODE_CITATION_ABBREVIATIONS} from './style-california-citation-families.mjs';
const row=(id,chapter,sections,page,cue,checks)=>Object.freeze({id,chapter,sections:Object.freeze(sections),page,cue,checks:Object.freeze(checks)});
const seq=(a,b)=>Array.from({length:b-a+1},(_,n)=>a+n);
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// An unfamiliar or local code is not thereby one of the California codes.
const californiaCodeCue=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_.])(?:'+[...CALIFORNIA_CODE_CITATION_ABBREVIATIONS,...CALIFORNIA_CODES.map(e=>e.name),'California Uniform Commercial Code','Uniform Commercial Code','Stats.'].sort((a,b)=>b.length-a.length).map(escape).join('|')+')(?=[\\s,§]|$)|\\b(?:'+CALIFORNIA_CODES.map(e=>e.shorthand).join('|')+')\\s*§','u');
export const CALIFORNIA_CITATION_REVIEW_CATALOG=Object.freeze([
 row('case-general',1,seq(1,11),4,null,['Confirm the exact opinion title, court, date, reporter and pinpoint against the opinion.','Check introductory signals, relative authority order, quoted support, explanatory notes and any separate opinion or later history.','Verify italics from the original page; extracted plain text cannot establish them.']),
 row('case-california',1,[...seq(12,21),25,26,27],16,/\b\d+\s+Cal\.\s*(?:(?:App\.|Rptr\.)\s*)?(?:(?:2d|3d|4th|5th)\s*)?(?:Supp\.\s*)?\d|\b\d+\s+Cal\.\s*Unrep\.\s+\d|\bCalifornia (?:Supreme Court|Court of Appeal)/u,['Confirm the California court level and the appropriate official, advance, pending or early-report form.','Verify current publication status, modifications, review and any applicable exception using current court records.']),
 row('case-administrative',1,[22],22,/\b(?:Cal\.\s*(?:P\.\s*U\.\s*C\.(?:2d)?|Comp\.\s*Cases|Workers[’']\s+Comp\.\s*Rptr\.)|C\.\s*R\.\s*C\.|PERB|PERC|WCAB|I\.\s*A\.\s*C\.|ALRB|FEHC)(?![\p{L}\p{N}\p{M}_])/u,['Identify the deciding California administrative body and its reporter, decision number, date and locator.']),
 row('case-attorney-general',1,[23],25,/\b(?:Ops\.\s*Cal\.\s*Atty\.\s*Gen\.|Opns?\.\s*(?:Cal\.\s*)?Atty\.\s*Gen\.|Cal\.\s*Atty\.\s*Gen\.,\s*Indexed Letter)(?![\p{L}\p{N}\p{M}_])/u,['Check the opinion volume, year and page or the unpublished opinion number and date.']),
 row('case-state-bar',1,[24],25,/\bCal\. State Bar Ct\. Rptr\./u,['Check the State Bar Court reporter, volume, year and cited pages.']),
 row('case-other-state',1,seq(28,31),29,/\b(?:P\.(?:2d|3d)?|N\.E\.(?:2d|3d)?|N\.W\.(?:2d|3d)?|S\.E\.(?:2d)?|S\.W\.(?:2d|3d)?|So\.(?:2d|3d)?|A\.(?:2d|3d)?|Mass\.|N\.Y\.(?:2d|3d)?)\s+\d/u,['Verify the state, court, official or regional reporter, any neutral citation and historical numbering.']),
 row('case-us-supreme',1,[32],32,/\b(?:U\.S\.|S\.Ct\.|L\.Ed\.(?:2d)?)\s+\d/u,['Confirm the Supreme Court title and the available official or interim reporter and pinpoint.']),
 row('case-federal-appeal',1,[33],34,/\b(?:F\.(?:2d|3d|4th)|Fed\.)\s+\d/u,['Confirm the circuit and year parenthetical, reporter and point pages; check any special court designation.']),
 row('case-federal-trial',1,[34],35,/\b(?:F\.Supp\.(?:2d|3d)?|F\.R\.D\.|B\.R\.)\s+\d/u,['Confirm the district or specialized trial court, date, reporter or database and pinpoint.']),
 row('case-federal-agency',1,[35],37,/\b(?:N\.?L\.?R\.?B\.?|F\.T\.C\.|F\.C\.C\.|I\.C\.C\.|S\.E\.C\.)\s+\d/u,['Verify the federal adjudicating agency, decision identity, date, reporter or service and locator.']),
 row('case-english',1,[36],38,/\b(?:All\s+E\.R\.|Eng\.\s*Rep\.|Q\.B\.|A\.C\.|App\.\s*Cas\.)\s+\d/u,['Verify the English reporter, period-specific year/volume order, court and page.']),
 row('case-international',1,[37],39,/\b(?:I\.C\.J\.|E\.C\.R\.|S\.C\.R\.|D\.Jur\.|Ont\.\s*Lexis)\s+\d/u,['Identify the nation or international court, decision date, source and locator; do not infer jurisdiction from an unfamiliar abbreviation.']),
 row('constitution',2,seq(1,4),45,/\b(?:U\.S\.|Cal\.) Const\.|\b(?:United States|California|state|federal) Constitution\b/u,['Verify the constitution, article, amendment, section and clause, including former or renumbered provisions.','Use Roman article designations and Arabic section, clause and amendment numbers; check parenthetical versus text forms and omitted jurisdiction.']),
 row('california-code',2,seq(5,15),47,californiaCodeCue,['Verify the exact code or session law, section suffixes, subdivisions and other enumerations against the cited version.','Check full versus short forms, adopted omission conventions, annotations, enactment history, initiative material and cited headings.']),
 row('california-regulation',2,[16],58,/\bCal\. (?:Code Regs\.|Reg\. Notice Register)|\bCalifornia Code of Regulations\b/u,['Verify the regulation title, section, edition or register action and the issuing agency; distinguish notices from regulation text.']),
 row('local-law',2,[17],60,/\b(?:Mun\.|Municipal|County|Planning) (?:Code|Ord\.|Ordinance|Charter)|\b(?:City|County) Charter\b|\b(?:Ord\.|Ordinance|Res\.|Resolution)\s+No\.\s*[A-Z\d]|\bCharter,?\s*(?:§|articles?\b|sections?\b)/u,['Verify the locality, code, ordinance, resolution or charter and its exact subdivision or number.']),
 row('california-rules',2,seq(18,23),61,/\b(?:Cal\.|California) Rules of Court|\b(?:Local Rules|State Bar|Judicial Council|Judicial Administration|Judicial Conduct|Judicial Performance)\b/u,['Identify the state, local, judicial or bar rule source and exact current rule/subpart.','Check local court identification, annotations and reports or comments separately from the rule text.']),
 row('california-legislative',2,seq(24,36),65,/\b(?:Sen\.|Assem\.) (?:Bill|Res\.|Con\. Res\.|Joint Res\.|Const\. Amend\.|Com\.|J\.|Final Hist\.)|\b(?:Senate|Assembly) (?:Bill|Resolution|Journal)\b|\b(?:Legis\. Counsel|Legislative Counsel|Cal\. Law Revision Com\.|Ballot Pamp\.|Governor.s (?:Message|Exec)|Legislative Analyst|Cal\. Legis\. Analyst)(?![\p{L}\p{N}\p{M}_])|\b(?:letter|memo(?:randum)?)\s+(?:to|of intent to)\s+(?:Sen\.|Senator|Assemblyman|Assemblywoman|Governor|Gov\.)/u,['Identify the issuing body, document or action, bill/measure, session, date and locator.','Check analyses, journals, reports, ballot material, correspondence and Internet versions in their own source context.']),
 row('federal-code',2,seq(37,40),75,/\bU\.\s*S\.\s*C\.(?:A\.|S\.)?|\b(?:Pub\.\s*L\.|Public Law|Stat\. at Large|Statutes at Large|Int\.\s*Rev\. Code|Internal Revenue Code|United States Code)(?![\p{L}\p{N}\p{M}_])|\b\d+ Stat\. \d/u,['Verify the federal title, code or public law, enactment/version, section and subparts; distinguish popular titles from source citations.']),
 row('federal-legislative',2,[41,42],77,/\b(?:H\.\s*R\.|(?:S|Sen|H)\.\s*(?:Rep\.|Res\.|J\.\s*Res\.|Con\.\s*Res\.)|Sen\.\s*No\.|Cong\.\s*Rec\.|Cong\. Sess\.|Cong\.\s*(?:Doc\.|Globe)|(?:Sen|H)\.\s*(?:Doc\.|Rept\.))(?![\p{L}\p{M}_])/u,['Verify the house, bill/report/document, Congress, session, date and cited pages or sections.']),
 row('treaty',2,[43],80,/\b(?:U\.\s*S\.\s*T\.|T\.\s*I\.\s*A\.\s*S\.|U\.\s*N\.\s*T\.\s*S\.|Treaty|Convention on)(?![\p{L}\p{N}\p{M}_])/u,['Verify the treaty or agreement, participants, date, ratification/source information and locator.']),
 row('federal-regulation',2,[44,45],81,/\b(?:C\.F\.R\.|Fed\.Reg\.)|\b(?:Federal Register|Code of Federal Regulations)\b/u,['Verify the title and part or register volume and page, edition/date and any agency document details.']),
 row('federal-rules',2,[46],82,/\bFed\. Rules? |\bFederal Rules of |\b(?:Fed\.R\.(?:Civ|Crim|App)\.P\.|Fed\.R\.Evid\.)/u,['Verify the federal rule set, rule number and subparts, and any local court identity.']),
 row('federal-compilation',2,[47],83,/\bU\.\s*S\.\s*Code\s+Cong\.\s*&\s*Adm(?:in)?\.\s*News\b/u,['Verify the compilation year, source item and volume/pages; retain the underlying legislative source identity.']),
 row('federal-executive',2,[48],83,/\b(?:Exec\. Order(?: No\.)?|Pres\. Proclamation(?: No\.)?|Executive Order No\.|Presidential Proclamation(?: No\.)?)\s+\d/u,['Verify the order/proclamation number, date, publication and locator.']),
 row('model-law',2,[49,50],84,/\b(?:Model (?:Code|Rules)|Uniform [A-Z]|U\.\s+[A-Z][\p{L}\p{M}]+\s+(?:Act|Code)|ABA (?:Code|Standards|Model)|ABA.*?Opn\.)/u,['Distinguish the model or uniform text from an enacted jurisdictional version; verify the issuing body, edition and provision.']),
 row('treatise',3,[1,2],89,/\b(?:Witkin|CEB|CJER|Cont\.\s*Ed\.\s*Bar|Practice Guide|Treatise|Summary of Cal\. Law|Cal\. Criminal Law)(?![\p{L}\p{N}\p{M}_])/u,['Verify author, exact title, volume, edition/year, section and page against the volume used, including supplements and electronic versions.']),
 row('encyclopedia',3,[3],95,/\b(?:Cal\.\s*Jur\.|Am\.\s*Jur\.|C\.J\.S\.|C\.J\.|California Jurisprudence|American Jurisprudence|Corpus Juris|Blackstone)/u,['Verify the encyclopedia or commentary, edition/volume, topic, section and page.']),
 row('dictionary',3,[4],96,/\b(?:Dictionary|Dict\.|Words and Phrases)(?![\p{L}\p{N}\p{M}_])/u,['Verify the dictionary title, edition/year, entry and page; a citation does not supply licensed spelling authority.']),
 row('jury-instruction',3,[5],96,/\b(?:CALJIC|BAJI|CACI|CALCRIM)\b/u,['Verify the instruction source, number, edition or revision date and any commentary pages. Newer instruction sets require their own source verification.']),
 row('restatement',3,[6],98,/\b(?:Restatement|Rest\.(?:2d|3d)?)[ ,]/u,['Verify the Restatement title/series, section, comment or illustration and pages; identify an unapproved draft and its date.']),
 row('annotation',3,[7],98,/\b(?:Annot\.|Annotation)|\b(?:A\.L\.R\.|American Law Reports|Lawyers[’'] Reports Annotated)/u,['Verify the annotation, date, reporter volume/series, inception page and cited section, note or point page.']),
 row('law-periodical',3,[8],100,/\b(?:L\.Rev\.|L\.J\.|Law Review|Law Journal|Bar J\.)/u,['Verify author or Note/Comment, full article title, date, volume, journal abbreviation, inception and point pages, and title italics.']),
 row('topical-service',3,[9],102,/\b(?:CCH|BNA|Prentice.Hall|Cal\. Tax Rptr\.|Cal\.\s*Crim\.\s*Defense Prac\.\s*Rptr\.|Civ\.\s*Litigation Rptr\.|Cal\.\s*Tort Rptr\.|Bankr\. L\. Rep\.|L\.\s*Rptr\.|L\.\s*Rep\.|Law Reporter|Law Reports)/u,['Verify the service, publisher, volume or transfer binder, date and paragraph/section/page locator.']),
 row('citation-manual',3,[10],103,/\b(?:Bluebook|California Style Manual|Cal\.\s*Style Manual|Uniform System of Citation)\b/u,['Verify the citation manual title, edition/year, section and page.']),
 row('magazine',3,[11],103,/\b(?:Magazine|Mag\.|U\.S\. News|Time|Newsweek|The New Yorker|The Atlantic Monthly|JAMA)(?![\p{L}\p{N}\p{M}_])/u,['Verify author, article, publication/date, issue or volume when used, and page.']),
 row('newspaper',3,[12],104,/\b(?:Daily Journal|L\.A\. Times|N\.Y\. Times|S\.F\. Chronicle|S\.F\. Recorder|S\.F\. Daily J\.|Nat\.L\.J\.|Wall Street\s*Journal|Newspaper)(?![\p{L}\p{N}\p{M}_])/u,['Verify author or editorial/letter label, article, newspaper/date, section, page and column as applicable.']),
 row('general-work',3,[13],104,/\b(?:ISBN|interview with|Shakespeare|Leviticus|Genesis|(?:Holy )?Bible|Old Testament|television (?:broadcast|series)|Motion Picture|Film Corp\.|Pictures)(?![\p{L}\p{N}\p{M}_])|\b(?:Exodus|Numbers|Deuteronomy|Psalms|Proverbs|Isaiah|Matthew|Mark|Luke|John|Acts|Romans|Revelation)\s+\d+:\d+|\bact\s+[IVXLCDM\d]+\s*,\s*scene\s+[IVXLCDM\d]+/u,['Identify the work or medium and verify creator/title, publication or performance details and the applicable chapter/page/act/verse locator.']),
 row('miscellaneous-report',3,[14],107,/\b(?:Report|Rep\.|Study|Manual|Speech|Hearing|Monograph)(?![\p{L}\p{N}\p{M}_])/u,['Verify the individual or institutional preparer, exact work, date and page; identify a draft or agency subunit.']),
 row('electronic-source',3,[15],108,/https?:\/\/|\b(?:Westlaw|Lexis|CD-ROM|WL\s+\d+|LEXIS\s+\d+)/u,['Verify author/title, publisher or database, date and stable locator; check Internet access dates and the cited version.'])
]);
export function citationReviewFamilies(text,{caseCitation=false,sourceFamilies=[]}={}){
 const specific=CALIFORNIA_CITATION_REVIEW_CATALOG.filter(r=>r.cue?.test(text)||sourceFamilies.includes(r.id));
 const isCase=caseCitation||specific.some(r=>r.id.startsWith('case-'));
 const groups=CALIFORNIA_CITATION_REVIEW_CATALOG.filter(r=>specific.includes(r)||isCase&&r.id==='case-general');
 // A generic report label must not add another question about an otherwise
 // identified specialized source. Its checklist belongs to actual reports.
 const explicitService=/\b(?:CCH|BNA|Prentice.Hall|L\.\s*Rptr\.|L\.\s*Rep\.|Law Reporter)/u.test(text);
 return groups.filter(r=>(r.id!=='miscellaneous-report'||!groups.some(g=>g!==r&&g.id!=='electronic-source'))&&(r.id!=='topical-service'||explicitService||!groups.some(g=>g.id==='annotation'||g.id.startsWith('case-'))));
}
export function citationSectionLabel(family){
 const ranges=[];let first=family.sections[0],last=first;
 for(const n of family.sections.slice(1)){if(n===last+1){last=n;continue;}ranges.push([first,last]);first=last=n;}ranges.push([first,last]);
 return ranges.map(([a,b])=>family.chapter+':'+a+(b===a?'':'–'+family.chapter+':'+b)).join(', ');
}
export function citationContextReviewRegions(source,parentheticals,caseRanges){
 const regions=parentheticals.filter(p=>!caseRanges.some(r=>r.start<=p.start&&r.end>=p.end));
 for(const r of caseRanges)if(!regions.some(p=>p.start<=r.start&&p.end>=r.end))regions.push({...r,text:source.slice(r.start,r.end)});
 const out=[];
 for(const r of regions){
  const isCase=r.caseCitation===true||caseRanges.some(c=>c.start>=r.start&&c.end<=r.end)||/\bv\.\s+\p{Lu}/u.test(r.text),families=citationReviewFamilies(r.text,{caseCitation:isCase,sourceFamilies:r.caseSourceFamilies||r.citationSourceFamilies||[]});
  // A bare mention in parentheses is not enough. Locators, a date or an
  // explicit short-citation signal establish only a citation-like context.
  if(!families.length||!/(?:\d|§|\bsupra\b|\b[Ii](?:bid|d)\.)/u.test(r.text))continue;
  out.push({...r,families});
 }
 return out;
}
