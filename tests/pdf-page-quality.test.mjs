import test from 'node:test';import assert from 'node:assert/strict';import {pageTextIntegrity,pageReadingProblems,largeRasterCoverage}from '../app/pdf-page-quality.mjs';
const OPS={save:1,restore:2,transform:3,paintImageXObject:4,paintFormXObjectBegin:5,paintFormXObjectEnd:6},operators=(fnArray,argsArray)=>({fnArray,argsArray});
const item=str=>({str,width:50,height:12,transform:[12,0,0,12,40,500]}),layout=text=>({text,readingQuality:pageTextIntegrity([item(text)],{text})});
test('layout integrity independently detects lost/repeated characters and accepts ligatures/spacing',()=>{
 assert.equal(pageTextIntegrity([item('ofﬁce')],{text:'of fice'}).preservedCharacters,true);
 assert.equal(pageTextIntegrity([item('office')],{text:'ofice'}).preservedCharacters,false);
 assert.equal(pageTextIntegrity([item('office')],{text:'officee'}).preservedCharacters,false);
});
test('invalid encodings/positions remain explicit reading failures while astral Unicode remains intact',()=>{
 const good=layout('A valid 🧪 report.');assert.equal(good.readingQuality.unsupportedCharacters.length,0);
 const bad=layout('A \uD800 report \uFFFD.');assert.equal(bad.readingQuality.unsupportedCharacters.length,2);
 assert.ok(pageReadingProblems(bad,operators([],[]),OPS,612,792).includes('unreadable encoded characters'));
 const x=item('bad');x.transform[4]=NaN;assert.equal(pageTextIntegrity([x],{text:'bad'}).invalidGeometry,true);
});
test('a readable running head cannot certify a large image-only body as complete text',()=>{
 const ops=operators([OPS.save,OPS.transform,OPS.paintImageXObject,OPS.restore], [[],[500,0,0,600,50,80],['scan'],[]]),page=layout('AB 1502 — 2 —');
 assert.ok(largeRasterCoverage(ops,OPS,612,792)>.35);
 assert.ok(pageReadingProblems(page,ops,OPS,612,792).includes('large scanned image with too little readable text'));
 assert.equal(pageReadingProblems(page,ops,OPS,612,792,{ocr:true}).length,0);
 assert.equal(pageReadingProblems(layout('Complete recognized prose. '.repeat(30)),ops,OPS,612,792).length,0);
});
test('small stamps and signatures do not trigger body-scan detection; transform stacks restore',()=>{
 const ops=operators([OPS.save,OPS.transform,OPS.paintImageXObject,OPS.restore,OPS.paintImageXObject],[[],[100,0,0,40,50,80],['stamp'],[],['tiny']]);
 assert.ok(largeRasterCoverage(ops,OPS,612,792)<.01);assert.equal(pageReadingProblems(layout('Clear prose.'),ops,OPS,612,792).length,0);
});
test('unreadable material after the instructional cutoff cannot block retained instructions',()=>{
 const page=layout('Amendment1\nInsert text.\n- 0 -\nBad \uFFFD attachment.'),end=page.text.indexOf('- 0 -');
 assert.equal(pageReadingProblems(page,operators([],[]),OPS,612,792,{end}).length,0);
});
test('image coverage uses the actual crop-box origin and accepts finite typed-array text positions',()=>{
 const ops=operators([OPS.transform,OPS.paintImageXObject],[[500,0,0,600,1050,2080],['scan']]);assert.ok(largeRasterCoverage(ops,OPS,612,792,[1000,2000,1612,2792])>.35);assert.equal(largeRasterCoverage(ops,OPS,612,792),0);
 const x=item('readable');x.transform=new Float64Array(x.transform);assert.equal(pageTextIntegrity([x],{text:'readable'}).invalidGeometry,false);
});
