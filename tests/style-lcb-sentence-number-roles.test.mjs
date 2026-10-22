import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {styleContext} from '../app/style-context.mjs';
import {sentenceEnumeratorRanges,quantifiedSentenceCountRole,sentenceMonthYearRanges,sentenceLabelledReferenceRanges} from '../app/style-sentence-number-roles.mjs';
import {lcbSentenceReview} from '../app/style-lcb-sentence-review.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>makeDocument([text],'Current');
const question=text=>lcbSentenceReview(make(text),refs,{includeSeriesReview:false}).issues.some(i=>i.checkId==='lcb-sentence-number-review');
const pairs=[
 'The costs shall not exceed the lesser of (1) 10 percent of the amount or (2) the actual costs.',
 'The agency shall act if either (1) the costs exceed $200,000 or (2) the total exceeds $200,000 within 10 days.',
 'The agency shall act within 30 days, excluding those that are (1) required by law or (2) included in this appropriation.',
 'Liability ends if all of the following occur: (1) the expenditure is required; (2) the agency provides 30 days of notice; and (3) the chairperson approves.'
];

test('complete source correlatives identify only their consecutive inline serial markers',()=>{
 for(const text of pairs){const d=make(text),ranges=sentenceEnumeratorRanges(d);assert.deepEqual(ranges.map(r=>d.text.slice(r.start,r.end)),text===pairs[3]?['1','2','3']:['1','2']);assert.ok(ranges.every(r=>r.evidenceStart<r.start&&r.evidenceEnd>r.end));assert.equal(question(text),false,text);}
 const text='The agency shall employ either (1) 12 zoologists or (2) three ornithologists.';assert.equal(question(text),true,'Ordinary quantities inside the same item are still checked.');
});

test('a whole canonical currency amount can supply an explicitly numbered item body without ordinary words',()=>{
 const text='The augmentation shall exceed either (1) $400,000 or (2) 10 percent before 30 days.',base=make(text),ranges=sentenceEnumeratorRanges(base);assert.deepEqual(ranges.map(r=>base.text.slice(r.start,r.end)),['1','2']);assert.equal(question(text),false);
 for(const changed of [text.replace('$400,000','400000'),text.replace('$400,000','$400,00'),text.replace('$400,000','$')]){assert.deepEqual(sentenceEnumeratorRanges(make(changed)),[],changed);assert.equal(question(changed),true,changed);}
 const [r]=ranges;for(const channel of ['struck','excluded'])for(let at=r.evidenceStart;at<r.evidenceEnd;at++){const d=structuredClone(base);d[channel]=[{start:at,end:at+1}];assert.deepEqual(sentenceEnumeratorRanges(d),[],channel+' '+at);}
 const issues=reviewStyleIssues(base,refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});assert.ok(!issues.some(i=>i.checkId==='lcb-sentence-number-review'));
});

test('an explicit consecutive subprogram list protects numbered referents without treating list contents as numerical quantities',()=>{
 const text='The agency shall report each of the following subprograms administered by the Department of Financial Protection and Innovation: 1) Broker-Dealers, 2) Franchise Investments, 3) Mortgage Bankers, 4) Finance Lenders, 5) Escrow, 6) Deferred Deposit Transactions, 7) Banks, 8) Money Transmitters, 9) Covered Persons, 10) Debt Collectors, and 11) Digital Financial Assets programs.';
 const d=make(text);assert.deepEqual(sentenceEnumeratorRanges(d).map(r=>d.text.slice(r.start,r.end)),Array.from({length:11},(_,i)=>String(i+1)));assert.equal(question(text),false);
 for(const changed of [text.replace('following subprograms','miscellaneous wording'),text.replace('2) Franchise','3) Franchise')])assert.ok(sentenceEnumeratorRanges(make(changed)).length<11);
});

test('unlabelled parentheses, broken numbering, unknown introducers and unrelated clauses remain unresolved',()=>{
 for(const text of ['The agency supplies (1) tool and (2) parts within 10 days.','The agency supplies either (1) a tool or (3) parts within 10 days.','The agency supplies either (1) or (2) within 10 days.','Either(1) tools or (2) parts are required.','The agency provides either (1x) tools or (2) parts.'])assert.deepEqual(sentenceEnumeratorRanges(make(text)),[],text);
 assert.equal(question('The program employs twelve zoologists and contracts with three ornithologists.'),true);
 assert.equal(question('The program employs 12 colleges and includes three program components.'),true);
 assert.equal(question('The agency has one-time data within 30 days.'),true);
});

test('whole original marker, correlative, connector and intervening item evidence is necessary through both removal channels',()=>{
 for(const text of [pairs[0],pairs[3]]){const base=make(text),[r]=sentenceEnumeratorRanges(base);assert.ok(r);for(const channel of ['struck','excluded'])for(let at=r.evidenceStart;at<r.evidenceEnd;at++){const d=structuredClone(base);d[channel]=[{start:at,end:at+1}];assert.deepEqual(sentenceEnumeratorRanges(d),[],channel+' '+at+' '+JSON.stringify(text[at]));}}
});

