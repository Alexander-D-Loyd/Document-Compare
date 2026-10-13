import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {lcbContextualIssues}from '../app/lcb-contextual.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const run=d=>lcbContextualIssues(typeof d==='string'?makeDocument([d],'Current'):d,refs).filter(i=>i.rule==='Hyphenation, item 4');
test('finite foreign phrases preserve accepted open forms and correct whole known hyphen forms',()=>{
 for(const phrase of ['ex officio','bona fide','per capita','per diem','prima facie','de minimis','inter vivos']){assert.equal(run('The '+phrase+' arrangement applies.').length,0);const bad=phrase.replaceAll(' ','-'),found=run('The '+bad+' arrangement applies.');assert.equal(found.length,1);assert.equal(found[0].text,bad);assert.equal(found[0].suggestion,phrase);}
});
test('foreign phrase preferences reject original Unicode fragments and deleted word boundaries',()=>{
 for(const text of ['Use ex-officio\u0301 members.','Use éxex-officio members.'])assert.equal(run(text).length,0,text);
 for(const text of ['Use xex-officio members.','Use ex-officiox members.'])for(const key of ['struck','excluded']){const doc=makeDocument([text],'Current'),start=text.indexOf('xex')>=0?text.indexOf('xex'):text.indexOf('officiox')+7;doc[key]=[...(doc[key]||[]),{start,end:start+1}];assert.equal(run(doc).length,0,text+' '+key);}
});
test('wrapped quoted foreign phrases and complete table rows remain protected',()=>{
 assert.equal(run('The label reads "ex-\nofficio members" as literal text.').length,0);
 assert.equal(run('The label reads "ex-officio\nmembers" as literal text.').length,0);
 assert.equal(run('ex-officio ........ 20').length,0);
});
test('unknown source exclusions cannot form an open foreign phrase correction',()=>{
 const text='Use ex-xofficio members.';for(const key of ['struck','excluded']){const doc=makeDocument([text],'Current'),start=text.indexOf('xoff');doc[key]=[...(doc[key]||[]),{start,end:start+1}];assert.equal(run(doc).length,0,key);}
});
test('known foreign phrase findings preserve source and ordinary neighboring prose checks',()=>{
 const doc=makeDocument(['The ex-officio members advise the board.'],'Current'),before=JSON.stringify(doc),found=run(doc);assert.equal(found.length,1);assert.equal(doc.text.slice(found[0].start,found[0].end),'ex-officio');assert.equal(JSON.stringify(doc),before);
});
