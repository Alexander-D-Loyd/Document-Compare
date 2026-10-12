import test from 'node:test';
import assert from 'node:assert/strict';
import {ambiguousClauseMarkers,corroboratedLowercaseL,originalMarkerGlyphBox} from '../app/ocr-clause-markers.mjs';
const data=names=>({blocks:[{paragraphs:[{lines:names.map(text=>({words:[{text},{text:'provision'}]}))}]}]});
test('Only a confusable marker between source k and m is a reread candidate',()=>{
 for(const marker of ['(J)','(I)','(1)','(|)'])assert.equal(ambiguousClauseMarkers(data(['(k)',marker,'(m)'])).length,1);
 for(const names of [['(i)','(J)','(k)'],['(k)','(J)','(n)'],['(k)','(j)','(m)'],['(k)','(l)','(m)']])assert.equal(ambiguousClauseMarkers(data(names)).length,0);
});
test('Original marker pixels stay bound to the same physical source word after a row reread',()=>{
 const word={bbox:{x0:325,y0:1845,x1:357,y1:1878}},original={...word,symbols:[{text:'J',bbox:{x0:337,y0:1845,x1:346,y1:1871}}]};
 assert.deepEqual(originalMarkerGlyphBox(word,[original]),original.symbols[0].bbox);
 assert.equal(originalMarkerGlyphBox({bbox:{x0:425,y0:1845,x1:457,y1:1878}},[original]),null);
 assert.equal(originalMarkerGlyphBox(word,[{...original,symbols:[{text:'J',bbox:{x0:300,y0:1845,x1:346,y1:1871}}]}]),null);
 assert.equal(originalMarkerGlyphBox(word,[{...original,symbols:[{text:'l',bbox:original.symbols[0].bbox}]}]),null);
 assert.equal(originalMarkerGlyphBox({bbox:{x0:325,y0:1845,x1:325,y1:1878}},[original]),null);
});
test('Sequence context cannot substitute for agreement of original-pixel readings',()=>{
 assert.equal(corroboratedLowercaseL([{text:'l',confidence:59},{text:'l',confidence:85}]),true);
 for(const readings of [[{text:'J',confidence:99},{text:'l',confidence:99}],[{text:'l',confidence:49},{text:'l',confidence:90}],[{text:'l',confidence:79},{text:'l',confidence:79}],[{text:'l',confidence:99}]])assert.equal(corroboratedLowercaseL(readings),false);
});
