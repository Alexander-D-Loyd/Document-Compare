import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceTextEvidence} from '../app/pdf-text-evidence.mjs';
import {extractPageLayout} from '../app/pdf-strikes.mjs';
import {makeDocument} from '../app/core.mjs';
const OPS=Object.fromEntries(['save','restore','transform','setFont','setCharSpacing','setWordSpacing','setTextRenderingMode','setFillRGBColor','setFillGray','setFillColor','setFillCMYKColor','setFillColorN','setHScale','beginText','setTextMatrix','moveText','setLeadingMoveText','nextLine','showText','paintFormXObjectBegin','paintFormXObjectEnd'].map((s,i)=>[s,i+1]));
const glyphs=text=>[...text].map(unicode=>({unicode,width:500,isSpace:unicode===' '}));
const operators=events=>({fnArray:events.map(e=>OPS[e[0]]),argsArray:events.map(e=>e.slice(1))});
const setup=(spacing=2,x=72,y=700)=>[['setFont','body',12],['setCharSpacing',spacing],['setTextMatrix',new Float32Array([1,0,0,1,x,y])]];
const item=(str,x,y,width)=>({str,fontName:'body',height:12,width,transform:[12,0,0,12,x,y]});
const tracked=(text,x=72,y=700,spacing=2)=>item([...text].join(' '),x,y,text.length*6+(text.length-1)*spacing);

