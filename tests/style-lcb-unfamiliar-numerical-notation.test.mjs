import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {reviewStyleIssues} from '../app/style-review.mjs';
import {lcbNumericalUncertaintyIssues} from '../app/style-lcb-numerical-uncertainty.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>makeDocument([text],'Current');
const check=d=>reviewStyleIssues(typeof d==='string'?make(d):d,refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});
const expressions=['2.3E-5','1e−3','−2E+5','.5e-3','2 × 10⁵','2 × 10⁻⁵','2 x 10^5','2*10**-5','eleven point five','one million point five','one point twenty five','point twenty-five','1,00','2..5','2/0','2//3','1 000','12\u202f000','٣','３','٣٫٥','−3','+3','3 - 5','3–5','1.2e+','2²','0x10','0b101','1e--3','3.5e-1.2','1e-3-5','AB2E-5','OTHER-CoV-2','XYZ-4'];
test('unfamiliar figures and complete spoken decimals own their whole source and do not yield component repairs',()=>{
 for(const term of expressions){const text='The sample contains '+term+' nanowidgets.',doc=make(text),before=JSON.stringify(doc),at=doc.text.indexOf(term),found=check(doc),whole=found.filter(i=>i.checkId==='lcb-numerical-uncertainty-review'&&i.start===at&&i.end===at+term.length);assert.equal(whole.length,1,term);assert.equal(whole[0].text,term);assert.equal(whole[0].suggestion,null);assert.ok(!found.some(i=>i.suggestion&&i.start<at+term.length&&i.end>at),'No component suggestion: '+term);assert.ok(!found.some(i=>i.checkId==='lcb-sentence-number-review'),'A single expression is not a numerical relationship: '+term);assert.equal(JSON.stringify(doc),before);}
});
test('ordinary figures legal serials technical identifiers names and nearby quantities retain their roles',()=>{
 for(const term of ['1,000','2.5','−2.5','3/4','2.3','2.3E-5α','https://example.test/2.3E-5','1.2e+3word']){assert.ok(!lcbNumericalUncertaintyIssues(make('The sample contains '+term+' nanowidgets.'),refs).length,term);const d=make('The sample contains '+term+' nanowidgets.'),at=d.text.indexOf(term);if(/[eE]/u.test(term))assert.ok(!check(d).some(i=>i.start<at+term.length&&i.end>at),'An attached token cannot supply a partial question or correction: '+term);}
 for(const text of ['The One Point Five Foundation shall act.','The term “one point twenty five” is literal.','Section 1.2.3 applies.','Section 2/0 applies.','Section 1396r-8 applies.'])assert.ok(!lcbNumericalUncertaintyIssues(make(text),refs).length,text);
 const found=check('The sample contains 2.3E-5 nanowidgets and 2 records. Twenty five delegates act.');
 assert.ok(found.some(i=>i.text==='2'&&i.suggestion==='two'),'A nearby ordinary count is still checked.');
 assert.ok(found.some(i=>i.rule==='6.36'&&i.text==='Twenty five'&&i.suggestion==='Twenty-five'),'A separate GPO compound still receives its own check.');
});
test('every original unfamiliar expression character remains evidence under both removal channels',()=>{
 for(const term of expressions){const doc=make('The sample contains '+term+' nanowidgets.'),at=doc.text.indexOf(term);for(const field of ['struck','excluded'])for(let p=at;p<at+term.length;p++){const changed=structuredClone(doc);changed[field].push({start:p,end:p+1});assert.ok(!lcbNumericalUncertaintyIssues(changed,refs).some(i=>i.start<at+term.length&&i.end>at),field+' '+term+' '+p);}}
 for(const term of ['2.3E-5','one point twenty five','1 000']){const d=make('The sample contains '+term+' nanowidgets.'),at=d.text.indexOf(term);for(const field of ['struck','excluded']){const changed=structuredClone(d);changed[field].push({start:at,end:at+1});assert.ok(!check(changed).some(i=>i.suggestion&&i.start<at+term.length&&i.end>at),'No manufactured component correction: '+field+' '+term);}}
});
test('age and duration triples receive a source-linked whole-role question without inferred hyphens',()=>{
 for(const term of ['three day old','10 year old']){const found=check('The agency shall retain '+term+' records.'),whole=found.find(i=>i.checkId==='lcb-numerical-uncertainty-review'&&i.text===term);assert.ok(whole,term);assert.equal(whole.suggestion,null);assert.ok(whole.references.some(r=>r.guidePage===8));assert.ok(whole.references.some(r=>r.guidePage===22));}
 for(const text of ['The agency shall retain three-day-old records.','The records are three days old.','The term “three day old” is literal.'])assert.ok(!lcbNumericalUncertaintyIssues(make(text),refs).length,text);
});
test('unfamiliar figure table cells use their whole original cell and intact numeric header',()=>{
 const table=(term,header='Quantity')=>{const d=make('District             '+header+'             Unit\nNorth                '+term+'              units');for(const b of d.blocks)b.formatting={headerGaps:[{},{}]};return d;};
 for(const term of ['2.3E-5','2 × 10⁵','1,00','2..5','1 000']){const d=table(term),found=check(d).filter(i=>i.checkId==='lcb-table-expression-review');assert.equal(found.length,1,term);assert.equal(found[0].text,term);assert.equal(found[0].suggestion,null);assert.deepEqual(check(table(term,'Name')).filter(i=>i.checkId==='lcb-table-expression-review'),[]);for(const field of ['struck','excluded']){const changed=structuredClone(d),at=d.text.indexOf('Quantity');changed[field].push({start:at,end:at+1});assert.deepEqual(check(changed).filter(i=>i.checkId==='lcb-table-expression-review'),[]);}}
});
test('whole-expression uncertainty respects Bill Digest Opinion Cover-letter and Resolution rules at sentence openings',()=>{
 for(const type of ['bill','digest','opinion','cover-letter','resolution'])for(const term of ['٣٫٥','2 × 10⁻⁵','1.2e+','−3','Eleven point five']){
  const body=term+' nanowidgets shall be counted.',doc=make(type==='digest'?'LEGISLATIVE COUNSEL’S DIGEST\n'+body+'\nThe people do enact as follows:':type==='resolution'?'Resolved by the Assembly of the State of California,\n'+body:body);if(['opinion','cover-letter'].includes(type))doc.styleDocumentType=type;
  const found=check(doc),at=doc.text.indexOf(term),whole=found.find(i=>i.checkId==='lcb-numerical-uncertainty-review'&&i.start===at&&i.end===at+term.length);assert.ok(whole,type+' '+term);assert.equal(whole.suggestion,null);assert.ok(!found.some(i=>i.suggestion&&i.start<at+term.length&&i.end>at),type+' cannot infer a source-specific replacement');
 }
 for(const term of ['eleven\npoint five','three day\nold']){const doc=make('The agency retains '+term+' records.'),whole=check(doc).find(i=>i.checkId==='lcb-numerical-uncertainty-review'&&i.text===term);assert.ok(whole,'Physical line wrapping preserves whole source: '+term);assert.equal(doc.text.slice(whole.start,whole.end),term);}
 for(const term of ['−2.5','+2.5','−.5','-0.5']){assert.ok(check(term+' units were used.').some(i=>i.checkId==='lcb-numerical-uncertainty-review'&&i.text===term),'A signed decimal opener needs a whole question: '+term);assert.ok(!lcbNumericalUncertaintyIssues(make('The agency used '+term+' units.'),refs).length,'The same body decimal remains compliant: '+term);}
});
