import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {symbolSeriesIssues,dimensionSeriesEvidence} from '../app/style-symbol-series.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const doc=text=>makeDocument([text],'Current');
function check(text,wanted=[]){const d=typeof text==='string'?doc(text):text,before=JSON.stringify(d);for(const run of [d=>symbolSeriesIssues(d,refs),d=>jointStylisticIssues(d,refs).filter(i=>['10.5','10.6'].includes(i.rule))]){const issues=run(d);assert.deepEqual(issues.map(i=>i.suggestion),wanted,d.text);for(const i of issues){assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(i.guidePage,277);assert.equal(i.guidePrintedPage,'263');assert.equal(i.evidenceStart,i.start);assert.ok(i.evidenceEnd>=i.end);}}assert.equal(JSON.stringify(d),before);return d;}

test('complete percent lists preserve every value and original connector for any supported list length',()=>{
 for(const [a,b]of [['9 percent and 12 percent','9 and 12 percent'],['12 percent, 15 percent, and 19 percent','12, 15, and 19 percent'],['9 percent, 12 percent, 15 percent, and 19 percent','9, 12, 15, and 19 percent'],['12 percent or 15 percent or 19 percent','12 or 15 or 19 percent'],['1,000.00 percent and 9007199254740993.000 percent','1,000.00 and 9007199254740993.000 percent']])check('Prices rose '+a+'.',[b]);
 const values=Array.from({length:30},(_,n)=>String(n+10));check('Prices rose '+values.map(v=>v+' percent').join(', ')+'.',[values.join(', ')+' percent']);
});
test('dimension lists repeat the known physical mark without isolated LCB count-word edits',()=>{
 for(const [a,b]of [['5, 7, and 9′','5′, 7′, and 9′'],['2 and 3″','2″ and 3″'],['2, 3, 4, or 5"','2", 3", 4", or 5"'],["2, 3, and 4''","2'', 3'', and 4''"],['2′, 3, and 4\'','2′, 3\', and 4\''],['2.50 and 9007199254740993.000″','2.50″ and 9007199254740993.000″']]){const text='The panels are '+a+' long.',d=check(text,[b]);assert.equal(jointStylisticIssues(d,refs).length,1,text);assert.equal(dimensionSeriesEvidence(d).length,1);check(text.replace(a,b));}
});
test('two endpoint ranges retain original dash and verbal connectors',()=>{
 for(const [a,b]of [['5–7′','5′–7′'],['3 to 4"','3" to 4"'],['2 or 3″','2″ or 3″'],['3.5 through 4.5′','3.5′ through 4.5′']])check('The panels are '+a+' long.',[b]);
});
test('already abbreviated percentage lists and fully marked dimensions stay quiet',()=>{
 for(const t of ['Prices rose 12, 15, and 19 percent.','The panels are 5′, 7′, and 9′ long.','The panels are 5′–7′ long.'])check(t);
});
test('labels, distinct clauses and uncertain percentage list boundaries stay manual',()=>{
 for(const t of ['A rose 12 percent, B rose 15 percent, and C rose 19 percent.','Prices rose 12 percent, 15%, and 19 percent.','Prices rose 12 percent, 15 percent, and 19%.','Prices rose 12%, 15 percent, and 19 percent.','Prices rose 12 percent, 15 percent, and an unknown amount.','Prices rose 12 percent and 15 percent to 19 percent.'])check(t);
});
test('Unicode and complete technical numeric prefixes prevent suffix-only findings',()=>{
 for(const prefix of ['é','x_','1e+ ','1 / ','− ','1 . ','01','2^']){check('Prices rose '+prefix+'12 percent and 15 percent.');check('The panels are '+prefix+'5, 7, and 9′ long.');check('The range is '+prefix+'5–7′ long.');}
 for(const t of ['The panels are 1,005, 7, and 9′ long.','The panels are 5′, 7″, and 9′ long.','The panels are 5, 7, and 9′ unknown.','The panels are 5, 7, and 9′ longitude.','Prices rose 1.2.3 percent and 15 percent.','Prices rose 01 percent and 15 percent.'])check(t);
});
test('every original member, connector and physical continuation character is required',()=>{
 for(const text of ['Prices rose 12 percent, 15 percent, and 19 percent.','The panels are 5, 7, and 9′ long.','The range is 5–7′ long.']){const base=doc(text),start=text.search(/\d/u),end=text.length-1;for(const field of ['struck','excluded'])for(let at=start;at<end;at++){const d=structuredClone(base);d[field].push({start:at,end:at+1});check(d);}}
});
test('masked members and original numeric prefixes cannot manufacture shorter lists',()=>{
 for(const [text,part]of [['Prices rose 9 percent, 12 percent, 15 percent, and 19 percent.','9 percent,'],['Prices rose é12 percent and 15 percent.','é'],['Prices rose 12 old percent and 15 percent.','old'],['The panels are 5′, 7″, and 9′ long.','5′,'],['The range is 1e+ 5–7′ long.','1e+']])for(const field of ['struck','excluded']){const d=doc(text),at=text.indexOf(part);d[field].push({start:at,end:at+part.length});check(d);}
});
test('quotations, named programs, bill-local literal terms and table contexts are protected',()=>{
 for(const t of ['The text is “12 percent and 15 percent”.','The text is “5, 7, and 9′ long”.','The 12 percent and 15 percent Program is established.','The 5, 7, and 9′ long Program is established.','The term “12 percent and 15 percent” is defined. Prices rose 12 percent and 15 percent.','The term “5, 7, and 9′ long” is defined. The panels are 5, 7, and 9′ long.'])check(t);
 for(const text of ['Prices rose 12 percent and 15 percent.','The panels are 5, 7, and 9′ long.']){const d=doc(text);d.blocks[0].formatting={headerGaps:[{},{}]};check(d);}
});
test('LCB Digest percentage symbols retain priority and unrelated California checks remain independent',()=>{
 const d=doc('LEGISLATIVE COUNSEL’S DIGEST\nPrices rose 12 percent, 15 percent, and 19 percent.\nThe people do enact as follows:\nPrices rose 12 percent and 15 percent.');const found=jointStylisticIssues(d,refs);assert.equal(found.filter(i=>i.rule==='10.5').length,1);assert.equal(found.filter(i=>['12%','15%','19%'].includes(i.suggestion)).length,3);
 const mixed=reviewStyleIssues(doc('The panels are 5, 7, and 9′ long. Government Code (CIV). Los Angeles County.'),refs);assert.ok(mixed.some(i=>i.suggestion==='5′, 7′, and 9′'));assert.ok(mixed.some(i=>i.suggestion==='GOV'));assert.ok(mixed.some(i=>i.suggestion==='County of Los Angeles'));
});
test('recognized interior page heads preserve list offsets while unknown exclusions remain blocked',()=>{
 const d=makeDocument(['The panels are 5, 7, and','AB 1 — 2 —\n9′ long.'],'Current'),head=d.blocks.find(b=>b.ignored);head.formatting={headerParts:[{text:head.text}]};check(d,['5′, 7′, and 9′']);head.formatting={};head.runningHead=false;head.layoutLabel=false;check(d);
});

test('original ASCII and Unicode subtraction tails cannot expose a prefix list',()=>{
 for(const text of ['Prices rose 12 percent and 15 percent - 19 percent.','Prices rose 12 percent and 15 percent − 19 percent.','The panels are 5, 7, and 9′ long - 3.']){check(text);const at=text.search(/[-−]/u);for(const field of ['struck','excluded']){const d=doc(text);d[field].push({start:at,end:at+1});check(d);}}
});
