import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{makeDocument}from '../app/core.mjs';import{lcbListedServiceNounIssues,restoreListedServiceEvidence,LCB_LISTED_SERVICE_NOUN_SCOPE}from '../app/style-lcb-listed-service-noun.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))},make=body=>makeDocument(['The people do enact as follows:\n'+body],'Current'),check=doc=>lcbListedServiceNounIssues(doc,refs);
test('the exact listed service noun preserves the prefix hyphen and open final component',()=>{
 assert.ok(refs.lcb.pages[11].lexicalEntries.includes('non-civil service'));assert.ok(refs.lcb.pages[11].lexicalEntries.includes('non-civil-service (u.m.)'));
 for(const alias of ['non-civil-service','noncivil service','non civil service','non civil-service','noncivilservice','non civilservice'])for(const body of ['The applicant works in '+alias+'.','The '+alias+' is required.']){const doc=make(body),before=JSON.stringify(doc),issues=check(doc);assert.equal(issues.length,1,body);const i=issues[0];assert.equal(i.text,alias);assert.equal(i.suggestion,'non-civil service');assert.equal(i.guidePage,12);assert.equal(doc.text.slice(i.start,i.end),alias);assert.equal(JSON.stringify(doc),before);}
 assert.match(LCB_LISTED_SERVICE_NOUN_SCOPE,/no generic non-prefix/i);
});
test('accepted noun and modifier forms and ambiguous roles remain quiet',()=>{
 for(const body of ['The applicant works in non-civil service.','The non-civil service is required.','The non-civil-service employee is eligible.','The non-civil-service textbook is required.','The applicant works in non-civil-service employment.','The agency discusses non-civil-service.','The agency shall non-civil-service.','The non-civil-services are required.'])assert.equal(check(make(body)).length,0,body);
});
test('every cue source component and connector is required original evidence',()=>{
 for(const phrase of ['in non-civil-service.','The noncivil service is']){const doc=make(phrase.startsWith('in')?'The applicant works '+phrase:phrase+' required.'),start=doc.text.indexOf(phrase),end=start+phrase.length;assert.equal(check(doc).length,1);for(const field of ['struck','excluded'])for(let at=start;at<end;at++){if(doc.text[at]==='.')continue;const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});assert.equal(check(damaged).length,0,field+' '+phrase+' '+at);}}
});
test('literal enclosures original quote damage and quoted bill-local forms remain protected',()=>{
 for(const [open,close]of [['“','”'],['"','"'],["'","'"]]){const doc=make('The instruction states '+open+'The noncivil service is required.'+close);assert.equal(check(doc).length,0);for(const field of ['struck','excluded'])for(const at of [doc.text.indexOf(open),doc.text.lastIndexOf(close)]){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});assert.equal(check(damaged).length,0,field+' '+open);}}
 assert.equal(check(make('“non-civil-service” means the service. The applicant works in non-civil-service.')).length,0);assert.equal(check(make('The applicant works in non-civil-service.')).length,1);
});
test('titles technical identifiers tables headings original dashes and Unicode fragments are protected',()=>{
 for(const body of ['The Non Civil Service Act applies.','The noncivil service Act applies.','The applicant works in non-civil-service/key.','The applicant works in non-civil-service.2.','The noncivil service’s role is required.','The noncivil serviceα is required.','The noncivil service\u0301 is required.','The applicant works 𐐀in non-civil-service.','The applicant works in non—civil-service.','The applicant works in non–civil-service.'])assert.equal(check(make(body)).length,0,body);
 for(const field of ['struck','excluded']){const doc=make('The noncivil service Act applies.'),at=doc.text.indexOf('Act');doc[field].push({start:at,end:at+3});assert.equal(check(doc).length,0,field);}
 const doc=make('The applicant works in non-civil-service.');doc.blocks.at(-1).formatting={headerGaps:[{},{}]};assert.equal(check(doc).length,0);
 assert.equal(check(makeDocument(['The noncivil service is required.\nThe people do enact as follows:\nThe program applies.'],'Current')).length,0);
});
test('existing owner protection and source margins preserve exact selections',()=>{
 const doc=make('The noncivil service is required.'),i=check(doc)[0];assert.equal(lcbListedServiceNounIssues(doc,refs,{existingIssues:[{start:i.start,end:i.end}]}).length,0);
 const paged=makeDocument(['line 1 The people do enact as follows:\nline 2 The applicant works in noncivil','line 1 service.'],'Current'),before=JSON.stringify(paged),issue=check(paged)[0];assert.ok(issue);assert.match(issue.text,/noncivil\nline 1 service/u);const e=restoreListedServiceEvidence(issue.listedServiceEvidence,n=>n,paged.text);assert.equal(e.phrase.text,paged.text.slice(issue.start,issue.end));assert.equal(e.sourceText,paged.text.slice(e.start,e.end));assert.equal(JSON.stringify(paged),before);
});
