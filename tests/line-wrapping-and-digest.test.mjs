import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDocument,spellingCandidates} from '../app/core.mjs';
import {outsideDigest} from '../app/change-scope.mjs';
import {legislativeBody} from '../app/external-amendments.mjs';
import {verifyAmendments} from '../app/amendments.mjs';
test('digest changes are excluded without hiding title or enacted text',()=>{
 const doc=makeDocument(['An act.\nLEGISLATIVE COUNSEL’S DIGEST\nChanged summary.\nThe people of the State of California do enact as follows:\nline 1 New law.'],'bill');
 const ranges=outsideDigest(doc,[{start:0,end:doc.text.length,group:1}]);
 assert.equal(ranges.length,2);assert.equal(doc.text.slice(ranges[0].start,ranges[0].end),'An act.\n');assert.match(doc.text.slice(ranges[1].start,ranges[1].end),/^The people/);
 assert.equal(outsideDigest(doc,[{start:doc.text.indexOf('Changed'),end:doc.text.indexOf('Changed')+7}]).length,0);
 assert.match(doc.text,/Changed summary/);
});
test('recognized wrapped words compare and spell check as one word with source offsets intact',()=>{
 const doc=makeDocument(['line 1 transf-\nline 2 orm the govern-','AB 1 — 2 —\nline 1 ment and data-\nline 2 sharing agreement.'],'bill',[],[],new Set(['transform','government']));
 assert.deepEqual(doc.tokens.map(t=>t.value),['transform','the','government','and','data','-','sharing','agreement','.']);
 const words=spellingCandidates(doc);assert.ok(words.some(w=>w.word==='transform'));assert.ok(words.some(w=>w.word==='government'));assert.ok(!words.some(w=>w.word==='orm'||w.word==='ment'));assert.equal(doc.rawPages[0],'line 1 transf-\nline 2 orm the govern-');
 const old=makeDocument(['line 1 The govern-\nline 2 ment funds programs.'],'old',[],[],new Set(['government']));
 const current=makeDocument(['line 1 The government supports programs.'],'current');
 const directive='Amendment 1\nOn page 1, in lines 1 and 2, strike out “government funds” and insert:\ngovernment supports';
 assert.equal(verifyAmendments(directive,old,current)[0].status,'implemented');
});
test('referenced budget body ignores running table heads and discretionary hyphens but detects actual wording discrepancies',()=>{
 const pages=['SENATE BILL No. 879\nBudget Act of 2026.\nThe people of the State of California do enact as follows:\nline 1 SECTION 1.00. The govern-\nline 2 ment funds programs.','SB 879 — 2 —\nItem Amount\nline 1 Final law.'];
 const formatting=[[],[{},{headerParts:[{},{ }]}]];
 const ref=makeDocument(pages,'SB 879',[],formatting,new Set(['government']));
 assert.equal(legislativeBody(ref,'SB 879'),'SECTION 1.00. The government funds programs.\nFinal law.');
 const previous=makeDocument(['line 1 Existing law.'],'previous');
 const instruction='Amendment 1\nOn page 1, before line 1, insert:\n[Insert contents of SB 879]';
 const current=makeDocument(['line 1 SECTION 1.00. The government funds programs.\nline 2 Final law.\nline 3 Existing law.'],'current');
 assert.equal(verifyAmendments(instruction,previous,current,{'SB 879':ref})[0].status,'implemented');
 const bad=makeDocument([current.text.replace('funds','defunds')],'bad');assert.equal(verifyAmendments(instruction,previous,bad,{'SB 879':ref})[0].status,'incorrect');
});
test('page-divided words skip budget headers and spelling spans never contain footer or running-head text',()=>{
 const pages=['ASSEMBLY BILL No. 109\nBudget Act of 2026.\nline 47 The Legisla-\n98','AB 109 — 28 —\nItem Amount\nline 1 ture acts.'];
 const formatting=[[],[{},{headerParts:[{},{}]}]];
 const doc=makeDocument(pages,'Current',[],formatting,new Set(['legislature']));
 const word=spellingCandidates(doc).find(w=>w.word==='Legislature');assert.ok(word);
 assert.deepEqual(word.spans.map(r=>doc.text.slice(r.start,r.end)),['Legisla','ture']);
 assert.ok(doc.tokens.some(t=>t.value==='Legislature'));assert.ok(!doc.tokens.some(t=>['Item','Amount','98','28'].includes(t.value)));
 const misspelled=makeDocument(pages.map(p=>p.replace('Legisla-','Legissla-')),'Current',[],formatting);
 const bad=spellingCandidates(misspelled).find(w=>w.word==='Legisslature');assert.ok(bad);assert.deepEqual(bad.spans.map(r=>misspelled.text.slice(r.start,r.end)),['Legissla','ture']);
});
test('numeric replacement discrepancies do not create false missing-text markers',()=>{
 const previous=makeDocument(['line 1 Old law.'],'previous');
 const current=makeDocument(['line 1 Allocate 206,258,000 dollars.\nline 2 Old law.'],'current');
 const instruction='Amendment 1\nOn page 1, before line 1, insert:\nAllocate 196,942,000 dollars.';
 const result=verifyAmendments(instruction,previous,current)[0];assert.equal(result.status,'incorrect');assert.ok(result.evidence[0].differenceRanges.length);assert.equal(result.evidence[0].missingPoints.length,0);
 const absent=makeDocument(['line 1 Allocate dollars.\nline 2 Old law.'],'current');assert.ok(verifyAmendments(instruction,previous,absent)[0].evidence[0].missingPoints.length);
});
