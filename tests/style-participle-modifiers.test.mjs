import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {participleModifierIssues} from '../app/style-participle-modifiers.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>participleModifierIssues(makeDocument([text],'Current'),refs);
test('participle modifiers require independent noun-phrase evidence',()=>{
 for(const [a,b,c] of [['county','owned','properties'],['board','funded','programs'],['state','licensed','facilities'],['family','operated','businesses'],['government','sponsored','research'],['manufacturer','provided','equipment'],['employer','financed','plans']]){
  const phrase=a+' '+b,text='The '+phrase+' '+c+' are reviewed.',found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,a+'-'+b);assert.equal(text.slice(found[0].start,found[0].end),phrase);assert.equal(check(text.replace(phrase,a+'-'+b)).length,0);
  assert.ok(jointStylisticIssues(makeDocument([text],'Current'),refs).some(i=>i.suggestion===a+'-'+b));
  assert.equal(check('The agency shall provide '+phrase+' '+c+'.').length,1);
 }
});
test('ordinary past-tense clauses, predicates, names, quotes and tables remain protected',()=>{
 for(const text of ['The county owned properties.','The board funded programs.','The family operated businesses and owned properties.','The programs are government sponsored.','A publicly funded program applies.','The term “county owned properties are reviewed” is literal.','The State Licensed Facilities Program applies.','The board funded programs...........100'])assert.equal(check(text).length,0,text);
 const doc=makeDocument(['The county owned properties are reviewed.'],'Current');doc.struck=[{start:4,end:16}];assert.equal(participleModifierIssues(doc,refs).length,0);
});
test('source line wrapping keeps complete compound boundaries',()=>{
 const doc=makeDocument(['line 1 The county\nline 2 owned properties are reviewed.'],'Current');const i=participleModifierIssues(doc,refs)[0];assert.equal(doc.text.slice(i.start,i.end),'county\nline 2 owned');assert.equal(i.suggestion,'county-owned');
});
