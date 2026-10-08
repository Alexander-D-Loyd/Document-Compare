import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ocrDictionary,repairOcrSpacing,repairOcrDirective,repairOcrInstructions,isOcrStyle} from '../app/ocr-text.mjs';
import {makeDocument} from '../app/core.mjs';
import {verifyAmendments,amendmentDisplays} from '../app/amendments.mjs';
const words=ocrDictionary(fs.readFileSync(new URL('../app/vendor/en_US/index.dic',import.meta.url),'utf8'));
test('OCR word joins repair uniquely while dictionary words, abbreviations and ambiguous splits remain literal',()=>{
 assert.equal(repairOcrSpacing('underthis subdivisionis andafter forth forest California',words),'under this subdivision is and after forth forest California');
 assert.equal(repairOcrSpacing('underthis',new Set(['under','this','underthis'])),'underthis');
 assert.equal(repairOcrSpacing('therein',new Set(['the','rein','there','in'])),'therein');
 assert.ok(isOcrStyle({fontFamily:'sans-serif',ascent:1,descent:-.000488}));
 assert.ok(!isOcrStyle({fontFamily:'serif',ascent:.8,descent:-.2}));
});
test('OCR repairs directive delimiters and line references without changing insertion payload or apostrophes',()=>{
 const raw='Amendment1\nOnpage1,in line1, strike out “do all of’, strike out lines | to 4, inclusive, in line5, strike out “(2) “Entity”and insert:\nCounsel’s | data “quoted”';
 const fixed=repairOcrInstructions(raw);
 assert.ok(fixed.includes('On page 1, in line 1, strike out “do all of”, strike out lines 1 to 4'));
 assert.ok(fixed.includes('strike out “(2) “Entity”” and insert:'));
 assert.ok(fixed.endsWith('Counsel’s | data “quoted”'));
 assert.equal(repairOcrDirective('after “Counsel’s opinion” insert:'),'after “Counsel’s opinion” insert:');
});
test('nested quoted definitions consume the entire deletion and still detect genuine missing wording or punctuation',()=>{
 const previous=makeDocument(['line 1 Before both definitions.\nline 2 Remove this.\nline 3 (2) “Load-serving entity” means entities.'],'previous');
 const raw='Amendment1\nOnpage1,in line1, strike out “both definitions”, strike out line 2, in line3, strike out “(2) “Load-serving entity”and insert:\n“load-serving entity”';
 const instruction=repairOcrInstructions(raw);
 const correct=makeDocument(['line 1 Before .\nline 2 “load-serving entity” means entities.'],'current');
 assert.equal(verifyAmendments(instruction,previous,correct)[0].status,'implemented');
 for(const body of ['Before .\nline 2 “load-serving” means entities.','Before .\nline 2 “load-serving entity means entities.'])
  assert.equal(verifyAmendments(instruction,previous,makeDocument(['line 1 '+body],'wrong'))[0].status,'incorrect');
});
test('instruction display spacing repairs preserve strikeout ranges',()=>{
 const raw='Amendment1\nOnpage1,in line1, after “old”insert:\nold new';
 const start=raw.indexOf('“old”')+1,doc=makeDocument([raw],'instructions',[[{start,end:start+3}]]);doc.ocr=true;
 const display=amendmentDisplays(doc)[0],range=display.directive.strikes[0];
 assert.equal(display.directive.text,'On page 1, in line 1, after “old” insert:');
 assert.equal(display.directive.text.slice(range.start,range.end),'old');
 assert.equal(display.payload.text,'old new');
});

