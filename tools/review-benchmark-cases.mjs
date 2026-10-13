// Independently specified LCB prescriptions / English grammar annotations.
// Controlled fixtures are explicitly separate from original PDF witnesses.
const cases=[];
const add=(id,topic,text,entries=[],options={})=>cases.push({id,topic,text,kind:'style',exhaustive:true,origin:'Controlled legislative prose; fixed guide/grammar annotation',entries,...options});
for(const number of ['1','2','3','4','5','6','7','8','9'])add('bill-cardinal-'+number,'numerals',`The office requires ${number} reports.`,[[number,['one','two','three','four','five','six','seven','eight','nine'][Number(number)-1]]]);
add('same-sentence-small-counts','numerals','The agency requires 1 report, 3 reports, and 4 reports.',[['1','one'],['3','three'],['4','four']]);
add('related-large-count','numerals','The office receives two reports and 12 reports.',[['two','2']]);
add('unrelated-expressions','numerals','The office receives 2 reports and 12 days.',[['2','two']]);
add('legal-reference-members','references','Sections one and two of the Government Code apply.',[['one','1'],['two','2']]);
add('citation-identifiers','references','Article 1, Section 1, Chapter 2, and Part 3 apply.');
add('nested-identifiers','references','Subchapter 2, Subpart 3, and Subsection 4 apply.');
add('service-identifiers','references','The 2-1-1 provider coordinates with 9-1-1 and 9-8-8 under Decision 11-09-016.');
add('figures-required','numerals','The rate is five percent. Grade seven pupils attend.',[['five','5'],['seven','7']]);
add('correct-figures','numerals','The rate is 0.5 percent, the ratio is 1:5, and grades 1 to 6 apply.');
// GPO 12.1 / LCB Digest item 1 disagree on two-nine; the user's explicit
// conflict-suppression policy owns those uses, while one remains checkable.
add('digest-cardinals','guide-conflicts','LEGISLATIVE COUNSEL’S DIGEST\nThe bill requires two requests and 1 permit.',[['1','one']]);
add('mixed-digest-bill','guide-conflicts','LEGISLATIVE COUNSEL’S DIGEST\nThe bill requires two requests.\nThe people do enact as follows:\nThe office requires 2 requests.',[['2','two']]);
add('bill-percent','punctuation','The program provides 5% assistance.',[['5%','5 percent']]);
// LCB percent symbol in Digest conflicts with GPO 10.5 ordinary prose.
add('digest-percent','guide-conflicts','LEGISLATIVE COUNSEL’S DIGEST\nThe rate is 5 percent.');
add('time-possessive','punctuation','Give 30 days notice.',[['30 days notice','30 days’ notice']]);
add('precise-entity-case','entities','The state board of education administers the program.',[['state board of education','State Board of Education']]);
add('correct-entity','entities','The State Board of Education administers the program.');
add('entity-near-name','entities','The State Board of the Education administers the program.',[['State Board of the Education',null]],{reviewOnly:true});
add('office-adviser','spelling-authority','The advisor reviews the report.',[['advisor','adviser']]);
add('office-judgment','spelling-authority','The judgement applies.',[['judgement','judgment']]);
add('office-moneys','spelling-authority','The monies are available.',[['monies','moneys']]);
add('office-willful','spelling-authority','The violation was wilful.',[['wilful','willful']]);
add('office-historical','usage','The court requires an historical analysis.',[['an historical','a historical']]);
add('meaning-review','usage','The commission must device its allocation framework.',[['device',null]],{reviewOnly:true});
add('before-after-conflict','guide-conflicts','The before and after school programs are provided.');
add('after-school-conflict','guide-conflicts','The before- and after-school programs are provided.');
add('quoted-error-protected','source-protection','The label “judgement” is printed on the form.');
add('correct-cardinals','numerals','The office requires three reports and four reports.');
for(const [id,text,entries]of [
 ['article','The office requires an local educational agency.',[['an local','a local']]],
 ['repeated','The office reviews the the report.',[['the the','the']]],
 ['modal','The office should of reviewed the report.',[['should of','should have']]],
 ['agreement','They is responsible.',[['They is','They are']]],
 ['article-correct','The office requires a local educational agency.',[]],
 ['agreement-correct','They are responsible.',[]]
])add('grammar-'+id,'grammar',text,entries,{kind:'grammar'});
// Recognition through a physical page boundary must retain original ranges.
add('split-guide-word','word-divisions','The judg-\nline 1 ement applies.',[['judg-\nline 1 ement','judgment']]);
add('split-body-numerals','source-protection','line 1 The office requires 3\nline 2 reports and 4\nline 3 reports.',[['3','three'],['4','four']]);
add('grammar-real-margin','grammar','line 1 The office requires an\nline 2 local agency.',[['an\nline 2 local','a local']],{kind:'grammar'});
add('grammar-divided-word','word-divisions','line 1 The office requires a infor-\nline 2 mation report.',[['a infor-\nline 2 mation','an information']],{kind:'grammar'});
add('grammar-month-modal','grammar','line 43 Estimates provided in January and May\nline 44 may constitute notification.',[],{kind:'grammar'});
const billIntro='The people of the State of California do enact as follows:\nSECTION 1. This act applies.\n';
add('missing-internal-target','references',billIntro+'SEC. 2. Section 9 of this bill applies.',[['Section 9 of this bill',null]],{reviewOnly:true});
add('valid-internal-target','references',billIntro+'SEC. 2. Section 1 of this bill applies.');
for(const phrase of ['cubic meters','square feet','full-time equivalent positions','additional licensed positions']){
 add('opening-multiword-'+phrase.replaceAll(' ','-'),'sentence-openings','0.5 '+phrase+' are required.',[['0.5 '+phrase,null]],{reviewOnly:true});
 add('nonopening-multiword-'+phrase.replaceAll(' ','-'),'sentence-openings','The office requires 0.5 '+phrase+'.');
}
for(const qualifier of ['business','calendar','court','academic','consecutive','working']){
 const phrase='30 '+qualifier+' days notice';add('qualified-notice-'+qualifier,'time-possessives','The office requires '+phrase+'.',[[phrase,'30 '+qualifier+' days’ notice']]);
 add('qualified-notice-correct-'+qualifier,'time-possessives','The office requires 30 '+qualifier+' days’ notice.');
}
// LCB page 13 supplies the closed schoolday noun. Use its compliant spelling
// here so the punctuation-only control does not contain a separate violation.
add('schoolday-notice','time-possessives','The office requires 30 schooldays notice.',[['30 schooldays notice','30 schooldays’ notice']]);
add('schoolday-notice-correct','time-possessives','The office requires 30 schooldays’ notice.');
for(const qualifier of ['business','calendar','court','academic','consecutive','working']){
 const phrase=qualifier+' days written notice';add('qualified-time-review-'+qualifier,'time-possessives','The office requires 30 '+phrase+'.',[[phrase,null]],{reviewOnly:true});
 add('qualified-time-temporal-'+qualifier,'time-possessives','The office acts after 30 '+qualifier+' days elapsed.');
}
add('calendar-year-date-label','time-possessives','The facility’s 2023 calendar year rate applies.');
add('calendar-year-coordinated-date-label','time-possessives','Rates for 2024 and 2025 calendar years based on reports apply.');
export const REVIEW_BENCHMARK_CASES=cases;
export function annotations(row){
 let cursor=0;return row.entries.map(([text,suggestion])=>{const start=row.text.indexOf(text,cursor);if(start<0)throw Error('Invalid annotation: '+row.id);cursor=start+text.length;return {start,end:cursor,text,kind:row.kind,suggestion,critical:true};});
}
