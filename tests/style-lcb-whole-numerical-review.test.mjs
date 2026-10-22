import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {reviewStyleIssues} from '../app/style-review.mjs';import {lcbNumericalUncertaintyIssues} from '../app/style-lcb-numerical-uncertainty.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=(s,context='Bill')=>makeDocument([context==='Digest'?'LEGISLATIVE COUNSEL’S DIGEST\n'+s+'\nThe people do enact as follows:':s],'Current');
const check=d=>reviewStyleIssues(typeof d==='string'?make(d):d,refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});
const cases=['one hundred and eleven','one hundred and two hundred','two point five','point zero five','eleven quadrillion','one hundred quadrillion','2⅝','2 5/8','2.3E5'];
test('unfamiliar noun vocabulary cannot silence complete scale, decimal or small mixed-fraction questions',()=>{
 for(const term of cases){const text='The sample contains '+term+' nanowidgets.',doc=make(text),before=JSON.stringify(doc),found=check(doc),i=found.find(i=>i.checkId==='lcb-numerical-uncertainty-review'&&i.text===term);assert.ok(i,term);assert.equal(i.suggestion,null);assert.equal(i.guidePage,21);assert.equal(doc.text.slice(i.start,i.end),term);assert.equal(JSON.stringify(doc),before);}
});
test('existing whole comparisons, compliant openings, Digest figure fractions and names retain their roles',()=>{
 for(const text of ['One hundred and eleven paleobiologists are employed.','The sample contains 12⅝ nanowidgets.','The One Hundred and Eleven Foundation shall act.','The term “two point five” is literal.','The sample contains 2.5 nanowidgets.'])assert.ok(!check(text).some(i=>i.checkId==='lcb-numerical-uncertainty-review'),text);
 assert.ok(!check(make('The sample contains 2⅝ nanowidgets.','Digest')).some(i=>i.checkId==='lcb-numerical-uncertainty-review'));
 const doc=make('The agency employs one hundred and eleven students.'),issues=check(doc);assert.ok(issues.some(i=>i.checkId==='compound-cardinals'&&i.suggestion==='111'));assert.ok(!issues.some(i=>i.checkId==='lcb-numerical-uncertainty-review'));
});
test('all original numerical characters and boundaries remain evidence, including removed whole prefixes',()=>{
 for(const term of cases){const text='The sample contains '+term+' nanowidgets.',doc=make(text),at=doc.text.indexOf(term);for(const field of ['struck','excluded'])for(let p=at;p<at+term.length;p++){const changed=structuredClone(doc);changed[field].push({start:p,end:p+1});assert.ok(!lcbNumericalUncertaintyIssues(changed,refs).some(i=>i.start<at+term.length&&i.end>at),field+' '+term+' '+p);}}
 for(const term of ['identifier/2⅝','two point fiveα','prefix-one hundred and eleven','https://example.test/2.3e5'])assert.deepEqual(lcbNumericalUncertaintyIssues(make('The sample contains '+term+'.'),refs),[],term);
});
