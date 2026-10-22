import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
import {labelledNumericalRoleRanges} from '../app/style-lcb-labelled-numerical-roles.mjs';
import {lcbNumericalUncertaintyIssues} from '../app/style-lcb-numerical-uncertainty.mjs';
import {numeralIdentifierRanges} from '../app/style-numeral-identifiers.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>makeDocument([text],'Current');
const check=doc=>reviewStyleIssues(typeof doc==='string'?make(doc):doc,refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});

test('explicit Provision and abbreviated statutory labels are serials rather than mixed prose quantities',()=>{
 for(const text of ['Upon approval, the Controller may transfer funds pursuant to Provisions 6, 10, and 12 of Item 0250-101-0932.','Of the amount allocated in Provision 7, courts may retain up to 30 percent of the funding.','The program is authorized by Chs.4 and 5, Stats. 2025.'])assert.deepEqual(check(text),[],text);
 for(const text of ['Provision 12 requires 3 records.','Provisions 1 and 12 require 3 records.','The chapter requires 3 records.'])assert.ok(check(text).some(i=>i.text==='3'&&i.suggestion==='three'),text);
 const ambiguous='Provisions 1, 3 records, and 12 require review.',at=ambiguous.indexOf('3 records');assert.ok(!numeralIdentifierRanges(ambiguous).some(r=>r.start<=at&&r.end>at));assert.ok(check(ambiguous).some(i=>i.checkId==='lcb-sentence-number-review'));
 assert.equal(numeralIdentifierRanges('The chart includes stats 4 and 12 categories.').length,0,'An undotted ordinary word is not a statutory abbreviation.');
});

test('complete labelled Final Rule, Order No. and version tokens do not create numeral questions',()=>{
 for(const text of ['The Medicaid Final Rule (CMS-2439-F) is rescinded.','The board issued Order No. R8-2009-0030.','The board issued Order No. 01-182.','The CALPADS Data Guide v4.1 applies.','Version 4.1 applies.']){
  const doc=make(text),before=JSON.stringify(doc);assert.ok(labelledNumericalRoleRanges(doc).length,text);assert.ok(!check(doc).some(i=>i.checkId==='lcb-numerical-uncertainty-review'),text);assert.equal(JSON.stringify(doc),before);
  assert.ok(check(text+' The board retains 3 records.').some(i=>i.text==='3'&&i.suggestion==='three'));
 }
 for(const text of ['The model CMS-2439-F is described.','The sample contains R8-2009-0030 readings.','The sample contains 01-182 readings.','The value 4.1 remains.'])assert.equal(labelledNumericalRoleRanges(make(text)).length,0,text);
});

test('identifier labels and complete original token boundaries cannot be manufactured by source removal',()=>{
 for(const text of ['The Final Rule (CMS-2439-F) applies.','The Order No. R8-2009-0030 applies.','The guide v4.1 applies.']){
  const doc=make(text),[range]=labelledNumericalRoleRanges(doc);assert.ok(range,text);
  for(const field of ['struck','excluded'])for(let at=range.evidenceStart;at<range.evidenceEnd;at++){
   const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});assert.equal(labelledNumericalRoleRanges(damaged).length,0,field+' '+at+' '+text);
  }
 }
 for(const text of ['XOrder No. 01-182 applies.','The Order No. 01-182XYZ applies.','The guide v4.1XYZ applies.']){
  const at=text.indexOf('X');for(const field of ['struck','excluded']){const damaged=make(text);damaged[field].push({start:at,end:at+(text.includes('XYZ')?3:1)});assert.equal(labelledNumericalRoleRanges(damaged).length,0,text);}
 }
 for(const text of ['The Order No. 01-182-foo applies.','The guide v4..1 applies.'])assert.equal(labelledNumericalRoleRanges(make(text)).length,0,text);
});

test('Unicode-minus replacement amounts retain numeric budget-row ownership without shielding ordinary prose',()=>{
 const text='The Budget Act of 2026 applies.\nline 1 Reimbursements to programs........... −6,667,000\nline 2 −6,982,000\nline 3 The agency retains 3 records.',doc=make(text),before=JSON.stringify(doc);
 assert.ok(!lcbNumericalUncertaintyIssues(doc,refs).some(i=>i.text==='−6,982,000'));
 assert.ok(check(doc).some(i=>i.text==='3'&&i.suggestion==='three'));assert.equal(JSON.stringify(doc),before);
 assert.ok(lcbNumericalUncertaintyIssues(make('The balance is −6,982,000 units.'),refs).some(i=>i.text==='−6,982,000'));
 assert.ok(lcbNumericalUncertaintyIssues(make('The Budget Act of 2026 applies. The model contains 1,00 units.'),refs).some(i=>i.text==='1,00'));
});

