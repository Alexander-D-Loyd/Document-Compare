import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
const pairs=[['The oral perception of sounds is measured.','oral','aural'],['The peremptory preference over other cases shall apply.','peremptory','preemptory'],['The county General Fund shall retain reserves.','General Fund','general fund'],['Each federal Court of Appeals shall review the petition.','Court of Appeals','court of appeals']];
test('remaining meaning and jurisdiction entries require explicit source context',()=>{
 for(const [t,term,suggestion] of pairs){const found=check(t);assert.equal(found.length,1,t);assert.equal(found[0].text,term);assert.equal(found[0].suggestion,suggestion);assert.equal(check(t.replace(term,suggestion)).length,0);}
 for(const t of ['The oral perception of auditory signals is measured.','The peremptory preference over all other applications shall apply.','The county’s General Fund shall retain reserves.','Any federal Courts of Appeals shall review the petition.'])assert.equal(check(t).length,1,t);
});
test('speech, decisive actions, specific funds and complete court names stay protected',()=>{
 for(const t of ['An oral examination is required.','The oral perception is measured.','The peremptory challenge is permitted.','The peremptory order shall apply.','The preference over other cases shall apply.','The General Fund shall retain reserves.','The State General Fund shall retain reserves.','The county General Fund Advisory Board shall meet.','The United States Court of Appeals for the Ninth Circuit shall review the petition.','The Court of Appeals shall review the petition.','Each state Court of Appeal shall review the petition.'])assert.equal(check(t).length,0,t);
});
test('contextual checks protect quotations and source strikeouts and retain multiline spans',()=>{
 for(const [t,term,suggestion] of pairs){assert.equal(check('The term “'+t+'” is literal.').length,0);const d=makeDocument([t],'Current'),issue=jointStylisticIssues(d,refs)[0];d.struck=[{start:issue.start,end:issue.end}];assert.equal(jointStylisticIssues(d,refs).length,0);}
 const d=makeDocument(['line 1 Each federal Court\nline 2 of Appeals shall review the petition.'],'Current'),found=jointStylisticIssues(d,refs);assert.equal(found.length,1);assert.equal(d.text.slice(found[0].start,found[0].end),found[0].text);assert.equal(found[0].suggestion,'court of appeals');
});
test('coverage credits only the four tested discrete entries',()=>{
 const rows=styleRuleInventory(refs);for(const t of ['aural','preemptory (preference)','general fund (county)','court of appeals or courts of appeals (U.S.)'])assert.equal(rows.find(r=>r.text===t).status,'Partially automated',t);
 for(const t of ['General Fund (state)','assigner','reviver'])assert.equal(rows.find(r=>r.text===t).status,'Partially automated',t);
 assert.equal(rows.find(r=>r.id==='lcb-17-7').status,'Partially automated');
});
