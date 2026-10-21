import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {symbolIssues} from '../app/style-symbols.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {reviewStyleIssues} from '../app/style-review.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const doc=text=>makeDocument([text],'Current');
const direct=d=>symbolIssues(d,refs).filter(i=>i.rule==='10.3'),joint=d=>jointStylisticIssues(d,refs).filter(i=>i.rule==='10.3');
function check(text,wanted=null){const d=typeof text==='string'?doc(text):text,before=JSON.stringify(d);for(const run of [direct,joint]){const issues=run(d);if(wanted===null)assert.deepEqual(issues,[],d.text);else{assert.deepEqual(issues.map(i=>i.suggestion),wanted,d.text);for(const i of issues){assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(i.guidePage,277);assert.equal(i.guidePrintedPage,'263');assert.ok(i.evidenceStart<=i.start&&i.evidenceEnd===i.end);}}}assert.equal(JSON.stringify(d),before);return d;}

test('five printed arithmetic operators have bounded explicit-cue spacing comparisons',()=>{
 assert.match(refs.gpo.pages[276].text,/20,000±5,000/u);assert.match(refs.gpo.pages[276].text,/magnification/u);
 for(const op of ['+','−','±','×','÷'])check('Use the formula A '+op+' B.',['A'+op+'B']);
 check('Apply the equation A + B × 4.',['A+B×4']);check('Use the expression 4 ± 2 is the limit.',['4±2']);
 for(const text of ['Use the formula A+B.','Use the equation 4×4.','A + B are labels.','Use the formula total + revenue.','Use the formula A + B + C + D + E + F + G.'])check(text);
});
test('canonical grouped and long numeric strings retain their exact digits without floating point conversion',()=>{
 for(const [text,wanted]of [['Use the formula 20,000 ± 5,000.','20,000±5,000'],['Use the formula A + 1,000.','A+1,000'],['Use the formula 1,000.00 + 2,000.50.','1,000.00+2,000.50'],['Use the formula 9007199254740993 + 123456789012345678901234567890.','9007199254740993+123456789012345678901234567890'],['Use the formula 1.00000000000000001 + 2.00.','1.00000000000000001+2.00']])check(text,[wanted]);
});
test('malformed numbers and technical continuations cannot expose a shorter accepted expression',()=>{
 for(const text of ['Use the formula A + 1.2.3.','Use the formula A + 1,00.','Use the formula A + 1,00,000.','Use the formula A + 1,0000.','Use the formula 1,00 + 2.','Use the formula A + B:tail.','Use the formula A + B/2.','Use the formula A + B.key.','Use the formula A + B_1.','Use the formula A + 1e3.','Use the formula A + 2/3.','Use the formula A + B-key.'])check(text);
});
test('complete cue and expression endpoints require original Unicode and technical boundaries',()=>{
 for(const text of ['Use the éformula A + B.','Use the formulaé A + B.','Use the formula\u0301 A + B.','Use path/formula A + B.','Use key:formula A + B.','Use pre-formula A + B.','Use the formula A + Bé.','Use the formula A + B\u0301.','Use the formula A + B@key.'])check(text);
 for(const field of ['struck','excluded'])for(const [text,part]of [['Use the formulax A + B.','x'],['Use path/formula A + B.','path/'],['Use the formula A + Bx.','x'],['Use the formula A + B.key.','.key']]){const d=doc(text),at=text.indexOf(part);d[field].push({start:at,end:at+part.length});check(d);}
});
test('each cue operand operator and bridge character must survive intact in the original source',()=>{
 const text='Use the formula A + 1,000.',base=doc(text),start=text.indexOf('formula'),end=text.indexOf('1,000')+5;
 for(const field of ['struck','excluded'])for(let at=start;at<end;at++){const d=structuredClone(base);d[field].push({start:at,end:at+1});check(d);}
});
test('arbitrary removed source words cannot manufacture a mathematical cue or operand bridge',()=>{
 for(const field of ['struck','excluded'])for(const text of ['Use the formula old A + B.','Use the formula A old + B.','Use the formula A + old B.','Use the formula A + 1.2 old.3.']){const d=doc(text),at=text.indexOf('old');d[field].push({start:at,end:at+3});check(d);}
});
test('whole original quotations and an originally quoted cue stay protected after boundary removal',()=>{
 for(const text of ['The text is “formula A + B”.','The text is "formula A +\nB".','The text is ‘formula A + B’.'])check(text);
 for(const field of ['struck','excluded'])for(const text of ['Use the “formula” A + B.','Use the “formula A + B”.'])for(const mark of ['“','”']){const d=doc(text),at=text.indexOf(mark);d[field].push({start:at,end:at+1});check(d);}
 check('The term “A + B” is defined. Use the formula A + B.');check('Use the formula A + B.',['A+B']);
});
test('explicit magnification and breeding meanings protect multiplication signs without joining source words',()=>{
 for(const text of ['Use × 4 magnification.','Early June × Bright (crossed with).','The formula A × B is a breeding cross.','The formula A × 4 is magnification.','For magnification use the formula A × 4.','For animal breeding use the expression A × B.','Use the formula A × 4 (magnification).'])check(text);
 for(const field of ['struck','excluded']){const d=doc('The formula A × 4 is magnification.'),at=d.text.indexOf('magnification');d[field].push({start:at,end:at+13});check(d);}
 check('Use the formula A × 4.',['A×4']);
});
test('original used-for/in and hyphenated breeding descriptions protect multiplication after tail damage',()=>{
 for(const text of ['The expression A × 4 is used for magnification.','The expression A × B is used in plant breeding.','The expression A × B is a plant-breeding notation.']){
  check(text);const d=doc(text),tail=text.indexOf(' is ');
  for(const field of ['struck','excluded'])for(let at=tail;at<text.length-1;at++){const x=structuredClone(d);x[field].push({start:at,end:at+1});check(x);}
 }
 for(const text of ['The expression A × 4 is used for magnificationé.','The expression A × B is a plant-breeding\u0301 notation.','The expression A × B is used for reporting.'])check(text,[text.includes('× 4')?'A×4':'A×B']);
});
test('original finite name continuations cannot be removed to expose a mathematical edit',()=>{
 for(const field of ['struck','excluded']){const d=doc('The Formula A + B Program.'),at=d.text.indexOf('Program');d[field].push({start:at,end:at+7});check(d);}
 check('The Formula A + B is hereby established.');check('Use the formula A + B is the required expression.',['A+B']);
});
test('original incorporation and creation suffixes protect source-defined mathematical-looking names',()=>{
 for(const text of ['The Formula A + B, Inc., is hereby established.','The Formula A + B, Corporation, is created.']){
  check(text);const d=doc(text),start=text.indexOf(',');for(const field of ['struck','excluded'])for(let at=start;at<text.length-1;at++){const x=structuredClone(d);x[field].push({start:at,end:at+1});check(x);}
 }
 check('The Formula A + B, Inc., is hereby establishedé.',['A+B']);
 check('The Formula A + B, Inc., is reported.',['A+B']);
});
test('heading and any evidence-intersecting table row are protected',()=>{
 const heading=makeDocument(['Use the formula A + B.\nThe people do enact as follows:\nUse the formula A+B.'],'Current');check(heading);
 for(const which of [0,1]){const d=doc('Use the formula\nA + B.');d.blocks[which].formatting={headerGaps:[{},{}]};check(d);}
});
test('recognized physical page heads preserve exact source evidence and highlights; unknown bridges do not',()=>{
 const d=makeDocument(['The people do enact as follows:\nline 1 Use the formula A +','AB 121 — 2 —\nline 1 B.'],'Current'),head=d.blocks.find(b=>b.text==='AB 121 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};check(d,['A+B']);const [i]=joint(d);assert.match(i.text,/AB 121/);assert.match(d.text.slice(i.evidenceStart,i.evidenceEnd),/formula/);
 head.formatting={};head.runningHead=false;head.layoutLabel=false;check(d);
});
test('mathematical spacing remains independent of LCB priority and existing percent/range rules',()=>{
 const d=doc('Use the formula A + B. The healthcare is provided.'),issues=reviewStyleIssues(d,refs);assert.ok(issues.some(i=>i.rule==='10.3'&&i.suggestion==='A+B'));assert.ok(issues.some(i=>i.guideId==='lcb'&&i.suggestion==='health care'));assert.ok(!issues.some(i=>i.conflict));
 const old=doc('Prices rose 12 percent, 15 percent, and 19 percent. The panels are 3 to 4″ wide.'),result=symbolIssues(old,refs);assert.deepEqual(result.map(i=>[i.rule,i.suggestion]),[['10.5','12, 15, and 19 percent'],['10.6','3″ to 4″']]);assert.ok(result.every(i=>!('evidenceStart'in i)));
});
