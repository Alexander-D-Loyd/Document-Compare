import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {numeralIssues} from '../app/style-numerals.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const issues=text=>numeralIssues(makeDocument([text],'Current'),refs),corrections=text=>issues(text).filter(i=>!i.matchesPrimary);
test('telephone service and decision codes stay intact while nearby quantities are checked',()=>{
 const text='The 2-1-1 provider coordinates with 9-1-1 and 9-8-8 under Decision 11-09-016. The term is 1 year.';
 assert.deepEqual(issues(text).map(i=>[i.text,i.suggestion]),[['1','one']]);
});
test('subarticle and other nested legal identifiers remain figures',()=>{
 assert.equal(issues('The Low-Carbon Fuel Standard regulations (Subarticle 7 (commencing with Section 95480) of Title 17) apply. Subchapter 2, Subpart 3 and Subsection 4 apply.').length,0);
});
test('quantities differ from citations, labels, dates and decimal identifiers',()=>{
 const text='The term is 1 year under Article 1, Section 1, and Sections 1 to 5, inclusive. Chapter 2 and Part 3 apply. On January 1, 2027, paragraph (1) of Section 527.1 applies.';
 const found=corrections(text);assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[['1','one']]);assert.equal(text.slice(found[0].start,found[0].end),'1');assert.equal(found[0].conflict,true);assert.equal(found[0].context,'Bill');assert.ok(found[0].references.some(r=>r.guideId==='gpo'));
 assert.equal(corrections('The term begins on 2027-01-01.').length,0);assert.deepEqual(corrections('The term begins on January one.').map(i=>i.suggestion),['1']);
 assert.equal(corrections('Use Judicial Council Form I.D. 100. 42 U.S.C. 1983 applies.').length,0);
});
test('different numerical expressions and money do not force a duration into figures',()=>{
 const text='Imprisonment is limited to 1 year, by a fine of one thousand dollars ($1,000), or both. The board has 3 people and 10 dollars ($10).';
 assert.deepEqual(corrections(text).map(i=>i.suggestion),['one','three']);
 assert.deepEqual(corrections('A conviction within 10 years carries not exceeding one year in jail.').map(i=>i.text),[]);
 assert.equal(corrections('The board grants 2 orders and 12 orders.').length,0);
 assert.deepEqual(corrections('The board grants two orders and 12 orders.').map(i=>i.suggestion),['2']);
 assert.deepEqual(corrections('The board grants 2 orders and 12 days.').map(i=>i.suggestion),['two']);
 assert.equal(corrections('The term is 1, 2, 3, or 10 years.').length,0);
 assert.deepEqual(corrections('The term is one, two, three, or 10 years.').map(i=>i.suggestion),['1','2','3']);
});
test('digest and bill context carry different cardinal and ordinal rules',()=>{
 const text='LEGISLATIVE COUNSEL’S DIGEST\nThe bill requires two requests, 1 permit, and a third hearing.\nThe people do enact as follows:\nThe office requires 2 requests, 1 permit, and a 3rd hearing.';
 assert.deepEqual(corrections(text).map(i=>[i.text,i.suggestion,i.context]),[['two','2','Digest'],['1','one','Digest'],['third','3rd','Digest'],['2','two','Bill'],['1','one','Bill'],['3rd','third','Bill']]);
 assert.equal(corrections('LEGISLATIVE COUNSEL’S DIGEST\nA third party may submit a form.').length,0);
 assert.equal(corrections('The Fourteenth Amendment to the United States Constitution applies.').length,0);
});
test('sentence starts, figures-only contexts and monetary phrases are handled independently',()=>{
 assert.deepEqual(corrections('12 people attend. The office grants eleven requests.').map(i=>i.suggestion),['Twelve','11']);
 assert.equal(corrections('The rate is 0.5 percent, the ratio is 1:5, and grades 1 to 6 apply. The hearing begins at 3 a.m. It costs ten dollars ($10).').length,0);
 assert.deepEqual(corrections('The rate is five percent. Grade seven pupils attend.').map(i=>i.suggestion),['5','7']);
 assert.equal(corrections('The ratio is 1 in 10. The ratio is one in five. The term is 1/2 year or 1½ years.').length,0);
 assert.equal(corrections('LEGISLATIVE COUNSEL’S DIGEST\nA device operates per second for three and one-half hours.').length,0);
 assert.deepEqual(corrections('The ratio is one in ten.').map(i=>i.suggestion),['1','10']);
});
test('numbered wrapping and source strikeouts preserve offsets and exclude removed quantities',()=>{
 const doc=makeDocument(['line 1 The term is 1\nline 2 year under Section 1.'],'Current');let found=numeralIssues(doc,refs).filter(i=>!i.matchesPrimary);assert.equal(found.length,1);assert.equal(doc.text.slice(found[0].start,found[0].end),'1');
 doc.struck=[{start:found[0].start,end:found[0].end}];assert.equal(numeralIssues(doc,refs).filter(i=>!i.matchesPrimary).length,0);
});