test('explicit project and CSM source labels establish serial roles without certifying identifier accuracy',()=>{
 for(const text of ['The Surface Mining and Reclamation Act (SMARA-4) project is funded.','The mandate is identified as CSM-00-\nline 2 TC-22.','The mandate references CSM 4204, CSM 4485, and 05-TC-05.'])assert.ok(!check(text).some(i=>['lcb-sentence-number-review','lcb-numerical-uncertainty-review'].includes(i.checkId)),text);
 assert.ok(lcbNumericalUncertaintyIssues(make('The sample contains SMARA-4 readings.'),refs).length);
 assert.equal(labelledNumericalRoleRanges(make('The sample contains 05-TC-05 readings.')).length,0,'The shape alone does not manufacture a CSM source label.');
 const text='The mandate references CSM-00-TC-22.',doc=make(text),[range]=labelledNumericalRoleRanges(doc);assert.ok(range);
 for(const field of ['struck','excluded'])for(let at=range.evidenceStart;at<range.evidenceEnd;at++){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});assert.equal(labelledNumericalRoleRanges(damaged).length,0,field+' '+at);}
});

test('a printed body dash cannot manufacture an alphanumeric numeral question',()=>{
 for(const text of ['For special classes and centers—16.','For resource specialist programs—24.','For designated instructional services—16.'])assert.ok(!lcbNumericalUncertaintyIssues(make(text),refs).length,text);
 assert.ok(lcbNumericalUncertaintyIssues(make('The sample contains TC-22 readings.'),refs).length,'An actual hyphenated token retains its independent unresolved-role check.');
 assert.ok(lcbNumericalUncertaintyIssues(make('The sample contains K–13 readings.'),refs).length,'An en-dash range is distinct from a body em dash.');
});

test('explicit budget fund and appropriation headings are serials while unrelated prose quantities remain checked',()=>{
 for(const text of ['The Budget Act of 2026 applies.\n0001—General Fund\nThe board shall retain 3 records.','The Budget Act of 2026 applies.\n9650-001-0001—For support of Health and Dental Benefits for Annuitants.\nThe board shall retain 3 records.']){
  const doc=make(text),found=check(doc);assert.ok(labelledNumericalRoleRanges(doc).some(r=>['fund-heading','item-heading'].includes(r.role)),text);assert.ok(!found.some(i=>i.checkId==='lcb-sentence-number-review'),text);assert.ok(found.some(i=>i.text==='3'&&i.suggestion==='three'),text);
 }
 for(const text of ['0001—General Fund','9650-001-0001—For support of the program.'])assert.ok(!labelledNumericalRoleRanges(make(text)).some(r=>['fund-heading','item-heading'].includes(r.role)),'The independent source Budget Act context is required.');
 const doc=make('The Budget Act of 2026 applies.\n0001—General Fund'),at=doc.text.indexOf('Fund');for(const field of ['struck','excluded']){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+4});assert.ok(!labelledNumericalRoleRanges(damaged).some(r=>r.role==='fund-heading'));}
 for(const heading of ['0001—General Fund','9650-001-0001—For support of the program.']){
  const text='The Budget Act of 2026 applies.\n'+heading,doc=make(text),a=text.indexOf('Budget'),b=text.indexOf(' applies');
  for(const field of ['struck','excluded'])for(let at=a;at<b;at++){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});assert.ok(!labelledNumericalRoleRanges(damaged).some(r=>['fund-heading','item-heading'].includes(r.role)),field+' '+at);}
  assert.ok(!labelledNumericalRoleRanges(make('The quotation is “Budget Act of 2026”.\n'+heading)).some(r=>['fund-heading','item-heading'].includes(r.role)),'Quoted genre text cannot establish this role.');
 }
});

