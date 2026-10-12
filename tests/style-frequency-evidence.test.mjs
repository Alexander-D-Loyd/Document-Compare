import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {wordChoiceIssues} from '../app/style-word-choice.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>wordChoiceIssues(makeDocument([text],'Current'),refs).filter(i=>i.rule.endsWith('-frequency'));
test('LCB explicit frequency senses support selected finite, passive and modal event predicates',()=>{
 for(const event of ['report','review','audit','inspection','meeting','reports','reviews','audits','inspections','meetings'])for(const link of ['', 'conducted ', (event.endsWith('s')?'are':'is')+' normally conducted ', 'shall be regularly conducted ', (event.endsWith('s')?'have':'has')+' been conducted ', (event.endsWith('s')?'occur':'occurs')+' ', 'shall occur ', (event.endsWith('s')?'take':'takes')+' place '])for(const [bad,good,frequencies] of [['biannual','biennial',['every two years','once every 2 years']],['biennial','biannual',['twice each year','twice annually','two times per year']]])for(const frequency of frequencies){
  const text='The '+bad+' '+event+' '+link+frequency+'.',issues=check(text);assert.equal(issues.length,1,text);assert.equal(issues[0].suggestion,good,text);assert.equal(text.slice(issues[0].start,issues[0].end),bad,text);
  assert.equal(check(text.replace(bad,good)).length,0,text);
 }
});
test('frequency must describe the same event positively without unrelated or uncertain calendar inference',()=>{
 for(const text of ['The biannual audit is not conducted every two years.','The agency shall not conduct a biannual audit every two years.','The agency prohibits a biennial meeting held twice a year.','A biannual audit every two years is not required.','The biannual audit may be conducted every two years.','The biennial meeting is held at least twice a year.','The biennial meeting is held no more than twice a year.','The biannual report applies; a separate audit occurs every two years.','The biannual audit is issued twice a year and the separate report every two years.','The biennial audit every two years and a biannual report twice yearly are required.','The biannual report is due every year.','The biennial report is issued every six months.','The Biannual Audit Is Conducted Every Two Years Program is named.','The phrase “biannual audit shall be conducted every two years” is literal.'])assert.equal(check(text).length,0,text);
});
test('frequency evidence keeps exact source spans across page boundaries and excludes tables and strikeouts',()=>{
 const d=makeDocument(['line 1 The biannual report shall be\nline 2 issued once every','line 1 two years.\nline 2 The biennial meeting is normally held twice each year.'],'Current');
 const found=wordChoiceIssues(d,refs).filter(i=>i.rule.endsWith('-frequency'));assert.deepEqual(found.map(i=>i.suggestion),['biennial','biannual']);for(const i of found)assert.equal(d.text.slice(i.start,i.end),i.text);
 assert.ok(jointStylisticIssues(d,refs).some(i=>i.suggestion==='biennial'));assert.ok(jointStylisticIssues(d,refs).some(i=>i.suggestion==='biannual'));
 d.struck=found.map(({start,end})=>({start,end}));assert.equal(wordChoiceIssues(d,refs).filter(i=>i.rule.endsWith('-frequency')).length,0);
 assert.equal(check('The biannual report is issued every two years........ 100').length,0);
});
