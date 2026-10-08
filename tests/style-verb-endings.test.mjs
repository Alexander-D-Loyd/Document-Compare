import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {verbEndingIssues} from '../app/style-verb-endings.mjs';import {GPO_ASSESSMENTS} from '../app/style-rule-assessments.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('explicit cede/ceed/sede stems and inflections have correct sources',()=>{
 const found=verbEndingIssues(makeDocument(['Rules supercede orders. The amount excedes the limit. They are proceding, succeding and preceeding.'],'Current'),refs);
 assert.deepEqual(found.map(i=>i.suggestion),['supersede','exceeds','proceeding','succeeding','preceding']);assert.ok(found.every(i=>i.references.some(r=>r.rule==='5.13')));assert.equal(found[0].guideId,'lcb');
});
test('valid endings, source quotes, crossed text and apparent proper names are preserved',()=>{
 assert.equal(verbEndingIssues(makeDocument(['Rules supersede orders and precede proceedings. See “supercede” and Supercede Research Corporation.'],'Current'),refs).length,0);
 const doc=makeDocument(['Rules supercede orders.'],'Current');doc.struck=[{start:6,end:15}];assert.equal(verbEndingIssues(doc,refs).length,0);
});
test('capitalization and spelling chapters account for every numbered source rule without claiming full automation',()=>{
 for(const [chapter,total] of [[3,60],[5,26],[6,52]]){assert.equal([...GPO_ASSESSMENTS.keys()].filter(id=>id.startsWith(chapter+'.')).length,total);for(let n=1;n<=total;n++)assert.ok(GPO_ASSESSMENTS.get(chapter+'.'+n)?.scope.length>80);}
 assert.equal(GPO_ASSESSMENTS.get('5.25').status,'Manual review required');
});
