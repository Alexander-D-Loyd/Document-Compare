import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs).filter(i=>i.checkId==='listed-nouns');

test('selected causative and perception clauses preserve independent child/cash/water/stream/land verb uses',()=>{
 for(const text of ['Let the child care for the pet.','The agency shall let the child care for an eligible person.','Make the child care for the pet.','Watch the child care for the pet.','Let the water flow.','Let the water flow freely.','Let the water flow through the main channel.','The agency watched the cash flow into the account.','We shall see the stream flow down the channel.','We had the land fill with soil.','They watched the land fill the ditch.','The agency shall let the water flow into the pond.'])assert.equal(check(text).length,0,text);
});

test('complete finite water courses clause is distinct from nominal objects and noun subjects',()=>{
 for(const text of ['The water courses through the ditch.','The water courses into a small channel.','The water courses from the pond.','The water courses along the river.'])assert.equal(check(text).length,0,text);
 for(const text of ['The water courses are contaminated.','The water courses through the ditch are contaminated.','The agency shall inspect the water courses through the ditch.','The water courses through the ditch must be inspected.','The agency shall provide a report of the water courses into the channel.']){const found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].text,'water courses');assert.equal(found[0].suggestion,'watercourses');assert.equal(found[0].guidePage,14);}
});

test('nominal compound forms remain checked in the same causative and perception environments',()=>{
 for(const [text,form,wanted] of [['The statute makes the child care for the community available.','child care','childcare'],['Make the child care affordable.','child care','childcare'],['Let the child care program begin.','child care','childcare'],['Watch the cash flow report.','cash flow','cashflow'],['The agency shall review the cash flow into the account.','cash flow','cashflow'],['The agency shall regulate the stream flow.','stream flow','streamflow'],['Let the land fill facility operate.','land fill','landfill']]){const found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].text,form);assert.equal(found[0].suggestion,wanted);assert.equal(text.slice(found[0].start,found[0].end),form);}
});

test('unknown syntax, clipped sentence windows and nonterminal complements do not receive an invented verb classification',()=>{
 for(const text of ['The water courses through unfamiliarword.','The agency shall review the water courses through the ditch.','Let the child care for the pet continue.','Let the water flow for the community.'])assert.equal(check(text).length,1,text);
 const prefix='The agency shall review '+('existing available '.repeat(15));assert.equal(check(prefix+'the water courses through the ditch.').length,1,'A clipped context window cannot establish a new sentence');
});

test('source offset masking keeps cross-page verb guards and independent noun selections intact',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 577\nThe people of the State of California do enact as follows:\nline 1 Let the water\n94','AB 577 — 2 —\nline 1 flow through the channel.\nline 2 The water courses are contaminated.'],'Current'),found=jointStylisticIssues(doc,refs).filter(i=>i.checkId==='listed-nouns');assert.equal(found.length,1);assert.equal(found[0].text,'water courses');assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);
});
