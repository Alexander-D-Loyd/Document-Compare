import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {serialCommaIssues} from '../app/style-serial-commas.mjs';import {semicolonSeriesIssues} from '../app/style-semicolon-series.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('serial noun lists recognize source-listed modifiers and counted noun phrases',()=>{
 for(const t of ['The list includes cost-effective programs, tax-exempt organizations and non-English-speaking households.','The list includes city-owned buildings, county-funded programs or board-approved projects.','The list includes one public school, two private clinics and three hospitals.','The list includes two-year programs, full-time employees and part-time workers.']){const doc=makeDocument([t],'Current'),i=serialCommaIssues(doc,refs)[0];assert.ok(i,t);assert.equal(t.slice(i.start,i.end),i.text);const fixed=t.slice(0,i.start)+i.suggestion+t.slice(i.end);assert.equal(serialCommaIssues(makeDocument([fixed],'Current'),refs).length,0);assert.ok(jointStylisticIssues(doc,refs).some(x=>x.start===i.start&&x.suggestion===i.suggestion),t);}
});
test('grouped noun lists preserve modifier scope and require the final semicolon',()=>{
 const t='The list includes city-owned buildings, public schools; county-funded programs, private clinics and tax-exempt organizations, full-time employees.',i=semicolonSeriesIssues(makeDocument([t],'Current'),refs)[0];assert.ok(i);assert.equal(t.slice(i.start,i.end),'and');assert.equal(i.suggestion,'; and');
});
test('clauses, nested alternatives, names, quoted wording and unknown modifiers remain manual',()=>{
 for(const t of ['The list includes state-owned buildings, county-funded programs and offices that shall administer the program.','The list includes city-owned buildings, county-funded programs and public schools or private clinics.','The list includes First School, Second Clinic and Third Hospital.','The list includes invented-modifier programs, clinics and schools.','The term “includes cost-effective programs, clinics and schools” is literal.'])assert.equal(serialCommaIssues(makeDocument([t],'Current'),refs).length,0,t);
});
test('line-divided listed modifiers keep conjunction offsets outside the printed margin',()=>{
 const doc=makeDocument(['line 1 The list includes cost-\nline 2 effective programs, private clinics and public schools.'],'Current'),i=serialCommaIssues(doc,refs)[0];assert.equal(doc.text.slice(i.start,i.end),'and');assert.equal(i.text,'and');assert.equal(i.suggestion,', and');
});
