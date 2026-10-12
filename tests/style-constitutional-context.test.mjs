import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {constitutionalBodyRanges,constitutionalStateIssues} from '../app/style-constitutional-context.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const header='ASSEMBLY CONSTITUTIONAL AMENDMENT No. 1\nLEGISLATIVE COUNSEL’S DIGEST\nThe state shall retain records.\n';
const intro='SEC. 1. Section 1 of Article I of the California Constitution is amended to read:\n';
const fixture=t=>makeDocument([header+intro+t],'Current');
test('an explicit constitutional provision checks State as a noun without checking its digest',()=>{
 const doc=fixture('1. The state shall retain records. The state records are retained.'),ranges=constitutionalBodyRanges(doc),i=constitutionalStateIssues(doc,refs)[0];assert.equal(ranges.length,1);assert.equal(doc.text.slice(i.start,i.end),'state');assert.ok(i.start>doc.text.indexOf('amended to read:'));assert.equal(i.suggestion,'State');assert.equal(constitutionalStateIssues(doc,refs).length,1);assert.ok(jointStylisticIssues(doc,refs).some(x=>x.checkId==='constitutional-state'));
 assert.equal(constitutionalStateIssues(fixture('1. The State shall retain records. The state records are retained.'),refs).length,0);
});
test('ordinary bills, unresolved constitutional boundaries and uncodified sections stay protected',()=>{
 for(const t of [intro+'1. The state shall act.',header+'The state shall act.',header+intro+'1. The State shall act.\nSEC. 2. This measure takes effect. The state shall act.'])assert.equal(constitutionalStateIssues(makeDocument([t],'Current'),refs).length,0,t);
 assert.equal(constitutionalStateIssues(fixture('1. The term “the state shall act” is literal.'),refs).length,0);
 const doc=fixture('1. The state shall act.');const s=doc.text.lastIndexOf('state');doc.struck=[{start:s,end:s+5}];assert.equal(constitutionalStateIssues(doc,refs).length,0);
});
test('recognized alternative Constitution name and wrapped margin labels retain exact offsets',()=>{
 const doc=makeDocument([header+'SEC. 1. Section 1 of the Constitution of the State of California is amended to read:\nline 1 The\nline 2 state shall retain records.'],'Current');const i=constitutionalStateIssues(doc,refs)[0];assert.equal(doc.text.slice(i.start,i.end),'state');assert.equal(i.suggestion,'State');
});
test('mixed-case and wrapped constitutional document headings are recognized, quoted mentions are not headings',()=>{
 for(const heading of ['Assembly Constitutional Amendment No. 1','SENATE CONSTITUTIONAL\nAMENDMENT\nNo. 1']){const doc=makeDocument([heading+'\n'+intro+'1. The state shall act.'],'Current');assert.equal(constitutionalStateIssues(doc,refs).length,1);}
 const doc=makeDocument(['The literal heading is “\nASSEMBLY CONSTITUTIONAL AMENDMENT\n”.\n'+intro+'1. The state shall act.'],'Current');assert.equal(constitutionalStateIssues(doc,refs).length,0);
});
test('constitutional noun coverage stays distinct from the selected adjective and digest checks',()=>{
 const rows=styleRuleInventory(refs);assert.equal(rows.find(r=>r.page===20&&r.text==='State (n., body of Const.)').status,'Partially automated');
 for(const text of ['state (adj., body of Const.)','state (digest of Const. Amdt.)','state (appearing alone in bill)']){const row=rows.find(r=>r.page===20&&r.text===text);assert.equal(row.status,'Partially automated',text);assert.match(row.scope,/Other variants, meanings and exceptions are not certified/);}
});
