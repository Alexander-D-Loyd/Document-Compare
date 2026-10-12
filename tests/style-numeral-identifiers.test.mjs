import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
import {numeralIssues} from '../app/style-numerals.mjs';
import {explicitRatioParts} from '../app/style-ratios.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs).filter(i=>i.checkId==='numerals'||i.checkId==='ratios');

test('complete alphanumeric legal identifiers preserve every component while nearby counts remain checked',()=>{
 for(const citation of ['Section 1396r-8','Sections 256b(a)(5)(A) and 1396r-8(a)(5)(C)','Sec. 1396r-8','Article 12a-3b','Subdivision 10.2a-3(b)(2)']){const text='Under '+citation+', 3 public members and 1 registered technician are appointed.',found=check(text);assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[['3','three'],['1','one']],text);}
 for(const text of ['Under Sections 1396r-8 and 3, 1 member is appointed.','Under Sections 1396r-8, 3, and 4, 1 member is appointed.'])assert.deepEqual(check(text).map(i=>i.text),['1'],text);
 assert.deepEqual(check('Under Section 1396r-8, 3 workers are appointed.').map(i=>i.text),['3']);
 const raw=numeralIssues(makeDocument(['Under Sections 1396r-8 and 1 year, 3 workers apply.'],'Current'),refs);assert.ok(raw.some(i=>i.text==='1'),'A neighboring duration cannot become a citation identifier');
});

test('dotted federal citations protect complete section identifiers and do not absorb a counted list',()=>{
 for(const citation of ['42 U.S.C. Sec. 1396r-8','42 U.S.C. § 1396r-8(a)(5)(C)','U.S.C. 1396r-8','42 U.S.C. Sections 256b(a)(5)(A) and 1396r-8(a)(5)(C)','7 C.F.R. Sec. 1a-3'])assert.deepEqual(check('Under '+citation+', 2 reports are required.').map(i=>[i.text,i.suggestion]),[['2','two']],citation);
 assert.deepEqual(check('Under 42 U.S.C. Sec. 1396r-8, 3 workers and 1 member apply.').map(i=>i.text),['3','1']);
});

test('explicit year-period labels protect shortened ranges in either order and leave prose counts independent',()=>{
 for(const label of ['rate year','fiscal year','school year','academic year','calendar year','tax year'])for(const range of ['2005-06','2005–06','1999–00','2007-2008'])for(const text of ['During the '+range+' '+label+', 3 workers apply.','During '+label+' '+range+', 3 workers apply.'])assert.deepEqual(check(text).map(i=>[i.text,i.suggestion]),[['3','three']],text);
 assert.equal(check('The 2005–06 and 2006–07 rate years apply.').length,0);assert.equal(check('The rate years 2005–06, 2006–07, and 2007–08 apply.').length,0);
 assert.ok(check('The allocation for 2005-06 workers is reviewed.').some(i=>i.text==='06'),'An unlabelled expression is not assigned a year-period role');
});

test('known viral designations are indivisible labels rather than prose counts',()=>{
 for(const virus of ['SARS-CoV-1','SARS-CoV-2','COVID-19'])assert.deepEqual(check('Testing for '+virus+' is provided to 3 workers.').map(i=>[i.text,i.suggestion]),[['3','three']],virus);
 assert.ok(check('The OTHER-CoV-2 record is retained.').some(i=>i.text==='2'),'An unencoded designation stays outside this selected guard');
});

test('explicit coordinated ratios and selected educational qualifiers share one labelled scope',()=>{
 const source='Maintain a ratio of 10 to 1 for transitional kindergarten and kindergarten or 20 to 1 for grades 1 to 12, inclusive.';assert.equal(check(source).length,0);assert.deepEqual(explicitRatioParts(source).map(p=>source.slice(p.start,p.end)),['10 to 1','20 to 1']);
 assert.deepEqual(check('Maintain a ratio of one to five for transitional kindergarten and kindergarten or two to three for grades 1 to 12.').map(i=>[i.text,i.suggestion]),[['one to five','1 to 5'],['two to three','2 to 3']]);
 assert.deepEqual(check('Use ratios of one to five, two to three, and three to four.').map(i=>i.suggestion),['1 to 5','2 to 3','3 to 4']);
 for(const text of ['Use a ratio of 1 to 5 and wait one to five years.','Use a ratio of 1 to 5 for two years and one to five years of review.','Use a ratio of 1 to 5 and one to five workers.'])assert.equal(explicitRatioParts(text).length,1,text);
 assert.deepEqual(check(source+' Appoint 3 public members.').map(i=>i.text),['3']);
});

test('complete citation and viral fragments across page labels retain nearby exact quantity offsets',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 116\nThe people of the State of California do enact as follows:\nline 1 Under Section 1396r-\n97','AB 116 — 2 —\nline 1 8, testing for SARS-CoV-\nline 2 2 is provided to 3 workers.'],'Current'),found=jointStylisticIssues(doc,refs).filter(i=>i.checkId==='numerals');assert.equal(found.length,1);assert.equal(found[0].text,'3');assert.equal(found[0].start,doc.text.indexOf('3 workers'));assert.equal(doc.text.slice(found[0].start,found[0].end),'3');
});
test('a following form label protects the entire uppercase serial code while nearby quantities remain checked',()=>{
 for(const code of ['X-D-R-1','X.D.R.-1','CIV-003','B-1-2','XYZ-4']){
  const text='The applicant shall complete a '+code+' form, retain 3 copies, and appoint 1 member.';
  assert.deepEqual(check(text).map(i=>[i.text,i.suggestion]),[['3','three'],['1','one']],code);
 }
 assert.ok(check('The report describes XYZ-4 workers.').some(i=>i.text==='4'),'A bare acronym does not establish a form code');
 assert.ok(check('The applicant shall complete 3 forms.').some(i=>i.text==='3'));
});
test('a following count with an intact finite predicate cannot be swallowed by a citation chain',()=>{
 for(const predicate of ['complete the X-D-R-1 form','submit the X-D-R-1 form','file the X-D-R-1 form','can complete the form','have filed the form','receive the form','participate in the program']){
  const text='Under Article 1 and Section 1, 3 workers '+predicate+'.';assert.deepEqual(check(text).map(i=>[i.text,i.suggestion]),[['3','three']],text);
 }
 assert.deepEqual(check('Under Sections 1, 3, and 4, workers complete the X-D-R-1 form.').map(i=>i.text),[]);
});
