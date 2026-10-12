import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('the former onetime sense requires an explicit former-office clause',()=>{
 for(const term of ['one-time','one time'])for(const role of ['mayor','governor','senator','judge','president','director','manager','employee','member','principal','superintendent']){
  const t='The '+term+' '+role+' who formerly held that office shall retain records.',found=check(t);assert.equal(found.length,1,t);assert.equal(found[0].suggestion,'onetime');assert.equal(found[0].text,term);assert.equal(check(t.replace(term,'onetime')).length,0);
 }
});
test('explicit above-provision cues select preceding rather than relinquishing',()=>{
 for(const head of ['provisions','paragraphs','subdivisions','sections']){const t='The forgoing '+head+' above apply.',found=check(t);assert.equal(found.length,1,t);assert.equal(found[0].suggestion,'foregoing');assert.equal(check(t.replace('forgoing','foregoing')).length,0);}
});
test('uncued meanings, single actions, quotations and literal names remain protected',()=>{
 for(const t of ['The one-time payment is paid only once.','The one-time mayor shall retain records.','The applicant is forgoing payment.','The applicant shall forgo payment.','The term “one-time mayor who formerly held that office” is literal.','The term “forgoing provisions above apply” is literal.','The One-Time Mayor Program is named.'])assert.equal(check(t).length,0,t);
});
test('coverage maps the explicit source senses without claiming every meaning is automated',()=>{
 const rows=styleRuleInventory(refs);for(const text of ['onetime (formerly; u.m.)','forego (precede)'])assert.equal(rows.find(r=>r.guide==='lcb'&&r.text===text).status,'Partially automated');
});
