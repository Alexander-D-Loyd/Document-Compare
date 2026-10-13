import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {ratioIssues,explicitRatioParts}from '../app/style-ratios.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=d=>ratioIssues(typeof d==='string'?makeDocument([d],'Current'):d,refs);
test('explicit LCB ratios recognize complete canonical multiword endpoint quantities',()=>{
 for(const [text,suggestion]of [['Use a ratio of twenty-one to forty-seven.','21 to 47'],['Use a ratio of one hundred two to five.','102 to 5'],['Use a proportion of one thousand to two thousand forty-five.','1,000 to 2,045'],['Use odds of one hundred and five : two hundred and ten.','105:210'],['Use a ratio of one to 1,200.','1 to 1,200']]){
  const doc=makeDocument([text],'Current'),before=JSON.stringify(doc),found=check(doc);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,suggestion);assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);assert.equal(JSON.stringify(doc),before);assert.equal(check(text.replace(found[0].text,suggestion)).length,0);
 }
});
test('multiword ratio coordination keeps complete separate endpoint pairs',()=>{
 const text='Use a ratio of twenty-one to forty-seven or one hundred two to three hundred ten.';assert.deepEqual(check(text).map(i=>i.suggestion),['21 to 47','102 to 310']);assert.deepEqual(explicitRatioParts(text).map(p=>text.slice(p.start,p.end)),['twenty-one to forty-seven','one hundred two to three hundred ten']);
 assert.deepEqual(check('Use a ratio of one to two and three to four.').map(i=>i.suggestion),['1 to 2','3 to 4']);
});
test('incomplete, noncanonical, ambiguous and malformed endpoints do not produce fragment corrections',()=>{
 for(const text of ['Use a ratio of twenty one one to five.','Use a ratio of one hundred hundred to five.','Use a ratio of one to one hundred hundred.','Use a ratio of one to one hundred and five to seven.','Use a ratio of one and two to five.','Use a ratio of one to 1,20.','Use a ratio of one to 1234,000.','Use a ratio of one to 1.2.3.','Use a ratio of one to 1/2.','Use a ratio of one to one hundred two-way lanes.','Use a ratio of one to 100-two-way lanes.','Use a ratio of one to one hundred and and five.'])assert.equal(check(text).length,0,text);
});
test('complete original multiword endpoints retain Unicode and removed-component protections',()=>{
 for(const text of ['Use a ratio of twenty-oneé to five.','Use a ratio of one to one hundred two\u0301.'])assert.equal(check(text).length,0,text);
 const text='Use a ratio of one hundred x two to five.',doc=makeDocument([text],'Current'),start=text.indexOf(' x ')+1;doc.excluded=[...(doc.excluded||[]),{start,end:start+1}];assert.equal(check(doc).length,0);
});
test('one whole ratio finding owns ordinary numeral and compound-number fragments in joint review',()=>{
 for(const text of ['Use a ratio of twenty one to forty seven.','Use a ratio of one hundred and two to five.']){
  const doc=makeDocument([text],'Current'),found=jointStylisticIssues(doc,refs),ratio=found.find(i=>i.checkId==='ratios');assert.ok(ratio,text);assert.equal(found.filter(i=>i.start<ratio.end&&i.end>ratio.start).length,1,text);
 }
});
test('safe written values and arbitrary-precision figures retain independent limits',()=>{
 const text='Use a ratio of nine trillion to 123456789012345678901234567890.';assert.equal(check(text)[0].suggestion,'9,000,000,000,000 to 123456789012345678901234567890');
 assert.equal(check('Use a ratio of nine thousand trillion to five.').length,0);
});
test('recognized cross-page multiword quantities restore complete physical source selections',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 121\nThe people do enact as follows:\nline 1 Use a ratio of twenty-one to one hundred\n97','AB 121 — 2 —\nline 1 and two.'],'Current');for(const b of doc.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{start:0,end:b.text.length,anchor:'left'}]};const i=check(doc)[0];assert.ok(i);assert.equal(i.suggestion,'21 to 102');assert.equal(doc.text.slice(i.start,i.end),i.text);assert.equal(i.start,doc.text.indexOf('twenty-one'));assert.equal(i.end,doc.text.indexOf('and two')+7);
});
