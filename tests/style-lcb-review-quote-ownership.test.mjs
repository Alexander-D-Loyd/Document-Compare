import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {lcbFreshDefinitionQuoteReviewIssues}from '../app/style-lcb-review-quote-ownership.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const doc=text=>makeDocument([text],'Current'),review=text=>{const d=doc(text);return lcbFreshDefinitionQuoteReviewIssues(d,refs,{existingIssues:jointStylisticIssues(d,refs)});};

test('fresh semicolon and colon definition ownership has full quote spans and no asserted edit',()=>{
 for(const [quote,tail]of [['“Eligible applicant;”','an individual who satisfies this section'],['“Covered entity:”','an agency listed in subdivision'],['"Eligible applicant;"','an individual'],['‘Eligible applicant;’','an individual']]){const text=quote+' means '+tail+'.',found=review(text);assert.equal(found.length,1,text);const [i]=found;assert.equal(i.text,quote);assert.equal(i.suggestion,null);assert.equal(i.confidence,'Review Suggested');assert.equal(text.slice(i.start,i.end),quote);assert.equal(text.slice(i.quoteEvidence.definitionVerb.start,i.quoteEvidence.definitionVerb.end),'means');assert.equal(text.slice(i.quoteEvidence.punctuationStart,i.quoteEvidence.punctuationEnd),quote.at(-2));assert.deepEqual(i.references.map(r=>r.rule),['Punctuation: Quotation Marks','8.138']);assert.ok(i.references.every(r=>r.preferred===null));}
});
test('ordinary positions periods commas questions exclamations and literal strings keep prior methods',()=>{
 for(const text of ['“Eligible applicant”; means an individual.','“Eligible applicant” means an individual.','“Eligible applicant,” means an individual.','“Inc.” means incorporated.','“Who may apply?” means the heading used on the application.','“Apply now!” means the caption used on the application.','“;” means a semicolon character.','“?” means an unknown value.','“Applicant; Provider; Agent;” means the command on the form.','The witness asked, “Who may apply?”','The report uses “eligible applicant”.'])assert.equal(lcbFreshDefinitionQuoteReviewIssues(doc(text),refs).length,0,text);
 assert.ok(jointStylisticIssues(doc('The report uses “eligible applicant”.'),refs).some(i=>i.rule==='Punctuation: Quotation Marks'&&i.suggestion==='.”'));
});
test('title character name code and quoted-material definition descriptions remain protected',()=>{
 for(const noun of ['title','heading','caption','label','legend','command','string','literal text','punctuation character','semicolon','colon','character','symbol','file name','code identifier','key','regular expression','pattern','URL','address','name','term','phrase','words'])assert.equal(lcbFreshDefinitionQuoteReviewIssues(doc('“Eligible applicant;” means the '+noun+' printed on the legacy form.'),refs).length,0,noun);
 for(const value of ['exactly four characters in the database','the exact text in the form','a quoted title of the chapter'])assert.equal(lcbFreshDefinitionQuoteReviewIssues(doc('“Eligible applicant;” means '+value+'.'),refs).length,0,value);
});
test('historical quotation nested literals and amendment directives cannot become fresh definitions',()=>{
 for(const text of ['The previous statute read, “Eligible applicant; means an individual.”','The previous statute uses “Eligible applicant;” means an individual.','The previous statute quoted the term “Eligible applicant;” means an individual.','Existing law defines “Eligible applicant;” means an individual.','The report reads: “Eligible applicant;” means an individual.','Insert the words “Eligible applicant;” means an individual.','Delete the following text: “Eligible applicant;” means an individual.','The witness said, “The term ‘Eligible applicant;’ means an individual.”','The witness said, “\"Eligible applicant;\" means an individual.”'])assert.equal(lcbFreshDefinitionQuoteReviewIssues(doc(text),refs).length,0,text);
});
test('selected alternative defining predicates retain intact full-source evidence',()=>{
 for(const verb of ['shall mean','is defined as']){const text='“Participant;” '+verb+' an individual who registers.',[i]=review(text);assert.ok(i,text);assert.equal(i.text,'“Participant;”');assert.equal(text.slice(i.quoteEvidence.definitionVerb.start,i.quoteEvidence.definitionVerb.end),verb);assert.equal(i.suggestion,null);for(const token of verb.split(' ')){const d=doc(text),start=d.text.indexOf(token);d.struck=[{start,end:start+token.length}];assert.equal(lcbFreshDefinitionQuoteReviewIssues(d,refs).length,0,token);}}
});
test('known source margins preserve complete quotes and every defining word is intact evidence',()=>{
 const text='line 1 “Eligible\nline 2 applicant;” means an individual who satisfies this section.',d=doc(text),before=JSON.stringify(d),[i]=lcbFreshDefinitionQuoteReviewIssues(d,refs);assert.equal(i.text,'“Eligible\nline 2 applicant;”');assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(JSON.stringify(d),before);
 const plain='“Eligible applicant;” means an individual who satisfies this section.';
 for(const token of ['Eligible','applicant',';','”','means','individual'])for(const property of ['struck','excluded']){const x=doc(plain),start=x.text.indexOf(token);x[property]=[{start,end:start+token.length}];assert.equal(lcbFreshDefinitionQuoteReviewIssues(x,refs).length,0,property+' '+token);}
 for(const phrase of ['“Participant;” means an individual who registers.','“Participant;” means an agency that applies.'])for(const property of ['struck','excluded']){const x=doc(phrase),last=phrase.includes('registers')?'registers':'applies',start=x.text.indexOf(last);x[property]=[{start,end:start+last.length}];assert.equal(lcbFreshDefinitionQuoteReviewIssues(x,refs).length,0,property+' terminal '+last);}
});
test('headings table rows unknown exclusions and complete Unicode predicate boundaries are protected',()=>{
 for(const text of ['“Eligible applicant;” means an individual................30','“Eligible applicant;” means an individual\nLEGISLATIVE COUNSEL’S DIGEST\nThe bill applies.','“Eligible applicant;” meansα an individual.','“Eligible applicant;” means an individualα.','α“Eligible applicant;” means an individual.','“Eligible applicant;” means an individ-\nual.'])assert.equal(lcbFreshDefinitionQuoteReviewIssues(doc(text),refs).length,0,text);
 const d=doc('“Eligible applicant;” means an individual.'),start=d.text.indexOf(' an ');d.excluded.push({start,end:start+4});assert.equal(lcbFreshDefinitionQuoteReviewIssues(d,refs).length,0);
});
test('existing precise and conflicting findings retain quote ownership precedence',()=>{
 const d=doc('“Eligible applicant;” means an individual.');for(const old of [{start:10,end:20,suggestion:'replacement'},{start:0,end:21,conflict:true}])assert.equal(lcbFreshDefinitionQuoteReviewIssues(d,refs,{existingIssues:[old]}).length,0);
});
test('recognized quoted-word page divisions preserve both full quote and all evidence offsets',()=>{
 const d=makeDocument(['“Eligible applic-','AB 192 — 2 —\nline 1 ant;” means an individ-\nline 2 ual who satisfies this section.'],'Current',[],[],new Set(['applicant','individual'])),head=d.blocks.find(b=>b.text==='AB 192 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};
 const before=JSON.stringify(d),[i]=lcbFreshDefinitionQuoteReviewIssues(d,refs);assert.ok(i);assert.equal(i.text,'“Eligible applic-\nAB 192 — 2 —\nline 1 ant;”');assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(d.text.slice(i.quoteEvidence.punctuationStart,i.quoteEvidence.punctuationEnd),';');assert.equal(d.text.slice(i.quoteEvidence.definitionVerb.start,i.quoteEvidence.definitionVerb.end),'means');assert.ok(d.text.slice(i.quoteEvidence.evidenceStart,i.quoteEvidence.evidenceEnd).includes('individ-\nline 2 ual'));assert.equal(JSON.stringify(d),before);
 head.runningHead=false;head.layoutLabel=false;head.formatting={};assert.equal(lcbFreshDefinitionQuoteReviewIssues(d,refs).length,0);
});
test('long intact definitions do not depend on the arbitrary initial description word count',()=>{
 const text='“participant;” means an individual who is a resident of the state and is registered with the department.',[i]=lcbFreshDefinitionQuoteReviewIssues(doc(text),refs);assert.ok(i);assert.ok(i.quoteEvidence.description.endsWith('the department'));assert.equal(i.quoteEvidence.evidenceEnd,text.length);assert.equal(i.text,'“participant;”');assert.equal(i.suggestion,null);
 const d=doc(text),start=d.text.lastIndexOf('department');d.excluded.push({start,end:start+'department'.length});assert.equal(lcbFreshDefinitionQuoteReviewIssues(d,refs).length,0);
});
