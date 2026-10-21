import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {reviewStyleIssues} from '../app/style-review.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=d=>reviewStyleIssues(typeof d==='string'?makeDocument([d],'Current'):d,refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});
const creation='The Community Transportation Accountability Fund is created in the State Treasury. ';
test('desktop asks about a changed document-local title without asserting legal identity',()=>{
 const t=creation+'Revenue enters the Community Transportation Accountabilty Fund.',i=check(t).find(i=>i.checkId==='lcb-created-title-identity-review');assert.ok(i);assert.equal(i.suggestion,null);assert.equal(i.titleWitness.text,'Community Transportation Accountability Fund');assert.equal(t.slice(i.titleWitness.start,i.titleWitness.end),i.titleWitness.text);assert.equal(t.slice(i.start,i.end),'Community Transportation Accountabilty Fund');
 for(const s of [creation+'Revenue enters the Community Transportation Accountability Fund.',creation+'The Community Transportation Accountabilty Fund is established in the State Treasury.',creation+'Revenue enters the “Community Transportation Accountabilty Fund”.'])assert.ok(!check(s).some(i=>i.checkId==='lcb-created-title-identity-review'),s);
 for(const field of ['struck','excluded'])for(let p=i.titleWitness.evidenceStart;p<i.titleWitness.evidenceEnd;p++){const d=makeDocument([t],'Current');d[field].push({start:p,end:p+1});assert.ok(!check(d).some(i=>i.checkId==='lcb-created-title-identity-review'),field+' '+p);}
});
test('recognizable unsupported numerical forms receive a rule and uncertainty without a calculated value',()=>{
 for(const term of ['twenty eleven','two quintillion','2.3e5']){const t='The board reports '+term+' particles.',i=check(t).find(i=>i.checkId==='lcb-numerical-uncertainty-review');assert.ok(i,term);assert.equal(i.text,term);assert.equal(i.suggestion,null);assert.equal(i.guidePage,21);assert.match(i.message,/No intended value/);}
 for(const t of ['The board has twenty-one members.','The term “twenty eleven” is literal.','The address is https://example.test/2.3e5.','The notation 2.3e-5 is a protected technical token.'])assert.ok(!check(t).some(i=>i.checkId==='lcb-numerical-uncertainty-review'),t);
 for(const field of ['struck','excluded'])for(const term of ['twenty eleven','two quintillion','2.3e5']){const t='The board reports '+term+' particles.',at=t.indexOf(term);for(let p=at;p<at+term.length;p++){const d=makeDocument([t],'Current');d[field].push({start:p,end:p+1});assert.ok(!check(d).some(i=>i.checkId==='lcb-numerical-uncertainty-review'),field+' '+term+' '+p);}}
});
test('only independently quoted source classification letters bypass the literal guard in desktop reader mode',()=>{
 for(const letter of ['c','s']){const t='The “'+letter+'” corporation is registered.',i=check(t).find(i=>i.checkId==='corporation-letter');assert.ok(i);assert.equal(i.text,letter);assert.equal(i.suggestion,letter.toUpperCase());
  assert.ok(!reviewStyleIssues(makeDocument([t],'Current'),refs,{includeReviewSuggestions:true}).some(i=>i.checkId==='corporation-letter'));
  assert.ok(!check('The text “the \"'+letter+'\" corporation” is literal.').some(i=>i.checkId==='corporation-letter'));
 }
});
