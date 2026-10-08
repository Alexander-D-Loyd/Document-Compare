import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {wordChoiceIssues} from '../app/style-word-choice.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
const check=text=>wordChoiceIssues(makeDocument([text],'Current'),refs);
test('meaning-dependent LCB pairs use explicit grammatical and domain cues',()=>{
 const text='The board must advice the principle investigator. Obtain legal advise. Costs shall be born by the board. Enact an ordnance and purchase stationary supplies.';
 assert.deepEqual(check(text).map(i=>i.suggestion),['advise','principal','advice','borne','ordinance','stationery']);
 assert.equal(check('The board must advise the principal investigator. Obtain legal advice. Costs shall be borne by the board. Enact an ordinance and purchase stationery supplies.').length,0);
});
test('other explicit cues cover financial, temporal, legal and burial meanings without blanket homophone replacement',()=>{
 assert.deepEqual(check('The state capital building needs capitol investment. Forego payment. Use cemetery internment, interment camps, and preemptory challenges. Review perspective applicants. Now, therefor, be it.').map(i=>i.suggestion),['capitol','capital','Forgo','interment','internment','peremptory','prospective','therefore']);
 assert.equal(check('The capital city supplies capital. Consider a perspective on the principal. The child was born; costs were borne. Internment and interment differ.').length,0);
});
test('quoted terms, apparent titles, source strikeouts and margin offsets are preserved',()=>{
 assert.equal(check('The phrase “must advice” is discussed. The Stationary Supplies Corporation exists.').length,0);
 const doc=makeDocument(['line 1 The board must\nline 2 advice the applicant.'],'Current');const issue=wordChoiceIssues(doc,refs)[0];assert.equal(doc.text.slice(issue.start,issue.end),'advice');assert.equal(issue.suggestion,'advise');
 doc.struck=[{start:issue.start,end:issue.end}];assert.equal(wordChoiceIssues(doc,refs).length,0);
});

test('additional meaning pairs require grammatical or explicit domain evidence',()=>{
 const text='The board must device a plan. Supply a medical devise. Staff shall canvas voters. Use woven canvass cloth. Provide a full compliment of staff. Staff may complement the employee on their work. Read the forward to the manual. Staff must foreword the report. A basic tenant of law applies. Each tenet must pay rent. Review discreet data points.';
 assert.deepEqual(check(text).map(i=>i.suggestion),['devise','device','canvass','canvas','complement','compliment','foreword','forward','tenet','tenant','discrete']);
 assert.equal(check('The board must devise a plan. Supply a medical device. Staff shall canvass voters. Use woven canvas cloth. Provide a full complement of staff. Staff may compliment the employee on their work. Read the foreword to the manual. Staff must forward the report. A basic tenet of law applies. Each tenant must pay rent. Review discrete data points.').length,0);
});
test('uncued meanings, source quotes, names and directional forward remain unchanged',()=>{
 assert.equal(check('Canvas and canvass differ. Be discreet with data. Each tenant lives in the building. Give a compliment. Send the notice forward to the report author. The Medical Devise Corporation is named. The phrase “must device a plan” is quoted.').length,0);
});

test('insurance, guarantees and annual-frequency terms require explicit meaning evidence',()=>{
 const bad='Staff shall insure compliance. Owners must ensure the building against fire. The contractor shall guaranty payment. A biannual audit conducted every two years applies. A biennial meeting held twice a year applies. File at anytime.';
 assert.deepEqual(check(bad).map(i=>i.suggestion),['ensure','insure','guarantee','biennial','biannual','any time']);
 const good='Staff shall ensure compliance. Owners must insure the building against fire. The contractor shall guarantee payment. A biennial audit conducted every two years applies. A biannual meeting held twice a year applies. File at any time.';
 assert.equal(check(good).length,0);
 assert.equal(check('The insurer shall insure a vehicle. The guaranty exists. A biannual review applies. They may apply anytime. Insure and ensure differ. The phrase “at anytime” is quoted.').length,0);
});
