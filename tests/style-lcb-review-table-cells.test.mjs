import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {lcbTableCellIssues}from '../app/style-lcb-review-table-cells.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const table=(text,rows)=>{const d=makeDocument([text],'Current');for(const index of rows){const b=d.blocks[index];b.formatting={...(b.formatting||{}),headerGaps:[{start:18,end:20},{start:35,end:37}]};}return d;};
const simple=issues=>issues.map(i=>[i.text,i.suggestion]);

test('Budget Act item leader amounts work without an Item Amount running heading',()=>{
 const d=makeDocument(['Budget Act of 2024.\n3900-101-3122—For local assistance, State Air Resources\nBoard, payable from the Enhanced Fleet Modernization\nSubaccount, High Polluter Repair or Removal Account.... nineteen million eight hundred thousand\nSchedule:\n(1) 3500-Mobile Source................... nineteen million eight hundred thousand'],'Current');
 assert.deepEqual(simple(lcbTableCellIssues(d,refs)),[['nineteen million eight hundred thousand','19,800,000'],['nineteen million eight hundred thousand','19,800,000']]);
});

test('explicit numeric table columns check complete bare counts and quantity units',()=>{
 const text='The following table applies:\nCounty             Permits             Duration\nAlpine             three               two years\nMerced             four                3 years',d=table(text,[1,2,3]);
 const found=lcbTableCellIssues(d,refs);assert.deepEqual(simple(found),[['three','3'],['two','2'],['four','4']]);
 for(const issue of found){assert.equal(issue.reviewSuggested,false);assert.equal(issue.context,'Table');assert.equal(d.text.slice(issue.start,issue.end),issue.text);assert.deepEqual(issue.references.map(r=>r.guideId),['lcb','gpo']);}
});

test('literal columns and source-labelled names stay clear',()=>{
 const d=table('The following table applies:\nProvider             Program             Amount\nThree Rivers         First Five          3\nOne Nation           Fourth Avenue       4',[1,2,3]);
 assert.equal(lcbTableCellIssues(d,refs).length,0);
 const counts=table('The following table applies:\nProvider             Program             Amount\nThree Rivers         First Five          Three',[1,2]);assert.deepEqual(simple(lcbTableCellIssues(counts,refs)),[['Three','3']]);
});

test('unknown lower-case numeric cell roles receive no invented replacement',()=>{
 const d=table('The following table applies:\nCounty             Alpha             Beta\nAlpine             three             two',[1,2]);
 const found=lcbTableCellIssues(d,refs);assert.deepEqual(simple(found),[['three',null],['two',null]]);assert.ok(found.every(i=>i.reviewSuggested&&i.checkId==='lcb-table-cell-review'));
 const capitalized=table('County             Alpha             Beta\nAlpine             Three             Two Years',[0,1]);assert.deepEqual(simple(lcbTableCellIssues(capitalized,refs)),[['Three',null],['Two',null]]);
});

test('geometry alone cannot create checks without recoverable source cells',()=>{
 const d=table('The following table applies:\nCounty Permits Duration\nAlpine three two years',[1,2]);assert.equal(lcbTableCellIssues(d,refs).length,0);
});

test('single-space reader cells can use intact geometric gaps',()=>{
 const d=makeDocument(['County Permits Duration\nAlpine three two years'],'Current');
 for(const b of d.blocks){const starts=[b.text.indexOf(' '),b.text.indexOf(' ',b.text.indexOf(' ')+1)];b.formatting={headerGaps:starts.map(start=>({start,end:start+1}))};}
 assert.deepEqual(simple(lcbTableCellIssues(d,refs)),[['three','3'],['two','2']]);
});

test('table-adjacent operative prose remains on its existing checking path',()=>{
 const d=makeDocument(['Budget Act of 2024.\nItem Amount\nFor support of Senate............. 19,800,000\nProvisions:\n1. The agency shall provide three permits to each applicant.'],'Current');assert.equal(lcbTableCellIssues(d,refs).length,0);
});

test('source strikes, unknown exclusions and numeric header damage protect the complete quantity',()=>{
 const text='County             Permits             Duration\nAlpine             three               two years';
 for(const fragment of ['three','Permits','Duration']){const d=table(text,[0,1]),start=d.text.indexOf(fragment);d.struck=[{start,end:start+fragment.length}];const found=lcbTableCellIssues(d,refs);assert.equal(found.some(i=>i.text==='three'&&!i.reviewSuggested),false,fragment);}
 const d=makeDocument(['Budget Act of 2024.\nItem Amount\nFor support of Senate............. three hundred'],'Current'),start=d.text.indexOf('hundred');d.excluded.push({start,end:start+7});assert.equal(lcbTableCellIssues(d,refs).length,0);
});

