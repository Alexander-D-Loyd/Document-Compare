import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {dividedCalendarDates} from '../app/style-calendar-dates.mjs';import {sourceNameRanges} from '../app/style-source-names.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs),numbers=t=>check(t).filter(i=>i.checkId==='numerals');
test('divided valid calendar days receive one complete spacing suggestion and preserve adjacent counts',()=>{
 const text='The funds are available until June 3 0, 2019. Appoint 3 workers.',issues=check(text);
 assert.deepEqual(issues.map(i=>[i.text,i.suggestion]),[['June 3 0, 2019','June 30, 2019'],['3','three']]);assert.equal(issues[0].guidePage,7);assert.match(issues[0].message,/verify the original PDF/);assert.ok(issues.every(i=>text.slice(i.start,i.end)===i.text));
 assert.deepEqual(check('On June 3 0, 2019 the board acted.').map(i=>i.suggestion),['June 30, 2019,']);
});
test('calendar spacing requires an actual valid month day year expression',()=>{
 for(const text of ['February 2 9, 2024','February 2 9, 2000','june 3 0, 2019'])assert.equal(dividedCalendarDates(text).length,1,text);
 for(const text of ['June 30, 2019','February 3 0, 2024','February 2 9, 1900','April 3 1, 2027','June 3 or 0 workers','Unknown 3 0, 2019'])assert.equal(dividedCalendarDates(text).length,0,text);
});
test('complete date selection survives printed margins and a page boundary without mutating text',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 121\nThe people do enact as follows:\nline 1 Until June 3\n97','AB 121 — 2 —\nline 1 0, 2019. Appoint 3 workers.'],'Current'),original=doc.text,issues=jointStylisticIssues(doc,refs);
 assert.deepEqual(issues.map(i=>i.suggestion),['June 30, 2019','three']);assert.equal(issues[0].start,original.indexOf('June'));assert.equal(issues[0].end,original.indexOf('2019')+4);assert.equal(doc.text,original);
});
test('literal dates, source strikeouts and headings receive no date spacing correction',()=>{
 assert.equal(check('The words “June 3 0, 2019” are literal.').length,0);
 const doc=makeDocument(['Until June 3 0, 2019.'],'Current');doc.struck=[{start:6,end:21}];assert.equal(jointStylisticIssues(doc,refs).length,0);
 assert.equal(check('Until June 3 0, 2019.\nThe people do enact as follows:').length,0);
});
test('complete source framework titles preserve their spelled grade while ordinary grade references remain checked',()=>{
 for(const title of ['Mathematics Framework for California Public Schools: Kindergarten Through Grade Twelve','English Language Arts/English Language Development Framework for California Public Schools: Kindergarten Through Grade Twelve']){
  const text='Use the '+title+'. Provide services through grade twelve.';assert.deepEqual(check(text).map(i=>[i.text,i.suggestion]),[['twelve','12']]);assert.equal(sourceNameRanges(text).length,1);
 }
 assert.ok(check('Use the Unfamiliar Framework for Schools: Kindergarten Through Grade Twelve.').some(i=>i.text==='Twelve'),'Unlisted titles are not guessed from capitalization alone');
});
test('complete coordinated Special Olympics source name protects its geographic fragment only',()=>{
 const text='Allocate funds to the Special Olympics of Northern and Southern California. Services in Southern California continue.';
 assert.deepEqual(check(text).map(i=>[i.text,i.suggestion]),[['Southern California','southern California']]);assert.equal(sourceNameRanges('Special Olympics of Northern and Southern CaliforniaExtra').length,0);
});
test('selected complete education identifiers preserve serial numbers with nearby ordinary counts',()=>{
 for(const label of ['California Longitudinal Pupil Achievement Data System Fall 1','CALPADS Fall 1','California Longitudinal Pupil Achievement Data System as of the 2024–25 Fall 1','Fall 1 census day pupil data submitted through the California Longitudinal Pupil Achievement Data System','First 5 county commission','First 5 county commissions','PK-3 early childhood education specialist instruction credential'])assert.deepEqual(numbers('Review '+label+'. Appoint 3 workers.').map(i=>[i.text,i.suggestion]),[['3','three']],label);
 for(const label of ['Fall 1 worker','First 5 workers','PK-3 unlisted program'])assert.ok(numbers('Review '+label+'.').length,label);
});
test('education identifier context is case sensitive and preserves exact page-break quantity offsets',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 121\nThe people do enact as follows:\nline 1 The California Longitudinal Pupil Achievement Data System Fall\n97','AB 121 — 2 —\nline 1 1 Certification includes 3 workers.'],'Current'),issues=jointStylisticIssues(doc,refs);assert.deepEqual(issues.map(i=>i.text),['3']);assert.equal(issues[0].start,doc.text.indexOf('3 workers'));
 assert.ok(numbers('The first 5 county commissions apply.').some(i=>i.text==='5'));
});