test('source drawing glyphs recover tracked letters without altering their physical bounds',()=>{
 const input=tracked('schoolday'),ops=operators([...setup(),['showText',glyphs('schoolday')]]),out=sourceTextEvidence([input],ops,OPS)[0];
 assert.equal(out.str,'schoolday');assert.equal(out.width,input.width);assert.deepEqual(out.transform,input.transform);assert.equal(out.sourceCharSpacing,2);assert.equal(input.str,'s c h o o l d a y','Input remains immutable');
 const layout=extractPageLayout([input],ops,OPS);assert.equal(layout.text,'schoolday');assert.equal(layout.lines[0].runs[0].sourceCharSpacing,2);
});
test('explicit source word spaces remain spaces even with positive tracking',()=>{
 const input=item('d a t a   s h a r i n g',72,700,94),ops=operators([...setup(),['showText',glyphs('data sharing')]]);
 assert.deepEqual(sourceTextEvidence([input],ops,OPS),[input]);
});
test('a positive gap between separate source words is not a reason to join them',()=>{
 const input=tracked('cashflow'),ops=operators([...setup(),['showText',glyphs('cash')],['setTextMatrix',new Float32Array([1,0,0,1,106,700])],['showText',glyphs('flow')]]);
 assert.deepEqual(sourceTextEvidence([input],ops,OPS),[input]);
});
test('small negative kerning between tracked drawing parts retains one source word',()=>{
 const ops=operators([...setup(),['showText',glyphs('school')],['setTextMatrix',new Float32Array([1,0,0,1,119.8,700])],['showText',glyphs('day')]]),input=item('s c h o o l d a y',72,700,69.8);
 assert.equal(sourceTextEvidence([input],ops,OPS)[0].str,'schoolday');
});
test('a proven white accessibility label with inherited body word spacing returns to the gutter',()=>{
 const ops=operators([...setup(0,18),['setWordSpacing',75],['setFillRGBColor','#ffffff'],['showText',[{unicode:' ',width:250},...glyphs('line'),{unicode:' ',width:250}]]]);
 const input=[item('line',96,700,18),item('24',48,700,12),item('chemical, or',72,700,100)],out=sourceTextEvidence(input,ops,OPS);
 assert.equal(out[0].transform[4],21);assert.equal(out[0].sourceMarginLabel,true);assert.deepEqual(out.slice(1),input.slice(1));
 const layout=extractPageLayout(input,ops,OPS),doc=makeDocument([layout.text],'Current',[],[layout.lines]);
 assert.equal(doc.blocks[0].margin,'line 24 ');assert.equal(doc.blocks[0].formatting.x,72);assert.ok(!doc.tokens.some(t=>t.value==='line'||t.value==='24'));assert.ok(doc.tokens.some(t=>t.value==='chemical'));
});
test('black literal line text and labels without a printed margin number stay untouched',()=>{
 const input=item('line',96,700,18),events=[...setup(0,18),['showText',[{unicode:' ',width:250},...glyphs('line'),{unicode:' ',width:250}]]];
 assert.deepEqual(sourceTextEvidence([input,item('24',48,700,12)],operators(events),OPS),[input,item('24',48,700,12)]);
 assert.deepEqual(sourceTextEvidence([input],operators([['setFillRGBColor','#ffffff'],...events]),OPS),[input]);
});
test('unsupported transforms, large TJ gaps, uncertain bounds and ambiguous matches preserve decoded text',()=>{
 const input=tracked('schoolday'),draw=['showText',glyphs('schoolday')];
 for(const events of [[['transform',1,0,0,1,10,0],...setup(),draw],[...setup(),['showText',[...glyphs('school'),-250,...glyphs('day')]]]])assert.deepEqual(sourceTextEvidence([input],operators(events),OPS),[input]);
 const ops=operators([...setup(),draw]);assert.deepEqual(sourceTextEvidence([{...input,width:input.width+2}],ops,OPS),[{...input,width:input.width+2}]);assert.deepEqual(sourceTextEvidence([input,{...input}],ops,OPS),[input,{...input}]);
 assert.deepEqual(sourceTextEvidence([{...input,str:'s c h o o l y e a r'}],ops,OPS),[{...input,str:'s c h o o l y e a r'}]);
});
test('saved and restored drawing states cannot leak tracking into subsequent ordinary text',()=>{
 const a=tracked('schoolday'),b=item('cash flow',72,680,55),ops=operators([...setup(0),['save'],['setCharSpacing',2],['showText',glyphs('schoolday')],['restore'],['setTextMatrix',new Float32Array([1,0,0,1,72,680])],['showText',glyphs('cashflow')]]),out=sourceTextEvidence([a,b],ops,OPS);
 assert.equal(out[0].str,'schoolday');assert.deepEqual(out[1],b);
});
test('white text with a stroke or clip rendering mode is not a proven hidden margin label',()=>{
 const input=[item('line',96,700,18),item('24',48,700,12)],ops=operators([...setup(0,18),['setFillRGBColor','#ffffff'],['setTextRenderingMode',2],['showText',[{unicode:' ',width:250},...glyphs('line'),{unicode:' ',width:250}]]]);
 assert.deepEqual(sourceTextEvidence(input,ops,OPS),input);
});
test('an unknown text advance cannot certify a later tracked word at a stale position',()=>{
 const input=tracked('schoolday');
 for(const before of [[...setup(0),['showText',glyphs('earlier')]],[...setup(),['showText',[...glyphs('earlier'),-250]]]]){
  const ops=operators([...before,['setCharSpacing',2],['showText',glyphs('schoolday')]]);assert.deepEqual(sourceTextEvidence([input],ops,OPS),[input]);
 }
});

test('translated form content cannot prove a margin label at an untransformed location',()=>{
 const input=[item('line',96,700,18),item('24',48,700,12)],ops=operators([['paintFormXObjectBegin',[1,0,0,1,15,0]],...setup(0,18),['setFillRGBColor','#ffffff'],['showText',[{unicode:' ',width:250},...glyphs('line'),{unicode:' ',width:250}]],['paintFormXObjectEnd']]);
 assert.deepEqual(sourceTextEvidence(input,ops,OPS),input);
});

test('a font-size change between drawing parts cannot establish one tracked source word',()=>{
 const input=item('c a s h f l o w',72,700,66),ops=operators([...setup(),['showText',glyphs('cash')],['setFont','body',14],['setTextMatrix',new Float32Array([1,0,0,1,104,700])],['showText',glyphs('flow')]]);
 assert.deepEqual(sourceTextEvidence([input],ops,OPS),[input]);
});
