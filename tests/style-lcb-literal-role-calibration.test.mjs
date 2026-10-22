import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {styleContext} from '../app/style-context.mjs';
import {labelledNumericalRoleRanges as roles,labelledNumericalRoleQuestionProtections as protections} from '../app/style-lcb-labelled-numerical-roles.mjs';
import {lcbNumericalUncertaintyIssues as uncertain} from '../app/style-lcb-numerical-uncertainty.mjs';
import {lcbSourceReviewIssues as sourceCheck} from '../app/style-lcb-source-review.mjs';
import {californiaCountyIssues} from '../app/style-california-counties.mjs';
import {lcbLocalSourceRoleRanges,countyInstitutionCaptionRanges} from '../app/style-lcb-local-source-roles.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>makeDocument(['The people do enact as follows:\n'+text],'Current');
const labelled=[
 ['The source uses Item 360-492.','360-492'],
 ['Use 3125-101-1018, Budget Act of 2021.','3125-101-1018'],
 ['Use Items 5225-025-0001 5225-093-0001, 5225-094-0001.','5225-093-0001'],
 ['The Reference Code example 001–100 represents state operations in the Budget Act.','001–100'],
 ['Budget Act of 2025 applies.\n3414—988 State Suicide and Behavioral Health\nCrisis Services Fund\nThe next provision applies.','3414—988'],
 ['Budget Act of 2025 applies.\n(13) 6049-2006 California Community College Capital Outlay Bond\nFund.','6049-2006'],
 ['The Pupil Residency rule (Ch. 309, Stats. 1995) (96-384-01) applies.','96-384-01'],
 ['The Identity Theft rule (Ch. 956, Stats. 2000) (03-\nTC-08) applies.','TC-08'],
 ['Use the following mandates: Cal Grants (02-\nTC-28), and Tuition Fee Waivers (02-\nTC-21).','TC-28'],
 ['The baseline year of 2020–21 applies.','2020–21'],
 ['The 2026–27 award year applies.','2026–27'],
 ['Use each fiscal year between 2026–27 to 2028–29, inclusive.','2028–29']
];
test('new local source labels protect entire original references without verifying identity or computing values',()=>{
 for(const [text,term]of labelled){const d=make(text),at=d.text.indexOf(term),before=JSON.stringify(d);assert.ok(roles(d).some(r=>r.start<=at&&r.end>=at+term.length),text);assert.ok(!uncertain(d,refs).some(i=>i.start<at+term.length&&i.end>at),text);assert.equal(JSON.stringify(d),before);}
});
test('new establishing evidence must survive every character under both source removal channels',()=>{
 for(const [text,term]of labelled){const d=make(text),at=d.text.indexOf(term),w=roles(d).find(r=>r.start<=at&&r.end>=at+term.length);assert.ok(w,text);for(const field of ['struck','excluded'])for(let n=w.evidenceStart;n<w.evidenceEnd;n++){const copy=structuredClone(d);copy[field].push({start:n,end:n+1});assert.ok(!roles(copy).some(r=>r.role===w.role&&r.start<=at&&r.end>=at+term.length),text+' '+field+' '+n);}}
});
test('a statutory citation cannot turn a following small range or short quantity into a mandate code',()=>{
 for(const suffix of ['(2-3) workers','(03) samples','(2-3, 03) workers']){const d=make('The rule (Ch. 5, Stats. 2026) '+suffix+' applies.');assert.ok(!roles(d).some(r=>r.role==='mandate-claim'));assert.ok(!protections(d).some(r=>r.role==='mandate-claim'));assert.ok(uncertain(d,refs).some(i=>/2-3/u.test(i.text))||suffix.startsWith('(03)'));}
 for(const token of ['3125-101-1018','360-492','96-384-01','TC-08','2026–27','K–12'])assert.ok(uncertain(make('The agency reports '+token+' widget readings.'),refs).some(i=>i.text===token),token);
});
const local=[
 ['The K–12 component of the Strong Workforce Program applies.','K–12'],
 ['Use the K–12 High-Speed Network.','K–12'],
 ['Use K–12 Workforce Pathway Coordinators and K–14 Technical Assistance Providers.','K–14'],
 ['The impacts affect K–12 schools.','K–12'],
 ['A PK–12 educational career applies.','PK–12'],
 ['Use PK–12 educational workforce data reporting.','PK–12'],
 ['Improve education pathways between K–12 and community colleges.','K–12'],
 ['Align curricula across K–20 segments.','K–20'],
 ['The State Department of Education shall report on behalf of K–12 entities.','K–12'],
 ['Use the 2026–27 Final Change Book for the 2026–27 fiscal year.','2026–27'],
 ['Develop systems and protocols with 9-1-1 and 9-8-8 to strengthen integration and direct people to the right number.','9-1-1']
];
test('complete education titles local roles and protocol-number clauses only veto unsupported component questions',()=>{
 for(const [text,term]of local){const d=make(text),at=d.text.indexOf(term),w=protections(d).find(r=>r.start<=at&&r.end>=at+term.length);assert.ok(w,text);assert.equal(w.negativeOnly,true);assert.ok(!uncertain(d,refs).some(i=>i.start<at+term.length&&i.end>at),text);for(const field of ['struck','excluded'])for(let n=w.evidenceStart;n<w.evidenceEnd;n++){const copy=structuredClone(d);copy[field].push({start:n,end:n+1});assert.ok(!protections(copy).some(r=>r.role===w.role&&r.start<=at&&r.end>=at+term.length),text+' '+field+' '+n);}}
});
test('unknown labels incomplete names technical attachments and malformed endpoints do not acquire local protection',()=>{
 for(const text of ['The 2026–27 legal services hours apply.','The K–12 component of an unspecified device applies.','The K–12 component of the Strong Workforce applies.','Use the K–12 High-Speed router.','The grades K–13 apply.','Use baseline year of 2020–29.','Use 2026–29 award year.','Use the 2026–27 Final Change Book for the 2025–26 fiscal year.','Develop systems and protocols with 9-1-1 and 9-8-8.','The code 9-1-1 is listed.']){const d=make(text);assert.equal(protections(d).length,0,text);assert.ok(uncertain(d,refs).length,text);}
 for(const text of ['Use path/K–12 High-Speed Network.','Use X2026–27 award year.','Use K–12 High-Speed Network_key.']){const d=make(text);assert.equal(protections(d).length,0,text);}
});
test('generic budget acts and the exact parenthesized IHSS program stay quiet while real source mismatches remain',()=>{
 for(const text of ['A citation to a budget act includes all acts amending that budget act.','The In-Home Supportive Services (IHSS) program applies.'])assert.deepEqual(sourceCheck(make(text),refs),[],text);
 for(const text of ['The budget act applies.','The a budget act of 2026 applies.','The panel studies African-American textiles.'])assert.ok(sourceCheck(make(text),refs).length,text);
 for(const text of ['The In Home Supportive Services (IHSS) program applies.','The In-Home Supportive Services (WRONG) program applies.']){const d=make(text);assert.equal(lcbLocalSourceRoleRanges(d,styleContext(d),refs).length,0,text);}
 for(const text of ['A citation to a budget act includes amendments.','The In-Home Supportive Services (IHSS) program applies.']){const d=make(text),w=lcbLocalSourceRoleRanges(d,styleContext(d),refs)[0];assert.ok(w);for(const field of ['struck','excluded'])for(let n=w.start;n<w.end;n++){const copy=structuredClone(d);copy[field].push({start:n,end:n+1});assert.equal(lcbLocalSourceRoleRanges(copy,styleContext(copy),refs).length,0,field+' '+n);}}
});
test('intact numbered Schedule discrepancy is precise and preserves its physical whole-reference evidence',()=>{
 const d=make('Use subschedule (D) of schedule (13)(a).'),before=JSON.stringify(d),[i]=sourceCheck(d,refs);assert.equal(i.checkId,'lcb-numbered-schedule');assert.equal(i.suggestion,'Schedule');assert.equal(d.text.slice(i.start,i.end),'schedule');assert.equal(d.text.slice(i.evidenceStart,i.evidenceEnd),'schedule (13)(a)');assert.equal(JSON.stringify(d),before);
 for(const field of ['struck','excluded'])for(let n=i.evidenceStart;n<i.evidenceEnd;n++){const copy=structuredClone(d);copy[field].push({start:n,end:n+1});assert.ok(!sourceCheck(copy,refs).some(i=>i.checkId==='lcb-numbered-schedule'),field+' '+n);}
 for(const text of ['Use Schedule (13).','The schedule applies.','The term “schedule (13)” is literal.'])assert.deepEqual(sourceCheck(make(text),refs),[],text);
 for(const text of ['Use path/schedule (13).','Use schedule (13).key.','Use schedule (13)_key.'])assert.ok(!sourceCheck(make(text),refs).some(i=>i.checkId==='lcb-numbered-schedule'),text);
 const changed=structuredClone(refs);changed.lcb.pages[18].text=changed.lcb.pages[18].text.replace('Schedule (with number)','Schedule without source condition');assert.ok(!sourceCheck(d,changed).some(i=>i.checkId==='lcb-numbered-schedule'));
});
test('complete facility schedule caption stays intact without exempting standalone county targets',()=>{
 const text='(2) 7000046-Veterans Home of Califor-\nnia—Greater Los Angeles Ventura\nCounty—GLAVC.......................... 8,848,000',d=make(text),ranges=countyInstitutionCaptionRanges(d,styleContext(d));assert.equal(ranges.length,1);assert.deepEqual(californiaCountyIssues(d),[]);
 for(const field of ['struck','excluded'])for(let n=ranges[0].start;n<ranges[0].end;n++){const copy=structuredClone(d);copy[field].push({start:n,end:n+1});assert.equal(countyInstitutionCaptionRanges(copy,styleContext(copy)).length,0,field+' '+n);}
 for(const text of ['Ventura County applies.','County of Ventra applies.','County of Atlantis applies.','Greater Los Angeles Ventura County applies.'])assert.ok(californiaCountyIssues(make(text)).length,text);
});
test('complete original table claim list can only veto a question; positive table roles remain unavailable',()=>{
 const text='The rule (Chs. 972 and 974, Stats. 1995) (96-358-03, 03A, 98-TC-22, 01-\nTC-18, CSM 4456, 4455, and 4463)..................... 1,000',d=make(text),tail=d.blocks.at(-1);tail.formatting={headerGaps:[{},{}]};const w=protections(d).find(r=>r.role==='mandate-claim');assert.ok(w);assert.equal(w.negativeOnly,true);assert.ok(!roles(d).some(r=>r.role==='mandate-claim'));assert.ok(!uncertain(d,refs).some(i=>i.text==='TC-18'));
 for(const field of ['struck','excluded'])for(let n=w.evidenceStart;n<w.evidenceEnd;n++){const copy=structuredClone(d);copy[field].push({start:n,end:n+1});assert.ok(!protections(copy).some(r=>r.role==='mandate-claim'),field+' '+n);}
 const other=make(text+'\nThe agency reports 3790-491 widget readings. The sample contains 10,795,0000 units.');other.blocks.findLast(b=>b.text.includes('TC-18')).formatting={headerGaps:[{},{}]};const issues=uncertain(other,refs);assert.ok(issues.some(i=>i.text==='3790-491'));assert.ok(issues.some(i=>i.text==='10,795,0000'));
});
test('a negative reimbursement amount requires the original Item Amount header and distinct amount column geometry',()=>{
 const d=make('Item Amount\n(8) Reimbursements to 0705-Elections −36,000'),header=d.blocks.find(b=>b.text==='Item Amount'),body=d.blocks.at(-1),at=body.text.indexOf('−36,000');header.formatting={headerParts:[{text:'Item'},{text:'Amount'}]};body.formatting={x:94,right:324,runs:[{start:0,end:at-1,x:112,width:156,height:10},{start:at,end:at+7,x:285.5,width:38.5,height:10}]};
 const [w]=roles(d).filter(r=>r.role==='reimbursement-amount');assert.ok(w);assert.equal(d.text.slice(w.start,w.end),'−36,000');assert.ok(!uncertain(d,refs).some(i=>i.text==='−36,000'));
 for(const field of ['struck','excluded'])for(const [start,end]of [[w.evidenceStart,w.evidenceEnd],[header.start,header.end]])for(let n=start;n<end;n++){const copy=structuredClone(d);copy[field].push({start:n,end:n+1});assert.ok(!roles(copy).some(r=>r.role==='reimbursement-amount'),field+' '+n);}
 for(const changed of [x=>x.blocks.at(-1).formatting.runs=[],x=>x.blocks.find(b=>b.text==='Item Amount').formatting={},x=>x.blocks.at(-1).formatting.runs.at(-1).x=150]){const copy=structuredClone(d);changed(copy);assert.ok(!roles(copy).some(r=>r.role==='reimbursement-amount'));assert.ok(uncertain(copy,refs).some(i=>i.text==='−36,000'));}
 for(const text of ['The adjustment is −36,000 units.','(8) Reimbursements to 0705-Elections −36,0000'])assert.ok(uncertain(make(text),refs).length,text);
});
test('native-discovered Fund references grade spreads and named mandate lists have complete local figure roles',async()=>{
 const {reviewStyleIssues}=await import('../app/style-review.mjs');
 for(const text of ['The payment is from Fund 0001 and Fund 0995.','The program serves pupils in grades 1 to 12, inclusive.','The following mandates apply: Enrollment Fee Collection (99-TC-13) and Enrollment Fee Waivers (00-TC-15).']){const d=make(text),issues=reviewStyleIssues(d,refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});assert.deepEqual(issues,[],text);}
 const controls=reviewStyleIssues(make('Fund 2 reports. The allocation is $10,795,0000.'),refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});assert.ok(controls.some(i=>i.text==='2'&&i.suggestion==='two'));assert.ok(controls.some(i=>/^\$?10,795,0000$/u.test(i.text)&&i.suggestion===null));
 const clock=reviewStyleIssues(make('2 p.m. is the deadline.'),refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});assert.ok(clock.some(i=>i.checkId==='lcb-integer-opening-review'&&i.text==='2'&&i.suggestion===null));
 const percentage=reviewStyleIssues(make('3 percent of the amount is required.'),refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});assert.ok(percentage.some(i=>i.checkId==='opening-percentages'&&i.text==='3 percent'&&i.suggestion==='Three percent'));
});
test('new Fund grade and mandate-apply cues require every original character and preserve unknown-role controls',()=>{
 for(const [text,role]of [['The payment is from Fund 0001 and Fund 0995.','fund-reference'],['The program serves pupils in grades 1 to 12, inclusive.','grade-range'],['The following mandates apply: Enrollment Fee Collection (99-TC-13) and Enrollment Fee Waivers (00-TC-15).','mandate-list']]){const d=make(text),w=roles(d).find(r=>r.role===role);assert.ok(w,text);for(const field of ['struck','excluded'])for(let n=w.evidenceStart;n<w.evidenceEnd;n++){const copy=structuredClone(d);copy[field].push({start:n,end:n+1});assert.ok(!roles(copy).some(r=>r.role===role),text+' '+field+' '+n);}}
 for(const text of ['Fund 2 reports.','Fund 0002 reports.','The payment is from Fund 0001X.','The figure 1 to 12, inclusive, measures widgets.','The program serves pupils in grades 12 to 1, inclusive.','The program serves pupils in grades 1 to 13, inclusive.','The following mandates apply: Samples (2-3) and Workers (00).'])assert.ok(!roles(make(text)).some(r=>['fund-reference','grade-range','mandate-list'].includes(r.role)),text);
});
