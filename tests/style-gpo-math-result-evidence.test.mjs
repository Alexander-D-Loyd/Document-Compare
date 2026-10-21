import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {mathResultIssues} from '../app/style-math-result-evidence.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const doc=text=>makeDocument([text],'Current');
function check(input,wanted=[]){const d=typeof input==='string'?doc(input):input,before=JSON.stringify(d);for(const run of [mathResultIssues,jointStylisticIssues]){const issues=run(d,refs).filter(i=>i.rule==='10.3');assert.deepEqual(issues.map(i=>i.suggestion),wanted,d.text);for(const i of issues){assert.equal(d.text.slice(i.start,i.end),i.text);assert.match(d.text.slice(i.evidenceStart,i.evidenceEnd),/result/iu);assert.equal(i.guidePage,277);}}assert.equal(JSON.stringify(d),before);return d;}
test('the printed result cue closes only two complete numeric multiplication operands',()=>{
 assert.match(refs.gpo.pages[276].text,/The result is 4×4/u);
 for(const [text,wanted]of [['The result is 4 × 4.','4×4'],['The result is 1,000.00 × 2.00.','1,000.00×2.00'],['The result is 9007199254740993 × 12345678901234567890.','9007199254740993×12345678901234567890']])check(text,[wanted]);
});
test('correct multiplication and unsupported result grammar remain manual',()=>{
 for(const text of ['The result is 4×4.','The result is A × B.','The result is 4 + 4.','The result is 4 × 4 × 4.','A result is 4 × 4.','The result is 4 × 4)/2.','The result is −4 × 4.','The result is 1e3 × 4.','The result is 1/3 × 4.','The result is 01 × 4.','The result is 1,00 × 4.','The result is 4 × 1,00.'])check(text);
});
test('every original result-cue operand operator and bridge character is required',()=>{
 const text='The result is 4 × 4.',base=doc(text);for(const field of ['struck','excluded'])for(let at=0;at<text.length-1;at++){const d=structuredClone(base);d[field].push({start:at,end:at+1});check(d);}
});
test('original technical endpoints, longer expressions and masked continuations stay protected',()=>{
 for(const text of ['Use key/The result is 4 × 4.','The result is 4 × 4é.','The result is 4 × 4^2.','The result is 4 × 4 + 2.','The result is 4 × 4.2.3.'])check(text);
 for(const [text,part]of [['éThe result is 4 × 4.','é'],['The result is 4 × 4 + 2.','+ 2'],['The result is 4 × 4é.','é'],['The result is 4 × 4.2.3.','2.3']])for(const field of ['struck','excluded']){const d=doc(text),at=text.indexOf(part);d[field].push({start:at,end:at+part.length});check(d);}
});
test('original literal and named evidence survives masking and magnification/breeding stays separate',()=>{
 for(const text of ['The text is “The result is 4 × 4”.','The term “4 × 4” is defined. The result is 4 × 4.','The result is 4 × 4 Program.','The result is 4 × 4, Inc., is hereby established.','For magnification the result is 4 × 4.','The result is 4 × 4 (magnification).','The result is 4 × 4 used in plant breeding.'])check(text);
 for(const field of ['struck','excluded'])for(const [text,part]of [['The result is 4 × 4 Program.','Program'],['The result is 4 × 4, Inc., is hereby established.','Inc.'],['The result is 4 × 4 (magnification).','magnification']]){const d=doc(text),at=text.indexOf(part);d[field].push({start:at,end:at+part.length});check(d);}
});
test('table evidence remains manual; trusted interior page heads keep complete physical selections',()=>{
 const table=doc('The result is 4 × 4.');table.blocks[0].formatting={headerGaps:[{},{}]};check(table);
 const d=makeDocument(['The result is 4 ×','AB 1 — 2 —\n4.'],'Current'),head=d.blocks.find(b=>b.ignored);head.formatting={headerParts:[{text:head.text}]};check(d,['4×4']);head.formatting={};head.runningHead=false;head.layoutLabel=false;check(d);
});
