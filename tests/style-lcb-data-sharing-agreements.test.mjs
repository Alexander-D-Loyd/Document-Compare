import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {lcbDataSharingAgreementIssues} from '../app/style-lcb-data-sharing-agreements.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs).filter(i=>i.checkId==='lcb-data-sharing-agreement');
test('data sharing immediately modifying agreement is checked under the actual LCB unit-modifier provision',()=>{
 for(const text of ['The board uses a data sharing agreement.','The data sharing agreements apply.','Data sharing agreement applies.','LEGISLATIVE COUNSEL’S DIGEST\nThe bill provides a data sharing agreement.']){const doc=makeDocument([text],'Current'),before=JSON.stringify(doc),found=jointStylisticIssues(doc,refs).filter(i=>i.checkId==='lcb-data-sharing-agreement');assert.equal(found.length,1,text);const i=found[0];assert.equal(i.suggestion,i.text.startsWith('D')?'Data-sharing':'data-sharing');assert.equal(doc.text.slice(i.start,i.end),i.text);assert.ok(i.references[0].sourcePassage.text.includes('unit modifier'));assert.equal(i.references[0].sourcePassage.kind,'Source provision');assert.equal(JSON.stringify(doc),before);}
});
test('ordinary sharing, predicates, already correct wording, other heads and named terms stay quiet',()=>{
 for(const text of ['The agreement concerns data sharing.','The agency shares data under an agreement.','Data sharing is required.','The data-sharing agreement applies.','The data sharing program operates.','The Data Sharing Agreement applies.','The data sharing agreement Act applies.','The data sharing agreementα applies.','The data sharing agreement-access applies.'])assert.equal(check(text).length,0,text);
});
test('quoted open terms protect that bill only with authorized initial-capitalization differences',()=>{
 assert.equal(check('“data sharing” means a process. The data sharing agreement applies.').length,0);assert.equal(check('“Data sharing agreement” means an agreement. The data sharing agreement applies.').length,0);assert.equal(check('The data sharing agreement applies.').length,1);
});
test('complete modifiers and noun heads need undamaged source and preserve physical page offsets',()=>{
 const text='The data sharing agreement applies.';
 for(const word of ['data','sharing','agreement'])for(const field of ['struck','excluded']){const doc=makeDocument([text],'Current'),start=doc.text.indexOf(word);doc[field].push({start,end:start+word.length});assert.equal(lcbDataSharingAgreementIssues(doc,refs).length,0,word);}
 const doc=makeDocument(['line 1 The data','line 1 sharing agreement applies.'],'Current'),found=jointStylisticIssues(doc,refs).filter(i=>i.checkId==='lcb-data-sharing-agreement');assert.equal(found.length,1);assert.equal(found[0].suggestion,'data-sharing');assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);
});
