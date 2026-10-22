import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {timePossessiveReviewIssues} from '../app/style-time-possessive-review.mjs';
import {contextualPunctuationIssues} from '../app/style-punctuation.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>makeDocument([text],'Current');
const direct=doc=>timePossessiveReviewIssues(doc,refs);
const joint=doc=>jointStylisticIssues(doc,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-time-possessive-review');

test('complete pursuant-to continuation is not a possible nominal possessive head in direct and production paths',()=>{
 for(const text of ['The agency shall act within 30 days pursuant to Section 2.','The agency shall act within 30 days pursuant to (2) above.','The agency shall act within 30 calendar days pursuant to Section 2.','The agency shall act within three years pursuant to Section 2.']){const d=make(text),saved=JSON.stringify(d);assert.deepEqual(direct(d),[],text);assert.deepEqual(joint(d),[],text);assert.ok(!reviewStyleIssues(d,refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true}).some(i=>i.checkId==='lcb-time-possessive-review'),text);assert.equal(JSON.stringify(d),saved);}
});

test('real nominal uncertainty and existing precise written-notice ownership are preserved',()=>{
 for(const phrase of ['three years service','30 days written notice','one year unfamiliarword','30 days pursuant','30 days pursuantx to Section 2','30 days pursuant tο Section 2']){const d=make('The source requires '+phrase+'.'),a=direct(d),b=joint(d);assert.equal(a.length,1,phrase);assert.equal(b.length,1,phrase);assert.equal(a[0].suggestion,null);assert.equal(d.text.slice(a[0].start,a[0].end),a[0].text);}
 const d=make('The agency requires 30 days notice.'),all=jointStylisticIssues(d,refs,{includeReviewSuggestions:true});assert.ok(contextualPunctuationIssues(d,refs).some(i=>i.suggestion==='30 days’ notice'));assert.ok(all.some(i=>i.suggestion==='30 days’ notice'));assert.ok(!all.some(i=>i.checkId==='lcb-time-possessive-review'));
});

test('every original count, unit, bridge and continuation character remains required through both source-removal channels',()=>{
 const text='The agency shall act within 30 days pursuant to Section 2.',base=make(text),start=text.indexOf('30'),end=text.indexOf(' to ')+3;
 for(const channel of ['struck','excluded'])for(let at=start;at<end;at++){const d=structuredClone(base);d[channel]=[{start:at,end:at+1}];assert.deepEqual(direct(d),[],channel+' '+at);assert.deepEqual(joint(d),[],channel+' '+at);}
 // Removing unknown intervening source must not manufacture a new nominal
 // warning from the resulting prepositional continuation either.
 for(const channel of ['struck','excluded']){const t='The agency acts within 30 days pursuant unknown to Section 2.',d=make(t),at=t.indexOf('unknown');d[channel]=[{start:at,end:at+7}];assert.deepEqual(direct(d),[]);assert.deepEqual(joint(d),[]);}
});

test('literal and table protections, technical endpoints and original running heads remain intact',()=>{
 for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]]){const t='The source says '+open+'30 days pursuant to Section 2'+close+'.',base=make(t);assert.deepEqual(direct(base),[]);for(const channel of ['struck','excluded'])for(const at of [t.indexOf(open),t.lastIndexOf(close)]){const d=structuredClone(base);d[channel]=[{start:at,end:at+1}];assert.deepEqual(direct(d),[]);}}
 const table=make('30 days pursuant to Section 2.');table.blocks[0].formatting={headerGaps:[{},{}]};assert.deepEqual(direct(table),[]);
 for(const text of ['The value is key/30 days pursuant to Section 2.','The value is 30 days pursuantα to Section 2.','The value is 30 days pursuant/key to Section 2.']){const d=make(text);assert.deepEqual(direct(d),[],text);assert.deepEqual(joint(d),[],text);}
 const d=make('The agency shall act within 30 days pursuant\nRUNNING HEAD\nto Section 2.'),head=d.blocks.find(b=>b.text==='RUNNING HEAD');head.ignored=true;head.formatting={headerParts:[{}]};d.excluded.push({start:head.start,end:head.end});assert.deepEqual(direct(d),[]);assert.deepEqual(joint(d),[]);
});
