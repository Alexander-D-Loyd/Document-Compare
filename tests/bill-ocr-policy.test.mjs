import {embeddedOcrDisagreements}from '../app/ocr-embedded-agreement.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {labelScannedBillMargins,billReadingWarnings,billReadingSummary,applyBillReadingWarnings}from '../app/bill-ocr-policy.mjs';
const items=(numbers=[1,2,3,4,5])=>numbers.flatMap((n,k)=>[{str:String(n),transform:[12,0,0,12,65,600-k*22],width:7,height:12},{str:'The board shall retain this report.',transform:[12,0,0,12,104,600-k*22],width:240,height:12}]);
test('only a repeated consecutive left gutter becomes structural line numbers',()=>{
 const source=items(),copy=structuredClone(source),result=labelScannedBillMargins(source,612);assert.deepEqual(source,copy);assert.equal(result.filter(i=>i.structuralMargin).length,5);assert.equal(result[0].str,'line 1');assert.equal(result[1].str,source[1].str);
 for(const ns of [[1],[1,2,3],[1,3,5,7,9],[500,501,502,503]])assert.equal(labelScannedBillMargins(items(ns),612).filter(i=>i.structuralMargin).length,0);
 const body=items().map(i=>({...i,transform:[...i.transform.slice(0,4),i.transform[4]+200,i.transform[5]]}));assert.equal(labelScannedBillMargins(body,612).filter(i=>i.structuralMargin).length,0);
});
test('OCR confidence never produces an unqualified clean-PDF claim',()=>{
 assert.equal(billReadingSummary({ocr:false}),'');assert.match(billReadingSummary({ocr:true,scanQuality:[]}),/not proof/);
 const doc={ocr:true,scanQuality:[{page:2,uncertain:[{text:'license',start:5,end:12,confidence:81}]}]};assert.equal(billReadingWarnings(doc)[0].page,2);assert.match(billReadingSummary(doc),/page 2/);
 const results=[{number:'1',status:'implemented',message:'Requested wording matches.'},{number:'2',status:'incorrect',message:'Wording differs.',missingParts:[{start:1,end:4}]}],out=applyBillReadingWarnings(results,[null,doc]);assert.ok(out.every(r=>r.status==='needs-review'));assert.deepEqual(out[1].missingParts,results[1].missingParts);assert.equal(results[0].status,'implemented');assert.match(out[0].message,/Current page 2/);assert.equal(applyBillReadingWarnings(results,[null,null]),results);
});

test('independent embedded text disagreement stays explicit without making OCR fit another bill',()=>{
 assert.deepEqual(embeddedOcrDisagreements('line 1 The li-\nline 2 cense is required.','The license is required.'),[]);
 assert.deepEqual(embeddedOcrDisagreements('The license is required. 206,258,000.','The liccnsc is required. 206,258,000.'),['license']);
 assert.deepEqual(embeddedOcrDisagreements('The office office retains 30 records.','The office retains 3 records.'),['office','30']);
});
