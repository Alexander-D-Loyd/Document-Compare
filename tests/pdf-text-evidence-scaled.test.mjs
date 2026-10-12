import test from 'node:test';import assert from 'node:assert/strict';
import {sourceTextEvidence} from '../app/pdf-text-evidence.mjs';
import {extractPageLayout} from '../app/pdf-strikes.mjs';
import {makeDocument,spellingCandidates} from '../app/core.mjs';
import {workerSpell,workerWords} from './helpers/spelling-worker.mjs';
const OPS=Object.fromEntries(['save','restore','transform','setFont','setCharSpacing','setWordSpacing','setTextRenderingMode','setFillRGBColor','setFillGray','setFillColor','setFillCMYKColor','setFillColorN','setHScale','beginText','setTextMatrix','moveText','setLeadingMoveText','nextLine','showText','paintFormXObjectBegin','paintFormXObjectEnd','constructPath','stroke'].map((s,i)=>[s,i+1]));
const glyph=(unicode,width)=>({unicode,width}),matrix=(x,scale=1.125,y=683.17)=>[scale,0,0,1,x,y];
const ops=events=>({fnArray:events.map(e=>OPS[e[0]]),argsArray:events.map(e=>e.slice(1))});
const events=[['setFont','body',10],['setCharSpacing',1.164],['setTextMatrix',matrix(112)],['showText',[glyph('c',444)]],['setTextMatrix',matrix(118.153)],['showText',[glyph('y',500)]]];
const item={str:'c y',fontName:'body',height:10,width:11.778,transform:[11.25,0,0,10,112,683.17]};

test('bounded stretched native glyphs repair the independently observed Agency continuation',()=>{
 const [out]=sourceTextEvidence([item],ops(events),OPS);assert.equal(out.str,'cy');assert.equal(item.str,'c y');assert.equal(out.width,item.width);assert.deepEqual(out.transform,item.transform);assert.ok(Math.abs(out.sourceCharSpacing-1.158)<.001);assert.deepEqual(out.sourceGlyphs.map(g=>[g.text,g.x,g.width]),[['c',112,4.995],['y',118.153,5.625]]);
 const layout=extractPageLayout([item],ops(events),OPS);assert.equal(layout.text,'cy');assert.equal(layout.lines[0].runs[0].width,item.width);
});

test('a repaired source continuation joins its whole divided word and keeps comparison offsets',async()=>{
 const layout=extractPageLayout([item],ops(events),OPS),words=await workerWords();
 const doc=makeDocument(['line 3 Housing and Homelessness Agen-\nline 4 '+layout.text+' agency.'],'Current',[],[],words);
 assert.equal(doc.wrappedWords[0].word,'Agency');assert.deepEqual(doc.wrappedWords[0].spans.map(s=>doc.text.slice(s.start,s.end)),['Agen','cy']);assert.ok(!doc.tokens.some(t=>t.value==='Agenc'));assert.deepEqual(await workerSpell(spellingCandidates(doc)),[]);
});

test('a stretched explicit source space and an independently separated source word stay intact',()=>{
 const explicit=ops([['setFont','body',10],['setCharSpacing',1.164],['setTextMatrix',matrix(112)],['showText',[glyph('c',444),glyph(' ',250),glyph('y',500)]]]);
 assert.deepEqual(sourceTextEvidence([item],explicit,OPS),[item]);
 const separated=events.map(e=>e[0]==='setTextMatrix'&&e[1][4]===118.153?['setTextMatrix',matrix(120)]:e);
 assert.deepEqual(sourceTextEvidence([item],ops(separated),OPS),[item]);
});

test('unsupported scales, rotations, differing fonts, missing letters and ambiguous bounds cannot repair text',()=>{
 for(const scale of [.5,2,-1]){const e=events.map(e=>e[0]==='setTextMatrix'?['setTextMatrix',matrix(e[1][4],scale)]:e);assert.deepEqual(sourceTextEvidence([item],ops(e),OPS),[item]);}
 const rotated=events.map(e=>e[0]==='setTextMatrix'?['setTextMatrix',[1.125,.1,0,1,e[1][4],e[1][5]]]:e);assert.deepEqual(sourceTextEvidence([item],ops(rotated),OPS),[item]);
 const mixed=[...events.slice(0,4),['setFont','other',10],...events.slice(4)];assert.deepEqual(sourceTextEvidence([item],ops(mixed),OPS),[item]);
 for(const value of [{...item,str:'c v'},{...item,width:14},{...item,height:12},{...item,transform:[10,0,0,10,112,683.17]}])assert.deepEqual(sourceTextEvidence([value],ops(events),OPS),[value]);
 assert.deepEqual(sourceTextEvidence([item,{...item}],ops(events),OPS),[item,{...item}]);
});

test('recovered scaled source glyphs preserve a strikeout on only the corresponding letter',()=>{
 const draw=[...events,['constructPath',OPS.stroke,[[0,118.153,687,1,123.778,687]]]];
 const layout=extractPageLayout([item],ops(draw),OPS);assert.equal(layout.text,'cy');assert.deepEqual(layout.strikes,[{start:1,end:2}]);
});

test('fragmented stretched glyphs require their entire native word and physical gap evidence',()=>{
 const c={...item,str:'c',width:4.995},space={...item,str:' ',height:0,width:1.158,transform:[11.25,0,0,10,116.995,683.17]},y={...item,str:'y',width:5.625,transform:[11.25,0,0,10,118.153,683.17]};
 const out=sourceTextEvidence([c,space,y],ops(events),OPS);assert.equal(out.length,1);assert.equal(out[0].str,'cy');assert.ok(Math.abs(out[0].width-11.778)<.001);
 for(const inputs of [[c,space],[c,{...space,height:10},y],[c,{...space,width:2},y],[c,space,{...y,str:'v'}]])assert.deepEqual(sourceTextEvidence(inputs,ops(events),OPS).map(i=>i.str),inputs.map(i=>i.str));
});
