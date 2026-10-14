import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {lcbInclusiveRangeIssues} from '../app/style-lcb-inclusive-ranges.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>lcbInclusiveRangeIssues(makeDocument([text],'Current'),refs);
test('explicit numeric inclusive references compare only source-printed commas',()=>{
 for(const [text,wanted] of [['Sections 123 to 130 inclusive shall apply.','Sections 123 to 130, inclusive,'],['See Sections 123 to 130, inclusive shall apply.','Sections 123 to 130, inclusive,'],['See Sections 123 to 130 inclusive, of the Code.','Sections 123 to 130, inclusive,'],['See Sections 123 to 130 inclusive.','Sections 123 to 130, inclusive'],['Pupils in grades 1 to 6 inclusive attend.','grades 1 to 6, inclusive,'],['This applies to kindergarten and grades 1 to 12 inclusive.','grades 1 to 12, inclusive'],['See Sections 000123.50 to 999999999999999999999999.60 inclusive.','Sections 000123.50 to 999999999999999999999999.60, inclusive']]){
  const doc=makeDocument([text],'Current'),before=JSON.stringify(doc),issues=lcbInclusiveRangeIssues(doc,refs);assert.equal(issues.length,1,text);assert.equal(issues[0].suggestion,wanted);assert.equal(doc.text.slice(issues[0].start,issues[0].end),issues[0].text);assert.equal(issues[0].guideId,'lcb');assert.equal(issues[0].guidePage,22);assert.equal(JSON.stringify(doc),before);
 }
});
test('printed compliant examples and unestablished range meanings stay quiet',()=>{
 for(const text of ['See Sections 123 to 130, inclusive, of the Code.','See Sections 123 to 130, inclusive.','Pupils in grades 1 to 6, inclusive, attend.','See Sections 123 to 130.','See Sections 123 and 130 inclusive.','See Section 123 to 130 inclusive.','See Sections one to four inclusive.','See Sections 123 through 130 inclusive.','Items 1 to 6 inclusive shall apply.','Pupils in grades 1α to 6 inclusive attend.','See Sections 123 to 130α inclusive.','See Sections 123 to 130 inclusiveα.','See Sections 123 to 130 Inclusive Act.'])assert.equal(check(text).length,0,text);
});
test('quoted and bill-local quoted ranges, literal titles and actual table geometry remain protected',()=>{
 assert.equal(check('The term means “Sections 123 to 130 inclusive”.').length,0);
 assert.equal(check('“Sections 123 to 130 inclusive” means a range. See Sections 123 to 130 inclusive.').length,0);
 const doc=makeDocument(['See Sections 123 to 130 inclusive.'],'Current');doc.blocks[0].formatting={headerGaps:[1,2]};assert.equal(lcbInclusiveRangeIssues(doc,refs).length,0);
 assert.equal(check('Sections 123 to 130 inclusive\nLEGISLATIVE COUNSEL’S DIGEST\nA program.').length,0);
});
test('missing or struck complete range components cannot manufacture an inclusive reference',()=>{
 const text='See Sections 123 to 130 inclusive shall apply.';
 for(const word of ['Sections','123','to','130','inclusive','shall'])for(const field of ['struck','excluded']){const doc=makeDocument([text],'Current'),start=doc.text.indexOf(word);doc[field].push({start,end:start+word.length});assert.equal(lcbInclusiveRangeIssues(doc,refs).length,0,word+' '+field);}
 for(const field of ['struck','excluded']){const doc=makeDocument(['See Sections 123 not to 130 inclusive.'],'Current'),start=doc.text.indexOf('not');doc[field].push({start,end:start+3});assert.equal(lcbInclusiveRangeIssues(doc,refs).length,0);}
});
test('line and page divisions preserve exact physical ranges and numeric text',()=>{
 const doc=makeDocument(['line 1 See Sections 123 to','line 1 130 inclusive shall apply.'],'Current'),before=JSON.stringify(doc),issues=lcbInclusiveRangeIssues(doc,refs);assert.equal(issues.length,1);assert.equal(issues[0].suggestion,'Sections 123 to 130, inclusive,');assert.equal(doc.text.slice(issues[0].start,issues[0].end),issues[0].text);assert.equal(JSON.stringify(doc),before);
});
test('production range corrections keep source citations and separate unrelated GPO findings',()=>{
 const doc=makeDocument(['See sections 123 to 130 inclusive. The check up is required.'],'Current'),issues=jointStylisticIssues(doc,refs),range=issues.find(i=>i.checkId==='lcb-inclusive-range');assert.ok(range);assert.equal(range.suggestion,'Sections 123 to 130, inclusive');assert.equal(issues.filter(i=>i.start<range.end&&i.end>range.start).length,1);assert.ok(range.references.some(r=>r.guideId==='lcb'&&r.guidePage===22&&r.sourcePassage.text.includes('inclusive')));assert.ok(issues.some(i=>i.suggestion==='checkup'&&i.guideId==='gpo'));
});
