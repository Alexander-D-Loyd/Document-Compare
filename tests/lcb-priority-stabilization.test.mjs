import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
import {numeralIssues} from '../app/style-numerals.mjs';
import {workerWords} from './helpers/spelling-worker.mjs';

const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs);
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const accepted=[
 [9,'before and after school','The before and after school services shall continue.'],
 [9,'African American','The African American program shall continue.'],
 [9,'collective bargaining','The collective bargaining rights shall apply.'],
 [11,'health care','The health care program shall continue.'],
 [11,'horse race','The horse races shall begin.'],
 [15,'groundwater','The groundwater samples shall be collected.'],
 [15,'wildland','The wildlands shall be preserved.'],
 [18,'central valley','California’s central valley shall qualify.'],
 [18,'centigrade','The temperature is measured in degrees centigrade.'],
 [19,'federal government','The federal government shall provide assistance.'],
 [19,'Regular Session','The 2025–26 Regular Session shall begin.'],
 [20,'state government','The state government shall act.'],
 [20,'Subchapter','The Code of Federal Regulations Subchapter 7 applies.'],
];

test('accepted printed LCB choices stay quiet beside an independent GPO noun discrepancy',()=>{
 for(const [page,form,text] of accepted){
  assert.ok(refs.lcb.pages[page-1].text.includes(form),form);
  assert.equal(check(text).length,0,text);
  const combined=text+' The check up is required.',issues=check(combined);
  assert.equal(issues.length,1,combined);
  assert.equal(issues[0].text,'check up');assert.equal(issues[0].suggestion,'checkup');
  assert.equal(issues[0].guideId,'gpo');assert.equal(issues[0].guidePage,137);
  assert.equal(combined.slice(issues[0].start,issues[0].end),'check up');
 }
});

test('LCB correction and independent GPO correction retain separate source ownership',()=>{
 for(const [bad,good] of [['healthcare','health care'],['ground water','groundwater'],['wild land','wildland'],['horse-race','horse race']]){
  const text='The '+bad+' is described. The check up is required.',issues=check(text);
  assert.deepEqual(issues.map(i=>i.suggestion),[good,'checkup'],text);
  assert.deepEqual(issues.map(i=>i.guideId),['lcb','gpo']);
  for(const issue of issues){assert.equal(text.slice(issue.start,issue.end),issue.text);assert.equal(issue.conflict,false);assert.ok(issue.references.every(r=>r.sourcePassage?.text));}
 }
});

test('context-specific printed LCB numeral exceptions do not invite a conflicting GPO flag',()=>{
 const rows=[
  ['Bill','The child is two years of age.'],['Bill','The two-year-old child applies.'],
  ['Bill','The board measures two feet.'],['Bill','Use a two-inch board.'],
  ['Bill','Use a three-quarter-ton truck.'],['Bill','The rate is one-half of 1 percent.'],
  ['Bill','The rate is 1½ percent.'],['Bill','Wait three and one-half hours.'],['Bill','Wait 10½ hours.'],
  ['Digest','The child is 2 years of age.'],['Digest','The 2-year-old child applies.'],
  ['Digest','The rate is ½ of 1%.'],['Digest','The rate is 1½%.'],
  ['Digest','Use a 3⁄4-ton truck.'],['Digest','Wait 3½ hours.'],['Digest','Wait 10½ hours.'],
 ];
 for(const [context,body] of rows){const heading=context==='Bill'?'The people do enact as follows:':'LEGISLATIVE COUNSEL’S DIGEST',text=heading+'\n'+body;assert.equal(check(text).length,0,text);}
});

test('the direct numeral detector emits no raw conflict for LCB-compliant small Bill measures and durations',()=>{
 for(const body of ['The child is two years of age.','The term is one year.','The hearing lasts three minutes.','The board measures two feet.','The board measures five megabytes.','The program operates for four years.']){
  const doc=makeDocument(['The people do enact as follows:\n'+body],'Current'),before=hash(doc),raw=numeralIssues(doc,refs);
  assert.equal(raw.length,0,body+' must be accepted before downstream priority filtering');assert.equal(hash(doc),before);
 }
});