test('canonical compound cardinals stay whole and malformed complete quantities stay protected',()=>{
 const d=table('County             Permits             Duration\nAlpine             one hundred and two               twenty-one years',[0,1]);assert.deepEqual(simple(lcbTableCellIssues(d,refs)),[['one hundred and two','102'],['twenty-one','21']]);
 for(const amount of ['one two','three hundred hundred','one hundred and and two','None','threeα','minus three']){const x=makeDocument(['Budget Act of 2024.\nItem Amount\nFor support of Senate............. '+amount],'Current');assert.equal(lcbTableCellIssues(x,refs).length,0,amount);}
});

test('source quotes and partial numeric-expression boundaries remain protected',()=>{
 for(const cell of ['“three”','three point five','three-year-old','three/four']){const d=table('County             Permits             Duration\nAlpine             '+cell+'               2 years',[0,1]);assert.equal(lcbTableCellIssues(d,refs).length,0,cell);}
});

test('quoted or damaged Budget Act and item witnesses cannot establish precise amounts',()=>{
 const d=makeDocument(['The term “Budget Act of 2024” is quoted.\n3900-101-3122—For support of Senate............. three'],'Current');const found=lcbTableCellIssues(d,refs);assert.deepEqual(simple(found),[['three',null]]);
 const x=makeDocument(['Budget Act of 2024.\n3900-101-3122—For support of Senate............. three'],'Current'),start=x.text.indexOf('3122');x.struck=[{start,end:start+4}];assert.equal(lcbTableCellIssues(x,refs).some(i=>!i.reviewSuggested),false);
});

test('existing precise table findings retain ownership',()=>{
 const d=makeDocument(['Budget Act of 2024.\nItem Amount\nFor support of Senate............. three'],'Current'),start=d.text.indexOf('three');assert.equal(lcbTableCellIssues(d,refs,{existingIssues:[{start,end:start+5,checkId:'table-figures'}]}).length,0);
});

test('complete coordinated table quantities preserve every canonical number and connector',()=>{
 for(const [cell,expected]of [['three or four',[['three','3'],['four','4']]],['three to five',[['three','3'],['five','5']]],['two through seven',[['two','2'],['seven','7']]],['one, two, and three',[['one','1'],['two','2'],['three','3']]],['one hundred and two or three hundred',[['one hundred and two','102'],['three hundred','300']]]]){const d=table('District             Quantity             Unit\nNorth                '+cell+'              years',[0,1]);assert.deepEqual(simple(lcbTableCellIssues(d,refs)),expected,cell);}
 const d=table('District             Quantity             Unit\nNorth                three or four              years',[0,1]),start=d.text.indexOf(' or ');d.excluded.push({start,end:start+4});assert.equal(lcbTableCellIssues(d,refs).length,0);
 for(const cell of ['three four','three and','and three','one hundred and and two','three point four']){const x=table('District             Quantity             Unit\nNorth                '+cell+'              years',[0,1]);assert.equal(lcbTableCellIssues(x,refs).length,0,cell);}
});

test('mixed written/figure table groups retain all existing complete figures',()=>{
 for(const [cell,expected]of [['three or 4',[['three','3']]],['3 to nine',[['nine','9']]],['one hundred and three or 4',[['one hundred and three','103']]],['one, 2, or three',[['one','1'],['three','3']]],['three to 1,000',[['three','3']]],['three, four, or 5',[['three','3'],['four','4']]]]){const d=table('District             Quantity             Unit\nNorth                '+cell+'              years',[0,1]);assert.deepEqual(simple(lcbTableCellIssues(d,refs)),expected,cell);}
 for(const cell of ['three or 1,00','3 to nineα','3 to one two','3/4 to nine']){const x=table('District             Quantity             Unit\nNorth                '+cell+'              years',[0,1]);assert.equal(lcbTableCellIssues(x,refs).length,0,cell);}
});

test('data values resembling headers cannot redefine established literal-column roles',()=>{
 const d=table('Program             Name             Amount\nTotal               Days             One\nOne                 Two              three',[0,1,2]);
 const found=lcbTableCellIssues(d,refs);assert.deepEqual(simple(found),[['One','1'],['three','3']]);assert.ok(found.every(i=>i.start>d.blocks[1].start));
});

test('unfamiliar units in numeric columns have an explicit reader-review method',()=>{
 for(const cell of ['three permits','two pages','five kilograms','nine inches','four applications']){const d=table('District             Quantity             Unit\nNorth                '+cell+'              units',[0,1]),found=lcbTableCellIssues(d,refs);assert.equal(found.length,1,cell);assert.equal(found[0].suggestion,null);assert.equal(found[0].reviewSuggested,true);assert.equal(found[0].text,cell.split(' ')[0]);}
 const x=table('Program             Name             Amount\nThree Rivers        Two Pages        four',[0,1]);assert.deepEqual(simple(lcbTableCellIssues(x,refs)),[['four','4']]);
});