test('original literal, single-quote, heading, table and Unicode/technical boundaries cannot expose marker witnesses',()=>{
 for(const [o,c]of [['“','”'],['"','"'],['‘','’'],["'","'"]]){const text=o+pairs[0]+c,base=make(text);assert.deepEqual(sentenceEnumeratorRanges(base),[]);for(const channel of ['struck','excluded'])for(const at of [0,text.length-1]){const d=structuredClone(base);d[channel]=[{start:at,end:at+1}];assert.deepEqual(sentenceEnumeratorRanges(d),[],channel+' '+o);}}
 const table=make(pairs[0]);table.blocks[0].formatting={headerGaps:[{},{}]};assert.deepEqual(sentenceEnumeratorRanges(table),[]);
 const heading=make(pairs[0]+'\nLEGISLATIVE COUNSEL’S DIGEST\nExisting law applies.\nThe people of the State of California do enact as follows:\nThe law applies.');assert.deepEqual(sentenceEnumeratorRanges(heading),[]);
 for(const affix of ['é','𐐀','e\u0301','_','/','#','@','-','2']){const text=pairs[0].replace('lesser of',affix+'lesser of'),base=make(text);assert.deepEqual(sentenceEnumeratorRanges(base),[],affix);for(const channel of ['struck','excluded']){const d=structuredClone(base),start=text.indexOf(affix);d[channel]=[{start,end:start+affix.length}];assert.deepEqual(sentenceEnumeratorRanges(d),[],channel+' '+affix);}}
});

test('identified interior running heads preserve marker coordinates while arbitrary ignored bridges stay protected',()=>{
 const text=pairs[0].replace('or (2)','or\nRUNNING HEAD\n(2)'),d=make(text),head=d.blocks.find(b=>b.text==='RUNNING HEAD');head.ignored=true;head.formatting={headerParts:[{}]};d.excluded.push({start:head.start,end:head.end});const ranges=sentenceEnumeratorRanges(d);assert.equal(ranges.length,2);assert.equal(d.text.slice(ranges[1].start,ranges[1].end),'2');
 const unknown=structuredClone(d);unknown.blocks.find(b=>b.text==='RUNNING HEAD').formatting={};assert.deepEqual(sentenceEnumeratorRanges(unknown),[]);
});

test('one or more followed by an existing complete plural noun supplies count evidence only',()=>{
 const text='The agency may offer one or more loans up to 75 percent of the appropriation.',d=make(text),start=text.indexOf('one'),end=start+3,r=quantifiedSentenceCountRole(d,styleContext(d),start,end);assert.equal(r?.kind,'count');assert.equal(d.text.slice(r.evidenceStart,r.evidenceEnd),'one or more loans');assert.equal(question(text),false);
 for(const t of ['The agency may offer one or more unclassifiedtokens up to 75 percent.','The agency may offer one or more loan up to 75 percent.','The agency may offer one or more class up to 75 percent.','The agency may offer one or more business up to 75 percent.','The agency may offer one or more basis up to 75 percent.','The agency may offer one or more loans-ID up to 75 percent.'])assert.equal(question(t),true,t);
 assert.equal(question('The agency may offer one or more loans and retain 12 records.'),true,'Two count roles remain potentially related.');
 for(const channel of ['struck','excluded'])for(let at=r.evidenceStart;at<r.evidenceEnd;at++){const x=structuredClone(d);x[channel]=[{start:at,end:at+1}];assert.equal(quantifiedSentenceCountRole(x,styleContext(x),start,end),null,channel+' '+at);}
});

test('full production pipeline preserves independent numeral owners and does not change source documents',()=>{
 for(const text of [pairs[0],pairs[2],'The agency may offer one or more loans up to 75 percent of the appropriation.']){const doc=make(text),saved=JSON.stringify(doc),issues=reviewStyleIssues(doc,refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});assert.ok(!issues.some(i=>i.checkId==='lcb-sentence-number-review'));assert.equal(JSON.stringify(doc),saved);for(const i of issues)assert.equal(doc.text.slice(i.start,i.end),i.text);}
 const issues=reviewStyleIssues(make('The agency supplies either (1) 3 workers or (2) 4 records within 30 days.'),refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});assert.ok(issues.some(i=>i.text==='3'&&i.suggestion==='three'));assert.ok(issues.some(i=>i.text==='4'&&i.suggestion==='four'));
});

