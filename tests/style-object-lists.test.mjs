import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const punctuation=t=>jointStylisticIssues(makeDocument([t],'Current'),refs).filter(i=>['serial-commas','semicolon-series'].includes(i.checkId));
test('Recognized direct-object lists require the final serial comma after modal verbs',()=>{
 for(const verb of ['provide','collect','maintain','submit','retain','review','inspect','receive','issue','purchase','fund','offer','use','distribute','deliver'])for(const join of ['and','or','nor']){
  const text='The department shall '+verb+' forms, reports '+join+' notices.',issues=punctuation(text);assert.equal(issues.length,1,text);assert.equal(issues[0].text,join);assert.equal(issues[0].suggestion,', '+join);assert.equal(text.slice(issues[0].start,issues[0].end),join);assert.equal(punctuation(text.replace(' '+join+' notices',', '+join+' notices')).length,0,text);
 }
 for(const text of ['The agency must provide public records, written reports and financial documents.','The agency may not collect A, B and C.'])assert.equal(punctuation(text).length,1,text);
});
test('Grouped direct-object series require a semicolon before the final group',()=>{
 const text='The department shall retain forms, reports; permits, licenses and records, documents.';
 const issues=punctuation(text);assert.equal(issues.length,1);assert.equal(issues[0].suggestion,'; and');assert.equal(punctuation(text.replace('licenses and','licenses; and')).length,0);
});
test('Direct-object list cues preserve clauses, two items, quotations, identifiers and names',()=>{
 for(const text of ['The department shall provide forms and reports.','The department shall provide forms, reports are filed and notices are sent.','The department shall provide forms, such reports and notices.','The term “shall provide forms, reports and notices” is literal.','The department shall provide Hospitals, Clinics and Schools.','The department shall review Section 1, Section 2 and Section 3.','The department shall provide forms, reports and notices under this section.','The agency shall retain forms, reports; permits, licenses and the department shall act.'])assert.equal(punctuation(text).length,0,text);
 const d=makeDocument(['The department shall provide forms, reports and notices.'],'Current');d.struck=[{start:28,end:d.text.length}];assert.ok(!jointStylisticIssues(d,refs).some(i=>i.checkId==='serial-commas'));
});
test('Direct-object list findings retain offsets through margins and page boundaries',()=>{
 const d=makeDocument(['line 1 The department shall provide public records,','line 1 written reports and financial documents.'],'Current');const i=jointStylisticIssues(d,refs).find(i=>i.checkId==='serial-commas');assert.ok(i);assert.equal(d.text.slice(i.start,i.end),'and');
});
