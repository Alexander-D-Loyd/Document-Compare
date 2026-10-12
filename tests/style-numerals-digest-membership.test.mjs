import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const sentence='Existing law establishes the membership of the board, including 4 licensed veterinarians, 1 registered veterinary technician, and 3 public members.';
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs).filter(i=>i.checkId==='numerals');
test('AB 1502 digest membership uses figures except for one under the explicit LCB rule',()=>{
 const findings=check('LEGISLATIVE COUNSEL’S DIGEST\n'+sentence);
 assert.deepEqual(findings.map(i=>[i.text,i.suggestion,i.context]),[['1','one','Digest']]);
 assert.equal(check('LEGISLATIVE COUNSEL’S DIGEST\n'+sentence.replace('1 registered','one registered')).length,0);
 assert.ok(refs.lcb.pages[20].text.includes('Use figures for all numbers except the number one.'));
});
test('all three figures are checked independently in bill-body prose',()=>{
 assert.deepEqual(check('The people do enact as follows:\n'+sentence).map(i=>[i.text,i.suggestion,i.context]),[['4','four','Bill'],['1','one','Bill'],['3','three','Bill']]);
 assert.equal(check('The people do enact as follows:\n'+sentence.replace('4 licensed','four licensed').replace('1 registered','one registered').replace('3 public','three public')).length,0);
});
test('counts mixed with Article and Section identifiers keep separate scopes',()=>{
 const text='The board includes 4 veterinarians under Article 4, 1 technician under Section 1, and 3 members under Sections 3 and 4.';
 assert.deepEqual(check(text).map(i=>[i.text,i.suggestion]),[['4','four'],['1','one'],['3','three']]);
 assert.equal(check('Sections 3 and 4 have been amended. Sections 3, 4, and 5 authorize the board. Secs. 3 and 4 govern the process.').length,0);
 assert.deepEqual(check('Under Sec. 4, 1 registered technician and 3 public members are appointed.').map(i=>[i.text,i.suggestion]),[['1','one'],['3','three']]);
 assert.equal(check('Sections 123, 124, and 125.1 govern the process.').length,0);
});
test('every small figure is checked in bill prose with the same digest exception',()=>{
 const words=['one','two','three','four','five','six','seven','eight','nine'];
 for(let n=1;n<=9;n++){
  const text='The board includes '+n+' registered technicians under Section '+n+'.';
  assert.deepEqual(check('The people do enact as follows:\n'+text).map(i=>[i.text,i.suggestion]),[[String(n),words[n-1]]]);
  assert.deepEqual(check('LEGISLATIVE COUNSEL’S DIGEST\n'+text).map(i=>[i.text,i.suggestion]),n===1?[['1','one']]:[]);
 }
});
