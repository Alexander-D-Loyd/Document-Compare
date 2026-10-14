import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {applyLcbGuidePriority} from '../app/style-guide-priority.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=body=>makeDocument(['LEGISLATIVE COUNSEL’S DIGEST\n'+body+'\nThe people do enact as follows:\nSection 1 applies.'],'Current');
const health=doc=>jointStylisticIssues(doc,refs).filter(i=>!['capitalization','california-entities'].includes(i.checkId)&&/health.?care/iu.test(i.text+' '+i.suggestion));
test('LCB lexical Health Care accepts word initials independent of title capitalization',()=>{
 assert.ok(refs.lcb.pages[10].text.includes('health care'));
 for(const term of ['health care','Health care','health Care','Health Care','HEALTH CARE'])for(const body of ['The '+term+' is provided.','The California '+term+' Quality and Affordability Act applies.','The Department of '+term+' Access and Information applies.']){const doc=make(body),before=JSON.stringify(doc);assert.equal(health(doc).length,0,body);assert.equal(applyLcbGuidePriority(doc,refs,[]).filter(i=>i.rule==='Printed LCB form: health care').length,0,body);assert.equal(JSON.stringify(doc),before);}
});
test('actual solid and hyphenated lexical defects retain component capitals while opening the words',()=>{
 for(const [term,wanted] of [['healthcare','health care'],['health-care','health care'],['Healthcare','Health care'],['Health-care','Health care'],['HealthCare','Health Care'],['Health-Care','Health Care']]){const doc=make('The '+term+' is provided.'),found=health(doc);assert.equal(found.length,1,term);assert.equal(found[0].suggestion,wanted,term);assert.equal(found[0].guideId,'lcb');assert.equal(found[0].guidePage,11);assert.equal(found[0].text,term);assert.equal(doc.text.slice(found[0].start,found[0].end),term);}
});
test('lexical priority removes secondary compounding disagreements while retaining explicit capitalization authority',()=>{
 const doc=make('The Health Care is provided.'),start=doc.text.indexOf('Health Care'),end=start+11;
 const issue=(checkId,category,rule,suggestion)=>({start,end,text:'Health Care',suggestion,checkId,category,guideId:'gpo',guidePage:66,rule,references:[{guideId:'gpo',guidePage:66,rule}]});
 const caps=[issue('capitalization','Capitalization','Capitalization examples','Health care'),issue('gpo-case-test','Capitalization','3.3','Health care'),issue('gpo-explicit-test','Named form','Capitalization, item 2','Health care')],lexical=issue('gpo-lexical-test','Compounding','6.15','Health-Care');
 const result=applyLcbGuidePriority(doc,refs,[...caps,lexical]);assert.deepEqual(result.map(i=>i.checkId),caps.map(i=>i.checkId));
 const independent=jointStylisticIssues(make('The Health Care program cites section 7 (a).'),refs);assert.ok(independent.some(i=>i.suggestion==='Section 7(a)'));assert.equal(independent.filter(i=>/health.?care/iu.test(i.text+' '+i.suggestion)).length,0);
});
test('bill-local quoted forms known supplied names body dashes tables and source damage remain protected',()=>{
 for(const body of ['“Health-care” means the service. The health-care is provided.','The Department of Healthcare Access and Information shall act.','The health—care is provided.','The healthcareé is provided.'])assert.equal(health(make(body)).length,0,body);
 assert.equal(health(make('The health-care is provided.')).length,1);
 for(const field of ['struck','excluded']){const doc=make('The health-care is provided.'),at=doc.text.indexOf('-');doc[field].push({start:at,end:at+1});assert.equal(health(doc).length,0,field);}
 const doc=make('The healthcare is provided.');doc.blocks[1].formatting={headerGaps:[{},{}]};assert.equal(health(doc).length,0);
});
test('source divisions margins and other exact capitalization checks keep their owners',()=>{
 const doc=makeDocument(['LEGISLATIVE COUNSEL’S DIGEST\nline 1 The California Health\nline 2 Care Quality and Affordability Act applies.\nThe people do enact as follows:\nUse degrees celsius.'],'Current');assert.equal(health(doc).length,0);const found=jointStylisticIssues(doc,refs);assert.ok(found.some(i=>i.checkId==='temperature-name'&&i.suggestion==='Celsius'));
 const plain=jointStylisticIssues(make('The calworks Program applies.'),refs);assert.ok(plain.some(i=>i.checkId==='capitalization'&&i.suggestion==='CalWORKs program'));
});
