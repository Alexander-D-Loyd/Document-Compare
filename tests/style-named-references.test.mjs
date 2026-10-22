import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {sourceNameRanges} from '../app/style-source-names.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs),programs=['Alzheimer’s Disease Program','California Alzheimer’s Disease Centers','Alzheimer’s Disease and Related Disorders Advisory Committee'];
test('complete source program and advisory names preserve their medical fragment while ordinary disease wording is checked',()=>{
 for(const name of programs){const text='Consult the '+name+'. The Alzheimer’s Disease affects memory.',found=check(text);assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[['Alzheimer’s Disease','Alzheimer’s disease']],name);assert.equal(sourceNameRanges(text).length,1);}
 assert.ok(check('Consult the Alzheimer’s Disease Study Group.').some(i=>i.suggestion==='Alzheimer’s disease'),'Unlisted names are not declared authoritative');
});
test('literal name matching accepts printed apostrophe forms and complete boundaries without inventing aliases',()=>{
 for(const name of programs)assert.equal(check('Consult the '+name.replaceAll('’',"'")+'.').length,0,name);
 assert.equal(sourceNameRanges('Alzheimer’s Disease Programmatic').length,0);assert.equal(sourceNameRanges('Alzheimer’s Disease and Related Conditions Advisory Committee').length,0,'The differently worded supplied entity remains a separate authority entry');
});
test('complete All Plan Letter serials preserve leading zeros and leave adjacent quantities checked',()=>{
 for(const text of ['Under All Plan Letter 23-001, 3 workers apply.','Under all plan letter 23-001, 3 workers apply.','Under All Plan Letter 18-007, 3 workers apply.'])assert.deepEqual(check(text).map(i=>[i.text,i.suggestion]),[['3','three']],text);
 const text='Under Letter 23-001, 3 workers apply.';assert.deepEqual(check(text).filter(i=>i.checkId==='numerals').map(i=>i.text),['3']);assert.ok(reviewStyleIssues(makeDocument([text],'Current'),refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true}).some(i=>i.checkId==='lcb-numerical-uncertainty-review'&&i.text==='23-001'&&i.suggestion===null),'Unencoded letter wording receives whole uncertainty without an inferred All Plan Letter identity or guessed suffix count');
});
test('complete letter-prefixed executive order references preserve identifier and title form with generic descriptions still checked',()=>{
 for(const code of ['N-66-20','S-09-06','B-1-2027'])for(const no of ['', 'No. '])assert.deepEqual(check('Under Executive Order '+no+code+', 3 workers apply.').map(i=>[i.text,i.suggestion]),[['3','three']],code);
 assert.deepEqual(check('Under executive order S-09-06, 3 workers apply.').map(i=>[i.text,i.suggestion]),[['3','three']],'Lowercase reference words do not turn the serial digits into counts; title case remains a separate partial check');
 assert.deepEqual(check('A new Executive Order applies.').map(i=>[i.text,i.suggestion]),[['Executive Order','executive order']]);
 for(const code of ['N-66','N-six-20','N-66-20Extra'])assert.ok(check('Under Executive Order '+code+'.').some(i=>i.text==='Executive Order'),code);
});
test('a complete letter reference across page labels keeps ordinary quantity offsets exact',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 116\nThe people do enact as follows:\nline 1 Under All Plan Letter 23-\n97','AB 116 — 2 —\nline 1 001, 3 workers apply.'],'Current'),found=jointStylisticIssues(doc,refs);assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[['3','three']]);assert.equal(found[0].start,doc.text.indexOf('3 workers'));
});
test('complete program names across a page boundary preserve exact source wording without a global disease exemption',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 116\nThe people do enact as follows:\nline 1 Consult the Alzheimer’s Disease and Related\n97','AB 116 — 2 —\nline 1 Disorders Advisory Committee. Alzheimer’s Disease affects memory.'],'Current'),found=jointStylisticIssues(doc,refs);assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[['Alzheimer’s Disease','Alzheimer’s disease']]);assert.equal(found[0].start,doc.text.lastIndexOf('Alzheimer’s'));
});