test('complete spelled statute-year identifiers do not set the threshold for nearby ordinary quantities',()=>{
 for(const text of ['The Budget Act of 2025 requires 3 records.','Chapter 4 of the Statutes of 2025 requires 3 records.']){const found=check(text);assert.ok(!found.some(i=>i.checkId==='lcb-sentence-number-review'),text);assert.ok(found.some(i=>i.text==='3'&&i.suggestion==='three'),text);}
 assert.ok(!check('The funds under the Budget Act of 2025 are available for three years.').some(i=>i.checkId==='lcb-sentence-number-review'));
 assert.ok(check('The budget total of 2025 requires three records.').some(i=>i.checkId==='lcb-sentence-number-review'));
 assert.equal(numeralIdentifierRanges('The Budget Act of 2025X requires three records.').length,0,'An attached letter cannot acquire a bare statute-year role.');
 const text='The Budget Act of 2025 requires 3 records.',doc=make(text),a=text.indexOf('Budget'),b=text.indexOf(' requires');for(const field of ['struck','excluded'])for(let at=a;at<b;at++){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});assert.ok(!check(damaged).some(i=>i.checkId==='lcb-sentence-number-review'),'Damaged source cannot establish the comparative sentence.');}
});

test('explicit percentage and duration units settle their difference without silencing unknown or same-unit relationships',()=>{
 for(const text of ['The allocation shall not decrease by more than 50 percent during the three-year cycle.','The agency retains three-year grants with a maximum of 50%.'])assert.ok(!check(text).some(i=>i.checkId==='lcb-sentence-number-review'),text);
 for(const text of ['The agency retains three-year grants and 50 readings.','The agency retains three-year grants and 50.','The agency retains three-year and 50-year grants.'])assert.ok(check(text).some(i=>i.checkId==='lcb-sentence-number-review'),text);
 const text='The allocation shall not decrease by more than 50 percent during the three-year cycle.',doc=make(text),at=text.indexOf('percent');for(const field of ['struck','excluded']){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+7});assert.ok(!check(damaged).some(i=>i.checkId==='lcb-sentence-number-review'),'Damaged unit evidence cannot establish a source comparison.');}
});

test('already-figure percentage pairs stay compliant while written forms and unknown quantities remain checked',()=>{
 for(const text of ['The fee is limited to 1 percent of monthly income for families earning 75 percent of median income.','The rate is 3% and the maximum is 50%.'])assert.ok(!check(text).some(i=>i.checkId==='lcb-sentence-number-review'),text);
 assert.ok(check('The rate is three percent and the maximum is 50 percent.').some(i=>i.text==='three'&&i.suggestion==='3'));
 assert.ok(check('The agency retains 3 records and 50 documents.').some(i=>i.checkId==='lcb-sentence-number-review'));
 assert.ok(check('The fee is 1 percent and the maximum is 75 percent; the agency retains 2 records.').some(i=>i.text==='2'&&i.suggestion==='two'));
 assert.ok(check('The literal “1 percent and 75 percent” is printed. The agency retains 2 records.').some(i=>i.text==='2'&&i.suggestion==='two'));
 const opening='Three percent of the 75 records shall be retained.',found=check(opening);assert.ok(!found.some(i=>i.text==='Three'&&i.suggestion==='3'),'Sentence-opening ownership remains independent.');
});

test('explicit month and day dates without a year do not become ordinary count thresholds',()=>{
 for(const text of ['The report is due on June 30 and covers the first three quarters.','The agency shall report by September 1 after 30 days.','By March 1, annually, the board shall retain three records.','The board retains 12 records by June 3.'])assert.ok(!check(text).some(i=>i.checkId==='lcb-sentence-number-review'),text);
 for(const text of ['The board records June totals of 30 and retains three records.','The board records XJune 30 and retains three records.','The board records αJune 30 and retains three records.','The board records June 99 and retains three records.'])assert.ok(check(text).some(i=>i.checkId==='lcb-sentence-number-review'),text);
 assert.ok(check('By March 12 the board shall retain 2 records.').some(i=>i.text==='2'&&i.suggestion==='two'));
 assert.ok(check('The literal “March 12” is printed. The board shall retain 2 records.').some(i=>i.text==='2'&&i.suggestion==='two'));
 assert.ok(check('The board acts on June 3–12 and retains 2 records.').some(i=>i.checkId==='lcb-numerical-uncertainty-review'),'A complete unsupported date-range shape retains its own source-role question.');
 const text='The report is due on June 30 and covers the first three quarters.',doc=make(text),a=text.indexOf('June'),b=a+'June 30'.length;
 for(const field of ['struck','excluded'])for(let at=a;at<b;at++){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});assert.ok(!check(damaged).some(i=>i.checkId==='lcb-sentence-number-review'),'A damaged date cannot manufacture a comparison.');}
});
