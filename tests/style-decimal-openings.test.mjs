import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument}from '../app/core.mjs';import {decimalOpeningReviewIssues}from '../app/style-decimal-openings.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {workerWords}from './helpers/spelling-worker.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),words=await workerWords(),make=text=>makeDocument([text],'Current',[],[],words),check=d=>decimalOpeningReviewIssues(d,refs),joint=d=>jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-decimal-opening-review');
const evidence=(d,i)=>{assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(d.text.slice(i.evidenceStart,i.evidenceEnd),i.openingClauseText);assert.equal(i.start,i.evidenceStart);assert.ok(i.evidenceEnd>i.end);assert.equal(i.suggestion,null);assert.equal(i.reviewSuggested,true);assert.equal(i.references.length,2);assert.ok(i.references.every(r=>r.preferred===null));assert.deepEqual(i.references.map(r=>r.guidePage),[21,294]);};
test('opening decimal quantity and explicit intact clause receive both guide references without guessing wording',()=>{
 for(const [text,selection]of [['1.5 hours are required.','1.5 hours'],['0.25 percent of the funds shall remain.','0.25 percent'],['.5 kilograms is the maximum.','.5 kilograms'],['1,234.5 hours must be used.','1,234.5 hours'],['0.5% is the rate.','0.5%'],['1.5 kg shall remain.','1.5 kg'],['1.5 Hz is the frequency.','1.5 Hz']]){const d=make(text),before=JSON.stringify(d),[i]=check(d);assert.ok(i,text);assert.equal(i.text,selection);evidence(d,i);assert.equal(JSON.stringify(d),before);if(!text.includes('%'))assert.equal(joint(d).length,1,text);else assert.ok(jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).some(i=>i.text===selection&&i.suggestion==='0.5 percent'));}
});
test('clause witness supports a finite of-noun bridge and labelled sentence without selecting the predicate',()=>{
 for(const text of ['0.25 percent of the available funds shall remain.','(a) 1.5 hours are required.','The first sentence ends. 1.5 hours are required.','1.5 hours of work may be sufficient.']){const d=make(text),[i]=check(d);assert.ok(i,text);evidence(d,i);assert.ok(!i.text.includes('are')&&!i.text.includes('shall'));}
});
test('legal version and budget contents labels cannot supply sentence authority',()=>{
 for(const text of ['Section 1.5 applies.','Article 1.5 applies.','Version 1.5 is available.','1.5. The program shall act.','1.00 Budget Act Citation................................1\n1.50 Intent................................2','1.00 Budget Act Citation.','1.5 hours','1.5 hours to complete the work','1.5 hours of work','1.5 hours that are required shall be used.','1.5 hours if the program is approved shall be used.','The program uses 1.5 hours.'])assert.equal(check(make(text)).length,0,text);
});
test('money review retains ownership while decimal checking protects currency and scale-word expressions',()=>{
 for(const text of ['$1.5 million is available.','1.5 million is available.','1.5 dollars are available.','1.5 billion dollars are available.'])assert.equal(check(make(text)).length,0,text);
 const d=make('$1.5 million is available.'),previous=jointStylisticIssues(d,refs,{includeReviewSuggestions:true,includeDecimalOpeningReview:false}),now=jointStylisticIssues(d,refs,{includeReviewSuggestions:true});assert.ok(previous.some(i=>i.checkId==='lcb-unknown-money-review'));assert.deepEqual(now,previous);
});
test('numeric source boundary guards retain signs exponents fractions ranges malformed groupings and identifiers',()=>{
 for(const text of ['-0.5 hours are required.','- 0.5 hours are required.','+0.5 hours are required.','−0.5 hours are required.','0.5e3 hours are required.','0.5 / 2 hours are required.','1 0.5/2 hours are required.','0.5–1.5 hours are required.','0.5 - 1.5 hours are required.','1,23.5 hours are required.','1.5.5 hours are required.','v1.5 hours are required.','α1.5 hours are required.','1.5hours are required.','1.5 HOURS ARE REQUIRED.'])assert.equal(check(make(text)).length,0,text);
});
test('literal headings tables and source instructions cannot manufacture prose openings',()=>{
 for(const text of ['“1.5 hours are required.”','"1.5 hours are required."',"'1.5 hours are required.'",'‘1.5 hours are required.’','Insert: 1.5 hours are required.','1.5 hours are required................10','CALIFORNIA LEGISLATURE\n1.5 hours are required.\nLEGISLATIVE COUNSEL’S DIGEST\nA bill.'])assert.equal(check(make(text)).length,0,text);
 const d=make('1.5 hours are required.');d.blocks[0].formatting={headerGaps:[1,2]};assert.equal(check(d).length,0);
});
test('each source character in numeral unit bridge or predicate remains protected when struck or excluded',()=>{
 const text='0.25 percent of the available funds shall remain.';for(const property of ['struck','excluded'])for(let at=0;at<text.indexOf('remain')+'remain'.length;at++){const d=make(text);d[property].push({start:at,end:at+1});assert.equal(check(d).length,0,property+' '+at);}
});
test('removing preceding body words or quote delimiters cannot create positive sentence evidence',()=>{
 for(const property of ['struck','excluded']){const d=make('The program needs 1.5 hours are required.'),end=d.text.indexOf('1.5');d[property].push({start:0,end});assert.equal(check(d).length,0,property);for(const quotes of [['“','”'],['"','"'],["'","'"],['‘','’']]){const q=make(quotes[0]+'1.5 hours are required.'+quotes[1]);q[property].push({start:0,end:1});q[property].push({start:q.text.length-1,end:q.text.length});assert.equal(check(q).length,0,property+' '+quotes.join(''));}}
});
test('page and line divisions preserve exact full quantity selection and original clause evidence',()=>{
 for(const pages of [['1.5 kil-','ograms are required.'],['1.5 hours of the avail-','able funds shall remain.'],['1.5','hours are required.']]){const d=makeDocument(pages,'Current',[],[],words),before=JSON.stringify(d),[i]=joint(d);assert.ok(i,pages.join('|'));assert.ok(i.openingClauseText.includes('\n'));if(!pages[0].includes('hours'))assert.ok(i.text.includes('\n'));evidence(d,i);assert.equal(JSON.stringify(d),before);const [standalone]=check(d);evidence(d,standalone);assert.equal(i.start,standalone.start);assert.equal(i.end,standalone.end);}
});
test('reader switch existing finding ownership and missing guides leave established behavior intact',()=>{
 const d=make('1.5 hours are required.');assert.equal(jointStylisticIssues(d,refs).filter(i=>i.checkId==='lcb-decimal-opening-review').length,0);assert.equal(jointStylisticIssues(d,refs,{includeReviewSuggestions:true,includeDecimalOpeningReview:false}).filter(i=>i.checkId==='lcb-decimal-opening-review').length,0);const [i]=check(d);assert.equal(decimalOpeningReviewIssues(d,refs,{existingIssues:[i]}).length,0);assert.equal(decimalOpeningReviewIssues(d,refs,{existingIssues:[{start:i.start,end:i.end,suggestion:'another quantity'}]}).length,0);assert.equal(decimalOpeningReviewIssues(d,{lcb:refs.lcb}).length,0);
});
test('digest opening and enacted bill opening use intact context rather than heading text',()=>{
 for(const text of ['LEGISLATIVE COUNSEL’S DIGEST\n1.5 hours are required.','The people of the State of California do enact as follows:\n1.5 hours are required.']){const d=make(text),[i]=joint(d);assert.ok(i,text);evidence(d,i);}
});
test('function words cannot stand in for quantity nouns and wrapped single-quoted clauses stay literal',()=>{
 for(const text of ['1.5 of are required.','1.5 is shall be used.','1.5 the are required.','1.5 hOurs are required.',"'1.5 hours\nare required.'"]){assert.equal(check(make(text)).length,0,text);assert.equal(joint(make(text)).length,0,text);}
});
test('incomplete copulas unsupported complements and unproven transitive objects cannot establish a complete clause',()=>{
 for(const text of ['1.5 hours are','1.5 hours must be','1.5 hours are elsewhere.','1.5 hours shall provide.','1.5 hours cover.','1.5 hours of the funds are'])assert.equal(check(make(text)).length,0,text);
 for(const property of ['struck','excluded'])for(const text of ['1.5 hours are required.','.5 kilograms is the maximum.','1.5 hours must be used.'])for(let at=0;at<text.length-1;at++){const d=make(text);d[property].push({start:at,end:at+1});assert.equal(check(d).length,0,text+' '+property+' '+at);}
});
test('predicate suffixes cannot become sentence evidence through ASCII boundaries or masking',()=>{
 for(const ending of ['required','remain','the maximum'])for(const suffix of ['α','é','\u0301','9','_role','-by'])for(const property of [null,'struck','excluded']){const text='1.5 hours '+(ending==='remain'?'shall ':ending==='the maximum'?'is ':'are ')+ending,d=make(text+suffix+'.');if(property)d[property].push({start:text.length,end:text.length+suffix.length});assert.equal(check(d).length,0,ending+suffix+' '+property);}
});
