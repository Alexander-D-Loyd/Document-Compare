import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {lcbContextualIssues} from '../app/lcb-contextual.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=d=>lcbContextualIssues(d,refs).filter(i=>i.category==='Modifier hyphenation');
const struck=(text,word)=>{const d=makeDocument([text],'Current'),start=d.text.indexOf(word);assert.ok(start>=0);d.struck=[{start,end:start+word.length}];return d;};
test('productive and complete nominal participles require intact noun evidence',()=>{
 for(const text of ['The agency requires community based former funding.','The mental health related former service provides assistance.','The agency requires family planning related former services.'])assert.equal(check(struck(text,'former')).length,0,text);
 for(const text of ['The agency requires community based funding.','The mental health related service provides assistance.','The agency requires family planning related services.'])assert.equal(check(makeDocument([text],'Current')).length,1,text);
});
test('an exact preposition, object verb or copula cue cannot bridge source strikes',()=>{
 for(const text of ['The agency requires former community based funding.','The agency acts within former a community based program.','The plan is former a mental health related program.'])assert.equal(check(struck(text,'former')).length,0,text);
 for(const text of ['The agency requires community based funding.','The agency acts within a community based program.','The plan is a mental health related program.'])assert.equal(check(makeDocument([text],'Current')).length,1,text);
});
test('finite predicate and coordinated noun evidence cannot bridge removed source wording',()=>{
 for(const text of ['The community based program former applies.','A mental health related service and a board approved former policy are adopted.','A community based program and a board approved policy former exists.'])assert.equal(check(struck(text,'former')).length,0,text);
 for(const text of ['The community based program applies.','A mental health related service and a board approved policy are adopted.','A community based program and a board approved policy exists.'])assert.ok(check(makeDocument([text],'Current')).length,text);
});
test('table rows cannot supply a recognized noun or the establishing contextual cue',()=>{
 const noun=makeDocument(['The agency requires community based\nfunding................ 100'],'Current');assert.equal(check(noun).length,0);
 const before=makeDocument(['The agency requires\ncommunity based funding.'],'Current');before.blocks[0].formatting={headerGaps:[1,2]};assert.equal(check(before).length,0);
 const after=makeDocument(['The mental health related service\nprovides assistance.'],'Current');after.blocks[1].formatting={headerGaps:[1,2]};assert.equal(check(after).length,0);
});
test('unknown ignored bridges are protected; identified running heads retain complete modifiers and their cues',()=>{
 const unknown=makeDocument(['The agency requires community based\nunknown marker\nfunding.'],'Current'),b=unknown.blocks[1];b.ignored=true;unknown.excluded=[{start:b.start,end:b.end}];assert.equal(check(unknown).length,0);
 for(const pages of [['ASSEMBLY BILL No. 9999\nline 10 The agency requires community','AB 9999 — 2 —\nline 1 based funding.'],['ASSEMBLY BILL No. 9999\nline 10 The agency requires','AB 9999 — 2 —\nline 1 community based funding.'],['ASSEMBLY BILL No. 9999\nline 10 The community based program','AB 9999 — 2 —\nline 1 applies.']]){
  const d=makeDocument(pages,'Current');d.blocks.find(b=>b.ignored).formatting={headerParts:[{text:'AB 9999'}]};const issues=check(d);assert.equal(issues.length,1);assert.equal(issues[0].suggestion,'community-based');assert.equal(issues[0].text,d.text.slice(issues[0].start,issues[0].end));
 }
});
test('wrapped literal modifiers remain literal, and independent numeral review continues',()=>{
 const d=makeDocument(['The literal "The agency requires community\nbased funding" remains. Funds support 1 claimant.'],'Current');assert.equal(check(d).length,0);assert.ok(jointStylisticIssues(d,refs).some(i=>i.suggestion==='one'));
});
test('unrelated removed words do not block an intact selected phrase or alternate valid cue',()=>{
 for(const text of ['The former provision ends; the agency requires community based funding.','The agency requires former community based funding applies.']){const issues=check(struck(text,'former'));assert.equal(issues.length,1);assert.equal(issues[0].suggestion,'community-based');}
 for(const text of ['The department based payments on records.','A community based program.','The mental health based funding.','The Community Based Program applies.'])assert.equal(check(makeDocument([text],'Current')).length,0,text);
});
test('source boundaries are refreshed when document metadata changes',()=>{
 const d=makeDocument(['The agency requires community based\nfunding.'],'Current');assert.equal(check(d).length,1);d.blocks[1].formatting={headerGaps:[1,2]};assert.equal(check(d).length,0);delete d.blocks[1].formatting;assert.equal(check(d).length,1);
});