test('LCB22 original month-year example supplies complete valid calendar-year roles without intended-date inference',()=>{
 const page=refs.lcb.pages.find(p=>p.page===22);assert.match(page.text,/(?:^|\n)October 1993\s*(?:\n|$)/u);
 for(const month of ['January','February','March','April','May','June','July','August','September','October','November','December'])for(const year of ['1000','1993','2028','9999']){const d=make('The '+month+' '+year+' pupil count applies to children through two years of age.'),r=sentenceMonthYearRanges(d,refs);assert.equal(r.length,1,month+' '+year);assert.equal(d.text.slice(r[0].start,r[0].end),month+' '+year);assert.equal(question(d.text),false);}
 for(const text of ['April 1993 widgets','April\n1993 pupil count'])assert.equal(sentenceMonthYearRanges(make(text),refs).length,1,text);
 for(const text of ['April 0000','April 0993','April 993','April 19930','April 1993.5','April 1993widgets','Apr 1993','Notamonth 1993'])assert.deepEqual(sentenceMonthYearRanges(make(text),refs),[],text);
 assert.equal(question('The program retains 1993 records and two files.'),true);
 assert.equal(question('The program retains twelve records and three files.'),true);
});

test('month-year authority and every original calendar character retain duplicate, masking and boundary protections',()=>{
 const text='The April 1993 pupil count applies to children through two years of age.',base=make(text),[r]=sentenceMonthYearRanges(base,refs);assert.ok(r);
 assert.deepEqual(sentenceMonthYearRanges(base,{}),[]);for(const kind of ['remove','changed','duplicate']){const x=structuredClone(refs),p=x.lcb.pages.find(p=>p.page===22);if(kind==='remove')x.lcb.pages=x.lcb.pages.filter(p=>p.page!==22);if(kind==='changed')p.text=p.text.replace('October 1993','Unknown 1993');if(kind==='duplicate')x.lcb.pages.push({...p});assert.deepEqual(sentenceMonthYearRanges(base,x),[],kind);}
 for(const channel of ['struck','excluded'])for(let at=r.start;at<r.end;at++){const d=structuredClone(base);d[channel]=[{start:at,end:at+1}];assert.deepEqual(sentenceMonthYearRanges(d,refs),[],channel+' '+at);}
 for(const [o,c] of [['“','”'],['"','"'],['‘','’'],["'","'"]]){const t=o+'April 1993'+c,d=make(t);assert.deepEqual(sentenceMonthYearRanges(d,refs),[]);for(const channel of ['struck','excluded'])for(const at of [0,t.length-1]){const x=structuredClone(d);x[channel]=[{start:at,end:at+1}];assert.deepEqual(sentenceMonthYearRanges(x,refs),[],o+' '+channel);}}
 for(const affix of ['é','𐐀','e\u0301','_','/','#','@','-','2'])for(const side of ['before','after']){const t=(side==='before'?affix:'')+'April 1993'+(side==='after'?affix:''),d=make(t);assert.deepEqual(sentenceMonthYearRanges(d,refs),[],t);for(const channel of ['struck','excluded']){const x=structuredClone(d),start=side==='before'?0:t.length-affix.length;x[channel]=[{start,end:start+affix.length}];assert.deepEqual(sentenceMonthYearRanges(x,refs),[],channel+' '+t);}}
 const table=make(text);table.blocks[0].formatting={headerGaps:[{},{}]};assert.deepEqual(sentenceMonthYearRanges(table,refs),[]);
 const heading=make(text+'\nLEGISLATIVE COUNSEL’S DIGEST\nExisting law applies.\nThe people of the State of California do enact as follows:\nThe law applies.');assert.deepEqual(sentenceMonthYearRanges(heading,refs),[]);
});

test('exact following-actions-shall-be-taken intro establishes intact sequential markers while preserving independent counts',()=>{
 const text='The following actions shall be taken: (1) file 12 notices; and (2) retain 12 reports.',base=make(text),ranges=sentenceEnumeratorRanges(base);assert.deepEqual(ranges.map(r=>base.text.slice(r.start,r.end)),['1','2']);assert.equal(question(text),false);
 for(const changed of [text.replace('shall be taken','may be appropriate'),text.replace('(2)','(3)')])assert.deepEqual(sentenceEnumeratorRanges(make(changed)),[]);
 assert.equal(question(text.replace('12 notices','three notices')),true,'The ordinary count still participates in Bill item3.');
 const [r]=ranges;for(const channel of ['struck','excluded'])for(let at=r.evidenceStart;at<r.evidenceEnd;at++){const d=structuredClone(base);d[channel]=[{start:at,end:at+1}];assert.deepEqual(sentenceEnumeratorRanges(d),[],channel+' '+at);}
 for(const t of [text,'The April 1993 pupil count applies to children through two years of age.'])assert.ok(!reviewStyleIssues(make(t),refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true}).some(i=>i.checkId==='lcb-sentence-number-review'),t);
 const issues=reviewStyleIssues(make('The April 1993 pupil count retains 3 records.'),refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});assert.ok(issues.some(i=>i.text==='3'&&i.suggestion==='three'));
});

