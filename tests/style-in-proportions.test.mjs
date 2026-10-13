import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {inProportionIssues} from '../app/style-in-proportions.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs);
test('population proportions retain one shared expression and the LCB ten threshold',()=>{
 for(const [bad,good] of [['1 in 5','one in five'],['one in ten','1 in 10'],['2 in three','two in three'],['two in twenty','2 in 20'],['one in 100','1 in 100']]){const found=check('The rule covers '+bad+' applicants.');assert.ok(found.some(i=>i.suggestion===good),bad);assert.equal(check('The rule covers '+good+' applicants.').length,0,good);}
 assert.ok(check('1 in 10 applicants qualifies.').some(i=>i.suggestion==='One in 10'));
 assert.ok(check('Twelve in twenty applicants qualify.').some(i=>i.suggestion==='Twelve in 20'));
 assert.equal(check('One in 10 applicants qualifies.').length,0);
 assert.equal(check('The rule covers one in five applicants over 18 months.').length,0);
});
test('dates, identifiers, unknown roles and quotes remain protected while Digest counts follow LCB',()=>{
 for(const text of ['The quote “one in ten applicants” is literal.','Use Section 1 in Article 10.','One in ten years was selected.','The range is one in ten.','The rule covers 10 in 5 applicants.'])assert.equal(inProportionIssues(makeDocument([text],'Current'),refs).length,0,text);
 const digest='LEGISLATIVE COUNSEL’S DIGEST\nThe rule covers one in five applicants.';assert.equal(inProportionIssues(makeDocument([digest],'Current'),refs).length,0);assert.deepEqual(check(digest).map(i=>i.suggestion),['5']);
 const doc=makeDocument(['The rule covers one in ten applicants.'],'Current');doc.struck=[{start:16,end:26}];assert.equal(inProportionIssues(doc,refs).length,0);
});
test('wrapped population proportions highlight the full expression',()=>{
 const doc=makeDocument(['line 1 The rule covers one in\nline 2 ten applicants.'],'Current');const i=inProportionIssues(doc,refs)[0];assert.equal(doc.text.slice(i.start,i.end),'one in\nline 2 ten');assert.equal(i.suggestion,'1 in 10');
});
