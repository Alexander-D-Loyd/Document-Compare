import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {styleContext} from '../app/style-context.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const options={includeReviewSuggestions:true,includeCompleteLcbReview:true};

test('one bill automatically applies different printed numeral provisions to Digest and bill text',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 224\nLEGISLATIVE COUNSEL’S DIGEST\nThis bill would require two reports.','The people of the State of California do enact as follows:\nline 1 SECTION 1. The office shall file 2 reports.'],'Current'),before=JSON.stringify(doc),ctx=styleContext(doc);
 assert.equal(ctx.at(0),'Heading');assert.equal(ctx.at(doc.text.indexOf('two reports')),'Digest');assert.equal(ctx.at(doc.text.indexOf('2 reports')),'Bill');
 const found=reviewStyleIssues(doc,refs,options).filter(i=>i.checkId==='numerals');
 assert.deepEqual(found.map(i=>[i.text,i.suggestion,i.context,i.rule]),[['two','2','Digest','Numerals: Digest, item 1'],['2','two','Bill','Numerals: Bill, item 1']]);
 for(const i of found)assert.equal(doc.text.slice(i.start,i.end),i.text);assert.equal(JSON.stringify(doc),before);
});
test('automatic sections preserve compliant opposites and do not inherit a previous document context',()=>{
 const digest=makeDocument(['LEGISLATIVE COUNSEL\'S DIGEST\nThis bill would require 2 reports.'],'Current');
 const body=makeDocument(['The people of the State of California do enact as follows:\nline 1 SECTION 1. The office shall file two reports.'],'Replacement');
 for(const doc of [digest,body,digest])assert.ok(!reviewStyleIssues(doc,refs,options).some(i=>i.checkId==='numerals'));
 assert.equal(styleContext(digest).at(digest.text.indexOf('2 reports')),'Digest');assert.equal(styleContext(body).at(body.text.indexOf('two reports')),'Bill');
});
test('ordinary bill prose cannot enable standalone opinion or cover-letter exceptions',()=>{
 const doc=makeDocument(['The people do enact as follows:\nline 1 An opinion and cover letter shall address ten dollars and Section 123 et seq.'],'Opinion cover letter');
 const found=reviewStyleIssues(doc,refs,options);assert.ok(!found.some(i=>i.checkId==='lcb-opinion-forms'||i.checkId?.startsWith('california-citation-')));
});
