import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {contextualPunctuationIssues} from '../app/style-punctuation.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const review=t=>contextualPunctuationIssues(makeDocument([t],'Current'),refs).filter(i=>i.rule==='Punctuation: Time possessives');
test('Complete compound and larger counts supply possessive time cues',()=>{
 for(const [count,unit,noun] of [['twenty-one','days','notice'],['one hundred','days','notice'],['one thousand','weeks','pay'],['twelve','years','experience'],['fourteen','hours','labor'],['1,000','days','notice'],['1.5','days','notice'],['one','week','notice'],['five','months','delay'],['24','hours','notice'],['30','minutes','notice']]){
  const text='The agency shall provide '+count+' '+unit+' '+noun+'.',issues=review(text);assert.equal(issues.length,1,text);assert.equal(issues[0].suggestion.endsWith(unit+(unit.endsWith('s')?'’':'’s')+' '+noun),true,text);assert.equal(text.slice(issues[0].start,issues[0].end),issues[0].text);assert.equal(review(text.replace(unit+' '+noun,unit+(unit.endsWith('s')?'’':'’s')+' '+noun)).length,0,text);
 }
});
test('A written count correction coexists with the separate missing possessive',()=>{
 const text='The agency shall provide twelve days notice.',issues=jointStylisticIssues(makeDocument([text],'Current'),refs);assert.ok(issues.some(i=>i.text==='twelve'&&i.suggestion==='12'));assert.ok(issues.some(i=>i.text==='days notice'&&i.suggestion==='days’ notice'));
 const digest='LEGISLATIVE COUNSEL’S DIGEST\nProvide four days notice.',found=jointStylisticIssues(makeDocument([digest],'Current'),refs);assert.ok(found.some(i=>i.checkId==='numerals'));assert.ok(found.some(i=>i.text==='days notice'&&i.suggestion==='days’ notice'));
 // LCB's small bill duration form and independent time possessive both
 // remain active under the reference-order priority policy.
 const bill=jointStylisticIssues(makeDocument(['Provide 4 days notice.'],'Current'),refs);assert.ok(bill.some(i=>i.checkId==='numerals'&&i.suggestion==='four'&&i.guideId==='lcb'));assert.ok(bill.some(i=>i.text==='days notice'&&i.suggestion==='days’ notice'));
});
test('Expanded time possessives protect quotes, fractions, existing apostrophes and unrelated counts',()=>{
 for(const text of ['The term “one hundred days notice” is literal.','The officer has twelve years’ experience.','The term is twenty-one days.','The person has one-half years experience.','Provide 2/3 years experience.','Provide -14 days notice.'])assert.equal(review(text).length,0,text);
 const d=makeDocument(['line 1 The agency shall provide twenty-one\nline 2 days notice.'],'Current');const i=contextualPunctuationIssues(d,refs).find(i=>i.rule==='Punctuation: Time possessives');assert.ok(i);assert.equal(d.text.slice(i.start,i.end),'days notice');d.struck=[{start:i.start,end:i.end}];assert.ok(!contextualPunctuationIssues(d,refs).some(i=>i.rule==='Punctuation: Time possessives'));
});