test('proposition identifiers stay in figures in bill and digest contexts',()=>{
 assert.equal(issues('Proposition 4 at the November 5, 2024, election.').length,0);
 assert.equal(issues('LEGISLATIVE COUNSEL’S DIGEST\nProposition 4 at the November 5, 2024, election.').length,0);
 assert.deepEqual(corrections('The term is 1 year under Proposition 4.').map(i=>i.suggestion),['one']);
});

test('budget identifiers and numeric table cells preserve figures while prose quantities remain checkable',()=>{
 const doc=makeDocument(['Budget Act of 2026.\nline 1 001—Reference Code.\nline 2 0044—Fund Code.\nline 3 Amount Item\nline 4 0110-001-0001—For support of Senate........\nline 5 206,258,000\nline 6 (7,361,000)\nline 7 101001-Salaries of Senators.\nline 8 A report covers 1 year.\nline 9 The office processes 11,000 requests.'],'Current');
 assert.deepEqual(numeralIssues(doc,refs).filter(i=>!i.matchesPrimary).map(i=>[i.text,i.suggestion]),[['1','one']]);
 assert.equal(corrections('The office processes 11,000 requests.').length,0);
 assert.deepEqual(corrections('12 people attend.').map(i=>i.suggestion),['Twelve']);
});

test('budget provision citations, chapter abbreviations, decimal labels and project titles are not quantities',()=>{
 const text='Budget Act of 2026.\nline 1 Provisions 6, 10, and 12 of Item 0250-101-0932 apply.\nline 2 Provision 1 and Provi-\nline 3 sion 2 apply under Stats. 2025 (Chs. 4 and 5).\nline 4 (.5) Up to $81,837,000 is available.\nline 5 Kings County: One New Shelled Courtroom.\nline 6 Ten percent is allocated.\nline 7 A report covers 1 year.';
 assert.deepEqual(corrections(text).map(i=>[i.text,i.suggestion]),[['1','one']]);
 assert.equal(corrections('The ratio is 1:5.').length,0);
});

test('wrapped dates and reference names, numbered stages and shortened appropriation codes retain figures',()=>{
 const text='Budget Act of 2026.\nline 1 Au-\nline 2 gust 1 under Divi-\nline 3 sion 1, Stage 4, Release 3, House Resolution 1 and SPR7, 8, and 9.\nline 4 1111-401—For support.\nline 5 County: One New Courtroom.\nline 6 The hearing starts at 3:05 a.m.\nline 7 A report covers 1 year.';
 assert.deepEqual(corrections(text).map(i=>[i.text,i.suggestion]),[['1','one']]);
});

test('larger written ordinals are a single ordinal rather than separate cardinal fragments',()=>{
 assert.deepEqual(corrections('The twentieth, twenty-first, thirty second, and one hundredth applicants qualify.').map(i=>[i.text,i.suggestion]),[['twentieth','20th'],['twenty-first','21st'],['thirty second','32nd'],['one hundredth','100th']]);
 assert.equal(corrections('The 20th, 21st, 32nd, and 100th applicants qualify.').length,0);
 assert.deepEqual(corrections('21st place receives the award. 100th place receives the award.').map(i=>i.suggestion),['Twenty-first','One hundredth']);
 assert.equal(corrections('The Twenty-first Amendment applies. A twentieth of the revenue is available. One hundredth of the revenue is available. The term “twenty-first applicant” is quoted.').length,0);
});

test('wrapped compound ordinals retain full source ranges and source strikeout exclusions',()=>{
 const doc=makeDocument(['line 1 The twenty-\nline 2 first applicant qualifies.'],'Current');
 const found=numeralIssues(doc,refs).filter(i=>!i.matchesPrimary);assert.equal(found.length,1);assert.equal(found[0].suggestion,'21st');assert.equal(doc.text.slice(found[0].start,found[0].end),'twenty-\nline 2 first');
 doc.struck=[{start:found[0].start,end:found[0].end}];assert.equal(numeralIssues(doc,refs).length,0);
});

test('grade quantities and ordinal grade modifiers preserve their distinct syntax',()=>{
 assert.deepEqual(corrections('Grade seven pupils and seventh grade pupils attend. A seventh-grade pupil attends. A first grade pupil attends. A 1st grade pupil attends.').map(i=>i.suggestion),['7','7th','7th','first']);
 assert.equal(corrections('Grade 7 pupils and 7th grade pupils attend. A 7th-grade pupil attends. A first-grade pupil attends.').length,0);
});
