import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {constitutionalBudgetIssues} from '../app/style-constitutional-context.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const header='ASSEMBLY CONSTITUTIONAL AMENDMENT No. 1\n';
const intro='SEC. 1. Section 1 of Article IV of the California Constitution is amended to read:\n';
const doc=t=>makeDocument([header+intro+t],'Current');
test('generic constitutional budget bill capitalization uses the explicit source context',()=>{
 for(const determiner of ['A','Any','Each','Every'])for(const phrase of ['Budget Bill','Budget bill','budget Bill']){
  const d=doc('1. '+determiner+' '+phrase+' shall be submitted.'),found=jointStylisticIssues(d,refs);assert.equal(found.length,1);assert.equal(found[0].suggestion,'budget bill');assert.equal(found[0].text,phrase);assert.equal(jointStylisticIssues(doc('1. '+determiner+' budget bill shall be submitted.'),refs).length,0);
 }
});
test('ordinary bills, digest, titles, uncertain referents and later sections retain their own scope',()=>{
 for(const t of [intro+'1. A Budget Bill shall be submitted.',header+'LEGISLATIVE COUNSEL’S DIGEST\nA Budget Bill shall be submitted.\n'+intro+'1. A budget bill shall be submitted.',header+intro+'1. The Budget Bill shall be submitted.',header+intro+'1. A Budget Bill Revision is named.',header+intro+'1. A budget bill shall be submitted.\nSEC. 2. This measure takes effect. A Budget Bill shall be submitted.'])assert.equal(constitutionalBudgetIssues(makeDocument([t],'Current'),refs).length,0,t);
 assert.equal(constitutionalBudgetIssues(doc('1. The term “a Budget Bill shall be submitted” is literal.'),refs).length,0);
});
test('exact spans survive margin and line division, and strikeout text is not checked',()=>{
 const d=doc('line 1 A Budget\nline 2 Bill shall be submitted.'),found=constitutionalBudgetIssues(d,refs);assert.equal(found.length,1);assert.equal(d.text.slice(found[0].start,found[0].end),found[0].text);d.struck=[{start:found[0].start,end:found[0].end}];assert.equal(constitutionalBudgetIssues(d,refs).length,0);
});
test('the constitutional source entry is mapped independently of the named Budget Bill entry',()=>{
 const rows=styleRuleInventory(refs);assert.equal(rows.find(r=>r.text==='budget bill (Const.)').status,'Partially automated');assert.equal(rows.find(r=>r.text==='Budget Bill').status,'Partially automated');
});
