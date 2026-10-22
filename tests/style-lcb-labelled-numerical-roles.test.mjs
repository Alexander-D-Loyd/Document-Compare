import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {reviewStyleIssues} from '../app/style-review.mjs';
import {labelledNumericalRoleRanges,labelledNumericalRoleWitnesses} from '../app/style-lcb-labelled-numerical-roles.mjs';
import {lcbNumericalUncertaintyIssues} from '../app/style-lcb-numerical-uncertainty.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>makeDocument([text],'Current');
const check=d=>reviewStyleIssues(typeof d==='string'?make(d):d,refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});
const positives=[
 ['The funds were reappropriated by Item 3790-491, Budget Act of 2023.','3790-491'],
 ['Funds are transferred to Item 2660-104-6062.','2660-104-6062'],
 ['The funds are in Items 2660-104-6056 or 2660-304-6056.','2660-304-6056'],
 ['The federal Every Student Succeeds Act (P.L. 114-95) applies.','114-95'],
 ['The Public Law 104-193 requirements apply.','104-193'],
 ['The agency implements Pub. L. 104-193.','104-193'],
 ['The fiscal years 2024–25 and 2025–26 apply.','2025–26'],
 ['The 2026–27 Governor’s Budget applies.','2026–27'],
 ['The 2009–10 3rd Ex. Sess. citation applies.','2009–10'],
 ['The 1999–2000 fiscal year applies.','1999–2000'],
 ['The program serves grades K–12.','K–12'],
 ['The PUC has established procedures for implementing 2-1-1 dialing in California.','2-1-1'],
 ['The 2-1-1 information and referral response system operates.','2-1-1'],
 ['The telephone number 2-1-1 is available.','2-1-1']
];
test('complete source labels establish limited numerical roles without guessing values or reference accuracy',()=>{
 for(const [text,term]of positives){const doc=make(text),before=JSON.stringify(doc),at=doc.text.indexOf(term),roles=labelledNumericalRoleRanges(doc),found=check(doc);assert.ok(roles.some(r=>r.start<=at&&r.end>=at+term.length),text);assert.ok(!found.some(i=>i.checkId==='lcb-numerical-uncertainty-review'&&i.start<at+term.length&&i.end>at),text);assert.ok(!found.some(i=>i.suggestion&&i.start<at+term.length&&i.end>at),'An intact labelled reference cannot supply component numeral repairs: '+text);assert.equal(JSON.stringify(doc),before);}
});
test('unlabelled unfamiliar and malformed lookalikes retain whole-expression questions',()=>{
 for(const term of ['3790-491','2660-104-6062','114-95','2-1-1','2026–27','2005-06']){const text='The agency reports '+term+' widget readings.';assert.equal(labelledNumericalRoleRanges(make(text)).length,0,text);assert.ok(lcbNumericalUncertaintyIssues(make(text),refs).some(i=>i.text===term),text);}
 for(const text of ['The model 2-1-1 widgets apply.','The Item 3790-49 applies.','The Item 3790-491-123 applies.','The grades K–13 apply.','The Pub. L. 104-193-5 applies.','The 2026–27 legal services hours apply.','The K–12 component of an unspecified device applies.']){assert.equal(labelledNumericalRoleRanges(make(text)).length,0,text);assert.ok(lcbNumericalUncertaintyIssues(make(text),refs).length,text);}
 // The existing source-labelled year owner independently handles fiscal periods;
 // this calibration claims only the consecutive-year examples it can recognize.
 for(const text of ['The fiscal year 2024–27 applies.','The fiscal year 2024–2026 applies.'])assert.equal(labelledNumericalRoleRanges(make(text)).length,0,text);
 assert.ok(lcbNumericalUncertaintyIssues(make('The Item 3790-491 - 5 values apply.'),refs).some(i=>i.text==='3790-491 - 5'),'A serial prefix cannot suppress a larger unresolved expression.');
});
test('the selected source coordinates do not shield adjacent independent quantities',()=>{
 for(const [text,term]of positives){const source=text+' The agency retains 2 records. The sample contains 1,00 units.',found=check(source);assert.ok(found.some(i=>i.text==='2'&&i.suggestion==='two'),term);assert.ok(found.some(i=>i.checkId==='lcb-numerical-uncertainty-review'&&i.text==='1,00'),term);}
});
test('every label connector and coordinate character must survive both source removal channels',()=>{
 for(const [text]of positives){const doc=make(text),ranges=labelledNumericalRoleRanges(doc);assert.ok(ranges.length,text);for(const field of ['struck','excluded'])for(let p=ranges[0].evidenceStart;p<ranges[0].evidenceEnd;p++){const changed=structuredClone(doc);changed[field].push({start:p,end:p+1});assert.equal(labelledNumericalRoleRanges(changed).length,0,field+' '+text+' '+p);}}
 for(const text of ['The XItem 3790-491 applies.','The Item 3790-491XYZ applies.','The telephone number 2-1-1XYZ applies.','The fiscal year 2024–25XYZ applies.']){const doc=make(text),p=doc.text.indexOf('X');for(const field of ['struck','excluded']){const changed=structuredClone(doc);changed[field].push({start:p,end:p+(text.includes('XYZ')?3:1)});assert.equal(labelledNumericalRoleRanges(changed).length,0,'Removed token boundary cannot manufacture label evidence: '+text);}}
 for(const label of ['Item','P.L.','grades','dialing']){const [text]=positives.find(([s])=>s.includes(label)),doc=make(text),p=doc.text.indexOf(label);for(const field of ['struck','excluded']){const changed=structuredClone(doc);changed[field].push({start:p,end:p+1});assert.equal(labelledNumericalRoleRanges(changed).length,0,text);assert.ok(lcbNumericalUncertaintyIssues(changed,refs).length,'Missing label cannot establish compliance: '+text);}}
});
test('intact physical margins may bridge a source serial without changing source coordinates',()=>{
 const doc=make('line 1 The funds are transferred to Item 2660-\nline 2 104-6062, Budget Act of 2025.\nline 3 The agency retains 2 records.'),before=JSON.stringify(doc),roles=labelledNumericalRoleRanges(doc),found=check(doc);assert.ok(roles.some(r=>doc.text.slice(r.start,r.end).includes('104-6062')));assert.ok(!found.some(i=>i.checkId==='lcb-numerical-uncertainty-review'));assert.ok(found.some(i=>i.text==='2'&&i.suggestion==='two'));assert.equal(JSON.stringify(doc),before);
 const unknown=make('The funds are transferred to Item 2660- OMIT 104-6062.');const p=unknown.text.indexOf('OMIT');unknown.excluded.push({start:p,end:p+4});assert.equal(labelledNumericalRoleRanges(unknown).length,0,'Unknown excluded material cannot become an allowable serial gap.');
});
test('source role witnesses are local evidence rather than blanket document exemptions',()=>{
 assert.equal(labelledNumericalRoleWitnesses('The Budget Act of 2025 describes 3790-491 widgets.').length,0);
 for(const text of ['The term “Item 3790-491” is literal.','The term “grades K–12” is literal.'])assert.equal(labelledNumericalRoleRanges(make(text)).length,0,text);
 const doc=make('Name              Quantity              Unit\nNorth             Item 3790-491          units');for(const b of doc.blocks)b.formatting={headerGaps:[{},{}]};assert.equal(labelledNumericalRoleRanges(doc).length,0,'Numerical table cells retain their separate complete-cell owner.');
});