test('the direct numeral detector emits no raw conflict for LCB-compliant Digest cardinals and ordinals',()=>{
 for(const body of ['The bill requires 2 requests.','The bill requires 3 permits.','The child is 2 years of age.','The hearing lasts 3 minutes.','The board measures 2 feet.','The applicant receives the 2nd permit.','The agency reviews the 3rd application.','The agency reviews the first application.','The bill requires one request.']){
  const doc=makeDocument(['LEGISLATIVE COUNSEL’S DIGEST\n'+body],'Current'),before=hash(doc),raw=numeralIssues(doc,refs);
  assert.equal(raw.length,0,body+' must be accepted before downstream priority filtering');assert.equal(hash(doc),before);
 }
});

test('raw numeral corrections retain exact source ownership while unrelated GPO checks remain visible',()=>{
 for(const [heading,body,actual,preferred] of [
  ['The people do enact as follows:','The child is 2 years of age.','2','two'],
  ['The people do enact as follows:','The hearing lasts 3 minutes.','3','three'],
  ['The people do enact as follows:','The board measures 2 feet.','2','two'],
  ['LEGISLATIVE COUNSEL’S DIGEST','The bill requires two requests.','two','2'],
  ['LEGISLATIVE COUNSEL’S DIGEST','The agency reviews the third application.','third','3rd'],
 ]){
  const text=heading+'\n'+body+' The check up is required.',doc=makeDocument([text],'Current'),before=hash(doc),raw=numeralIssues(doc,refs);
  assert.equal(raw.length,1,text);assert.equal(raw[0].text,actual);assert.equal(raw[0].suggestion,preferred);assert.equal(raw[0].matchesPrimary,false);assert.equal(doc.text.slice(raw[0].start,raw[0].end),actual);assert.equal(raw[0].references[0].guideId,'lcb');
  const findings=jointStylisticIssues(doc,refs);assert.deepEqual(findings.map(i=>i.suggestion),[preferred,'checkup']);assert.deepEqual(findings.map(i=>i.guideId),['lcb','gpo']);assert.ok(findings.every(i=>!i.conflict));assert.equal(hash(doc),before);
  const corrected=makeDocument([heading+'\n'+body.replace(actual,preferred)],'Current');assert.equal(numeralIssues(corrected,refs).length,0);
 }
});

test('a compliant structural reference still owns an independent reference-spacing discrepancy',()=>{
 const text='See Section 7 (a). The health care program shall continue.',issues=check(text);
 assert.equal(issues.length,1);assert.equal(issues[0].text,'Section 7 (a)');assert.equal(issues[0].suggestion,'Section 7(a)');assert.equal(text.slice(issues[0].start,issues[0].end),issues[0].text);assert.ok(issues[0].references.some(r=>r.guideId==='gpo'&&r.rule==='2.25'));
});

test('quoted conflict forms are bill-local and preserve only the authorized initial-letter variation',()=>{
 const text='“healthcare” means a service. Healthcare is provided. The healthcare program is required.';
 assert.equal(check(text).length,0);
 assert.deepEqual(check('Healthcare is provided. The healthcare program is required.').map(i=>i.suggestion),['Health care','health care']);
 assert.equal(check('“healthcare” means a service. The HealthCare program is required.').length,1,'Interior capitalization does not inherit a quote exception');
});

test('existing real-bill excerpts keep their exact frozen positives and document bytes',async()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/lcb-independent-lexical-source.json',import.meta.url))),words=await workerWords();let count=0,pages=0;
 for(const entry of fixture.entries){
  const doc=makeDocument(entry.pages.map(p=>p.text),entry.sourcePDF.name,entry.pages.map(p=>p.struck),structuredClone(entry.pages.map(p=>p.formatting)),words),before=hash(doc),issues=jointStylisticIssues(doc,refs);pages+=entry.pages.length;
  for(const wanted of entry.positive){const found=issues.find(i=>i.start===wanted.start&&i.end===wanted.end&&i.suggestion===wanted.suggestion);assert.ok(found,entry.id+' '+wanted.actual);assert.equal(doc.text.slice(found.start,found.end),wanted.actual);count++;}
  assert.ok(issues.every(i=>!i.conflict));assert.equal(hash(doc),before,entry.id);
 }
 assert.equal(count,27);assert.equal(pages,19);
});
