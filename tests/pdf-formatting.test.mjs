import assert from 'node:assert/strict';
import {extractPageLayout} from '../app/pdf-strikes.mjs';
import {makeDocument, cleanLayoutLabels, spellingCandidates} from '../app/core.mjs';
const item=(str,x,y,width,height=12)=>({str,transform:[height,0,0,height,x,y],width,height,fontName:'body'});
const layout=extractPageLayout([
  item('ASSEMBLY BILL',226,750,160,16),
  item('line 1 The clause applies.',60,700,240),
  item('line 2 Another clause applies.',60,680,270),
  item('line 3 A new paragraph.',60,635,220)
],{fnArray:[],argsArray:[]},{},{body:{fontFamily:'serif'}},612);
assert.equal(layout.lines[0].centered,true);
assert.ok(layout.lines[3].gapBefore>0);
const plain=makeDocument([layout.text],'plain',[]);
const formatted=makeDocument([layout.text],'formatted',[],[layout.lines]);
assert.equal(plain.text,formatted.text);
assert.deepEqual(plain.tokens,formatted.tokens);
assert.deepEqual(plain.excluded,formatted.excluded);
assert.deepEqual(plain.effectiveTokens,formatted.effectiveTokens);
assert.equal(formatted.blocks[1].margin,'line 1 ');
assert.equal(formatted.blocks[0].formatting.centered,true);
const column=extractPageLayout([
  {...item('california legislature',120,750,192,11),fontName:'caps'},
  {...item('ASSEMBLY BILL',48,720,112,14),fontName:'bold'},
  {...item('No. 2',353,720,31,14),fontName:'bold'},
  item('An act to amend a long provision of the Civil Code.',60,680,324),
  item('This continuation fills the full printed text column.',48,665,336),
  item('line 1 This numbered body line reaches the text-column edge.',48,650,336)
],{fnArray:[],argsArray:[]},{},{caps:{fontFamily:'sans-serif',ascent:.446},bold:{fontFamily:'serif',bold:true}},612);
assert.equal(column.lines[0].centered,true);
assert.equal(column.lines[0].runs[0].smallCaps,true);
assert.equal(column.lines[1].headerGaps.length,1);
assert.equal(column.lines[1].runs[0].bold,true);
const withCaps=makeDocument([column.text],'caps',[],[column.lines]);
assert.ok(withCaps.text.includes('california legislature'));
assert.deepEqual(withCaps.tokens,makeDocument([column.text],'plain').tokens);
const ops={constructPath:1,stroke:2};
const stroke=y=>[ops.stroke,[[0,48,y,1,384,y]]];
const separators=extractPageLayout([
  item('An act to amend a long provision of the Civil Code.',48,680,336),
  item('This entire line is crossed out in the original PDF.',48,665,336),
  item('The following text continues beneath the real separator.',48,620,336)
],{fnArray:[1,1,1],argsArray:[stroke(669),stroke(644),stroke(643)]},ops,{},612);
assert.equal(separators.lines[0].rules.length,0,'Strike-out on the following row must not become a separator');
assert.equal(separators.lines[1].rules.length,2,'A genuine double rule in whitespace is retained');
assert.ok(separators.strikes.length,'Strike-out detection remains intact');
const spaces=extractPageLayout([item('the',48,700,15),item(' ',63,700,0,0),item('Vehicle',63,700,40)],{fnArray:[],argsArray:[]},{},{},612);
assert.equal(spaces.text,'the Vehicle','Explicit PDF spaces must survive even at font-run boundaries with no measurable gap');
const revisions=extractPageLayout([
  item('line 30 Constitution.',48,700,200),
  item('line 31',21,687,39),item('line 32',21,674,39),
  item('line 33 REVISIONS:',48,661,150),
  item('line 34 Heading—Lines 2 and 3.',48,648,260),
  item('line 35',21,635,39)
],{fnArray:[],argsArray:[]},{},{},612);
const revisionDoc=makeDocument([revisions.text],'revisions',[],[revisions.lines]);
for(const number of [31,32,35]){
  const block=revisionDoc.blocks.find(b=>b.text===`line ${number}`);
  assert.equal(block.margin,block.text,'Blank numbered lines retain their margin reference');
  assert.equal(block.formatting.indent,0);
  assert.equal(block.formatting.centered,false);
  assert.ok(!revisionDoc.tokens.some(t=>t.start>=block.start&&t.end<=block.end));
  assert.ok(!spellingCandidates(revisionDoc).some(t=>t.start>=block.start&&t.end<=block.end));
}
assert.equal(cleanLayoutLabels([revisions.text])[0],'Constitution.\n\n\nREVISIONS:\nHeading—Lines 2 and 3.\n');
assert.deepEqual(makeDocument(['123 Body clause\nline 31A remains body text'],'numeric').blocks.map(b=>b.margin),['','']);
const counsel=extractPageLayout([
  item('legislative counsel',147.393,384.137,96.382,11),
  item('’',243.775,381.937,2.695,11),
  item('s digest',246.47,384.137,38.137,11),
  item('Separate line',147,371.137,90,11),
  item('’',400,360,3,11)
],{fnArray:[],argsArray:[]},{},{},612);
assert.equal(counsel.text,'legislative counsel’s digest\nSeparate line\n’');
assert.equal(counsel.lines[0].runs.length,3,'Offset apostrophe keeps its original font run on the heading');
assert.ok(makeDocument([counsel.text],'counsel').tokens.some(t=>t.value==='’'));
console.log('PASS: PDF heading alignment and paragraph spacing preserved without changing comparison tokens or margin references');
