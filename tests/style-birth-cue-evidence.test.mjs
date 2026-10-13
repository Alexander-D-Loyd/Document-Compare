import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {wordChoiceIssues}from '../app/style-word-choice.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=doc=>wordChoiceIssues(doc,refs).filter(i=>i.rule==='Spelling and usage: born-birth-date');
test('LCB birth sense requires the full same-sentence original birth cue',()=>{
 for(const cue of ['birth certificate','date of birth','birth record'])for(const subject of ['child','person','applicant','patient'])for(const copula of ['was','is']){
  const d=makeDocument(['The '+cue+' states that the '+subject+' '+copula+' borne on June 1.'],'Current'),i=check(d)[0];assert.ok(i,cue+' '+subject+' '+copula);assert.equal(i.suggestion,'born');assert.equal(d.text.slice(i.start,i.end),'borne');assert.match(d.text.slice(i.evidenceStart,i.evidenceEnd),new RegExp(cue));assert.equal(check(makeDocument([d.text.replace('borne','born')],'Current')).length,0);
 }
 for(const whitespace of ['\n', ' '.repeat(145), '\nline 2 ']){const d=makeDocument(['line 1 The birth'+whitespace+'certificate states that the person was borne on June 1.'],'Current');assert.equal(check(d).length,1,JSON.stringify(whitespace));}
});
test('removed or quoted birth cues cannot manufacture the meaning of borne',()=>{
 for(const term of ['birth','certificate'])for(const field of ['struck','excluded']){const d=makeDocument(['The birth certificate states that the person was borne on June 1.'],'Current'),start=d.text.indexOf(term);d[field].push({start,end:start+term.length});assert.equal(check(d).length,0,field+' '+term);}
 for(const field of ['struck','excluded']){const d=makeDocument(['The birthXcertificate states that the person was borne on June 1.'],'Current'),start=d.text.indexOf('X');d[field].push({start,end:start+1});assert.equal(check(d).length,0,field+' masked cue separator');}
 for(const text of ['The “birth certificate” states that the person was borne on June 1.','The "date of birth" states that the person was borne on June 1.','The “birth\ncertificate” states that the person was borne on June 1.'])assert.equal(check(makeDocument([text],'Current')).length,0,text);
});
test('Unicode partial words unknown content and table cues remain protected',()=>{
 for(const cue of ['ébirth certificate','birth certificateé','rebirth certificate','date of birthé','birth record2','birth record_name'])assert.equal(check(makeDocument(['The '+cue+' states that the person was borne on June 1.'],'Current')).length,0,cue);
 const table=makeDocument(['The birth certificate........ 100\nstates that the person was borne on June 1.'],'Current');assert.equal(check(table).length,0);
 const unknown=makeDocument(['The birth certificate\nunknown marker\nstates that the person was borne on June 1.'],'Current'),b=unknown.blocks[1];b.ignored=true;unknown.excluded=[{start:b.start,end:b.end}];assert.equal(check(unknown).length,0);
});
test('previous-sentence cues and carried or unstated meanings remain manual',()=>{
 for(const text of ['The birth certificate is required. The person was borne on June 1.','The person was borne on June 1.','The patient was borne on a stretcher.','The birth record states that the patient was borne on the vehicle.','The birth certificate states that the child was borne in June.','The certificate states that the child was borne on June 1.'])assert.equal(check(makeDocument([text],'Current')).length,0,text);
});
test('birth-cue evidence retains physical pages and margins without changing source',()=>{
 const d=makeDocument(['line 1 The birth\nline 2 certificate states that the','line 1 person was borne on June 1.'],'Current'),before=JSON.stringify(d),i=check(d)[0];assert.ok(i);assert.equal(i.text,'borne');assert.match(d.text.slice(i.evidenceStart,i.evidenceEnd),/birth\nline 2 certificate/u);assert.match(d.text.slice(i.evidenceStart,i.evidenceEnd),/line 1 person/u);assert.equal(JSON.stringify(d),before);
});
