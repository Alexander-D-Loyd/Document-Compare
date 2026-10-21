import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
import {sourceNameRanges} from '../app/style-source-names.mjs';

const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const title='State Government Oral History Program';
const run=pages=>{const doc=makeDocument(['The people do enact as follows:\n'+pages[0],...pages.slice(1)],'Bill');const before=JSON.stringify(doc),issues=jointStylisticIssues(doc,refs);assert.equal(JSON.stringify(doc),before);for(const i of issues)assert.equal(doc.text.slice(i.start,i.end),i.text);return {doc,issues};};
const stateFindings=issues=>issues.filter(i=>i.checkId==='lcb-guide-priority'&&i.suggestion?.toLowerCase()==='state government');

test('complete printed program name protects its internal generic phrase while adjacent prose remains actionable',()=>{
 const {doc,issues}=run(['line 1 Funds support the '+title+'.\nline 2 State Government provides services.']);
 const actual=stateFindings(issues);assert.equal(actual.length,1);assert.equal(actual[0].start,doc.text.lastIndexOf('State Government'));assert.equal(actual[0].text,'State Government');
});
test('program name protection survives a physical page division without changing source or highlighting margins',()=>{
 const {issues}=run(['line 1 Funds support the State','line 1 Government Oral History Program.\nline 2 State Government provides services.']);
 const actual=stateFindings(issues);assert.equal(actual.length,1);assert.equal(actual[0].text,'State Government');
});
test('truncated, extended and differently spelled titles do not authorize an unrelated generic phrase',()=>{
 for(const name of ['State Government Oral History','State Government Oral History Programmer','State Government Oral History Programé','State Government Oral History Program_2026']){
  assert.equal(sourceNameRanges(name).length,0,name);
  const {issues}=run(['line 1 The '+name+' receives funds.']);assert.equal(stateFindings(issues).length,1,name);
 }
});
test('literal source names require complete Unicode word boundaries and retain original division offsets',()=>{
 for(const text of ['É'+title,title+'é',title+'\u0301',title+'_path','Department of Healthcare Access and Informationé'])assert.equal(sourceNameRanges(text).length,0,text);
 const divided='The State Govern-\nment Oral History Program receives funds.';
 const [range]=sourceNameRanges(divided);assert.equal(divided.slice(range.start,range.end),'State Govern-\nment Oral History Program');
});
test('quoted program variants and their initial capitalization protection remain bill local',()=>{
 const quoted='State Government Oral History Programme';
 assert.equal(stateFindings(run(['line 1 The term “'+quoted+'” is used.\nline 2 '+quoted+' receives funds.']).issues).length,0);
 assert.equal(stateFindings(run(['line 1 '+quoted+' receives funds.']).issues).length,1);
});
