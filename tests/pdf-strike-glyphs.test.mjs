import test from 'node:test';import assert from 'node:assert/strict';
import {partialStrikeGlyphEvidence} from '../app/pdf-strike-glyphs.mjs';
import {extractPageLayout} from '../app/pdf-strikes.mjs';
const OPS=Object.fromEntries(['save','restore','transform','setFont','setCharSpacing','setWordSpacing','setTextRenderingMode','setFillRGBColor','setFillGray','setFillColor','setFillCMYKColor','setFillColorN','setGState','setHScale','beginText','setTextMatrix','moveText','setLeadingMoveText','nextLine','showText','paintFormXObjectBegin','paintFormXObjectEnd','constructPath','stroke'].map((s,i)=>[s,i+1]));
const glyph=unicode=>({unicode,width:unicode===' '?250:500}),ops=events=>({fnArray:events.map(e=>OPS[e[0]]),argsArray:events.map(e=>e.slice(1))});
const item={str:'The old new.',fontName:'body',height:12,width:66,transform:[12,0,0,12,78,710]};
const events=[['setFont','body',12],['setTextMatrix',[1,0,0,1,78,710]],['showText',[...item.str].map(glyph)]];
const stroke={x1:99,x2:117,y:713.2},draw=[...events,['constructPath',OPS.stroke,[[0,stroke.x1,stroke.y,1,stroke.x2,stroke.y]]]];
const recovered=(value=item,ev=events,s=stroke)=>partialStrikeGlyphEvidence([value],ops(ev),OPS,[s])[0];
const struckText=layout=>layout.strikes.map(s=>layout.text.slice(s.start,s.end)).join('');

test('native glyph evidence identifies only the struck word in a same-font merged text run',()=>{
 const result=recovered();assert.equal(result.str,item.str);assert.equal(result.width,item.width);assert.deepEqual(result.transform,item.transform);assert.equal(result.sourceGlyphs.map(g=>g.text).join(''),item.str);assert.ok(!item.sourceGlyphs);
 const layout=extractPageLayout([item],ops(draw),OPS);assert.equal(layout.text,item.str);assert.equal(struckText(layout),'old');assert.equal(layout.lines[0].runs[0].width,item.width);
});
test('a strike covering most of a merged run still preserves its unstruck last word',()=>{
 const ev=[...events,['constructPath',OPS.stroke,[[0,78,713.2,1,141,713.2]]]],layout=extractPageLayout([item],ops(ev),OPS);assert.equal(struckText(layout),'The old new');assert.ok(!layout.strikes.some(s=>s.end===item.str.length));
});
test('separate consecutive showText calls and explicit spaces retain complete exact source geometry',()=>{
 const ev=[...events.slice(0,2),['showText',[...'The '].map(glyph)],['showText',[...'old '].map(glyph)],['showText',[...'new.'].map(glyph)]];
 assert.deepEqual(recovered(item,ev).sourceGlyphs,recovered().sourceGlyphs);
 const spaced=[['setFont','body',12],['setWordSpacing',2],['setTextMatrix',[1,0,0,1,78,710]],['showText',[...item.str].map(glyph)]];
 assert.equal(recovered({...item,width:70},spaced).sourceGlyphs.map(g=>g.text).join(''),item.str);
});
test('only a stroke at a strikeout height activates recovery; full-run strokes keep the existing path',()=>{
 for(const s of [{...stroke,y:708},{...stroke,y:720},{...stroke,x1:500,x2:520},{...stroke,x1:78,x2:144}])assert.equal(recovered(item,events,s),item);
 assert.deepEqual(partialStrikeGlyphEvidence([item],ops(events),OPS,[]),[item]);
});
test('missing letters, font or scale mismatches, uncertain endpoints and duplicate source items reject recovery',()=>{
 for(const value of [{...item,str:'The old now.'},{...item,width:68},{...item,height:11},{...item,fontName:'other'},{...item,transform:[13,0,0,12,78,710]},{...item,transform:[12,1,0,12,78,710]}])assert.equal(recovered(value),value);
 assert.deepEqual(partialStrikeGlyphEvidence([item,{...item}],ops(events),OPS,[stroke]),[item,{...item}]);
 const doubled=[...events,...events.slice(1)];assert.equal(recovered(item,doubled),item);
});
test('unsupported transforms, text movement, rendering modes and opacity/color state cannot prove a partial strike',()=>{
 for(const operation of [['transform',[1,0,0,1,4,0]],['setHScale',90],['moveText',1,0],['setTextRenderingMode',3],['setGState',[]],['setFillColorN',[]],['setFillRGBColor','#ffffff'],['setFillGray',1],['setFillCMYKColor',0,0,0,0]])assert.equal(recovered(item,[...events.slice(0,2),operation,...events.slice(2)]),item);
 for(const scale of [.5,2,-1])assert.equal(recovered(item,[events[0],['setTextMatrix',[scale,0,0,1,78,710]],events[2]]),item);
});
test('save/restore isolates unsupported drawing state and prior glyph evidence is preserved',()=>{
 const ev=[['save'],['transform',[1,0,0,1,4,0]],['restore'],...events];assert.ok(recovered(item,ev).sourceGlyphs);
 const proven={...item,sourceGlyphs:[{text:item.str,x:78,width:66,start:0,end:item.str.length}]};assert.equal(recovered(proven),proven);
});
test('large TJ displacements and overlapping or reversed source glyph order reject guessed segmentation',()=>{
 const wide=[...events.slice(0,2),['showText',[glyph('T'),200,...item.str.slice(1)].map(g=>typeof g==='string'?glyph(g):g)]];assert.equal(recovered(item,wide),item);
 const reverse=[events[0],['setTextMatrix',[1,0,0,1,99,710]],['showText',[...'old'].map(glyph)],['setTextMatrix',[1,0,0,1,78,710]],['showText',[...'The '].map(glyph)],['setTextMatrix',[1,0,0,1,117,710]],['showText',[...' new.'].map(glyph)]];assert.equal(recovered(item,reverse),item);
});
