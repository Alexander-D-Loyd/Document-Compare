import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {contextualPunctuationIssues}from '../app/style-punctuation.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const dates=d=>contextualPunctuationIssues(typeof d==='string'?makeDocument([d],'Current'):d,refs).filter(i=>['Punctuation: Full dates','Punctuation: Month and year'].includes(i.rule));
test('divided calendar date comma requires the complete intact continuation word',()=>{
 for(const text of ['On June 3 0, 2019 theé board acted.','On June 3 0, 2019 the\u0301 board acted.'])assert.equal(dates(text).length,0,text);
 for(const kind of ['struck','excluded']){const text='On June 3 0, 2019 x the board acted.',doc=makeDocument([text],'Current'),start=text.indexOf(' x ')+1;doc[kind]=[...(doc[kind]||[]),{start,end:start+1}];assert.equal(dates(doc).length,0,kind);}
});
test('separated-day corrections retain complete source selections and only add warranted commas',()=>{
 for(const [text,suggestion]of [['Until June 3 0, 2019.','June 30, 2019'],['On June 3 0, 2019 the board acted.','June 30, 2019,']]){const doc=makeDocument([text],'Current'),before=JSON.stringify(doc),found=dates(doc);assert.equal(found.length,1);assert.equal(found[0].text,'June 3 0, 2019');assert.equal(found[0].suggestion,suggestion);assert.equal(JSON.stringify(doc),before);}
});
test('month-year corrections remain within the supported four-digit calendar years',()=>{
 for(const text of ['During April, 0000 it changed.','In May, 0123 it changed.'])assert.equal(dates(text).length,0,text);
 assert.equal(dates('During April, 2027 it changed.').length,1);
});
test('separated-day continuation can cross known running heads without accepting an uncertain bridge',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 121\nThe people do enact as follows:\nline 1 On June 3 0, 2019\n97','AB 121 — 2 —\nline 1 the board acted.'],'Current'),found=dates(doc);assert.equal(found.length,1);assert.equal(found[0].suggestion,'June 30, 2019,');
 const text='On June 3 0, 2019 x the board acted.',bad=makeDocument([text],'Current'),start=text.indexOf(' x ')+1;bad.excluded=[...(bad.excluded||[]),{start,end:start+1}];assert.equal(dates(bad).length,0);
});
