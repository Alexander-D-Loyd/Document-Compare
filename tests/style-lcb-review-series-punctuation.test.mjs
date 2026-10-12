import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {lcbUnfamiliarSeriesReviewIssues}from '../app/style-lcb-review-series-punctuation.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const doc=text=>makeDocument([text],'Current'),extra=text=>{const d=doc(text);return lcbUnfamiliarSeriesReviewIssues(d,refs,{existingIssues:jointStylisticIssues(d,refs)});};

test('unfamiliar nouns adjectives verbs and participles receive explicit ambiguity review',()=>{
 for(const [text,scope]of [['The agency shall retain records, invoices and attestations.','records, invoices and attestations'],['The notices are durable, legible and portable.','durable, legible and portable'],['Participants may sit, stand or recline.','sit, stand or recline'],['The records were issued, reviewed and renewed.','issued, reviewed and renewed']]){
  const found=extra(text);assert.equal(found.length,1,text);assert.equal(found[0].text,scope);assert.equal(found[0].suggestion,null);assert.equal(found[0].confidence,'Review Suggested');assert.ok(found[0].message.includes('qualified item, clause, or nested alternative'));assert.deepEqual(found[0].references.map(r=>r.rule),['Punctuation: Commas','8.46']);
 }
});

test('ordinary right-hand qualifiers retain the complete word-series review',()=>{
 for(const [text,scope]of [['The permits are issued, reviewed and renewed by the department.','issued, reviewed and renewed by the department'],['Records are filed, signed or sealed each year.','filed, signed or sealed each year'],['The standards apply to sensors, antennas and satellites in the field.','sensors, antennas and satellites in the field']]){const found=extra(text);assert.equal(found.length,1,text);assert.equal(found[0].text,scope);assert.equal(found[0].suggestion,null);}
});

test('bounded unfamiliar multiword phrases retain the full introduced list',()=>{
 const text='The record includes retained affidavits, sealed invoices and sworn attestations.';
 const found=extra(text);assert.equal(found.length,1);assert.equal(found[0].text,'retained affidavits, sealed invoices and sworn attestations');assert.equal(found[0].seriesEvidence.explicitIntroducer,true);
 const received=extra('The office receives accident reports, signed declarations and supporting photographs.');assert.equal(received.length,1);assert.equal(received[0].text,'accident reports, signed declarations and supporting photographs');
});

test('existing precise findings keep ownership even within a broader candidate',()=>{
 const d=doc('The notice includes records, documents and forms.'),existing=jointStylisticIssues(d,refs);assert.ok(existing.some(i=>i.rule==='Punctuation: Commas'));
 assert.equal(lcbUnfamiliarSeriesReviewIssues(d,refs,{existingIssues:existing}).length,0);
 const x=doc('records, invoices and attestations'),start=x.text.indexOf('and');assert.equal(lcbUnfamiliarSeriesReviewIssues(x,refs,{existingIssues:[{start,end:start+3}]}).length,0);
});

test('correct serial commas two items and qualifying binary pairs stay clear',()=>{
 for(const text of ['records, invoices, and attestations','durable, legible, and portable','sit and recline','issued or renewed','schools, public and private','notices, oral and written','agencies, state and federal','records and invoices and attestations'])assert.equal(lcbUnfamiliarSeriesReviewIssues(doc(text),refs).length,0,text);
});

test('function-word pairs and inner noun phrases of larger lists are not partial list selections',()=>{
 for(const text of ['The bill would prohibit, on and after January 1, 2028, sale of packaging.','Drug abuse is not, in and of itself, a sufficient basis.','The list includes a hotel, motel, bed and breakfast inn, or lodging.','A hygienist, optometrist, marriage and family therapist, or counselor applies.','The project receives a bonus, incentives or concessions, waivers or reductions, and parking ratios.'])assert.equal(lcbUnfamiliarSeriesReviewIssues(doc(text),refs).length,0,text);
});

test('LCB nested alternatives and numerical/letter expressions keep their existing methods',()=>{
 for(const text of ['one, two, three or four, and five','The record includes permits, notices or requests, and invoices.','one, two and three','a, b or c','1,000, 2,000 and 3,000','1.5, 2.5 and 3.5'])assert.equal(lcbUnfamiliarSeriesReviewIssues(doc(text),refs).length,0,text);
});

test('complete number-word series with an unfamiliar shared noun receives only punctuation review',()=>{
 const text='The office shall count two, three or four votes.',found=extra(text);assert.equal(found.length,1);assert.equal(found[0].text,'two, three or four votes');assert.equal(found[0].suggestion,null);assert.equal(found[0].checkId,'lcb-series-punctuation-review');
});

test('source quotes names headings and tables remain protected',()=>{
 for(const text of ['The term “records, invoices and attestations” is literal.','The term ‘records, invoices and attestations’ is literal.','The term \'records, invoices and attestations\' is literal.','Records, Invoices and Attestations Program','records, invoices and attestations................30','records, invoices and attestations\nLEGISLATIVE COUNSEL’S DIGEST\nThe bill applies.'])assert.equal(lcbUnfamiliarSeriesReviewIssues(doc(text),refs).length,0,text);
});

test('every item and connector is whole-source evidence',()=>{
 const text='records, invoices and attestations';
 for(const fragment of ['records','invoices','and','attestations']){const d=doc(text),start=d.text.indexOf(fragment);d.struck=[{start,end:start+fragment.length}];assert.equal(lcbUnfamiliarSeriesReviewIssues(d,refs).length,0,fragment);}
 const d=doc(text),start=d.text.indexOf(',');d.excluded.push({start,end:start+1});assert.equal(lcbUnfamiliarSeriesReviewIssues(d,refs).length,0);
 const x=doc('damaged, records, invoices and attestations'),cut=x.text.indexOf('damaged');x.struck=[{start:cut,end:cut+7}];assert.equal(lcbUnfamiliarSeriesReviewIssues(x,refs).length,0);
});

test('original Unicode boundaries cannot create a fragment list',()=>{
 for(const text of ['αrecords, invoices and attestations','records, invoices and attestationsα','records, invoices and attestations\u0301'])assert.equal(lcbUnfamiliarSeriesReviewIssues(doc(text),refs).length,0,text);
});

test('recognized page-boundary word divisions retain the whole original highlighted list',()=>{
 const d=makeDocument(['records, invoices and attesta-','AB 192 — 2 —\nline 1 tions.'],'Current',[],[],new Set(['attestations'])),head=d.blocks.find(b=>b.text==='AB 192 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};
 const found=lcbUnfamiliarSeriesReviewIssues(d,refs);assert.equal(found.length,1);assert.equal(found[0].text,'records, invoices and attesta-\nAB 192 — 2 —\nline 1 tions');assert.equal(d.text.slice(found[0].start,found[0].end),found[0].text);
 head.runningHead=false;head.layoutLabel=false;head.formatting={};assert.equal(lcbUnfamiliarSeriesReviewIssues(d,refs).length,0);
});
