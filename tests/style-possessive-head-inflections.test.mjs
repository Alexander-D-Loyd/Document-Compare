import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {contextualPunctuationIssues}from '../app/style-punctuation.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=d=>contextualPunctuationIssues(typeof d==='string'?makeDocument([d],'Current'):d,refs).filter(i=>i.rule==='Punctuation: Listed possessive forms');
const pairs=[['attorneys fee','attorney’s fee'],['contractors licenses','contractor’s licenses'],['masters degrees','master’s degrees'],['farmers markets','farmers’ markets'],['cashiers check','cashier’s check'],['mechanics lien','mechanic’s lien'],['travelers check','traveler’s check']];
test('listed possessive phrases support bounded singular/plural inflections of their ordinary noun heads',()=>{
 for(const [form,preferred]of pairs){const found=check('The '+form+' applies.');assert.equal(found.length,1,form);assert.equal(found[0].text,form);assert.equal(found[0].suggestion,preferred);assert.equal(found[0].guidePage,7);}
});
test('accepted source possessives and unfamiliar head derivatives remain unchanged',()=>{
 for(const [,preferred]of pairs)assert.equal(check('The '+preferred+' applies.').length,0,preferred);
 for(const form of ['masters degreeholder','contractors licensure','farmers marketwide','attorneys feel','mechanics lienholder'])assert.equal(check('The '+form+' applies.').length,0,form);
});
test('inflected possessive phrases preserve literal and official-name contexts',()=>{
 for(const form of ['“masters degrees”','"masters\ndegrees"','Farmers Markets Program','Contractors Licenses Board'])assert.equal(check('The '+form+' applies.').length,0,form);
});
test('inflected possessive evidence is complete across known page heads and keeps original offsets',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 121\nThe people do enact as follows:\nline 1 The contractors\n97','AB 121 — 2 —\nline 1 licenses apply.'],'Current'),before=JSON.stringify(doc),found=check(doc);assert.equal(found.length,1);assert.equal(found[0].suggestion,'contractor’s licenses');assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);assert.equal(JSON.stringify(doc),before);
});
test('masked source and combining marks cannot manufacture an inflected possessive phrase',()=>{
 for(const text of ['The masters degrees\u0301 apply.','The masters x degrees apply.']){const doc=makeDocument([text],'Current');if(text.includes(' x ')){const start=text.indexOf('x');doc.excluded=[...(doc.excluded||[]),{start,end:start+1}];}assert.equal(check(doc).length,0,text);}
});
