import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {lcbContextualIssues}from '../app/lcb-contextual.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const run=d=>lcbContextualIssues(typeof d==='string'?makeDocument([d],'Current'):d,refs).filter(i=>i.category==='Articles before initials');
test('known initialism article evidence rejects original combining marks and masked word boundaries',()=>{
 assert.equal(run('A FCC\u0301 ruling applies.').length,0);
 for(const [text,letter]of [['A xFCC ruling applies.','x'],['A FCCx ruling applies.','x']])for(const kind of ['struck','excluded']){const doc=makeDocument([text],'Current'),start=text.indexOf(letter);doc[kind]=[...(doc[kind]||[]),{start,end:start+1}];assert.equal(run(doc).length,0,text+' '+kind);}
});
test('unknown exclusions cannot manufacture complete known initialism article evidence',()=>{
 const text='A x FCC ruling applies.';for(const kind of ['struck','excluded']){const doc=makeDocument([text],'Current'),start=text.indexOf('x');doc[kind]=[...(doc[kind]||[]),{start,end:start+1}];assert.equal(run(doc).length,0,kind);}
});
test('known initialism fragments inside explicit identifier continuations remain manual',()=>{
 for(const text of ['Use a FCC/2 identifier.','Use a FCC-12 identifier.','Use a FCC.X identifier.','Use a FCC@agency.gov identifier.','Use /a FCC for the path.'])assert.equal(run(text).length,0,text);
});
test('known article findings keep exact original marks across recognized page heads',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 121\nThe people do enact as follows:\nline 1 A\n97','AB 121 — 2 —\nline 1 FCC ruling applies.'],'Current'),before=JSON.stringify(doc),found=run(doc);assert.equal(found.length,1);assert.equal(found[0].suggestion,'An FCC');assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);assert.equal(JSON.stringify(doc),before);
});
test('known initialisms preserve correct articles and wrapped literal source quotations',()=>{
 for(const text of ['An FCC ruling applies.','A NASA program applies.','The text reads "A\nFCC ruling" as a literal.'])assert.equal(run(text).length,0,text);
 assert.equal(run('A FCC ruling applies.')[0].suggestion,'An FCC');
});
