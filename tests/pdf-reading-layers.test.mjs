import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDocument,activeText} from '../app/core.mjs';
import {scannedStrokeGeometry,markDeletedOcrItems} from '../app/scanned-amendments.mjs';
import {amendmentReadingWarnings,applyAmendmentReadingWarnings} from '../app/pdf-reading-quality.mjs';
import {correctPdfReading} from '../app/correct-pdf-reading.mjs';
test('pixel middle strokes are deletion evidence; underlines and letter-size bars are not',()=>{
 const width=400,height=500,data=new Uint8ClampedArray(width*height*4).fill(255);
 const draw=(left,right,y)=>{for(let x=left;x<=right;x++){const i=(y*width+x)*4;data[i]=data[i+1]=data[i+2]=0;}};
 const layout={text:'A full row of ordinary legislative text.',lines:[{height:12,baseline:300,x:50,right:350}]};
 draw(70,170,196);assert.equal(scannedStrokeGeometry(layout,{data,width,height},500,1).length,1);
 data.fill(255);draw(70,170,302);assert.equal(scannedStrokeGeometry(layout,{data,width,height},500,1).length,0);
 data.fill(255);draw(70,81,196);assert.equal(scannedStrokeGeometry(layout,{data,width,height},500,1).length,0);
});
test('OCR joins containing deleted and active words keep the active suffix',()=>{
 const str='drugs_drugs',symbols=[...str].map((text,i)=>({text,bbox:{x0:50+i*5,x1:55+i*5,y0:100,y1:112}}));
 const item={str,symbols,confidence:40,spaceBefore:true,transform:[12,0,0,12,50,300],width:55,height:12};
 const pieces=markDeletedOcrItems([item],[{left:50,right:80,baseline:300}],1);
 assert.equal(pieces.filter(p=>!p.ocrStruck).map(p=>p.str).join(''),'drugs');
 assert.equal(pieces.filter(p=>p.ocrStruck).map(p=>p.str).join(''),'drugs_');
});
test('strike endpoints touching adjacent letter crossbars preserve the whole unstruck word',()=>{
 const symbols=[...'the'].map((text,i)=>({text,bbox:{x0:50+i*5,x1:55+i*5,y0:100,y1:112}}));
 const item={str:'the',symbols,confidence:95,transform:[12,0,0,12,50,300],width:15,height:12};
 assert.deepEqual(markDeletedOcrItems([item],[{left:60,right:150,baseline:300}],1),[item]);
 assert.equal(markDeletedOcrItems([item],[{left:50,right:150,baseline:300}],1)[0].ocrStruck,true);
});
test('uncertain readings are scoped to their amendment and never certified as an amendment error',()=>{
 const text='Amendment1\nOn page 1, insert:\nClear.\nAmendment2\nOn page 1, insert:\n(J) Item.';
 const doc=makeDocument([text],'scan'),start=text.indexOf('(J)');
 doc.scanQuality=[{page:1,uncertain:[{start,end:start+3,text:'(J)',confidence:77}]}];
 const warnings=amendmentReadingWarnings(doc),results=applyAmendmentReadingWarnings([{number:'1',status:'implemented'},{number:'2',status:'incorrect',evidence:[{actual:'(l) Item.'}]}],warnings);
 assert.equal(results[0].status,'implemented');assert.equal(results[1].status,'needs-review');assert.equal(results[1].evidence[0].actual,'(l) Item.');
 assert.match(results[1].message,/PDF reading needs review/);
});
test('different original-image readings remain reviewable even when the OCR score is high',()=>{
 const text='Amendment1\nOn page 1, insert:\nA cat.';const doc=makeDocument([text],'scan'),start=text.indexOf('cat');
 doc.scanQuality=[{page:1,uncertain:[{start,end:start+3,text:'cat',confidence:98,disagreement:'eat / cat'}]}];
 const results=applyAmendmentReadingWarnings([{number:'1',status:'implemented'}],amendmentReadingWarnings(doc));
 assert.equal(results[0].status,'needs-review');assert.equal(results[0].readingWarnings[0].disagreement,'eat / cat');
});

test('administrative OCR headers cannot attach warnings to the preceding amendment',()=>{
 const first='Amendment7\nOn page 3, strike out "old" and insert:\nNew.';
 const second='08/21/26 03:41 PM\n64258 RN 26 21222 PAGE 2\nSubstantive\nAmendment8\nOn page 3, in line 32, strike out "(c)" and insert:\n(b)';
 const doc=makeDocument([first,second],'scan');
 const positions=['PAGE','2\nSubstantive','Substantive','(b)'].map(text=>({start:second.indexOf(text),end:second.indexOf(text)+(text==='2\nSubstantive'?1:text.length),text:text==='2\nSubstantive'?'2':text,confidence:60}));
 doc.scanQuality=[{page:2,uncertain:positions}];
 const warnings=amendmentReadingWarnings(doc);
 assert.deepEqual(warnings.map(w=>({number:w.number,text:w.text})),[{number:'8',text:'(b)'}]);
 const results=applyAmendmentReadingWarnings([{number:'7',status:'implemented'},{number:'8',status:'implemented'}],warnings);
 assert.equal(results[0].status,'implemented');assert.equal(results[1].status,'needs-review');
});

test('ordinary PAGE, RN and numeral prose retain OCR warnings; invalid offsets are ignored',()=>{
 const page='Amendment1\nOn page 2, insert:\nThe PAGE 2 label and RN notation are required.';
 const doc=makeDocument([page],'scan');
 doc.scanQuality=[{page:1,uncertain:[...['PAGE','2 label','RN'].map(text=>({start:page.indexOf(text),end:page.indexOf(text)+(text==='2 label'?1:text.length),text:text==='2 label'?'2':text,confidence:60})),{start:-1,end:0},{start:1,end:1},{start:0,end:page.length+1}]}];
 assert.deepEqual(amendmentReadingWarnings(doc).map(w=>w.text),['PAGE','2','RN']);
});
test('confirmed reading changes retain strikeouts and formatting and shift later uncertain offsets',()=>{
 const page='Amendment1\nOn page 1, insert:\nold abc (J) last thc';
 const old=page.indexOf('old'),j=page.indexOf('(J)'),thc=page.indexOf('thc');
 const formats=page.split('\n').map(line=>({height:12,runs:[{start:0,end:line.length,x:75,width:300}]}));
 const doc=makeDocument([page,'Amendment2\nOn page 2, insert:\nMore.'],'scan',[[{start:old,end:old+3}]], [formats,[]]);
 doc.ocr=true;doc.scanQuality=[{page:1,uncertain:[{start:j,end:j+3,text:'(J)',confidence:77},{start:thc,end:thc+3,text:'thc',confidence:70}]}];
 const updated=correctPdfReading(doc,{page:1,start:j,end:j+3,text:'(J)'},'(letter l)');
 assert.ok(activeText(updated).includes('abc (letter l)'));assert.equal(updated.text.slice(updated.struck[0].start,updated.struck[0].end),'old');
 assert.equal(amendmentReadingWarnings(updated)[0].text,'thc');assert.equal(updated.rawPages[0].slice(updated.scanQuality[0].uncertain[0].start,updated.scanQuality[0].uncertain[0].end),'thc');
 assert.equal(updated.blocks.find(b=>b.text.includes('(letter l)')).formatting.runs[0].end,page.split('\n')[2].length+7);
 assert.throws(()=>correctPdfReading(doc,{page:1,start:j,end:j+3,text:'wrong'},'l'));
 assert.throws(()=>correctPdfReading(doc,{page:1,start:j,end:j+3,text:'(J)'},'l\nchanged'));
});