const referenceCases=[
 ['The benefit covers one dependent for the 2026 calendar year.','2026','calendar-year-label'],
 ['The CHIPS Act of 2022 permits a letter, if one is needed.','2022','named-act-year'],
 ['The agency shall act within 30 days pursuant to (2) above.','2','relative-numbered-reference']
];
test('complete source-labelled calendar years, finite printed-shape Act titles and exact backreferences preserve their own numerical roles',()=>{
 assert.match(refs.lcb.pages.find(p=>p.page===18).text,/(?:^|\n)Budget Act of 1979\s*(?:\n|$)/u);
 assert.match(refs.lcb.pages.find(p=>p.page===22).text,/(?:^|\n)Sections 123 and 124\s*(?:\n|$)/u);
 for(const [text,value,role]of referenceCases){const d=make(text),ranges=sentenceLabelledReferenceRanges(d,refs);assert.equal(ranges.length,1,text);assert.equal(ranges[0].role,role);assert.equal(d.text.slice(ranges[0].start,ranges[0].end),value);assert.equal(question(text),false,text);assert.ok(!reviewStyleIssues(d,refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true}).some(i=>i.checkId==='lcb-sentence-number-review'),text);}
 for(const text of ['The plan holds 2026 records and two files.','The Other Act of 2022 applies if one is needed.','The New CHIPS Act of 2022 applies if one is needed.','The chips Act of 2022 applies if one is needed.','The agency shall act within 30 days pursuant to (2).']){assert.deepEqual(sentenceLabelledReferenceRanges(make(text),refs),[],text);assert.equal(question(text),true,text);}
 for(const text of ['The 0000 calendar year applies.','The 0993 calendar year applies.','The 20260 calendar year applies.','The 2026 calendar year-old wording applies.','The CHIPS Act of 0000 applies.','The CHIPS Act of 2022x applies.','The agency acts pursuant to (02) above.','The agency acts pursuant to (2) aboveboard.'])assert.deepEqual(sentenceLabelledReferenceRanges(make(text),refs),[],text);
 const issues=reviewStyleIssues(make('The benefit covers 3 dependents for the 2026 calendar year.'),refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});assert.ok(issues.some(i=>i.text==='3'&&i.suggestion==='three'));
});

test('complete original reference labels and names remain required through source masks, removed literal marks and technical boundaries',()=>{
 for(const [text]of referenceCases){const base=make(text),[r]=sentenceLabelledReferenceRanges(base,refs);for(const channel of ['struck','excluded'])for(let at=r.evidenceStart;at<r.evidenceEnd;at++){const d=structuredClone(base);d[channel]=[{start:at,end:at+1}];assert.deepEqual(sentenceLabelledReferenceRanges(d,refs),[],channel+' '+at+' '+text);}
  const phrase=text.slice(r.evidenceStart,r.evidenceEnd);for(const [o,c]of [['“','”'],['"','"'],['‘','’'],["'","'"]]){const t=o+phrase+c,d=make(t);assert.deepEqual(sentenceLabelledReferenceRanges(d,refs),[]);for(const channel of ['struck','excluded'])for(const at of [0,t.length-1]){const x=structuredClone(d);x[channel]=[{start:at,end:at+1}];assert.deepEqual(sentenceLabelledReferenceRanges(x,refs),[],channel+' '+t);}}
  for(const affix of ['é','𐐀','e\u0301','_','/','#','@','-','2'])for(const side of ['before','after']){const t=(side==='before'?affix:'')+phrase+(side==='after'?affix:''),d=make(t);assert.deepEqual(sentenceLabelledReferenceRanges(d,refs),[],t);for(const channel of ['struck','excluded']){const x=structuredClone(d),start=side==='before'?0:t.length-affix.length;x[channel]=[{start,end:start+affix.length}];assert.deepEqual(sentenceLabelledReferenceRanges(x,refs),[],channel+' '+t);}}
  const table=make(text);table.blocks[0].formatting={headerGaps:[{},{}]};assert.deepEqual(sentenceLabelledReferenceRanges(table,refs),[]);
  for(const kind of ['remove','duplicate','changed']){const x=structuredClone(refs),page=r.role==='named-act-year'?18:22,p=x.lcb.pages.find(p=>p.page===page);if(kind==='remove')x.lcb.pages=x.lcb.pages.filter(p=>p.page!==page);if(kind==='duplicate')x.lcb.pages.push({...p});if(kind==='changed')p.text=p.text.replace(r.role==='named-act-year'?'Budget Act of 1979':r.role==='calendar-year-label'?'October 1993':'Sections 123 and 124','unsupported original example');assert.deepEqual(sentenceLabelledReferenceRanges(base,x),[],kind+' '+text);}
 }
});
