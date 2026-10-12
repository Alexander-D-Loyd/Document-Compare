import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {sharedModifierIssues} from '../app/style-shared-modifiers.mjs';import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),shared=d=>sharedModifierIssues(d,refs);
const cases=[['full or part time','full- or part-time','employees'],['full- or part time','full- or part-time','employees'],['long and short term','long- and short-term','contracts'],['low and moderate income','low- and moderate-income','households'],['moss and ivy covered','moss- and ivy-covered','walls']];
test('complete shared-expression scope retains finite families and meaning-dependent manual limits',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Complete shared modifier expressions');assert.match(row.text,/four shared-element families/);assert.match(row.text,/meaning-dependent shared elements remain manual/);const item=styleRuleInventory(refs).find(r=>r.id==='gpo-6.23');assert.equal(item.status,'Partially automated');assert.match(item.scope,/one complete correction/);
});
test('known shared families check a missing final unit hyphen and missing suspension together',()=>{
 for(const [bad,good,head]of cases){const d=make('The '+bad+' '+head+' are covered.'),before=JSON.stringify(d),r=shared(d);assert.equal(r.length,1,bad);assert.equal(r[0].text,bad);assert.equal(r[0].suggestion,good);assert.equal(d.text.slice(r[0].start,r[0].end),bad);assert.equal(shared(make('The '+good+' '+head+' are covered.')).length,0);assert.equal(JSON.stringify(d),before);}
});
test('final style review owns the complete shared expression instead of only correcting the last modifier',()=>{
 for(const [bad,good,head]of cases){const d=make('The agency provides '+bad+' '+head+'.'),r=jointStylisticIssues(d,refs).filter(i=>i.start<d.text.indexOf(head)&&i.end>d.text.indexOf(bad));assert.equal(r.length,1,bad);assert.equal(r[0].text,bad);assert.equal(r[0].suggestion,good);assert.equal(r[0].checkId,'shared-modifiers');assert.equal(jointStylisticIssues(make('The agency provides '+good+' '+head+'.'),refs).length,0);}
});
test('correct source divisions and listed comma series retain exact complete suggestions',()=>{
 assert.equal(shared(make('The full- or part-\ntime employees are covered.')).length,0);const r=shared(make('The full, half, or part time employees are covered.'));assert.equal(r.length,1);assert.equal(r[0].suggestion,'full-, half-, or part-time');
});
test('unknown excluded content and struck supporting spaces cannot establish a shared modifier',()=>{
 for(const text of ['The full or part-time employees are covered.','The full or part time employees are covered.']){const d=make(text),at=d.text.indexOf(' employees');d.struck=[{start:at,end:at+1}];assert.equal(shared(d).length,0);const e=make(text.replace(' employees',' unknown employees')),start=e.text.indexOf('unknown');e.excluded.push({start,end:start+7});assert.equal(shared(e).length,0);}
});
test('complete supporting heads require original Unicode tokens and no later table or literal',()=>{
 for(const text of ['The full or part-time employeesα are covered.','The full or part time employees2 are covered.','The full or part time employees\u0301 are covered.','The αfull or part time employees are covered.'])assert.equal(shared(make(text)).length,0,text);const table=make('The full or part time\nemployees are covered........100');assert.equal(shared(table).length,0);assert.equal(shared(make('The title "The full or part\ntime employees are covered." is literal.')).length,0);
});
test('known page heads retain the selected full expression and unknown bridges remain protected',()=>{
 const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 The full or part','AB 9999 — 2 —\nline 1 time employees are covered.']);d.blocks.find(b=>b.ignored).formatting={headerParts:[{}]};const before=JSON.stringify(d),r=shared(d);assert.equal(r.length,1);assert.equal(r[0].suggestion,'full- or part-time');assert.equal(r[0].end,d.text.indexOf('time employees')+4);assert.equal(JSON.stringify(d),before);const e=make('The full or part\nunknown marker\ntime employees are covered.'),b=e.blocks[1];b.ignored=true;e.excluded.push({start:b.start,end:b.end});assert.equal(shared(e).length,0);
});
test('final review cannot resurrect a component correction using an incomplete supporting noun',()=>{
 for(const [bad,,head]of cases)for(const suffix of ['α','\u0301','2','_']){
  const text='Funds provide '+bad+' '+head+suffix+'.';
  assert.equal(jointStylisticIssues(make(text),refs).length,0,text);
 }
 for(const [bad,,head]of cases){
  const d=make('Funds provide '+bad+' '+head+'.'),at=d.text.indexOf(' '+head);
  d.struck=[{start:at,end:at+1}];assert.equal(jointStylisticIssues(d,refs).length,0,bad);
 }
});
test('unlisted jurisdiction alternatives predicate uses and listed open income qualifiers are preserved',()=>{
 for(const text of ['The agency participates in state or federally subsidized childcare programs.','The employees work full or part time.','The service is long and short term.','The young and part-time workers are covered.','The very low and moderate-income households are covered.','The Full Or Part Time Employees Program is established.'])assert.equal(shared(make(text)).length,0,text);const r=shared(make('The extremely low income, very low, low and moderate income households are covered.'));assert.equal(r.length,1);assert.equal(r[0].suggestion,'low- and moderate-income');assert.equal(r[0].start,'The extremely low income, very low, '.length);
});
