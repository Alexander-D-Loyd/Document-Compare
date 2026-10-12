import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const issues=doc=>jointStylisticIssues(typeof doc==='string'?makeDocument([doc],'Current'):doc,refs).filter(i=>i.category==='Modifier hyphenation'||i.rule==='Spelling and usage: full-time-equivalent');

test('LCB full-time equivalent student example supplies a complete noun-phrase context',()=>{
 assert.ok(refs.lcb.pages[9].text.includes('full-time equivalent student'));
 const text='Funds cover full time equivalent students and full time equivalent employees.';const found=issues(text);assert.deepEqual(found.map(i=>[i.text,i.suggestion,i.guidePage]),[['full time equivalent','full-time equivalent',10],['full time equivalent','full-time equivalent',10]]);for(const i of found)assert.equal(text.slice(i.start,i.end),i.text);
 assert.equal(issues(text.replaceAll('full time','full-time')).length,0);
});
test('part-time and half-time forms recognize only selected equivalent employment/student heads',()=>{
 const found=issues('Funds cover part time equivalent veterinarians and half time equivalent staff.');assert.deepEqual(found.map(i=>[i.text,i.suggestion,i.guidePage]),[['part time','part-time',12],['half time','half-time',11]]);
 assert.equal(issues('Funds cover part-time equivalent veterinarians and half-time equivalent staff.').length,0);
});
test('certificated, classified and nonmanagement employment qualifiers retain only the modifier highlight',()=>{
 for(const tail of ['certificated staff','classified employees','nonmanagement employees']){const text='Funds cover full time equivalent '+tail+'.',doc=makeDocument([text],'Current'),before=doc.text,tokens=JSON.stringify(doc.tokens),found=issues(doc);assert.deepEqual(found.map(i=>i.suggestion),['full-time equivalent']);assert.equal(found[0].text,'full time equivalent');assert.equal(doc.text,before);assert.equal(JSON.stringify(doc.tokens),tokens);}
 assert.deepEqual(issues('Full time equivalent students qualify.').map(i=>i.suggestion),['Full-time equivalent']);
});
test('equivalence predicates, unknown qualifiers and complete literals do not imply an attributive correction',()=>{
 for(const text of ['The worker serves full time equivalent to other staff.','The worker serves part time in a program.','The full time equivalent abstract widget applies.','The Full Time Equivalent Student Program applies.','The phrase "full time equivalent students" is literal.','“part time equivalent employees” means a defined term.','Funds cover full time equivalent unfamiliar students.'])assert.equal(issues(text).length,0,text);
});
test('time-equivalent evidence does not become an unrestricted noun head for other listed modifiers',()=>{
 for(const text of ['A high quality equivalent student is admitted.','Funds cover cost of living equivalent staff.','An age appropriate equivalent student applies.'])assert.equal(issues(text).length,0,text);
});
test('an exact time modifier crosses printed margins and a known page head without highlighting the noun',()=>{
 const doc=makeDocument(['line 39 Funds cover full','AB 1502 — 42 —\nline 1 time equivalent veterinarians.'],'Current');doc.blocks.find(b=>b.ignored).formatting={headerParts:[{text:'AB 1502 — 42 —'}]};const found=issues(doc);assert.equal(found.length,1);assert.equal(found[0].suggestion,'full-time equivalent');assert.match(found[0].text,/full[\s\S]*equivalent$/);assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);assert.ok(found[0].end<doc.text.indexOf('veterinarians'));
});
test('unknown ignored noun bridges, strikeouts and table evidence remain protected across the whole noun phrase',()=>{
 const text='Funds cover full time equivalent veterinarians.',plain=makeDocument([text],'Current'),at=plain.text.indexOf('veterinarians');plain.struck=[{start:at,end:at+13}];assert.equal(issues(plain).length,0);
 const unknown=makeDocument(['Funds cover full time equivalent\nunknown marker\nveterinarians.'],'Current'),b=unknown.blocks[1];b.ignored=true;unknown.excluded=[{start:b.start,end:b.end}];assert.equal(issues(unknown).length,0);
 const table=makeDocument(['Funds cover full time equivalent\nveterinarians.'],'Current');table.blocks[1].formatting={headerGaps:[{},{}]};assert.equal(issues(table).length,0);
 assert.equal(issues('Funds cover full time equivalent "veterinarians".').length,0);
});
test('independent numeral review remains active beside a source-listed time modifier',()=>{
 const doc=makeDocument(['Funds cover 1 claimant and full time equivalent students.'],'Current'),found=jointStylisticIssues(doc,refs);assert.ok(found.some(i=>i.text==='1'&&i.suggestion==='one'));assert.ok(found.some(i=>i.text==='full time equivalent'&&i.suggestion==='full-time equivalent'));
});
