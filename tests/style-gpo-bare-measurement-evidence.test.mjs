import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {measurementIssues} from '../app/style-measures.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const doc=text=>makeDocument([text],'Current');
const selected=issues=>issues.filter(i=>i.checkId==='gpo-measures'&&['9.53','9.56'].includes(i.rule));
function check(input,wanted=[]){const d=typeof input==='string'?doc(input):input,before=JSON.stringify(d);for(const run of [measurementIssues,jointStylisticIssues]){const issues=selected(run(d,refs));assert.deepEqual(issues.map(i=>i.suggestion),wanted,d.text);for(const i of issues)assert.equal(d.text.slice(i.start,i.end),i.text);}assert.equal(JSON.stringify(d),before);return d;}

test('complete plain and grouped bare metric quantities preserve all source digits',()=>{
 for(const [a,b]of [['25kg','25 kg'],['30 kgs','30 kg'],['1,003kg','1,003 kg'],['1,000.000001kgs','1,000.000001 kg'],['9007199254740993.000kg','9007199254740993.000 kg'],['100°C','100 °C'],['1,000.00° F','1,000.00 °F']])check('Use '+a+'.',[b]);
 check('Use 25kg, 30kgs, and 40MWs.',['25 kg','30 kg','40 MW']);
});
test('scientific fractional signed malformed and Unicode quantities never yield fragment edits',()=>{
 for(const prefix of ['1e+','1e+ ','1 / ','− ','+ ','1 . ','1: ','é','x_','1,00,','1.2.','1 ','1½ '])for(const form of ['3kg','3kgs','30°C'])check('Use '+prefix+form+'.');
 for(const text of ['Use 25kg/path.','Use 25kg_x.','Use 25kg^2.','Use 25kg × 3.','Use 25kg - 3.','Use 25kg.3.','Use 25kgé.','Use 25kg\u0301.'])check(text);
});
test('complete original quantity, unit and bridge characters are required',()=>{
 for(const text of ['Use 25 kgs.','Use 25kg.','Use 100° F.']){const base=doc(text),start=text.search(/\d/u),end=text.length-1;for(const field of ['struck','excluded'])for(let at=start;at<end;at++){const d=structuredClone(base);d[field].push({start:at,end:at+1});check(d);}}
});
test('masked original technical prefixes and tails cannot expose a measurement fragment',()=>{
 for(const [text,part]of [['Use 1e+3kg.','1e+'],['Use 1 / 3kgs.','1 /'],['Use é25kg.','é'],['Use 25kg^2.','^2'],['Use 25kg old.','old']])for(const field of ['struck','excluded']){const d=doc(text),at=text.indexOf(part);d[field].push({start:at,end:at+part.length});check(d,text.includes('old')?['25 kg']:[]);}
 for(const field of ['struck','excluded']){const d=doc('Use 25 old kgs.'),at=d.text.indexOf('old');d[field].push({start:at,end:at+3});check(d);}
});
test('original quotes, bill-local terms, identifiers and source-created names stay protected',()=>{
 for(const text of ['The text is “25kg”.','The text is "25kg".','The term “25kg” is defined. Use 25kg.','Cite Form 25kg.','The 25kg Program is established.','The 25kg West Foundation is established.','The 25kg is hereby created.','The 25kg, Inc., is hereby established.'])check(text);
 for(const field of ['struck','excluded'])for(const [text,part]of [['The text is “25kg”.','“'],['The 25kg Program is established.','Program'],['The 25kg, Inc., is established.','Inc.']]){const d=doc(text),at=text.indexOf(part);d[field].push({start:at,end:at+part.length});check(d);}
});
test('known angular meanings cannot establish a temperature spacing comparison',()=>{
 for(const text of ['The angle is 30°C.','The coordinates are 30° C.','The latitude is 30°C.','The bearing is 30° C.'])check(text);
 check('The temperature is 30°C.',['30 °C']);
});
test('table rows and unknown excluded bridges stay protected; recognized page heads preserve offsets',()=>{
 const table=doc('Use 25kgs.');table.blocks[0].formatting={headerGaps:[{},{}]};check(table);
 const d=makeDocument(['Use 25','AB 1 — 2 —\nkgs.'],'Current'),head=d.blocks.find(b=>b.ignored);head.formatting={headerParts:[{text:head.text}]};check(d,['25 kg']);head.formatting={};head.runningHead=false;head.layoutLabel=false;check(d);
});

test('original separated numeric prefixes protect the whole unknown quantity after masking',()=>{
 for(const text of ['Use 1 005kg.','Use 1½ 3kg.'])for(const field of ['struck','excluded']){const d=doc(text),start=text.indexOf('1');d[field].push({start,end:start+(text.includes('½')?2:1)});check(d);}
});

test('original finite sign words preserve unknown signed measurement quantities',()=>{
 for(const sign of ['minus','negative','plus','positive'])for(const quantity of ['25kg','25°C']){const text='Use '+sign+' '+quantity+'.';check(text);for(const field of ['struck','excluded']){const d=doc(text),start=text.indexOf(sign);d[field].push({start,end:start+sign.length});check(d);}}
});
