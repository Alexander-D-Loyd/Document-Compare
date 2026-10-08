import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {GEOLOGIC_NAMES,geologicNameIssues} from '../app/style-geologic-names.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>geologicNameIssues(makeDocument([text],'Current'),refs);
test('formal geologic names require their rank or explicit named structural term',()=>{
 assert.deepEqual(check('The proterozoic eon and Cambrian period include the cincinnati arch.').map(i=>i.suggestion),['Proterozoic Eon','Cambrian Period','Cincinnati Arch']);
 for(const name of GEOLOGIC_NAMES){assert.equal(check('The '+name.toLowerCase()+' is discussed.').length,1,name);assert.equal(check('The '+name+' is discussed.').length,0,name);}
 assert.equal(check('A period of time and a historic era are discussed. A geologic arch is discussed. Jurassic material is mentioned.').length,0);
});
test('geologic quotations, headings and struck source wording preserve copy while wrapped source positions remain precise',()=>{
 assert.equal(check('The author wrote “cambrian period”. PROTEROZOIC EON is the heading.').length,0);
 const doc=makeDocument(['line 1 The cambrian\nline 2 period is discussed.'],'Current');const found=jointStylisticIssues(doc,refs);assert.equal(found.length,1);assert.equal(found[0].suggestion,'Cambrian Period');assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);
 doc.struck=[{start:found[0].start,end:found[0].end}];assert.equal(geologicNameIssues(doc,refs).length,0);
});
